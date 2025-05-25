import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/JwtPayLoad";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"] as string | undefined;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Token is not being sent or null" });
    return;
  }

  if (!process.env.ACCESS_TOKEN_SECRET) {
    res.status(500).json({ message: "ACCESS_TOKEN_SECRET is not defined" });
    return; 
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        res.status(401).json({ message: "Access token expired" });
      } else {
        res.status(403).json({ message: "Token no longer valid" });
      }
      return; 
    }

    req.user = user as JwtPayload; 
    next(); 
  });
};

export { isAuthenticated };