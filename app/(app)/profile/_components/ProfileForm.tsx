"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { updateProfile } from "../actions"

export function ProfileForm({ firstName, lastName }: { firstName: string; lastName: string }) {
  const router = useRouter()
  const [state, action, pending] = useActionState(updateProfile, null)

  useEffect(() => {
    if (state && "success" in state) router.refresh()
  }, [state, router])

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">Osobné údaje</h2>
      <form action={action} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="firstName">Meno</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              defaultValue={firstName}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="lastName">Priezvisko</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              defaultValue={lastName}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>
        </div>

        {state && "error" in state && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state && "success" in state && (
          <p className="text-sm text-green-600 dark:text-green-400">Profil bol uložený.</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pending ? "Ukladám…" : "Uložiť zmeny"}
        </button>
      </form>
    </section>
  )
}
