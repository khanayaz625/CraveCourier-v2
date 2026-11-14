import { AuditLog } from '../models/AuditLog.model.js';

/**
 * Persists an immutable audit log of an administrative action
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.adminId
 * @param {string} params.action - e.g. 'BLOCK_USER', 'APPROVE_PARTNER', 'ISSUE_REFUND'
 * @param {string} params.entity - 'User' | 'DeliveryPartnerProfile' | 'Order' | 'Product' | 'Category' | 'Coupon' | 'Banner'
 * @param {string|mongoose.Types.ObjectId} params.entityId
 * @param {Object} [params.details={}]
 * @param {import('express').Request} [params.req]
 */
export const logAdminAction = async ({ adminId, action, entity, entityId, details = {}, req }) => {
  try {
    const ipAddress =
      req?.headers['x-forwarded-for'] ||
      req?.socket?.remoteAddress ||
      req?.ip ||
      '';

    await AuditLog.create({
      admin: adminId,
      action,
      entity,
      entityId,
      details,
      ipAddress: String(ipAddress).split(',')[0].trim(),
    });
  } catch (error) {
    console.error('[AUDIT_LOG_PERSISTENCE_FAILED]', error.message);
  }
};

