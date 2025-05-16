import express from 'express';
import { getAllUser } from '../controllers/userControllers';
import { isAuthenticated  } from '../middleware/auth';

const router = express.Router();

router.get("/", isAuthenticated, getAllUser);

export default router;