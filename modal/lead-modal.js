import mongoose from 'mongoose';
import LeadConversation from './lead-conversation-modal.js';

// Lead Schema
const leadSchema = new mongoose.Schema({
    ticketID: { type: String, required: true },
    userName: { type: String },
    userEmail: { type: String },
    userPhone: { type: String },
    isMissedChat: { type: Boolean, default: false },
    responseTime: { type: Number, default: 0 },
    currentAssignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    assigneeList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }],
    isFirstMessageShared: { type: Boolean, default: false },
    isDetailsShared: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['Resolved', 'Unresolved'],
        default: 'Unresolved',
    },
}, { timestamps: true });

const Lead = mongoose.model('Lead', leadSchema);

leadSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    const lead = this;
    try {
        await LeadConversation.deleteMany({ leadID: lead._id });
        console.log(`Deleted lead ${lead._id}`);
        next();
    } catch (error) {
        next(error);
    }
});

export default Lead;