import { describe, expect, it } from "vitest";
import type { CalculationResult } from "@shared/environment";
import {
  buildEnvironmentalReportPdf,
  buildPowerBiCsv,
  createEnvironmentalReport,
} from "./environment-report";

function makeRun(
  overrides: Partial<CalculationResult> = {},
): CalculationResult {
  return {
    calculationId: "run-1",
    category: "ELECTRICITY",
    scope: "Scope 2 location-based",
    activityValue: 1000,
    activityUnit: "kWh",
    normalizedValue: 1000,
    normalizedUnit: "kWh",
    geography: "VE",
    reportingPeriod: "2025-01",
    metricValue: 2,
    metricUnit: "tCO2e",
    co2eTotalTonnes: 2,
    factorUsed: "GRID-VE",
    factorValue: 0.45,
    factorUnit: "kgCO2e/kWh",
    factorStatus: "PENDIENTE_VALIDACION_OFICIAL",
    sourceReference: "Factura ene-2025",
    fallbackApplied: true,
    uncertaintyPct: 30,
    dataQualityScore: 8,
    dataQualityRating: "Media-alta",
    dataQualityTier: "Tier 2",
    thresholdStatus: "NORMAL",
    warnings: ["Factor nacional pendiente"],
    validation: [],
    breakdown: {},
    snapshot: {
      activity: {
        facilityName: "Sede principal",
        source: 2,
        quality: {
          source: 2,
          measurement: 2,
          temporalRepresentativeness: 1,
          operationalRepresentativeness: 1,
          traceability: 2,
        },
      },
      recommendations: [],
      factorSourceReference: "SRC-001",
    },
    createdAt: "2025-02-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("environmental executive PDF report", () => {
  it("excludes insufficient-quality runs from trusted totals", () => {
    const report = createEnvironmentalReport(
      null,
      [],
      [
        makeRun(),
        makeRun({
          calculationId: "run-2",
          dataQualityRating: "Insuficiente",
          co2eTotalTonnes: 100,
        }),
        makeRun({
          calculationId: "run-3",
          category: "AIR",
          scope: "No aplica",
          co2eTotalTonnes: null,
          metricValue: 12,
          metricUnit: "kg PM10",
          snapshot: {
            airClassification: "PM10",
            activity: {
              facilityName: "Sede principal",
              quality: {
                source: 2,
                measurement: 2,
                temporalRepresentativeness: 1,
                operationalRepresentativeness: 1,
                traceability: 2,
              },
            },
            recommendations: [],
          },
        }),
      ],
    );

    expect(report.runCount).toBe(2);
    expect(report.excludedUnreliableCount).toBe(1);
    expect(report.emissionsTonnes).toBe(2);
    expect(report.emissionsByScope).toEqual([
      { scope: "Scope 2 location-based", tonnes: 2 },
    ]);
    expect(report.dataQuality.meanScore).toBe(8);
  });

  it("summarizes digital usage and keeps provider-reported impacts separate", () => {
    const ai = makeRun({
      calculationId: "ai-1",
      category: "AI",
      scope: "Uso digital · GEI reportado fuera del inventario",
      activityValue: 125,
      activityUnit: "solicitudes",
      normalizedValue: 125,
      normalizedUnit: "solicitudes",
      co2eTotalTonnes: null,
      digitalUsage: {
        provider: "Proveedor IA",
        model: "Modelo A",
        inputTokens: 9000,
        outputTokens: 2500,
        reportedEnergyKwh: 4,
        reportedWaterM3: 0.5,
        reportedCo2eKg: 2.2,
      },
      snapshot: {
        activity: {
          facilityName: "Sede principal",
          subcategory: "GENERATIVE",
          sourceType: "REGISTRO_OPERATIVO",
          quality: {
            source: 2,
            measurement: 2,
            temporalRepresentativeness: 2,
            operationalRepresentativeness: 2,
            traceability: 2,
          },
        },
        recommendations: [],
      },
    });
    const internet = makeRun({
      calculationId: "internet-1",
      category: "INTERNET",
      scope: "Uso digital · impacto no cuantificado",
      activityValue: 15,
      activityUnit: "GB",
      normalizedValue: 15,
      normalizedUnit: "GB",
      co2eTotalTonnes: null,
      digitalUsage: {
        provider: "Proveedor internet",
        uploadGb: 3,
        downloadGb: 12,
      },
      snapshot: {
        activity: {
          facilityName: "Sede principal",
          subcategory: "FIXED",
          sourceType: "FACTURA_COMERCIAL",
          quality: {
            source: 2,
            measurement: 2,
            temporalRepresentativeness: 2,
            operationalRepresentativeness: 2,
            traceability: 2,
          },
        },
        recommendations: [],
      },
    });
    const report = createEnvironmentalReport(null, [], [ai, internet]);
    expect(report.emissionsTonnes).toBeNull();
    expect(report.electricityKwh).toBeNull();
    expect(report.waterM3).toBeNull();
    expect(report.wasteTonnes).toBeNull();
    expect(report.digitalUsage.ai.usageTotal).toBe(125);
    expect(report.digitalUsage.ai.inputTokens.value).toBe(9000);
    expect(report.digitalUsage.ai.reportedCo2eKg.value).toBe(2.2);
    expect(report.digitalUsage.internet.usageTotal).toBe(15);
    expect(report.digitalUsage.internet.uploadGb.value).toBe(3);

    const csv = buildPowerBiCsv([ai, internet]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("GEI digital reportado kgCO2e");
    expect(csv).toContain("Proveedor IA");
    expect(csv).toContain('"4","0.5","2.2",,"Uso digital');
  });

  it("escapes spreadsheet formulas in exported text values", () => {
    const run = makeRun({ digitalUsage: { provider: "=2+2" } });
    expect(buildPowerBiCsv([run])).toContain('"\'=2+2"');
  });

  it("generates a PDF document instead of a serialized data file", () => {
    const report = createEnvironmentalReport(null, [], [makeRun()]);
    const pdf = buildEnvironmentalReportPdf(report);
    const output = pdf.output("arraybuffer");
    const signature = String.fromCharCode(
      ...new Uint8Array(output).slice(0, 4),
    );

    expect(signature).toBe("%PDF");
    expect(output.byteLength).toBeGreaterThan(1000);
    expect(
      pdf.output().match(/\/Subtype \/Image/g)?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    expect(pdf.getNumberOfPages()).toBeLessThan(9);
  });
});
