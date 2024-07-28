import {
	FormProvider,
	getFormProps,
	getInputProps,
	getTextareaProps,
	useForm,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type Feedback } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { floatingToolbarClassName } from '#app/components/floating-toolbar.tsx'
import { ErrorList, Field, TextareaField } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Label } from '#app/components/ui/label.js'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { useIsPending } from '#app/utils/misc.tsx'
import { type action } from './__feedback-form.server'

const contentMinLength = 1
const contentMaxLength = 10000

export const FeedbackSchema = z.object({
	id: z.string().optional(),
	content: z.string().min(contentMinLength).max(contentMaxLength),
	evaluation: z.boolean(),
})

export function FeedbackForm({
	feedback,
}: {
	feedback?: SerializeFrom<Feedback>
}) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'feedback-form',
		constraint: getZodConstraint(FeedbackSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: FeedbackSchema })
		},
		defaultValue: {
			...feedback,
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<div className="fixed bottom-0 left-4 w-full max-w-[280px] rounded-lg bg-slate-100 dark:bg-slate-800">
			<FormProvider context={form.context}>
				<Form
					method="POST"
					className="flex h-full flex-col gap-y-4 overflow-y-auto overflow-x-hidden px-6 pb-28 pt-12"
					{...getFormProps(form)}
				>
					{/*
					TODO: remove  this if its not necessary
					This hidden submit button is here to ensure that when the user hits
					"enter" on an input field, the primary form function is submitted
					rather than the first button in the form (which is delete/add image).
				*/}
					<button type="submit" className="hidden" />
					{feedback ? (
						<input type="hidden" name="id" value={feedback.id} />
					) : null}
					<fieldset className="flex flex-col gap-1">
						<Label>Are you enjoying the app?</Label>
						<div className="flex gap-4">
							<Field
								inputFirst
								errorProps={{ className: 'hidden' }}
								inputProps={{
									...getInputProps(fields.evaluation, {
										type: 'radio',
										value: true,
									}),
									id: 'evaluation-true',
									className: 'peer sr-only',
								}}
								labelProps={{
									children: '👍',
									className:
										'cursor-pointer border-2 border-white dark:border-slate-700 peer-checked:bg-slate-800 dark:peer-checked:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-sm text-lg peer flex justify-center items-center size-12',
									htmlFor: 'evaluation-true',
								}}
								// errors={fields.evaluation.errors}
							/>
							<Field
								inputFirst
								errorProps={{ className: 'hidden' }}
								inputProps={{
									...getInputProps(fields.evaluation, {
										type: 'radio',
										value: false,
									}),
									id: 'evaluation-false',
									className: 'sr-only peer',
								}}
								labelProps={{
									htmlFor: 'evaluation-false',
									children: '👎',
									className:
										'cursor-pointer border-2 border-white dark:border-slate-700 peer-checked:bg-slate-800 dark:peer-checked:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-sm text-lg peer flex justify-center items-center size-12',
								}}
								// errors={fields.evaluation.errors}
							/>
						</div>
						<div className="min-h-[32px] w-full px-4 pb-3 pt-1">
							{fields.evaluation.errors ? (
								<ErrorList
									id={'evaluation-error'}
									errors={fields.evaluation.errors}
								/>
							) : null}
						</div>
					</fieldset>
					<TextareaField
						labelProps={{ children: 'Content' }}
						textareaProps={{
							...getTextareaProps(fields.content),
						}}
						errors={fields.content.errors}
					/>
					<ErrorList id={form.errorId} errors={form.errors} />
				</Form>
				<div className={floatingToolbarClassName}>
					<Button variant="destructive" {...form.reset.getButtonProps()}>
						Reset
					</Button>
					<StatusButton
						form={form.id}
						type="submit"
						disabled={isPending}
						status={isPending ? 'pending' : 'idle'}
					>
						Submit
					</StatusButton>
				</div>
			</FormProvider>
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No feedback with the id "{params.feedbackId}" exists</p>
				),
			}}
		/>
	)
}
