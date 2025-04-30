/*
|---------------------------------------------------------------------------
| Chatbot Settings Management Controllers
|---------------------------------------------------------------------------
|
| This file handles chatbot settings, including:
|
| - `loadDefaultSettings`: Initializes and saves default chatbot settings.
| - `getBotSettings`: Retrieves current chatbot settings from the database.
| - `putChatBotSettings`: Updates chatbot settings with provided data.
|
| The controllers interact with the `ChatbotSettings` model to fetch and 
| save settings, ensuring that defaults are loaded if no settings exist. 
| Error handling is done using the `CustomError` class with appropriate 
| HTTP status codes.
*/


import { CustomError } from "../middleware/errorMiddleware.js";
import ChatbotSettings from "../modal/chat-bot-modal.js"
import RouteCode from "../util/httpStatus.js";

async function loadDefaultSettings() {
    try {
        const defaultSettings = new ChatbotSettings({
            headerColor: '#33475B',
            backgroundColor: '#EEEEEE',
            customizedMessages: ['How can i help you?', 'Ask me anything!'],
            formPlaceholder: {
                name: 'Your name',
                phone: '+1 (000) 000-0000',
                email: 'example@gmail.com',
                submitButton: 'Thank You!',
            },
            welcomeMessage: "👋 Want to chat about Hubly? I'm a chatbot here to help you find your way.",
            missedChatTimer: {
                hour: 1,
                minute: 0,
                second: 0,
            }
        })

        await defaultSettings.save();
        return true;
    } catch (error) {
        console.error('Error saving default settings:', error);
        return false;
    }
}

const getBotSettings = async (req, res, next) => {
    try {
        const data = await ChatbotSettings.find();
        if (!data || data.length === 0) {
            await loadDefaultSettings();
            return next(new CustomError('Something went wrong, Please retry!', RouteCode.EXPECTATION_FAILED.statusCode));
        }

        const { headerColor, backgroundColor, customizedMessages, formPlaceholder, welcomeMessage, missedChatTimer } = data[0];
        const foundSettings = {
            headerColor: headerColor,
            backgroundColor: backgroundColor,
            customizedMessages: customizedMessages,
            formPlaceholder: {
                name: formPlaceholder.name,
                email: formPlaceholder.email,
                phone: formPlaceholder.phone,
                submitButton: formPlaceholder.submitButton,
            },
            welcomeMessage: welcomeMessage,
            missedChatTimer: {
                hour: missedChatTimer.hour,
                minute: missedChatTimer.minute,
                second: missedChatTimer.second,
            }
        };

        return res.status(RouteCode.SUCCESS.statusCode).json(foundSettings);
    } catch (error) {
        next(error)
    }
}

const putChatBotSettings = async (req, res, next) => {
    const { headerColor, backgroundColor, customizedMessages, formPlaceholder, welcomeMessage, missedChatTimer } = req.body;
    if (!headerColor || !backgroundColor || !customizedMessages || !formPlaceholder || !welcomeMessage || !missedChatTimer) return next(new CustomError('Please share all details', RouteCode.CONFLICT.statusCode));

    try {
        const updatedSettings = await ChatbotSettings.findOneAndUpdate(
            {}, // Find any one document
            {
                headerColor,
                backgroundColor,
                customizedMessages,
                formPlaceholder: {
                    name: formPlaceholder.name ?? 'Your name',
                    email: formPlaceholder.email ?? '+1 (000) 000-0000',
                    phone: formPlaceholder.phone ?? 'example@gmail.com',
                    submitButton: formPlaceholder.submitButton ?? 'Thank You!',
                },
                welcomeMessage: formPlaceholder.welcomeMessage ?? "👋 Want to chat about Hubly? I'm a chatbot here to help you find your way.",
                missedChatTimer: {
                    hour: missedChatTimer.hour,
                    minute: missedChatTimer.minute,
                    second: missedChatTimer.second,
                }
            },
            { new: true, upsert: false }
        );

        // If no document was found to update then create one
        if (!updatedSettings) {
            await loadDefaultSettings();
            return next(new CustomError('Something went wrong, Please retry!', RouteCode.EXPECTATION_FAILED.statusCode));
        }

        return res.status(RouteCode.SUCCESS.statusCode).json({ message: 'Chatbot Setting have updated succesfully!' });
    } catch (error) {
        next(error)
    }
}


export default {
    loadDefaultSettings, getBotSettings, putChatBotSettings
}