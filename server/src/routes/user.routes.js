import { Router } from 'express';
import {
  getAddresses,
  addAddress,
  deleteAddress,
  checkDeliveryRadius,
} from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

// Public check delivery radius
router.post('/check-delivery-radius', checkDeliveryRadius);

// Protected address book
router.get('/addresses', protect, getAddresses);
router.post('/addresses', protect, addAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);

export default router;
