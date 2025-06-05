import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createProduct, deleteProduct, getAllProducts, getProductById, getUserProducts, searchProducts, updateProduct, uploadProductImages } from '../controllers/productControllers';
import { deleteProductReview, getProductReviews, postProductReview } from '../controllers/productReviewControllers';
import upload from '../middleware/multer';

const router = express.Router();

// Product Routes
router.get("/", getAllProducts);
router.get("/me", isAuthenticated, getUserProducts);
router.get("/search", searchProducts);
router.get("/:id", getProductById);
router.post("/create", isAuthenticated, createProduct);
router.post("/:id/images", isAuthenticated, upload.array("images", 10), uploadProductImages);
router.patch("/:id/update", isAuthenticated, updateProduct); 
router.delete("/:id/delete", isAuthenticated, deleteProduct);

// Product Reviews Routes
router.get("/:productId/reviews", getProductReviews);
router.post("/:productId/reviews/create", isAuthenticated, postProductReview);
router.delete("/reviews/:reviewId/delete", isAuthenticated, deleteProductReview);

export default router;