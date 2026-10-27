import "dotenv/config";
import express from "express";
import { requireAuthenticated, requireCompany } from "./auth-middleware";
import { authRouter } from "./routes/auth";
import { environmentRouter } from "./routes/environment";
import { platformAdminRouter } from "./routes/platform-admin";

export function createServer() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/platform-admin", requireAuthenticated, platformAdminRouter);
  app.use("/api/environment", requireAuthenticated, requireCompany, environmentRouter);

  return app;
}
