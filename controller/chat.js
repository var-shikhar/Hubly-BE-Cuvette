/*
|---------------------------------------------------------------------------
| Ticket Management and Lead Assignment Controllers
|---------------------------------------------------------------------------
|
| This file contains controllers for managing lead tickets, including retrieval,
| assignment, and status updates. The controllers provide functionality for:
|
| - `getTicketList`: Retrieves a paginated list of tickets with optional status filter.
| - `getLeadList`: Fetches the list of leads assigned to the current user or all leads for Admin.
| - `getAssigneeList`: Returns a list of users who can be assigned to a lead.
| - `getLeadDetails`: Provides detailed information about a specific lead and its associated conversations.
| - `putStatusUpdate`: Allows the current assignee to update the status of a lead.
|
| The controllers ensure that appropriate permissions are checked before actions are executed, 
| with validation on input parameters.
|
| The system makes use of Mongoose for querying the database and populating associated data 
| (e.g., assignees and conversations). It also handles errors and responds with the appropriate
| status codes using `RouteCode` and custom error handling via `CustomError`.
|
| All functions support pagination, sorting, and ensure data consistency by checking 
| for lead existence and assignee details.
|
| Data fetched includes lead conversations and related assignee information.
| 
| Error handling is performed using the `next` middleware to propagate errors 
| to the global error handler.
*/


import { CustomError } from "../middleware/errorMiddleware.js";
import ChatbotSettings from "../modal/chat-bot-modal.js";
import LeadConversation from "../modal/lead-conversation-modal.js";
import Lead from "../modal/lead-modal.js";
import User from "../modal/user-modal.js";
import RouteCode from "../util/httpStatus.js";
import getReqUser from '../util/reqUser.js';

const getTicketList = async (req, res, next) => {
    let { page = 1, limit = 10, status = 'All' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    try {
        let query = {};
        if (status !== 'All') query.status = status;

        const totalLeads = await Lead.countDocuments(query);
        const totalPages = Math.ceil(totalLeads / limit);

        const foundLeads = await Lead.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        const finalList = await Promise.all(
            foundLeads.map(async ticket => {
                const foundLatestMessage = await LeadConversation.findOne({
                    leadID: ticket._id,
                    sendBy: 'Lead',
                }).sort({ createdAt: -1 });

                return {
                    leadID: ticket._id,
                    ticketID: ticket.ticketID,
                    latestMessage: foundLatestMessage?.message ?? 'No message',
                    postedAt: ticket.createdAt,
                    senderDetails: {
                        name: ticket.userName ?? 'N/A',
                        email: ticket.userEmail ?? 'N/A',
                        phone: ticket.userPhone ?? 'N/A',
                    },
                    status: ticket.status,
                };
            })
        );

        res.status(RouteCode.SUCCESS.statusCode).json({
            totalLeads,
            totalPages,
            currentPage: page,
            limit,
            leadsList: finalList,
        });
    } catch (error) {
        next(error);
    }
};
const getLeadList = async (req, res, next) => {
    try {
        const foundUser = await getReqUser(req, res, next);
        await foundMissedChats(next);
        const query = foundUser.userRole === 'Admin' ? {} : { assigneeList: foundUser._id };
        const foundLeads = await Lead.find(query).populate('currentAssignee').populate('assigneeList').sort({ createdAt: 1 });

        const finalList = await Promise.all(
            foundLeads.map(async lead => {
                const foundLatestMessage = await LeadConversation.findOne({
                    leadID: lead._id,
                    sendBy: 'Lead',
                }).sort({ createdAt: -1 });

                return {
                    leadID: lead._id,
                    ticketID: lead.ticketID,
                    latestMessage: foundLatestMessage?.message ?? 'No message',
                    userName: lead.userName,
                    userPhone: lead.userPhone,
                    userEmail: lead.userEmail,
                    status: lead.status,
                    isMissedChat: lead.isMissedChat,
                    isCurrentAssignee: lead?.currentAssignee._id?.toString() === foundUser?._id?.toString(),
                    assigneeName: `${lead?.currentAssignee?.firstName} ${lead?.currentAssignee?.lastName}` ?? 'N/A',
                    postedAt: lead.createdAt,
                    assigneeList: lead.assigneeList?.map(item => ({
                        userID: item._id,
                        userName: `${item.firstName} ${item.lastName}`,
                    })) ?? [],

                };
            })
        );
        return res.status(RouteCode.SUCCESS.statusCode).json(finalList);
    } catch (error) {
        next(error);
    }
}
const getAssigneeList = async (req, res, next) => {
    const { ticketID } = req.params;
    try {
        const foundLead = await Lead.findById(ticketID);
        if (!foundLead) return next(new CustomError('Lead not found!', RouteCode.NOT_FOUND.statusCode));

        const currentAssignee = foundLead.currentAssignee;
        const foundUsers = await User.find({ _id: { $ne: currentAssignee } });

        const assigneeList = foundUsers?.map(user => ({
            userID: user._id,
            userName: `${user.firstName} ${user.lastName}`,
        })) ?? []
        return res.status(RouteCode.SUCCESS.statusCode).json(assigneeList);
    } catch (error) {
        next(error);
    }
}


const getLeadDetails = async (req, res, next) => {
    const { ticketID } = req.params;
    if (!ticketID) return next(new CustomError('Please share all details', RouteCode.BAD_REQUEST.statusCode));

    try {
        const foundLead = await Lead.findOne({ _id: ticketID });
        if (!foundLead) return next(new CustomError('Lead not found!', RouteCode.NOT_FOUND.statusCode));

        // Get all conversations for this lead, with assigneeID populated
        const foundConversations = await LeadConversation
            .find({ leadID: foundLead._id })
            .populate('assigneeID')
            .sort({ createdAt: 1 });

        const finalData = foundConversations.map((item) => ({
            id: item._id,
            message: item.message,
            sendBy: item.sendBy,
            senderName:
                item.sendBy === 'Lead'
                    ? 'Lead'
                    : item.assigneeID?.firstName ?? 'N/A',
        }));

        return res.status(RouteCode.SUCCESS.statusCode).json(finalData);
    } catch (error) {
        next(error);
    }
};

// Stataus Update
const putStatusUpdate = async (req, res, next) => {
    const { leadID, status } = req.body;
    if (!leadID || !status) return next(new CustomError('Please share all details', RouteCode.MISSING_REQ_PARAMS.statusCode));
    try {
        const foundUser = await getReqUser(req, res, next);
        const foundLead = await Lead.findById(leadID);
        if (!foundLead) return next(new CustomError('Lead not found!', RouteCode.NOT_FOUND.statusCode));
        if (foundLead.currentAssignee.toString() !== foundUser._id.toString()) return next(new CustomError('Only current assignee can update the status!', RouteCode.UNAUTHORIZED.statusCode));

        foundLead.status = status;
        await foundLead.save();
        return res.status(RouteCode.SUCCESS.statusCode).json({ message: 'Status updated successfully!' });
    } catch (error) {
        next(error);
    }
}
// Update lead assignee
const putLeadAssignee = async (req, res, next) => {
    const { leadID, assigneeID } = req.body;
    if (!leadID || !assigneeID) return next(new CustomError('Please share all details', RouteCode.CONFLICT.statusCode));
    try {
        const foundUser = await getReqUser(req, res, next);
        const foundAdmin = await User.findOne({ userRole: 'Admin' });
        if (!foundAdmin || foundUser._id !== foundAdmin._id) return next(new CustomError(!foundAdmin ? 'No Admin found, Contact support!' : 'Only admin can update the assignee!', RouteCode.UNAUTHORIZED.statusCode));

        const foundLead = await Lead.findById(leadID);
        if (!foundLead) return next(new CustomError('Lead not found!', RouteCode.NOT_FOUND.statusCode));

        const foundAssignee = await User.findById(assigneeID);
        if (!foundAssignee) return next(new CustomError('Assignee not found!', RouteCode.NOT_FOUND.statusCode));

        foundLead.currentAssignee = foundAssignee._id;
        foundLead.assigneeList.unshift(foundAssignee._id);

        await foundLead.save();
        return res.status(RouteCode.SUCCESS.statusCode).json({ message: 'Lead assigned to new assignee successfully!' });
    } catch (error) {
        next(error);
    }
}
// Put Message
const putMessage = async (req, res, next) => {
    const { leadID, message } = req.body;
    if (!leadID || !message) return next(new CustomError('Please share all details', RouteCode.BAD_REQUEST.statusCode));
    try {
        const foundUser = await getReqUser(req, res, next);
        const foundLead = await Lead.findById(leadID);
        if (!foundLead) return next(new CustomError('Lead not found!', RouteCode.NOT_FOUND.statusCode));
        if (foundLead.currentAssignee.toString() !== foundUser._id.toString()) return next(new CustomError('Only current assignee can send the lead!', RouteCode.UNAUTHORIZED.statusCode));


        // Check if the lead is Missed Chat and set the responseTime
        const now = new Date();
        const isFirstMessage = foundLead.responseTime === 0;
        const leadCreatedAt = foundLead.createdAt;
        const responseTimeInMs = now.getTime() - new Date(leadCreatedAt).getTime();


        if (isFirstMessage) {
            const responseTimeInSeconds = Math.floor(responseTimeInMs / 1000);
            foundLead.responseTime = responseTimeInSeconds;
        }

        const chatbotSettings = await ChatbotSettings.findOne();
        if (!chatbotSettings) return next(new CustomError('Chatbot settings not found!', RouteCode.NOT_FOUND.statusCode));

        // Check if the lead is Missed Chat
        const { hour = 0, minute = 0, second = 0 } = chatbotSettings.missedChatTimer || {};
        const missedTimerMs = ((hour * 60 * 60) + (minute * 60) + second) * 1000; // Convert into miliseconds

        if (missedTimerMs > 0 && responseTimeInMs > missedTimerMs) {
            foundLead.isMissedChat = true;
        }

        await foundLead.save();

        const newConversation = new LeadConversation({
            leadID: foundLead._id,
            message,
            sendBy: 'Member',
            assigneeID: foundUser._id,
        });

        await newConversation.save();
        return res.status(RouteCode.SUCCESS.statusCode).json({ message: 'Message sent successfully!' });
    } catch (error) {
        next(error);
    }
}

const foundMissedChats = async (next) => {
    try {
        const now = new Date();
        const chatbotSettings = await ChatbotSettings.findOne();
        if (!chatbotSettings) return next(new CustomError('Chatbot settings not found!', RouteCode.NOT_FOUND.statusCode));

        // Check if the lead is Missed Chat
        const { hour = 0, minute = 0, second = 0 } = chatbotSettings.missedChatTimer || {};
        const missedTimerMs = ((hour * 60 * 60) + (minute * 60) + second) * 1000; // Convert into miliseconds
        if (missedTimerMs > 0) {
            const thresholdTime = new Date(Date.now() - missedTimerMs);
            await Lead.updateMany(
                {
                    responseTime: 0,
                    isMissedChat: false,
                    createdAt: { $lt: thresholdTime }
                },
                { $set: { isMissedChat: true } }
            );
        }
    } catch (error) {
        next(error);
    }
}



export default {
    getTicketList, getLeadList, getLeadDetails,
    putStatusUpdate, putLeadAssignee, getAssigneeList, putMessage
}