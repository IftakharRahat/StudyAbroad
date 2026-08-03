import { Router } from "express";
import { loginSchema, registerSchema } from "@study-abroad/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { signAccessToken } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid registration data",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: parsed.data.email.toLowerCase()
    }
  });

  if (existingUser) {
    return res.status(409).json({
      message: "An account already exists with this email"
    });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: "STUDENT"
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });

  const token = signAccessToken({
    userId: user.id,
    role: user.role
  });

  return res.status(201).json({
    token,
    user
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid login data",
      errors: parsed.error.flatten().fieldErrors
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email.toLowerCase()
    }
  });

  if (!user) {
    return res.status(401).json({
      message: "Invalid email or password"
    });
  }

  const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!validPassword) {
    return res.status(401).json({
      message: "Invalid email or password"
    });
  }

  const token = signAccessToken({
    userId: user.id,
    role: user.role
  });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

authRouter.get("/me", requireAuth, (req, res) => {
  return res.json({
    user: req.user
  });
});

authRouter.post("/logout", (_req, res) => {
  return res.json({
    ok: true
  });
});
