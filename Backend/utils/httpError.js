// An error that carries the HTTP status to send back to the client.
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const sendError = (res, err) => {
    if (!err.status) {
        console.error(err);
    }
    if (err.name === 'ValidationError') {
        const firstMessage = Object.values(err.errors || {})[0]?.message || err.message;
        return res.status(400).json({ message: firstMessage });
    }
    if (err.code === 11000) {
        return res.status(400).json({ message: 'User already exists with this email' });
    }
    return res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
};

module.exports = { HttpError, sendError };
