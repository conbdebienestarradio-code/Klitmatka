import { Router } from "express";
import { z } from "zod";
import { createMeasurementModule, getMeasurementModuleVersions, getMeasurementModules, updateMeasurementModule } from "../environment-engine";
import { requirePlatformAdmin } from "../auth-middleware";

const moduleFields = {
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500),
  unit: z.string().trim().min(1).max(40),
  metricName: z.string().trim().min(1).max(80),
  factorValue: z.number().finite().nonnegative().nullable(),
  factorUnit: z.string().trim().max(80),
  sourceReference: z.string().trim().max(500),
  status: z.enum(["VIGENTE", "PENDIENTE_VALIDACION_OFICIAL"]),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
};
const createSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Z0-9_-]+$/i),
  ...moduleFields,
});
const updateSchema = z.object({
  ...moduleFields,
  active: z.boolean(),
});

export const platformAdminRouter = Router();
platformAdminRouter.use(requirePlatformAdmin);
platformAdminRouter.get("/modules", (_req, res) => res.json(getMeasurementModules()));
platformAdminRouter.get("/modules/:moduleId/versions", (req, res) => res.json(getMeasurementModuleVersions(req.params.moduleId)));
platformAdminRouter.post("/modules", (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Revisa los datos del módulo.", errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) });
    return;
  }
  try {
    res.status(201).json(createMeasurementModule(parsed.data));
  } catch (error) {
    const details = error as Error & { statusCode?: number };
    res.status(details.statusCode ?? 500).json({ message: details.message || "No se pudo crear el módulo." });
  }
});
platformAdminRouter.put("/modules/:moduleId", (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Revisa los parámetros del módulo.", errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) });
    return;
  }
  try {
    res.json(updateMeasurementModule(req.params.moduleId, parsed.data));
  } catch (error) {
    const details = error as Error & { statusCode?: number };
    res.status(details.statusCode ?? 500).json({ message: details.message || "No se pudo guardar la nueva versión." });
  }
});
