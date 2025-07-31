import pool from "../db/db"
import { Request, Response } from 'express';
import cloudinary from "../config/cloudinary";
import fs from "fs";

const getAllCategories = async (req: Request, res: Response) => {
    try {
        const result = await pool.query("SELECT * FROM categories");
        res.status(200).json({ categories: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

const getCategoryById = async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);

    try {
        const result = await pool.query("SELECT * FROM categories WHERE id = $1", [categoryId]);

        if (result.rows.length === 0) {
            res.status(404).json({ message: "Category not found" });
            return;
        }

        res.status(200).json({ category: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const createCategory = async (req: Request, res: Response) => {
    const { name } = req.body;

    try {
        const existingCategory = await pool.query("SELECT * FROM categories WHERE name = $1", [name]);
        if (existingCategory.rows.length > 0) {
            res.status(400).json({ message: "Category with this name already exists" });
            return;
        }

        const result = await pool.query(
            "INSERT INTO categories (name) VALUES ($1) RETURNING *",
            [name]
        );
        res.status(201).json({ category: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const uploadCategoryImage = async (req: Request, res: Response) => {
    try {
        const categoryId = req.params.categoryId;

        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        const current = await pool.query("SELECT * FROM categories WHERE id = $1", [categoryId]);

        if (current.rows.length === 0) {
            fs.unlinkSync(req.file.path);

            res.status(404).json({ message: "Category not found" });
            return;
        }

        const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
            folder: "category_images",
            use_filename: true,
            unique_filename: false
        });

        fs.unlinkSync(req.file.path);

        const updateResult = await pool.query(
            "UPDATE categories SET image_url = $1 WHERE id = $2 RETURNING *",
            [cloudinaryResult.secure_url, categoryId]
        );

        res.status(200).json({
            message: "Category's Image uploaded and updated successfully",
            category: updateResult.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

const updateCategory = async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);
    const { name } = req.body;

    try {
        const current = await pool.query("SELECT * FROM categories WHERE id = $1", [categoryId]);
        if (current.rows.length === 0) {
            res.status(404).json({ message: "Category not found" });
            return;
        }

        const result = await pool.query(
            "UPDATE categories SET name = $1 WHERE id = $2 RETURNING *",
            [name, categoryId]
        );


        res.status(200).json({ category: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

const deleteCategory = async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId);

    try {
        const current = await pool.query("SELECT * FROM categories WHERE id = $1", [categoryId]);
        if (current.rows.length === 0) {
            res.status(404).json({ message: "Category not found" });
            return;
        }

        await pool.query("DELETE FROM categories WHERE id = $1", [categoryId]);
        res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}


export { getAllCategories, getCategoryById, createCategory, uploadCategoryImage, updateCategory, deleteCategory };