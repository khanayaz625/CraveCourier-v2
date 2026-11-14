import mongoose from 'mongoose';

const deliveryPartnerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    vehicle: {
      type: {
        type: String,
        enum: ['bike', 'scooter', 'bicycle', 'car', 'van'],
        default: 'bike',
      },
      plateNumber: { type: String, trim: true },
      model: { type: String, trim: true },
    },
    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        default: [0, 0],
      },
    },
    activeOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    earnings: {
      today: { type: Number, default: 0, min: 0 },
      thisWeek: { type: Number, default: 0, min: 0 },
      total: { type: Number, default: 0, min: 0 },
      deliveriesCompleted: { type: Number, default: 0, min: 0 },
    },
    rating: {
      average: { type: Number, default: 5.0, min: 1, max: 5 },
      count: { type: Number, default: 0 },
    },
    documents: {
      licenseNumber: { type: String, trim: true },
      licenseUrl: { type: String, default: null },
      idCardUrl: { type: String, default: null },
      verified: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ['approved', 'pending', 'rejected'],
        default: 'approved',
      },
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for real-time geospatial proximity queries
deliveryPartnerProfileSchema.index({ currentLocation: '2dsphere' });
deliveryPartnerProfileSchema.index({ isOnline: 1, isAvailable: 1 });

export const DeliveryPartnerProfile = mongoose.model(
  'DeliveryPartnerProfile',
  deliveryPartnerProfileSchema
);
