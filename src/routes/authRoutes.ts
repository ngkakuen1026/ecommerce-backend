import express from 'express';
import { loginUser, logoutUser, refreshToken, registerUser } from '../controllers/authControllers';

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/token", refreshToken);

export default router;