import React, { useState, useMemo, useEffect } from 'react'
import DatePickerModal from './DatePickerModal'
import { placeTitle } from '../utils/format'

const VehiclePanel = ({
    fare = {},
    selectVehicle,
    setConfirmRidePanel,
    setVehiclePanel,
    multiModalData = null,
    onSelectWalkingRoute = null,
    travelDate = null,
    onDateChange = null,
    transitLoading = false,
    isMinimized = false,
    onToggleMinimize = null,
    pickup = '',
    destination = '',
    onEditRoute = null
}) => {
    const [ activeTab, setActiveTab ] = useState('all') // 'all' | 'connecting' | 'fastest' | 'cheapest'
    const [ selectedTransitDetails, setSelectedTransitDetails ] = useState(null)
    const [ isCalendarModalOpen, setIsCalendarModalOpen ] = useState(false)

    // Real-time device date fallback
    const todayIso = useMemo(() => {
        const d = new Date()
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }, [])

    const activeDateStr = travelDate || multiModalData?.date?.travelDate || todayIso

    // Generate consecutive 14-day strip starting from today (redBus / MakeMyTrip style)
    const dateStripItems = useMemo(() => {
        const items = []
        const base = new Date()
        for (let i = 0; i < 14; i++) {
            const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            const iso = `${y}-${m}-${day}`
            const dayOfWeekShort = d.toLocaleDateString('en-US', { weekday: 'short' })
            const dayOfMonth = d.getDate()
            const monthShort = d.toLocaleDateString('en-US', { month: 'short' })
            
            items.push({
                iso,
                dayOfWeekShort,
                dayOfMonth,
                monthShort,
                isToday: i === 0,
                isTomorrow: i === 1,
                label: i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : dayOfWeekShort)
            })
        }

        // If user picked a date further out via calendar picker, include it in the strip
        if (activeDateStr && !items.some(it => it.iso === activeDateStr)) {
            try {
                const [ y, m, d ] = activeDateStr.split('-').map(Number)
                const customDate = new Date(y, m - 1, d)
                items.push({
                    iso: activeDateStr,
                    dayOfWeekShort: customDate.toLocaleDateString('en-US', { weekday: 'short' }),
                    dayOfMonth: customDate.getDate(),
                    monthShort: customDate.toLocaleDateString('en-US', { month: 'short' }),
                    isToday: false,
                    isTomorrow: false,
                    label: customDate.toLocaleDateString('en-US', { weekday: 'short' })
                })
            } catch {
                // Ignore invalid date format
            }
        }

        return items
    }, [ activeDateStr ])

    // Results Header Date Display (e.g. "Thu, 19 Nov 2026")
    const headerDateDisplay = useMemo(() => {
        if (multiModalData?.date?.formatted) {
            return multiModalData.date.formatted
        }
        try {
            const [ y, m, d ] = activeDateStr.split('-').map(Number)
            const dateObj = new Date(y, m - 1, d)
            return dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            })
        } catch {
            return activeDateStr
        }
    }, [ multiModalData?.date?.formatted, activeDateStr ])

    // Cabs data
    const cabs = multiModalData?.cabs || [
        { id: 'moto', vehicleType: 'moto', label: 'Nex Moto', category: 'Bike', tagline: 'Beat traffic · 1 Rider', seats: 1, fare: fare.moto || 49, durationText: '4 mins', durationMinutes: 4, etaMinutes: 2, icon: 'ri-motorbike-fill', badge: '⚡ Quickest', badgeColor: 'bg-amber-100 text-amber-900' },
        { id: 'auto', vehicleType: 'auto', label: 'Nex Auto', category: 'Auto', tagline: 'Affordable city ride · 3 Seats', seats: 3, fare: fare.auto || 71, durationText: '6 mins', durationMinutes: 6, etaMinutes: 3, icon: 'ri-taxi-fill' },
        { id: 'car', vehicleType: 'car', label: 'Nex Go', category: 'Cab', tagline: 'Comfortable AC sedan · 4 Seats', seats: 4, fare: fare.car || 112, durationText: '6 mins', durationMinutes: 6, etaMinutes: 4, icon: 'ri-car-fill', badge: '✨ Most Popular', badgeColor: 'bg-blue-100 text-blue-900' }
    ]

    // Public Transit data
    const transit = multiModalData?.transit || []

    // Train data
    const trains = multiModalData?.trains || []

    // Walking data
    const walkingOption = multiModalData?.walking || null

    // Multi-Leg Connecting Routes data (Only populated for Outskirts / Rural / No direct transit)
    const multiLegRoutes = multiModalData?.multiLegRoutes || []

    // Flag indicating whether no direct single-mode route exists
    const hasNoDirectRoute = Boolean(multiModalData?.noDirectTransit || multiLegRoutes.length > 0)

    // Automatically revert to 'all' if connecting tab was active but direct routes became available
    useEffect(() => {
        if (!hasNoDirectRoute && activeTab === 'connecting') {
            setActiveTab('all')
        }
    }, [ hasNoDirectRoute, activeTab ])

    // Unified list for sorting
    const allItems = useMemo(() => {
        const list = []
        if (walkingOption) {
            list.push({ ...walkingOption, sortPrice: 0, sortDuration: walkingOption.durationMinutes, itemType: 'walking' })
        }
        cabs.forEach(c => list.push({ ...c, sortPrice: c.fare, sortDuration: c.durationMinutes, itemType: 'cab' }))
        transit.forEach(t => list.push({ ...t, sortPrice: t.fare, sortDuration: t.durationMinutes, itemType: 'transit' }))
        trains.forEach(tr => list.push({ ...tr, sortPrice: tr.fare, sortDuration: tr.durationMinutes, itemType: 'train' }))
        multiLegRoutes.forEach(ml => list.push({ ...ml, sortPrice: ml.totalFare, sortDuration: ml.totalDurationMinutes, itemType: 'multileg' }))
        return list
    }, [ walkingOption, cabs, transit, trains, multiLegRoutes ])

    // Filtered / sorted items based on activeTab
    const displayedItems = useMemo(() => {
        if (activeTab === 'connecting') {
            return allItems.filter(item => item.itemType === 'multileg')
        }
        if (activeTab === 'fastest') {
            return [ ...allItems ].sort((a, b) => a.sortDuration - b.sortDuration)
        }
        if (activeTab === 'cheapest') {
            return [ ...allItems ].sort((a, b) => a.sortPrice - b.sortPrice)
        }
        return null // For 'all', we render categorized sections
    }, [ activeTab, allItems ])

    const handleSelectCab = (vehicleType) => {
        if (selectVehicle) selectVehicle(vehicleType)
        if (setConfirmRidePanel) setConfirmRidePanel(true)
        if (setVehiclePanel) setVehiclePanel(false)
    }

    const handleViewWalkingRoute = (walking) => {
        if (onSelectWalkingRoute && walking) {
            onSelectWalkingRoute(walking)
        }
        setSelectedTransitDetails(null)
    }

    // Helper to render a rich, comprehensive multi-leg connecting route card
    const renderMultiLegCard = (mlRoute) => (
        <div
            key={mlRoute.id}
            onClick={() => setSelectedTransitDetails(mlRoute)}
            className='bg-white border border-purple-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:border-purple-400 cursor-pointer group'
        >
            {/* Top Row: Flow summary, Total Duration, and Bold Total Fare */}
            <div className='flex items-start justify-between gap-3 border-b border-neutral-100 pb-3'>
                <div className='min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                        <h4 className='font-bold text-base text-neutral-900'>{mlRoute.label}</h4>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${mlRoute.badgeColor || 'bg-purple-100 text-purple-800 border-purple-200'}`}>
                            {mlRoute.badge}
                        </span>
                    </div>
                    <p className='text-xs text-neutral-500 font-medium mt-0.5'>
                        {mlRoute.tagline}
                    </p>
                </div>

                {/* Bold Total Summary */}
                <div className='text-right shrink-0'>
                    <div className='flex items-baseline justify-end gap-1'>
                        <span className='text-xs font-semibold text-neutral-500'>Total:</span>
                        <span className='text-xl font-extrabold text-neutral-950 tracking-tight'>
                            ₹{mlRoute.totalFare}
                        </span>
                    </div>
                    <p className='text-xs font-bold text-purple-900 flex items-center justify-end gap-1 mt-0.5'>
                        <i className='ri-time-line text-xs'></i>
                        <span>{mlRoute.totalDurationText}</span>
                    </p>
                </div>
            </div>

            {/* Step-by-Step Leg Breakdown Timeline */}
            <div className='mt-3 space-y-2.5'>
                {mlRoute.legs?.map((leg, legIdx) => (
                    <div key={legIdx} className='flex items-center justify-between text-xs bg-neutral-50/80 rounded-xl p-2.5 border border-neutral-100'>
                        <div className='flex items-center gap-2.5 min-w-0'>
                            <span className='h-6 w-6 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center text-[10px] shrink-0 shadow-2xs'>
                                <i className={leg.icon}></i>
                            </span>
                            <div className='min-w-0'>
                                <div className='flex items-center gap-1.5'>
                                    <span className='font-bold text-neutral-900'>Leg {leg.legIndex}: {leg.label}</span>
                                    {leg.routeNumber && (
                                        <span className='text-[10px] font-mono text-neutral-500 bg-neutral-200/70 px-1 py-0.2 rounded'>
                                            {leg.routeNumber}
                                        </span>
                                    )}
                                </div>
                                <p className='text-[11px] text-neutral-600 truncate mt-0.5'>
                                    {leg.from} ➔ {leg.to} ({leg.distanceText} · {leg.durationText})
                                </p>
                            </div>
                        </div>

                        <div className='shrink-0 pl-2 text-right'>
                            {leg.isEstimated ? (
                                <div className='flex flex-col items-end'>
                                    <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200'>
                                        {leg.fareText}
                                    </span>
                                    <span className='text-[9px] text-neutral-400 font-medium mt-0.5'>~₹{leg.fare} est.</span>
                                </div>
                            ) : (
                                <span className='text-xs font-bold text-neutral-900 bg-white px-2 py-0.5 rounded-lg border border-neutral-200'>
                                    {leg.fareText}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Action Footer */}
            <div className='mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-xs'>
                <span className='text-[11px] text-neutral-500 flex items-center gap-1'>
                    <i className='ri-information-line text-purple-600'></i> {mlRoute.fareNotice}
                </span>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTransitDetails(mlRoute)
                    }}
                    className='bg-purple-950 hover:bg-black active:scale-95 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full shadow-sm transition-all flex items-center gap-1'
                >
                    <span>Itinerary Details</span>
                    <i className='ri-arrow-right-line text-xs'></i>
                </button>
            </div>
        </div>
    )

    return (
        <div className='max-h-[82vh] flex flex-col'>
            {/* Top Drag / Collapse Hit Area (Generous touch & click target) */}
            <div
                className='w-full py-2.5 -mt-2 mb-0.5 flex items-center justify-center cursor-pointer group select-none'
                onClick={onToggleMinimize || (() => setVehiclePanel(false))}
                title={isMinimized ? 'Expand transit options' : 'Minimize to map view'}
                role='button'
                aria-label='Toggle transit panel'
            >
                <div className={`w-12 h-1.5 rounded-full transition-all duration-200 ${
                    isMinimized
                        ? 'bg-emerald-700 group-hover:bg-emerald-800 shadow-xs ring-2 ring-emerald-500/30'
                        : 'bg-neutral-300 group-hover:bg-neutral-600'
                }`} />
            </div>

            {/* Raw and Display place titles for Route Header */}
            {(() => null)()}
            {/* Minimized Peek Summary Bar (Only rendered when minimized at the bottom edge) */}
            {isMinimized ? (
                <div
                    onClick={onToggleMinimize}
                    className='flex items-center justify-between pb-1 px-1 cursor-pointer select-none'
                >
                    <div className='flex items-center gap-2.5 min-w-0'>
                        <div className='w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-2xs'>
                            <i className='ri-route-line text-base'></i>
                        </div>
                        <div className='flex flex-col min-w-0'>
                            <div className='flex items-center gap-1.5 min-w-0'>
                                <span className='font-bold text-sm text-neutral-900 truncate'>
                                    {placeTitle(pickup || multiModalData?.route?.pickup) || 'Source'} <span className='text-emerald-600 font-semibold'>➔</span> {placeTitle(destination || multiModalData?.route?.destination) || 'Destination'}
                                </span>
                            </div>
                            <p className='text-[11px] text-neutral-500 font-medium truncate'>
                                {multiModalData?.route?.distanceText ? `${multiModalData.route.distanceText} · ~${multiModalData.route.durationText} travel` : 'Cabs, Buses & Trains'}
                            </p>
                        </div>
                    </div>

                    <div className='flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200 transition-all shrink-0'>
                        <span>View All</span>
                        <i className='ri-arrow-up-s-line text-sm'></i>
                    </div>
                </div>
            ) : (
                <>
                    {/* 1. Active Route Header & Summary Bar + Back / Change Route Action */}
                    <div className='bg-neutral-50 border border-neutral-200/90 rounded-2xl p-2.5 mb-2.5 shadow-2xs'>
                        <div className='flex items-center justify-between gap-2'>
                            {/* Left: Back Arrow Button & Origin ➔ Destination */}
                            <div className='flex items-center gap-2.5 min-w-0 flex-1'>
                                <button
                                    type='button'
                                    onClick={onEditRoute || (() => setVehiclePanel(false))}
                                    className='h-8 w-8 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 hover:text-black flex items-center justify-center transition-all shrink-0 shadow-2xs active:scale-95'
                                    title='Back to search'
                                    aria-label='Back to search'
                                >
                                    <i className='ri-arrow-left-line text-base font-semibold'></i>
                                </button>

                                <div className='flex flex-col min-w-0 flex-1'>
                                    <div className='flex items-center gap-1.5 min-w-0'>
                                        <span
                                            className='font-bold text-neutral-900 text-sm sm:text-base leading-tight truncate'
                                            title={pickup || multiModalData?.route?.pickup || ''}
                                        >
                                            {placeTitle(pickup || multiModalData?.route?.pickup) || 'Source'}
                                        </span>
                                        <i className='ri-arrow-right-line text-emerald-600 text-sm shrink-0 font-bold'></i>
                                        <span
                                            className='font-bold text-neutral-900 text-sm sm:text-base leading-tight truncate'
                                            title={destination || multiModalData?.route?.destination || ''}
                                        >
                                            {placeTitle(destination || multiModalData?.route?.destination) || 'Destination'}
                                        </span>
                                    </div>

                                    {/* Distance & Travel Duration */}
                                    {multiModalData?.route && (
                                        <div className='flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium mt-0.5'>
                                            <span className='w-1.5 h-1.5 rounded-full bg-emerald-500'></span>
                                            <span className='font-semibold text-neutral-700'>{multiModalData.route.distanceText}</span>
                                            <span>·</span>
                                            <span>~{multiModalData.route.durationText} travel</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Sleek Change Route Action Pill */}
                            <button
                                type='button'
                                onClick={onEditRoute || (() => setVehiclePanel(false))}
                                className='flex items-center gap-1 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 px-3 py-1.5 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer select-none active:scale-95'
                                title='Change pickup or destination'
                            >
                                <i className='ri-edit-2-line text-xs text-emerald-600'></i>
                                <span>Change</span>
                            </button>
                        </div>
                    </div>

                    {/* Results Title, Super App Tag & Travel Date Display */}
                    <div className='flex items-center justify-between mb-2.5 px-1'>
                        <div className='flex items-center gap-2 flex-wrap min-w-0'>
                            <h3 className='text-lg font-bold tracking-tight text-neutral-900 leading-none'>
                                Available Transits
                            </h3>
                            <div className='inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200/90 rounded-lg text-xs font-semibold shadow-2xs'>
                                <i className='ri-calendar-check-fill text-emerald-600 text-sm'></i>
                                <span>For <strong className='font-bold text-emerald-950'>{headerDateDisplay}</strong></span>
                            </div>
                        </div>

                        <span className='text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-yellow-400 text-black shadow-2xs shrink-0 ml-2'>
                            Super App
                        </span>
                    </div>

            {/* 2. Top Horizontal Date Strip (redBus / MakeMyTrip style with instant date switching) */}
            <div className='mb-3 relative'>
                <div className='flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-0.5 scroll-smooth'>
                    {dateStripItems.map((item) => {
                        const isSelected = item.iso === activeDateStr
                        return (
                            <button
                                key={item.iso}
                                type='button'
                                onClick={() => {
                                    if (onDateChange && item.iso !== activeDateStr) {
                                        onDateChange(item.iso)
                                    }
                                }}
                                className={`flex flex-col items-center justify-center shrink-0 min-w-[58px] py-1.5 px-2 rounded-xl transition-all duration-150 select-none cursor-pointer ${
                                    isSelected
                                        ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/30 scale-[1.02] font-bold'
                                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200/80 active:scale-95'
                                }`}
                            >
                                <span className={`text-[10px] uppercase tracking-wider font-semibold ${isSelected ? 'text-emerald-100' : 'text-neutral-500'}`}>
                                    {item.label}
                                </span>
                                <span className='text-sm font-bold leading-tight my-0.5'>
                                    {item.dayOfMonth}
                                </span>
                                <span className={`text-[9px] uppercase font-medium leading-none ${isSelected ? 'text-emerald-100' : 'text-neutral-400'}`}>
                                    {item.monthShort}
                                </span>
                            </button>
                        )
                    })}

                    {/* Interactive Calendar Picker at the end */}
                    <div className='relative shrink-0'>
                        <button
                            type='button'
                            onClick={() => setIsCalendarModalOpen(true)}
                            className='flex flex-col items-center justify-center min-w-[58px] h-full py-1.5 px-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200/90 transition-all cursor-pointer group active:scale-95 select-none'
                            title='Pick a custom travel date'
                        >
                            <i className='ri-calendar-2-line text-base text-emerald-700 group-hover:text-emerald-800'></i>
                            <span className='text-[10px] font-bold mt-0.5 whitespace-nowrap text-neutral-700 group-hover:text-black'>
                                More
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Instant Date Switching & Re-fetching Live Feedback */}
            {transitLoading && (
                <div className='flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold animate-pulse mb-3'>
                    <i className='ri-loader-4-line animate-spin text-emerald-600 text-sm'></i>
                    <span>Updating transit options & seats for {headerDateDisplay}...</span>
                </div>
            )}

            {/* Segmented Filter Tabs (Compact, Natural-Sized Pill Group) */}
            <div className='flex items-center mb-4'>
                <div className='inline-flex items-center p-1 bg-neutral-100 rounded-full border border-neutral-200/80 gap-1'>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'all'
                                ? 'bg-black text-white shadow-sm'
                                : 'text-neutral-600 hover:text-black hover:bg-neutral-200/70'
                        }`}
                    >
                        <span>🌟</span>
                        <span>All-in-One</span>
                    </button>

                    {/* 2. Conditional "Connecting Routes" Tab (Renders ONLY when no direct single-mode route exists) */}
                    {hasNoDirectRoute && (
                        <button
                            onClick={() => setActiveTab('connecting')}
                            className={`px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'connecting'
                                    ? 'bg-purple-950 text-white shadow-sm ring-1 ring-purple-600 font-bold'
                                    : 'text-purple-900 bg-purple-100/90 hover:bg-purple-200 font-bold border border-purple-200'
                            }`}
                        >
                            <span>🔗</span>
                            <span>Connecting Routes</span>
                        </button>
                    )}

                    <button
                        onClick={() => setActiveTab('fastest')}
                        className={`px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'fastest'
                                ? 'bg-black text-white shadow-sm'
                                : 'text-neutral-600 hover:text-black hover:bg-neutral-200/70'
                        }`}
                    >
                        <span>⚡</span>
                        <span>Fastest</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('cheapest')}
                        className={`px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'cheapest'
                                ? 'bg-black text-white shadow-sm'
                                : 'text-neutral-600 hover:text-black hover:bg-neutral-200/70'
                        }`}
                    >
                        <span>💰</span>
                        <span>Cheapest</span>
                    </button>
                </div>
            </div>

            {/* Scrollable Comparative List with Bottom Safe Padding */}
            <div className='overflow-y-auto space-y-4 pr-1 pb-10 flex-1'>

                {/* 1. Red No-Direct-Route Warning Banner (Clean single professional alert) */}
                {hasNoDirectRoute && (
                    <div className='p-3 bg-red-50 border border-red-200/90 rounded-2xl flex items-center justify-between gap-2.5 text-red-950 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200'>
                        <div className='flex items-center gap-2 min-w-0'>
                            <span className='text-base shrink-0'>⚠️</span>
                            <p className='text-xs font-medium text-red-950 leading-snug'>
                                <span className='font-bold'>No direct route available on this route.</span> Please check the Connecting Routes tab above.
                            </p>
                        </div>
                        <span className='text-[10px] font-bold bg-red-200/90 text-red-950 px-2 py-0.5 rounded-full shrink-0'>
                            Transfer Required
                        </span>
                    </div>
                )}

                {/* If Sorted by Fastest, Cheapest, or Connecting: Filtered List */}
                {displayedItems ? (
                    <div className='space-y-3'>
                        {/* Connecting Tab Info Header */}
                        {activeTab === 'connecting' && (
                            <div className='flex items-center justify-between px-1 mb-1'>
                                <h4 className='text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5'>
                                    <i className='ri-route-line text-purple-700'></i> Multi-Step Connecting Combinations
                                </h4>
                                <span className='text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200'>
                                    {displayedItems.length} Options
                                </span>
                            </div>
                        )}

                        {displayedItems.length === 0 ? (
                            <div className='text-center py-8 text-neutral-500 text-xs'>
                                <p className='font-semibold'>No transit options found for this filter.</p>
                            </div>
                        ) : (
                            displayedItems.map((item) => {
                                if (item.itemType === 'multileg') {
                                    return renderMultiLegCard(item)
                                }
                                if (item.itemType === 'walking') {
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => setSelectedTransitDetails(item)}
                                            className='bg-white border border-emerald-200/90 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all hover:border-emerald-400 flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99]'
                                        >
                                            <div className='flex items-center gap-3.5 min-w-0'>
                                                <div className='h-12 w-14 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-3xl shrink-0 border border-emerald-200 group-hover:scale-105 transition-transform'>
                                                    <i className={item.icon || 'ri-walk-fill'}></i>
                                                </div>
                                                <div className='min-w-0'>
                                                    <div className='flex items-center gap-2'>
                                                        <h4 className='font-bold text-base text-neutral-900 truncate'>{item.label}</h4>
                                                        <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0'>
                                                            {item.badge}
                                                        </span>
                                                    </div>
                                                    <p className='text-xs text-neutral-600 font-medium truncate mt-0.5'>
                                                        <span className='font-semibold text-neutral-900'>{item.durationText}</span> ({item.distanceText}) · {item.tagline}
                                                    </p>
                                                    <p className='text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1'>
                                                        <i className='ri-heart-pulse-fill text-rose-500'></i> Healthy choice · Direct footpath
                                                    </p>
                                                </div>
                                            </div>

                                            <div className='flex flex-col items-end shrink-0 pl-2'>
                                                <span className='text-lg font-bold text-emerald-700 tracking-tight'>₹0</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleViewWalkingRoute(item.walking)
                                                    }}
                                                    className='mt-1 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full shadow-sm transition-all flex items-center gap-1'
                                                >
                                                    <span>Navigate</span>
                                                    <i className='ri-navigation-fill text-xs'></i>
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }
                                if (item.itemType === 'cab') {
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleSelectCab(item.vehicleType)}
                                            className='bg-white border border-neutral-200/90 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all hover:border-neutral-300 flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99]'
                                        >
                                            <div className='flex items-center gap-3.5 min-w-0'>
                                                <div className='h-12 w-14 rounded-xl bg-neutral-100 flex items-center justify-center text-3xl text-neutral-800 shrink-0 group-hover:scale-105 transition-transform'>
                                                    <i className={item.icon}></i>
                                                </div>
                                                <div className='min-w-0'>
                                                    <div className='flex items-center gap-2'>
                                                        <h4 className='font-bold text-base text-neutral-900 truncate'>{item.label}</h4>
                                                        <span className='text-[11px] font-medium text-neutral-500 flex items-center gap-0.5 shrink-0'>
                                                            <i className='ri-user-3-fill text-[10px]'></i> {item.seats}
                                                        </span>
                                                        {item.badge && (
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor || 'bg-amber-100 text-amber-900'}`}>
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className='text-xs text-neutral-500 font-medium truncate mt-0.5'>
                                                        <span className='font-semibold text-neutral-800'>{item.durationText}</span> · {item.tagline}
                                                    </p>
                                                    <p className='text-[11px] text-emerald-600 font-medium mt-0.5'>
                                                        <i className='ri-flashlight-line mr-0.5'></i> Driver in {item.etaMinutes || 2} mins
                                                    </p>
                                                </div>
                                            </div>

                                            <div className='flex flex-col items-end shrink-0 pl-2'>
                                                <span className='text-lg font-bold text-neutral-950 tracking-tight'>₹{item.fare}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleSelectCab(item.vehicleType)
                                                    }}
                                                    className='mt-1 bg-black hover:bg-neutral-800 active:scale-95 text-white font-semibold text-xs px-4 py-1.5 rounded-full shadow-sm transition-all flex items-center gap-1'
                                                >
                                                    <span>Book</span>
                                                    <i className='ri-arrow-right-line text-xs'></i>
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }
                                if (item.itemType === 'transit') {
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => setSelectedTransitDetails(item)}
                                            className='bg-white border border-neutral-200/90 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all hover:border-emerald-300 flex items-center justify-between gap-3 cursor-pointer'
                                        >
                                            <div className='flex items-center gap-3.5 min-w-0'>
                                                <div className='h-12 w-14 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl shrink-0 border border-emerald-100'>
                                                    <i className={item.icon}></i>
                                                </div>
                                                <div className='min-w-0'>
                                                    <div className='flex items-center gap-2'>
                                                        <h4 className='font-bold text-base text-neutral-900 truncate'>{item.label}</h4>
                                                        {item.badge && (
                                                            <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0'>
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className='text-xs text-neutral-600 font-medium truncate mt-0.5'>
                                                        <span className='font-semibold text-neutral-900'>{item.durationText}</span> · {item.routeSummary}
                                                    </p>
                                                    <p className='text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1'>
                                                        <i className='ri-walk-line'></i> Walk {item.walkingDistance}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className='flex flex-col items-end shrink-0 pl-2'>
                                                <span className='text-lg font-bold text-emerald-700 tracking-tight'>₹{item.fare}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedTransitDetails(item)
                                                    }}
                                                    className='mt-1 bg-neutral-900 hover:bg-black active:scale-95 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full shadow-sm transition-all flex items-center gap-1'
                                                >
                                                    <span>Route Steps</span>
                                                    <i className='ri-compass-3-line text-xs'></i>
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }
                                // Train
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedTransitDetails(item)}
                                        className='bg-white border border-neutral-200/90 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all hover:border-indigo-300 flex items-center justify-between gap-3 cursor-pointer'
                                    >
                                        <div className='flex items-center gap-3.5 min-w-0'>
                                            <div className='h-12 w-14 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-2xl shrink-0 border border-indigo-100'>
                                                <i className={item.icon}></i>
                                            </div>
                                            <div className='min-w-0'>
                                                <div className='flex items-center gap-2'>
                                                    <h4 className='font-bold text-base text-neutral-900 truncate'>{item.trainName}</h4>
                                                    <span className='text-[10px] font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded shrink-0'>#{item.trainNumber}</span>
                                                </div>
                                                <p className='text-xs text-neutral-600 font-medium truncate mt-0.5'>
                                                    <span className='font-semibold text-neutral-900'>{item.departureSummary || `${item.departure} ➔ ${item.arrival}`}</span> ({item.durationText})
                                                </p>
                                                <div className='flex items-center gap-1.5 mt-1'>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.predictor?.badgeClass || 'bg-neutral-100 text-neutral-700'}`}>
                                                        <i className='ri-shield-check-fill mr-0.5'></i> {item.predictor?.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className='flex flex-col items-end shrink-0 pl-2'>
                                            <span className='text-lg font-bold text-indigo-950 tracking-tight'>From ₹{item.fare}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedTransitDetails(item)
                                                }}
                                                className='mt-1 bg-neutral-900 hover:bg-black active:scale-95 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full shadow-sm transition-all flex items-center gap-1'
                                            >
                                                <span>View Seats</span>
                                                <i className='ri-arrow-right-s-line text-xs'></i>
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                ) : (
                    /* Categorized All-in-One View */
                    <>
                        {/* 0. Walking Transport Option (When distance is reasonable <= 4 km) */}
                        {walkingOption && (
                            <div>
                                <div className='flex items-center justify-between mb-2 px-1'>
                                    <h4 className='text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5'>
                                        <i className='ri-walk-line text-emerald-600 text-sm'></i> Walking (Healthy & Free)
                                    </h4>
                                    <span className='text-[11px] text-emerald-700 font-bold'>🟢 Free · Zero Emission</span>
                                </div>

                                <div
                                    onClick={() => setSelectedTransitDetails(walkingOption)}
                                    className='bg-white border border-emerald-200/90 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all hover:border-emerald-400 flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99]'
                                >
                                    <div className='flex items-center gap-3.5 min-w-0'>
                                        <div className='h-12 w-14 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-3xl shrink-0 border border-emerald-200 group-hover:scale-105 transition-transform'>
                                            <i className={walkingOption.icon || 'ri-walk-fill'}></i>
                                        </div>
                                        <div className='min-w-0'>
                                            <div className='flex items-center gap-2'>
                                                <h4 className='font-bold text-base text-neutral-900 truncate'>{walkingOption.label}</h4>
                                                <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0'>
                                                    {walkingOption.badge}
                                                </span>
                                            </div>
                                            <p className='text-xs text-neutral-600 font-medium truncate mt-0.5'>
                                                <span className='font-semibold text-neutral-900'>{walkingOption.durationText}</span> ({walkingOption.distanceText}) · {walkingOption.tagline}
                                            </p>
                                            <p className='text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1'>
                                                <i className='ri-heart-pulse-fill text-rose-500'></i> Healthy choice · Direct footpath
                                            </p>
                                        </div>
                                    </div>

                                    <div className='flex flex-col items-end shrink-0 pl-2'>
                                        <span className='text-lg font-bold text-emerald-700 tracking-tight'>₹0</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleViewWalkingRoute(walkingOption.walking)
                                            }}
                                            className='mt-1 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full shadow-sm transition-all flex items-center gap-1'
                                        >
                                            <span>Navigate</span>
                                            <i className='ri-navigation-fill text-xs'></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 1. On-Demand Cabs & Bikes */}
                        <div>
                            <div className='flex items-center justify-between mb-2 px-1'>
                                <h4 className='text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5'>
                                    <i className='ri-car-line text-black text-sm'></i> Cabs & Bikes (Doorstep Pickup)
                                </h4>
                                <span className='text-[11px] text-emerald-600 font-medium'>Available Now</span>
                            </div>

                            <div className='space-y-3'>
                                {cabs.map(cab => (
                                    <div
                                        key={cab.id}
                                        onClick={() => handleSelectCab(cab.vehicleType)}
                                        className='bg-white border border-neutral-200/90 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all hover:border-neutral-300 flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99]'
                                    >
                                        <div className='flex items-center gap-3.5 min-w-0'>
                                            <div className='h-12 w-14 rounded-xl bg-neutral-100 flex items-center justify-center text-3xl text-neutral-800 shrink-0 group-hover:scale-105 transition-transform'>
                                                <i className={cab.icon}></i>
                                            </div>
                                            <div className='min-w-0'>
                                                <div className='flex items-center gap-2'>
                                                    <h4 className='font-bold text-base text-neutral-900 truncate'>{cab.label}</h4>
                                                    <span className='text-[11px] font-medium text-neutral-500 flex items-center gap-0.5 shrink-0'>
                                                        <i className='ri-user-3-fill text-[10px]'></i> {cab.seats}
                                                    </span>
                                                    {cab.badge && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${cab.badgeColor || 'bg-amber-100 text-amber-900'}`}>
                                                            {cab.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className='text-xs text-neutral-500 font-medium truncate mt-0.5'>
                                                    <span className='font-semibold text-neutral-800'>{cab.durationText}</span> · {cab.tagline}
                                                </p>
                                                <p className='text-[11px] text-emerald-600 font-medium mt-0.5'>
                                                    <i className='ri-flashlight-line mr-0.5'></i> Driver in {cab.etaMinutes || 2} mins
                                                </p>
                                            </div>
                                        </div>

                                        <div className='flex flex-col items-end shrink-0 pl-2'>
                                            <span className='text-lg font-bold text-neutral-950 tracking-tight'>₹{cab.fare}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleSelectCab(cab.vehicleType)
                                                }}
                                                className='mt-1 bg-black hover:bg-neutral-800 active:scale-95 text-white font-semibold text-xs px-4 py-1.5 rounded-full shadow-sm transition-all flex items-center gap-1'
                                            >
                                                <span>Book</span>
                                                <i className='ri-arrow-right-line text-xs'></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Public Transit: Metro & City Buses */}
                        {transit.length > 0 && (
                            <div className='pt-2'>
                                <div className='flex items-center justify-between mb-2 px-1'>
                                    <h4 className='text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5'>
                                        <i className='ri-bus-fill text-emerald-600 text-sm'></i> Public Transit (Metro & Buses)
                                    </h4>
                                    <span className='text-[11px] text-emerald-700 font-medium'>Budget & Eco-Friendly</span>
                                </div>

                                <div className='space-y-3'>
                                    {transit.map(t => (
                                        <div
                                            key={t.id}
                                            onClick={() => setSelectedTransitDetails(t)}
                                            className='bg-white border border-neutral-200/90 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all hover:border-emerald-300 flex items-center justify-between gap-3 cursor-pointer'
                                        >
                                            <div className='flex items-center gap-3.5 min-w-0'>
                                                <div className='h-12 w-14 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl shrink-0 border border-emerald-100'>
                                                    <i className={t.icon}></i>
                                                </div>
                                                <div className='min-w-0'>
                                                    <div className='flex items-center gap-2'>
                                                        <h4 className='font-bold text-base text-neutral-900 truncate'>{t.label}</h4>
                                                        {t.badge && (
                                                            <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0'>
                                                                {t.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className='text-xs text-neutral-600 font-medium truncate mt-0.5'>
                                                        <span className='font-semibold text-neutral-900'>{t.durationText}</span> · {t.routeSummary}
                                                    </p>
                                                    <p className='text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1'>
                                                        <i className='ri-walk-line'></i> Walk {t.walkingDistance} · {t.frequencyText}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className='flex flex-col items-end shrink-0 pl-2'>
                                                <span className='text-lg font-bold text-emerald-700 tracking-tight'>₹{t.fare}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedTransitDetails(t)
                                                    }}
                                                    className='mt-1 bg-neutral-900 hover:bg-black active:scale-95 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full shadow-sm transition-all flex items-center gap-1'
                                                >
                                                    <span>Route Steps</span>
                                                    <i className='ri-compass-3-line text-xs'></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Trains: Regional & Superfast with Confirmation Predictor */}
                        {trains.length > 0 && (
                            <div className='pt-2'>
                                <div className='flex items-center justify-between mb-2 px-1'>
                                    <h4 className='text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5'>
                                        <i className='ri-train-line text-indigo-600 text-sm'></i> Railway & Superfast Trains
                                    </h4>
                                    <span className='text-[11px] text-indigo-600 font-medium'>AI Ticket Predictor</span>
                                </div>

                                <div className='space-y-3'>
                                    {trains.map(train => (
                                        <div
                                            key={train.id}
                                            onClick={() => setSelectedTransitDetails(train)}
                                            className='bg-white border border-neutral-200/90 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all hover:border-indigo-300 flex items-center justify-between gap-3 cursor-pointer'
                                        >
                                            <div className='flex items-center gap-3.5 min-w-0'>
                                                <div className='h-12 w-14 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-2xl shrink-0 border border-indigo-100'>
                                                    <i className={train.icon}></i>
                                                </div>
                                                <div className='min-w-0'>
                                                    <div className='flex items-center gap-2'>
                                                        <h4 className='font-bold text-base text-neutral-900 truncate'>{train.trainName}</h4>
                                                        <span className='text-[10px] font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded shrink-0'>#{train.trainNumber}</span>
                                                    </div>
                                                    <p className='text-xs text-neutral-600 font-medium truncate mt-0.5'>
                                                        <span className='font-semibold text-neutral-900'>{train.departureSummary || `${train.departure} ➔ ${train.arrival}`}</span> ({train.durationText})
                                                    </p>
                                                    <div className='flex items-center gap-1.5 mt-1'>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${train.predictor?.badgeClass || 'bg-neutral-100 text-neutral-700'}`}>
                                                            <i className='ri-shield-check-fill mr-0.5'></i> {train.predictor?.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className='flex flex-col items-end shrink-0 pl-2'>
                                                <span className='text-lg font-bold text-indigo-950 tracking-tight'>From ₹{train.fare}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedTransitDetails(train)
                                                    }}
                                                    className='mt-1 bg-neutral-900 hover:bg-black active:scale-95 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full shadow-sm transition-all flex items-center gap-1'
                                                >
                                                    <span>View Seats</span>
                                                    <i className='ri-arrow-right-s-line text-xs'></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. Multi-Leg Connecting Transfers (Only shown for Outskirts / Rural / No Direct Transit) */}
                        {multiLegRoutes.length > 0 && (
                            <div className='pt-2'>
                                <div className='flex items-center justify-between mb-2.5 px-1'>
                                    <div className='flex items-center gap-1.5'>
                                        <span className='h-5 w-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs'>
                                            <i className='ri-route-line'></i>
                                        </span>
                                        <h4 className='text-[11px] font-bold uppercase tracking-wider text-purple-900'>
                                            Connecting Transfers (Outskirts & Village Access)
                                        </h4>
                                    </div>
                                    <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200'>
                                        Doorstep Delivery
                                    </span>
                                </div>

                                <div className='space-y-3.5'>
                                    {multiLegRoutes.map((mlRoute) => renderMultiLegCard(mlRoute))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            </>
        )}

            {/* Modal for Public Transit Instructions & Turn-by-Turn Walking Directions */}
            {selectedTransitDetails && (
                <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3'>
                    <div className='bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl max-h-[82vh] overflow-y-auto animate-in fade-in slide-in-from-bottom duration-200'>
                        <div className='flex items-center justify-between pb-3 border-b border-gray-100'>
                            <div className='flex items-center gap-2.5'>
                                <span className={`h-11 w-11 rounded-2xl flex items-center justify-center text-xl text-white ${
                                    selectedTransitDetails.mode === 'multileg'
                                        ? 'bg-purple-700'
                                        : selectedTransitDetails.mode === 'transit' || selectedTransitDetails.mode === 'walking'
                                            ? 'bg-emerald-600'
                                            : 'bg-indigo-600'
                                }`}>
                                    <i className={selectedTransitDetails.icon}></i>
                                </span>
                                <div>
                                    <h4 className='font-bold text-gray-900'>{selectedTransitDetails.label || selectedTransitDetails.trainName}</h4>
                                    <p className='text-xs text-gray-500 font-medium'>{selectedTransitDetails.category || selectedTransitDetails.type}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTransitDetails(null)}
                                className='h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors'
                            >
                                <i className='ri-close-line text-lg'></i>
                            </button>
                        </div>

                        {/* Travel Date in Modal */}
                        {selectedTransitDetails.travelDateFormatted && (
                            <div className='mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100/90 rounded-xl text-xs font-semibold text-neutral-800 border border-neutral-200/80'>
                                <i className='ri-calendar-event-fill text-emerald-600 text-sm'></i>
                                <span>Journey Date: <strong>{selectedTransitDetails.travelDateFormatted}</strong></span>
                            </div>
                        )}

                        {/* Walking Route Details Modal */}
                        {selectedTransitDetails.mode === 'walking' && (
                            <div className='mt-4 space-y-4'>
                                <div className='p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80'>
                                    <div className='flex justify-between text-sm font-semibold mb-1'>
                                        <span className='text-neutral-600'>Fare:</span>
                                        <span className='text-emerald-700 font-bold'>₹0 (Completely Free)</span>
                                    </div>
                                    <div className='flex justify-between text-xs text-neutral-600 font-medium'>
                                        <span>Estimated Walking Time:</span>
                                        <span className='text-neutral-900 font-semibold'>{selectedTransitDetails.durationText}</span>
                                    </div>
                                    <div className='flex justify-between text-xs text-neutral-600 font-medium mt-1'>
                                        <span>Total Pedestrian Distance:</span>
                                        <span className='text-neutral-900 font-semibold'>{selectedTransitDetails.distanceText}</span>
                                    </div>
                                    <div className='flex justify-between text-xs text-neutral-600 font-medium mt-1'>
                                        <span>Environmental Impact:</span>
                                        <span className='text-emerald-800 font-bold'>0g CO₂ (100% Zero Emission)</span>
                                    </div>
                                </div>

                                <div className='p-4 bg-white border border-neutral-200 rounded-2xl'>
                                    <div className='flex items-center justify-between mb-2.5'>
                                        <div className='flex items-center gap-1.5'>
                                            <i className='ri-footprint-fill text-emerald-700 text-base'></i>
                                            <h5 className='text-xs font-bold uppercase tracking-wider text-neutral-900'>
                                                Pedestrian Walking Guidance
                                            </h5>
                                        </div>
                                        <span className='text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full'>
                                            Direct Route
                                        </span>
                                    </div>

                                    <div className='space-y-2.5'>
                                        {(selectedTransitDetails.walking?.turnByTurn || [
                                            { step: 1, instruction: 'Head towards destination along pedestrian walkway', distance: selectedTransitDetails.distanceText, icon: 'ri-walk-line' }
                                        ]).map((step, idx) => (
                                            <div key={idx} className='flex items-start gap-2.5 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100'>
                                                <span className='h-6 w-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5 shadow-xs'>
                                                    <i className={step.icon || 'ri-walk-line'}></i>
                                                </span>
                                                <div className='flex-1 text-xs text-neutral-800 font-medium'>
                                                    <p className='leading-tight'>{step.instruction}</p>
                                                    <span className='text-[10px] text-emerald-700 font-semibold block mt-0.5'>{step.distance}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {onSelectWalkingRoute && selectedTransitDetails.walking && (
                                        <button
                                            onClick={() => handleViewWalkingRoute(selectedTransitDetails.walking)}
                                            className='w-full mt-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.99]'
                                        >
                                            <i className='ri-navigation-fill text-sm'></i>
                                            <span>Show Walking Navigation on Map</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Public Transit Content with Explicit Walking Directions */}
                        {selectedTransitDetails.mode === 'transit' && (
                            <div className='mt-4 space-y-4'>
                                {/* Summary Card */}
                                <div className='p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100'>
                                    <div className='flex justify-between text-sm font-semibold mb-1'>
                                        <span className='text-neutral-600'>Fixed Fare:</span>
                                        <span className='text-emerald-700 font-bold'>₹{selectedTransitDetails.fare}</span>
                                    </div>
                                    <div className='flex justify-between text-xs text-neutral-600 font-medium'>
                                        <span>Total Duration:</span>
                                        <span className='text-neutral-900 font-semibold'>{selectedTransitDetails.durationText}</span>
                                    </div>
                                    <div className='flex justify-between text-xs text-neutral-600 font-medium mt-1'>
                                        <span>Frequency:</span>
                                        <span className='text-neutral-900'>{selectedTransitDetails.frequencyText}</span>
                                    </div>
                                </div>

                                {/* Explicit Walking Directions to Station */}
                                <div className='p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl'>
                                    <div className='flex items-center justify-between mb-2.5'>
                                        <div className='flex items-center gap-1.5'>
                                            <i className='ri-footprint-fill text-emerald-700 text-base'></i>
                                            <h5 className='text-xs font-bold uppercase tracking-wider text-emerald-950'>
                                                Walking Directions to Station
                                            </h5>
                                        </div>
                                        <span className='text-xs font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full'>
                                            {selectedTransitDetails.walking?.distanceText || '280 m'} · {selectedTransitDetails.walking?.durationText || '4 mins'}
                                        </span>
                                    </div>

                                    <div className='mb-3 text-xs text-neutral-700 font-medium'>
                                        <span className='text-neutral-500'>Target Entrance: </span>
                                        <strong className='text-neutral-900'>{selectedTransitDetails.walking?.stationName || 'Boarding Station'}</strong>
                                        {selectedTransitDetails.walking?.gate && (
                                            <span className='ml-1 text-emerald-800 font-bold'>({selectedTransitDetails.walking.gate})</span>
                                        )}
                                    </div>

                                    {/* Turn-by-Turn Steps */}
                                    <div className='space-y-2.5'>
                                        {(selectedTransitDetails.walking?.turnByTurn || [
                                            { instruction: 'Head towards the station pedestrian pathway', distance: '120 m', icon: 'ri-walk-line' },
                                            { instruction: 'Turn right at the pedestrian crossing to Gate 2', distance: '100 m', icon: 'ri-corner-up-right-line' },
                                            { instruction: 'Enter station concourse level via escalators', distance: '60 m', icon: 'ri-login-box-line' }
                                        ]).map((step, idx) => (
                                            <div key={idx} className='flex items-start gap-2.5 bg-white/90 p-2.5 rounded-xl border border-emerald-100 shadow-2xs'>
                                                <span className='h-6 w-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5 shadow-xs'>
                                                    <i className={step.icon || 'ri-walk-line'}></i>
                                                </span>
                                                <div className='flex-1 text-xs text-neutral-800 font-medium'>
                                                    <p className='leading-tight'>{step.instruction}</p>
                                                    <span className='text-[10px] text-emerald-700 font-semibold block mt-0.5'>{step.distance}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Interactive Map Button to trigger Dotted Walking Line */}
                                    {onSelectWalkingRoute && selectedTransitDetails.walking && (
                                        <button
                                            onClick={() => handleViewWalkingRoute(selectedTransitDetails.walking)}
                                            className='w-full mt-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.99]'
                                        >
                                            <i className='ri-map-pin-range-line text-sm'></i>
                                            <span>Show Dotted Walking Route on Map</span>
                                        </button>
                                    )}
                                </div>

                                {/* General Transit Instructions */}
                                <div>
                                    <h5 className='text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2'>Subsequent Journey Steps</h5>
                                    <div className='space-y-2 text-xs text-neutral-700'>
                                        {selectedTransitDetails.instructions?.map((step, sIdx) => (
                                            <div key={sIdx} className='flex items-start gap-2.5 p-2 bg-neutral-50 rounded-xl'>
                                                <span className='h-5 w-5 rounded-full bg-neutral-200 text-neutral-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5'>
                                                    {sIdx + 1}
                                                </span>
                                                <p className='leading-relaxed font-medium'>{step}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Train Classes & Confirmation Content */}
                        {selectedTransitDetails.mode === 'train' && (
                            <div className='mt-4 space-y-4'>
                                <div className='p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100'>
                                    <div className='flex items-center justify-between mb-2'>
                                        <span className='text-xs font-bold text-indigo-950'>Smart Confirmation Predictor</span>
                                        <span className='text-xs font-bold text-indigo-700'>{selectedTransitDetails.predictor?.probability}% Clearance Probability</span>
                                    </div>
                                    <div className='w-full bg-neutral-200 rounded-full h-2 mb-2'>
                                        <div
                                            className={`h-2 rounded-full ${selectedTransitDetails.predictor?.probability > 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                            style={{ width: `${selectedTransitDetails.predictor?.probability}%` }}
                                        />
                                    </div>
                                    <p className='text-[11px] text-indigo-900 font-medium'>{selectedTransitDetails.predictor?.label}</p>
                                </div>

                                <div>
                                    <h5 className='text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2.5'>Available Classes & Fares</h5>
                                    <div className='space-y-2'>
                                        {selectedTransitDetails.classes?.map((cl, cIdx) => (
                                            <div key={cIdx} className='flex items-center justify-between p-3 border border-neutral-200 rounded-2xl bg-neutral-50/50'>
                                                <div>
                                                    <span className='font-bold text-sm text-neutral-900'>{cl.code}</span>
                                                    <span className='text-xs text-neutral-500 ml-2 font-medium'>{cl.name}</span>
                                                </div>
                                                <div className='text-right'>
                                                    <div className='font-bold text-sm text-neutral-900'>₹{cl.fare}</div>
                                                    <div className='text-[10px] font-semibold text-emerald-600'>{cl.status} ({cl.chance})</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Multi-Leg Connecting Route Details Modal */}
                        {selectedTransitDetails.mode === 'multileg' && (
                            <div className='mt-4 space-y-4'>
                                {/* Total Summary Card */}
                                <div className='p-4 bg-purple-50/80 rounded-2xl border border-purple-200/80'>
                                    <div className='flex justify-between items-baseline mb-2'>
                                        <span className='text-xs uppercase tracking-wider text-purple-900 font-bold'>Combined Total Fare:</span>
                                        <span className='text-2xl font-black text-purple-950 tracking-tight'>
                                            ₹{selectedTransitDetails.totalFare} <span className='text-xs font-semibold text-purple-700'>(Est.)</span>
                                        </span>
                                    </div>
                                    <div className='grid grid-cols-2 gap-2 text-xs text-neutral-700 font-medium pt-2 border-t border-purple-200/60'>
                                        <div>
                                            <span className='text-neutral-500 block text-[10px] uppercase'>Total Journey Time</span>
                                            <strong className='text-neutral-900 font-bold text-sm'>{selectedTransitDetails.totalDurationText}</strong>
                                        </div>
                                        <div>
                                            <span className='text-neutral-500 block text-[10px] uppercase'>Total Distance</span>
                                            <strong className='text-neutral-900 font-bold text-sm'>{selectedTransitDetails.totalDistanceText}</strong>
                                        </div>
                                    </div>
                                    <p className='text-[11px] text-purple-800 font-medium mt-2'>
                                        <i className='ri-shield-check-line mr-1'></i> {selectedTransitDetails.fareNotice}
                                    </p>
                                </div>

                                {/* Step-by-Step Leg Breakdown with Clear Interchange Points */}
                                <div className='p-4 bg-white border border-neutral-200 rounded-2xl'>
                                    <div className='flex items-center justify-between mb-3'>
                                        <div className='flex items-center gap-1.5'>
                                            <i className='ri-route-line text-purple-700 text-base'></i>
                                            <h5 className='text-xs font-bold uppercase tracking-wider text-neutral-900'>
                                                Step-by-Step Leg Itinerary
                                            </h5>
                                        </div>
                                        <span className='text-xs font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full'>
                                            {selectedTransitDetails.legs?.length || 2} Legs
                                        </span>
                                    </div>

                                    <div className='space-y-3.5 relative'>
                                        {selectedTransitDetails.legs?.map((leg, lIdx) => (
                                            <div key={lIdx} className='p-3 bg-neutral-50/90 rounded-xl border border-neutral-200'>
                                                <div className='flex items-center justify-between mb-1.5'>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='h-6 w-6 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center text-[11px] shadow-xs'>
                                                            <i className={leg.icon}></i>
                                                        </span>
                                                        <div>
                                                            <h6 className='font-bold text-xs text-neutral-900'>
                                                                Leg {leg.legIndex}: {leg.label}
                                                            </h6>
                                                            {leg.routeNumber && (
                                                                <span className='text-[10px] text-neutral-500 font-mono'>{leg.routeNumber}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {leg.isEstimated ? (
                                                            <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200'>
                                                                {leg.fareText}
                                                            </span>
                                                        ) : (
                                                            <span className='text-xs font-bold text-neutral-900 bg-white px-2 py-0.5 rounded-md border border-neutral-200'>
                                                                {leg.fareText}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className='text-xs text-neutral-600 space-y-0.5 my-2'>
                                                    <p className='flex items-center gap-1.5'>
                                                        <i className='ri-map-pin-line text-emerald-600 text-xs'></i>
                                                        <span><strong>From:</strong> {leg.from}</span>
                                                    </p>
                                                    <p className='flex items-center gap-1.5'>
                                                        <i className='ri-map-pin-fill text-rose-600 text-xs'></i>
                                                        <span><strong>To:</strong> {leg.to}</span>
                                                    </p>
                                                    <p className='text-[11px] text-neutral-500'>
                                                        <span>Distance: <strong>{leg.distanceText}</strong></span> · <span>Est. Duration: <strong>{leg.durationText}</strong></span>
                                                    </p>
                                                </div>

                                                {/* Explicit Guidance / Transfer Instruction */}
                                                <div className='bg-white p-2 rounded-lg border border-neutral-100 text-[11px] text-neutral-800 font-medium flex items-start gap-1.5'>
                                                    <i className='ri-arrow-right-circle-fill text-purple-600 mt-0.5'></i>
                                                    <span>{leg.instruction}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Individual Leg Fare Breakdown */}
                                <div className='p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs'>
                                    <h5 className='font-bold text-neutral-800 uppercase tracking-wider text-[10px] mb-2'>
                                        Individual Leg Fare Breakdown
                                    </h5>
                                    <div className='space-y-1.5 text-neutral-700'>
                                        {selectedTransitDetails.legs?.map((leg, idx) => (
                                            <div key={idx} className='flex justify-between items-center py-0.5 border-b border-neutral-100 last:border-0'>
                                                <span className='text-neutral-600'>Leg {leg.legIndex} ({leg.label})</span>
                                                <span className='font-semibold text-neutral-900'>
                                                    {leg.isEstimated ? `Meter / Actual Fare (~₹${leg.fare})` : leg.fareText}
                                                </span>
                                            </div>
                                        ))}
                                        <div className='flex justify-between items-center pt-2 font-bold text-sm text-purple-950 border-t border-neutral-200'>
                                            <span>Total Estimated Journey Cost:</span>
                                            <span>₹{selectedTransitDetails.totalFare}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setSelectedTransitDetails(null)}
                            className='w-full mt-5 bg-black hover:bg-neutral-800 text-white font-semibold py-2.5 rounded-full text-sm transition-all active:scale-[0.99]'
                        >
                            Back to Options
                        </button>
                    </div>
                </div>
            )}

            {/* Interactive Calendar Picker Modal */}
            <DatePickerModal
                isOpen={isCalendarModalOpen}
                onClose={() => setIsCalendarModalOpen(false)}
                selectedDate={activeDateStr}
                onSelectDate={(newDate) => {
                    if (onDateChange) {
                        onDateChange(newDate)
                    }
                }}
                minDate={todayIso}
            />
        </div>
    )
}

export default VehiclePanel
