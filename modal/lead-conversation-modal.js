import mongoose from 'mongoose';

// Lead Conversation Schema
const leadConversationSchema = new mongoose.Schema({
    leadID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true,
    },
    message: { type: String, required: true },
    sendBy: {
        type: String,
        enum: ['Lead', 'Member'],
        default: 'Lead',
    },
    assigneeID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
}, { timestamps: true });

const LeadConversation = mongoose.model('LeadConversation', leadConversationSchema);
export default LeadConversation;