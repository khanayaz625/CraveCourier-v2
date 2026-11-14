import mongoose from 'mongoose';
import { ENV } from '../src/config/env.js';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const testDbUri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/crave_test_db';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testDbUri);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    // Drop test database to prevent polluting
    try {
      await mongoose.connection.db.dropDatabase();
    } catch {
      // ignore
    }
    await mongoose.disconnect();
  }
});

