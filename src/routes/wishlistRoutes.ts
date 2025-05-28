import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createWishlist, getWishlist, removeFromWishlist } from '../controllers/wishlistControllers';

const router = express.Router();

router.get("/me", isAuthenticated, getWishlist);
router.post("/create", isAuthenticated, createWishlist);
router.delete("/delete/:productId", isAuthenticated, removeFromWishlist);

export default router;