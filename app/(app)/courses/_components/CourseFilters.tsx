"use client"

import { useRouter, useSearchParams } from "next/navigation"

const STATUS_OPTIONS = [
  { value: "active",   label: "Prebieha",  active: "bg-green-600 text-white border-green-600",  idle: "border-green-300 text-green-700 hover:bg-green-50" },
  { value: "upcoming", label: "Plánovaný", active: "bg-blue-600 text-white border-blue-600",    idle: "border-blue-300 text-blue-700 hover:bg-blue-50" },
  { value: "finished", label: "Ukončený",  active: "bg-gray-500 text-white border-gray-500",    idle: "border-gray-300 text-gray-500 hover:bg-gray-50" },
]

const ROLE_OPTIONS = [
  { value: "ADMIN",       label: "Admin",     active: "bg-purple-600 text-white border-purple-600", idle: "border-purple-300 text-purple-700 hover:bg-purple-50" },
  { value: "TRAINER",     label: "Školiteľ",  active: "bg-orange-500 text-white border-orange-500", idle: "border-orange-300 text-orange-700 hover:bg-orange-50" },
  { value: "PARTICIPANT", label: "Účastník",  active: "bg-teal-600 text-white border-teal-600",     idle: "border-teal-300 text-teal-700 hover:bg-teal-50" },
]

export function CourseFilters({ availableRoles }: { availableRoles: string[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const selectedStatuses = searchParams.getAll("status")
  const selectedRoles = searchParams.getAll("role")
  const search = searchParams.get("q") ?? ""

  function toggle(key: "status" | "role", value: string) {
    const params = new URLSearchParams(searchParams.toString())
    const current = params.getAll(key)
    params.delete(key)
    if (current.includes(value)) {
      current.filter((v) => v !== value).forEach((v) => params.append(key, v))
    } else {
      [...current, value].forEach((v) => params.append(key, v))
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  function onSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) params.set("q", e.target.value)
    else params.delete("q")
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  function clearAll() {
    router.replace("?", { scroll: false })
  }

  const hasFilters = selectedStatuses.length > 0 || selectedRoles.length > 0 || search !== ""

  return (
    <div className="space-y-3">
      <input
        type="search"
        placeholder="Hľadať kurz podľa názvu…"
        defaultValue={search}
        onChange={onSearch}
        className="w-full sm:w-80 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {availableRoles.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Rola:</span>
            {ROLE_OPTIONS.filter((o) => availableRoles.includes(o.value)).map((o) => (
              <button
                key={o.value}
                onClick={() => toggle("role", o.value)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                  selectedRoles.includes(o.value) ? o.active : o.idle
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">Stav:</span>
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => toggle("status", o.value)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                selectedStatuses.includes(o.value) ? o.active : o.idle
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            Zrušiť filtre
          </button>
        )}
      </div>
    </div>
  )
}
