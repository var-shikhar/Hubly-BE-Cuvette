import { CustomError } from "../middleware/errorMiddleware.js";
import LeadConversation from "../modal/lead-conversation-modal.js";
import Lead from "../modal/lead-modal.js";
import User from "../modal/user-modal.js";
import RouteCode from "../util/httpStatus.js";

async function getTicketID() {
    const fullYear = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const day = new Date().getDate();

    const baseTicketID = `${fullYear}-${month > 9 ? month : '0' + month}${day > 9 ? day : '0' + day}`;
    let ticketID = baseTicketID;

    let count = 1;
    let foundLead = await Lead.findOne({ ticketID });

    while (foundLead) {
        const suffix = count > 9 ? count : `0${count}`;
        ticketID = `${baseTicketID}-${suffix}`;
        foundLead = await Lead.findOne({ ticketID });
        count++;
    }

    return ticketID;
}

const getLeadsDetails = async (req, res, next) => {
    const { leadID } = req.params;
    if (!leadID) return next(new CustomError("Invalid Lead ID!", RouteCode.BAD_REQUEST.statusCode));

    try {
        const foundLead = await Lead.findById(leadID);
        if (!foundLead) return next(new CustomError("Lead not found!", RouteCode.NOT_FOUND.statusCode));

        const foundConversation = await LeadConversation.find({ leadID: leadID }).sort({ createdAt: 1 });

        const finalOBJ = {
            leadID: foundLead._id,
            userName: foundLead.userName,
            userPhone: foundLead.userPhone,
            userEmail: foundLead.userEmail,
            isFirstMessageShared: foundLead.isFirstMessageShared,
            detailsShared: foundLead.isDetailsShared,
            status: foundLead.status,
            conversation: foundConversation?.map(item => ({
                id: item._id,
                message: item.message,
                sendBy: item.sendBy,
            })) ?? []
        }

        return res.status(RouteCode.SUCCESS.statusCode).json(finalOBJ);
    } catch (error) {
        next(error);
    }
}

const postNewLead = async (req, res, next) => {
    const { message } = req.body;
    if (!message) return next(new CustomError("Invalid details shared!", RouteCode.BAD_REQUEST.statusCode));

    try {
        const foundAdmin = await User.findOne({ userRole: 'Admin' });
        if (!foundAdmin) return next(new CustomError("No Admin found, Contact support!", RouteCode.UNAUTHORIZED.statusCode));

        const ticketID = await getTicketID()
        const newLead = new Lead({
            ticketID: ticketID,
            currentAssignee: foundAdmin._id,
            assigneeList: [foundAdmin._id],
            isFirstMessageShared: true,
            isDetailsShared: false,
        });

        await newLead.save();
        const leadID = newLead._id;
        const newConversation = new LeadConversation({
            leadID,
            message,
            sendBy: 'Lead',
        });

        await newConversation.save();
        return res.status(RouteCode.SUCCESS.statusCode).json({ leadID: leadID });
    } catch (error) {
        next(error);
    }
}

const postLeadForm = async (req, res, next) => {
    const { leadID, name, email, phone } = req.body;
    if (!leadID || !name || !email || !phone) return next(new CustomError("Invalid details shared!", RouteCode.BAD_REQUEST.statusCode));

    try {
        const foundLead = await Lead.findById(leadID);
        if (!foundLead) return next(new CustomError("Lead not found!", RouteCode.NOT_FOUND.statusCode));

        foundLead.userName = name.trim();
        foundLead.userEmail = email.trim();
        foundLead.userPhone = phone.trim();
        foundLead.isDetailsShared = true;
        await foundLead.save();

        return res.status(RouteCode.SUCCESS.statusCode).json({ message: 'Lead details updated successfully!' });
    } catch (error) {
        next(error);
    }
}

const putLeadMessage = async (req, res, next) => {
    const { leadID, message } = req.body;
    if (!leadID || !message) return next(new CustomError("Invalid details shared!", RouteCode.BAD_REQUEST.statusCode));

    try {
        const foundLead = await Lead.findById(leadID);
        if (!foundLead) return next(new CustomError("Lead not found!", RouteCode.NOT_FOUND.statusCode));

        const newConversation = new LeadConversation({
            leadID: foundLead._id,
            message,
            sendBy: 'Lead',
        });

        await newConversation.save();
        return res.status(RouteCode.SUCCESS.statusCode).json({ message: 'Message sent successfully!' });
    } catch (error) {
        next(error);
    }
}


// Analytics
const getWeekNumber = (date) => {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.ceil((diff + start.getDay() + 1) / 7);
};

const getLeadsAnalytics = async (req, res, next) => {
    try {
        const totalLeadCount = await Lead.countDocuments();
        const resolvedLeadCount = await Lead.countDocuments({ status: 'Resolved' });
        const totalResolvedLeads = totalLeadCount === 0
            ? 0
            : Math.round((resolvedLeadCount / totalLeadCount) * 100);


        const totalLeads = await Lead.find();

        // Average Response Time
        let averateResponseTime = 0;
        const responseData = totalLeads?.reduce(
            (acc, lead) => {
                if (lead.responseTime !== 0) {
                    acc.count++;
                    acc.sum += lead.responseTime;
                }
                return acc;
            },
            { sum: 0, count: 0 }
        );
        if (responseData.count > 0) {
            averateResponseTime = responseData.sum / responseData.count;
        }

        // Missed Chats Weekly Graph (last 10 weeks)
        const missedChatLeads = totalLeads.filter((lead) => lead.isMissedChat);
        const currentYear = new Date().getFullYear();
        const missedChatsByWeek = Array(10).fill(0);

        missedChatLeads.forEach((lead) => {
            const leadDate = new Date(lead.createdAt);
            if (leadDate.getFullYear() === currentYear) {
                const weekNum = getWeekNumber(leadDate);
                const currentWeek = getWeekNumber(new Date());

                const weekIndexFromNow = currentWeek - weekNum;
                if (weekIndexFromNow >= 0 && weekIndexFromNow < 10) {
                    missedChatsByWeek[9 - weekIndexFromNow] += 1;
                }
            }
        });

        const finalList = {
            totalLeads: totalLeadCount,
            totalResolvedLeads,
            averateResponseTime: Math.round(averateResponseTime),
            leadGraph: missedChatsByWeek,
        };

        res.status(RouteCode.SUCCESS.statusCode).json(finalList);
    } catch (error) {
        next(error);
    }
};


export default {
    getLeadsDetails, postNewLead, postLeadForm, putLeadMessage, getLeadsAnalytics
}