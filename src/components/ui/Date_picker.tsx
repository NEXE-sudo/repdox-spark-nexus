"use client"
import { useId, useState } from "react"
import { DateRange, DropdownNavProps, DropdownProps } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function Component() {
  const id = useId()
  const today = new Date()
  const [date, setDate] = useState<DateRange | undefined>({
    from: today,
    to: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
  })

  const handleCalendarChange = (
    _value: string | number,
    _e: React.ChangeEventHandler<HTMLSelectElement>
  ) => {
    const _event = {
      target: {
        value: String(_value),
      },
    } as React.ChangeEvent<HTMLSelectElement>
    _e(_event)
  }

  return (
    <div>
      <div className="rounded-md border">
        <Calendar
          mode="range"
          className="p-2"
          selected={date}
          onSelect={setDate}
          classNames={{
            month_caption: "mx-0",
          }}
          captionLayout="dropdown"
          defaultMonth={new Date()}
          startMonth={new Date(1980, 6)}
          hideNavigation
          components={{
            DropdownNav: (props: DropdownNavProps) => {
              return (
                <div className="flex w-full items-center gap-2">
                  {props.children}
                </div>
              )
            },
            Dropdown: (props: DropdownProps) => {
              return (
                <Select
                  value={String(props.value)}
                  onValueChange={(value) => {
                    if (props.onChange) {
                      handleCalendarChange(value, props.onChange)
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-fit font-medium first:grow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(26rem,var(--radix-select-content-available-height))]">
                    {props.options?.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={String(option.value)}
                        disabled={option.disabled}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            },
          }}
        />
        <div className="border-t p-3">
          <div className="flex items-center gap-3">
            <Label htmlFor={id} className="text-xs">
              Enter time
            </Label>
            <div className="relative grow">
              <Input
                id={id}
                type="time"
                step="1"
                defaultValue="12:00:00"
                className="peer appearance-none ps-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              />
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}