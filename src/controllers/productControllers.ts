import pool from "../db/db";
import { Request, Response } from 'express';
import cloudinary from "../config/cloudinary";
import fs from "fs";
import { extractPublicId } from "../utils/extractCloudinaryUrl";

const calculateDiscountedPrice = (price: number, discount: number): number => {
    return parseFloat((price - (price * (discount / 100))).toFixed(2));
};

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
            products.discount,
            product_images.image_url,
            users.username,
            users.profile_image,
            users.registration_date as users_registration_date
            FROM products
            LEFT JOIN product_images ON product_images.product_id = products.id
            LEFT JOIN users ON users.id = products.user_id
            ORDER BY products.id, product_images.id ASC
        `);
        const products = result.rows.map((row) => ({
            id: row.id,
            user_id: row.user_id,
            category_id: row.category_id,
            title: row.title,
            description: row.description,
            price: row.price,
            discount: row.discount,
            discountedPrice: calculateDiscountedPrice(row.price, row.discount),
            quantity: row.quantity,
            status: row.status,
            created_at: row.created_at,
            image_url: row.image_url,
            user: {
                username: row.username,
                profile_image: row.profile_image,
            },
        }));

        res.status(200).json({ products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Get all products in a specific category
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
            products.discount,
            product_images.image_url,
            users.username,
            users.profile_image
            FROM products
            LEFT JOIN product_images ON product_images.product_id = products.id
            LEFT JOIN users ON users.id = products.user_id
            WHERE products.category_id = $1
            ORDER BY products.id, product_images.id ASC
        `, [categoryId]);

        const products = result.rows.map((row) => ({
            id: row.id,
            user_id: row.user_id,
            category_id: row.category_id,
            title: row.title,
            description: row.description,
            price: row.price,
            discount: row.discount,
            discountedPrice: calculateDiscountedPrice(row.price, row.discount),
            quantity: row.quantity,
            status: row.status,
            created_at: row.created_at,
            image_url: row.image_url,
            user: {
                username: row.username,
                profile_image: row.profile_image,
            },
        }));

        res.status(200).json({ products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Get product by username
const getProductByUsername = async (req: Request, res: Response) => {
    const { username } = req.params;

    try {
        const userResult = await pool.query(
            `SELECT id, username, profile_image, registration_date, bio
             FROM users
             WHERE username ILIKE $1`,
            [username]
        );

        if (userResult.rows.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const user = userResult.rows[0];

        const productResult = await pool.query(
            `SELECT DISTINCT ON (products.id)
            products.id,
            products.user_id,
            products.category_id,
            products.title,
            products.description,
            products.price,
            products.quantity,
            products.status,
            products.created_at,
            products.discount,
            product_images.image_url
            FROM products
            LEFT JOIN product_images ON product_images.product_id = products.id
            WHERE products.user_id = $1
            ORDER BY products.id ASC, product_images.id ASC`,
            [user.id]
        );

        const products = productResult.rows.map((row) => ({
            id: row.id,
            user_id: row.user_id,
            category_id: row.category_id,
            title: row.title,
            description: row.description,
            price: row.price,
            discount: row.discount,
            discountedPrice: calculateDiscountedPrice(row.price, row.discount),
            quantity: row.quantity,
            status: row.status,
            created_at: row.created_at,
            image_url: row.image_url,
            user: {
                username: user.username,
                profile_image: user.profile_image,
                registration_date: user.registration_date,
                bio: user.bio || null,
            },
        }));

        res.status(200).json({
            user: {
                user_id: user.id,
                username: user.username,
                profile_image: user.profile_image,
                registration_date: user.registration_date,
                bio: user.bio || null
            },
            products,
        });
    } catch (error) {
        console.error("Public user profile error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Get user products
const getUserProducts = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    try {
        const result = await pool.query(`
            SELECT 
                products.*,
                pi.image_url
            FROM products
            LEFT JOIN LATERAL (
                SELECT image_url
                FROM product_images
                WHERE product_id = products.id
                ORDER BY id ASC
                LIMIT 1
            ) pi ON true
            WHERE products.user_id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            res.status(404).json({ message: "No products found for this user" });
            return;
        }

        const products = result.rows.map((row) => ({
            id: row.id,
            user_id: row.user_id,
            category_id: row.category_id,
            title: row.title,
            description: row.description,
            price: row.price,
            discount: row.discount,
            discountedPrice: calculateDiscountedPrice(row.price, row.discount),
            quantity: row.quantity,
            status: row.status,
            created_at: row.created_at,
            image_url: row.image_url,
        }));

        res.status(200).json({ products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Get product by ID
const getProductById = async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id);

    try {
        const result = await pool.query(
            `SELECT
                products.*,
                users.username,
                users.profile_image
            FROM products
            LEFT JOIN users ON users.id = products.user_id
            WHERE products.id = $1`,
            [productId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        const {
            username,
            profile_image,
            ...baseProduct
        } = result.rows[0];

        const imageResult = await pool.query(
            "SELECT id, image_url FROM product_images WHERE product_id = $1",
            [productId]
        );

        const product = {
            ...baseProduct,
            images: imageResult.rows,
            user: {
                username,
                profile_image,
            },
            discountedPrice: calculateDiscountedPrice(baseProduct.price, baseProduct.discount),
        };

        res.status(200).json({ product });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Create a new product
const createProduct = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { title, categoryId, description, price, quantity, status, discount } = req.body;

    try {
        const result = await pool.query(
            "INSERT INTO products (user_id, category_id, title, description, price, quantity, status, discount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
            [userId, categoryId, title, description, price, quantity, status, discount]
        );

        const createdProduct = {
            ...result.rows[0],
            discountedPrice: calculateDiscountedPrice(result.rows[0].price, result.rows[0].discount),
        };

        res.status(201).json({ product: createdProduct });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Update product
const updateProduct = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const productId = parseInt(req.params.id);

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
            status = product.status,
            discount = product.discount,
        } = req.body;

        const result = await pool.query(
            "UPDATE products SET title = $1, category_id = $2, description = $3, price = $4, quantity = $5, status = $6, discount = $7 WHERE id = $8 AND user_id = $9 RETURNING *",
            [title, category_id, description, price, quantity, status, discount, productId, userId]
        );

        const updatedProduct = {
            ...result.rows[0],
            discountedPrice: calculateDiscountedPrice(result.rows[0].price, result.rows[0].discount),
        };

        res.status(200).json({ product: updatedProduct });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Delete product
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
};

// Delete a product image
const deleteProductImage = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const productId = parseInt(req.params.id);
    const imageId = parseInt(req.params.imageId);

    try {
        const productResult = await pool.query(
            "SELECT * FROM products WHERE id = $1 AND user_id = $2",
            [productId, userId]
        );
        if (productResult.rows.length === 0) {
            res.status(403).json({ message: "Unauthorized to delete image for this product" });
            return;
        }

        const imageResult = await pool.query(
            "SELECT image_url FROM product_images WHERE id = $1 AND product_id = $2",
            [imageId, productId]
        );
        if (imageResult.rows.length === 0) {
            res.status(404).json({ message: "Image not found" });
            return;
        }

        const publicId = extractPublicId(imageResult.rows[0].image_url);
        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
        }

        // Delete from database
        await pool.query(
            "DELETE FROM product_images WHERE id = $1 AND product_id = $2",
            [imageId, productId]
        );

        res.status(200).json({ message: "Product image deleted successfully" });
    } catch (error) {
        console.error("Delete image error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Search products by title
const searchProducts = async (req: Request, res: Response) => {
    const { query } = req.query;

    if (!query) {
        res.status(400).json({ message: "Search query is required" });
        return;
    }

    try {
        const result = await pool.query(
            `SELECT DISTINCT ON (products.id)
            products.id,
            products.user_id,
            products.category_id,
            products.title,
            products.description,
            products.price,
            products.quantity,
            products.status,
            products.created_at,
            products.discount,
            product_images.image_url,
            users.username,
            users.profile_image
            FROM products
            LEFT JOIN product_images ON product_images.product_id = products.id
            LEFT JOIN users ON users.id = products.user_id
            WHERE products.title ILIKE $1
            ORDER BY products.id ASC, product_images.id ASC`,
            [`%${query}%`]
        );

        const products = result.rows.map((row) => ({
            id: row.id,
            user_id: row.user_id,
            category_id: row.category_id,
            title: row.title,
            description: row.description,
            price: row.price,
            discount: row.discount,
            discountedPrice: calculateDiscountedPrice(row.price, row.discount), 
            quantity: row.quantity,
            status: row.status,
            created_at: row.created_at,
            image_url: row.image_url,
            user: {
                username: row.username,
                profile_image: row.profile_image,
            },
        }));

        res.status(200).json({ products });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Upload product image with Cloudinary
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

export {
    getAllProducts,
    getAllProductsByCategoryId,
    getProductByUsername,
    getUserProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    uploadProductImages,
    deleteProductImage
};