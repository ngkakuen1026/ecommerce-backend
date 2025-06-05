import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createOrder, getMyOrders, getOrderDetailById, getOrdersAsSeller, getSellerOrderDetails, updateOrderStatus } from '../controllers/orderControllers';

const router = express.Router();

router.get("/me", isAuthenticated, getMyOrders);
router.get("/:orderId", isAuthenticated, getOrderDetailById);
router.get("/seller/me", isAuthenticated, getOrdersAsSeller);
router.get("/seller/:orderId", isAuthenticated, getSellerOrderDetails)
router.post("/create", isAuthenticated, createOrder);
router.patch("/:orderId", isAuthenticated, updateOrderStatus);

export default router;