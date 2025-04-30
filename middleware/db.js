/*
|--------------------------------------------------------------------------
| MongoDB Connection & Default Settings Initialization
|--------------------------------------------------------------------------
|
| This file establishes the connection to MongoDB using Mongoose and loads default 
| chatbot settings if none exist in the database.
|
| - The `connectDB` function connects to MongoDB using the URI from the `.env` file.
| - If no chatbot settings are found, it triggers the creation of default settings
|   via the `settingsController.loadDefaultSettings` method.
| - Upon successful connection and settings load, a success message is logged, 
|   and an event `connected` is emitted.
| - If an error occurs during the connection process, it logs the error and exits the process.
|
| Environment variables are loaded using `dotenv` for secure configuration management.
|
*/


import { configDotenv } from 'dotenv';
import mongoose from 'mongoose';
import settingsController from '../controller/settings.js';
import ChatbotSettings from '../modal/chat-bot-modal.js';

configDotenv();
const { MONGO_URI } = process.env;

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);

        const settingsCount = await ChatbotSettings.countDocuments();
        // If the Settings Count is zero, create default settings
        if (settingsCount === 0) {
            const response = await settingsController.loadDefaultSettings();
            if (!response) return;
            console.log('Default Settings created successfully');
        }
        mongoose.connection.emit('connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

export default connectDB;