import React, { useCallback, useContext, useEffect, useRef, useState, useMemo } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import LocationSearchPanel from '../components/LocationSearchPanel'
import VehiclePanel from '../components/VehiclePanel'
import ConfirmRide from '../components/ConfirmRide'
import LookingForDriver from '../components/LookingForDriver'
import WaitingForDriver from '../components/WaitingForDriver'
import LiveTracking from '../components/LiveTracking'
import Logo from '../components/Logo'
import DatePickerModal from '../components/DatePickerModal'
import { SocketContext } from '../context/SocketContext'
import { BASE_URL, authHeader, apiError } from '../utils/api'

// Slide a bottom panel in or out whenever `open` changes.
const useSlidePanel = (ref, open) => {
    useGSAP(() => {
        if (!ref.current) return
        gsap.to(ref.current, {
            transform: open ? 'translateY(0)' : 'translateY(100%)',
            autoAlpha: open ? 1 : 0,
            pointerEvents: open ? 'auto' : 'none',
            duration: 0.35,
            ease: 'power2.out'
        })
    }, [ open ])
}

const MIN_QUERY_LENGTH = 3

const getTodayDateString = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const formatDetailedTravelDate = (dateStr) => {
    if (!dateStr) return { boldText: 'Select Date', isToday: false }
    try {
        const [ y, m, d ] = dateStr.split('-').map(Number)
        const date = new Date(y, m - 1, d)
        const today = new Date()
        const isToday = date.getFullYear() === today.getFullYear() &&
                        date.getMonth() === today.getMonth() &&
                        date.getDate() === today.getDate()
        const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        const isTomorrow = date.getFullYear() === tomorrow.getFullYear() &&
                           date.getMonth() === tomorrow.getMonth() &&
                           date.getDate() === tomorrow.getDate()
        
        const fullFormatted = date.toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
        let prefix = ''
        if (isToday) prefix = 'Today · '
        else if (isTomorrow) prefix = 'Tomorrow · '

        return {
            boldText: `${prefix}${fullFormatted}`,
            isToday
        }
    } catch {
        return { boldText: dateStr, isToday: false }
    }
}

const Home = () => {
    const [ pickup, setPickup ] = useState('')
    const [ destination, setDestination ] = useState('')
    const [ travelDate, setTravelDate ] = useState(getTodayDateString)
    const [ isDatePickerOpen, setIsDatePickerOpen ] = useState(false)
    const [ pickupCoordinates, setPickupCoordinates ] = useState(null)
    const [ destinationCoordinates, setDestinationCoordinates ] = useState(null)
    const [ panelOpen, setPanelOpen ] = useState(false)
    const [ searchLoading, setSearchLoading ] = useState(false)
    const [ transitLoading, setTransitLoading ] = useState(false)
    const [ multiModalData, setMultiModalData ] = useState(null)

    const travelDateDetails = useMemo(() => formatDetailedTravelDate(travelDate), [ travelDate ])

    const vehiclePanelRef = useRef(null)
    const searchPanelRef = useRef(null)
    const confirmRidePanelRef = useRef(null)
    const vehicleFoundRef = useRef(null)
    const waitingForDriverRef = useRef(null)
    const debounceTimerRef = useRef(null)

    const [ vehiclePanel, setVehiclePanel ] = useState(false)
    const [ isVehiclePanelMinimized, setIsVehiclePanelMinimized ] = useState(false)
    const [ isSearchMinimized, setIsSearchMinimized ] = useState(false)
    const [ confirmRidePanel, setConfirmRidePanel ] = useState(false)
    const [ vehicleFound, setVehicleFound ] = useState(false)
    const [ waitingForDriver, setWaitingForDriver ] = useState(false)
    const [ pickupSuggestions, setPickupSuggestions ] = useState([])
    const [ destinationSuggestions, setDestinationSuggestions ] = useState([])
    const [ activeField, setActiveField ] = useState(null)
    const [ fare, setFare ] = useState({})
    const [ vehicleType, setVehicleType ] = useState(null)
    const [ ride, setRide ] = useState(null)
    const [ activeWalkingRoute, setActiveWalkingRoute ] = useState(null)
    const [ isNavigating, setIsNavigating ] = useState(false)
    const [ message, setMessage ] = useState(null) // { text, isError }

    const isSheetActive = vehiclePanel || confirmRidePanel || vehicleFound || waitingForDriver || isNavigating

    const navigate = useNavigate()
    const { socket } = useContext(SocketContext)

    const showError = (text) => setMessage({ text, isError: true })

    // Close every ride panel and forget the current ride.
    const resetTrip = useCallback((text = '') => {
        setVehiclePanel(false)
        setIsVehiclePanelMinimized(false)
        setIsSearchMinimized(false)
        setConfirmRidePanel(false)
        setVehicleFound(false)
        setWaitingForDriver(false)
        setRide(null)
        setPickupCoordinates(null)
        setDestinationCoordinates(null)
        setActiveWalkingRoute(null)
        setIsNavigating(false)
        setMessage(text ? { text, isError: false } : null)
    }, [])

    // Close live city suggestions dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.city-input-container')) {
                setActiveField(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Resume a ride that is still in progress (e.g. after a page refresh).
    useEffect(() => {
        axios.get(`${BASE_URL}/rides/active`, { headers: authHeader('user') })
            .then(({ data: activeRide }) => {
                if (!activeRide) return

                if (activeRide.status === 'ongoing') {
                    navigate('/riding', { state: { ride: activeRide } })
                    return
                }

                setRide(activeRide)
                setPickup(activeRide.pickup)
                setDestination(activeRide.destination)
                setVehicleType(activeRide.vehicleType)
                if (activeRide.status === 'accepted') {
                    setWaitingForDriver(true)
                } else {
                    setVehicleFound(true)
                }
            })
            .catch(() => { /* nothing to resume */ })
    }, [ navigate ])

    useEffect(() => {
        const onRideConfirmed = (confirmedRide) => {
            setVehicleFound(false)
            setWaitingForDriver(true)
            setRide(confirmedRide)
        }
        const onRideStarted = (startedRide) => {
            setWaitingForDriver(false)
            navigate('/riding', { state: { ride: startedRide } })
        }
        const onRideCancelled = ({ cancelledBy }) => {
            if (cancelledBy === 'captain') {
                resetTrip('Your captain cancelled the ride. Please book again.')
            }
        }
        const onNoCaptains = () => {
            resetTrip('No captains are available nearby right now. Please try again in a few minutes.')
        }

        socket.on('ride-confirmed', onRideConfirmed)
        socket.on('ride-started', onRideStarted)
        socket.on('ride-cancelled', onRideCancelled)
        socket.on('no-captains', onNoCaptains)

        return () => {
            socket.off('ride-confirmed', onRideConfirmed)
            socket.off('ride-started', onRideStarted)
            socket.off('ride-cancelled', onRideCancelled)
            socket.off('no-captains', onNoCaptains)
        }
    }, [ socket, navigate, resetTrip ])

    // Debounced query to backend suggestions route
    const fetchSuggestions = (input, setSuggestions) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        if (!input || input.trim().length < MIN_QUERY_LENGTH) {
            setSuggestions([])
            setSearchLoading(false)
            return
        }

        setSearchLoading(true)
        debounceTimerRef.current = setTimeout(async () => {
            try {
                const response = await axios.get(`${BASE_URL}/maps/get-suggestions`, {
                    params: { input: input.trim() },
                    headers: authHeader('user')
                })
                setSuggestions(response.data || [])
            } catch {
                setSuggestions([])
            } finally {
                setSearchLoading(false)
            }
        }, 250)
    }

    const handlePickupChange = (e) => {
        const val = e.target.value
        setPickup(val)
        setActiveField('pickup')
        fetchSuggestions(val, setPickupSuggestions)
    }

    const handleDestinationChange = (e) => {
        const val = e.target.value
        setDestination(val)
        setActiveField('destination')
        fetchSuggestions(val, setDestinationSuggestions)
    }

    // Geocodes an address and updates coordinate state
    const fetchCoordinatesForAddress = async (address, isPickup) => {
        try {
            const { data } = await axios.get(`${BASE_URL}/maps/get-coordinates`, {
                params: { address },
                headers: authHeader('user')
            })
            if (data && (data.ltd !== undefined || data.lat !== undefined)) {
                const coords = {
                    lat: data.lat ?? data.ltd,
                    lng: data.lng
                }
                if (isPickup) {
                    setPickupCoordinates(coords)
                } else {
                    setDestinationCoordinates(coords)
                }
            }
        } catch {
            console.warn('Coordinates lookup failed for:', address)
        }
    }

    // Handle suggestion selection from the dropdown
    const handleSelectLocation = async (address, field) => {
        setMessage(null)

        if (field === 'pickup') {
            setPickup(address)
            setPickupSuggestions([])
            fetchCoordinatesForAddress(address, true)
            setActiveField(null)
        } else {
            setDestination(address)
            setDestinationSuggestions([])
            fetchCoordinatesForAddress(address, false)
            setActiveField(null)
        }
    }

    const submitHandler = (e) => {
        e.preventDefault()
        findTrip()
    }

    // Animate Vehicle Panel with support for full expansion and bottom-edge peek minimization
    useGSAP(() => {
        if (!vehiclePanelRef.current) return
        if (!vehiclePanel) {
            gsap.to(vehiclePanelRef.current, {
                transform: 'translateY(100%)',
                autoAlpha: 0,
                pointerEvents: 'none',
                duration: 0.35,
                ease: 'power2.out'
            })
        } else if (isVehiclePanelMinimized) {
            gsap.to(vehiclePanelRef.current, {
                transform: 'translateY(calc(100% - 60px))',
                autoAlpha: 1,
                pointerEvents: 'auto',
                duration: 0.35,
                ease: 'power2.out'
            })
        } else {
            gsap.to(vehiclePanelRef.current, {
                transform: 'translateY(0%)',
                autoAlpha: 1,
                pointerEvents: 'auto',
                duration: 0.35,
                ease: 'power2.out'
            })
        }
    }, [ vehiclePanel, isVehiclePanelMinimized ])

    // Animate Find Trip Search Card with support for minimization to bottom edge
    useGSAP(() => {
        if (!searchPanelRef.current) return
        if (isSheetActive) {
            gsap.to(searchPanelRef.current, {
                transform: 'translateY(100%)',
                autoAlpha: 0,
                pointerEvents: 'none',
                duration: 0.35,
                ease: 'power2.out'
            })
        } else if (isSearchMinimized) {
            gsap.to(searchPanelRef.current, {
                transform: 'translateY(calc(100% - 50px))',
                autoAlpha: 1,
                pointerEvents: 'auto',
                duration: 0.35,
                ease: 'power2.out'
            })
        } else {
            gsap.to(searchPanelRef.current, {
                transform: 'translateY(0%)',
                autoAlpha: 1,
                pointerEvents: 'auto',
                duration: 0.35,
                ease: 'power2.out'
            })
        }
    }, [ isSheetActive, isSearchMinimized ])

    useSlidePanel(confirmRidePanelRef, confirmRidePanel)
    useSlidePanel(vehicleFoundRef, vehicleFound)
    useSlidePanel(waitingForDriverRef, waitingForDriver)

    async function findTrip() {
        setMessage(null)
        setActiveWalkingRoute(null)

        if (pickup.trim().length < MIN_QUERY_LENGTH || destination.trim().length < MIN_QUERY_LENGTH) {
            showError('Enter both a pickup and a destination.')
            return
        }

        try {
            // Fetch comprehensive multi-modal transit comparison (Cabs, Transit, Trains)
            const response = await axios.get(`${BASE_URL}/rides/multi-modal`, {
                params: { pickup, destination, travelDate },
                headers: authHeader('user')
            })
            setMultiModalData(response.data)
            setFare(response.data.fare || {})
            setPanelOpen(false)
            setIsVehiclePanelMinimized(false)
            setVehiclePanel(true)
        } catch {
            // Graceful fallback to basic fare route
            try {
                const response = await axios.get(`${BASE_URL}/rides/get-fare`, {
                    params: { pickup, destination },
                    headers: authHeader('user')
                })
                setFare(response.data)
                setPanelOpen(false)
                setIsVehiclePanelMinimized(false)
                setVehiclePanel(true)
            } catch (err) {
                showError(apiError(err, 'Could not get a fare for this trip. Try another address.'))
            }
        }
    }

    // Instant travel date switching from VehiclePanel without resetting inputs
    const handleDateChange = async (newDate) => {
        if (!newDate) return
        setTravelDate(newDate)
        if (!pickup || !destination) return

        setTransitLoading(true)
        try {
            const response = await axios.get(`${BASE_URL}/rides/multi-modal`, {
                params: { pickup, destination, travelDate: newDate },
                headers: authHeader('user')
            })
            setMultiModalData(response.data)
            if (response.data.fare) {
                setFare(response.data.fare)
            }
        } catch (err) {
            console.error('Failed to update transit options for new date:', err)
        } finally {
            setTransitLoading(false)
        }
    }

    async function createRide() {
        setMessage(null)
        try {
            const { data } = await axios.post(`${BASE_URL}/rides/create`, {
                pickup,
                destination,
                vehicleType
            }, {
                headers: authHeader('user')
            })
            setRide(data)
        } catch (err) {
            setVehicleFound(false)
            showError(apiError(err, 'Could not book the ride. Please try again.'))
        }
    }

    async function cancelRide() {
        if (!ride?._id) return

        try {
            await axios.post(`${BASE_URL}/rides/cancel`, { rideId: ride._id }, { headers: authHeader('user') })
            resetTrip('Ride cancelled.')
        } catch (err) {
            showError(apiError(err, 'Could not cancel the ride.'))
        }
    }

    // 1. Map Click / Touch Trigger: Animates bottom transit or search sheet smoothly downwards to peek edge
    const handleMapClick = useCallback(() => {
        // If location suggestions list is expanded, collapse suggestions first
        if (panelOpen) {
            setPanelOpen(false)
            return
        }
        // If vehicle transit sheet is expanded, smoothly collapse it to the bottom peek edge
        if (vehiclePanel && !isVehiclePanelMinimized) {
            setIsVehiclePanelMinimized(true)
            return
        }
        // If on initial search screen and search card is up, smoothly minimize to bottom edge
        if (!isSheetActive && !isSearchMinimized) {
            setIsSearchMinimized(true)
            return
        }
    }, [ panelOpen, vehiclePanel, isVehiclePanelMinimized, isSheetActive, isSearchMinimized ])

    // Active pins on the map
    const mapMarkers = useMemo(() => {
        const list = []
        if (pickupCoordinates) {
            list.push({ position: pickupCoordinates, label: 'P', title: `Pickup: ${pickup}` })
        }
        if (destinationCoordinates) {
            list.push({ position: destinationCoordinates, label: 'D', title: `Destination: ${destination}` })
        }
        return list
    }, [ pickupCoordinates, destinationCoordinates, pickup, destination ])

    return (
        <div className='h-screen relative overflow-hidden'>
            <div className={`absolute left-5 right-5 top-5 z-10 flex items-center justify-between transition-opacity duration-300 ${isNavigating ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <Logo className='bg-white rounded-xl px-3 py-2 shadow-sm' />
                <div className='flex gap-2'>
                    <Link to='/history' title='Your rides' className='h-10 w-10 bg-white shadow-sm flex items-center justify-center rounded-full'>
                        <i className='text-lg ri-history-line'></i>
                    </Link>
                    <Link to='/user/logout' title='Log out' className='h-10 w-10 bg-white shadow-sm flex items-center justify-center rounded-full'>
                        <i className='text-lg ri-logout-box-r-line'></i>
                    </Link>
                </div>
            </div>
            <div className='h-screen w-screen'>
                <LiveTracking
                    markers={mapMarkers}
                    walkingRoute={activeWalkingRoute}
                    isNavigating={isNavigating}
                    onExitNavigation={() => {
                        setIsNavigating(false)
                        setActiveWalkingRoute(null)
                        setIsVehiclePanelMinimized(false)
                        setVehiclePanel(true)
                    }}
                    onMapClick={handleMapClick}
                />
            </div>

            {/* Search / Find a Trip Panel */}
            <div
                ref={searchPanelRef}
                className='fixed inset-x-0 bottom-0 z-20 flex flex-col justify-end translate-y-full'
            >
                <div className='bg-white shadow-2xl rounded-t-3xl p-5 pt-3 transition-all duration-300 flex flex-col h-auto'>
                    {/* Top Grab Handle for Search Sheet */}
                    <div
                        className='w-full py-2 -mt-1 mb-1 flex items-center justify-center cursor-pointer group select-none'
                        onClick={() => setIsSearchMinimized(prev => !prev)}
                        title={isSearchMinimized ? 'Expand search' : 'Collapse to map'}
                        role='button'
                        aria-label='Toggle search card'
                    >
                        <div className={`w-12 h-1.5 rounded-full transition-all duration-200 ${
                            isSearchMinimized
                                ? 'bg-emerald-700 group-hover:bg-emerald-800 shadow-xs ring-2 ring-emerald-500/30'
                                : 'bg-neutral-300 group-hover:bg-neutral-600'
                        }`} />
                    </div>

                    {/* Minimized Peek Teaser (When Search card is collapsed to map edge) */}
                    {isSearchMinimized && !isSheetActive ? (
                        <div
                            onClick={() => setIsSearchMinimized(false)}
                            className='flex items-center justify-between py-1 cursor-pointer select-none'
                        >
                            <div className='flex items-center gap-2.5 min-w-0'>
                                <div className='w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center text-xs shrink-0'>
                                    <i className='ri-search-line'></i>
                                </div>
                                <span className='font-bold text-sm text-neutral-900 truncate'>
                                    Find a trip · Tap to enter location
                                </span>
                            </div>
                            <div className='flex items-center gap-1 text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-full transition-all shrink-0'>
                                <span>Search</span>
                                <i className='ri-arrow-up-s-line text-sm'></i>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header with Title */}
                            <div className='flex items-center justify-between mb-1'>
                                <h4 className='text-2xl font-bold tracking-tight text-neutral-900'>Find a trip</h4>
                            </div>

                    {/* Input Connector and Input Fields */}
                    <form onSubmit={submitHandler} className='my-2'>
                        <div className='p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 shadow-xs flex items-stretch gap-3'>
                            {/* Left Transit Node Line Connector */}
                            <div className='flex flex-col items-center justify-between py-2.5 px-1 shrink-0 select-none'>
                                {/* Pickup Indicator */}
                                <span className='w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shadow-xs flex items-center justify-center shrink-0'>
                                    <span className='w-1 h-1 rounded-full bg-white'></span>
                                </span>
                                
                                {/* Connecting Vertical Track / Line */}
                                <div className='w-[2px] flex-1 my-1 rounded-full bg-neutral-300'></div>
                                
                                {/* Destination Indicator */}
                                <span className='w-3 h-3 rounded-xs bg-neutral-900 ring-4 ring-neutral-200 shadow-xs flex items-center justify-center shrink-0'>
                                    <span className='w-1 h-1 rounded-xs bg-white'></span>
                                </span>

                                {/* Connecting Vertical Track / Line */}
                                <div className='w-[2px] flex-1 my-1 rounded-full bg-neutral-300'></div>

                                {/* Travel Date Indicator */}
                                <span className='w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-emerald-100 shadow-xs flex items-center justify-center shrink-0'>
                                    <span className='w-1 h-1 rounded-full bg-white'></span>
                                </span>
                            </div>

                            {/* Right Input Fields Column */}
                            <div className='flex-1 flex flex-col gap-2 min-w-0'>
                                {/* Pickup Input with Live Suggestions Dropdown */}
                                <div className={`city-input-container relative ${activeField === 'pickup' ? 'z-30' : 'z-20'}`}>
                                    <div className='relative flex items-center'>
                                        <input
                                            onFocus={() => {
                                                setActiveField('pickup')
                                                if (pickup.trim().length >= MIN_QUERY_LENGTH && pickupSuggestions.length === 0) {
                                                    fetchSuggestions(pickup, setPickupSuggestions)
                                                }
                                            }}
                                            onClick={() => setActiveField('pickup')}
                                            value={pickup}
                                            onChange={handlePickupChange}
                                            className={`w-full bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 rounded-xl border transition-all placeholder:text-neutral-400 placeholder:font-normal focus:outline-none ${
                                                activeField === 'pickup'
                                                    ? 'border-neutral-900 ring-2 ring-neutral-900/10 shadow-sm'
                                                    : 'border-neutral-200 hover:border-neutral-300'
                                            }`}
                                            type="text"
                                            placeholder='Add a pick-up location'
                                        />
                                        {pickup && (
                                            <button
                                                type='button'
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setPickup('')
                                                    setPickupCoordinates(null)
                                                    setPickupSuggestions([])
                                                }}
                                                className='absolute right-2.5 text-neutral-400 hover:text-neutral-700 p-1 text-sm'
                                                title='Clear pickup'
                                            >
                                                <i className='ri-close-circle-fill'></i>
                                            </button>
                                        )}
                                    </div>

                                    {/* Pickup Live Suggestions Dropdown */}
                                    {activeField === 'pickup' && pickup.trim().length >= MIN_QUERY_LENGTH && (
                                        <ul className='absolute left-0 right-0 top-full mt-1.5 bg-white border border-amber-200/80 rounded-2xl shadow-xl shadow-amber-500/10 z-50 max-h-60 overflow-y-auto py-1 divide-y divide-amber-100/60'>
                                            {searchLoading ? (
                                                <li className='flex items-center gap-2.5 px-3.5 py-3 text-xs text-amber-800 font-medium bg-amber-50/40'>
                                                    <i className='ri-loader-4-line animate-spin text-base text-amber-600'></i>
                                                    <span>Searching locations...</span>
                                                </li>
                                            ) : pickupSuggestions.length === 0 ? (
                                                <li className='px-3.5 py-3 text-xs text-neutral-500 text-center font-medium'>
                                                    No locations found
                                                </li>
                                            ) : (
                                                pickupSuggestions.map((suggestion, idx) => {
                                                    const parts = suggestion.split(',')
                                                    const title = parts[ 0 ]?.trim() || suggestion
                                                    const subtitle = parts.slice(1).join(',')?.trim()
                                                    return (
                                                        <li
                                                            key={idx}
                                                            onMouseDown={() => handleSelectLocation(suggestion, 'pickup')}
                                                            className='flex items-center gap-3 px-3.5 py-2.5 hover:bg-amber-50/60 active:bg-amber-100/80 cursor-pointer transition-colors select-none group'
                                                        >
                                                            <span className='w-8 h-8 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-amber-500 group-hover:text-neutral-950 transition-colors'>
                                                                <i className='ri-map-pin-2-fill text-sm'></i>
                                                            </span>
                                                            <div className='flex flex-col min-w-0 text-left overflow-hidden'>
                                                                <span className='font-bold text-neutral-900 text-xs truncate group-hover:text-amber-950 transition-colors'>{title}</span>
                                                                {subtitle && (
                                                                    <span className='text-[11px] text-neutral-500 truncate'>{subtitle}</span>
                                                                )}
                                                            </div>
                                                        </li>
                                                    )
                                                })
                                            )}
                                        </ul>
                                    )}
                                </div>

                                {/* Destination Input with Live Suggestions Dropdown */}
                                <div className={`city-input-container relative ${activeField === 'destination' ? 'z-30' : 'z-10'}`}>
                                    <div className='relative flex items-center'>
                                        <input
                                            onFocus={() => {
                                                setActiveField('destination')
                                                if (destination.trim().length >= MIN_QUERY_LENGTH && destinationSuggestions.length === 0) {
                                                    fetchSuggestions(destination, setDestinationSuggestions)
                                                }
                                            }}
                                            onClick={() => setActiveField('destination')}
                                            value={destination}
                                            onChange={handleDestinationChange}
                                            className={`w-full bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 rounded-xl border transition-all placeholder:text-neutral-400 placeholder:font-normal focus:outline-none ${
                                                activeField === 'destination'
                                                    ? 'border-neutral-900 ring-2 ring-neutral-900/10 shadow-sm'
                                                    : 'border-neutral-200 hover:border-neutral-300'
                                            }`}
                                            type="text"
                                            placeholder='Enter your destination'
                                        />
                                        {destination && (
                                            <button
                                                type='button'
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setDestination('')
                                                    setDestinationCoordinates(null)
                                                    setDestinationSuggestions([])
                                                }}
                                                className='absolute right-2.5 text-neutral-400 hover:text-neutral-700 p-1 text-sm'
                                                title='Clear destination'
                                            >
                                                <i className='ri-close-circle-fill'></i>
                                            </button>
                                        )}
                                    </div>

                                    {/* Destination Live Suggestions Dropdown */}
                                    {activeField === 'destination' && destination.trim().length >= MIN_QUERY_LENGTH && (
                                        <ul className='absolute left-0 right-0 top-full mt-1.5 bg-white border border-amber-200/80 rounded-2xl shadow-xl shadow-amber-500/10 z-50 max-h-60 overflow-y-auto py-1 divide-y divide-amber-100/60'>
                                            {searchLoading ? (
                                                <li className='flex items-center gap-2.5 px-3.5 py-3 text-xs text-amber-800 font-medium bg-amber-50/40'>
                                                    <i className='ri-loader-4-line animate-spin text-base text-amber-600'></i>
                                                    <span>Searching locations...</span>
                                                </li>
                                            ) : destinationSuggestions.length === 0 ? (
                                                <li className='px-3.5 py-3 text-xs text-neutral-500 text-center font-medium'>
                                                    No locations found
                                                </li>
                                            ) : (
                                                destinationSuggestions.map((suggestion, idx) => {
                                                    const parts = suggestion.split(',')
                                                    const title = parts[ 0 ]?.trim() || suggestion
                                                    const subtitle = parts.slice(1).join(',')?.trim()
                                                    return (
                                                        <li
                                                            key={idx}
                                                            onMouseDown={() => handleSelectLocation(suggestion, 'destination')}
                                                            className='flex items-center gap-3 px-3.5 py-2.5 hover:bg-amber-50/60 active:bg-amber-100/80 cursor-pointer transition-colors select-none group'
                                                        >
                                                            <span className='w-8 h-8 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-amber-500 group-hover:text-neutral-950 transition-colors'>
                                                                <i className='ri-flag-fill text-sm text-rose-500'></i>
                                                            </span>
                                                            <div className='flex flex-col min-w-0 text-left overflow-hidden'>
                                                                <span className='font-bold text-neutral-900 text-xs truncate group-hover:text-amber-950 transition-colors'>{title}</span>
                                                                {subtitle && (
                                                                    <span className='text-[11px] text-neutral-500 truncate'>{subtitle}</span>
                                                                )}
                                                            </div>
                                                        </li>
                                                    )
                                                })
                                            )}
                                        </ul>
                                    )}
                                </div>

                                {/* Premium Travel Date Component */}
                                <div
                                    onClick={() => setIsDatePickerOpen(true)}
                                    className='group relative flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-neutral-200 hover:border-emerald-500 hover:shadow-md transition-all duration-200 cursor-pointer select-none'
                                    role='button'
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            setIsDatePickerOpen(true)
                                        }
                                    }}
                                    title='Click to select travel date'
                                >
                                    {/* Left Icon Badge & Date Content */}
                                    <div className='flex items-center gap-3 min-w-0 flex-1'>
                                        <div className='w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/80 shadow-2xs group-hover:scale-105 group-hover:border-emerald-300 transition-all duration-200'>
                                            <i className='ri-calendar-todo-fill text-lg text-emerald-700 group-hover:text-emerald-800 transition-colors'></i>
                                        </div>

                                        <div className='flex flex-col min-w-0'>
                                            <div className='flex items-center gap-1.5'>
                                                <span className='text-[10px] font-bold text-neutral-400 uppercase tracking-wider leading-none'>
                                                    Date of Journey
                                                </span>
                                                <span className='w-1.5 h-1.5 rounded-full bg-emerald-500'></span>
                                            </div>
                                            <span className='font-bold text-neutral-900 text-xs sm:text-sm mt-0.5 tracking-tight group-hover:text-emerald-700 transition-colors truncate'>
                                                {travelDateDetails.boldText}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right Interactive Dropdown Arrow Indicator */}
                                    <div className='flex items-center gap-1 shrink-0 pl-2'>
                                        <div className='h-7 w-7 rounded-lg bg-neutral-100 group-hover:bg-emerald-50 text-neutral-500 group-hover:text-emerald-700 flex items-center justify-center transition-all'>
                                            <i className='ri-arrow-down-s-line text-lg group-hover:translate-y-0.5 transition-transform'></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Primary Action Button: Find Available Trips */}
                        <button
                            type='button'
                            onClick={findTrip}
                            className='w-full bg-black hover:bg-black text-white font-bold py-3.5 px-4 rounded-xl border-2 border-transparent hover:border-emerald-500 shadow-md hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2.5 mt-3 select-none cursor-pointer'
                        >
                            <i className='ri-search-line text-lg'></i>
                            <span>Find Available Trips</span>
                        </button>
                    </form>

                        </>
                    )}

                    {message && (
                        <p className={`mt-2 text-sm ${message.isError ? 'text-red-600' : 'text-gray-700'}`}>{message.text}</p>
                    )}
                </div>
            </div>

            {/* Vehicle / Multi-modal Transit Panel */}
            <div ref={vehiclePanelRef} className='fixed w-full z-30 bottom-0 translate-y-full bg-white px-4 py-4 pt-5 shadow-2xl rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col'>
                <VehiclePanel
                    pickup={pickup}
                    destination={destination}
                    onEditRoute={() => {
                        setVehiclePanel(false)
                        setIsVehiclePanelMinimized(false)
                        setIsSearchMinimized(false)
                    }}
                    selectVehicle={setVehicleType}
                    fare={fare}
                    multiModalData={multiModalData}
                    travelDate={travelDate}
                    onDateChange={handleDateChange}
                    transitLoading={transitLoading}
                    isMinimized={isVehiclePanelMinimized}
                    onToggleMinimize={() => setIsVehiclePanelMinimized(prev => !prev)}
                    setConfirmRidePanel={setConfirmRidePanel}
                    setVehiclePanel={setVehiclePanel}
                    onSelectWalkingRoute={(walking, startNavigation = true) => {
                        setActiveWalkingRoute(walking)
                        setIsNavigating(Boolean(startNavigation))
                        if (!startNavigation) {
                            setIsVehiclePanelMinimized(true)
                        } else {
                            setVehiclePanel(false)
                        }
                    }}
                />
            </div>

            {/* Confirm Ride Panel */}
            <div ref={confirmRidePanelRef} className='fixed w-full z-40 bottom-0 translate-y-full bg-white px-4 py-6 pt-5 shadow-2xl rounded-t-3xl'>
                <ConfirmRide
                    createRide={createRide}
                    pickup={pickup}
                    destination={destination}
                    fare={fare}
                    vehicleType={vehicleType}
                    setVehiclePanel={setVehiclePanel}
                    setConfirmRidePanel={setConfirmRidePanel}
                    setVehicleFound={setVehicleFound}
                />
            </div>

            {/* Looking for Driver Panel */}
            <div ref={vehicleFoundRef} className='fixed w-full z-45 bottom-0 translate-y-full bg-white px-4 py-6 pt-5 shadow-2xl rounded-t-3xl'>
                <LookingForDriver
                    pickup={pickup}
                    destination={destination}
                    fare={ride?.fare ?? fare[ vehicleType ]}
                    vehicleType={vehicleType}
                    canCancel={Boolean(ride?._id)}
                    cancelRide={cancelRide}
                    setVehicleFound={setVehicleFound}
                />
            </div>

            {/* Waiting for Driver / Accepted Panel */}
            <div ref={waitingForDriverRef} className='fixed w-full z-50 bottom-0 translate-y-full bg-white px-4 py-6 pt-5 shadow-2xl rounded-t-3xl'>
                <WaitingForDriver
                    ride={ride}
                    cancelRide={cancelRide}
                    setWaitingForDriver={setWaitingForDriver}
                />
            </div>

            {/* Interactive Calendar Picker Modal */}
            <DatePickerModal
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                selectedDate={travelDate}
                onSelectDate={handleDateChange}
                minDate={getTodayDateString()}
            />
        </div>
    )
}

export default Home
