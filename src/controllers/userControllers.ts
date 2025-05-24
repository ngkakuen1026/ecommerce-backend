import pool from "../db/db"
import bcrypt from "bcrypt";
import { Request, Response } from 'express';

// Get all users (admin only)
const getAllUser = async (req: Request, res: Response) => {
    try {
        const result = await pool.query("SELECT * FROM users");
        res.status(200).json({ users: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Get user profile
const getUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;

        const user = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        if (user.rows.length === 0) {   
            res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user: user.rows[0] });
    } catch (error) {
        console.error(error);   
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Update user profile
const updateUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const current = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        if (current.rows.length === 0) {
            res.status(404).json({ message: "User not found" });
        }
        const user = current.rows[0];

        const {
            username = user.username,
            first_name = user.first_name,
            last_name = user.last_name,
            phone = user.phone,
            gender = user.gender,
            bio = user.bio,
            profile_image = user.profile_image
        } = req.body;

        const result = await pool.query(
            "UPDATE users SET username = $1, first_name = $2, last_name = $3, phone = $4, gender = $5, bio = $6, profile_image = $7 WHERE id = $8 RETURNING *",
            [username, first_name, last_name, phone, gender, bio, profile_image, userId]
        );

        res.status(200).json({ user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Update user password
const updateUserPassword = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        const current = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        if (current.rows.length === 0) {
            res.status(404).json({ message: "User not found" });
        }

        const user = current.rows[0];

        const isPasswordMatch = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isPasswordMatch) {
            res.status(400).json({ message: "Old password is incorrect" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await pool.query(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            [hashedPassword, userId]
        );
        
        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export { getAllUser, getUserProfile, updateUserProfile, updateUserPassword };