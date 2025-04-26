import mongoose from 'mongoose';
import Lead from './lead-modal.js';
import LeadConversation from './lead-conversation-modal.js';

// User Schema
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    contact: { type: String, trim: true },
    password: {
        type: String,
        required: true,
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    userRole: {
        type: String,
        enum: ['Admin', 'Member'],
        default: 'Member',
    },
    refresh_token: { type: String },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

userSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    const member = this;
    try {
        // Only allow deleting members
        if (member.userRole !== 'Member') return next();

        const adminUser = await User.findOne({ userRole: 'Admin' });
        if (!adminUser) return next(new Error('No admin user found for reassignment'));

        // Update currentAssignee
        await Lead.updateMany(
            { currentAssignee: member._id },
            { currentAssignee: adminUser._id }
        );

        // Update assigneeList
        await Lead.updateMany(
            { assigneeList: member._id },
            {
                $pull: { assigneeList: member._id },
                $addToSet: { assigneeList: adminUser._id },
            }
        );

        // Update LeadConversation assigneeID
        await LeadConversation.updateMany(
            { assigneeID: member._id },
            { assigneeID: adminUser._id }
        );

        console.log(`Reassigned leads and conversations from Member ${member._id} to Admin ${adminUser._id}`);
        next();
    } catch (error) {
        next(error);
    }
});

export default User;