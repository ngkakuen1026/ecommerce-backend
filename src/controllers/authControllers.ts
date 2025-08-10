import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pool from "../db/db"
import { Request, Response } from 'express';

const saltRounds = 10;

const generateAccessToken = (userPayload: object) => {
    if (!process.env.ACCESS_TOKEN_SECRET) {
        throw new Error("ACCESS_TOKEN_SECRET is not defined");
    }
    return jwt.sign(userPayload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
};

const generateRefreshToken = (userPayload: object) => {
    if (!process.env.REFRESH_TOKEN_SECRET) {
        throw new Error("REFRESH_TOKEN_SECRET is not defined");
    }
    return jwt.sign(userPayload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
};

// Register a new user
const registerUser = async (req: Request, res: Response): Promise<any> => {
    const { username, email, password, first_name, last_name, phone, gender, bio, profile_image, is_admin } = req.body;

    try {
        console.log("Received registration request:", req.body);

        const checkUsernameResult = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        const checkEmailResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (checkUsernameResult.rows.length > 0) {
            return res.status(400).json({ essage: "Username already registered, please use other username" });
        }

        if (checkEmailResult.rows.length > 0) {
            return res.status(400).json({ message: "Email already registered, please use other email" });
        }

        const hashedPassword = await bcrypt.hash(String(password), saltRounds);
        console.log("Password hashed");

        await pool.query(
            "INSERT INTO users (username, email, password_hash, first_name, last_name, phone, gender, bio, profile_image, is_admin) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            [username, email, hashedPassword, first_name, last_name, phone, gender, bio, profile_image, is_admin]
        );

        res.status(201).json({ message: `User ${username} registered successfully` });
        console.log(`User ${username} inserted to DB`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// User Login
const loginUser = async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body;

    try {
        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = userResult.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(400).json({ message: "Incorrect password" });
        }

        const { id, username: userUsername, email: userEmail, is_admin: isAdmin } = user;

        const accessToken = generateAccessToken({ id, username: userUsername, email: userEmail, is_admin: isAdmin });
        const refreshToken = generateRefreshToken({ id, username: userUsername, email: userEmail, is_admin: isAdmin });

        // Replace old refresh token and store the new one in the database
        await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [id]);
        await pool.query(
            "INSERT INTO refresh_tokens (token, user_id, expired_at) VALUES ($1, $2, $3)",
            [refreshToken, id, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
        );

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 15 * 60 * 1000,
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        console.log(`User ${userUsername} logged in successfully`);
        console.log(`User refreshToken: ${refreshToken}`);
        console.log(`User accessToken: ${accessToken}`);

        // Return the user's information along with the access token
        res.status(200).json({
            message: `Welcome back, ${userUsername}!`,
            accessToken,
            user: {
                username: userUsername,
                email: userEmail,
                isAdmin,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// User Logout
const logoutUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const refreshToken = req.cookies.refreshToken;

        console.log(`${refreshToken} received from client`);

        if (!refreshToken) {
            return res.status(400).json({ message: "No refresh token provided" });
        }

        await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);

        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        });

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });

        console.log("User logged out successfully");
        res.status(200).json({ message: "User logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Refresh Token
const refreshUserToken = async (req: Request, res: Response): Promise<any> => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ message: "No refresh token provided" });
    }

    try {
        const result = await pool.query("SELECT * FROM refresh_tokens WHERE token = $1", [refreshToken]);
        if (result.rows.length === 0) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        const storedToken = result.rows[0];

        if (new Date(storedToken.expired_at) < new Date()) {
            await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);
            return res.status(403).json({ message: "Refresh token expired" });
        }

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!, (error: any, user: any) => {
            if (error) {
                console.error("Token verification error:", error);
                return res.status(403).json({ message: "Invalid refresh token" });
            }

            const accessToken = generateAccessToken({ id: user.id, username: user.username, email: user.email, is_admin: user.is_admin });

            res.cookie("accessToken", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 15 * 60 * 1000,
            });

            res.status(200).json({ message: "Token refreshed" });
        });
    } catch (error) {
        console.error("Error during token verification:", error);
    }
}

export { registerUser, loginUser, logoutUser, refreshUserToken };