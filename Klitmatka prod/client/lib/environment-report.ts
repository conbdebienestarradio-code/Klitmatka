import { jsPDF } from "jspdf";
import type {
  CalculationResult,
  EnvironmentalInput,
  EnvironmentalOverview,
} from "@shared/environment";
import { buildEnvironmentalReportPdfTemplate } from "./environment-report-pdf";

type RoadmapPhase = {
  code: string;
  name: string;
  horizon: string;
  objectives: string;
  output: string;
};
type Recommendation = {
  id?: string;
  category?: string;
  probableCause?: string;
  opportunity?: string;
  action?: string;
  investment?: string;
  timeframe?: string;
  priority?: string;
  venezuelaAvailability?: string;
  paybackMonths?: number | null;
};
type NormalizedIndicator = {
  calculationId: string;
  category: string;
  value: number;
  unit: string;
  denominator: number;
  denominatorUnit: string;
};
type DigitalMetricSummary = {
  value: number | null;
  recordsWithValue: number;
  totalRecords: number;
};
type DigitalModuleSummary = {
  records: number;
  providers: string[];
  usageTotal: number | null;
  inputTokens: DigitalMetricSummary;
  outputTokens: DigitalMetricSummary;
  uploadGb: DigitalMetricSummary;
  downloadGb: DigitalMetricSummary;
  energyKwh: DigitalMetricSummary;
  waterM3: DigitalMetricSummary;
  reportedCo2eKg: DigitalMetricSummary;
};

export interface EnvironmentalReport {
  companyName: string;
  generatedAt: string;
  periods: string[];
  facilities: string[];
  runCount: number;
  excludedUnreliableCount: number;
  emissionsTonnes: number | null;
  emissionsByScope: { scope: string; tonnes: number }[];
  electricityKwh: number | null;
  waterM3: number | null;
  wasteTonnes: number | null;
  digitalUsage: { ai: DigitalModuleSummary; internet: DigitalModuleSummary };
  factorLibrary: EnvironmentalOverview["library"] | null;
  factorSources: Record<string, string>;
  pendingFactors: EnvironmentalOverview["pendingFactors"];
  normalizedIndicators: NormalizedIndicator[];
  runs: CalculationResult[];
  dataQuality: {
    meanScore: number | null;
    ratings: {
      calculationId: string;
      score: number;
      rating: string;
      uncertaintyPct: number;
      fallbackApplied: boolean;
    }[];
    dimensions: { label: string; score: number | null }[];
  };
  recommendations: (Recommendation & {
    calculationId: string;
    period: string;
  })[];
  roadmap: RoadmapPhase[];
}

const qualityDimensions = [
  { key: "source", label: "Fuente" },
  { key: "measurement", label: "Medicion" },
  { key: "temporalRepresentativeness", label: "Representatividad temporal" },
  {
    key: "operationalRepresentativeness",
    label: "Representatividad operacional",
  },
  { key: "traceability", label: "Trazabilidad" },
] as const;

const numberFormat = new Intl.NumberFormat("es-VE", {
  maximumFractionDigits: 2,
});
const formatNumber = (value: number) => numberFormat.format(value);
const cleanText = (value: unknown, fallback = "No disponible") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value)
    .replace(/[–—]/g, "-")
    .replace(/[·•]/g, "-")
    .replace(/₂/g, "2")
    .replace(/³/g, "3")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[^\x20-\xFF]/g, " ");
};
const activityFrom = (run: CalculationResult) =>
  run.snapshot.activity as EnvironmentalInput | undefined;
const numeric = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function createEnvironmentalReport(
  overview: EnvironmentalOverview | null,
  roadmap: RoadmapPhase[],
  runs: CalculationResult[],
  sources: { id: string; title: string }[] = [],
  companyName = "Organización",
): EnvironmentalReport {
  const eligibleRuns = runs.filter(
    (run) => run.dataQualityRating !== "Insuficiente",
  );
  const excludedUnreliableCount = runs.length - eligibleRuns.length;
  const emissionsByScope = new Map<string, number>();
  let emissionsTonnes = 0;
  let emissionsRunCount = 0;
  let electricityKwh = 0;
  let electricityCount = 0;
  let waterM3 = 0;
  let waterCount = 0;
  let wasteTonnes = 0;
  let wasteCount = 0;
  const normalizedIndicators: NormalizedIndicator[] = [];

  for (const run of eligibleRuns) {
    if (run.co2eTotalTonnes !== null && Number.isFinite(run.co2eTotalTonnes)) {
      emissionsTonnes += run.co2eTotalTonnes;
      emissionsRunCount += 1;
      emissionsByScope.set(
        run.scope,
        (emissionsByScope.get(run.scope) ?? 0) + run.co2eTotalTonnes,
      );
    }
    if (run.category === "ELECTRICITY") {
      electricityKwh += run.normalizedValue;
      electricityCount += 1;
    }
    if (run.category === "WATER") {
      waterM3 += run.normalizedValue;
      waterCount += 1;
    }
    if (run.category === "WASTE") {
      wasteTonnes += run.normalizedValue / 1000;
      wasteCount += 1;
    }

    const intensity =
      run.snapshot.waterIntensity ?? run.snapshot.materialIntensity;
    const activity = activityFrom(run);
    if (
      intensity &&
      typeof intensity === "object" &&
      "value" in intensity &&
      numeric(intensity.value) &&
      activity?.denominatorValue !== undefined
    ) {
      normalizedIndicators.push({
        calculationId: run.calculationId,
        category: run.category,
        value: intensity.value,
        unit: "unit" in intensity ? String(intensity.unit) : run.normalizedUnit,
        denominator: activity.denominatorValue,
        denominatorUnit: activity.denominatorUnit ?? "unidad",
      });
    }
  }

  const ratings = eligibleRuns.map((run) => ({
    calculationId: run.calculationId,
    score: run.dataQualityScore,
    rating: run.dataQualityRating,
    uncertaintyPct: run.uncertaintyPct,
    fallbackApplied: run.fallbackApplied,
  }));
  const dimensions = qualityDimensions.map(({ key, label }) => {
    const scores = eligibleRuns
      .map((run) => {
        const quality = activityFrom(run)?.quality;
        return quality && numeric(quality[key]) ? quality[key] : null;
      })
      .filter(
        (score): score is EnvironmentalInput["quality"]["source"] =>
          score !== null,
      );
    return {
      label,
      score: scores.length
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : null,
    };
  });
  const recommendations = eligibleRuns.flatMap((run) => {
    const entries = run.snapshot.recommendations as
      Recommendation[] | undefined;
    return (entries ?? []).map((entry) => ({
      ...entry,
      calculationId: run.calculationId,
      period: run.reportingPeriod,
    }));
  });
  const aiRuns = eligibleRuns.filter(
    (run) => run.category === "AI" && run.digitalUsage,
  );
  const internetRuns = eligibleRuns.filter(
    (run) => run.category === "INTERNET" && run.digitalUsage,
  );
  const summarizeDigitalModule = (
    sourceRuns: CalculationResult[],
  ): DigitalModuleSummary => {
    const metric = (
      key: keyof NonNullable<CalculationResult["digitalUsage"]>,
    ): DigitalMetricSummary => {
      const values = sourceRuns
        .map((run) => run.digitalUsage?.[key])
        .filter((value): value is number => typeof value === "number");
      return {
        value:
          sourceRuns.length > 0 && values.length === sourceRuns.length
            ? values.reduce((sum, value) => sum + value, 0)
            : null,
        recordsWithValue: values.length,
        totalRecords: sourceRuns.length,
      };
    };
    return {
      records: sourceRuns.length,
      providers: [
        ...new Set(
          sourceRuns
            .map((run) => run.digitalUsage?.provider)
            .filter((provider): provider is string => Boolean(provider)),
        ),
      ].sort(),
      usageTotal: sourceRuns.length
        ? sourceRuns.reduce((sum, run) => sum + run.activityValue, 0)
        : null,
      inputTokens: metric("inputTokens"),
      outputTokens: metric("outputTokens"),
      uploadGb: metric("uploadGb"),
      downloadGb: metric("downloadGb"),
      energyKwh: metric("reportedEnergyKwh"),
      waterM3: metric("reportedWaterM3"),
      reportedCo2eKg: metric("reportedCo2eKg"),
    };
  };

  return {
    companyName,
    generatedAt: new Date().toISOString(),
    periods: [
      ...new Set(eligibleRuns.map((run) => run.reportingPeriod)),
    ].sort(),
    facilities: [
      ...new Set(
        eligibleRuns
          .map((run) => activityFrom(run)?.facilityName)
          .filter((name): name is string => Boolean(name)),
      ),
    ].sort(),
    runCount: eligibleRuns.length,
    excludedUnreliableCount,
    emissionsTonnes: emissionsRunCount ? emissionsTonnes : null,
    emissionsByScope: [...emissionsByScope.entries()].map(
      ([scope, tonnes]) => ({ scope, tonnes }),
    ),
    electricityKwh: electricityCount ? electricityKwh : null,
    waterM3: waterCount ? waterM3 : null,
    wasteTonnes: wasteCount ? wasteTonnes : null,
    digitalUsage: {
      ai: summarizeDigitalModule(aiRuns),
      internet: summarizeDigitalModule(internetRuns),
    },
    factorLibrary: overview?.library ?? null,
    factorSources: Object.fromEntries(
      sources.map((source) => [source.id, source.title]),
    ),
    pendingFactors: overview?.pendingFactors ?? [],
    normalizedIndicators,
    runs: eligibleRuns,
    dataQuality: {
      meanScore: ratings.length
        ? ratings.reduce((sum, item) => sum + item.score, 0) / ratings.length
        : null,
      ratings,
      dimensions,
    },
    recommendations,
    roadmap,
  };
}

export function buildPowerBiCsv(runs: CalculationResult[]) {
  const headers = [
    "Periodo",
    "Instalacion",
    "Modulo",
    "Subcategoria",
    "Proveedor digital",
    "Modelo IA",
    "Geografia",
    "Actividad",
    "Unidad actividad",
    "Tokens entrada",
    "Tokens salida",
    "Subida GB",
    "Descarga GB",
    "Energia digital reportada kWh",
    "Agua digital reportada m3",
    "GEI digital reportado kgCO2e",
    "Emisiones inventario tCO2e",
    "Alcance",
    "Fuente actividad",
    "Tipo de fuente",
    "Calidad DQ",
    "Estado del factor",
  ];
  const rows = runs.map((run) => {
    const activity = activityFrom(run);
    return [
      run.reportingPeriod,
      activity?.facilityName,
      categoryLabel(run.category),
      activity?.subcategory,
      run.digitalUsage?.provider,
      run.digitalUsage?.model,
      run.geography,
      run.activityValue,
      run.activityUnit,
      run.digitalUsage?.inputTokens,
      run.digitalUsage?.outputTokens,
      run.digitalUsage?.uploadGb,
      run.digitalUsage?.downloadGb,
      run.digitalUsage?.reportedEnergyKwh,
      run.digitalUsage?.reportedWaterM3,
      run.digitalUsage?.reportedCo2eKg,
      run.co2eTotalTonnes,
      run.scope,
      run.sourceReference,
      activity?.sourceType,
      run.dataQualityScore,
      run.factorStatus,
    ];
  });
  const csvCell = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    const safe =
      typeof value === "string" && /^[\u0000-\u0020]*[=+\-@]/.test(text)
        ? `'${text}`
        : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function buildEnvironmentalReportPdf(report: EnvironmentalReport) {
  return buildEnvironmentalReportPdfTemplate(report);
}

function buildLegacyEnvironmentalReportPdf(report: EnvironmentalReport) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 17;
  const contentWidth = pageWidth - margin * 2;
  const bottom = pageHeight - 18;
  let y = 18;

  pdf.setProperties({
    title: `Diagnostico de desempeno ambiental - ${report.companyName}`,
    subject: "Linea base, calidad de datos y oportunidades de mejora ambiental",
    author: "SW Inteligencia Ambiental Empresarial",
    creator: "SW Inteligencia Ambiental Empresarial",
  });

  const runningHeader = () => {
    pdf.setFillColor(24, 63, 52);
    pdf.rect(0, 0, pageWidth, 3, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(24, 63, 52);
    pdf.text("SW  /  INTELIGENCIA AMBIENTAL", margin, 11);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(115, 127, 119);
    pdf.text(report.companyName, pageWidth - margin, 11, { align: "right" });
  };

  const ensureSpace = (height: number) => {
    if (y + height <= bottom) return;
    pdf.addPage();
    runningHeader();
    y = 21;
  };

  const paragraph = (
    value: unknown,
    options: {
      x?: number;
      width?: number;
      size?: number;
      color?: [number, number, number];
      bold?: boolean;
      gap?: number;
    } = {},
  ) => {
    const {
      x = margin,
      width = contentWidth,
      size = 9,
      color = [66, 78, 70],
      bold = false,
      gap = 2,
    } = options;
    const lines = pdf.splitTextToSize(cleanText(value), width) as string[];
    const lineHeight = size * 0.48;
    ensureSpace(lines.length * lineHeight + gap);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    pdf.text(lines, x, y);
    y += lines.length * lineHeight + gap;
  };

  const section = (title: string) => {
    ensureSpace(12);
    y += 3;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(24, 63, 52);
    pdf.text(cleanText(title.toUpperCase()), margin, y);
    y += 3;
    pdf.setDrawColor(216, 225, 217);
    pdf.setLineWidth(0.25);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  const field = (label: string, value: unknown, fallback?: string) => {
    paragraph(label, { size: 7.5, color: [116, 128, 119], gap: 0.7 });
    paragraph(cleanText(value, fallback), {
      size: 9,
      color: [38, 50, 42],
      bold: true,
      gap: 2.2,
    });
  };

  const card = (
    x: number,
    top: number,
    width: number,
    label: string,
    value: string,
    unit: string,
  ) => {
    pdf.setFillColor(245, 248, 245);
    pdf.setDrawColor(226, 233, 226);
    pdf.roundedRect(x, top, width, 22, 2, 2, "FD");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(102, 117, 106);
    pdf.text(cleanText(label), x + 3, top + 5);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(24, 63, 52);
    pdf.text(cleanText(value), x + 3, top + 12.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(102, 117, 106);
    pdf.text(cleanText(unit), x + 3, top + 18);
  };

  runningHeader();
  pdf.setFillColor(239, 245, 238);
  pdf.roundedRect(margin, 19, contentWidth, 45, 3, 3, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(63, 111, 78);
  pdf.text(
    "REPORTE EJECUTIVO  /  DIAGNOSTICO DE DESEMPENO AMBIENTAL",
    margin + 6,
    27,
  );
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(24, 63, 52);
  pdf.text("Linea base ambiental", margin + 6, 38);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(74, 91, 78);
  pdf.text(
    `${report.companyName}  |  ` +
      (report.periods.length
        ? `${formatPeriodLabel(report.periods[0])} - ${formatPeriodLabel(report.periods[report.periods.length - 1])}`
        : "Sin periodo reportado"),
    margin + 6,
    45,
  );
  pdf.setFontSize(7.5);
  pdf.setTextColor(104, 119, 108);
  pdf.text(
    "Generado " +
      new Intl.DateTimeFormat("es-VE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Caracas",
      }).format(new Date(report.generatedAt)),
    margin + 6,
    53,
  );
  y = 72;

  const gap = 4;
  const cardWidth = (contentWidth - gap) / 2;
  card(
    margin,
    y,
    cardWidth,
    "EMISIONES GEI",
    formatNumber(report.emissionsTonnes),
    "tCO2e · corridas con GEI calculado",
  );
  card(
    margin + cardWidth + gap,
    y,
    cardWidth,
    "ELECTRICIDAD",
    formatNumber(report.electricityKwh),
    "kWh normalizados",
  );
  card(
    margin,
    y + 26,
    cardWidth,
    "AGUA GESTIONADA",
    formatNumber(report.waterM3),
    "m3 normalizados",
  );
  card(
    margin + cardWidth + gap,
    y + 26,
    cardWidth,
    "RESIDUOS",
    formatNumber(report.wasteTonnes),
    "t normalizadas",
  );
  y += 56;

  paragraph(
    "Este reporte resume registros aceptados por el motor. Los intentos rechazados por validacion no se guardan ni se presentan como resultados; cada cifra conserva su factor, fuente, calidad e incertidumbre.",
    { size: 8.3, color: [69, 83, 72], gap: 3 },
  );
  if (report.excludedUnreliableCount > 0)
    paragraph(
      `${report.excludedUnreliableCount} registro(s) con calidad insuficiente se excluyeron de los resultados y las recomendaciones.`,
      { size: 8, color: [153, 96, 35] },
    );
  section("Alcance de la linea base");
  field(
    "INSTALACIONES",
    report.facilities.join(", "),
    "Sin instalaciones con registros aceptados",
  );
  field(
    "PERIODOS",
    report.periods.map(formatPeriodLabel).join(", "),
    "Sin periodo reportado",
  );
  field("REGISTROS INCLUIDOS", report.runCount);

  section("Emisiones por alcance");
  if (report.emissionsByScope.length) {
    for (const item of report.emissionsByScope)
      paragraph(`${item.scope}: ${formatNumber(item.tonnes)} tCO2e`, {
        size: 9,
        bold: true,
        gap: 2,
      });
  } else {
    paragraph(
      "Aun no hay corridas aceptadas con emisiones de GEI cuantificadas.",
      { size: 9 },
    );
  }
  paragraph(
    "Los contaminantes criterio (PM10, NOx, SOx y VOC) se reportan por separado en masa; no se convierten a CO2e.",
    { size: 8, color: [90, 103, 93] },
  );

  section("Biblioteca y factores pendientes");
  paragraph(
    `Biblioteca activa: ${formatNumber(report.factorLibrary?.factorCount ?? 0)} factores y ${formatNumber(report.factorLibrary?.sourceCount ?? 0)} fuentes. Factores nacionales pendientes de validacion oficial: ${formatNumber(report.factorLibrary?.pendingNationalCount ?? 0)}.`,
    { size: 8.3 },
  );
  if (report.pendingFactors.length) {
    for (const factor of report.pendingFactors)
      paragraph(
        `${cleanText(factor.name)} (${cleanText(factor.code)}): ${formatNumber(factor.value)} ${cleanText(factor.unit)} - ${cleanText(factor.status)}. El factor conserva su estatus y cualquier fallback se informa en la corrida correspondiente.`,
        { size: 7.8, color: [153, 96, 35] },
      );
  }

  section("Uso de inteligencia artificial e internet");
  const digitalMetricLabel = (
    label: string,
    metric: DigitalMetricSummary,
    unit: string,
  ) => {
    const value =
      metric.value === null
        ? metric.recordsWithValue
          ? `Dato parcial: ${metric.recordsWithValue} de ${metric.totalRecords} registros; no se totaliza`
          : "No informado"
        : `${formatNumber(metric.value)} ${unit}`;
    paragraph(`${label}: ${value}`, { size: 8.2 });
  };
  for (const [title, summary, usageLabel, usageUnit] of [
    [
      "Inteligencia artificial",
      report.digitalUsage.ai,
      "Solicitudes",
      "solicitudes",
    ],
    ["Internet", report.digitalUsage.internet, "Tráfico total", "GB"],
  ] as const) {
    paragraph(
      `${title}: ${summary.usageTotal === null ? "sin registros" : `${formatNumber(summary.usageTotal)} ${usageUnit}`} en ${formatNumber(summary.records)} registros. Proveedores: ${summary.providers.join(", ") || "no informado"}.`,
      { size: 8.5, bold: true },
    );
    digitalMetricLabel(
      usageLabel === "Solicitudes" ? "Tokens de entrada" : "Tráfico de subida",
      usageLabel === "Solicitudes" ? summary.inputTokens : summary.uploadGb,
      usageLabel === "Solicitudes" ? "tokens" : "GB",
    );
    digitalMetricLabel(
      usageLabel === "Solicitudes" ? "Tokens de salida" : "Tráfico de descarga",
      usageLabel === "Solicitudes" ? summary.outputTokens : summary.downloadGb,
      usageLabel === "Solicitudes" ? "tokens" : "GB",
    );
    digitalMetricLabel(
      "Energía informada por fuente",
      summary.energyKwh,
      "kWh",
    );
    digitalMetricLabel("Agua informada por fuente", summary.waterM3, "m3");
    digitalMetricLabel(
      "GEI informado por fuente (no asignado a Scope)",
      summary.reportedCo2eKg,
      "kgCO2e",
    );
  }
  paragraph(
    "Solicitudes, tokens y GB son métricas de uso, no factores de emisión. No se convierten a energía, agua o GEI; los valores ambientales informados por proveedores se mantienen fuera de los totales por alcance corporativo.",
    { size: 7.8, color: [90, 103, 93] },
  );

  section("Indicadores normalizados");
  if (report.normalizedIndicators.length) {
    for (const item of report.normalizedIndicators)
      paragraph(
        `${categoryLabel(item.category)}: ${formatNumber(item.value)} ${cleanText(item.unit)} (denominador ${formatNumber(item.denominator)} ${cleanText(item.denominatorUnit)})`,
        { size: 8.5 },
      );
  } else {
    paragraph(
      "No hay denominadores de actividad documentados para calcular intensidades.",
      { size: 8.5 },
    );
  }

  section("Registros y trazabilidad");
  for (const run of report.runs) {
    ensureSpace(30);
    const activity = activityFrom(run);
    pdf.setFillColor(246, 248, 246);
    pdf.roundedRect(margin, y - 2, contentWidth, 1, 0.5, 0.5, "F");
    paragraph(
      `${categoryLabel(run.category)} - ${formatPeriodLabel(run.reportingPeriod)} - ${run.scope}`,
      { size: 9.2, bold: true, color: [24, 63, 52], gap: 1.2 },
    );
    paragraph(
      `${cleanText(activity?.facilityName, "Instalacion")} | Actividad: ${formatNumber(run.normalizedValue)} ${run.normalizedUnit}`,
      { size: 8.2, gap: 1 },
    );
    if (run.digitalUsage) {
      paragraph(
        `Uso registrado: ${formatNumber(run.activityValue)} ${run.activityUnit} · ${cleanText(run.digitalUsage.provider)}${run.digitalUsage.model ? ` · ${cleanText(run.digitalUsage.model)}` : ""}.`,
        { size: 8.2, gap: 1 },
      );
      if (run.digitalUsage.reportedCo2eKg !== undefined)
        paragraph(
          `GEI reportado por la fuente: ${formatNumber(run.digitalUsage.reportedCo2eKg)} kgCO2e. Se conserva fuera de los alcances corporativos.`,
          { size: 8.2, gap: 1 },
        );
      else
        paragraph(
          "Impacto ambiental no cuantificado; no se derivan emisiones del uso digital.",
          { size: 8.2, gap: 1 },
        );
    } else if (run.co2eTotalTonnes !== null)
      paragraph(`Resultado: ${formatNumber(run.co2eTotalTonnes)} tCO2e`, {
        size: 8.5,
        bold: true,
        gap: 1,
      });
    else
      paragraph(
        `Contaminante: ${cleanText(run.snapshot.airClassification, categoryLabel(run.category))} - ${formatNumber(run.metricValue)} ${run.metricUnit}; sin conversion a CO2e`,
        { size: 8.2, gap: 1 },
      );
    paragraph(
      `Calidad: ${formatNumber(run.dataQualityScore)}/10 (${cleanText(run.dataQualityRating)}) | Factor: ${cleanText(run.factorUsed)} | Estado: ${cleanText(run.factorStatus)}`,
      { size: 7.8, gap: 1 },
    );
    paragraph(
      `Fuente de actividad: ${cleanText(run.sourceReference)} | Incertidumbre: +/-${formatNumber(run.uncertaintyPct)}%${run.fallbackApplied ? " | Fallback aplicado: incertidumbre metodologica" : ""}`,
      { size: 7.8, gap: 1 },
    );
    if (run.waterBalanceDifferenceM3 !== undefined)
      paragraph(
        `Balance hidrico: diferencia de balance / agua no contabilizada = ${formatNumber(run.waterBalanceDifferenceM3)} m3. No se interpreta automaticamente como perdida.`,
        { size: 7.8, color: [75, 91, 79], gap: 1 },
      );
    if (run.balanceDifferenceKg !== undefined)
      paragraph(
        `Balance de masa: diferencia entre entrada, producto y subproducto = ${formatNumber(run.balanceDifferenceKg)} kg.`,
        { size: 7.8, color: [75, 91, 79], gap: 1 },
      );
    if (run.circularityIndexPct !== undefined)
      paragraph(
        `Circularidad operativa reportada: ${formatNumber(run.circularityIndexPct)}%. Recuperacion efectiva: ${run.recoverableMaterialPct === undefined ? "No disponible" : `${formatNumber(run.recoverableMaterialPct)}%`}.`,
        { size: 7.8, color: [75, 91, 79], gap: 1 },
      );
    if (run.warnings.length)
      paragraph(`Advertencias: ${run.warnings.join("; ")}`, {
        size: 7.4,
        color: [153, 96, 35],
        gap: 1,
      });
    y += 2;
  }

  section("Mapa de perdidas y destinos");
  const waterBalances = report.runs.filter(
    (run) => run.waterBalanceDifferenceM3 !== undefined,
  );
  const massBalances = report.runs.filter(
    (run) => run.balanceDifferenceKg !== undefined,
  );
  const wasteRuns = report.runs.filter((run) => run.category === "WASTE");
  if (!waterBalances.length && !massBalances.length && !wasteRuns.length)
    paragraph(
      "No hay balances de agua, balances de masa o destinos de residuos documentados.",
      { size: 8.5 },
    );
  for (const run of waterBalances)
    paragraph(
      `Agua - ${formatPeriodLabel(run.reportingPeriod)}: diferencia de balance / agua no contabilizada ${formatNumber(run.waterBalanceDifferenceM3 ?? 0)} m3.`,
      { size: 8.3 },
    );
  for (const run of massBalances)
    paragraph(
      `Materiales - ${formatPeriodLabel(run.reportingPeriod)}: diferencia del balance ${formatNumber(run.balanceDifferenceKg ?? 0)} kg.`,
      { size: 8.3 },
    );
  for (const run of wasteRuns)
    paragraph(
      `Residuos - ${formatPeriodLabel(run.reportingPeriod)}: ${formatNumber(run.normalizedValue)} ${run.normalizedUnit}; destino/factor ${cleanText(run.factorUsed)}${run.fallbackApplied ? " (fallback aplicado)" : ""}.`,
      { size: 8.3 },
    );

  section("Circularidad y recuperacion efectiva");
  const circularRuns = report.runs.filter(
    (run) => run.category === "MATERIAL" || run.category === "PACKAGING",
  );
  if (!circularRuns.length)
    paragraph(
      "No hay registros de materiales o empaques para evaluar circularidad.",
      { size: 8.5 },
    );
  for (const run of circularRuns) {
    const activity = activityFrom(run);
    paragraph(
      `${categoryLabel(run.category)} - ${formatPeriodLabel(run.reportingPeriod)}: ICO ${run.circularityIndexPct === undefined ? "no disponible" : `${formatNumber(run.circularityIndexPct)}%`}; recuperacion efectiva ${run.recoverableMaterialPct === undefined ? "no documentada" : `${formatNumber(run.recoverableMaterialPct)}%`}.`,
      { size: 8.3 },
    );
    if (activity?.recoveredMassKg !== undefined)
      paragraph(
        `Masa efectivamente recuperada reportada: ${formatNumber(activity.recoveredMassKg)} kg. La reciclabilidad potencial no se interpreta como recuperacion efectiva.`,
        { size: 7.8, color: [75, 91, 79] },
      );
  }

  section("Emisiones al aire y contaminantes criterio");
  const airRuns = report.runs.filter((run) => run.category === "AIR");
  if (!airRuns.length)
    paragraph("No hay registros de emisiones al aire.", { size: 8.5 });
  for (const run of airRuns) {
    const classification = cleanText(
      run.snapshot.airClassification,
      "Clasificacion no disponible",
    );
    const result =
      run.co2eTotalTonnes === null
        ? `${formatNumber(run.metricValue)} ${run.metricUnit} de contaminante`
        : `${formatNumber(run.co2eTotalTonnes)} tCO2e`;
    paragraph(
      `${classification}: ${result} - ${formatPeriodLabel(run.reportingPeriod)}.`,
      { size: 8.3 },
    );
  }

  section("Calidad del diagnostico");
  if (report.dataQuality.meanScore === null)
    paragraph("No hay puntajes DQ disponibles.", { size: 8.5 });
  else
    paragraph(
      `Indice DQ promedio: ${formatNumber(report.dataQuality.meanScore)} / 10, calculado sobre registros aceptados.`,
      { size: 8.5, bold: true },
    );
  for (const dimension of report.dataQuality.dimensions)
    paragraph(
      `${dimension.label}: ${dimension.score === null ? "sin datos" : `${formatNumber(dimension.score)} / 2 promedio`}`,
      { size: 8.1 },
    );
  if (report.dataQuality.ratings.some((rating) => rating.fallbackApplied))
    paragraph(
      "Los resultados con fallback mantienen visible el estado pendiente del factor y la incertidumbre asociada; no equivalen a una validacion oficial.",
      { size: 8, color: [153, 96, 35] },
    );

  section("Recomendaciones priorizadas");
  if (!report.recommendations.length)
    paragraph(
      "No hay recomendaciones activadas por los umbrales de los registros incluidos.",
      { size: 8.5 },
    );
  for (const item of report.recommendations) {
    paragraph(
      `${cleanText(item.action, "Accion recomendada")} - prioridad ${cleanText(item.priority, "No asignada")}`,
      { size: 8.5, bold: true, color: [24, 63, 52], gap: 1 },
    );
    if (item.probableCause)
      paragraph(`Causa probable: ${item.probableCause}`, { size: 7.8, gap: 1 });
    if (item.opportunity)
      paragraph(`Oportunidad: ${item.opportunity}`, { size: 7.8, gap: 1 });
    paragraph(
      `Inversion indicativa: ${cleanText(item.investment)} | Plazo: ${cleanText(item.timeframe)} | Disponibilidad en Venezuela: ${cleanText(item.venezuelaAvailability)} | Payback: ${item.paybackMonths === null || item.paybackMonths === undefined ? "requiere CAPEX y ahorro verificados" : `${formatNumber(item.paybackMonths)} meses`}`,
      { size: 7.8, gap: 2.5 },
    );
  }

  section("Ruta de implementacion");
  for (const phase of report.roadmap) {
    paragraph(`${cleanText(phase.horizon)} - ${cleanText(phase.name)}`, {
      size: 8.5,
      bold: true,
      color: [24, 63, 52],
      gap: 1,
    });
    paragraph(`Objetivo: ${phase.objectives}`, { size: 7.8, gap: 1 });
    paragraph(`Entregable: ${phase.output}`, { size: 7.8, gap: 2.5 });
  }

  paragraph(
    "Metodologia: SW Factor Library v1.0.0 y snapshots conservados por corrida. Este diagnostico no constituye un inventario verificado ni una certificacion. Los factores con estado PENDIENTE_VALIDACION_OFICIAL y sus reglas de respaldo se identifican expresamente; la incertidumbre no debe interpretarse como validacion oficial.",
    { size: 7.5, color: [91, 103, 94], gap: 2 },
  );

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(220, 227, 220);
    pdf.setLineWidth(0.25);
    pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(117, 128, 119);
    pdf.text(
      "Uso interno - Diagnostico ambiental no verificado",
      margin,
      pageHeight - 8,
    );
    pdf.text(
      `Pagina ${page} de ${pageCount}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: "right" },
    );
  }

  return pdf;
}

function formatPeriodLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return cleanText(period);
  return new Intl.DateTimeFormat("es-VE", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    ELECTRICITY: "Electricidad",
    FUEL: "Combustible",
    WATER: "Agua",
    WASTE: "Residuos",
    MATERIAL: "Materiales",
    PACKAGING: "Empaques",
    REFRIGERANT: "Refrigerantes",
    AIR: "Emisiones al aire",
    AI: "Uso de inteligencia artificial",
    INTERNET: "Uso de internet",
  };
  return labels[category] ?? cleanText(category);
}
