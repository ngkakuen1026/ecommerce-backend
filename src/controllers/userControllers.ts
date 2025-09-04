import pool from "../db/db"
import bcrypt from "bcrypt";
import { Request, Response } from 'express';
import cloudinary from "../config/cloudinary";
import fs from "fs";
import { extractPublicId } from "../utils/extractCloudinaryUrl";

const getUserLength = async (req: Request, res: Response) => {
    try {
        const result = await pool.query("SELECT * FROM users");
        const users = result.rows.map(({ password_hash, ...rest }) => rest);
        const usersLength = users.length;
        res.status(200).json({ usersLength });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Get all users (admin only)
const getAllUser = async (req: Request, res: Response) => {
    try {
        const result = await pool.query("SELECT * FROM users");
        const users = result.rows.map(({ password_hash, ...rest }) => rest);
        res.status(200).json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Get Specific User by ID (admin only)
const getSpecificUserById = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);

    try {
        const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const user = { ...result.rows[0], password_hash: undefined };
        res.status(200).json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Get User by ID ()
const getUsernameById = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);

    try {
        const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const users = result.rows.map(({ password_hash, ...rest }) => rest);
        res.status(200).json({ users });
        console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

// Get user profile
const getUserProfile = async (req: Request, res: Response) => {
    try {
        const rawId = req.user?.id;
        const userId = Number(rawId);

        if (!userId || isNaN(userId)) {
            res.status(400).json({ message: "Invalid user ID in token" });
            return
        }

        const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);

        if (result.rows.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const { password_hash, ...safeUser } = result.rows[0];
        res.status(200).json({ user: safeUser });
    } catch (error) {
        console.error("Error in getUserProfile:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Update user profile
const updateUserProfile = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    try {
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
        const userId = req.user!.id;
        const { oldPassword, newPassword } = req.body;

        const current = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        if (current.rows.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const user = current.rows[0];

        const isPasswordMatch = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isPasswordMatch) {
            res.status(400).json({ message: "Old password is incorrect" });
            return;
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

//Upload user image
const uploadImage = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;

        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        const current = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);

        if (current.rows.length === 0) {
            fs.unlinkSync(req.file.path);

            res.status(404).json({ message: "User not found" });
            return;
        }

        const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
            folder: "user_images",
            use_filename: true,
            unique_filename: false
        });

        fs.unlinkSync(req.file.path);

        const updateResult = await pool.query(
            "UPDATE users SET profile_image = $1 WHERE id = $2 RETURNING *",
            [cloudinaryResult.secure_url, userId]
        );

        res.status(200).json({
            message: "Image uploaded and user updated successfully",
            user: updateResult.rows[0]
        });
    } catch (error) {
        console.error("Upload error:", error);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ message: "Internal Server Error" });
    }
};

const deleteImage = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    try {
        const userResult = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            res.status(403).json({ message: "Unauthorized to delete image for this user" });
            return;
        }

        const imageResult = await pool.query(
            "SELECT profile_image FROM users WHERE id = $1", [userId]
        )

        if (imageResult.rows.length === 0) {
            res.status(200).json({ message: "Image not found" })
            return;
        }

        const publicId = extractPublicId(imageResult.rows[0].profile_image);
        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
        }

        await pool.query("UPDATE users SET profile_image = NULL WHERE id = $1", [userId]);

        res.status(200).json({ message: "Image deleted successfully" });

    } catch (error) {
        console.error("Delete image error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

const deleteOwnUser = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;

        const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING *", [userId]);

        if (result.rowCount === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.status(200).json({ message: "User account deleted successfully" });
    } catch (error) {
        console.error("Error deleting user account:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const deleteUser = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);

    try {
        const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING *", [userId]);

        if (result.rowCount === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.status(200).json({ message: "User account deleted successfully" });
    } catch (error) {
        console.error("Error deleting user account:", error);
        res.status(500).json({ message: "Internal Server Error" });

    }
}

const updateUser = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);

    try {
        const current = await pool.query("SELECT * FROM users WHERE id = $1",
            [userId]);

        if (current.rowCount === 0) {
            res.status(404).json({ message: "User not found" });
            return;
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

//Upload user image
const uploadUserImage = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);

    try {
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        const current = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);

        if (current.rows.length === 0) {
            fs.unlinkSync(req.file.path);

            res.status(404).json({ message: "User not found" });
            return;
        }

        const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
            folder: "user_images",
            use_filename: true,
            unique_filename: false
        });

        fs.unlinkSync(req.file.path);

        const updateResult = await pool.query(
            "UPDATE users SET profile_image = $1 WHERE id = $2 RETURNING *",
            [cloudinaryResult.secure_url, userId]
        );

        res.status(200).json({
            message: "Image uploaded and user updated successfully",
            user: updateResult.rows[0]
        });
    } catch (error) {
        console.error("Upload error:", error);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ message: "Internal Server Error" });
    }
};

const deleteUserImage = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);

    try {
        const userResult = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const imageResult = await pool.query(
            "SELECT profile_image FROM users WHERE id = $1", [userId]
        )

        if (imageResult.rows.length === 0) {
            res.status(200).json({ message: "Image not found" })
            return;
        }

        const publicId = extractPublicId(imageResult.rows[0].profile_image);
        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
        }

        await pool.query("UPDATE users SET profile_image = NULL WHERE id = $1", [userId]);

        res.status(200).json({ message: "Image deleted successfully" });

    } catch (error) {
        console.error("Delete image error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

const searchUsername = async (req: Request, res: Response) => {
    const { query } = req.query;

    if (!query) {
        res.status(400).json({ message: "Search query is required" });
        return;
    }

    try {
        const result = await pool.query(`SELECT * FROM users WHERE users.username ILIKE $1`, [`%${query}%`]);
        const users = result.rows.map(({ password_hash, ...rest }) => rest);
        res.status(200).json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export {
    getAllUser, getUserLength, getSpecificUserById, getUsernameById, getUserProfile, updateUserProfile, updateUserPassword, uploadImage, deleteOwnUser, deleteImage, deleteUser, updateUser, uploadUserImage, deleteUserImage, searchUsername
};