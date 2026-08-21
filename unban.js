import connectDB, { disconnectDB } from './src/config/db.js';
import User from './src/models/User.js';

/**
 * Barcha foydalanuvchilarni blokdan chiqarish uchun bir martalik skript.
 * Ishlatish: node unban.js
 */
const unbanAll = async () => {
    try {
        await connectDB();
        const res = await User.updateMany(
            { isBanned: true },
            { $set: { isBanned: false, bannedUntil: null } }
        );
        console.log(`✅ Blokdan chiqarildi: ${res.modifiedCount} ta foydalanuvchi`);
    } catch (error) {
        console.error('❌ Xatolik:', error.message);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
};

unbanAll();
