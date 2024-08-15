import { remember } from '@epic-web/remember'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import { withPulse } from '@prisma/extension-pulse'

import ws from 'ws'
import { sendDiscordMessage } from './discord'

neonConfig.webSocketConstructor = ws
const connectionString = `${process.env.DATABASE_URL}`

const pool = new Pool({
	connectionString,
})
const adapter = new PrismaNeon(pool)

export const prisma = remember('prisma', () => {
	const client = new PrismaClient({
		adapter,
		log: [
			{ level: 'query', emit: 'event' },
			{ level: 'error', emit: 'stdout' },
			{ level: 'warn', emit: 'stdout' },
		],
	}).$extends(
		withPulse({
			apiKey: process.env['PULSE_API_KEY'] as string,
		}),
	)

	void client.$connect()
	return client
})

async function prismaFeedbackStream() {
	console.log('setting up feedback stream')
	const stream = await prisma.feedback.stream()

	const emojiMap = {
		positive: '👍',
		negative: '👎',
	}

	for await (const event of stream) {
		if ('created' in event) {
			const { content, evaluation } = event.created
			const emoji = emojiMap[evaluation as keyof typeof emojiMap] || '💬'

			await sendDiscordMessage(`**${emoji} new feedback**\n\n${content}`)
		}
		console.log('New event:', event)
	}
}

void prismaFeedbackStream()
