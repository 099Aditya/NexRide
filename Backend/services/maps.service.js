const axios = require('axios');
const captainModel = require('../models/captain.model');
const { HttpError } = require('../utils/httpError');

// Google Maps Platform endpoints. Distance Matrix (Legacy) and Places (Legacy)
// can't be enabled on new Google Cloud projects, so this uses their
// replacements: Routes API and Places API (New). Geocoding API is unchanged.
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const ROUTE_MATRIX_URL = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';

// Consume either GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API
const apiKey = () => process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API;

// Log Google's real error message (e.g. "API not enabled") to the server console.
const logGoogleError = (label, err) => {
    console.error(`${label} failed:`, err.response?.data?.error?.message || err.response?.data?.error_message || err.message);
};

module.exports.getAddressCoordinate = async (address) => {
    try {
        const key = apiKey();
        if (!key) throw new Error('Google Maps API key not set');

        const response = await axios.get(GEOCODE_URL, { params: { address, key } });

        if (response.data.status !== 'OK') {
            console.error('Geocoding failed:', response.data.status, response.data.error_message || '');
            throw new HttpError(400, 'Unable to find that address');
        }

        const location = response.data.results[ 0 ].geometry.location;
        return {
            ltd: location.lat,
            lng: location.lng
        };
    } catch (err) {
        if (err.status) throw err;
        logGoogleError('Geocoding', err);
        throw new HttpError(502, 'Unable to fetch coordinates');
    }
}

// Returns { distance: { value: meters }, duration: { value: seconds } }
module.exports.getDistanceTime = async (origin, destination) => {
    if (!origin || !destination) {
        throw new HttpError(400, 'Origin and destination are required');
    }

    let element;
    try {
        const response = await axios.post(ROUTE_MATRIX_URL, {
            origins: [ { waypoint: { address: origin } } ],
            destinations: [ { waypoint: { address: destination } } ],
            travelMode: 'DRIVE',
        }, {
            headers: {
                'X-Goog-Api-Key': apiKey(),
                'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration,condition',
            }
        });
        element = Array.isArray(response.data) ? response.data[ 0 ] : undefined;
    } catch (err) {
        logGoogleError('Routes API', err);
        throw new HttpError(502, 'Unable to fetch distance and time');
    }

    if (!element || element.condition !== 'ROUTE_EXISTS') {
        throw new HttpError(400, 'No route found between these places');
    }

    // duration comes back as a string like "1234s"
    const seconds = parseInt(element.duration, 10) || 0;
    const meters = element.distanceMeters || 0;

    return {
        distance: { value: meters, text: `${(meters / 1000).toFixed(1)} km` },
        duration: { value: seconds, text: `${Math.round(seconds / 60)} mins` },
    };
}

module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) {
        throw new HttpError(400, 'query is required');
    }

    try {
        const response = await axios.post(AUTOCOMPLETE_URL, { input }, {
            headers: {
                'X-Goog-Api-Key': apiKey(),
                'X-Goog-FieldMask': 'suggestions.placePrediction.text.text',
            }
        });

        return (response.data.suggestions || [])
            .map(suggestion => suggestion.placePrediction?.text?.text)
            .filter(Boolean);
    } catch (err) {
        logGoogleError('Places autocomplete', err);
        throw new HttpError(502, 'Unable to fetch suggestions');
    }
}

// Captains that are online (have a socket) within `radius` km of the point,
// optionally limited to one vehicle type.
module.exports.getCaptainsInTheRadius = async (ltd, lng, radius, vehicleType) => {
    const EARTH_RADIUS_KM = 6371;

    const filter = {
        location: {
            $geoWithin: {
                // GeoJSON order is [lng, lat]; the radius is converted to radians
                $centerSphere: [ [ lng, ltd ], radius / EARTH_RADIUS_KM ]
            }
        },
        socketId: { $exists: true, $ne: null },
        status: 'active'
    };

    if (vehicleType) {
        filter[ 'vehicle.vehicleType' ] = vehicleType;
    }

    return captainModel.find(filter);
}

// Curated landmarks for instant matching
const POPULAR_LOCATIONS = [
    'Delhi Gate, Asaf Ali Road, New Delhi, Delhi, India',
    'Connaught Place, Rajiv Chowk, New Delhi, Delhi, India',
    'India Gate, Rajpath, New Delhi, Delhi, India',
    'Red Fort, Netaji Subhash Marg, Chandni Chowk, New Delhi, India',
    'Chandni Chowk Metro Station, Old Delhi, Delhi, India',
    'Indira Gandhi International Airport (DEL), New Delhi, Delhi, India',
    'New Delhi Railway Station, Bhavbhuti Marg, Paharganj, New Delhi, India',
    'Hazrat Nizamuddin Railway Station, Nizamuddin East, New Delhi, India',
    'Hauz Khas Village, Deer Park, South Delhi, New Delhi, India',
    'Cyber Hub, DLF Phase 2, Gurugram, Haryana, India',
    'Sector 18, Atta Market, Noida, Uttar Pradesh, India',
    'Clock Tower, Rajpur Road, Dehradun, Uttarakhand, India',
    'ISBT Dehradun, Haridwar Road, Dehradun, Uttarakhand, India',
    'Gateway of India, Apollo Bandar, Colaba, Mumbai, Maharashtra, India',
    'Marine Drive, Chowpatty, Mumbai, Maharashtra, India',
    'Bandra Kurla Complex (BKC), Bandra East, Mumbai, Maharashtra, India',
    'Chhatrapati Shivaji Maharaj International Airport (BOM), Mumbai, India',
    'MG Road, Shivaji Nagar, Bengaluru, Karnataka, India',
    'Koramangala, 5th Block, Bengaluru, Karnataka, India',
    'Indiranagar, 100 Feet Road, Bengaluru, Karnataka, India',
    'Kempegowda International Airport (BLR), Devanahalli, Bengaluru, India',
    'Hitech City, Madhapur, Hyderabad, Telangana, India',
    'Charminar, Ghansi Bazaar, Hyderabad, Telangana, India'
];

// Fallback search that queries open geocoding / OSM Photon API or local catalog
module.exports.getFallbackSuggestions = async (input) => {
    if (!input || !input.trim()) return [];
    const query = input.trim();

    try {
        const response = await axios.get(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`, {
            timeout: 3000,
            headers: { 'User-Agent': 'NexRide/1.0' }
        });
        if (response.data && Array.isArray(response.data.features)) {
            const results = response.data.features.map(f => {
                const p = f.properties || {};
                const parts = [ p.name, p.street, p.city || p.county, p.state, p.country ].filter(Boolean);
                return [ ...new Set(parts) ].join(', ');
            }).filter(Boolean);

            if (results.length > 0) {
                return [ ...new Set(results) ];
            }
        }
    } catch {
        // Fallback to internal landmark catalog
    }

    const qLower = query.toLowerCase();
    const matched = POPULAR_LOCATIONS.filter(place => place.toLowerCase().includes(qLower));
    return matched.length > 0 ? matched : [ `${query}, New Delhi, India` ];
};

module.exports.getFallbackCoordinates = async (address) => {
    if (!address) return { ltd: 28.6139, lng: 77.2090 };

    try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`, {
            timeout: 3000,
            headers: { 'User-Agent': 'NexRide/1.0' }
        });
        if (response.data && response.data.length > 0) {
            return {
                ltd: parseFloat(response.data[ 0 ].lat),
                lng: parseFloat(response.data[ 0 ].lon)
            };
        }
    } catch {
        // Fallback to coordinate dictionary
    }

    const lower = address.toLowerCase();
    if (lower.includes('delhi gate')) return { ltd: 28.6392, lng: 77.2408 };
    if (lower.includes('connaught place') || lower.includes('rajiv chowk')) return { ltd: 28.6318, lng: 77.2194 };
    if (lower.includes('india gate')) return { ltd: 28.6129, lng: 77.2295 };
    if (lower.includes('red fort')) return { ltd: 28.6562, lng: 77.2410 };
    if (lower.includes('clock tower') || lower.includes('dehradun')) return { ltd: 30.3256, lng: 78.0437 };

    return { ltd: 28.6139, lng: 77.2090 };
};

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

module.exports.getFallbackDistanceTime = async (origin, destination) => {
    const originCoords = await module.exports.getFallbackCoordinates(origin);
    const destCoords = await module.exports.getFallbackCoordinates(destination);

    const directKm = haversineDistance(originCoords.ltd, originCoords.lng, destCoords.ltd, destCoords.lng);
    const drivingKm = Math.max(1.2, directKm * 1.3);
    const meters = Math.round(drivingKm * 1000);
    const minutes = Math.max(5, Math.round(drivingKm / 28 * 60));
    const seconds = minutes * 60;

    return {
        distance: { value: meters, text: `${(meters / 1000).toFixed(1)} km` },
        duration: { value: seconds, text: `${minutes} mins` },
    };
};
