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