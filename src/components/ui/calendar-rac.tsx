import React from 'react'

// Removed complex react-aria calendar wrappers. Provide minimal fallbacks to keep imports working.
export function Calendar(props: { className?: string }) {
  return (
    <div className={props.className}>
      <input type="date" className="w-full rounded-md border px-2 py-2" />
    </div>
  )
}

export function RangeCalendar(props: { className?: string }) {
  return (
    <div className={props.className}>
      <div className="flex gap-2">
        <input type="date" className="rounded-md border px-2 py-2" />
        <input type="date" className="rounded-md border px-2 py-2" />
      </div>
    </div>
  )
}

export default Calendar
