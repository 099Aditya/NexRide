const mapService = require('../services/maps.service');
const { validationResult } = require('express-validator');

module.exports.getCoordinates = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { address } = req.query;

    try {
        const coordinates = await mapService.getAddressCoordinate(address);
        return res.status(200).json(coordinates);
    } catch {
        try {
            const fallbackCoordinates = await mapService.getFallbackCoordinates(address);
            if (fallbackCoordinates) {
                return res.status(200).json(fallbackCoordinates);
            }
        } catch {}
        res.status(404).json({ message: 'Coordinates not found' });
    }
}

module.exports.getDistanceTime = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { origin, destination } = req.query;

        try {
            const distanceTime = await mapService.getDistanceTime(origin, destination);
            return res.status(200).json(distanceTime);
        } catch {
            const fallback = await mapService.getFallbackDistanceTime(origin, destination);
            return res.status(200).json(fallback);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports.getAutoCompleteSuggestions = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { input } = req.query;

        try {
            const suggestions = await mapService.getAutoCompleteSuggestions(input);
            if (suggestions && suggestions.length > 0) {
                return res.status(200).json(suggestions);
            }
        } catch {}

        // Fallback to open geocoding so suggestions always work reliably
        const fallback = await mapService.getFallbackSuggestions(input);
        return res.status(200).json(fallback);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
}
