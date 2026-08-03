import type { AuthUser } from "@study-abroad/shared";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
