import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createOrder, getMyOrders, getOrderDetailById, getAllOrderLength, getOrderList, getOrdersAsSeller, getSellerOrderDetails, updateOrderStatus } from '../controllers/orderControllers';
import { isAdmin } from '../middleware/isAdmin';

const router = express.Router();

router.get("/order-length", getAllOrderLength);
router.get("/me", isAuthenticated, getMyOrders);
router.get("/:orderId", isAuthenticated, getOrderDetailById);
router.get("/seller/me", isAuthenticated, getOrdersAsSeller);
router.get("/seller/:orderId", isAuthenticated, getSellerOrderDetails);
router.get("/admin/:userId/orders", isAuthenticated, isAdmin, getOrderList);
router.post("/create", isAuthenticated, createOrder);
router.patch("/:orderId", isAuthenticated, updateOrderStatus);


export default router;