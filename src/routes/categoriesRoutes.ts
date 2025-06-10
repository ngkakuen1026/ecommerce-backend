import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createCategory, getAllCategories, updateCategory, deleteCategory, getCategoryById, uploadCategoryImage } from '../controllers/categoriesControllers';
import { isAdmin } from '../middleware/isAdmin';
import upload from '../middleware/multer';

const router = express.Router();

router.get("/", getAllCategories);
router.get('/:categoryId', getCategoryById);
router.post("/:categoryId/image", isAuthenticated, isAdmin, upload.single("image"), uploadCategoryImage);
router.post("/create", isAuthenticated, isAdmin, createCategory);
router.put("/:categoryId/update", isAuthenticated, isAdmin, updateCategory);
router.delete("/:categoryId/delete", isAuthenticated, isAdmin, deleteCategory);

export default router;