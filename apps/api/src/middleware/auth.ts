import type { NextFunction, Request, Response } from "express";
import type { Role } from "@study-abroad/shared";
import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../utils/jwt.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({
      message: "Authentication required"
    });
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid authentication token"
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid authentication token"
    });
  }
}

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource"
      });
    }

    next();
  };
}
