import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createOrder, getMyOrders, getOrderById } from '../controllers/orderControllers';

const router = express.Router();

router.get("/me", isAuthenticated, getMyOrders);
router.get("/:orderId", isAuthenticated, getOrderById);
router.post("/create", isAuthenticated, createOrder);

export default router;