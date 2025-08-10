import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { addProductToCart, getCart } from '../controllers/cartControllers';

const router = express.Router();

router.get("/me", isAuthenticated, getCart);
router.post("/create", isAuthenticated, addProductToCart);

export default router;