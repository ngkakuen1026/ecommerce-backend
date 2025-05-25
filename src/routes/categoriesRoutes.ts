import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createCategory, getAllCategories, updateCategory, deleteCategory } from '../controllers/categoriesControllers';
import { isAdmin } from '../middleware/isAdmin';

const router = express.Router();

router.get("/", getAllCategories);
router.post("/add", isAuthenticated, isAdmin, createCategory);
router.put("/:id/update", isAuthenticated, isAdmin, updateCategory);
router.delete("/:id/delete", isAuthenticated, isAdmin, deleteCategory);

export default router;