"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

export function UploadForm({ lessonId }: { lessonId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = inputRef.current?.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    const body = new FormData()
    body.set("file", file)

    const res = await fetch(`/api/lessons/${lessonId}/upload`, {
      method: "POST",
      body,
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Upload zlyhal")
      return
    }

    if (inputRef.current) inputRef.current.value = ""
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={inputRef}
          name="file"
          type="file"
          accept=".pdf,.ppt,.pptx"
          required
          disabled={loading}
          className="text-sm file:mr-3 file:py-1.5 file:px-3 file:border file:rounded-md file:text-sm file:cursor-pointer file:bg-background file:hover:bg-muted disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="border rounded-md px-4 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
        >
          {loading ? "Konvertujem stránky..." : "Nahrať PDF / PPT"}
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Každá strana PDF alebo každý slide PPT sa stane jednou stránkou lekcie.
        Vyžaduje nainštalovaný <code>libreoffice</code> a <code>poppler-utils</code>.
      </p>
    </form>
  )
}
