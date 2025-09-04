import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { isAdmin } from '../middleware/isAdmin';
import { createPromotion, deletePromotion, getAllPromotions, getPromotionsByCode, getPromotionsById, searchPromotions, updatePromotion } from '../controllers/promotionController';
import { getPromotionUsage } from '../controllers/promotionUsageController';

const router = express.Router();

//Promocode Routes
router.get("/promotion-all", isAuthenticated, getAllPromotions);
router.get("/promotion/:code", isAuthenticated, getPromotionsByCode);

//Promocode Routes (admin)
router.get("/admin/all-promotions", isAuthenticated, isAdmin, getAllPromotions);
router.get("/admin/all-promotions/search", isAuthenticated, isAdmin, searchPromotions)
router.get("/admin/all-promotions/promotion/:id", isAuthenticated, isAdmin, getPromotionsById)
router.post("/admin/promotion/create", isAuthenticated, isAdmin, createPromotion);
router.patch("/admin/promotion/:id/update", isAuthenticated, isAdmin, updatePromotion);
router.delete("/admin/promotion/:id/delete", isAuthenticated, isAdmin, deletePromotion);

//Promocode Usage Routes (admin)
router.get("/admin/promotion-usage/:id/", isAuthenticated, isAdmin, getPromotionUsage)

export default router;