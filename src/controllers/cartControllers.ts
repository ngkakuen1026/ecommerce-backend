import pool from "../db/db"
import { Request, Response } from 'express';

const calculateDiscountedPrice = (price: number, discount: number): number => {
    return parseFloat((price - (price * (discount / 100))).toFixed(2));
};

const getCart = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    try {
        const cartItems = await pool.query(
            `SELECT
                carts.id,
                carts.product_id,
                carts.quantity,
                products.title,
                products.price,
                products.discount,
                (products.price - (products.price * products.discount / 100)) AS discounted_price,
                pi.image_url
            FROM carts
            JOIN products ON carts.product_id = products.id
            LEFT JOIN LATERAL (
                SELECT image_url
                FROM product_images
                WHERE product_id = products.id
                ORDER BY id ASC
                LIMIT 1
            ) pi ON true
            WHERE carts.user_id = $1`,
            [userId]
        );

        if (cartItems.rows.length === 0) {
            res.status(200).json({ message: 'Carts is empty.' });
            return;
        }
        res.status(200).json({
            userId,
            cart: cartItems.rows.map(item => ({
                ...item,
                discountedPrice: calculateDiscountedPrice(item.price, item.discount),
            }))
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
}

const addProductToCart = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { productId, quantity } = req.body;

    if (!productId) {
        res.status(400).json({ message: 'Product ID is required.' });
        return;
    }

    if (quantity <= 0) {
        res.status(400).json({ message: 'Quantity must be greater than zero.' });
        return;
    }

    try {
        const current = await pool.query(
            "SELECT * FROM carts WHERE user_id = $1 AND product_id = $2",
            [userId, productId]
        );

        if (current.rows.length > 0) {
            res.status(400).json({ message: 'Product already exists in the cart.' });
            return;
        }

        const productResult = await pool.query(
            "SELECT price, discount FROM products WHERE id = $1",
            [productId]
        );

        if (productResult.rows.length === 0) {
            res.status(404).json({ message: 'Product not found.' });
            return;
        }

        const product = productResult.rows[0];
        const priceAtTimeOfAddition = product.price;
        const discount = product.discount;

        const result = await pool.query(
            "INSERT INTO carts (user_id, product_id, quantity, price_at_time_of_addition, discount) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [userId, productId, quantity, priceAtTimeOfAddition, discount]
        );
        res.status(201).json({ message: 'Cart created successfully.', cart: result.rows[0] });
    } catch (error) {
        console.error('Error adding product to cart:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

const removeFromCart = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const productId = parseInt(req.params.productId);

    if (!productId) {
        res.status(400).json({ message: 'Product ID is required.' });
        return;
    }

    try {
        const result = await pool.query(
            "DELETE FROM carts WHERE user_id = $1 AND product_id = $2",
            [userId, productId]
        )


        if (result.rowCount === 0) {
            res.status(404).json({ message: 'Product not found in cart.' });
            return;
        }

        res.status(200).json({ message: 'Product removed from cart successfully.' });
    } catch (error) {
        console.error('Error removing product from wishlist:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
}

export { getCart, addProductToCart, removeFromCart };