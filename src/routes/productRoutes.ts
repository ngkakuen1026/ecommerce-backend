import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createProduct, deleteProduct, deleteProductImage, deleteUserProduct, deleteUserProductImage, getAllProducts, getAllProductsByCategoryId, getProductById, getProductByUsername, getUserProductById, getUserProducts, searchProducts, searchUserProducts, updateProduct, updateUserProduct, uploadProductImages, uploadUserProductImage } from '../controllers/productControllers';
import { deleteProductReview, getProductReviews, postProductReview } from '../controllers/productReviewControllers';
import upload from '../middleware/multer';
import { isAdmin } from '../middleware/isAdmin';

const router = express.Router();


// Product Routes (admin)
router.get("/admin/all-products", isAuthenticated, isAdmin, getAllProducts);
router.get("/admin/all-products/search", isAuthenticated, isAdmin, searchProducts)
router.get("/admin/all-products/product/:id", isAuthenticated, isAdmin, getUserProductById);
router.post("/admin/:id/:images", isAuthenticated, upload.array("images", 10), uploadUserProductImage);
router.patch("/admin/:id/update", isAuthenticated, isAdmin, updateUserProduct);
router.delete("/admin/:id/delete", isAuthenticated, isAdmin, deleteUserProduct);
router.delete("/admin/:id/images/:imageId", isAuthenticated, isAdmin, deleteUserProductImage);

// Product Routes
router.get("/", getAllProducts);
router.get("/category/:id", getAllProductsByCategoryId);
router.get('/:username/products', getProductByUsername);
router.get("/me", isAuthenticated, getUserProducts);
router.get("/search", searchProducts);
router.get("/me/search", isAuthenticated, searchUserProducts);
router.get("/:id", getProductById);
router.post("/create", isAuthenticated, createProduct);
router.post("/:id/images", isAuthenticated, upload.array("images", 10), uploadProductImages);
router.patch("/:id/update", isAuthenticated, updateProduct);
router.delete("/:id/images/:imageId", isAuthenticated, deleteProductImage);
router.delete("/:id/delete", isAuthenticated, deleteProduct);

// Product Reviews Routes
router.get("/:productId/reviews", getProductReviews);
router.post("/:productId/reviews/create", isAuthenticated, postProductReview);
router.delete("/reviews/:reviewId/delete", isAuthenticated, deleteProductReview);

export default router;