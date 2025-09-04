import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createCategory, getAllCategories, updateCategory, deleteCategory, getCategoryById, uploadCategoryImage, searchCategory, deleteCategoryImage } from '../controllers/categoriesControllers';
import { isAdmin } from '../middleware/isAdmin';
import upload from '../middleware/multer';

const router = express.Router();

router.get("/", getAllCategories);
router.get('/:categoryId', getCategoryById);

//Admin Route
router.get("/admin/all-categories/search", isAuthenticated, isAdmin, searchCategory);
router.post("/admin/:categoryId/category-image", isAuthenticated, isAdmin, upload.single("category-image"), uploadCategoryImage);
router.post("/admin/create", isAuthenticated, isAdmin, createCategory);
router.put("/admin/:categoryId/update", isAuthenticated, isAdmin, updateCategory);
router.delete("/admin/:categoryId/category-image", isAuthenticated, isAdmin, deleteCategoryImage);
router.delete("/admin/:categoryId/delete", isAuthenticated, isAdmin, deleteCategory);

export default router;