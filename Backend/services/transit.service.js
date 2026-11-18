// Transit Options Engine for Multi-Modal Transport Aggregator ("Super App")

const placeTitle = (address = '') => (address ? address.split(',')[ 0 ].trim() : 'Pickup');

// Generates dynamic multi-modal options: Cabs/Bikes, Public Transit (Metro & Buses), and Trains
function calculateMultiModalOptions({
    pickup,
    destination,
    distanceTime,
    pickupCoordinates = null,
    destinationCoordinates = null,
    travelDate = null
}) {
    // -------------------------------------------------------------
    // Travel Date Parsing & Contextualization
    // -------------------------------------------------------------
    const now = new Date();
    let selectedDate = new Date();
    if (travelDate && typeof travelDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
        const [ y, m, d ] = travelDate.split('-').map(Number);
        selectedDate = new Date(y, m - 1, d);
    }
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const isToday = selectedStart.getTime() === todayStart.getTime();
    const daysAdvance = Math.max(0, Math.round((selectedStart - todayStart) / (1000 * 60 * 60 * 24)));

    const dateFormatted = selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    const dateShort = selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
    const isoDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

    const meters = distanceTime.distance.value || 3000;
    const km = Math.max(1, +(meters / 1000).toFixed(1));
    const carSeconds = distanceTime.duration.value || 600;
    const carMinutes = Math.max(4, Math.round(carSeconds / 60));

    const pTitle = placeTitle(pickup);
    const dTitle = placeTitle(destination);

    const pCoords = {
        lat: pickupCoordinates?.lat || pickupCoordinates?.ltd || 28.6392,
        lng: pickupCoordinates?.lng || 77.2408
    };

    const dCoords = {
        lat: destinationCoordinates?.lat || destinationCoordinates?.ltd || 28.6318,
        lng: destinationCoordinates?.lng || 77.2194
    };

    // -------------------------------------------------------------
    // 1. Cabs & Bikes (Doorstep, On-demand, dynamic pricing)
    // -------------------------------------------------------------
    const cabs = [
        {
            id: 'moto',
            mode: 'cab',
            vehicleType: 'moto',
            label: 'Nex Moto',
            category: 'Bike',
            tagline: 'Beat city traffic · 1 Helmet provided',
            seats: 1,
            fare: Math.round(20 + km * 8 + Math.round(carMinutes * 0.7) * 1.5),
            durationMinutes: Math.max(3, Math.round(carMinutes * 0.7)),
            durationText: `${Math.max(3, Math.round(carMinutes * 0.7))} mins`,
            etaMinutes: 2,
            icon: 'ri-motorbike-fill',
            badge: '⚡ Quickest',
            badgeColor: 'bg-amber-100 text-amber-900'
        },
        {
            id: 'auto',
            mode: 'cab',
            vehicleType: 'auto',
            label: 'Nex Auto',
            category: 'Auto',
            tagline: 'Economical city commute · Up to 3 riders',
            seats: 3,
            fare: Math.round(30 + km * 10 + carMinutes * 2),
            durationMinutes: Math.round(carMinutes * 1.05),
            durationText: `${Math.round(carMinutes * 1.05)} mins`,
            etaMinutes: 3,
            icon: 'ri-taxi-fill'
        },
        {
            id: 'car',
            mode: 'cab',
            vehicleType: 'car',
            label: 'Nex Go',
            category: 'Cab',
            tagline: 'Comfortable AC sedan · Up to 4 riders',
            seats: 4,
            fare: Math.round(50 + km * 15 + carMinutes * 3),
            durationMinutes: carMinutes,
            durationText: `${carMinutes} mins`,
            etaMinutes: 4,
            icon: 'ri-car-fill',
            badge: '✨ Most Popular',
            badgeColor: 'bg-blue-100 text-blue-900'
        }
    ];

    // Check if the query is the major intercity corridor between Dehradun & Mathura
    const isDdnMathura = (
        (pickup.toLowerCase().includes('dehradun') && destination.toLowerCase().includes('mathura')) ||
        (pickup.toLowerCase().includes('mathura') && destination.toLowerCase().includes('dehradun'))
    );

    // Realistic distance & car time for Dehradun - Mathura corridor (~380 km, ~6.5 - 7h drive)
    const effectiveKm = isDdnMathura ? Math.max(380, km) : km;
    const effectiveCarMinutes = isDdnMathura ? Math.max(400, Math.round(effectiveKm * 1.05)) : carMinutes;

    // -------------------------------------------------------------
    // 2. Public Transit (Metro & Buses / Direct Intercity Coaches)
    // -------------------------------------------------------------
    let transit = [];

    if (isDdnMathura) {
        // Direct Intercity Bus Service (UPSRTC / Volvo Sleeper departing from ISBT Dehradun)
        const bus1Dept = isToday ? 'In 35 mins (21:30 PM)' : `${dateShort} · 21:30 PM`;
        const bus2Dept = isToday ? 'At 22:15 PM' : `${dateShort} · 22:15 PM`;

        transit = [
            {
                id: 'bus-upsrtc-volvo',
                mode: 'transit',
                category: 'Direct Intercity Bus',
                label: 'UPSRTC Volvo AC Sleeper (2+1)',
                routeNumber: 'UPSRTC Line 904',
                routeSummary: 'ISBT Dehradun ➔ Mathura New Bus Stand',
                walkingDistance: '280 m to ISBT Platform 6',
                frequencyText: isToday ? '4 Daily Direct Services' : 'Daily Scheduled Direct Service',
                nextDeparture: bus1Dept,
                departureTime: '21:30 PM',
                departureDate: dateShort,
                departureSummary: `${isToday ? 'Tonight' : dateShort} at 21:30 PM`,
                arrivalTime: '05:00 AM',
                durationMinutes: 450,
                durationText: '7h 30m',
                fare: 680,
                travelDate: isoDateStr,
                travelDateFormatted: dateFormatted,
                badge: '🚍 Direct Highway Route',
                badgeColor: 'bg-blue-100 text-blue-900',
                icon: 'ri-bus-2-fill',
                walking: {
                    distanceMeters: 280,
                    distanceText: '280 m',
                    durationMinutes: 4,
                    durationText: '4 mins',
                    stationName: 'ISBT Dehradun',
                    gate: 'Platform No. 6 (Interstate Concourse)',
                    pickupCoordinates: pCoords,
                    stationCoordinates: { lat: 30.2882, lng: 78.0074 },
                    turnByTurn: [
                        {
                            step: 1,
                            instruction: 'Head towards ISBT Dehradun Main Inter-State Departure Concourse',
                            distance: '180 m',
                            icon: 'ri-walk-line'
                        },
                        {
                            step: 2,
                            instruction: 'Board UPSRTC Volvo Sleeper at Platform No. 6 towards Mathura / Agra',
                            distance: '100 m',
                            icon: 'ri-bus-line'
                        }
                    ]
                },
                instructions: [
                    'Report at ISBT Dehradun Platform 6 at least 15 mins before scheduled departure',
                    'Direct express journey via Eastern Peripheral & Yamuna Expressway (Zero Transfers)',
                    'Water bottle, charging ports, and blanket provided onboard',
                    'Direct drop at Mathura New Bus Stand (Near Junction)'
                ]
            },
            {
                id: 'bus-royal-sleeper',
                mode: 'transit',
                category: 'Luxury Sleeper Bus',
                label: 'Royal Intercity AC Sleeper (2+1)',
                routeNumber: 'Direct Express 55',
                routeSummary: 'Transport Nagar Dehradun ➔ Mathura Raya Cut',
                walkingDistance: '320 m to boarding lounge',
                frequencyText: isToday ? 'Daily Evening Direct Service' : 'Daily Scheduled Evening Service',
                nextDeparture: bus2Dept,
                departureTime: '22:15 PM',
                departureDate: dateShort,
                departureSummary: `${isToday ? 'Tonight' : dateShort} at 22:15 PM`,
                arrivalTime: '05:30 AM',
                durationMinutes: 435,
                durationText: '7h 15m',
                fare: 820,
                travelDate: isoDateStr,
                travelDateFormatted: dateFormatted,
                badge: '⚡ Fastest Highway Bus',
                badgeColor: 'bg-indigo-100 text-indigo-900',
                icon: 'ri-bus-fill',
                walking: {
                    distanceMeters: 320,
                    distanceText: '320 m',
                    durationMinutes: 5,
                    durationText: '5 mins',
                    stationName: 'Transport Nagar Dehradun',
                    gate: 'Private Bus Boarding Lounge',
                    pickupCoordinates: pCoords,
                    stationCoordinates: { lat: 30.2920, lng: 78.0120 },
                    turnByTurn: [
                        {
                            step: 1,
                            instruction: 'Walk towards Private Bus Boarding Lounge on Saharanpur Road',
                            distance: '200 m',
                            icon: 'ri-walk-line'
                        },
                        {
                            step: 2,
                            instruction: 'Check-in at Royal Intercity Passenger Lounge Bay 2',
                            distance: '120 m',
                            icon: 'ri-bus-line'
                        }
                    ]
                },
                instructions: [
                    'Board luxury AC sleeper at Transport Nagar private bus bay',
                    'Non-stop direct highway express run via Yamuna Expressway',
                    'Alight at Mathura Raya Cut / Junction bypass'
                ]
            }
        ];
    } else if (effectiveKm > 45) {
        // General Intercity Direct Bus Route
        const busHours = Math.max(2, Math.round(effectiveKm / 55));
        const intercityBusMinutes = busHours * 60;
        const busFare = Math.max(90, Math.round(effectiveKm * 1.6 + 40));

        transit = [
            {
                id: 'bus-interstate-direct',
                mode: 'transit',
                category: 'Interstate Highway Bus',
                label: 'State Express Direct Bus (AC)',
                routeNumber: 'Interstate Line ' + Math.round(effectiveKm * 3 % 800 + 100),
                routeSummary: `${pTitle} ISBT ➔ ${dTitle} Bus Terminal`,
                walkingDistance: '350 m to ISBT Terminal',
                frequencyText: isToday ? 'Every 30-45 mins' : 'Regular Scheduled Services',
                nextDeparture: isToday ? 'In 20 mins' : `${dateShort} Regular Departures`,
                departureDate: dateShort,
                travelDate: isoDateStr,
                travelDateFormatted: dateFormatted,
                fare: busFare,
                durationMinutes: intercityBusMinutes,
                durationText: `${Math.floor(intercityBusMinutes / 60)}h ${intercityBusMinutes % 60}m`,
                badge: '🚍 Direct Route',
                badgeColor: 'bg-blue-100 text-blue-900',
                icon: 'ri-bus-2-fill',
                instructions: [
                    `Proceed to ${pTitle} Inter-State Bus Terminal`,
                    `Board Direct Interstate AC Express towards ${dTitle}`,
                    `Comfortable direct highway journey without transfers`,
                    `Alight at destination bus terminal`
                ]
            }
        ];
    } else {
        // Local Urban Transit (Metro & City Bus)
        const metroWalkMeters = Math.min(450, Math.round(km * 35 + 180));
        const metroStations = Math.max(2, Math.round(km / 1.4));
        const metroDuration = Math.max(8, Math.round(km * 2.1 + 7));
        const metroFare = Math.min(60, Math.max(20, Math.round(15 + km * 2.4)));

        const busWalkMeters = 210;
        const busDuration = Math.max(14, Math.round(carMinutes * 1.35 + 5));
        const busFare = Math.min(30, Math.max(10, Math.round(10 + km * 1.4)));

        const metroStationCoords = {
            lat: +(pCoords.lat + 0.0022).toFixed(6),
            lng: +(pCoords.lng + 0.0020).toFixed(6)
        };

        const busStopCoords = {
            lat: +(pCoords.lat + 0.0014).toFixed(6),
            lng: +(pCoords.lng + 0.0012).toFixed(6)
        };

        transit = [
            {
                id: 'metro',
                mode: 'transit',
                category: 'Metro Rail',
                label: 'Rapid Metro Express',
                lineName: km < 12 ? 'Yellow Line (Line 2)' : 'Blue / Airport Express',
                lineColor: km < 12 ? '#eab308' : '#2563eb',
                routeSummary: `${pTitle} Stn ➔ ${dTitle} Stn`,
                walkingDistance: `${metroWalkMeters} m (${Math.max(3, Math.round(metroWalkMeters / 65))} min walk)`,
                frequencyText: 'Every 4 mins',
                nextDeparture: 'In 3 mins',
                stationsCount: metroStations,
                fare: metroFare,
                durationMinutes: metroDuration,
                durationText: `${metroDuration} mins`,
                badge: '🌱 Eco Choice (-80% CO₂)',
                badgeColor: 'bg-emerald-100 text-emerald-800',
                icon: 'ri-train-line',
                walking: {
                    distanceMeters: metroWalkMeters,
                    distanceText: `${metroWalkMeters} m`,
                    durationMinutes: Math.max(3, Math.round(metroWalkMeters / 65)),
                    durationText: `${Math.max(3, Math.round(metroWalkMeters / 65))} min walk`,
                    stationName: `${pTitle} Metro Station`,
                    gate: 'Gate No. 2 (North Concourse)',
                    pickupCoordinates: pCoords,
                    stationCoordinates: metroStationCoords,
                    turnByTurn: [
                        {
                            step: 1,
                            instruction: `Head East along Station Road from ${pTitle}`,
                            distance: `${Math.round(metroWalkMeters * 0.4)} m`,
                            icon: 'ri-walk-line'
                        },
                        {
                            step: 2,
                            instruction: 'Turn right at the pedestrian crossing towards Station Concourse',
                            distance: `${Math.round(metroWalkMeters * 0.35)} m`,
                            icon: 'ri-corner-up-right-line'
                        },
                        {
                            step: 3,
                            instruction: `Enter ${pTitle} Metro Station via Gate No. 2 (Escalators & Lift available)`,
                            distance: `${Math.round(metroWalkMeters * 0.25)} m`,
                            icon: 'ri-login-box-line'
                        }
                    ]
                },
                instructions: [
                    `Walk ${metroWalkMeters} m to ${pTitle} Metro Station (Gate 2)`,
                    `Board train towards ${dTitle} (Platform 2)`,
                    `Ride ${metroStations} stations without traffic delays`,
                    `Exit via Gate 3 at ${dTitle} Station`
                ]
            },
            {
                id: 'bus',
                mode: 'transit',
                category: 'City Bus',
                label: 'City Express Bus (AC)',
                routeNumber: km < 10 ? 'Route 419' : 'Express Line 502',
                routeSummary: `${pTitle} Terminal ➔ ${dTitle} Bus Stop`,
                walkingDistance: `${busWalkMeters} m (3 min walk)`,
                frequencyText: 'Every 8-10 mins',
                nextDeparture: 'In 5 mins',
                fare: busFare,
                durationMinutes: busDuration,
                durationText: `${busDuration} mins`,
                badge: '💚 Budget Pick',
                badgeColor: 'bg-green-100 text-green-800',
                icon: 'ri-bus-2-fill',
                walking: {
                    distanceMeters: busWalkMeters,
                    distanceText: `${busWalkMeters} m`,
                    durationMinutes: Math.max(2, Math.round(busWalkMeters / 70)),
                    durationText: `${Math.max(2, Math.round(busWalkMeters / 70))} min walk`,
                    stopName: `${pTitle} Bus Shelter A (Bay 3)`,
                    pickupCoordinates: pCoords,
                    stationCoordinates: busStopCoords,
                    turnByTurn: [
                        {
                            step: 1,
                            instruction: `Exit pickup location and proceed north on the pedestrian walkway`,
                            distance: '90 m',
                            icon: 'ri-walk-line'
                        },
                        {
                            step: 2,
                            instruction: `Arrive at Bus Shelter A (Bay 3) on the main transit corridor`,
                            distance: '120 m',
                            icon: 'ri-bus-line'
                        }
                    ]
                },
                instructions: [
                    `Walk ${busWalkMeters} m to ${pTitle} Bus Stop`,
                    `Board Low-Floor AC bus towards ${dTitle}`,
                    `Tap transit card or pay ₹${busFare} cash onboard`,
                    `Alight at destination stop`
                ]
            }
        ];
    }

    // -------------------------------------------------------------
    // 3. Trains (Regional / Superfast with Confirmation Predictor)
    // -------------------------------------------------------------
    let trains = [];

    if (isDdnMathura) {
        // Direct Train Service between Dehradun & Mathura
        // Contextualize seat availability and confirmation probabilities based on selected travel date
        const seatShift = Math.min(24, daysAdvance * 5);
        const probShift = Math.min(5, Math.floor(daysAdvance * 1.2));

        const ddnKota3ASeats = isToday ? 14 : 26 + seatShift;
        const ddnKota2ASeats = isToday ? 5 : 12 + Math.floor(seatShift / 2);
        const ddnKota1AStatus = daysAdvance >= 2 ? `AVAILABLE (${4 + Math.floor(seatShift / 3)})` : 'RAC 2';
        const ddnKotaProb = Math.min(99, (isToday ? 93 : 96) + probShift);

        const nandaSLSeats = daysAdvance >= 3 ? `AVAILABLE (${12 + seatShift})` : (isToday ? 'RAC 7' : 'RAC 4');
        const nanda3ASeats = isToday ? 10 : 18 + seatShift;
        const nandaProb = Math.min(97, (isToday ? 84 : 88) + probShift);

        const nextDateObj = new Date(selectedDate);
        nextDateObj.setDate(nextDateObj.getDate() + 1);
        const arrivalDateShort = nextDateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

        trains = [
            {
                id: 'train-ddn-kota-12402',
                mode: 'train',
                trainNumber: '12402',
                trainName: 'Dehradun - Kota AC SF Express',
                type: 'Superfast AC Express',
                departure: '22:45 PM',
                arrival: '06:45 AM',
                departureDate: dateShort,
                departureSummary: `${isToday ? 'Tonight' : dateShort} at 22:45 PM`,
                arrivalDate: arrivalDateShort,
                arrivalSummary: `${arrivalDateShort} at 06:45 AM`,
                travelDate: isoDateStr,
                travelDateFormatted: dateFormatted,
                stationSummary: 'Dehradun (DDN) ➔ Mathura Jn (MTJ)',
                durationMinutes: 480,
                durationText: '8h 0m',
                fare: 795,
                classes: [
                    { code: '3A', name: 'AC 3-Tier', fare: 795, status: 'AVAILABLE', seats: ddnKota3ASeats, chance: `${ddnKotaProb}% Confirmed`, color: 'emerald' },
                    { code: '2A', name: 'AC 2-Tier', fare: 1120, status: 'AVAILABLE', seats: ddnKota2ASeats, chance: `${Math.min(99, ddnKotaProb + 2)}% Confirmed`, color: 'emerald' },
                    { code: '1A', name: 'AC First Class', fare: 1850, status: ddnKota1AStatus, chance: daysAdvance >= 2 ? '95% High chance' : '88% High chance', color: daysAdvance >= 2 ? 'emerald' : 'amber' },
                    { code: '3E', name: 'AC 3 Economy', fare: 735, status: 'AVAILABLE', seats: ddnKota3ASeats + 8, chance: '99% Confirmed', color: 'emerald' }
                ],
                predictor: {
                    status: 'AVAILABLE',
                    probability: ddnKotaProb,
                    label: `High chance of confirmation (${ddnKotaProb}% clearance)`,
                    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
                },
                icon: 'ri-train-fill',
                pantry: 'Catering on Board'
            },
            {
                id: 'train-nanda-devi-12206',
                mode: 'train',
                trainNumber: '12206',
                trainName: 'Nanda Devi AC Superfast Express',
                type: 'Intercity Superfast',
                departure: '23:30 PM',
                arrival: '07:45 AM',
                departureDate: dateShort,
                departureSummary: `${isToday ? 'Tonight' : dateShort} at 23:30 PM`,
                arrivalDate: arrivalDateShort,
                arrivalSummary: `${arrivalDateShort} at 07:45 AM`,
                travelDate: isoDateStr,
                travelDateFormatted: dateFormatted,
                stationSummary: 'Dehradun (DDN) ➔ Mathura Jn (MTJ)',
                durationMinutes: 495,
                durationText: '8h 15m',
                fare: 285,
                classes: [
                    { code: 'SL', name: 'Sleeper Class', fare: 285, status: nandaSLSeats, chance: `${nandaProb}% High chance`, color: daysAdvance >= 3 ? 'emerald' : 'amber' },
                    { code: '3A', name: 'AC 3-Tier', fare: 760, status: 'AVAILABLE', seats: nanda3ASeats, chance: `${Math.min(98, nandaProb + 6)}% Confirmed`, color: 'emerald' },
                    { code: '2A', name: 'AC 2-Tier', fare: 1080, status: 'AVAILABLE', seats: Math.max(4, Math.floor(nanda3ASeats / 2)), chance: `${Math.min(99, nandaProb + 8)}% Confirmed`, color: 'emerald' }
                ],
                predictor: {
                    status: `${nandaSLSeats} (${nandaProb}%)`,
                    probability: nandaProb,
                    label: `${nandaProb}% historical RAC clearance for ${dateShort}`,
                    badgeClass: nandaProb >= 90 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                },
                icon: 'ri-subway-line',
                pantry: 'E-Catering Available'
            }
        ];
    } else {
        const trainMinutesBase = Math.max(30, Math.round(effectiveKm * 0.95 + 20));
        trains = [
            {
                id: 'train-vande-bharat',
                mode: 'train',
                trainNumber: '22436',
                trainName: 'Vande Bharat Express',
                type: 'Semi-High Speed Superfast',
                departure: '07:20 AM',
                arrival: '08:15 AM',
                departureDate: dateShort,
                departureSummary: `${dateShort} at 07:20 AM`,
                travelDate: isoDateStr,
                travelDateFormatted: dateFormatted,
                stationSummary: `${pTitle} Terminal ➔ ${dTitle} Jn`,
                durationMinutes: trainMinutesBase,
                durationText: `${Math.floor(trainMinutesBase / 60)}h ${trainMinutesBase % 60}m`,
                fare: Math.max(290, Math.round(effectiveKm * 4.2 + 190)),
                classes: [
                    { code: 'CC', name: 'AC Chair Car', fare: Math.max(290, Math.round(effectiveKm * 4.2 + 190)), status: 'AVAILABLE', seats: 28 + Math.min(30, daysAdvance * 4), chance: '98% Confirmed', color: 'emerald' },
                    { code: 'EC', name: 'Exec Chair Car', fare: Math.max(580, Math.round(effectiveKm * 8.5 + 360)), status: daysAdvance >= 2 ? 'AVAILABLE (8)' : 'RAC 3', chance: '92% High chance', color: daysAdvance >= 2 ? 'emerald' : 'amber' }
                ],
                predictor: {
                    status: 'AVAILABLE',
                    probability: 98,
                    label: `High chance of confirmation for ${dateShort}`,
                    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
                },
                icon: 'ri-train-fill',
                pantry: 'Catering Included'
            },
            {
                id: 'train-jan-shatabdi',
                mode: 'train',
                trainNumber: '12055',
                trainName: 'Jan Shatabdi Express',
                type: 'Intercity Superfast',
                departure: '12:45 PM',
                arrival: '01:50 PM',
                departureDate: dateShort,
                departureSummary: `${dateShort} at 12:45 PM`,
                travelDate: isoDateStr,
                travelDateFormatted: dateFormatted,
                stationSummary: `${pTitle} Station ➔ ${dTitle} Central`,
                durationMinutes: trainMinutesBase + 15,
                durationText: `${Math.floor((trainMinutesBase + 15) / 60)}h ${(trainMinutesBase + 15) % 60}m`,
                fare: Math.max(55, Math.round(effectiveKm * 1.3 + 35)),
                classes: [
                    { code: '2S', name: 'Second Sitting', fare: Math.max(55, Math.round(effectiveKm * 1.3 + 35)), status: daysAdvance >= 3 ? 'AVAILABLE (32)' : 'RAC 7', chance: `${84 + Math.min(12, daysAdvance * 3)}% High chance`, color: daysAdvance >= 3 ? 'emerald' : 'amber' },
                    { code: 'CC', name: 'AC Chair Car', fare: Math.max(240, Math.round(effectiveKm * 3.5 + 160)), status: 'AVAILABLE', seats: 14 + Math.min(20, daysAdvance * 3), chance: '96% Confirmed', color: 'emerald' }
                ],
                predictor: {
                    status: daysAdvance >= 3 ? 'AVAILABLE (96%)' : 'RAC 7 (High chance)',
                    probability: 84 + Math.min(12, daysAdvance * 3),
                    label: `${84 + Math.min(12, daysAdvance * 3)}% historical clearance for ${dateShort}`,
                    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
                },
                icon: 'ri-subway-line',
                pantry: 'Food Onboard'
            },
            {
                id: 'train-mail-express',
                mode: 'train',
                trainNumber: '14041',
                trainName: 'Mussoorie Mail Express',
                type: 'Mail / Express',
                departure: '21:15 PM',
                arrival: '22:30 PM',
                departureDate: dateShort,
                departureSummary: `${dateShort} at 21:15 PM`,
                travelDate: isoDateStr,
                travelDateFormatted: dateFormatted,
                stationSummary: `${pTitle} Jn ➔ ${dTitle} Jn`,
                durationMinutes: trainMinutesBase + 25,
                durationText: `${Math.floor((trainMinutesBase + 25) / 60)}h ${(trainMinutesBase + 25) % 60}m`,
                fare: Math.max(45, Math.round(effectiveKm * 1.1 + 30)),
                classes: [
                    { code: 'SL', name: 'Sleeper Class', fare: Math.max(140, Math.round(effectiveKm * 2.1 + 80)), status: daysAdvance >= 4 ? 'AVAILABLE (21)' : 'WL 19', chance: `${52 + Math.min(35, daysAdvance * 8)}% predicted chance`, color: daysAdvance >= 4 ? 'emerald' : 'yellow' },
                    { code: '3A', name: '3-Tier AC', fare: Math.max(380, Math.round(effectiveKm * 4.6 + 240)), status: daysAdvance >= 5 ? 'AVAILABLE (9)' : 'WL 38', chance: `${35 + Math.min(45, daysAdvance * 8)}% predicted chance`, color: daysAdvance >= 5 ? 'emerald' : 'rose' }
                ],
                predictor: {
                    status: daysAdvance >= 4 ? 'AVAILABLE' : 'WL (Medium chance)',
                    probability: 52 + Math.min(35, daysAdvance * 8),
                    label: `${52 + Math.min(35, daysAdvance * 8)}% predicted clearance chance for ${dateShort}`,
                    badgeClass: daysAdvance >= 4 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                },
                icon: 'ri-train-line',
                pantry: 'E-Catering Available'
            }
        ];
    }

    // -------------------------------------------------------------
    // 4. Multi-Leg Connecting Routes (Strictly for Genuine Non-Direct / Outskirts / Rural Routes)
    // -------------------------------------------------------------
    const RURAL_OUTSKIRTS_REGEX = /(village|gaon|gram|rural|outskirts|dehat|tehsil|basti|kalan|khurd|farm|dhani|majra|rurban|kasba|interior|remote)/i;
    const MAJOR_CITIES_REGEX = /(dehradun|mathura|delhi|new delhi|noida|gurugram|gurgaon|faridabad|ghaziabad|agra|jaipur|lucknow|kanpur|chandigarh|haridwar|rishikesh|meerut|varanasi|amritsar|ludhiana|mumbai|pune|bengaluru|bangalore|hyderabad|chennai|kolkata)/i;

    const isExplicitRural = RURAL_OUTSKIRTS_REGEX.test(destination) || RURAL_OUTSKIRTS_REGEX.test(pickup);
    const isMajorCity = MAJOR_CITIES_REGEX.test(destination);

    // Direct transit options exist if direct trains or direct transit/buses are available
    const hasDirectOptions = (trains && trains.length > 0) || (transit && transit.length > 0);

    // Non-direct route condition:
    // Only triggers if there are genuinely zero direct train/bus options, OR if the destination is explicitly a rural/village outskirts area (and not a major urban city destination)
    const isNonDirectRoute = (!hasDirectOptions) || (isExplicitRural && !isMajorCity);

    let multiLegRoutes = [];

    if (isNonDirectRoute) {
        const transitHubStation = `${pTitle} Junction`;
        const suburbCrossing = `${dTitle} Bypass Chowk`;

        // Itinerary 1: Train ➔ Bus ➔ Auto (3 Legs)
        const tLeg1Minutes = Math.max(25, Math.round(km * 0.9));
        const tLeg2Minutes = Math.max(15, Math.round(km * 0.45));
        const tLeg3Minutes = 15;
        const totalDuration1 = tLeg1Minutes + tLeg2Minutes + tLeg3Minutes + 10; // 10 min transfer buffer
        const trainLegFare = Math.max(45, Math.round(km * 1.2 + 20));
        const busLegFare = 30;
        const autoEstFare1 = Math.max(50, Math.round(km * 0.12 * 14 + 40));
        const totalFare1 = trainLegFare + busLegFare + autoEstFare1;

        const multiLeg1 = {
            id: 'multileg-train-bus-auto',
            mode: 'multileg',
            category: 'Connecting Route',
            label: 'Rail + Feeder Bus + Last-Mile Auto',
            flowSummary: 'Train ➔ Bus ➔ Auto',
            tagline: 'Doorstep access to outskirts/village with 2 transfers',
            badge: '🔄 2 Transfers · Doorstep',
            badgeColor: 'bg-purple-100 text-purple-900 border-purple-200',
            totalDurationMinutes: totalDuration1,
            totalDurationText: `${Math.floor(totalDuration1 / 60) > 0 ? `${Math.floor(totalDuration1 / 60)}h ` : ''}${totalDuration1 % 60}m`,
            totalDistanceKm: km,
            totalDistanceText: `${km} km`,
            totalFare: totalFare1,
            totalFareText: `₹${totalFare1}`,
            hasMeteredLeg: true,
            fareNotice: 'Fixed transit fares + estimated local metered auto',
            icon: 'ri-shuffle-line',
            legs: [
                {
                    legIndex: 1,
                    mode: 'train',
                    label: 'Regional Express Train',
                    routeNumber: 'Suburban Line 2',
                    from: `${pTitle} Railway Station`,
                    to: transitHubStation,
                    distanceText: `${Math.max(3, Math.round(km * 0.65))} km`,
                    durationMinutes: tLeg1Minutes,
                    durationText: `${tLeg1Minutes} mins`,
                    fare: trainLegFare,
                    fareText: `₹${trainLegFare}`,
                    isEstimated: false,
                    icon: 'ri-train-fill',
                    instruction: `Board Regional EMU / Suburban Express towards ${transitHubStation}`
                },
                {
                    legIndex: 2,
                    mode: 'bus',
                    label: 'State Highway Connecting Bus',
                    routeNumber: 'Feeder Route 702',
                    from: `${transitHubStation} Bus Bay`,
                    to: suburbCrossing,
                    distanceText: `${Math.max(2, Math.round(km * 0.25))} km`,
                    durationMinutes: tLeg2Minutes,
                    durationText: `${tLeg2Minutes} mins`,
                    fare: busLegFare,
                    fareText: `₹${busLegFare}`,
                    isEstimated: false,
                    icon: 'ri-bus-2-fill',
                    instruction: `Interchange at ${transitHubStation}; board connecting highway bus from Platform 4`
                },
                {
                    legIndex: 3,
                    mode: 'auto',
                    label: 'Local Auto / E-Rickshaw',
                    routeNumber: 'Rural Feeder Stand',
                    from: suburbCrossing,
                    to: dTitle,
                    distanceText: `${Math.max(1, Math.round(km * 0.1))} km`,
                    durationMinutes: tLeg3Minutes,
                    durationText: `${tLeg3Minutes} mins`,
                    fare: autoEstFare1,
                    fareText: 'Meter / Actual Fare',
                    isEstimated: true,
                    icon: 'ri-taxi-fill',
                    instruction: `Hire local metered auto or e-rickshaw for doorstep drop at ${dTitle}`
                }
            ]
        };

        // Itinerary 2: Bus ➔ Auto (2 Legs)
        const bLeg1Minutes = Math.max(30, Math.round(carMinutes * 1.15));
        const bLeg2Minutes = 18;
        const totalDuration2 = bLeg1Minutes + bLeg2Minutes + 8; // 8 min transfer buffer
        const interstateBusFare = Math.max(35, Math.round(km * 1.4));
        const autoEstFare2 = Math.max(50, Math.round(km * 0.15 * 14 + 35));
        const totalFare2 = interstateBusFare + autoEstFare2;

        const multiLeg2 = {
            id: 'multileg-bus-auto',
            mode: 'multileg',
            category: 'Connecting Route',
            label: 'Interstate Highway Bus + Local Auto',
            flowSummary: 'Bus ➔ Auto',
            tagline: 'Single convenient transfer at highway junction',
            badge: '🔄 1 Transfer · Budget Pick',
            badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-200',
            totalDurationMinutes: totalDuration2,
            totalDurationText: `${Math.floor(totalDuration2 / 60) > 0 ? `${Math.floor(totalDuration2 / 60)}h ` : ''}${totalDuration2 % 60}m`,
            totalDistanceKm: km,
            totalDistanceText: `${km} km`,
            totalFare: totalFare2,
            totalFareText: `₹${totalFare2}`,
            hasMeteredLeg: true,
            fareNotice: 'Bus ticket + local auto actual fare',
            icon: 'ri-route-line',
            legs: [
                {
                    legIndex: 1,
                    mode: 'bus',
                    label: 'Interstate Express Bus',
                    routeNumber: 'Highway Express 340',
                    from: `${pTitle} Inter-State Bus Stand`,
                    to: suburbCrossing,
                    distanceText: `${Math.max(3, Math.round(km * 0.85))} km`,
                    durationMinutes: bLeg1Minutes,
                    durationText: `${bLeg1Minutes} mins`,
                    fare: interstateBusFare,
                    fareText: `₹${interstateBusFare}`,
                    isEstimated: false,
                    icon: 'ri-bus-fill',
                    instruction: `Board direct interstate bus towards outer ring crossing`
                },
                {
                    legIndex: 2,
                    mode: 'auto',
                    label: 'Local Gramin Seva / Auto',
                    routeNumber: 'Village Link Stand',
                    from: suburbCrossing,
                    to: dTitle,
                    distanceText: `${Math.max(1, Math.round(km * 0.15))} km`,
                    durationMinutes: bLeg2Minutes,
                    durationText: `${bLeg2Minutes} mins`,
                    fare: autoEstFare2,
                    fareText: 'Meter / Actual Fare',
                    isEstimated: true,
                    icon: 'ri-taxi-fill',
                    instruction: `Hail local gramin seva / auto to final village drop`
                }
            ]
        };

        multiLegRoutes = [ multiLeg1, multiLeg2 ];
    }

    // -------------------------------------------------------------
    // 5. Walking Option (For reasonable distances <= 4.0 km / 4500 m)
    // -------------------------------------------------------------
    let walkingOption = null;
    if (meters <= 4500 || km <= 4.0) {
        // Standard pedestrian walking speed ~5 km/h -> ~12.5 mins per km
        const walkDurationMinutes = Math.max(3, Math.round((meters / 1000) * 12.5));
        const walkDistText = meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;

        walkingOption = {
            id: 'walking',
            mode: 'walking',
            category: 'Walking',
            label: 'Walking Route',
            tagline: 'Zero emission · Healthy & Free',
            routeSummary: `${pTitle} ➔ ${dTitle}`,
            distanceMeters: meters,
            distanceText: walkDistText,
            fare: 0,
            durationMinutes: walkDurationMinutes,
            durationText: `${walkDurationMinutes} mins`,
            badge: '🟢 Free · Zero Emission',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            icon: 'ri-walk-fill',
            walking: {
                distanceMeters: meters,
                distanceText: walkDistText,
                durationMinutes: walkDurationMinutes,
                durationText: `${walkDurationMinutes} mins`,
                stationName: `${dTitle} (Destination)`,
                gate: 'Pedestrian Entrance',
                pickupCoordinates: pCoords,
                stationCoordinates: dCoords,
                turnByTurn: [
                    {
                        step: 1,
                        instruction: `Depart on foot from ${pTitle} along the pedestrian pathway`,
                        distance: `${Math.round(meters * 0.35)} m`,
                        icon: 'ri-walk-line'
                    },
                    {
                        step: 2,
                        instruction: `Continue straight along the transit corridor towards ${dTitle}`,
                        distance: `${Math.round(meters * 0.45)} m`,
                        icon: 'ri-direction-line'
                    },
                    {
                        step: 3,
                        instruction: `Arrive safely at destination entrance: ${dTitle}`,
                        distance: `${Math.round(meters * 0.20)} m`,
                        icon: 'ri-map-pin-2-fill'
                    }
                ]
            },
            instructions: [
                `Exit pickup location and proceed along designated pedestrian footpaths`,
                `Follow direct route to destination with zero carbon footprint`,
                `100% Free · No booking or fare required`
            ]
        };
    }

    const allOptions = [
        ...(walkingOption ? [ { ...walkingOption, displayPrice: 0, displayDuration: walkingOption.durationMinutes } ] : []),
        ...cabs.map(c => ({ ...c, displayPrice: c.fare, displayDuration: c.durationMinutes })),
        ...transit.map(t => ({ ...t, displayPrice: t.fare, displayDuration: t.durationMinutes })),
        ...trains.map(tr => ({ ...tr, displayPrice: tr.fare, displayDuration: tr.durationMinutes })),
        ...multiLegRoutes.map(ml => ({ ...ml, displayPrice: ml.totalFare, displayDuration: ml.totalDurationMinutes }))
    ];

    const fastestOption = [ ...allOptions ].sort((a, b) => a.displayDuration - b.displayDuration)[ 0 ];
    const cheapestOption = [ ...allOptions ].sort((a, b) => a.displayPrice - b.displayPrice)[ 0 ];

    return {
        route: {
            pickup,
            destination,
            pickupCoordinates: pCoords,
            destinationCoordinates: dCoords,
            distanceMeters: meters,
            distanceText: distanceTime.distance.text || `${km} km`,
            durationSeconds: carSeconds,
            durationText: distanceTime.duration.text || `${carMinutes} mins`,
            km
        },
        cabs,
        transit,
        trains,
        walking: walkingOption,
        multiLegRoutes,
        date: {
            travelDate: isoDateStr,
            formatted: dateFormatted,
            shortFormatted: dateShort,
            dayOfWeek: selectedDate.toLocaleDateString('en-US', { weekday: 'long' }),
            isToday,
            daysInAdvance: daysAdvance
        },
        hasDirectTransit: !isNonDirectRoute,
        noDirectTransit: isNonDirectRoute,
        recommendations: {
            fastest: fastestOption,
            cheapest: cheapestOption,
            eco: walkingOption || transit[ 0 ]
        },
        fare: {
            car: cabs.find(c => c.id === 'car')?.fare,
            moto: cabs.find(c => c.id === 'moto')?.fare,
            auto: cabs.find(c => c.id === 'auto')?.fare
        }
    };
}

module.exports = {
    calculateMultiModalOptions
};
