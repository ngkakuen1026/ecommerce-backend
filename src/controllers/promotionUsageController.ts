import pool from "../db/db"
import { Request, Response } from 'express';

const getPromotionUsage = async (req: Request, res: Response) => {
    const promoCodeId = req.params.id;

    try {
        const result = await pool.query(`
      SELECT 
        promo_code_usage.id AS usage_id,
        promo_code_usage.used_at AS used_at,
        promo_code_usage.discount_applied AS discount_applied,
        users.username AS user_username,
        orders.id AS order_id
      FROM 
        promo_code_usage
      LEFT JOIN 
        users ON promo_code_usage.user_id = users.id
      LEFT JOIN 
        orders ON promo_code_usage.order_id = orders.id
      WHERE 
        promo_code_usage.promo_code_id = $1
      ORDER BY 
        promo_code_usage.used_at DESC
    `, [promoCodeId]);

        res.json({ usage: result.rows });
    } catch (error) {
        console.error("Error fetching promo code usage:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


export { getPromotionUsage };