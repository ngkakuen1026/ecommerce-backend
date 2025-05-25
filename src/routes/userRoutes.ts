import express from 'express';
import { getAllUser, getUserProfile, updateUserPassword, updateUserProfile, uploadUserImage } from '../controllers/userControllers';
import { isAuthenticated } from '../middleware/auth';
import { isAdmin } from '../middleware/isAdmin';
import upload from '../middleware/multer';

const router = express.Router();

router.get("/get-all", isAuthenticated, isAdmin, getAllUser);
router.get("/my-profile", isAuthenticated, getUserProfile);
router.put("/update-profile", isAuthenticated, updateUserProfile);
router.put("/update-password", isAuthenticated, updateUserPassword); 
router.post("/profile-image", isAuthenticated, upload.single("profile_image"), uploadUserImage);

export default router;