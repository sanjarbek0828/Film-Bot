import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    movie: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie',
        required: true,
    },
}, { timestamps: true });

// Takroriy sevimlilarni bloklaydi + "foydalanuvchi sevimlilari" so'rovini tezlashtiradi
favoriteSchema.index({ user: 1, movie: 1 }, { unique: true });
favoriteSchema.index({ user: 1, createdAt: -1 });

const Favorite = mongoose.model('Favorite', favoriteSchema);

export default Favorite;
