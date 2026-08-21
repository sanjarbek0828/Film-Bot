import mongoose from 'mongoose';
import config from './env.js';
import logger from '../utils/logger.js';

/**
 * MongoDB ulanishi.
 *
 * Eski versiyada `dns.setServers()` global chaqirilgan edi — bu Render kabi
 * platformalarda ichki DNS ni buzib, mongodb+srv ulanishini uzib qo'yishi mumkin.
 * Shuning uchun olib tashlandi (faqat aniq talab qilinganda yoqiladi).
 */

let isConnected = false;

mongoose.set('strictQuery', true);
// Mavjud bo'lmagan indeksga so'rov ketganda ogohlantirish (dev rejimda)
if (!config.isProduction) mongoose.set('debug', false);

const connectDB = async () => {
    if (isConnected) return mongoose.connection;

    mongoose.connection.on('connected', () => {
        isConnected = true;
        logger.success(`MongoDB ulandi: ${mongoose.connection.host}/${mongoose.connection.name}`);
    });

    mongoose.connection.on('disconnected', () => {
        isConnected = false;
        logger.warn('MongoDB ulanishi uzildi — avtomatik qayta ulanish kutilmoqda');
    });

    mongoose.connection.on('error', (err) => {
        logger.error('MongoDB ulanish xatosi:', err.message);
    });

    await mongoose.connect(config.mongoUri, {
        maxPoolSize: 20,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        retryReads: true,
        compressors: ['zlib'], // Tarmoq trafigini kamaytiradi (Atlas bilan sezilarli tezlik)
    });

    return mongoose.connection;
};

export const isDbConnected = () => mongoose.connection.readyState === 1;

export const disconnectDB = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        isConnected = false;
    }
};

export default connectDB;
