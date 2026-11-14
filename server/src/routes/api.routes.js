import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import cartRoutes from './cart.routes.js';
import userRoutes from './user.routes.js';
import paymentRoutes from './payment.routes.js';
import orderRoutes from './order.routes.js';
import notificationRoutes from './notification.routes.js';
import reviewRoutes from './review.routes.js';
import deliveryRoutes from './delivery.routes.js';
import adminRoutes from './admin.routes.js';
import bannerRoutes from './banner.routes.js';

const router = Router();

// Mount Health Check
router.use('/health', healthRoutes);

// Mount Authentication & Identity
router.use('/auth', authRoutes);

// Mount Product & Category Catalog
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/banners', bannerRoutes);

// Mount Cart & User Address Book
router.use('/cart', cartRoutes);
router.use('/users', userRoutes);

// Mount Payments & Orders
router.use('/payments', paymentRoutes);
router.use('/orders', orderRoutes);

// Mount In-App Notifications & Reviews
router.use('/notifications', notificationRoutes);
router.use('/reviews', reviewRoutes);

// Mount Delivery Partner Operations
router.use('/delivery', deliveryRoutes);

// Mount Admin Control Center
router.use('/admin', adminRoutes);

export default router;
