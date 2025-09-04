import pool from "../db/db"
import { Request, Response } from 'express';

const getAllPromotions = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM promotions');
        res.status(200).json({ promotions: result.rows });
    } catch (error) {
        console.error("Error fetching promotions:", error);
        res.status(500).json({ error: 'Failed to fetch promotions.' });
    }
}

const getPromotionsByCode = async (req: Request, res: Response) => {
    const { code } = req.params;

    try {
        const result = await pool.query('SELECT * FROM promotions WHERE code = $1', [code]);

        if (result.rows.length === 0) {
            res.status(200).json({ error: 'Promotion not found.' });
            return;
        }

        res.status(200).json({ promotion: result.rows[0] });
    } catch (error) {
        console.error("Error fetching promotion:", error);
        res.status(500).json({ error: 'Failed to fetch promotion.' });
    }
};

const createPromotion = async (req: Request, res: Response) => {
    const { code, discount_type, discount_value, start_date, end_date, usage_limit, min_order_value, user_limit } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO promotions (code, discount_type, discount_value, start_date, end_date, usage_limit, min_order_value, user_limit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [code, discount_type, discount_value, start_date, end_date, usage_limit, min_order_value, user_limit]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error creating promotion:", error);
        res.status(500).json({ error: 'Failed to create promotion.' });
    }
}

const getPromotionsById = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM promotions WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            res.status(200).json({ error: 'Promotion not found.' });
            return;
        }

        res.status(200).json({ promotion: result.rows[0] });
    } catch (error) {
        console.error("Error fetching promotion:", error);
        res.status(500).json({ error: 'Failed to fetch promotion.' });
    }
};

const updatePromotion = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const current = await pool.query("SELECT * FROM promotions WHERE id = $1", [id]);
        if (current.rows.length === 0) {
            res.status(404).json({ message: "Promotion not found" });
            return;
        }
        const promotion = current.rows[0];

        const {
            code = promotion.code,
            discount_type = promotion.discount_type,
            discount_value = promotion.discount_value,
            start_date = promotion.start_date,
            end_date = promotion.end_date,
            usage_limit = promotion.usage_limit,
            min_order_value = promotion.min_order_value,
            user_limit = promotion.user_limit,
            updated_at = promotion.updated_at
        } = req.body;

        const result = await pool.query(`UPDATE promotions SET discount_type = $1, discount_value = $2, start_date = $3, end_date = $4, 
       usage_limit = $5, min_order_value = $6, user_limit = $7, code = $8, updated_at = $9 WHERE id = $10 RETURNING *`, 
       [discount_type, discount_value, start_date, end_date, usage_limit, min_order_value, user_limit, code, updated_at, id])
        const updatedPromotion = {
            ...result.rows[0],
        };

        res.status(200).json({ promotion: updatedPromotion });
    } catch (error) {
        console.error("Error creating promotion:", error);
        res.status(500).json({ error: 'Failed to update promotion.' });
    }
}

const deletePromotion = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const result = await pool.query("DELETE FROM promotions WHERE id = $1 RETURNING *", [id]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Promotion not found.' });
            return;
        }
        res.status(200).json({ message: "Promotion deleted successfully" });
    } catch (error) {
        console.error("Error deleting promotion: ", error);
        res.status(500).json({ error: "Failed to delete promotion." })
    }
}

const searchPromotions = async (req: Request, res: Response) => {
    const { query } = req.query;

    if (!query) {
        res.status(400).json({ message: "Search query is required" });
        return;
    }

    try {
        const result = await pool.query(`SELECT * FROM promotions WHERE promotions.code ILIKE $1`, [`%${query}%`]);
        const promotions = result.rows;
        res.status(200).json({ promotions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export { getAllPromotions, getPromotionsByCode, createPromotion, getPromotionsById, updatePromotion, deletePromotion, searchPromotions }; 