import express, { Application, Request, Response } from 'express';
import cookieParser from "cookie-parser";
import dotenv from 'dotenv';
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";


dotenv.config();

const app: Application = express();
const PORT = process.env.PORT;

app.use(express.json());

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); 

// Base API path
const API_BASE_PATH = "/api/v1";

// Routes
app.use(`${API_BASE_PATH}/users`, userRoutes);
app.use(`${API_BASE_PATH}/auth`, authRoutes);

app.get("/health", (req: Request, res: Response) => {
    res.status(200).send({ message: "Server is healthy!" });
    console.log("Server is healthy!");
}); 

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});