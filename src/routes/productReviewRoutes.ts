import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { deleteProductReview, getProductReviews, postProductReview } from '../controllers/productReviewControllers';

const router = express.Router();

router.get("/:productId/reviews", getProductReviews);
router.post("/:productId/create", isAuthenticated, postProductReview);
router.delete("/:reviewId/delete", isAuthenticated, deleteProductReview); 

export default router;