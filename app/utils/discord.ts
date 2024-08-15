const emojiMap = {
	positive: '👍',
	negative: '👎',
}

export async function sendDiscordMessage(message: string) {
	const webhookUrl = process.env.DISCORD_WEBHOOK_URL
	if (!webhookUrl) {
		console.error('DISCORD_WEBHOOK_URL is not set')
		return
	}
	const payload = {
		content: message,
	}

	// const emoji = emojiMap[evaluation as keyof typeof emojiMap] || '💬'

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
