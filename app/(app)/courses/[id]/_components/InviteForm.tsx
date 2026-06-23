"use client"

import { useRef, useState, useTransition } from "react"
import { Send } from "lucide-react"

type Props = {
  action: (formData: FormData) => Promise<void>
  placeholder: string
  buttonLabel: string
}

export function InviteForm({ action, placeholder, buttonLabel }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = fd.get("email") as string
    setMessage(null)
    startTransition(async () => {
      try {
        await action(fd)
        setMessage({ ok: true, text: `Pozvánka odoslaná na ${email}.` })
        formRef.current?.reset()
      } catch (err) {
        setMessage({
          ok: false,
          text: err instanceof Error ? err.message : "Nastala chyba pri odosielaní.",
        })
      }
    })
  }

  return (
    <div className="space-y-2">
      <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder={placeholder}
          className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
        />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 border rounded-md px-4 py-2 text-sm hover:bg-muted transition-colors shrink-0 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {isPending ? "Odosielam…" : buttonLabel}
        </button>
      </form>
      {message && (
        <p className={`text-xs ${message.ok ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
