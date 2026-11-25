import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.model.js';

// Central Crave Hub Coordinates [Longitude, Latitude]
// Pizza 65 & Crave Hub: Imli Ke Pass, Main Road, Chirgaon, Jhansi, UP (Pincode: 284301)
const STORE_HUB_COORDINATES = [78.8228, 25.5746];
const MAX_DELIVERY_RADIUS_KM = 20.0;

// Haversine formula to compute distance in KM
const calculateHaversineDistanceKm = (coord1, coord2) => {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

/**
 * @desc   Get saved addresses for logged-in user
 * @route  GET /api/users/addresses
 * @access Private
 */
export const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('addresses');
  return res.status(200).json(new ApiResponse(200, user.addresses || [], 'Addresses retrieved'));
});

/**
 * @desc   Add new address to address book
 * @route  POST /api/users/addresses
 * @access Private
 */
export const addAddress = asyncHandler(async (req, res) => {
  const {
    label,
    recipientName,
    houseFloor,
    apartmentArea,
    street,
    city,
    state,
    pincode,
    landmark,
    phone,
    alternatePhone,
    deliveryInstructions,
    coordinates,
    isDefault,
  } = req.body;

  if (!street || !city || !state || !pincode) {
    throw new ApiError(400, 'Street, city, state, and pincode are required');
  }

  const user = await User.findById(req.user._id);

  // If user has no addresses yet or requested as default, make it default
  const makeDefault = isDefault || user.addresses.length === 0;

  if (makeDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  // Ensure coordinates array [lng, lat]
  const validCoords =
    Array.isArray(coordinates) && coordinates.length === 2
      ? [parseFloat(coordinates[0]), parseFloat(coordinates[1])]
      : [78.8228, 25.5746]; // default Chirgaon, Jhansi hub coords

  const newAddress = {
    label: label || 'Home',
    recipientName: recipientName || user.name || '',
    houseFloor: houseFloor || '',
    apartmentArea: apartmentArea || '',
    street,
    city,
    state,
    pincode,
    landmark: landmark || '',
    phone: phone || user.phone || '',
    alternatePhone: alternatePhone || '',
    deliveryInstructions: deliveryInstructions || '',
    coordinates: {
      type: 'Point',
      coordinates: validCoords,
    },
    isDefault: makeDefault,
  };

  user.addresses.push(newAddress);
  await user.save();

  return res
    .status(201)
    .json(new ApiResponse(201, user.addresses, 'Address added to your address book'));
});

/**
 * @desc   Update an existing address in address book
 * @route  PUT /api/users/addresses/:addressId
 * @access Private
 */
export const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const {
    label,
    recipientName,
    houseFloor,
    apartmentArea,
    street,
    city,
    state,
    pincode,
    landmark,
    phone,
    alternatePhone,
    deliveryInstructions,
    coordinates,
    isDefault,
  } = req.body;

  if (!street || !city || !state || !pincode) {
    throw new ApiError(400, 'Street, city, state, and pincode are required');
  }

  const user = await User.findById(req.user._id);
  const existing = user.addresses.id(addressId);
  if (!existing) {
    throw new ApiError(404, 'Address not found');
  }

  if (isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
    existing.isDefault = true;
  }

  existing.label = label || existing.label || 'Home';
  existing.recipientName = recipientName ?? existing.recipientName ?? user.name ?? '';
  existing.houseFloor = houseFloor ?? '';
  existing.apartmentArea = apartmentArea ?? '';
  existing.street = street;
  existing.city = city;
  existing.state = state;
  existing.pincode = pincode;
  existing.landmark = landmark ?? '';
  existing.phone = phone ?? existing.phone ?? user.phone ?? '';
  existing.alternatePhone = alternatePhone ?? '';
  existing.deliveryInstructions = deliveryInstructions ?? '';

  if (Array.isArray(coordinates) && coordinates.length === 2) {
    existing.coordinates = {
      type: 'Point',
      coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])],
    };
  }

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user.addresses, 'Address updated successfully'));
});

/**
 * @desc   Delete address from address book
 * @route  DELETE /api/users/addresses/:addressId
 * @access Private
 */
export const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findById(req.user._id);
  user.addresses = user.addresses.filter((addr) => addr._id.toString() !== addressId);

  // If we deleted the default address, promote the first remaining one
  if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  return res.status(200).json(new ApiResponse(200, user.addresses, 'Address deleted'));
});

/**
 * @desc   Check if coordinates are within delivery zone and calculate delivery metrics
 * @route  POST /api/users/check-delivery-radius
 * @access Public / Private
 */
export const checkDeliveryRadius = asyncHandler(async (req, res) => {
  const { coordinates } = req.body;

  if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
    throw new ApiError(400, 'Valid GeoJSON coordinates [longitude, latitude] are required');
  }

  const distanceKm = calculateHaversineDistanceKm(STORE_HUB_COORDINATES, coordinates);
  const isDeliverable = distanceKm <= MAX_DELIVERY_RADIUS_KM;

  const estimatedMinutes = Math.min(45, Math.max(15, 15 + Math.round(distanceKm * 2.5)));
  // Delivery Fee Rule: 1km Free Delivery (₹0), beyond 1km ₹20 delivery charge, nothing else charged
  const deliveryFee = distanceKm <= 1.0 ? 0 : 20;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        deliverable: isDeliverable,
        distanceKm,
        deliveryFee,
        maxRadiusKm: MAX_DELIVERY_RADIUS_KM,
        estimatedMinutes,
        hubCoordinates: STORE_HUB_COORDINATES,
        destinationCoordinates: coordinates,
      },
      isDeliverable
        ? distanceKm <= 1.0
          ? `Great news! You are within 1 km (${distanceKm} km) — enjoy FREE Delivery!`
          : `Address is ${distanceKm} km away — Flat ₹20 Delivery Charge applies.`
        : `Sorry, this address is ${distanceKm}km away, which exceeds our ${MAX_DELIVERY_RADIUS_KM}km delivery zone.`
    )
  );
});
