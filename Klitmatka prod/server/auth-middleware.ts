import type { NextFunction, Request, Response } from "express";
import type { AuthIdentity } from "../shared/auth";
import { getSessionIdentity } from "./environment-engine";

const sessionCookieName = "klimatka_session";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthIdentity;
    }
  }
}

export function setSessionCookie(res: Response, token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.append("Set-Cookie", `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600${secure}`);
}

export function clearSessionCookie(res: Response) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.append("Set-Cookie", `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

export function readSessionToken(req: Request) {
  const cookie = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookieName}=`));
  return cookie?.slice(sessionCookieName.length + 1) ?? null;
}

export function requireAuthenticated(req: Request, res: Response, next: NextFunction) {
  const token = readSessionToken(req);
  const identity = token ? getSessionIdentity(token) : null;
  if (!identity) {
    res.status(401).json({ message: "Inicia sesión para continuar." });
    return;
  }
  req.auth = identity;
  next();
}

export function requireCompany(req: Request, res: Response, next: NextFunction) {
  if (!req.auth?.company) {
    res.status(409).json({ message: "Crea o selecciona una empresa para continuar." });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.role !== "admin") {
    res.status(403).json({ message: "Esta acción requiere permisos de administrador de la empresa." });
    return;
  }
  next();
}

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth?.isPlatformAdmin) {
    res.status(403).json({ message: "Esta acción requiere permisos de administración de Klimatka." });
    return;
  }
  next();
}
