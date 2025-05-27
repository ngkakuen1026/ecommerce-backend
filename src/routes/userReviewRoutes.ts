import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { deleteUserReview, getUserReviews, postUserReview } from '../controllers/userReviewControllers';

const router = express.Router();

router.get("/:userId/reviews", getUserReviews);
router.post("/:userId/create", isAuthenticated, postUserReview);
router.delete("/:reviewId/delete", isAuthenticated, deleteUserReview);

export default router;