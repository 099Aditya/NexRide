import React, { useState, useMemo } from 'react'

const DAYS_OF_WEEK = [ 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa' ]

const pad = (n) => String(n).padStart(2, '0')

const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const DatePickerModal = ({
    isOpen,
    onClose,
    selectedDate,
    onSelectDate,
    minDate = null
}) => {
    // Current real-time date
    const today = useMemo(() => new Date(), [])
    const todayIso = useMemo(() => toIso(today), [ today ])
    const effectiveMinIso = minDate || todayIso

    // State for the currently displayed month view
    const [ viewDate, setViewDate ] = useState(() => {
        if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
            const [ y, m, d ] = selectedDate.split('-').map(Number)
            return new Date(y, m - 1, 1)
        }
        return new Date(today.getFullYear(), today.getMonth(), 1)
    })

    // Temporary active selection inside modal before closing
    const [ tempDate, setTempDate ] = useState(selectedDate || todayIso)

    // Sync tempDate when selectedDate changes or modal opens
    React.useEffect(() => {
        if (isOpen) {
            setTempDate(selectedDate || todayIso)
            if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
                const [ y, m ] = selectedDate.split('-').map(Number)
                setViewDate(new Date(y, m - 1, 1))
            }
        }
    }, [ isOpen, selectedDate, todayIso ])

    const viewYear = viewDate.getFullYear()
    const viewMonth = viewDate.getMonth()

    // Can we navigate to previous month? (Cannot go earlier than today's current month)
    const canGoPrev = useMemo(() => {
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        return viewDate.getTime() > currentMonthStart.getTime()
    }, [ viewDate, today ])

    const handlePrevMonth = () => {
        if (!canGoPrev) return
        setViewDate(new Date(viewYear, viewMonth - 1, 1))
    }

    const handleNextMonth = () => {
        setViewDate(new Date(viewYear, viewMonth + 1, 1))
    }

    // Days in current viewed month
    const monthDays = useMemo(() => {
        const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay()
        const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate()

        const blanks = Array.from({ length: firstDayIndex }, (_, i) => ({ type: 'blank', key: `blank-${i}` }))
        const days = Array.from({ length: totalDays }, (_, i) => {
            const dayNum = i + 1
            const dateObj = new Date(viewYear, viewMonth, dayNum)
            const iso = toIso(dateObj)
            const isPast = iso < effectiveMinIso
            const isToday = iso === todayIso
            const isSelected = iso === tempDate

            return {
                type: 'day',
                dayNum,
                iso,
                isPast,
                isToday,
                isSelected,
                key: `day-${iso}`
            }
        })

        return [ ...blanks, ...days ]
    }, [ viewYear, viewMonth, effectiveMinIso, todayIso, tempDate ])

    // Formatted month and year title
    const monthTitle = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Quick selection shortcuts
    const quickPresets = useMemo(() => {
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const dayAfter = new Date(today)
        dayAfter.setDate(dayAfter.getDate() + 2)

        // Next Saturday
        const thisWeekend = new Date(today)
        const dayOfWeek = thisWeekend.getDay()
        const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7
        thisWeekend.setDate(thisWeekend.getDate() + daysUntilSat)

        return [
            { label: 'Today', iso: todayIso },
            { label: 'Tomorrow', iso: toIso(tomorrow) },
            { label: '+2 Days', iso: toIso(dayAfter) },
            { label: 'Weekend', iso: toIso(thisWeekend) }
        ]
    }, [ today, todayIso ])

    const handleSelectDay = (iso) => {
        setTempDate(iso)
        if (onSelectDate) {
            onSelectDate(iso)
        }
        if (onClose) {
            onClose()
        }
    }

    const handleQuickPreset = (iso) => {
        const [ y, m ] = iso.split('-').map(Number)
        setViewDate(new Date(y, m - 1, 1))
        handleSelectDay(iso)
    }

    // Formatted label of selected temp date
    const formattedSelection = useMemo(() => {
        try {
            const [ y, m, d ] = tempDate.split('-').map(Number)
            const dateObj = new Date(y, m - 1, d)
            return dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            })
        } catch {
            return tempDate
        }
    }, [ tempDate ])

    if (!isOpen) return null

    return (
        <div
            className='fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200'
            onClick={onClose}
        >
            <div
                className='bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-neutral-100 flex flex-col relative animate-in zoom-in-95 duration-150 select-none'
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className='flex items-center justify-between pb-3 border-b border-neutral-100'>
                    <div className='flex items-center gap-2.5'>
                        <div className='w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100'>
                            <i className='ri-calendar-todo-fill text-lg'></i>
                        </div>
                        <div>
                            <h3 className='text-base font-bold text-neutral-900 leading-tight'>Select Travel Date</h3>
                            <p className='text-[11px] text-neutral-500 font-medium'>Live bus, train & cab schedules</p>
                        </div>
                    </div>
                    <button
                        type='button'
                        onClick={onClose}
                        className='h-8 w-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors'
                        title='Close calendar'
                    >
                        <i className='ri-close-line text-lg'></i>
                    </button>
                </div>

                {/* Quick Presets Chips */}
                <div className='flex items-center gap-1.5 py-3 overflow-x-auto no-scrollbar border-b border-neutral-100'>
                    {quickPresets.map((preset) => {
                        const isPresetActive = preset.iso === tempDate
                        return (
                            <button
                                key={preset.label}
                                type='button'
                                onClick={() => handleQuickPreset(preset.iso)}
                                className={`text-xs px-3 py-1.5 rounded-full font-semibold shrink-0 transition-all cursor-pointer ${
                                    isPresetActive
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200/60'
                                }`}
                            >
                                {preset.label}
                            </button>
                        )
                    })}
                </div>

                {/* Month Navigation */}
                <div className='flex items-center justify-between py-3 px-1'>
                    <button
                        type='button'
                        onClick={handlePrevMonth}
                        disabled={!canGoPrev}
                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                            canGoPrev
                                ? 'hover:bg-neutral-100 text-neutral-700 cursor-pointer active:scale-95'
                                : 'text-neutral-300 cursor-not-allowed opacity-40'
                        }`}
                        title='Previous month'
                    >
                        <i className='ri-arrow-left-s-line text-xl'></i>
                    </button>

                    <h4 className='text-sm font-bold text-neutral-900 tracking-tight'>
                        {monthTitle}
                    </h4>

                    <button
                        type='button'
                        onClick={handleNextMonth}
                        className='h-8 w-8 rounded-full hover:bg-neutral-100 text-neutral-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95'
                        title='Next month'
                    >
                        <i className='ri-arrow-right-s-line text-xl'></i>
                    </button>
                </div>

                {/* Day of Week Headers */}
                <div className='grid grid-cols-7 text-center mb-1 text-[11px] font-bold text-neutral-400'>
                    {DAYS_OF_WEEK.map((d, idx) => (
                        <div key={d} className={`py-1 ${idx === 0 || idx === 6 ? 'text-amber-600/80' : ''}`}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Monthly Days Grid */}
                <div className='grid grid-cols-7 gap-1 text-center mb-4'>
                    {monthDays.map((item) => {
                        if (item.type === 'blank') {
                            return <div key={item.key} className='h-9 w-9' />
                        }

                        if (item.isPast) {
                            return (
                                <div
                                    key={item.key}
                                    className='h-9 w-9 mx-auto flex items-center justify-center text-xs font-normal text-neutral-300 opacity-40 cursor-not-allowed select-none'
                                >
                                    {item.dayNum}
                                </div>
                            )
                        }

                        return (
                            <button
                                key={item.key}
                                type='button'
                                onClick={() => handleSelectDay(item.iso)}
                                className={`h-9 w-9 mx-auto rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-all cursor-pointer relative ${
                                    item.isSelected
                                        ? 'bg-emerald-600 text-white font-bold shadow-md ring-2 ring-emerald-400/40 scale-105'
                                        : 'hover:bg-emerald-50 hover:text-emerald-700 text-neutral-800 active:scale-95'
                                }`}
                            >
                                <span>{item.dayNum}</span>
                                {item.isToday && (
                                    <span className={`w-1 h-1 rounded-full absolute bottom-1 ${item.isSelected ? 'bg-white' : 'bg-emerald-600'}`} />
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Footer Confirmation Bar */}
                <div className='pt-3 border-t border-neutral-100 flex items-center justify-between gap-3'>
                    <div className='min-w-0'>
                        <span className='text-[10px] uppercase font-bold text-neutral-400 tracking-wider block leading-tight'>
                            Selected Date
                        </span>
                        <span className='text-xs font-bold text-neutral-900 truncate block mt-0.5'>
                            {formattedSelection}
                        </span>
                    </div>

                    <button
                        type='button'
                        onClick={() => {
                            if (onSelectDate) onSelectDate(tempDate)
                            if (onClose) onClose()
                        }}
                        className='bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5'
                    >
                        <span>Confirm</span>
                        <i className='ri-check-line text-sm'></i>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DatePickerModal
