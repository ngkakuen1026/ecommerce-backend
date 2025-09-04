import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createWishlist, getUserWishList, getWishlist, removeFromWishlist } from '../controllers/wishlistControllers';
import { isAdmin } from '../middleware/isAdmin';

const router = express.Router();

router.get("/me", isAuthenticated, getWishlist);
router.post("/create", isAuthenticated, createWishlist);
router.delete("/delete/:productId", isAuthenticated, removeFromWishlist);

router.get("/admin/:userId/wishlist", isAuthenticated, isAdmin, getUserWishList);

export default router;