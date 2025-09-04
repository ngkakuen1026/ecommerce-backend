import pool from "../db/db"
import { Request, Response } from 'express';

const calculateDiscountedPrice = (price: number, discount: number): number => {
    return parseFloat((price - (price * (discount / 100))).toFixed(2));
};

const getWishlist = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    try {
        const wishlistItems = await pool.query(
            `SELECT 
                wishlists.id, 
                wishlists.product_id, 
                products.title, 
                products.price,
                products.status,
                products.discount,
                pi.image_url
            FROM wishlists
            JOIN products ON wishlists.product_id = products.id
            LEFT JOIN LATERAL (
                SELECT image_url
                FROM product_images
                WHERE product_id = products.id
                ORDER BY id ASC
                LIMIT 1
            ) pi ON true
            WHERE wishlists.user_id = $1`,
            [userId]
        );

        if (wishlistItems.rows.length === 0) {
            res.status(200).json({ message: 'Wishlist is empty.' });
            return;
        }

        const wishlist = wishlistItems.rows.map(item => ({
            id: item.id,
            product_id: item.product_id,
            title: item.title,
            price: item.price,
            discount: item.discount,
            discountedPrice: calculateDiscountedPrice(item.price, item.discount), // Calculate discounted price
            status: item.status,
            image_url: item.image_url,
        }));

        res.status(200).json({
            userId,
            wishlist
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

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

        res.status(200).json({ message: 'Product removed from wishlist successfully.' });
    } catch (error) {
        console.error('Error removing product from wishlist:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
}

const getUserWishList = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);

    try {
        const result = await pool.query(
            `SELECT 
                wishlists.id, 
                wishlists.product_id, 
                products.title, 
                products.price,
                products.status,
                products.discount,
                pi.image_url
            FROM wishlists
            JOIN products ON wishlists.product_id = products.id
            LEFT JOIN LATERAL (
                SELECT image_url
                FROM product_images
                WHERE product_id = products.id
                ORDER BY id ASC
                LIMIT 1
            ) pi ON true
            WHERE wishlists.user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            res.status(200).json({ message: 'Wishlist is empty.', wishlist: [] });
            return;
        }

        const wishlist = result.rows.map(item => ({
            id: item.id,
            product_id: item.product_id,
            title: item.title,
            price: item.price,
            discount: item.discount,
            discountedPrice: calculateDiscountedPrice(item.price, item.discount),
            status: item.status,
            image_url: item.image_url,
        }));

        res.status(200).json({
            userId,
            wishlist
        });
    } catch (error) {
        console.error('Error fetching user wishlist:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
}

export { getWishlist, createWishlist, removeFromWishlist, getUserWishList };