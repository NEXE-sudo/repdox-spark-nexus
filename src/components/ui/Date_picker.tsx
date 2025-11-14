"use client"

import { useId } from "react"

export default function Component() {
  const id = useId()

  return (
    <div>
      <div className="rounded-md border p-3 space-y-3">
        <label className="block">
          <span className="text-sm text-foreground block mb-1">Start date</span>
          <input type="date" className="w-full rounded-md border px-2 py-2" />
        </label>

        <label className="block">
          <span className="text-sm text-foreground block mb-1">End date</span>
          <input type="date" className="w-full rounded-md border px-2 py-2" />
        </label>

        <div className="border-t pt-3">
          <label className="block text-xs mb-1" htmlFor={id}>
            Enter time
          </label>
          <input id={id} type="time" defaultValue="12:00:00" className="w-full rounded-md border px-2 py-2" />
        </div>
      </div>
    </div>
  )
}