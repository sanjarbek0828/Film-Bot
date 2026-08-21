import mongoose from 'mongoose';

const watchHistorySchema = new mongoose.Schema({
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
    watchedAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
    telegramId: {
        type: Number,
        required: true,
        unique: true,
        index: true,
    },
    firstName: String,
    username: String,

    isBanned: { type: Boolean, default: false },
    bannedUntil: { type: Date, default: null },
    banReason: { type: String, default: null },

    vipUntil: { type: Date, default: null },
    vipAddedBy: { type: String, default: null },
    vipAddedAt: { type: Date, default: null },
    vipNotified: { type: Boolean, default: false },

    moviesWatched: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    downloadsCount: { type: Number, default: 0 },

    role: {
        type: String,
        enum: ['user', 'admin', 'superadmin'],
        default: 'user',
    },
    language: {
        type: String,
        enum: ['uz', 'ru', 'en'],
        default: 'uz',
    },

    dailyMovieCount: { type: Number, default: 0 },
    lastMovieDate: { type: Date, default: null },

    // Faqat oxirgi 50 ta yozuv saqlanadi (userService da kesiladi)
    watchHistory: [watchHistorySchema],

    points: { type: Number, default: 0 },
    lastDailyBonus: { type: Date, default: null },

    referralCount: { type: Number, default: 0 },
    invitedBy: { type: String, default: null },

    lastBroadcastMsgId: { type: Number, default: null },
    lastSeenAt: { type: Date, default: Date.now },
}, {
    timestamps: true,
});

// ═══ INDEKSLAR ═══
userSchema.index({ role: 1 });                        // Adminlar ro'yxati
userSchema.index({ vipUntil: -1 });                   // VIP filtri va scheduler
userSchema.index({ isBanned: 1, telegramId: 1 });     // Broadcast auditoriyasi
userSchema.index({ createdAt: -1 });                  // "Bugun qo'shilganlar"
userSchema.index({ points: -1 });
userSchema.index({ moviesWatched: -1 });
userSchema.index({ lastBroadcastMsgId: 1 }, { sparse: true });
userSchema.index({ vipUntil: 1, vipNotified: 1 });    // Scheduler uchun kompozit

userSchema.virtual('isVip').get(function () {
    return Boolean(this.vipUntil && new Date(this.vipUntil) > new Date());
});

const User = mongoose.model('User', userSchema);

export default User;
