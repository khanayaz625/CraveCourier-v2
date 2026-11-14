import { Router } from 'express';
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  registerFcmToken,
  unregisterFcmToken,
  sendTestPushNotification,
} from '../controllers/notification.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect); // All notification endpoints require authentication

// 1. Static / Specific notification endpoints (must precede dynamic /:id)
router.get('/', getMyNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.post('/fcm-token', registerFcmToken);
router.delete('/fcm-token', unregisterFcmToken);
router.post('/test-push', sendTestPushNotification);

// 2. Dynamic parameter endpoints
router.patch('/:id/read', markNotificationRead);
router.delete('/:id', deleteNotification);

export default router;
