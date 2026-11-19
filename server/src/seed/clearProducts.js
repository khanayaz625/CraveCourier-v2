import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import { Product } from '../models/Product.model.js';
import { Cart } from '../models/Cart.model.js';

async function clearAllProducts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(ENV.MONGO_URI);
    console.log('Connected to MongoDB successfully.');

    const initialCount = await Product.countDocuments();
    console.log(`Found ${initialCount} existing products.`);

    console.log('Deleting all products...');
    const result = await Product.deleteMany({});
    console.log(`Successfully removed ${result.deletedCount} products from the database.`);

    console.log('Resetting active carts...');
    await Cart.updateMany({}, {
      $set: {
        items: [],
        totals: { itemTotal: 0, deliveryFee: 0, tax: 0, couponDiscount: 0, grandTotal: 0 },
        couponApplied: null,
      },
    });
    console.log('Active carts cleared.');

    const finalCount = await Product.countDocuments();
    console.log(`Current product count in database: ${finalCount}`);

    await mongoose.disconnect();
    console.log('Disconnected cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing products:', err);
    process.exit(1);
  }
}

clearAllProducts();
