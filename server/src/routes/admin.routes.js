import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import {
  getDashboardAnalytics,
  getUsers,
  updateUser,
  getDeliveryPartners,
  verifyDeliveryPartner,
  getOrders,
  assignOrderPartner,
  updateOrderStatus,
  refundOrder,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getAuditLogs,
  exportCsvReport,
  purgeOrdersAndDeliveryData,
} from '../controllers/admin.controller.js';

const router = Router();

// Protect and restrict all admin routes to role: admin
router.use(protect, authorize('admin'));

// 1. Analytics & KPIs
router.get('/analytics', getDashboardAnalytics);

// 2. User Management
router.get('/users', getUsers);
router.patch('/users/:id', updateUser);

// 3. Delivery Partner Operations & KYC
router.get('/delivery-partners', getDeliveryPartners);
router.patch('/delivery-partners/:id/verify', verifyDeliveryPartner);

// 4. Orders Management
router.get('/orders', getOrders);
router.patch('/orders/:id/assign', assignOrderPartner);
router.patch('/orders/:id/status', updateOrderStatus);
router.post('/orders/:id/refund', refundOrder);
router.delete('/orders/purge-all', purgeOrdersAndDeliveryData);

// 5. Products Catalog
router.get('/products', getAdminProducts);
router.post('/products', createProduct);
router.patch('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// 6. Categories
router.get('/categories', getAdminCategories);
router.post('/categories', createCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// 7. Coupons
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.patch('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// 8. Banners
router.get('/banners', getBanners);
router.post('/banners', createBanner);
router.patch('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);

// 9. Audit Logs
router.get('/audit-logs', getAuditLogs);

// 10. CSV Report Exports
router.get('/export/csv', exportCsvReport);

export default router;

