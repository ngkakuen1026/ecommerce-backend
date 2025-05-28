import pool from "../db/db"
import { Request, Response } from 'express';

const getWishlist = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    try {
        const wishlistItems = await pool.query(
            `SELECT wishlists.id, wishlists.product_id, products.title, products.price, products.image_url 
            FROM wishlists
            JOIN products ON wishlists.product_id = products.id
            WHERE wishlists.user_id = $1`,
            [userId]
        );

        if (wishlistItems.rows.length === 0) {
            res.status(404).json({ message: 'Wishlist is empty.' });
            return;
        }
        console.log(`Fetched wishlist for user ${userId}`);
        console.log(wishlistItems.rows);
        res.status(200).json({
            userId,
            wishlist: wishlistItems.rows
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
}

const createWishlist = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { productId } = req.body;

    if (!productId) {
        res.status(400).json({ message: 'Product ID is required.' });
        return;
    }

    try {
        const current = await pool.query(
            "SELECT * FROM wishlists WHERE user_id = $1 AND product_id = $2",
            [userId, productId]
        );

        if (current.rows.length > 0) {
            res.status(400).json({ message: 'Product already exists in the wishlist.' });
            return;
        }

        const result = await pool.query(
            "INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2)",
            [userId, productId]
        );

        console.log(`Wishlist created successfully for user ${userId} with product ${productId}`);
        res.status(201).json({ message: 'Wishlist created successfully.' });
    } catch (error) {
        console.error('Error creating wishlist:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
}

// Remove a product from the wishlist
const removeFromWishlist = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const productId = parseInt(req.params.productId);

    if (!productId) {
        res.status(400).json({ message: 'Product ID is required.' });
        return;
    }

    try {
        const result = await pool.query(
            "DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2",
            [userId, productId]
        );

        if (result.rowCount === 0) {
            res.status(404).json({ message: 'Product not found in wishlist.' });
            return;
        }

        console.log(`Product ${productId} removed from wishlist for user ${userId}`);
        res.status(200).json({ message: 'Product removed from wishlist successfully.' });
    } catch (error) {
        console.error('Error removing product from wishlist:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
}

export { getWishlist, createWishlist, removeFromWishlist };