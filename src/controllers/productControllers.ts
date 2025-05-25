import pool from "../db/db"
import { Request, Response } from 'express';

// Get all products (public)
const getAllProducts = async (req: Request, res: Response) => {
    try {
        const result = await pool.query("SELECT * FROM products");
        res.status(200).json({ products: result.rows });
        console.log(result.rows)
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

//Get product list for specific user (registered user)
const getUserProducts = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    try {
        const result = await pool.query("SELECT * FROM products WHERE user_id = $1", [userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ message: "No products found for this user" });
            return;
        }
        res.status(200).json({ products: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

//Get specific product by ID (public)
const getProductById = async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id);

    try {
        const result = await pool.query("SELECT * FROM products WHERE id = $1", [productId]);
        if (result.rows.length === 0) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        res.status(200).json({ product: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

//Create a new product (registered user)
const createProduct = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { title, categoryId, description, price, image_url, quantity, status } = req.body;

    try {
        const result = await pool.query(
            "INSERT INTO products (user_id, category_id, title, description, price, image_url, quantity, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
            [userId, categoryId, title, description, price, image_url, quantity, status]
        );

        res.status(201).json({ product: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}


//Update product (registered user)
const updateProduct = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const productId = parseInt(req.params.id);

    console.log(productId, userId);

    try {
        const current = await pool.query("SELECT * FROM products WHERE id = $1 AND user_id = $2", [productId, userId]);
        if (current.rows.length === 0) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        const product = current.rows[0];

        const {
            title = product.title,
            category_id = product.category_id,
            description = product.description,
            price = product.price,
            image_url = product.image_url,
            quantity = product.quantity,
            status = product.status
        } = req.body;

        const result = await pool.query(
            "UPDATE products SET title = $1, category_id = $2, description = $3, price = $4, image_url = $5, quantity = $6, status = $7 WHERE id = $8 AND user_id = $9 RETURNING *",
            [title, category_id, description, price, image_url, quantity, status, productId, userId]
        );

        res.status(200).json({ product: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

//Delete product (registered user)
const deleteProduct = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const productId = parseInt(req.params.id);

    try {
        const result = await pool.query("DELETE FROM products WHERE id = $1 AND user_id = $2 RETURNING *", [productId, userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ message: "Product not found or you do not have permission to delete this product" });
            return;
        }
        res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

//Search products by title (public)
const searchProducts = async (req: Request, res: Response) => {
    const { query } = req.query;
    
    if (!query) {
        res.status(400).json({ message: "Search query is required" });
        return;
    }

    try {
        const result = await pool.query("SELECT * FROM products WHERE title ILIKE $1", [`%${query}%`]);
        if (result.rows.length === 0) {
            res.status(404).json({ message: "No products found" });
            return;
        }
        res.status(200).json({ products: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export { getAllProducts, getUserProducts, getProductById, createProduct, updateProduct, deleteProduct, searchProducts };