"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    try {
      localStorage.setItem("theme", next ? "dark" : "light")
    } catch {}
  }

  // Avoid hydration mismatch: render a neutral placeholder until mounted
  if (!mounted) {
    return <span className="h-9 w-9" aria-hidden />
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? "Svetlý režim" : "Tmavý režim"}
      aria-label={dark ? "Prepnúť na svetlý režim" : "Prepnúť na tmavý režim"}
      className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
