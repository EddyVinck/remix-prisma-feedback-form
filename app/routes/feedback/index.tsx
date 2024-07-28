import { parseWithZod } from '@conform-to/zod'
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { FeedbackSchema } from './__feedback-form.tsx'

async function sendDiscordMessage(message: string) {
	const webhookUrl = process.env.DISCORD_WEBHOOK_URL
	if (!webhookUrl) {
		console.error('DISCORD_WEBHOOK_URL is not set')
		return
	}
	const payload = {
		content: message,
	}

	try {
		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		})

		if (response.ok) {
			console.log('Message sent successfully')
		} else {
			console.error('Failed to send message:', response.statusText)
		}
	} catch (error) {
		console.error('Error sending message:', error)
	}
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: FeedbackSchema.superRefine(async (data, ctx) => {
			if (!data.id) return

			const feedback = await prisma.feedback.findUnique({
				select: { id: true },
				where: { id: data.id, ownerId: userId },
			})
			if (!feedback) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Feedback not found',
				})
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id: feedbackId, content, evaluation } = submission.value

	console.log('👀', evaluation)
	const updatedFeedback = await prisma.feedback.upsert({
		select: { id: true, owner: { select: { username: true } } },
		where: { id: feedbackId ?? '__new_feedback__' },
		create: {
			ownerId: userId,
			evaluation,
			content,
		},
		update: {
			content,
			evaluation,
		},
	})

	const emojiMap = {
		positive: '👍',
		negative: '👎',
	}

	const emoji = emojiMap[evaluation as keyof typeof emojiMap] || '💬'

	await sendDiscordMessage(
		`**${emoji} New feedback from ${updatedFeedback.owner.username}**\n\n${content}`,
	)

	return redirect('/')
}
