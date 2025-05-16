import pool from "../db/db"
import { Request, Response } from 'express';

// Get all users (test)
const getAllUser = async (req: Request, res: Response) => {
    try {
        const result = await pool.query("SELECT * FROM users");
        res.status(200).json({ users: result.rows });
        console.log(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export { getAllUser };