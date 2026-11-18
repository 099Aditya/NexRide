const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServerInstance = null;

async function connectToDb() {
    const dbUri = process.env.DB_CONNECT || 'mongodb://127.0.0.1:27017/veloxride';

    try {
        await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 2000 });
        console.log(`Connected to MongoDB at ${dbUri}`);
    } catch (err) {
        console.warn(`Could not connect to external MongoDB at ${dbUri} (${err.message}). Starting local in-process MongoDB on 27017...`);
        try {
            mongoServerInstance = await MongoMemoryServer.create({
                instance: {
                    port: 27017,
                    dbName: 'veloxride',
                    launchTimeout: 120000
                }
            });
            const fallbackUri = 'mongodb://127.0.0.1:27017/veloxride';
            await mongoose.connect(fallbackUri);
            console.log(`Connected to embedded MongoDB at ${fallbackUri}`);
        } catch (innerErr) {
            console.error('Failed to initialize embedded MongoDB:', innerErr);
        }
    }
}

module.exports = connectToDb;
