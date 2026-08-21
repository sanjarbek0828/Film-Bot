import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema({
    channelId: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    inviteLink: {
        type: String,
        required: true,
    },
    addedBy: String,
}, { timestamps: true });

const Channel = mongoose.model('Channel', channelSchema);
export default Channel;
