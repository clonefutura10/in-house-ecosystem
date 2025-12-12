'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Clock, Calendar, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeSchedulePickerProps {
    value: string // cron expression
    onChange: (cron: string) => void
    className?: string
}

type FrequencyType = 'daily' | 'weekdays' | 'weekly' | 'monthly'

const DAYS_OF_WEEK = [
    { value: '0', label: 'Sunday', short: 'Sun' },
    { value: '1', label: 'Monday', short: 'Mon' },
    { value: '2', label: 'Tuesday', short: 'Tue' },
    { value: '3', label: 'Wednesday', short: 'Wed' },
    { value: '4', label: 'Thursday', short: 'Thu' },
    { value: '5', label: 'Friday', short: 'Fri' },
    { value: '6', label: 'Saturday', short: 'Sat' },
]

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: getOrdinal(i + 1),
}))

function getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function parseCronToState(cron: string): {
    hour: number
    minute: number
    frequency: FrequencyType
    dayOfWeek: string
    dayOfMonth: string
} {
    const parts = cron.split(' ')
    if (parts.length !== 5) {
        return { hour: 9, minute: 0, frequency: 'daily', dayOfWeek: '1', dayOfMonth: '1' }
    }

    const [minute, hour, dayOfMonth, , dayOfWeek] = parts

    let frequency: FrequencyType = 'daily'
    let selectedDayOfWeek = '1'
    let selectedDayOfMonth = '1'

    if (dayOfMonth !== '*' && dayOfMonth !== '1') {
        frequency = 'monthly'
        selectedDayOfMonth = dayOfMonth
    } else if (dayOfMonth === '1' && dayOfWeek === '*') {
        // Could be monthly or daily - check if it looks like a monthly pattern
        frequency = 'daily'
    }

    if (dayOfWeek === '1-5') {
        frequency = 'weekdays'
    } else if (dayOfWeek !== '*' && dayOfMonth === '*') {
        frequency = 'weekly'
        selectedDayOfWeek = dayOfWeek
    }

    if (dayOfMonth !== '*') {
        frequency = 'monthly'
        selectedDayOfMonth = dayOfMonth
    }

    return {
        hour: parseInt(hour) || 9,
        minute: parseInt(minute) || 0,
        frequency,
        dayOfWeek: selectedDayOfWeek,
        dayOfMonth: selectedDayOfMonth,
    }
}

function buildCronFromState(
    hour: number,
    minute: number,
    frequency: FrequencyType,
    dayOfWeek: string,
    dayOfMonth: string
): string {
    switch (frequency) {
        case 'daily':
            return `${minute} ${hour} * * *`
        case 'weekdays':
            return `${minute} ${hour} * * 1-5`
        case 'weekly':
            return `${minute} ${hour} * * ${dayOfWeek}`
        case 'monthly':
            return `${minute} ${hour} ${dayOfMonth} * *`
        default:
            return `${minute} ${hour} * * *`
    }
}

export function TimeSchedulePicker({ value, onChange, className }: TimeSchedulePickerProps) {
    const parsed = parseCronToState(value)

    const [hour, setHour] = useState(parsed.hour)
    const [minute, setMinute] = useState(parsed.minute)
    const [frequency, setFrequency] = useState<FrequencyType>(parsed.frequency)
    const [dayOfWeek, setDayOfWeek] = useState(parsed.dayOfWeek)
    const [dayOfMonth, setDayOfMonth] = useState(parsed.dayOfMonth)
    const [isPM, setIsPM] = useState(parsed.hour >= 12)

    // Convert 24h to 12h display
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour

    useEffect(() => {
        const newCron = buildCronFromState(hour, minute, frequency, dayOfWeek, dayOfMonth)
        if (newCron !== value) {
            onChange(newCron)
        }
    }, [hour, minute, frequency, dayOfWeek, dayOfMonth, onChange, value])

    const incrementHour = () => {
        const newHour = (hour + 1) % 24
        setHour(newHour)
        setIsPM(newHour >= 12)
    }

    const decrementHour = () => {
        const newHour = (hour - 1 + 24) % 24
        setHour(newHour)
        setIsPM(newHour >= 12)
    }

    const incrementMinute = () => {
        setMinute((prev) => (prev + 5) % 60)
    }

    const decrementMinute = () => {
        setMinute((prev) => (prev - 5 + 60) % 60)
    }

    const toggleAMPM = () => {
        const newHour = isPM ? hour - 12 : hour + 12
        const adjustedHour = newHour < 0 ? newHour + 24 : newHour % 24
        setHour(adjustedHour)
        setIsPM(!isPM)
    }

    const setQuickTime = (h: number, m: number) => {
        setHour(h)
        setMinute(m)
        setIsPM(h >= 12)
    }

    return (
        <div className={cn('space-y-4', className)}>
            {/* Time Picker Section */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4 text-slate-500" />
                    Time
                </Label>

                <div className="flex items-center gap-3">
                    {/* Hour Spinner */}
                    <div className="flex flex-col items-center">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            onClick={incrementHour}
                        >
                            <ChevronUp className="h-4 w-4" />
                        </Button>
                        <div className="w-14 h-12 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-2xl font-semibold text-slate-900 dark:text-white">
                            {String(displayHour).padStart(2, '0')}
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            onClick={decrementHour}
                        >
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </div>

                    <span className="text-2xl font-bold text-slate-400">:</span>

                    {/* Minute Spinner */}
                    <div className="flex flex-col items-center">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            onClick={incrementMinute}
                        >
                            <ChevronUp className="h-4 w-4" />
                        </Button>
                        <div className="w-14 h-12 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-2xl font-semibold text-slate-900 dark:text-white">
                            {String(minute).padStart(2, '0')}
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            onClick={decrementMinute}
                        >
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* AM/PM Toggle */}
                    <div className="flex flex-col gap-1 ml-2">
                        <Button
                            type="button"
                            variant={!isPM ? 'default' : 'ghost'}
                            size="sm"
                            className={cn(
                                'h-7 px-3 text-xs font-semibold',
                                !isPM
                                    ? 'bg-[#1387ec] text-white hover:bg-[#1387ec]/90'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            )}
                            onClick={() => isPM && toggleAMPM()}
                        >
                            AM
                        </Button>
                        <Button
                            type="button"
                            variant={isPM ? 'default' : 'ghost'}
                            size="sm"
                            className={cn(
                                'h-7 px-3 text-xs font-semibold',
                                isPM
                                    ? 'bg-[#1387ec] text-white hover:bg-[#1387ec]/90'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            )}
                            onClick={() => !isPM && toggleAMPM()}
                        >
                            PM
                        </Button>
                    </div>
                </div>

                {/* Quick Time Presets */}
                <div className="flex flex-wrap gap-2 pt-2">
                    {[
                        { label: '8 AM', h: 8, m: 0 },
                        { label: '9 AM', h: 9, m: 0 },
                        { label: '10 AM', h: 10, m: 0 },
                        { label: '12 PM', h: 12, m: 0 },
                        { label: '5 PM', h: 17, m: 0 },
                    ].map((preset) => (
                        <Button
                            key={preset.label}
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(
                                'h-7 text-xs',
                                hour === preset.h && minute === preset.m
                                    ? 'border-[#1387ec] bg-[#1387ec]/10 text-[#1387ec]'
                                    : 'border-slate-200 dark:border-slate-700'
                            )}
                            onClick={() => setQuickTime(preset.h, preset.m)}
                        >
                            {preset.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Frequency Section */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    Frequency
                </Label>

                <div className="grid grid-cols-2 gap-2">
                    {[
                        { value: 'daily', label: 'Every Day' },
                        { value: 'weekdays', label: 'Weekdays Only' },
                        { value: 'weekly', label: 'Once a Week' },
                        { value: 'monthly', label: 'Once a Month' },
                    ].map((option) => (
                        <Button
                            key={option.value}
                            type="button"
                            variant="outline"
                            className={cn(
                                'justify-start h-10',
                                frequency === option.value
                                    ? 'border-[#1387ec] bg-[#1387ec]/10 text-[#1387ec]'
                                    : 'border-slate-200 dark:border-slate-700'
                            )}
                            onClick={() => setFrequency(option.value as FrequencyType)}
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Day Selection (conditional) */}
            {frequency === 'weekly' && (
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Day of Week</Label>
                    <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                            <Button
                                key={day.value}
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(
                                    'h-9 px-3',
                                    dayOfWeek === day.value
                                        ? 'border-[#1387ec] bg-[#1387ec]/10 text-[#1387ec]'
                                        : 'border-slate-200 dark:border-slate-700'
                                )}
                                onClick={() => setDayOfWeek(day.value)}
                            >
                                {day.short}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {frequency === 'monthly' && (
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Day of Month</Label>
                    <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTH_DAYS.map((day) => (
                                <SelectItem key={day.value} value={day.value}>
                                    {day.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Preview */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-900 dark:text-white">Runs: </span>
                    {getHumanReadableSchedule(hour, minute, frequency, dayOfWeek, dayOfMonth)}
                </p>
            </div>
        </div>
    )
}

function getHumanReadableSchedule(
    hour: number,
    minute: number,
    frequency: FrequencyType,
    dayOfWeek: string,
    dayOfMonth: string
): string {
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const timeStr = `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`

    switch (frequency) {
        case 'daily':
            return `Every day at ${timeStr}`
        case 'weekdays':
            return `Monday through Friday at ${timeStr}`
        case 'weekly':
            const dayName = DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label || 'Monday'
            return `Every ${dayName} at ${timeStr}`
        case 'monthly':
            return `On the ${getOrdinal(parseInt(dayOfMonth))} of each month at ${timeStr}`
        default:
            return `At ${timeStr}`
    }
}
