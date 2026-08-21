import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema({
    adminId: { type: String, required: true },
    action: { type: String, required: true },
    targetId: { type: String },
    details: { type: String },
}, { timestamps: true });

adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ adminId: 1, createdAt: -1 });
// Loglar 90 kundan keyin avtomatik o'chadi (baza cheksiz o'smasligi uchun)
adminLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const AdminLog = mongoose.model('AdminLog', adminLogSchema);

/**
 * Log yozish hech qachon asosiy amalni to'xtatmasligi kerak —
 * shuning uchun "fire and forget" yordamchi.
 */
export const logAdminAction = (adminId, action, targetId, details) => {
    AdminLog.create({
        adminId: String(adminId),
        action,
        targetId: targetId != null ? String(targetId) : undefined,
        details,
    }).catch(() => {});
};

export default AdminLog;
