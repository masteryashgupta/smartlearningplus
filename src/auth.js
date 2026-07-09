import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import { q } from "./db.js";
dotenv.config();

let SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.warn("⚠️  JWT_SECRET is not set in environment variables! Generating a random secret key for this session.");
  SECRET = crypto.randomBytes(32).toString("hex");
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// Attaches req.auth = { role: 'admin'|'student', id, ... }
// Also checks if user is active/exists in the database
export function requireAuth(role) {
  return async (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: "Invalid or expired token" });
    if (role && decoded.role !== role) {
      return res.status(403).json({ error: "Not authorized for this resource" });
    }

    // Security validation against database status
    if (decoded.role === "student") {
      try {
        const { rows } = await q("select is_active from users where id = $1", [decoded.id]);
        if (rows.length === 0) {
          return res.status(403).json({ error: "User account not found" });
        }
        if (!rows[0].is_active) {
          return res.status(403).json({ error: "Your account is deactivated. Please contact the administrator." });
        }
      } catch (err) {
        console.error("Database validation error inside requireAuth:", err);
        return res.status(500).json({ error: "Internal validation error" });
      }
    } else if (decoded.role === "admin") {
      try {
        const { rows } = await q("select 1 from admins where id = $1", [decoded.id]);
        if (rows.length === 0) {
          return res.status(403).json({ error: "Admin account not found" });
        }
      } catch (err) {
        console.error("Database validation error inside requireAuth (admin):", err);
        return res.status(500).json({ error: "Internal validation error" });
      }
    }

    req.auth = decoded;
    next();
  };
}
