"use client"

import { useRef, useState, useTransition } from "react"
import { changePassword } from "../actions"

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setMessage(null)
    startTransition(async () => {
      try {
        await changePassword(null, fd)
        setMessage({ ok: true, text: "Potvrdzovací e-mail bol odoslaný. Skontrolujte schránku a kliknite na odkaz." })
        formRef.current?.reset()
      } catch (err) {
        setMessage({
          ok: false,
          text: err instanceof Error ? err.message : "Nastala chyba.",
        })
      }
    })
  }

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">Zmena hesla</h2>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="currentPassword">Aktuálne heslo</label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="newPassword">Nové heslo</label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="confirmPassword">Potvrdiť nové heslo</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        {message && (
          <p className={`text-sm ${message.ok ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Mením heslo…" : "Zmeniť heslo"}
        </button>
      </form>
    </section>
  )
}
