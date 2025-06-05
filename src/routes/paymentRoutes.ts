import express from 'express';
import { createPaymentIntent } from '../controllers/paymentControllers';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

router.post('/create-payment-intent', isAuthenticated, createPaymentIntent);

export default router;