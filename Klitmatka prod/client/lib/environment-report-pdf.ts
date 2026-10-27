import { jsPDF } from "jspdf";
import klimatkaCover from "./klimatka-cover.jpg?inline";
import klimatkaLogo from "./klimatka-logo.png?inline";
import type {
  CalculationResult,
  EnvironmentalInput,
} from "@shared/environment";
import type { EnvironmentalReport } from "./environment-report";

const colors = {
  forest: [7, 48, 45] as [number, number, number],
  forestLight: [15, 73, 63] as [number, number, number],
  green: [49, 205, 145] as [number, number, number],
  ink: [24, 34, 32] as [number, number, number],
  body: [60, 72, 67] as [number, number, number],
  muted: [104, 119, 112] as [number, number, number],
  mint: [224, 241, 234] as [number, number, number],
  paleMint: [239, 248, 243] as [number, number, number],
  paleGray: [245, 247, 246] as [number, number, number],
  line: [202, 220, 212] as [number, number, number],
  amber: [255, 243, 204] as [number, number, number],
  amberInk: [135, 91, 24] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const num = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("es-VE", { maximumFractionDigits: digits }).format(
        value,
      );
const text = (value: unknown, fallback = "No especificado") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value)
    .replace(/[–—]/g, "-")
    .replace(/[·•]/g, "·")
    .replace(/₂/g, "2")
    .replace(/₃/g, "3")
    .replace(/³/g, "3")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[^\x20-\xFF]/g, " ");
};
const formatPeriod = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return text(period);
  return new Intl.DateTimeFormat("es-VE", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};
const inputFrom = (run: CalculationResult) =>
  run.snapshot.activity as EnvironmentalInput | undefined;
const categoryName = (category: string) =>
  ({
    ELECTRICITY: "Electricidad",
    FUEL: "Combustible",
    WATER: "Agua",
    WASTE: "Residuos",
    MATERIAL: "Materiales",
    PACKAGING: "Empaques",
    REFRIGERANT: "Refrigerantes",
    AIR: "Emisiones al aire",
    AI: "Inteligencia artificial",
    INTERNET: "Internet",
  })[category] ?? text(category);
const factorSource = (run: CalculationResult, report: EnvironmentalReport) => {
  const factor = run.snapshot.factor as Record<string, unknown> | undefined;
  const scope2 = run.snapshot.scope2Method as
    Record<string, unknown> | undefined;
  const reference =
    scope2?.source ?? factor?.source_id ?? run.snapshot.factorSourceReference;
  if (typeof reference !== "string") return "No identificada";
  return report.factorSources[reference]
    ? `${reference} · ${report.factorSources[reference]}`
    : reference;
};

export function buildEnvironmentalReportPdfTemplate(
  report: EnvironmentalReport,
) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const width = pageWidth - margin * 2;
  const contentBottom = pageHeight - 17;
  const dateLabel = new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Caracas",
  }).format(new Date(report.generatedAt));
  const periodLabel = report.periods.length
    ? report.periods.map(formatPeriod).join(" · ")
    : "Sin período reportado";
  let y = 0;
  let currentSection = "Informe ambiental";

  pdf.setProperties({
    title: "Reporte ejecutivo - Diagnóstico de desempeño ambiental",
    subject: "Línea base, calidad de datos y oportunidades de mejora ambiental",
    author: "Klimatka · Inteligencia Ambiental Empresarial",
    creator: "Klimatka · Inteligencia Ambiental Empresarial",
  });

  const header = () => {
    pdf.setFillColor(...colors.forest);
    pdf.rect(0, 0, pageWidth, 2.2, "F");
    pdf.addImage(klimatkaLogo, "PNG", margin, 2.5, 30, 19.41);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...colors.muted);
    pdf.text(text(report.companyName) + " · " + periodLabel, pageWidth - margin, 10, {
      align: "right",
    });
  };

  const continuationPage = () => {
    pdf.addPage();
    header();
    y = 24;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.muted);
    pdf.text(text(currentSection.toUpperCase() + " · CONTINUACIÓN"), margin, y);
    y += 8;
  };

  const writeParagraph = (
    value: unknown,
    options: {
      size?: number;
      color?: [number, number, number];
      bold?: boolean;
      x?: number;
      maxWidth?: number;
      gap?: number;
    } = {},
  ) => {
    const {
      size = 8.5,
      color = colors.body,
      bold = false,
      x = margin,
      maxWidth = width,
      gap = 2,
    } = options;
    const lines = pdf.splitTextToSize(text(value), maxWidth) as string[];
    const lineHeight = Math.max(3.4, size * 0.46);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    let offset = 0;
    while (offset < lines.length) {
      const availableLines = Math.floor((contentBottom - y - gap) / lineHeight);
      if (availableLines < 1) {
        continuationPage();
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(size);
        pdf.setTextColor(...color);
        continue;
      }
      const chunk = lines.slice(offset, offset + availableLines);
      pdf.text(chunk, x, y);
      y += chunk.length * lineHeight;
      offset += chunk.length;
      if (offset < lines.length) continuationPage();
    }
    y += gap;
  };

  const sectionHeading = (title: string) => {
    currentSection = title;
    if (y + 12 > contentBottom) continuationPage();
    y += 2;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...colors.ink);
    pdf.text(text(title), margin, y + 4.5);
    y += 8;
    pdf.setDrawColor(...colors.line);
    pdf.setLineWidth(0.35);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  const startPage = (title: string) => {
    sectionHeading(title);
  };

  const drawTable = (
    headers: string[],
    rows: string[][],
    ratios?: number[],
  ) => {
    const columnWidths = (ratios ?? headers.map(() => 1)).map(
      (ratio) =>
        (width * ratio) /
        (ratios ?? headers.map(() => 1)).reduce((sum, item) => sum + item, 0),
    );
    const drawHeader = () => {
      const linesByColumn = headers.map(
        (label, index) =>
          pdf.splitTextToSize(text(label), columnWidths[index] - 4) as string[],
      );
      const headerHeight = Math.max(
        9,
        Math.max(...linesByColumn.map((lines) => lines.length)) * 3.6 + 4,
      );
      pdf.setFillColor(...colors.mint);
      pdf.setDrawColor(...colors.line);
      pdf.setLineWidth(0.25);
      pdf.rect(margin, y, width, headerHeight, "FD");
      let x = margin;
      linesByColumn.forEach((lines, index) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.7);
        pdf.setTextColor(...colors.ink);
        pdf.text(lines, x + 2, y + 4.7);
        x += columnWidths[index];
        if (index < headers.length - 1) pdf.line(x, y, x, y + headerHeight);
      });
      y += headerHeight;
    };
    drawHeader();
    rows.forEach((row, rowIndex) => {
      const cellLines = headers.map(
        (_, index) =>
          pdf.splitTextToSize(
            text(row[index] ?? ""),
            columnWidths[index] - 4,
          ) as string[],
      );
      const lineCount = Math.max(1, ...cellLines.map((lines) => lines.length));
      const rowHeight = Math.max(8, lineCount * 4 + 4);
      if (y + rowHeight > contentBottom) {
        continuationPage();
        drawHeader();
      }
      pdf.setFillColor(
        ...(rowIndex % 2 === 0 ? colors.white : colors.paleGray),
      );
      pdf.setDrawColor(...colors.line);
      pdf.setLineWidth(0.2);
      pdf.rect(margin, y, width, rowHeight, "FD");
      let x = margin;
      cellLines.forEach((lines, index) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.4);
        pdf.setTextColor(...colors.body);
        pdf.text(lines, x + 2, y + 4.8);
        x += columnWidths[index];
        if (index < headers.length - 1) pdf.line(x, y, x, y + rowHeight);
      });
      y += rowHeight;
    });
    y += 3;
  };

  const callout = (
    title: string,
    body: string,
    tone: "mint" | "amber" | "gray" = "mint",
  ) => {
    const fill =
      tone === "amber"
        ? colors.amber
        : tone === "gray"
          ? colors.paleGray
          : colors.paleMint;
    const ink = tone === "amber" ? colors.amberInk : colors.body;
    const titleLines = pdf.splitTextToSize(text(title), width - 10) as string[];
    const bodyLines = pdf.splitTextToSize(text(body), width - 10) as string[];
    const height = 8 + titleLines.length * 4.1 + bodyLines.length * 4.1 + 4;
    if (y + height > contentBottom) continuationPage();
    pdf.setFillColor(...fill);
    pdf.roundedRect(margin, y, width, height, 2.2, 2.2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.3);
    pdf.setTextColor(...ink);
    pdf.text(titleLines, margin + 5, y + 6);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.8);
    pdf.setTextColor(...colors.body);
    pdf.text(bodyLines, margin + 5, y + 6 + titleLines.length * 4.1 + 1);
    y += height + 4;
  };

  const metricCard = (
    x: number,
    top: number,
    cardWidth: number,
    label: string,
    value: string,
    unit: string,
  ) => {
    pdf.setFillColor(...colors.paleMint);
    pdf.roundedRect(x, top, cardWidth, 39, 2.5, 2.5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.2);
    pdf.setTextColor(...colors.ink);
    pdf.text(text(label), x + 4, top + 7);
    pdf.setFontSize(16);
    pdf.setTextColor(...colors.forestLight);
    pdf.text(text(value), x + 4, top + 19);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...colors.muted);
    pdf.text(text(unit), x + 4, top + 26);
  };

  const rowLabel = (label: string, value: unknown) => [label, text(value)];

  const drawRun = (run: CalculationResult) => {
    const activity = inputFrom(run);
    pdf.setFillColor(...colors.paleGray);
    pdf.roundedRect(margin, y, width, 5, 1, 1, "F");
    y += 2;
    writeParagraph(
      `${categoryName(run.category)} · ${formatPeriod(run.reportingPeriod)}`,
      { size: 9.4, color: colors.forest, bold: true, gap: 1.5 },
    );
    writeParagraph(
      `Categoría: ${text(run.scope)} · Ubicación: ${text(activity?.facilityName, text(run.geography))}`,
      { size: 8, gap: 1 },
    );
    writeParagraph(
      `Actividad: ${num(run.normalizedValue)} ${text(run.normalizedUnit)} · ${run.co2eTotalTonnes === null ? `Indicador: ${num(run.metricValue)} ${text(run.metricUnit)} · sin conversión a CO2e` : `Resultado: ${num(run.co2eTotalTonnes, 3)} tCO2e`}`,
      { size: 8, bold: true, gap: 1 },
    );
    writeParagraph(
      `Calidad: ${num(run.dataQualityScore, 0)}/10 (${text(run.dataQualityRating)}) · Factor: ${text(run.factorUsed)} · Fuente del factor: ${text(factorSource(run, report))}`,
      { size: 7.5, gap: 1 },
    );
    writeParagraph(
      `Fuente de actividad: ${text(run.sourceReference)} · Incertidumbre: ±${num(run.uncertaintyPct, 1)}% · Estado: ${text(run.factorStatus)}`,
      { size: 7.5, gap: 1 },
    );
    if (run.fallbackApplied)
      writeParagraph(
        "Fallback aplicado. Consulte la advertencia metodológica de esta corrida; el resultado no equivale a validación oficial.",
        { size: 7.3, color: colors.amberInk, gap: 1 },
      );
    if (run.digitalUsage) {
      writeParagraph(
        `Uso digital informado: ${text(run.digitalUsage.provider)}${run.digitalUsage.model ? ` · ${text(run.digitalUsage.model)}` : ""}. No se infieren GEI a partir de tokens o tráfico.`,
        { size: 7.4, gap: 1 },
      );
      if (run.digitalUsage.reportedCo2eKg !== undefined)
        writeParagraph(
          `GEI reportado por la fuente: ${num(run.digitalUsage.reportedCo2eKg)} kgCO2e; se mantiene separado del inventario calculado.`,
          { size: 7.4, gap: 1 },
        );
    }
    if (run.waterBalanceDifferenceM3 !== undefined)
      writeParagraph(
        `Balance hídrico: diferencia registrada de ${num(run.waterBalanceDifferenceM3)} m3; no se atribuye automáticamente a una pérdida.`,
        { size: 7.4, gap: 1 },
      );
    if (run.balanceDifferenceKg !== undefined)
      writeParagraph(
        `Balance de masa: diferencia registrada de ${num(run.balanceDifferenceKg)} kg.`,
        { size: 7.4, gap: 1 },
      );
    if (run.circularityIndexPct !== undefined)
      writeParagraph(
        `Índice de circularidad: ${num(run.circularityIndexPct)}%. Recuperación calculada respecto a la masa registrada: ${run.recoverableMaterialPct === undefined ? "no disponible" : `${num(run.recoverableMaterialPct)}%`}.`,
        { size: 7.4, gap: 1 },
      );
    if (run.warnings.length)
      writeParagraph(`Advertencias: ${run.warnings.join("; ")}`, {
        size: 7.1,
        color: colors.amberInk,
        gap: 2,
      });
    y += 2;
  };

  const drawCoverHero = () => {
    const coverProperties = pdf.getImageProperties(klimatkaCover);
    const coverHeight =
      (pageWidth * coverProperties.height) / coverProperties.width;
    pdf.addImage(klimatkaCover, "JPEG", 0, 0, pageWidth, coverHeight);

    const logoProperties = pdf.getImageProperties(klimatkaLogo);
    const logoWidth = 28.5;
    const logoHeight =
      (logoWidth * logoProperties.height) / logoProperties.width;
    const badgePadding = 2.5;
    const badgeWidth = logoWidth + badgePadding * 2;
    const badgeHeight = logoHeight + badgePadding * 2;
    const badgeX = pageWidth - margin - badgeWidth;
    const badgeY = 5;

    pdf.saveGraphicsState();
    pdf.setGState(pdf.GState({ opacity: 0.88 }));
    pdf.setFillColor(...colors.white);
    pdf.setDrawColor(...colors.line);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, "FD");
    pdf.restoreGraphicsState();
    pdf.addImage(
      klimatkaLogo,
      "PNG",
      badgeX + badgePadding,
      badgeY + badgePadding,
      logoWidth,
      logoHeight,
    );
    return coverHeight;
  };

  const coverTable = (rows: string[][]) => {
    const col1 = 61;
    const col2 = width - col1;
    rows.forEach(([label, value], index) => {
      const valueLines = pdf.splitTextToSize(text(value), col2 - 6) as string[];
      const rowHeight = Math.max(8, valueLines.length * 4.2 + 3);
      pdf.setFillColor(...(index % 2 ? colors.white : colors.paleGray));
      pdf.setDrawColor(...colors.line);
      pdf.rect(margin, y, width, rowHeight, "FD");
      pdf.line(margin + col1, y, margin + col1, y + rowHeight);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.6);
      pdf.setTextColor(...colors.ink);
      pdf.text(text(label), margin + 3, y + 5.2);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...colors.body);
      pdf.text(valueLines, margin + col1 + 3, y + 5.2);
      y += rowHeight;
    });
    y += 4;
  };

  y = drawCoverHero() + 14.5;
  currentSection = "Línea base ambiental";
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...colors.ink);
  pdf.text("Línea base ambiental", margin, y);
  y += 7;
  pdf.setDrawColor(...colors.line);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;
  coverTable([
    rowLabel("Organización", report.companyName),
    rowLabel("Período", periodLabel),
    rowLabel("Fecha de generación", dateLabel),
    rowLabel("Responsable", "No especificado"),
    rowLabel("Versión del reporte", "Klimatka · SW Factor Library v1.0.0"),
  ]);
  callout(
    "Uso interno · Diagnóstico ambiental no verificado",
    "Reporte generado a partir de registros aceptados por el motor. Conserva la trazabilidad de las corridas y no constituye una certificación ni una verificación externa.",
    "mint",
  );

  startPage("Resumen ejecutivo");
  writeParagraph(
    `Este reporte resume ${num(report.runCount, 0)} registros aceptados por el motor para ${report.companyName} durante ${periodLabel}. Las cifras disponibles mantienen visibles su factor, fuente, calidad e incertidumbre para facilitar la revisión del diagnóstico.`,
    { size: 8.7, gap: 4 },
  );
  if (report.excludedUnreliableCount > 0)
    callout(
      "Registros excluidos",
      `${num(report.excludedUnreliableCount, 0)} registro(s) con calidad insuficiente se excluyeron de los resultados del PDF.`,
      "amber",
    );
  const cardGap = 3;
  const cardWidth = (width - cardGap * 3) / 4;
  const cardY = y;
  metricCard(
    margin,
    cardY,
    cardWidth,
    "Emisiones GEI",
    num(report.emissionsTonnes),
    "tCO2e calculadas",
  );
  metricCard(
    margin + cardWidth + cardGap,
    cardY,
    cardWidth,
    "Electricidad",
    num(report.electricityKwh, 0),
    "kWh normalizados",
  );
  metricCard(
    margin + (cardWidth + cardGap) * 2,
    cardY,
    cardWidth,
    "Agua gestionada",
    num(report.waterM3),
    "m3 normalizados",
  );
  metricCard(
    margin + (cardWidth + cardGap) * 3,
    cardY,
    cardWidth,
    "Residuos",
    num(report.wasteTonnes),
    "t normalizadas",
  );
  y += 44;
  callout(
    "Nota de trazabilidad",
    "Se incluyen corridas aceptadas. Los intentos rechazados por validación no se guardan ni se presentan como resultados; cada cifra conserva su factor, fuente, calidad e incertidumbre.",
    "gray",
  );
  sectionHeading("Alcance de la línea base");
  drawTable(
    ["Elemento", "Detalle"],
    [
      [
        "Instalaciones",
        report.facilities.join(", ") ||
          "Sin instalaciones con registros aceptados",
      ],
      [
        "Períodos",
        report.periods.map(formatPeriod).join(", ") || "Sin período reportado",
      ],
      ["Registros incluidos", num(report.runCount, 0)],
      [
        "Emisiones por alcance",
        report.emissionsByScope.length
          ? report.emissionsByScope
              .map((item) => `${text(item.scope)}: ${num(item.tonnes)} tCO2e`)
              .join(" · ")
          : "Sin emisiones GEI cuantificadas",
      ],
    ],
    [1, 2.4],
  );
  callout(
    "Nota de interpretación",
    "Los contaminantes criterio (PM10, NOx, SOx y VOC) se reportan por separado en masa; no se convierten a CO2e.",
    "gray",
  );

  startPage("Biblioteca y factores pendientes");
  const library = report.factorLibrary;
  writeParagraph(
    `Biblioteca activa: ${num(library?.factorCount, 0)} factores y ${num(library?.sourceCount, 0)} fuentes. Factores nacionales pendientes de validación oficial: ${num(library?.pendingNationalCount, 0)}.`,
    { size: 8.5, gap: 4 },
  );
  if (report.pendingFactors.length) {
    drawTable(
      ["Factor", "Código", "Valor", "Estado"],
      report.pendingFactors.map((factor) => [
        text(factor.name),
        text(factor.code),
        `${num(factor.value)} ${text(factor.unit)}`,
        text(factor.status),
      ]),
      [1.35, 1.1, 1.1, 1.4],
    );
  } else {
    callout(
      "Estado actual",
      "No se reportan factores nacionales pendientes de validación oficial en la biblioteca consultada.",
      "gray",
    );
  }
  writeParagraph(
    "El factor conserva su estatus y cualquier fallback se informa en la corrida correspondiente. No se modifica el estado sin validación oficial documentada.",
    { size: 7.8, color: colors.muted, gap: 5 },
  );
  sectionHeading("Indicadores normalizados");
  if (report.normalizedIndicators.length) {
    drawTable(
      ["Indicador", "Denominador", "Resultado", "Período"],
      report.normalizedIndicators.map((item) => [
        categoryName(item.category),
        `${num(item.denominator)} ${text(item.denominatorUnit)}`,
        `${num(item.value)} ${text(item.unit)}`,
        text(
          report.runs.find((run) => run.calculationId === item.calculationId)
            ?.reportingPeriod ?? "",
        ),
      ]),
      [1, 1.3, 1, 0.8],
    );
  } else {
    callout(
      "Estado actual",
      "No hay denominadores de actividad documentados para calcular intensidades.",
      "amber",
    );
  }
  sectionHeading("Uso de IA e internet");
  const digitalMetricLabel = (
    metric: {
      value: number | null;
      recordsWithValue: number;
      totalRecords: number;
    },
    unit: string,
  ) =>
    metric.value === null
      ? metric.recordsWithValue
        ? `Parcial: ${num(metric.recordsWithValue, 0)} de ${num(metric.totalRecords, 0)} registros`
        : "No informado"
      : `${num(metric.value)} ${unit}`;
  const digitalRows = (
    [
      ["Inteligencia artificial", report.digitalUsage.ai, "solicitudes"],
      ["Internet", report.digitalUsage.internet, "GB de tráfico"],
    ] as const
  ).map(([label, summary, unit]) => [
    label,
    summary.records ? `${num(summary.usageTotal)} ${unit}` : "Sin registros",
    summary.providers.join(", ") || "No informado",
    digitalMetricLabel(summary.reportedCo2eKg, "kgCO2e"),
  ]);
  drawTable(
    ["Módulo", "Uso registrado", "Proveedor", "GEI reportado"],
    digitalRows,
    [0.9, 1.1, 1.3, 1.1],
  );
  writeParagraph(
    `IA · Tokens de entrada: ${digitalMetricLabel(report.digitalUsage.ai.inputTokens, "tokens")} · Tokens de salida: ${digitalMetricLabel(report.digitalUsage.ai.outputTokens, "tokens")} · Energía informada: ${digitalMetricLabel(report.digitalUsage.ai.energyKwh, "kWh")} · Agua informada: ${digitalMetricLabel(report.digitalUsage.ai.waterM3, "m3")}`,
    { size: 7.1, gap: 1 },
  );
  writeParagraph(
    `Internet · Subida: ${digitalMetricLabel(report.digitalUsage.internet.uploadGb, "GB")} · Descarga: ${digitalMetricLabel(report.digitalUsage.internet.downloadGb, "GB")} · Energía informada: ${digitalMetricLabel(report.digitalUsage.internet.energyKwh, "kWh")} · Agua informada: ${digitalMetricLabel(report.digitalUsage.internet.waterM3, "m3")}`,
    { size: 7.1, gap: 2 },
  );
  writeParagraph(
    "Las solicitudes, tokens y GB son métricas de actividad, no factores de emisión. No se convierten a energía, agua o GEI; los impactos informados por proveedores se mantienen separados de los totales por alcance.",
    { size: 7.5, color: colors.muted },
  );

  startPage("Registros y trazabilidad");
  writeParagraph(
    "Fichas de corridas aceptadas con actividad, período, ubicación, resultado, calidad, factor, fuente, incertidumbre, estado y advertencias.",
    { size: 8.3, gap: 4 },
  );
  if (!report.runs.length)
    writeParagraph(
      "No hay registros aceptados para mostrar en el período seleccionado.",
      { size: 8.5 },
    );
  report.runs.forEach(drawRun);

  startPage("Mapa de pérdidas y destinos");
  const waterRuns = report.runs.filter(
    (run) => run.waterBalanceDifferenceM3 !== undefined,
  );
  const massRuns = report.runs.filter(
    (run) => run.balanceDifferenceKg !== undefined,
  );
  const wasteRuns = report.runs.filter((run) => run.category === "WASTE");
  if (!waterRuns.length && !massRuns.length && !wasteRuns.length) {
    callout(
      "Estado actual",
      "No hay balances de agua, balances de masa o destinos de residuos documentados.",
      "gray",
    );
  } else {
    const rows: string[][] = [];
    waterRuns.forEach((run) =>
      rows.push([
        "Balance de agua",
        `${num(run.waterBalanceDifferenceM3)} m3 de diferencia registrada`,
        formatPeriod(run.reportingPeriod),
      ]),
    );
    massRuns.forEach((run) =>
      rows.push([
        "Balance de masa",
        `${num(run.balanceDifferenceKg)} kg de diferencia registrada`,
        formatPeriod(run.reportingPeriod),
      ]),
    );
    wasteRuns.forEach((run) =>
      rows.push([
        "Destino de residuos",
        `${text(inputFrom(run)?.subcategory, "Destino no declarado")} · ${num(run.normalizedValue)} ${text(run.normalizedUnit)}${run.fallbackApplied ? " · fallback aplicado" : ""}`,
        formatPeriod(run.reportingPeriod),
      ]),
    );
    drawTable(["Módulo", "Datos documentados", "Período"], rows, [1, 2, 1]);
  }
  if (waterRuns.length || massRuns.length)
    writeParagraph(
      "Las diferencias de balance se presentan como valores registrados y no se atribuyen automáticamente a pérdidas o causas específicas.",
      { size: 7.6, color: colors.muted, gap: 5 },
    );
  sectionHeading("Circularidad y recuperación efectiva");
  const circularRuns = report.runs.filter(
    (run) => run.category === "MATERIAL" || run.category === "PACKAGING",
  );
  if (!circularRuns.length) {
    callout(
      "Estado actual",
      "No hay registros de materiales o empaques para evaluar circularidad.",
      "gray",
    );
  } else {
    const rows = circularRuns.map((run) => {
      const activity = inputFrom(run);
      return [
        categoryName(run.category),
        activity?.recoveredMassKg === undefined
          ? "No documentada"
          : `${num(activity.recoveredMassKg)} kg`,
        run.circularityIndexPct === undefined
          ? "No disponible"
          : `${num(run.circularityIndexPct)}%`,
        formatPeriod(run.reportingPeriod),
      ];
    });
    drawTable(
      ["Flujo o material", "Recuperación efectiva", "ICO", "Período"],
      rows,
      [1.2, 1.35, 0.7, 0.75],
    );
    writeParagraph(
      "La masa recuperada se muestra solo cuando fue reportada. La reciclabilidad potencial no se interpreta como recuperación efectiva.",
      { size: 7.6, color: colors.muted },
    );
  }

  startPage("Emisiones al aire y contaminantes criterio");
  const airRuns = report.runs.filter((run) => run.category === "AIR");
  if (!airRuns.length)
    callout("Estado actual", "No hay registros de emisiones al aire.", "gray");
  else
    drawTable(
      ["Contaminante", "Masa o resultado", "Fuente de actividad", "Período"],
      airRuns.map((run) => [
        text(run.snapshot.airClassification, categoryName(run.category)),
        run.co2eTotalTonnes === null
          ? `${num(run.metricValue)} ${text(run.metricUnit)}`
          : `${num(run.co2eTotalTonnes, 3)} tCO2e`,
        text(run.sourceReference),
        formatPeriod(run.reportingPeriod),
      ]),
      [1, 1, 1.2, 0.8],
    );
  writeParagraph(
    "Los contaminantes criterio se reportan en masa y no se convierten a CO2e. Solo se muestran como tCO2e los gases que el motor haya convertido a ese indicador.",
    { size: 7.6, color: colors.muted, gap: 5 },
  );
  sectionHeading("Calidad del diagnóstico");
  if (report.dataQuality.meanScore === null)
    callout(
      "Índice DQ promedio",
      "No hay puntajes de calidad disponibles.",
      "gray",
    );
  else
    callout(
      "Índice DQ promedio",
      `${num(report.dataQuality.meanScore)} / 10 · calculado sobre ${num(report.runCount, 0)} registros aceptados.`,
      "mint",
    );
  drawTable(
    ["Componente", "Resultado"],
    report.dataQuality.dimensions.map((dimension) => [
      text(dimension.label),
      dimension.score === null
        ? "Sin datos"
        : `${num(dimension.score)} / 2 promedio`,
    ]),
    [1.2, 1],
  );
  if (report.dataQuality.ratings.some((rating) => rating.fallbackApplied))
    callout(
      "Lectura de factores pendientes",
      "Los resultados con fallback conservan visible el estado pendiente del factor y la incertidumbre asociada; no equivalen a validación oficial.",
      "amber",
    );

  startPage("Recomendaciones priorizadas");
  if (!report.recommendations.length)
    callout(
      "Estado actual",
      "No hay recomendaciones activadas por los umbrales de los registros incluidos.",
      "gray",
    );
  else
    drawTable(
      ["Prioridad", "Hallazgo", "Acción", "Plazo", "Impacto esperado"],
      report.recommendations.map((item) => [
        text(item.priority),
        text(item.probableCause ?? item.opportunity),
        text(item.action),
        text(item.timeframe),
        item.paybackMonths == null
          ? "No cuantificado"
          : `${num(item.paybackMonths)} meses de retorno indicativo`,
      ]),
      [0.65, 1.2, 1.7, 0.85, 1.2],
    );
  writeParagraph(
    "Las acciones e impactos esperados son recomendaciones metodológicas. No representan acciones implementadas ni reducciones cuantificadas por Klimatka.",
    { size: 7.6, color: colors.muted, gap: 5 },
  );
  if (report.recommendations.length) {
    report.recommendations.forEach((item) => {
      if (item.investment || item.venezuelaAvailability)
        writeParagraph(
          `${text(item.action)} · Inversión indicativa: ${text(item.investment)} · Disponibilidad en Venezuela: ${text(item.venezuelaAvailability)}`,
          { size: 7.5, gap: 1.5 },
        );
    });
  }

  startPage("Ruta de implementación");
  if (report.roadmap.length) {
    drawTable(
      ["Horizonte", "Etapa", "Objetivo", "Entregable"],
      report.roadmap.map((phase) => [
        text(phase.horizon),
        text(phase.name),
        text(phase.objectives),
        text(phase.output),
      ]),
      [0.7, 1.1, 1.6, 1.6],
    );
  } else {
    callout(
      "Estado actual",
      "No hay etapas de implementación disponibles para este informe.",
      "gray",
    );
  }
  sectionHeading("Cierre metodológico y notas legales");
  callout(
    "Metodología y alcance de uso",
    "Metodología: SW Factor Library v1.0.0 e instantáneas conservadas por corrida. Este diagnóstico no constituye un inventario verificado ni una certificación. Los factores con estado pendiente y sus reglas de respaldo se identifican expresamente; la incertidumbre no debe interpretarse como validación oficial.",
    "mint",
  );

  startPage("Datos de control editorial");
  drawTable(
    ["Campo", "Valor"],
    [
      ["Organización", report.companyName],
      ["Período", periodLabel],
      [
        "Instalaciones",
        report.facilities.join(", ") ||
          "Sin instalaciones con registros aceptados",
      ],
      ["Fecha de generación", dateLabel],
      ["Responsable", "No especificado"],
      ["Versión del reporte", "Klimatka · SW Factor Library v1.0.0"],
      ["Corridas incluidas", num(report.runCount, 0)],
      [
        "Corridas excluidas por calidad insuficiente",
        num(report.excludedUnreliableCount, 0),
      ],
    ],
    [1, 2],
  );
  callout(
    "Nota de uso",
    "Uso interno · Diagnóstico ambiental no verificado. Conservar la trazabilidad de cada corrida y revisar factores, fuentes, calidad e incertidumbre antes de divulgar resultados.",
    "gray",
  );

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...colors.line);
    pdf.setLineWidth(0.25);
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.8);
    pdf.setTextColor(...colors.muted);
    pdf.text(
      text(report.companyName) + " · Uso interno · Diagnóstico ambiental no verificado",
      margin,
      pageHeight - 7,
    );
    pdf.text(
      `Página ${page} / ${pageCount}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: "right" },
    );
  }

  return pdf;
}
