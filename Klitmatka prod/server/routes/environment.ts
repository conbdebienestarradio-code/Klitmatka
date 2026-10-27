import { Router } from "express";
import { z } from "zod";
import { activityCategories, type EnvironmentalInput } from "../../shared/environment";
import { createCalculation, deleteCalculation, getAllRuns, getCalculationHistory, getDatabaseHealth, getFacilityHeadcount, getFacilityHeadcounts, getInputOptions, getLibrary, getOverview, getRuns, updateCalculation } from "../environment-engine";
import { requireAdmin } from "../auth-middleware";

const qualityDimension = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const periodQuerySchema = z.object({ year: z.string().regex(/^\d{4}$/).optional(), month: z.string().regex(/^(0[1-9]|1[0-2])$/).optional() });
const headcountQuerySchema = z.object({ facilityId: z.string().min(1), reportingPeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });
const headcountsQuerySchema = z.object({ year: z.string().regex(/^\d{4}$/), month: z.string().regex(/^(0[1-9]|1[0-2])$/).optional() });
const inputSchema = z.object({
  facilityId: z.string(),
  facilityName: z.string(),
  category: z.enum(activityCategories),
  subcategory: z.string(),
  activityValue: z.number(),
  activityUnit: z.string(),
  geography: z.string(),
  reportingPeriod: z.string(),
  employeeCount: z.number().int().positive().optional(),
  sourceType: z.enum(["FACTURA_COMERCIAL", "MEDICION_DIRECTA", "REGISTRO_OPERATIVO", "ESTIMACION"]),
  sourceReference: z.string(),
  quality: z.object({ source: qualityDimension, measurement: qualityDimension, temporalRepresentativeness: qualityDimension, operationalRepresentativeness: qualityDimension, traceability: qualityDimension }),
  contractualFactor: z.number().optional(),
  contractualFactorSource: z.string().optional(),
  gasOrigin: z.enum(["combustion", "biogenic", "fugitiveFossil"]).optional(),
  recycledContentPct: z.number().optional(),
  recoveredMassKg: z.number().optional(),
  materialEligibleKg: z.number().optional(),
  productMassKg: z.number().optional(),
  byproductMassKg: z.number().optional(),
  dischargedM3: z.number().optional(),
  reusedM3: z.number().optional(),
  denominatorValue: z.number().optional(),
  denominatorUnit: z.string().optional(),
  wasteHazardous: z.boolean().optional(),
  digitalProvider: z.string().optional(),
  aiModel: z.string().optional(),
  aiInputTokens: z.number().int().nonnegative().optional(),
  aiOutputTokens: z.number().int().nonnegative().optional(),
  internetUploadGb: z.number().nonnegative().optional(),
  internetDownloadGb: z.number().nonnegative().optional(),
  reportedEnergyKwh: z.number().nonnegative().optional(),
  reportedWaterM3: z.number().nonnegative().optional(),
  reportedCo2eKg: z.number().nonnegative().optional(),
});

export const environmentRouter = Router();
environmentRouter.get("/overview", (req, res) => res.json(getOverview(req.auth!.company!.id)));
environmentRouter.get("/library", requireAdmin, (_req, res) => res.json(getLibrary()));
environmentRouter.get("/options", (req, res) => {
  const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).safeParse(req.query.reportingPeriod);
  if (req.query.reportingPeriod !== undefined && !period.success) {
    res.status(400).json({ message: "Selecciona un período válido." });
    return;
  }
  res.json(getInputOptions(period.success ? period.data : undefined));
});
environmentRouter.get("/headcounts/current", (req, res) => {
  const parsed = headcountQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Selecciona una sede y un período válido." });
    return;
  }
  const { facilityId, reportingPeriod } = parsed.data;
  res.json({ employeeCount: getFacilityHeadcount(req.auth!.company!.id, facilityId, reportingPeriod) });
});
environmentRouter.get("/headcounts", (req, res) => {
  const parsed = headcountsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Selecciona un período válido." });
    return;
  }
  res.json(getFacilityHeadcounts(req.auth!.company!.id, parsed.data.year, parsed.data.month));
});
environmentRouter.get("/runs", (req, res) => {
  const parsed = periodQuerySchema.safeParse(req.query);
  if (!parsed.success || (parsed.data.month && !parsed.data.year)) {
    res.status(400).json({ message: "Selecciona un año válido y, para la vista mensual, un mes válido." });
    return;
  }
  res.json(getRuns(req.auth!.company!.id, parsed.data.year, parsed.data.month));
});
environmentRouter.get("/runs/export", (req, res) => res.json(getAllRuns(req.auth!.company!.id)));
environmentRouter.get("/runs/:calculationId/history", (req, res) => {
  res.json(getCalculationHistory(req.params.calculationId, req.auth!.company!.id));
});
environmentRouter.patch("/runs/:calculationId", (req, res) => {
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Revisa los campos requeridos.", errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) });
    return;
  }
  try {
    res.json(updateCalculation(req.params.calculationId, req.auth!.company!.id, { ...parsed.data, tenantId: req.auth!.company!.id, createdByUserId: req.auth!.id } as EnvironmentalInput));
  } catch (error) {
    const details = error as Error & { statusCode?: number; errors?: string[]; warnings?: string[] };
    res.status(details.statusCode ?? 500).json({ message: details.message || "No se pudo actualizar el cálculo.", errors: details.errors ?? [], warnings: details.warnings ?? [] });
  }
});
environmentRouter.delete("/runs/:calculationId", (req, res) => {
  try {
    res.json(deleteCalculation(req.params.calculationId, req.auth!.company!.id));
  } catch (error) {
    const details = error as Error & { statusCode?: number };
    res.status(details.statusCode ?? 500).json({ message: details.message || "No se pudo eliminar el cálculo." });
  }
});
environmentRouter.get("/health", (req, res) => res.json(getDatabaseHealth(req.auth!.company!.id)));
environmentRouter.post("/calculate", (req, res) => {
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Revisa los campos requeridos.", errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) });
    return;
  }
  try {
    res.status(201).json(createCalculation({ ...parsed.data, tenantId: req.auth!.company!.id, createdByUserId: req.auth!.id } as EnvironmentalInput));
  } catch (error) {
    const details = error as Error & { statusCode?: number; errors?: string[]; warnings?: string[] };
    res.status(details.statusCode ?? 500).json({ message: details.message || "No se pudo completar el cálculo.", errors: details.errors ?? [], warnings: details.warnings ?? [] });
  }
});
