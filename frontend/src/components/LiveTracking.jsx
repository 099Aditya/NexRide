import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Default center: Central New Delhi / Connaught Place
const DEFAULT_CENTER = {
    lat: 28.6318,
    lng: 77.2194
}

// Coordinate helper to safely normalize lat/lng
const getCoords = (obj) => {
    if (!obj) return null
    const lat = obj.lat !== undefined ? obj.lat : obj.ltd
    const lng = obj.lng !== undefined ? obj.lng : obj.lon
    if (lat === undefined || lng === undefined || isNaN(Number(lat)) || isNaN(Number(lng))) return null
    return { lat: Number(lat), lng: Number(lng) }
}

// -------------------------------------------------------------
// HTML Marker Icon Generators (RemixIcon + Tailwind CSS)
// -------------------------------------------------------------
const createPickupIcon = (title = 'Pickup') => {
    return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
            <div class="relative flex flex-col items-center select-none" style="transform: translate(-50%, -100%);">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white flex items-center justify-center shadow-xl border-2 border-white ring-4 ring-emerald-500/25 transition-transform hover:scale-110">
                    <i class="ri-map-pin-user-fill text-xl"></i>
                </div>
                <div class="w-2.5 h-2.5 bg-emerald-700 rotate-45 -mt-1 border-r border-b border-white"></div>
                <div class="mt-1 bg-neutral-950/90 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg whitespace-nowrap border border-white/20 tracking-tight">
                    ${title}
                </div>
            </div>
        `,
        iconSize: [ 0, 0 ],
        iconAnchor: [ 0, 0 ]
    })
}

const createDropoffIcon = (title = 'Dropoff') => {
    return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
            <div class="relative flex flex-col items-center select-none" style="transform: translate(-50%, -100%);">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-neutral-950 to-neutral-800 text-white flex items-center justify-center shadow-xl border-2 border-white ring-4 ring-neutral-900/25 transition-transform hover:scale-110">
                    <i class="ri-flag-fill text-lg text-rose-500"></i>
                </div>
                <div class="w-2.5 h-2.5 bg-neutral-950 rotate-45 -mt-1 border-r border-b border-white"></div>
                <div class="mt-1 bg-neutral-950/90 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg whitespace-nowrap border border-white/20 tracking-tight">
                    ${title}
                </div>
            </div>
        `,
        iconSize: [ 0, 0 ],
        iconAnchor: [ 0, 0 ]
    })
}

const createCaptainIcon = (title = 'Captain') => {
    return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
            <div class="relative flex flex-col items-center select-none" style="transform: translate(-50%, -100%);">
                <div class="w-10 h-10 rounded-2xl bg-neutral-950 text-amber-400 flex items-center justify-center shadow-xl border-2 border-amber-400 ring-4 ring-amber-400/20 transition-transform hover:scale-110">
                    <i class="ri-car-fill text-xl"></i>
                </div>
                <div class="w-2.5 h-2.5 bg-neutral-950 rotate-45 -mt-1 border-r border-b border-amber-400"></div>
                <div class="mt-1 bg-neutral-950/90 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap border border-amber-400/30">
                    ${title}
                </div>
            </div>
        `,
        iconSize: [ 0, 0 ],
        iconAnchor: [ 0, 0 ]
    })
}

const createStationIcon = (title = 'Station') => {
    return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
            <div class="relative flex flex-col items-center select-none" style="transform: translate(-50%, -100%);">
                <div class="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl border-2 border-white ring-4 ring-indigo-500/25">
                    <i class="ri-subway-fill text-lg"></i>
                </div>
                <div class="w-2 h-2 bg-indigo-600 rotate-45 -mt-1 border-r border-b border-white"></div>
                <div class="mt-1 bg-indigo-950/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
                    ${title}
                </div>
            </div>
        `,
        iconSize: [ 0, 0 ],
        iconAnchor: [ 0, 0 ]
    })
}

const createUserLocationIcon = () => {
    return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
            <div class="relative flex items-center justify-center select-none" style="transform: translate(-50%, -50%);">
                <div class="w-7 h-7 rounded-full bg-blue-500/30 animate-ping absolute"></div>
                <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg relative z-10"></div>
            </div>
        `,
        iconSize: [ 0, 0 ],
        iconAnchor: [ 0, 0 ]
    })
}

const createNavArrowIcon = (heading = 0, hasArrived = false) => {
    return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
            <div class="relative flex items-center justify-center select-none" style="transform: translate(-50%, -50%);">
                <div class="w-12 h-12 rounded-full ${hasArrived ? 'bg-emerald-500/30' : 'bg-blue-500/30'} animate-ping absolute"></div>
                <div class="w-10 h-10 rounded-full ${
                    hasArrived ? 'bg-emerald-600 ring-4 ring-emerald-500/30' : 'bg-blue-600 ring-4 ring-blue-500/30'
                } text-white flex items-center justify-center shadow-2xl border-2 border-white transition-all duration-300 relative z-10" style="transform: rotate(${hasArrived ? 0 : heading}deg);">
                    <i class="${hasArrived ? 'ri-check-line text-2xl font-bold' : 'ri-navigation-fill text-lg'}"></i>
                </div>
            </div>
        `,
        iconSize: [ 0, 0 ],
        iconAnchor: [ 0, 0 ]
    })
}

// -------------------------------------------------------------
// LiveTracking: Free Real-time Leaflet + OpenStreetMap Map Component
// -------------------------------------------------------------
const LiveTracking = ({
    markers = [],
    walkingRoute = null,
    isNavigating = false,
    onExitNavigation = null,
    onMapClick = null
}) => {
    const mapContainerRef = useRef(null)
    const mapRef = useRef(null)
    const markersLayerRef = useRef(null)
    const routeLayerRef = useRef(null)
    const navMarkerRef = useRef(null)
    const userLocationMarkerRef = useRef(null)

    const [ userPosition, setUserPosition ] = useState(null)
    const [ navProgress, setNavProgress ] = useState(0) // 0.0 to 1.0 along the route (non-looping)
    const [ isMapReady, setIsMapReady ] = useState(false)

    // Watch real-time user GPS location
    useEffect(() => {
        if (!navigator.geolocation) return

        const updatePosition = (position) => {
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            }
            setUserPosition(pos)
        }

        const watchId = navigator.geolocation.watchPosition(
            updatePosition,
            (err) => console.warn('User location watch error:', err.message),
            { enableHighAccuracy: true }
        )

        return () => navigator.geolocation.clearWatch(watchId)
    }, [])

    // Initialize Leaflet Map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return

        const initialCenter = markers.length > 0 && getCoords(markers[ 0 ].position)
            ? [ getCoords(markers[ 0 ].position).lat, getCoords(markers[ 0 ].position).lng ]
            : [ DEFAULT_CENTER.lat, DEFAULT_CENTER.lng ]

        const map = L.map(mapContainerRef.current, {
            center: initialCenter,
            zoom: 14,
            zoomControl: false,
            attributionControl: true
        })

        // Free OpenStreetMap vector/raster tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
        }).addTo(map)

        // Add clean zoom controls at top-right
        L.control.zoom({ position: 'topright' }).addTo(map)

        // Layer groups for clean management
        routeLayerRef.current = L.layerGroup().addTo(map)
        markersLayerRef.current = L.layerGroup().addTo(map)

        // Smooth map click handler (dismisses/minimizes sheets on background click)
        map.on('click', () => {
            if (onMapClick) onMapClick()
        })

        mapRef.current = map
        setIsMapReady(true)

        // Handle dynamic container resize
        const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize()
        })
        resizeObserver.observe(mapContainerRef.current)

        return () => {
            resizeObserver.disconnect()
            map.remove()
            mapRef.current = null
            setIsMapReady(false)
        }
    }, [])

    // Ensure map updates dimensions if layout changes
    useEffect(() => {
        if (mapRef.current) {
            const timer = setTimeout(() => {
                mapRef.current?.invalidateSize()
            }, 250)
            return () => clearTimeout(timer)
        }
    }, [ isNavigating, markers, walkingRoute ])

    // Navigation GPS step simulation (Strictly non-looping: terminates at 1.0)
    useEffect(() => {
        if (!isNavigating || !walkingRoute) return
        setNavProgress(0)

        const interval = setInterval(() => {
            setNavProgress(prev => {
                if (prev >= 1) {
                    clearInterval(interval)
                    return 1
                }
                const next = prev + 0.004
                if (next >= 1) {
                    clearInterval(interval)
                    return 1
                }
                return next
            })
        }, 60)

        return () => clearInterval(interval)
    }, [ isNavigating, walkingRoute ])

    // Start & Destination coordinates
    const startCoords = useMemo(() => {
        if (walkingRoute?.pickupCoordinates) return getCoords(walkingRoute.pickupCoordinates)
        const pMarker = markers.find(m => m.label === 'P')
        if (pMarker) return getCoords(pMarker.position)
        return userPosition || DEFAULT_CENTER
    }, [ walkingRoute, markers, userPosition ])

    const endCoords = useMemo(() => {
        if (walkingRoute?.stationCoordinates) return getCoords(walkingRoute.stationCoordinates)
        const dMarker = markers.find(m => m.label === 'D')
        if (dMarker) return getCoords(dMarker.position)
        return DEFAULT_CENTER
    }, [ walkingRoute, markers ])

    const hasArrived = navProgress >= 1

    // Heading calculation for navigation puck
    const heading = useMemo(() => {
        if (!startCoords || !endCoords) return 0
        const dLon = (endCoords.lng - startCoords.lng) * Math.PI / 180
        const lat1 = startCoords.lat * Math.PI / 180
        const lat2 = endCoords.lat * Math.PI / 180
        const y = Math.sin(dLon) * Math.cos(lat2)
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
        const brng = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
        return Math.round(brng)
    }, [ startCoords, endCoords ])

    // Real-time navigation coordinate
    const currentNavCoords = useMemo(() => {
        if (!startCoords || !endCoords) return DEFAULT_CENTER
        return {
            lat: startCoords.lat + (endCoords.lat - startCoords.lat) * navProgress,
            lng: startCoords.lng + (endCoords.lng - startCoords.lng) * navProgress
        }
    }, [ startCoords, endCoords, navProgress ])

    // Navigation steps & metrics
    const totalMeters = walkingRoute?.distanceMeters || 1200
    const remainingMeters = Math.max(0, Math.round(totalMeters * (1 - navProgress)))
    const remainingDistText = hasArrived ? '0 m' : remainingMeters < 1000 ? `${remainingMeters} m` : `${(remainingMeters / 1000).toFixed(1)} km`

    const totalMinutes = walkingRoute?.durationMinutes || 15
    const remainingMinutes = Math.max(0, Math.round(totalMinutes * (1 - navProgress)))
    const remainingTimeText = hasArrived ? 'Arrived' : `${Math.max(1, remainingMinutes)} min`

    const steps = useMemo(() => {
        if (walkingRoute?.turnByTurn && walkingRoute.turnByTurn.length > 0) {
            return walkingRoute.turnByTurn
        }
        return [
            { step: 1, instruction: 'Head along pedestrian route toward transit access', distance: walkingRoute?.distanceText || '300 m', icon: 'ri-walk-line' },
            { step: 2, instruction: 'Follow direct walkway along main corridor', distance: '250 m', icon: 'ri-direction-line' },
            { step: 3, instruction: `Arrive at: ${walkingRoute?.stationName || 'Destination'}`, distance: '50 m', icon: 'ri-map-pin-2-fill' }
        ]
    }, [ walkingRoute ])

    const currentStepIndex = Math.min(steps.length - 1, Math.floor(navProgress * steps.length))
    const currentStep = steps[ currentStepIndex ] || steps[ 0 ]

    // -------------------------------------------------------------
    // Render Markers & Route Polylines onto Leaflet Map
    // -------------------------------------------------------------
    useEffect(() => {
        if (!isMapReady || !mapRef.current) return

        const map = mapRef.current
        const markersGroup = markersLayerRef.current
        const routeGroup = routeLayerRef.current

        markersGroup.clearLayers()
        routeGroup.clearLayers()

        const boundsPoints = []

        // 1. User Live Location Marker (Pulsing Blue)
        if (userPosition && !isNavigating) {
            const userMarker = L.marker([ userPosition.lat, userPosition.lng ], {
                icon: createUserLocationIcon(),
                interactive: false
            })
            markersGroup.addLayer(userMarker)
        }

        // 2. Custom Destination & Pickup Pins
        let pickupPos = null
        let dropoffPos = null

        markers.forEach(m => {
            const pos = getCoords(m.position)
            if (!pos) return

            boundsPoints.push([ pos.lat, pos.lng ])

            if (m.label === 'P') {
                pickupPos = pos
                const marker = L.marker([ pos.lat, pos.lng ], {
                    icon: createPickupIcon(m.title ? m.title.replace(/^Pickup:\s*/i, '').slice(0, 20) : 'Pickup'),
                    title: m.title || 'Pickup Location'
                })
                markersGroup.addLayer(marker)
            } else if (m.label === 'D') {
                dropoffPos = pos
                const marker = L.marker([ pos.lat, pos.lng ], {
                    icon: createDropoffIcon(m.title ? m.title.replace(/^Destination:\s*/i, '').slice(0, 20) : 'Dropoff'),
                    title: m.title || 'Destination'
                })
                markersGroup.addLayer(marker)
            } else if (m.label === 'C') {
                const marker = L.marker([ pos.lat, pos.lng ], {
                    icon: createCaptainIcon(m.title || 'Captain'),
                    title: m.title || 'Captain'
                })
                markersGroup.addLayer(marker)
            } else {
                const marker = L.marker([ pos.lat, pos.lng ], {
                    icon: createPickupIcon(m.title || 'Location')
                })
                markersGroup.addLayer(marker)
            }
        })

        // 3. Walking Route Markers & Polyline
        if (walkingRoute?.stationCoordinates && walkingRoute?.pickupCoordinates) {
            const wStart = getCoords(walkingRoute.pickupCoordinates)
            const wEnd = getCoords(walkingRoute.stationCoordinates)

            if (wStart && wEnd) {
                boundsPoints.push([ wStart.lat, wStart.lng ])
                boundsPoints.push([ wEnd.lat, wEnd.lng ])

                // Station Pin
                const stationMarker = L.marker([ wEnd.lat, wEnd.lng ], {
                    icon: createStationIcon(walkingRoute.stationName || 'Station'),
                    title: walkingRoute.stationName
                })
                markersGroup.addLayer(stationMarker)

                // Dashed Walking Polyline
                const walkingLine = L.polyline([ [ wStart.lat, wStart.lng ], [ wEnd.lat, wEnd.lng ] ], {
                    color: '#059669',
                    weight: 5,
                    dashArray: '8, 10',
                    opacity: 0.9,
                    lineJoin: 'round'
                })
                routeGroup.addLayer(walkingLine)
            }
        }

        // 4. Road Route Polyline (Between Pickup & Dropoff over actual roads using OSRM)
        if (pickupPos && dropoffPos) {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickupPos.lng},${pickupPos.lat};${dropoffPos.lng},${dropoffPos.lat}?overview=full&geometries=geojson`

            let isCancelled = false

            fetch(osrmUrl)
                .then(res => res.json())
                .then(data => {
                    if (isCancelled) return
                    if (data?.routes?.[ 0 ]?.geometry?.coordinates) {
                        const coords = data.routes[ 0 ].geometry.coordinates.map(([ lng, lat ]) => [ lat, lng ])

                        // Route background casing for elevated contrast
                        const bgLine = L.polyline(coords, {
                            color: '#064e3b',
                            weight: 8,
                            opacity: 0.35,
                            lineJoin: 'round'
                        })
                        routeGroup.addLayer(bgLine)

                        // Main emerald route line
                        const routeLine = L.polyline(coords, {
                            color: '#059669',
                            weight: 5,
                            opacity: 0.95,
                            lineJoin: 'round',
                            lineCap: 'round'
                        })
                        routeGroup.addLayer(routeLine)

                        if (!isNavigating && coords.length > 0) {
                            map.fitBounds(routeLine.getBounds(), {
                                padding: [ 70, 70 ],
                                maxZoom: 16,
                                animate: true
                            })
                        }
                    } else {
                        // Fallback straight route line
                        drawDirectRouteLine([ pickupPos, dropoffPos ])
                    }
                })
                .catch(() => {
                    if (!isCancelled) {
                        drawDirectRouteLine([ pickupPos, dropoffPos ])
                    }
                })

            function drawDirectRouteLine([ p1, p2 ]) {
                const directLine = L.polyline([ [ p1.lat, p1.lng ], [ p2.lat, p2.lng ] ], {
                    color: '#059669',
                    weight: 5,
                    opacity: 0.85,
                    dashArray: '6, 6'
                })
                routeGroup.addLayer(directLine)
            }

            return () => {
                isCancelled = true
            }
        }

        // Auto-fit bounds if we have multiple points and not in active navigation mode
        if (boundsPoints.length > 1 && !isNavigating) {
            const bounds = L.latLngBounds(boundsPoints)
            map.fitBounds(bounds, { padding: [ 70, 70 ], maxZoom: 16, animate: true })
        } else if (boundsPoints.length === 1 && !isNavigating) {
            map.setView(boundsPoints[ 0 ], 15, { animate: true })
        }
    }, [ isMapReady, markers, walkingRoute, userPosition, isNavigating ])

    // -------------------------------------------------------------
    // Live Navigation Puck Updates
    // -------------------------------------------------------------
    useEffect(() => {
        if (!isMapReady || !mapRef.current) return
        const map = mapRef.current

        if (isNavigating && walkingRoute) {
            if (!navMarkerRef.current) {
                const marker = L.marker([ currentNavCoords.lat, currentNavCoords.lng ], {
                    icon: createNavArrowIcon(heading, hasArrived),
                    zIndexOffset: 1000
                }).addTo(map)
                navMarkerRef.current = marker
            } else {
                navMarkerRef.current.setLatLng([ currentNavCoords.lat, currentNavCoords.lng ])
                navMarkerRef.current.setIcon(createNavArrowIcon(heading, hasArrived))
            }

            // Keep map smoothly centered on the navigation puck
            map.setView([ currentNavCoords.lat, currentNavCoords.lng ], 17, { animate: true })
        } else {
            if (navMarkerRef.current) {
                navMarkerRef.current.remove()
                navMarkerRef.current = null
            }
        }
    }, [ isMapReady, isNavigating, walkingRoute, currentNavCoords, heading, hasArrived ])

    // Recenter map on user location or markers
    const handleRecenter = useCallback(() => {
        if (!mapRef.current) return
        const map = mapRef.current

        if (markers.length > 0) {
            const pts = markers.map(m => getCoords(m.position)).filter(Boolean).map(c => [ c.lat, c.lng ])
            if (pts.length > 1) {
                map.fitBounds(L.latLngBounds(pts), { padding: [ 70, 70 ], maxZoom: 16, animate: true })
                return
            } else if (pts.length === 1) {
                map.setView(pts[ 0 ], 15, { animate: true })
                return
            }
        }

        if (userPosition) {
            map.setView([ userPosition.lat, userPosition.lng ], 15, { animate: true })
        } else {
            map.setView([ DEFAULT_CENTER.lat, DEFAULT_CENTER.lng ], 14, { animate: true })
        }
    }, [ markers, userPosition ])

    return (
        <div className='relative w-full h-full select-none overflow-hidden'>
            {/* Real-time OpenStreetMap Leaflet Container */}
            <div ref={mapContainerRef} className='w-full h-full z-0' />

            {/* Quick Recenter Floating Action Button */}
            {!isNavigating && (
                <button
                    onClick={handleRecenter}
                    title='Recenter Map'
                    className='absolute top-36 right-4 z-10 w-9 h-9 bg-white hover:bg-emerald-50 text-neutral-800 hover:text-emerald-700 rounded-xl shadow-lg border border-neutral-200/80 flex items-center justify-center transition-all duration-200 active:scale-95'
                >
                    <i className='ri-crosshair-2-line text-lg'></i>
                </button>
            )}

            {/* Static Route Pill when walkingRoute is active but NOT navigating */}
            {walkingRoute && !isNavigating && (
                <div className='absolute top-20 left-1/2 -translate-x-1/2 bg-emerald-950/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-2xl flex items-center gap-2.5 z-20 animate-in fade-in slide-in-from-top duration-200 border border-emerald-800/60'>
                    <i className='ri-footprint-line text-emerald-400 text-base'></i>
                    <span className='text-xs font-semibold'>
                        Route: <strong>{walkingRoute.distanceText} ({walkingRoute.durationText})</strong> to {walkingRoute.stationName || 'Destination'}
                    </span>
                </div>
            )}

            {/* Live Navigation Guidance Overlays */}
            {isNavigating && walkingRoute && (
                <>
                    <NavigationTopBanner
                        currentStep={currentStep}
                        walkingRoute={walkingRoute}
                        remainingDistText={remainingDistText}
                        remainingTimeText={remainingTimeText}
                        navProgress={navProgress}
                        hasArrived={hasArrived}
                        onExitNavigation={onExitNavigation}
                    />
                    <NavigationBottomHUD
                        remainingTimeText={remainingTimeText}
                        remainingDistText={remainingDistText}
                        hasArrived={hasArrived}
                        destinationName={walkingRoute.stationName || 'Destination'}
                        onExitNavigation={onExitNavigation}
                    />
                </>
            )}
        </div>
    )
}

// -------------------------------------------------------------
// Top Navigation Header Component
// -------------------------------------------------------------
const NavigationTopBanner = ({
    currentStep,
    walkingRoute,
    remainingDistText,
    remainingTimeText,
    navProgress,
    hasArrived,
    onExitNavigation
}) => {
    return (
        <div className='absolute top-4 inset-x-4 max-w-lg mx-auto z-40 animate-in fade-in slide-in-from-top duration-300'>
            <div className={`backdrop-blur-md text-white rounded-2xl shadow-2xl border p-4 transition-all duration-300 ${
                hasArrived ? 'bg-emerald-950/95 border-emerald-800' : 'bg-neutral-900/95 border-neutral-800'
            }`}>
                <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-start gap-3.5 min-w-0'>
                        <div className={`h-12 w-12 rounded-xl text-white flex items-center justify-center text-2xl shrink-0 shadow-md transition-colors ${
                            hasArrived ? 'bg-emerald-500' : 'bg-emerald-600'
                        }`}>
                            <i className={hasArrived ? 'ri-checkbox-circle-fill' : (currentStep.icon || 'ri-navigation-line')}></i>
                        </div>
                        <div className='min-w-0'>
                            <div className='flex items-center gap-2'>
                                <span className='text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1'>
                                    {!hasArrived && <span className='w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block'></span>}
                                    <span>{hasArrived ? 'Trip Completed' : 'Live Guidance'}</span>
                                </span>
                                {!hasArrived && (
                                    <span className='text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full font-mono'>
                                        {currentStep.distance}
                                    </span>
                                )}
                            </div>
                            <h4 className='text-base font-bold text-white leading-tight truncate mt-0.5'>
                                {hasArrived ? 'You Have Arrived!' : currentStep.instruction}
                            </h4>
                            <p className='text-xs text-neutral-400 truncate mt-0.5'>
                                {hasArrived ? 'Destination reached on foot' : `Towards ${walkingRoute.stationName || 'Destination'}`}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onExitNavigation}
                        className='h-9 w-9 rounded-full bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-300 hover:text-white flex items-center justify-center text-lg transition-all shrink-0 shadow-xs'
                        title='Exit Navigation'
                    >
                        <i className='ri-close-line'></i>
                    </button>
                </div>

                {/* Animated Trip Progress Bar */}
                <div className='mt-3.5 pt-3 border-t border-neutral-800/80'>
                    <div className='flex items-center justify-between text-xs mb-1.5'>
                        <span className='text-emerald-400 font-bold'>
                            {hasArrived ? '0 m remaining' : `${remainingDistText} remaining`}
                        </span>
                        <span className='text-neutral-300 font-semibold'>
                            {hasArrived ? '100% completed' : `~${remainingTimeText} · ${Math.round(navProgress * 100)}% complete`}
                        </span>
                    </div>
                    <div className='w-full bg-neutral-800 rounded-full h-2 overflow-hidden'>
                        <div
                            className={`h-full rounded-full transition-all duration-100 ease-out ${
                                hasArrived ? 'bg-emerald-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            }`}
                            style={{ width: `${Math.max(4, navProgress * 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

// -------------------------------------------------------------
// Bottom HUD Bar Component
// -------------------------------------------------------------
const NavigationBottomHUD = ({
    remainingTimeText,
    remainingDistText,
    hasArrived,
    destinationName,
    onExitNavigation
}) => {
    return (
        <div className='absolute bottom-5 inset-x-4 max-w-md mx-auto z-40 animate-in fade-in slide-in-from-bottom duration-300'>
            <div className='bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-200/90 p-3.5 flex items-center justify-between gap-3'>
                <div className='flex items-center gap-3 min-w-0'>
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${
                        hasArrived ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                        <i className={hasArrived ? 'ri-flag-2-fill' : 'ri-footprint-fill'}></i>
                    </div>
                    <div className='min-w-0'>
                        <div className='flex items-center gap-1.5'>
                            <span className='text-lg font-bold text-neutral-900'>
                                {hasArrived ? 'Arrived' : remainingTimeText}
                            </span>
                            {!hasArrived && (
                                <span className='text-xs text-neutral-500 font-semibold'>({remainingDistText})</span>
                            )}
                        </div>
                        <p className='text-[11px] text-emerald-700 font-semibold flex items-center gap-1 truncate'>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${hasArrived ? 'bg-emerald-600' : 'bg-emerald-500 animate-pulse'} shrink-0`}></span>
                            <span>{hasArrived ? `At ${destinationName}` : 'Live Pedestrian GPS · Accurate'}</span>
                        </p>
                    </div>
                </div>

                <div className='flex items-center gap-2 shrink-0'>
                    <button
                        onClick={onExitNavigation}
                        className={`font-semibold text-xs px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95 ${
                            hasArrived
                                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                : 'bg-black hover:bg-neutral-900 text-white'
                        }`}
                    >
                        <i className={`text-sm ${hasArrived ? 'ri-check-line' : 'ri-close-line'}`}></i>
                        <span>{hasArrived ? 'Done' : 'Exit Navigation'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LiveTracking
