import express from 'express';
import { deleteOwnUser, deleteUser, deleteImage, getAllUser, getSpecificUserById, getUserLength, getUsernameById, getUserProfile, updateUser, updateUserPassword, updateUserProfile, uploadImage, uploadUserImage, deleteUserImage, searchUsername } from '../controllers/userControllers';
import { deleteUserReview, getUserReviews, postUserReview } from '../controllers/userReviewControllers';
import { isAuthenticated } from '../middleware/auth';
import { isAdmin } from '../middleware/isAdmin';
import upload from '../middleware/multer';

const router = express.Router();

// User Routes (admin)
router.get("/admin/all-users", isAuthenticated, isAdmin, getAllUser);
router.get("/admin/all-users/search", isAuthenticated, isAdmin, searchUsername);
router.get("/admin/all-users/user/:id", isAuthenticated, isAdmin, getSpecificUserById);
router.patch("/admin/:id/update", isAuthenticated, isAdmin, updateUser);
router.post("/admin/:id/profile-image", isAuthenticated, isAdmin, upload.single("profile_image"), uploadUserImage);
router.delete("/admin/:id/profile-image", isAuthenticated, isAdmin, deleteUserImage);
router.delete("/admin/:id/delete", isAuthenticated, isAdmin, deleteUser);

//User Routes
router.get("/user-length", getUserLength);
router.get("/me", isAuthenticated, getUserProfile);
router.patch("/me/update", isAuthenticated, updateUserProfile);
router.patch("/me/password/update", isAuthenticated, updateUserPassword);
router.post("/me/profile-image", isAuthenticated, upload.single("profile_image"), uploadImage);
router.get("/:id", getUsernameById);
router.delete("/me/profile-image/delete", isAuthenticated, deleteImage);
router.delete("/me/delete", isAuthenticated, deleteOwnUser);


// User Review Routes
router.get("/:userId/reviews", getUserReviews);
router.post("/:userId/reviews/create", isAuthenticated, postUserReview);
router.delete("/reviews/:reviewId/delete", isAuthenticated, deleteUserReview);

export default router;