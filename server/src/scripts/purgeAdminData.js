import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import {
  Order,
  Payment,
  Review,
  Notification,
  Cart,
  DeliveryPartnerProfile,
  AuditLog,
} from '../models/index.js';

async function purgeAdminData() {
  try {
    console.info('[PURGE] Connecting to MongoDB...');
    await mongoose.connect(ENV.MONGO_URI);
    console.info('[PURGE] Connected to MongoDB database:', mongoose.connection.name);

    // 1. Report Initial Counts
    const [
      initialOrders,
      initialPayments,
      initialReviews,
      initialNotifications,
      initialCarts,
      initialPartners,
    ] = await Promise.all([
      Order.countDocuments(),
      Payment.countDocuments(),
      Review.countDocuments(),
      Notification.countDocuments(),
      Cart.countDocuments(),
      DeliveryPartnerProfile.countDocuments(),
    ]);

    console.info('[PURGE] Initial Counts Before Wipe:');
    console.info(`  - Orders: ${initialOrders}`);
    console.info(`  - Payments: ${initialPayments}`);
    console.info(`  - Reviews: ${initialReviews}`);
    console.info(`  - Notifications: ${initialNotifications}`);
    console.info(`  - Carts: ${initialCarts}`);
    console.info(`  - Delivery Partners: ${initialPartners}`);

    // 2. Delete All Orders, Payments, Reviews, Notifications, and Carts
    console.info('[PURGE] Deleting all orders...');
    const orderDeleteResult = await Order.deleteMany({});
    console.info(`  ✓ Deleted ${orderDeleteResult.deletedCount} orders.`);

    console.info('[PURGE] Deleting all payments...');
    const paymentDeleteResult = await Payment.deleteMany({});
    console.info(`  ✓ Deleted ${paymentDeleteResult.deletedCount} payments.`);

    console.info('[PURGE] Deleting all customer reviews...');
    const reviewDeleteResult = await Review.deleteMany({});
    console.info(`  ✓ Deleted ${reviewDeleteResult.deletedCount} reviews.`);

    console.info('[PURGE] Deleting all order notifications...');
    const notificationDeleteResult = await Notification.deleteMany({});
    console.info(`  ✓ Deleted ${notificationDeleteResult.deletedCount} notifications.`);

    console.info('[PURGE] Clearing all active carts...');
    const cartDeleteResult = await Cart.deleteMany({});
    console.info(`  ✓ Deleted ${cartDeleteResult.deletedCount} carts.`);

    console.info('[PURGE] Clearing order audit logs...');
    const auditDeleteResult = await AuditLog.deleteMany({ entity: 'Order' });
    console.info(`  ✓ Deleted ${auditDeleteResult.deletedCount} order audit logs.`);

    // 3. Reset All Delivery Partner Profiles to Blank State (0 deliveries, 0 earnings, no active order)
    console.info('[PURGE] Resetting delivery fleet data to fresh clean state...');
    const partnerUpdateResult = await DeliveryPartnerProfile.updateMany(
      {},
      {
        $set: {
          activeOrder: null,
          isAvailable: true,
          'earnings.today': 0,
          'earnings.thisWeek': 0,
          'earnings.total': 0,
          'earnings.deliveriesCompleted': 0,
          'rating.average': 5.0,
          'rating.count': 0,
        },
      }
    );
    console.info(`  ✓ Reset ${partnerUpdateResult.modifiedCount} delivery partner profiles.`);

    // 4. Verify Final Empty Counts
    const [finalOrders, finalPayments, activeDeliveriesCount] = await Promise.all([
      Order.countDocuments(),
      Payment.countDocuments(),
      DeliveryPartnerProfile.countDocuments({ activeOrder: { $ne: null } }),
    ]);

    console.info('====================================================');
    console.info('  ADMIN & DELIVERY DATA PURGED SUCCESSFULLY!        ');
    console.info('====================================================');
    console.info(`  Orders Remaining:           ${finalOrders}`);
    console.info(`  Payments Remaining:         ${finalPayments}`);
    console.info(`  Active Deliveries Assigned: ${activeDeliveriesCount}`);
    console.info('  Admin Dashboard will now display blank from scratch.');
    console.info('  Any new order placed will assign fresh live data.');
    console.info('====================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('[PURGE] Error purging admin data:', err);
    process.exit(1);
  }
}

purgeAdminData();
