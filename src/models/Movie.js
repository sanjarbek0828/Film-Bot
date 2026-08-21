import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    userId: { type: Number, required: true },
    userName: String,
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 1000 },
    date: { type: Date, default: Date.now },
}, { _id: true });

const movieSchema = new mongoose.Schema({
    code: {
        type: Number,
        required: true,
        unique: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: String,
    genre: { type: String, trim: true, default: 'Kino' },
    year: Number,
    fileId: String,   // Telegram video file_id
    link: String,     // Ixtiyoriy tashqi havola
    poster: String,   // Telegram file_id yoki to'liq URL
    views: {
        type: Number,
        default: 0,
    },
    isRestricted: {
        type: Boolean,
        default: false,
    },
    reviews: [reviewSchema],
    ratingSum: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
}, {
    timestamps: true, // createdAt + updatedAt avtomatik va indekslanadigan
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// ═══ INDEKSLAR (model() dan OLDIN e'lon qilinishi shart) ═══
// Matnli qidiruv: nom bo'yicha vaznli, tavsif bo'yicha ikkilamchi
movieSchema.index(
    { title: 'text', genre: 'text' },
    { weights: { title: 10, genre: 2 }, name: 'movie_text_search' }
);
movieSchema.index({ createdAt: -1 });          // "Yangi kinolar"
movieSchema.index({ views: -1 });              // "Top kinolar"
movieSchema.index({ genre: 1, createdAt: -1 });// Janr bo'yicha sahifalash
movieSchema.index({ year: -1 });

movieSchema.virtual('averageRating').get(function () {
    if (!this.ratingCount) return 0;
    return Number((this.ratingSum / this.ratingCount).toFixed(1));
});

const Movie = mongoose.model('Movie', movieSchema);

export default Movie;
