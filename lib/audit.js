/**
 * Audit Logging Module
 * Logs sensitive operations to a dedicated MongoDB collection for compliance.
 */

import { getDb } from './db.js';

/**
 * Write an audit log entry.
 * @param {Object} entry
 * @param {string} entry.action - e.g., 'CREATE_EMPLOYEE', 'DELETE_EMPLOYEE', 'APPROVE_LEAVE'
 * @param {string} entry.performedBy - User ID or email of who performed the action
 * @param {string} entry.performedByRole - Role of the actor
 * @param {string} [entry.targetId] - ID of the affected resource
 * @param {string} [entry.targetType] - Type of resource (e.g., 'employee', 'leave', 'task')
 * @param {Object} [entry.details] - Additional details / before-after snapshot
 * @param {string} [entry.ip] - Client IP if available
 */
export async function auditLog(entry) {
  try {
    const db = await getDb();
    await db.collection('audit_logs').insertOne({
      ...entry,
      timestamp: new Date().toISOString(),
      _createdAt: new Date(),
    });
  } catch (err) {
    // Audit logging should never crash the main request.
    console.error('[AUDIT] Failed to write audit log:', err.message);
  }
}

/**
 * Convenience: log an admin action
 */
export async function logAdminAction(session, action, targetType, targetId, details = {}) {
  await auditLog({
    action,
    performedBy: session?.email || session?.id || 'unknown',
    performedByRole: session?.role || 'unknown',
    targetType,
    targetId,
    details,
  });
}
