import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createProduct, deleteProduct, getAllProducts, getProductById, getUserProducts, searchProducts, updateProduct } from '../controllers/productControllers';

const router = express.Router();

router.get("/", getAllProducts);
router.get("/user-products", isAuthenticated, getUserProducts);
router.get("/search", searchProducts);
router.get("/:id", getProductById);
router.post("/create", isAuthenticated, createProduct);
router.put("/:id/update", isAuthenticated, updateProduct); 
router.delete("/:id/delete", isAuthenticated, deleteProduct);

export default router;