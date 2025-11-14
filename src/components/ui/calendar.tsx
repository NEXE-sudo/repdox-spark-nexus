import React from 'react'

// Calendar removed — render a simple placeholder or native input as fallback.
export function Calendar(props: { className?: string }) {
  return (
    <div className={props.className}>
      <input type="date" className="w-full rounded-md border px-2 py-2" />
    </div>
  )
}

export default Calendar
