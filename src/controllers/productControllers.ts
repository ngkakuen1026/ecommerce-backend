import pool from "../db/db"
import { Request, Response } from 'express';
import cloudinary from "../config/cloudinary";
import fs from "fs";

// Get all products (public)
const getAllProducts = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
      SELECT DISTINCT ON (products.id)
        products.id,
        products.user_id,
        products.category_id,
        products.title,
        products.description,
        products.price,
        products.quantity,
        products.status,
        products.created_at,
        product_images.image_url
      FROM products
      LEFT JOIN product_images
        ON product_images.product_id = products.id
      ORDER BY products.id, product_images.id ASC
    `);
        res.status(200).json({ products: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const getAllProductsByCategoryId = async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id);
    try {
        const result = await pool.query(`
        SELECT DISTINCT ON (products.id)
            products.id,
            products.user_id,
            products.category_id,
            products.title,
            products.description,
            products.price,
            products.quantity,
            products.status,
            products.created_at,
            product_images.image_url
        FROM products
        LEFT JOIN product_images
            ON product_images.product_id = products.id
        WHERE products.category_id = $1
        ORDER BY products.id, product_images.id ASC
    `, [categoryId])
        res.status(200).json({ products: result.rows });
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

        const product = result.rows[0];

        const imageResult = await pool.query(
            "SELECT id, image_url FROM product_images WHERE product_id = $1",
            [productId]
        );

        product.images = imageResult.rows;

        res.status(200).json({ product: product });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

//Create a new product (registered user)
const createProduct = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { title, categoryId, description, price, quantity, status } = req.body;

    try {
        const result = await pool.query(
            "INSERT INTO products (user_id, category_id, title, description, price, quantity, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [userId, categoryId, title, description, price, quantity, status]
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
            quantity = product.quantity,
            status = product.status
        } = req.body;

        const result = await pool.query(
            "UPDATE products SET title = $1, category_id = $2, description = $3, price = $4, quantity = $5, status = $6 WHERE id = $7 AND user_id = $8 RETURNING *",
            [title, category_id, description, price, quantity, status, productId, userId]
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

//Upload product image with cloudinary (registered user)
const uploadProductImages = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const productId = parseInt(req.params.id);
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
        res.status(400).json({ message: "No images uploaded" });
        return;
    }

    try {
        const current = await pool.query(
            "SELECT * FROM products WHERE id = $1 AND user_id = $2",
            [productId, userId]
        );

        if (current.rows.length === 0) {
            files.forEach(file => fs.unlinkSync(file.path));
            res.status(403).json({ message: "Unauthorized to update this product" });
            return;
        }

        const uploadedImages = [];

        for (const file of files) {
            const result = await cloudinary.uploader.upload(file.path, {
                folder: "product_images",
            });

            fs.unlinkSync(file.path);

            const insertQuery = await pool.query(
                "INSERT INTO product_images (product_id, image_url) VALUES ($1, $2) RETURNING *",
                [productId, result.secure_url]
            );

            uploadedImages.push(insertQuery.rows[0]);
        }

        res.status(201).json({
            message: "Images uploaded successfully",
            images: uploadedImages
        });

    } catch (error) {
        console.error("Upload error:", error);

        if (files) {
            files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }

        res.status(500).json({ message: "Internal Server Error" });
    }
};

export { getAllProducts, getAllProductsByCategoryId, getUserProducts, getProductById, createProduct, updateProduct, deleteProduct, searchProducts, uploadProductImages };