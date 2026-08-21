import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    usageLimit: {
        type: Number,
        required: true,
        default: 1,
        min: 1,
    },
    usedBy: [{ type: String }], // Telegram ID lar
    rewardDays: {
        type: Number,
        default: 1,
        min: 1,
    },
    expiryDate: { type: Date, default: null },
    createdBy: { type: String, required: true },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
});

promoCodeSchema.index({ createdAt: -1 });

promoCodeSchema.virtual('isValid').get(function () {
    const isExpired = this.expiryDate && new Date() > this.expiryDate;
    const isLimitReached = this.usedBy.length >= this.usageLimit;
    return !isExpired && !isLimitReached;
});

export default mongoose.model('PromoCode', promoCodeSchema);
