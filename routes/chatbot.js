/*
|---------------------------------------------------------------------------
| Chat and Settings Routes
|---------------------------------------------------------------------------
| Routes for chatbot settings, ticket management, and lead analytics.
| Protected routes use `isAuth` middleware to verify authentication.
| Includes CRUD operations for tickets, status updates, and assignees.
*/


import express from "express";
import settingsController from '../controller/settings.js';
import chatController from '../controller/chat.js';
import leadController from '../controller/lead.js';
import isAuth from "../middleware/isAuthenticated.js";

const router = express.Router();

router.route('/bot-settings').get(settingsController.getBotSettings).put(isAuth, settingsController.putChatBotSettings);
router.route('/analytics').get(isAuth, leadController.getLeadsAnalytics);

router.route('/ticket').get(isAuth, chatController.getLeadList)
router.route('/ticket/status').put(isAuth, chatController.putStatusUpdate);
router.route('/ticket/assignee/:ticketID?').get(isAuth, chatController.getAssigneeList).put(isAuth, chatController.putLeadAssignee);
router.route('/ticket/:ticketID?').get(isAuth, chatController.getLeadDetails).put(isAuth, chatController.putMessage);
router.route('/').get(isAuth, chatController.getTicketList);

export default router;