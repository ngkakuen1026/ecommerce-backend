import pool from "../db/db"
import { Request, Response } from 'express';

//Get all reviews for specific user (public)
const getUserReviews = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);

    try {
        const current = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);

        if (current.rows.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const result = await pool.query(
            "SELECT * FROM user_reviews WHERE reviewer_id = $1 ORDER BY created_at DESC",
            [userId]
        );

        res.status(200).json({ userId, reviews: result.rows });

    } catch (error) {
        console.error("Error fetching user reviews:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

const postUserReview = async (req: Request, res: Response) => {
    const reviewerId = req.user!.id; //The one who is posting the review
    const reviewedUserId = parseInt(req.params.userId); //The user being reviewed

    const { rating, comment } = req.body;

    if (!rating || !comment) {
        res.status(400).json({ message: "Rating and comment are required" });
        return;
    }

    try {
        const current = await pool.query("SELECT id FROM users WHERE id = $1", [reviewedUserId]);

        if (current.rows.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const result = await pool.query(
            "INSERT INTO user_reviews (reviewer_id, reviewed_user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *",
            [reviewerId, reviewedUserId, rating, comment]
        );

        res.status(201).json({
            message: `User ${reviewerId} successfully reviewed user ${reviewedUserId}`,
            review: result.rows[0]
        });

    } catch (error) {
        console.error("Error posting user review:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Delete a user review (only the reviewer can delete their own review)
const deleteUserReview = async (req: Request, res: Response) => {
    const reviewerId = req.user!.id; //The one who is deleting the review
    const reviewId = parseInt(req.params.reviewId); //The review being deleted

    try {
        const current = await pool.query("SELECT * FROM user_reviews WHERE id = $1 AND reviewer_id = $2", [reviewId, reviewerId]);

        if (current.rows.length === 0) {
            res.status(404).json({ message: "Review not found or you are not authorized to delete this review" });
            return;
        }

        await pool.query("DELETE FROM user_reviews WHERE id = $1", [reviewId]);

        res.status(200).json({ message: "Review deleted successfully" });

    } catch (error) {
        console.error("Error deleting user review:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export { getUserReviews, postUserReview, deleteUserReview}; 