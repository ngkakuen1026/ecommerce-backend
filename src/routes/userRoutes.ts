import express from 'express';
import { getAllUser, getUserProfile, updateUserPassword, updateUserProfile } from '../controllers/userControllers';
import { isAuthenticated } from '../middleware/auth';
import { isAdmin } from '../middleware/isAdmin';

const router = express.Router();

router.get("/get-all", isAuthenticated, isAdmin, getAllUser);
router.get("/my-profile", isAuthenticated, getUserProfile);
router.put("/update-profile", isAuthenticated, updateUserProfile);
router.put("/update-password", isAuthenticated, updateUserPassword); 

export default router;