/*
|---------------------------------------------------------------------------
| Chatbot Settings Schema
|---------------------------------------------------------------------------
| Defines the schema for chatbot settings: UI colors, messages, form placeholders, 
| welcome message, and missed chat timer.
*/

import mongoose from 'mongoose';

const chatbotSettingsSchema = new mongoose.Schema({
    headerColor: { type: String, default: '#33475B' },
    backgroundColor: { type: String, default: '#EEEEEE' },
    customizedMessages: {
        type: [String],
        required: true,
        default: [],
    },
    formPlaceholder: {
        name: { type: String },
        email: { type: String },
        phone: { type: String },
        submitButton: { type: String },
    },
    welcomeMessage: { type: String },
    missedChatTimer: {
        hour: { type: Number },
        minute: { type: Number },
        second: { type: Number },
    },
}, { timestamps: true });

const ChatbotSettings = mongoose.model('ChatbotSettings', chatbotSettingsSchema);
export default ChatbotSettings;