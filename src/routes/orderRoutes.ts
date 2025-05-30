import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createOrder, getMyOrders, getOrderById, updateOrderStatus } from '../controllers/orderControllers';

const router = express.Router();

router.get("/me", isAuthenticated, getMyOrders);
router.get("/:orderId", isAuthenticated, getOrderById);
router.post("/create", isAuthenticated, createOrder);
router.patch("/:orderId", isAuthenticated, updateOrderStatus);

export default router;