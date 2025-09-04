import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { addProductToCart, getCart, removeFromCart } from '../controllers/cartControllers';

const router = express.Router();

router.get("/me", isAuthenticated, getCart);
router.post("/create", isAuthenticated, addProductToCart);
router.delete("/delete/:productId", isAuthenticated, removeFromCart);

export default router;