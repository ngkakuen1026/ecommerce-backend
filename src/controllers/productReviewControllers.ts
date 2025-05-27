import pool from "../db/db"
import { Request, Response } from 'express';

//Get all reviews for a specific product (public)
const getProductReviews = async (req: Request, res: Response) => {
    const productId = parseInt(req.params.productId);

    try {
        const current = await pool.query(
            "SELECT id FROM products WHERE id = $1",
            [productId]
        );

        if (current.rows.length === 0) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        const result = await pool.query(
            "SELECT * FROM product_reviews WHERE product_id = $1 ORDER BY created_at DESC",
            [productId]
        );

        // if (result.rows.length === 0) {
        //     res.status(404).json({ message: "No reviews found for this product" });
        //     return;
        // }

        res.status(200).json({ productId, reviews: result.rows });

    } catch (error) {
        console.error("Error fetching product reviews:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

//Post a new review for a specific product (registered user)
const postProductReview = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const productId = parseInt(req.params.productId);

    const { rating, comment } = req.body;

    if (!rating || !comment) {
        res.status(400).json({ message: "Rating and comment are required" });
        return;
    }

    try {
        const current = await pool.query(
            "SELECT id FROM products WHERE id = $1",
            [productId]
        );

        if (current.rows.length === 0) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        const result = await pool.query(
            "INSERT INTO product_reviews (reviewer_id, product_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *",
            [userId, productId, rating, comment]
        );

        res.status(201).json({ review: result.rows[0] });

    } catch (error) {
        console.error("Error posting product review:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Delete a review (registered user)
const deleteProductReview = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const reviewId = parseInt(req.params.reviewId);

    try {
        const current = await pool.query(
            "SELECT * FROM product_reviews WHERE id = $1 AND reviewer_id = $2",
            [reviewId, userId]
        );

        if (current.rows.length === 0) {
            res.status(404).json({ message: "Review not found or you do not have permission to delete it" });
            return;
        }

        await pool.query(
            "DELETE FROM product_reviews WHERE id = $1",
            [reviewId]
        );

        res.status(200).json({ message: "Review deleted successfully" });
    } catch (error) {
        console.error("Error deleting product review:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}


export { getProductReviews, postProductReview, deleteProductReview };