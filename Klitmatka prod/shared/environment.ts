export const activityCategories = [
  "ELECTRICITY",
  "FUEL",
  "WATER",
  "WASTE",
  "MATERIAL",
  "PACKAGING",
  "REFRIGERANT",
  "AIR",
  "AI",
  "INTERNET",
  "CUSTOM",
] as const;

export type ActivityCategory = (typeof activityCategories)[number];
export type QualityDimension = 0 | 1 | 2;

export interface EnvironmentalInput {
  tenantId: string;
  createdByUserId?: string;
  facilityId: string;
  facilityName: string;
  category: ActivityCategory;
  subcategory: string;
  activityValue: number;
  activityUnit: string;
  geography: string;
  reportingPeriod: string;
  employeeCount?: number;
  sourceType: "FACTURA_COMERCIAL" | "MEDICION_DIRECTA" | "REGISTRO_OPERATIVO" | "ESTIMACION";
  sourceReference: string;
  quality: {
    source: QualityDimension;
    measurement: QualityDimension;
    temporalRepresentativeness: QualityDimension;
    operationalRepresentativeness: QualityDimension;
    traceability: QualityDimension;
  };
  contractualFactor?: number;
  contractualFactorSource?: string;
  gasOrigin?: "combustion" | "biogenic" | "fugitiveFossil";
  recycledContentPct?: number;
  recoveredMassKg?: number;
  materialEligibleKg?: number;
  productMassKg?: number;
  byproductMassKg?: number;
  dischargedM3?: number;
  reusedM3?: number;
  denominatorValue?: number;
  denominatorUnit?: string;
  wasteHazardous?: boolean;
  digitalProvider?: string;
  aiModel?: string;
  aiInputTokens?: number;
  aiOutputTokens?: number;
  internetUploadGb?: number;
  internetDownloadGb?: number;
  reportedEnergyKwh?: number;
  reportedWaterM3?: number;
  reportedCo2eKg?: number;
}

export interface DigitalUsageMetrics {
  provider: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  uploadGb?: number;
  downloadGb?: number;
  reportedEnergyKwh?: number;
  reportedWaterM3?: number;
  reportedCo2eKg?: number;
}

export interface CalculationResult {
  calculationId: string;
  createdByUserId?: string;
  category: ActivityCategory;
  scope: string;
  activityValue: number;
  activityUnit: string;
  normalizedValue: number;
  normalizedUnit: string;
  geography: string;
  reportingPeriod: string;
  metricValue: number;
  metricUnit: string;
  co2eTotalTonnes: number | null;
  factorUsed: string;
  factorValue: number | null;
  factorUnit: string;
  factorStatus: string;
  sourceReference: string;
  fallbackApplied: boolean;
  uncertaintyPct: number;
  dataQualityScore: number;
  dataQualityRating: string;
  dataQualityTier: string;
  thresholdStatus: "NORMAL" | "ADVERTENCIA" | "CRITICO";
  warnings: string[];
  validation: string[];
  breakdown: Record<string, number>;
  waterBalanceDifferenceM3?: number;
  waterReusePct?: number;
  circularityIndexPct?: number;
  recoverableMaterialPct?: number;
  balanceDifferenceKg?: number;
  digitalUsage?: DigitalUsageMetrics;
  snapshot: Record<string, unknown>;
  createdAt: string;
}

export interface FacilityHeadcount {
  facilityId: string;
  facilityName: string;
  reportingPeriod: string;
  employeeCount: number;
}

export interface EnvironmentalOverview {
  totals: {
    co2eTonnes: number;
    co2eRunCount: number;
    electricityKwh: number;
    waterM3: number;
    wasteTonnes: number;
    runCount: number;
  };
  monthlyEmissions: { period: string; tonnes: number }[];
  availablePeriods: string[];
  availableYears: string[];
  recentRuns: CalculationResult[];
  library: {
    tableCount: number;
    factorCount: number;
    sourceCount: number;
    pendingNationalCount: number;
    validationRuleCount: number;
  };
  pendingFactors: { code: string; name: string; status: string; value: number; unit: string }[];
}
