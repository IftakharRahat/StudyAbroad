import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { Role } from "@study-abroad/shared";

type TokenPayload = {
  userId: string;
  role: Role;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

export function signAccessToken(payload: TokenPayload) {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
}
