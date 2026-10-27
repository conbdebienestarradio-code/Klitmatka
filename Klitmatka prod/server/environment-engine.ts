import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AuthCompany, AuthIdentity, CompanyInvitation, CompanyRegistration, MeasurementModule, MeasurementModuleVersion, UserRegistration } from "../shared/auth";
import type { ActivityCategory, CalculationResult, EnvironmentalInput, EnvironmentalOverview } from "../shared/environment";
import { libraryTableCount, libraryTables } from "./environment-data";

const databasePath = process.env.SW_ENVIRONMENT_DATABASE_PATH ?? path.join(process.cwd(), ".data", "sw-environment-v1.sqlite");
mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new DatabaseSync(databasePath);
database.exec("PRAGMA foreign_keys = ON");

const schema = `
CREATE TABLE IF NOT EXISTS source_library (source_id TEXT PRIMARY KEY, source_title TEXT NOT NULL, author_org TEXT NOT NULL, publication_year INTEGER NOT NULL, doi_or_url TEXT, reliability_tier TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gwp_library (gwp_id TEXT PRIMARY KEY, gas_name TEXT NOT NULL, chemical_formula TEXT NOT NULL, context TEXT NOT NULL, gwp_ar4 REAL, gwp_ar5 REAL, gwp_ar6 REAL, source_reference TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS unit_library (unit_id TEXT PRIMARY KEY, unit_code TEXT UNIQUE NOT NULL, unit_name TEXT NOT NULL, dimension TEXT NOT NULL, base_unit TEXT NOT NULL, conversion_factor_to_base REAL NOT NULL);
CREATE TABLE IF NOT EXISTS conversion_library (conversion_id TEXT PRIMARY KEY, from_unit TEXT NOT NULL, to_unit TEXT NOT NULL, multiplier REAL NOT NULL, description TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS electricity_library (elec_id TEXT PRIMARY KEY, grid_code TEXT UNIQUE NOT NULL, country_region TEXT NOT NULL, year INTEGER NOT NULL, ef_co2_kg_kwh REAL NOT NULL, ef_ch4_g_kwh REAL NOT NULL, ef_n2o_g_kwh REAL NOT NULL, status TEXT NOT NULL, source_id TEXT REFERENCES source_library(source_id), notes TEXT, data_quality_tier TEXT NOT NULL, uncertainty_pct REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fuel_library (fuel_id TEXT PRIMARY KEY, fuel_code TEXT UNIQUE NOT NULL, fuel_name TEXT NOT NULL, default_unit TEXT NOT NULL, density_kg_l REAL, ncv_gj_unit REAL, co2_factor_kg_unit REAL, ch4_factor_g_unit REAL, n2o_factor_g_unit REAL, status TEXT NOT NULL, source_id TEXT REFERENCES source_library(source_id));
CREATE TABLE IF NOT EXISTS factor_library (factor_id TEXT PRIMARY KEY, factor_code TEXT UNIQUE NOT NULL, factor_name TEXT NOT NULL, category TEXT NOT NULL, scope TEXT NOT NULL, unit TEXT NOT NULL, value_co2e REAL NOT NULL, gwp_source TEXT NOT NULL, geography TEXT NOT NULL, status TEXT NOT NULL, source_id TEXT REFERENCES source_library(source_id), valid_from TEXT NOT NULL, valid_to TEXT NOT NULL, data_quality_tier TEXT NOT NULL, uncertainty_pct REAL NOT NULL);
CREATE TABLE IF NOT EXISTS refrigerant_library (ref_id TEXT PRIMARY KEY, refrigerant_code TEXT NOT NULL, chemical_name TEXT NOT NULL, gwp_100yr REAL NOT NULL, ods_potential REAL NOT NULL, safety_group TEXT NOT NULL, status TEXT NOT NULL, source_id TEXT REFERENCES source_library(source_id));
CREATE TABLE IF NOT EXISTS transport_library (trans_id TEXT PRIMARY KEY, mode_code TEXT NOT NULL, mode_name TEXT NOT NULL, vehicle_type TEXT NOT NULL, fuel_type TEXT NOT NULL, load_factor_pct REAL NOT NULL, ef_per_tkm_kgco2e REAL NOT NULL, ef_per_pkm_kgco2e REAL NOT NULL, status TEXT NOT NULL, source_id TEXT REFERENCES source_library(source_id));
CREATE TABLE IF NOT EXISTS waste_material (waste_mat_id TEXT PRIMARY KEY, material_code TEXT NOT NULL, material_name TEXT NOT NULL, default_density_kg_m3 REAL NOT NULL, recyclability_potential TEXT NOT NULL, biodegradability TEXT NOT NULL, status TEXT NOT NULL, source_id TEXT REFERENCES source_library(source_id));
CREATE TABLE IF NOT EXISTS waste_destination (dest_id TEXT PRIMARY KEY, destination_code TEXT NOT NULL, destination_name TEXT NOT NULL, ef_kgco2e_per_kg REAL NOT NULL, methane_recovery TEXT NOT NULL, status TEXT NOT NULL, source_id TEXT REFERENCES source_library(source_id));
CREATE TABLE IF NOT EXISTS water_library (water_id TEXT PRIMARY KEY, process_code TEXT NOT NULL, process_name TEXT NOT NULL, ef_supply_kgco2e_m3 REAL NOT NULL, ef_treatment_kgco2e_m3 REAL NOT NULL, status TEXT NOT NULL, source_id TEXT REFERENCES source_library(source_id));
CREATE TABLE IF NOT EXISTS material_library (mat_id TEXT PRIMARY KEY, material_code TEXT NOT NULL, material_name TEXT NOT NULL, embodied_carbon_kgco2e_kg REAL NOT NULL, recycled_content_default_pct REAL NOT NULL, status TEXT NOT NULL, source_id TEXT REFERENCES source_library(source_id));
CREATE TABLE IF NOT EXISTS packaging_library (pkg_id TEXT PRIMARY KEY, packaging_code TEXT NOT NULL, packaging_name TEXT NOT NULL, material_type TEXT NOT NULL, avg_weight_g REAL NOT NULL, recyclable TEXT NOT NULL, status TEXT NOT NULL, source_id TEXT REFERENCES source_library(source_id));
CREATE TABLE IF NOT EXISTS air_pollutants (pollutant_id TEXT PRIMARY KEY, pollutant_code TEXT NOT NULL, pollutant_name TEXT NOT NULL, cas_number TEXT NOT NULL, toxicity_weight_factor REAL NOT NULL, status TEXT NOT NULL, source_id TEXT REFERENCES source_library(source_id));
CREATE TABLE IF NOT EXISTS thresholds (threshold_id TEXT PRIMARY KEY, parameter_category TEXT NOT NULL, metric_name TEXT NOT NULL, warning_limit REAL NOT NULL, critical_limit REAL NOT NULL, unit TEXT NOT NULL, action_required TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS methodology_version (component TEXT PRIMARY KEY, standard_reference TEXT NOT NULL, version TEXT NOT NULL, description TEXT NOT NULL, compliance TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS validation_rules (rule_id TEXT PRIMARY KEY, target_table TEXT NOT NULL, field_name TEXT NOT NULL, rule_type TEXT NOT NULL, rule_expression TEXT NOT NULL, error_message TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS fallback_rules (fallback_id TEXT PRIMARY KEY, target_category TEXT NOT NULL, primary_condition TEXT NOT NULL, fallback_action TEXT NOT NULL, fallback_value_or_source TEXT NOT NULL, justification TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS engine_formulas (module_id TEXT PRIMARY KEY, module_name TEXT NOT NULL, scope_category TEXT NOT NULL, input_variables TEXT NOT NULL, formula_expression TEXT NOT NULL, output_metric TEXT NOT NULL, governing_standard TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS data_quality_matrix (tier_level TEXT PRIMARY KEY, precision_score INTEGER NOT NULL, completeness_score INTEGER NOT NULL, temporal_score INTEGER NOT NULL, geographical_score INTEGER NOT NULL, overall_dqi_rating TEXT NOT NULL, description TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recommendation_engine (rec_id TEXT PRIMARY KEY, domain_category TEXT NOT NULL, finding_trigger TEXT NOT NULL, probable_cause TEXT NOT NULL, opportunity TEXT NOT NULL, recommended_action TEXT NOT NULL, indicative_investment TEXT NOT NULL, timeframe TEXT NOT NULL, priority TEXT NOT NULL, venezuela_availability TEXT NOT NULL, payback_months REAL);
CREATE TABLE IF NOT EXISTS reporting_roadmap (phase_code TEXT PRIMARY KEY, phase_name TEXT NOT NULL, time_horizon TEXT NOT NULL, core_objectives TEXT NOT NULL, key_milestones TEXT NOT NULL, deliverable_output TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS companies (company_id TEXT PRIMARY KEY, name TEXT NOT NULL, rif TEXT NOT NULL COLLATE NOCASE UNIQUE, email TEXT NOT NULL COLLATE NOCASE, employee_count INTEGER NOT NULL CHECK (employee_count > 0), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (user_id TEXT PRIMARY KEY, email TEXT NOT NULL COLLATE NOCASE UNIQUE, first_name TEXT NOT NULL, last_name TEXT NOT NULL, job_title TEXT NOT NULL, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS company_memberships (company_id TEXT NOT NULL REFERENCES companies(company_id), user_id TEXT NOT NULL REFERENCES users(user_id), role TEXT NOT NULL CHECK (role IN ('admin', 'member')), created_at TEXT NOT NULL, PRIMARY KEY (company_id, user_id));
CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(user_id), company_id TEXT REFERENCES companies(company_id), expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS company_invitations (token_hash TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(company_id), email TEXT NOT NULL COLLATE NOCASE, created_by TEXT NOT NULL REFERENCES users(user_id), expires_at TEXT NOT NULL, accepted_at TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(user_id), expires_at TEXT NOT NULL, created_at TEXT NOT NULL, used_at TEXT);
CREATE TABLE IF NOT EXISTS password_reset_requests (email_hash TEXT PRIMARY KEY, requested_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS measurement_modules (module_id TEXT PRIMARY KEY, module_code TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL, description TEXT NOT NULL, unit TEXT NOT NULL, metric_name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS measurement_module_versions (version_id TEXT PRIMARY KEY, module_id TEXT NOT NULL REFERENCES measurement_modules(module_id), version INTEGER NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, unit TEXT NOT NULL, metric_name TEXT NOT NULL, factor_value REAL, factor_unit TEXT NOT NULL, source_reference TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('VIGENTE', 'PENDIENTE_VALIDACION_OFICIAL')), valid_from TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE (module_id, version));
CREATE TABLE IF NOT EXISTS calculation_runs (calculation_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, facility_id TEXT NOT NULL, facility_name TEXT NOT NULL, category TEXT NOT NULL, subcategory TEXT NOT NULL, scope TEXT NOT NULL, activity_value REAL NOT NULL, activity_unit TEXT NOT NULL, normalized_value REAL NOT NULL, normalized_unit TEXT NOT NULL, geography TEXT NOT NULL, reporting_period TEXT NOT NULL, metric_value REAL NOT NULL, metric_unit TEXT NOT NULL, co2e_total_tonnes REAL, factor_used TEXT NOT NULL, factor_value REAL, factor_unit TEXT NOT NULL, factor_status TEXT NOT NULL, source_reference TEXT NOT NULL, fallback_applied INTEGER NOT NULL, uncertainty_pct REAL NOT NULL, data_quality_score INTEGER NOT NULL, data_quality_rating TEXT NOT NULL, data_quality_tier TEXT NOT NULL, threshold_status TEXT NOT NULL, warnings_json TEXT NOT NULL, validation_json TEXT NOT NULL, breakdown_json TEXT NOT NULL, snapshot_json TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT REFERENCES users(user_id), UNIQUE (tenant_id, facility_id, category, reporting_period, source_reference));
CREATE TABLE IF NOT EXISTS facility_headcounts (tenant_id TEXT NOT NULL, facility_id TEXT NOT NULL, facility_name TEXT NOT NULL, reporting_period TEXT NOT NULL, employee_count INTEGER NOT NULL CHECK (employee_count > 0), updated_at TEXT NOT NULL, PRIMARY KEY (tenant_id, facility_id, reporting_period));
CREATE TABLE IF NOT EXISTS calculation_run_audit (audit_id TEXT PRIMARY KEY, calculation_id TEXT NOT NULL, tenant_id TEXT, action TEXT NOT NULL, changed_at TEXT NOT NULL, previous_record_json TEXT NOT NULL);
DROP TRIGGER IF EXISTS calculation_runs_no_update;
DROP TRIGGER IF EXISTS calculation_runs_no_delete;
CREATE TRIGGER IF NOT EXISTS calculation_runs_no_update BEFORE UPDATE ON calculation_runs BEGIN SELECT RAISE(ABORT, 'calculation runs must be recalculated'); END;
CREATE TRIGGER IF NOT EXISTS calculation_runs_delete_requires_audit BEFORE DELETE ON calculation_runs WHEN NOT EXISTS (SELECT 1 FROM calculation_run_audit WHERE calculation_id = OLD.calculation_id AND action IN ('EDIT', 'DELETE') AND json_extract(previous_record_json, '$.created_at') = OLD.created_at) BEGIN SELECT RAISE(ABORT, 'calculation run deletion requires an audit record'); END;
CREATE TRIGGER IF NOT EXISTS calculation_run_audit_no_update BEFORE UPDATE ON calculation_run_audit BEGIN SELECT RAISE(ABORT, 'calculation run history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS calculation_run_audit_no_delete BEFORE DELETE ON calculation_run_audit BEGIN SELECT RAISE(ABORT, 'calculation run history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS gwp_library_no_update BEFORE UPDATE ON gwp_library BEGIN SELECT RAISE(ABORT, 'methodology history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS gwp_library_no_delete BEFORE DELETE ON gwp_library BEGIN SELECT RAISE(ABORT, 'methodology history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS unit_library_no_update BEFORE UPDATE ON unit_library BEGIN SELECT RAISE(ABORT, 'unit history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS unit_library_no_delete BEFORE DELETE ON unit_library BEGIN SELECT RAISE(ABORT, 'unit history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS conversion_library_no_update BEFORE UPDATE ON conversion_library BEGIN SELECT RAISE(ABORT, 'conversion history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS conversion_library_no_delete BEFORE DELETE ON conversion_library BEGIN SELECT RAISE(ABORT, 'conversion history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS electricity_library_no_update BEFORE UPDATE ON electricity_library BEGIN SELECT RAISE(ABORT, 'factor history is immutable; insert a new version'); END;
CREATE TRIGGER IF NOT EXISTS electricity_library_no_delete BEFORE DELETE ON electricity_library BEGIN SELECT RAISE(ABORT, 'factor history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS factor_library_no_update BEFORE UPDATE ON factor_library BEGIN SELECT RAISE(ABORT, 'factor history is immutable; insert a new version'); END;
CREATE TRIGGER IF NOT EXISTS factor_library_no_delete BEFORE DELETE ON factor_library BEGIN SELECT RAISE(ABORT, 'factor history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS fuel_library_no_update BEFORE UPDATE ON fuel_library BEGIN SELECT RAISE(ABORT, 'factor history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS fuel_library_no_delete BEFORE DELETE ON fuel_library BEGIN SELECT RAISE(ABORT, 'factor history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS waste_destination_no_update BEFORE UPDATE ON waste_destination BEGIN SELECT RAISE(ABORT, 'factor history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS waste_destination_no_delete BEFORE DELETE ON waste_destination BEGIN SELECT RAISE(ABORT, 'factor history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS water_library_no_update BEFORE UPDATE ON water_library BEGIN SELECT RAISE(ABORT, 'factor history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS water_library_no_delete BEFORE DELETE ON water_library BEGIN SELECT RAISE(ABORT, 'factor history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS material_library_no_update BEFORE UPDATE ON material_library BEGIN SELECT RAISE(ABORT, 'factor history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS material_library_no_delete BEFORE DELETE ON material_library BEGIN SELECT RAISE(ABORT, 'factor history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS refrigerant_library_no_update BEFORE UPDATE ON refrigerant_library BEGIN SELECT RAISE(ABORT, 'factor history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS refrigerant_library_no_delete BEFORE DELETE ON refrigerant_library BEGIN SELECT RAISE(ABORT, 'factor history is immutable'); END;
`;

database.exec(schema);
const moduleVersionColumns = database.prepare("PRAGMA table_info(measurement_module_versions)").all() as { name: string }[];
for (const [column, definition] of [["name", "TEXT NOT NULL DEFAULT ''"], ["description", "TEXT NOT NULL DEFAULT ''"], ["unit", "TEXT NOT NULL DEFAULT ''"], ["metric_name", "TEXT NOT NULL DEFAULT ''"]] as const) {
  if (!moduleVersionColumns.some((item) => item.name === column)) database.exec(`ALTER TABLE measurement_module_versions ADD COLUMN ${column} ${definition}`);
}
database.exec("UPDATE measurement_module_versions SET name = (SELECT name FROM measurement_modules WHERE module_id = measurement_module_versions.module_id), description = (SELECT description FROM measurement_modules WHERE module_id = measurement_module_versions.module_id), unit = (SELECT unit FROM measurement_modules WHERE module_id = measurement_module_versions.module_id), metric_name = (SELECT metric_name FROM measurement_modules WHERE module_id = measurement_module_versions.module_id) WHERE name = '' OR description = '' OR unit = '' OR metric_name = ''");
const membershipSql = database.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'company_memberships'").get() as { sql: string } | undefined;
if (membershipSql?.sql.includes("user_id TEXT NOT NULL UNIQUE")) {
  database.exec("BEGIN IMMEDIATE; CREATE TABLE company_memberships_new (company_id TEXT NOT NULL REFERENCES companies(company_id), user_id TEXT NOT NULL REFERENCES users(user_id), role TEXT NOT NULL CHECK (role IN ('admin', 'member')), created_at TEXT NOT NULL, PRIMARY KEY (company_id, user_id)); INSERT INTO company_memberships_new SELECT company_id, user_id, role, created_at FROM company_memberships; DROP TABLE company_memberships; ALTER TABLE company_memberships_new RENAME TO company_memberships; COMMIT;");
}
const sessionSql = database.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'auth_sessions'").get() as { sql: string } | undefined;
if (sessionSql?.sql.includes("company_id TEXT NOT NULL")) {
  database.exec("BEGIN IMMEDIATE; CREATE TABLE auth_sessions_new (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(user_id), company_id TEXT REFERENCES companies(company_id), expires_at TEXT NOT NULL, created_at TEXT NOT NULL); INSERT INTO auth_sessions_new SELECT token_hash, user_id, company_id, expires_at, created_at FROM auth_sessions; DROP TABLE auth_sessions; ALTER TABLE auth_sessions_new RENAME TO auth_sessions; COMMIT;");
}
const runColumns = database.prepare("PRAGMA table_info(calculation_runs)").all() as { name: string }[];
if (!runColumns.some((column) => column.name === "created_by")) database.exec("ALTER TABLE calculation_runs ADD COLUMN created_by TEXT REFERENCES users(user_id)");
const auditColumns = database.prepare("PRAGMA table_info(calculation_run_audit)").all() as { name: string }[];
if (!auditColumns.some((column) => column.name === "tenant_id")) database.exec("ALTER TABLE calculation_run_audit ADD COLUMN tenant_id TEXT");

for (const definition of libraryTables) {
  const count = database.prepare(`SELECT COUNT(*) AS count FROM ${definition.table}`).get() as { count: number };
  if (count.count > 0) continue;
  const placeholders = definition.columns.map(() => "?").join(", ");
  const insert = database.prepare(`INSERT INTO ${definition.table} (${definition.columns.join(", ")}) VALUES (${placeholders})`);
  database.exec("BEGIN");
  try {
    for (const row of definition.rows) insert.run(...(row as (string | number | null)[]));
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

const factorTables = ["source_library", "gwp_library", "unit_library", "conversion_library", "electricity_library", "fuel_library", "factor_library", "refrigerant_library", "transport_library", "waste_material", "waste_destination", "water_library", "material_library", "packaging_library", "air_pollutants", "thresholds", "methodology_version", "validation_rules", "fallback_rules", "engine_formulas", "data_quality_matrix", "recommendation_engine", "reporting_roadmap"] as const;

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function normalizeValue(value: number, unit: string, target: "kWh" | "kg" | "liter" | "m3" | "unit"): number | null {
  const conversions: Record<string, Record<string, number>> = {
    kWh: { kWh: 1, MWh: 1000, Wh: 0.001, GJ: 277.7777778, MJ: 0.277777778 },
    kg: { kg: 1, t: 1000, g: 0.001 },
    liter: { liter: 1, L: 1, m3: 1000, "gal US": 3.785411784 },
    m3: { m3: 1 },
    unit: { unit: 1 },
  };
  const multiplier = conversions[target]?.[unit];
  return multiplier === undefined ? null : value * multiplier;
}

function waterFactor(code: string) {
  const record = database.prepare("SELECT * FROM water_library WHERE process_code = ?").get(code) as Record<string, unknown> | undefined;
  return record;
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getMeasurementModuleForPeriod(moduleId: string, reportingPeriod: string) {
  return database.prepare("SELECT m.module_id, m.active, v.version_id AS versionId, v.version, v.name, v.description, v.unit, v.metric_name AS metricName, v.factor_value AS factorValue, v.factor_unit AS factorUnit, v.source_reference AS sourceReference, v.status, v.valid_from AS validFrom FROM measurement_modules m LEFT JOIN measurement_module_versions v ON v.version_id = (SELECT v2.version_id FROM measurement_module_versions v2 WHERE v2.module_id = m.module_id AND v2.valid_from <= ? ORDER BY v2.valid_from DESC, v2.version DESC LIMIT 1) WHERE m.module_id = ? AND m.active = 1").get(`${reportingPeriod}-01`, moduleId) as Record<string, unknown> | undefined;
}

function getThreshold(category: string) {
  if (category === "AI" || category === "INTERNET" || category === "CUSTOM") return undefined;
  const code = category === "ELECTRICITY" ? "ELECTRICITY" : category === "WATER" ? "WATER" : category === "WASTE" ? "WASTE" : "EMISSIONS";
  return database.prepare("SELECT * FROM thresholds WHERE parameter_category = ?").get(code) as Record<string, unknown> | undefined;
}

function ratingForScore(score: number): string {
  if (score >= 9) return "Alta";
  if (score >= 7) return "Media-alta";
  if (score >= 5) return "Media";
  if (score >= 3) return "Baja";
  return "Insuficiente";
}

function validateInput(input: EnvironmentalInput, excludingCalculationId?: string): { errors: string[]; warnings: string[]; normalizedValue: number; normalizedUnit: string } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input.tenantId?.trim()) errors.push("VD-005 · Falta el identificador de empresa.");
  if (!input.facilityId?.trim() || !input.facilityName?.trim()) errors.push("VD-012 · Identifica la instalación dentro del perímetro.");
  if (input.employeeCount !== undefined && input.employeeCount !== null && (!Number.isSafeInteger(input.employeeCount) || input.employeeCount <= 0)) errors.push("La cantidad de empleados debe ser un número entero mayor que cero.");
  if (!Number.isFinite(input.activityValue) || input.activityValue < 0) errors.push("VD-003 · La actividad debe ser un número finito no negativo.");
  const periodMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(input.reportingPeriod ?? "");
  if (!periodMatch) errors.push("VD-002 · El período debe usar el formato AAAA-MM.");
  if (!input.sourceReference?.trim()) errors.push("VD-005 · Registra una factura, medición o referencia documental.");
  if (!input.geography?.trim()) errors.push("VD-008 · Selecciona una geografía.");
  const dimensions = Object.values(input.quality ?? {});
  if (dimensions.length !== 5 || dimensions.some((score) => ![0, 1, 2].includes(score))) errors.push("VD-006 · Completa las cinco dimensiones DQ con valores de 0 a 2.");
  if (!input.sourceType) errors.push("VD-014 · Selecciona el tipo de fuente del dato.");
  if (input.sourceType === "ESTIMACION") warnings.push("VD-014 · Actividad declarada como estimación.");
  if (["WATER", "FUEL", "MATERIAL", "REFRIGERANT", "AIR", "PACKAGING", "AI", "INTERNET", "CUSTOM"].includes(input.category) && input.subcategory.trim().length === 0) errors.push("Selecciona una subcategoría.");
  if (input.category === "AI" && !["GENERATIVE", "PREDICTIVE", "OTHER"].includes(input.subcategory)) errors.push("Selecciona un tipo de uso de IA válido.");
  if (input.category === "AI" && !Number.isInteger(input.activityValue)) errors.push("Las solicitudes de IA deben registrarse como una cantidad entera.");
  if (input.category === "INTERNET" && !["FIXED", "MOBILE", "SATELLITE", "OTHER"].includes(input.subcategory)) errors.push("Selecciona un tipo de conexión válido.");
  if ((input.category === "AI" || input.category === "INTERNET") && !input.digitalProvider?.trim()) errors.push("Registra el proveedor del servicio digital.");
  if (input.category === "AI" && input.aiModel !== undefined && !input.aiModel.trim()) errors.push("El modelo de IA no puede estar vacío.");
  if (input.category === "AI" && [input.aiInputTokens, input.aiOutputTokens].some((value) => value !== undefined && (!Number.isInteger(value) || value < 0))) errors.push("Los tokens deben registrarse como cantidades enteras no negativas.");
  if (input.category === "INTERNET") {
    const hasUpload = input.internetUploadGb !== undefined;
    const hasDownload = input.internetDownloadGb !== undefined;
    if (hasUpload !== hasDownload) errors.push("Para desglosar el tráfico, registra subida y descarga; de lo contrario, deja ambos campos vacíos.");
    if (hasUpload && hasDownload && Math.abs(input.internetUploadGb! + input.internetDownloadGb! - input.activityValue) > Math.max(0.01, input.activityValue * 0.001)) errors.push("El tráfico total debe coincidir con la suma de subida y descarga.");
  }
  if ([input.reportedEnergyKwh, input.reportedWaterM3, input.reportedCo2eKg, input.internetUploadGb, input.internetDownloadGb].some((value) => value !== undefined && (!Number.isFinite(value) || value < 0))) errors.push("Las mediciones ambientales y de tráfico deben ser números finitos no negativos.");

  const isDigitalCategory = input.category === "AI" || input.category === "INTERNET";
  const digitalUnit = input.category === "AI" ? "solicitudes" : "GB";
  let normalizedValue = input.activityValue;
  let normalizedUnit = input.activityUnit;
  if (input.category === "CUSTOM") {
    const module = getMeasurementModuleForPeriod(input.subcategory, input.reportingPeriod);
    if (!module) errors.push("El módulo seleccionado no está disponible.");
    else if (module.version === null) errors.push("El módulo no tiene parámetros vigentes para el período reportado.");
    else {
      if (input.activityUnit !== String(module.unit)) errors.push("La unidad no coincide con la definida para este módulo.");
      if (module.factorValue !== null && module.factorValue !== undefined && String(module.status) !== "VIGENTE") warnings.push("El parámetro vigente de este módulo está pendiente de validación oficial.");
    }
  } else if (isDigitalCategory) {
    if (input.activityUnit !== digitalUnit) errors.push(`La actividad de ${input.category === "AI" ? "IA" : "internet"} debe registrarse en ${digitalUnit}.`);
    normalizedUnit = digitalUnit;
  } else {
    const targets: Partial<Record<ActivityCategory, "kWh" | "kg" | "liter" | "m3" | "unit">> = {
      ELECTRICITY: "kWh",
      FUEL: "liter",
      WATER: "m3",
      WASTE: "kg",
      MATERIAL: "kg",
      PACKAGING: "unit",
      REFRIGERANT: "kg",
      AIR: "kg",
    };
    const massUnit = ["kg", "t", "g"].includes(input.activityUnit);
    const unitTarget = input.category === "FUEL" && massUnit ? "kg" : targets[input.category];
    const unit = database.prepare("SELECT dimension FROM unit_library WHERE unit_code = ?").get(input.activityUnit) as { dimension: string } | undefined;
    if (!unit) errors.push("VD-001 · La unidad no existe en la biblioteca.");
    const normalized = unitTarget ? normalizeValue(input.activityValue, input.activityUnit, unitTarget) : null;
    if (unit && normalized === null) errors.push("VD-004 · La unidad no corresponde a esta categoría o no tiene conversión aprobada.");
    normalizedValue = normalized ?? 0;
    normalizedUnit = unitTarget ?? input.activityUnit;
  }

  if (input.category === "ELECTRICITY" && input.geography !== "VE" && !["US-CAMX", "CO"].includes(input.geography)) errors.push("VD-008 · No existe un factor eléctrico trazable para esa geografía.");
  if (input.category === "ELECTRICITY" && input.subcategory !== "MARKET_BASED" && periodMatch && ["VE", "US-CAMX", "CO"].includes(input.geography)) {
    const factorCode = input.geography === "VE" ? "GRID_VE_2024" : input.geography === "US-CAMX" ? "GRID_US_CAMX_2023" : null;
    const version = factorCode ? database.prepare("SELECT valid_from, valid_to FROM factor_library WHERE factor_code = ?").get(factorCode) as { valid_from: string; valid_to: string } | undefined : undefined;
    const factorYear = input.geography === "CO" ? 2023 : null;
    const periodDate = `${input.reportingPeriod}-01`;
    if (version && (periodDate < version.valid_from || periodDate > version.valid_to)) errors.push("VD-010 · El factor eléctrico no es válido para el período reportado.");
    if (!version && factorYear !== null && Number(periodMatch[1]) !== factorYear) errors.push("VD-010 · El factor disponible corresponde a 2023; no se extrapola a otro período.");
  }
  if (input.category === "ELECTRICITY" && input.subcategory === "MARKET_BASED" && (!Number.isFinite(input.contractualFactor) || (input.contractualFactor ?? -1) < 0 || !input.contractualFactorSource?.trim())) errors.push("VD-007 · El enfoque market-based requiere un factor contractual no negativo y su fuente.");
  if (input.category === "WASTE" && input.subcategory && input.subcategory !== "DST-001" && !database.prepare("SELECT 1 FROM waste_destination WHERE dest_id = ?").get(input.subcategory)) errors.push("VD-007 · Selecciona un destino de residuos presente en la biblioteca.");
  if (input.category === "FUEL" && !database.prepare("SELECT 1 FROM fuel_library WHERE fuel_code = ?").get(input.subcategory)) errors.push("VD-007 · Selecciona un combustible presente en la biblioteca.");
  if (input.category === "WATER" && !database.prepare("SELECT 1 FROM water_library WHERE process_code = ?").get(input.subcategory)) errors.push("VD-007 · Selecciona un proceso hídrico presente en la biblioteca.");
  if (input.category === "MATERIAL" && !database.prepare("SELECT 1 FROM material_library WHERE material_code = ?").get(input.subcategory)) errors.push("VD-007 · Selecciona un material presente en la biblioteca.");
  if (input.category === "PACKAGING" && !database.prepare("SELECT 1 FROM packaging_library WHERE packaging_code = ?").get(input.subcategory)) errors.push("VD-007 · Selecciona un empaque presente en la biblioteca.");
  if (input.category === "REFRIGERANT" && !database.prepare("SELECT 1 FROM refrigerant_library WHERE refrigerant_code = ? AND status = 'VIGENTE'").get(input.subcategory)) errors.push("VD-007 · Selecciona un refrigerante vigente en la biblioteca.");
  if (input.category === "AIR" && !["CO2", "CH4", "N2O", "PM10", "NOX", "SOX", "VOC"].includes(input.subcategory)) errors.push("VD-007 · Selecciona un gas o contaminante criterio admitido.");
  if (input.recycledContentPct !== undefined && (!Number.isFinite(input.recycledContentPct) || input.recycledContentPct < 0 || input.recycledContentPct > 100)) errors.push("VAL-005 · El contenido reciclado debe estar entre 0 % y 100 %.");
  if (input.reusedM3 !== undefined && (input.reusedM3 < 0 || input.reusedM3 > input.activityValue)) errors.push("VAL-006 · El agua reutilizada no puede superar el volumen de agua utilizado.");
  if (input.dischargedM3 !== undefined && input.dischargedM3 < 0) errors.push("VAL-007 · La descarga no puede ser negativa.");
  if (input.recoveredMassKg !== undefined && input.recoveredMassKg < 0) errors.push("VAL-008 · La masa recuperada no puede ser negativa.");
  if (input.materialEligibleKg !== undefined && (!Number.isFinite(input.materialEligibleKg) || input.materialEligibleKg < 0)) errors.push("VAL-009 · La masa elegible debe ser finita y no negativa.");
  if (input.denominatorValue !== undefined && (!Number.isFinite(input.denominatorValue) || input.denominatorValue <= 0)) errors.push("VD-003 · El denominador de intensidad debe ser mayor que cero.");

  if (periodMatch) {
    const prior = database.prepare("SELECT reporting_period FROM calculation_runs WHERE tenant_id = ? AND facility_id = ? AND category = ? AND reporting_period < ? AND (? IS NULL OR calculation_id != ?) ORDER BY reporting_period DESC LIMIT 1").get(input.tenantId, input.facilityId, input.category, input.reportingPeriod, excludingCalculationId ?? null, excludingCalculationId ?? null) as { reporting_period: string } | undefined;
    if (!prior) warnings.push("VD-013 · No hay períodos anteriores para verificar la continuidad de la serie.");
    else {
      const [py, pm] = prior.reporting_period.split("-").map(Number);
      const [cy, cm] = input.reportingPeriod.split("-").map(Number);
      const monthGap = (cy - py) * 12 + cm - pm;
      if (monthGap > 1) warnings.push(`VD-013 · Se detectó una brecha de ${monthGap - 1} mes(es) en la serie de actividad.`);
    }
  }
  if ((input.category === "AI" || input.category === "INTERNET") && input.reportedCo2eKg !== undefined) warnings.push("La huella de GEI se conserva como dato reportado por la fuente; no se deriva de solicitudes, tokens o GB.");
  if (input.category === "AI" || input.category === "INTERNET") warnings.push("El uso digital se registra por separado; no se infieren consumos de energía, agua o GEI a partir de solicitudes, tokens o GB.");
  return { errors, warnings, normalizedValue, normalizedUnit };
}

function compute(input: EnvironmentalInput, excludingCalculationId?: string): Omit<CalculationResult, "calculationId" | "createdAt" | "validation"> & { validation: string[] } {
  const { errors, warnings, normalizedValue, normalizedUnit } = validateInput(input, excludingCalculationId);
  if (errors.length) throw Object.assign(new Error("Revisa los datos antes de calcular."), { statusCode: 400, errors, warnings });

  const qualityValues = Object.values(input.quality);
  const dataQualityScore = qualityValues.reduce((total, value) => total + value, 0);
  if (dataQualityScore <= 2) throw Object.assign(new Error("Índice DQ insuficiente; el método no permite emitir un resultado confiable con esta evidencia."), { statusCode: 422, errors: ["QD-06 · Mejora la fuente, medición o trazabilidad antes de calcular."], warnings });
  let co2eTotalTonnes: number | null = null;
  let scope = "Indicador operacional";
  let metricValue = normalizedValue;
  let metricUnit = normalizedUnit;
  let factorUsed = "Sin factor de GEI aplicado";
  let factorValue: number | null = null;
  let factorUnit = "";
  let factorStatus = "NO_APLICA";
  let sourceReference = input.sourceReference.trim();
  let fallbackApplied = false;
  let uncertaintyPct = Math.min(100, 50 - dataQualityScore * 4);
  const breakdown: Record<string, number> = {};
  const snapshot: Record<string, unknown> = { activity: { ...input }, normalization: { fromUnit: input.activityUnit, toUnit: normalizedUnit, normalizedValue }, factorSourceReference: sourceReference, engineVersion: "1.0.0", methodology: "SW Factor Library v1.0 / IPCC AR6" };
  let digitalUsage: CalculationResult["digitalUsage"];

  if (input.category === "ELECTRICITY") {
    scope = input.subcategory === "MARKET_BASED" ? "Scope 2 · Market-based" : "Scope 2 · Location-based";
    const kwh = normalizedValue;
    if (input.subcategory === "MARKET_BASED") {
      factorValue = input.contractualFactor!;
      factorUnit = "kgCO2e/kWh";
      factorUsed = "FACTOR_CONTRACTUAL_DECLARADO";
      factorStatus = "FACTOR_EMPRESA";
      sourceReference = input.contractualFactorSource!.trim();
      co2eTotalTonnes = kwh * factorValue / 1000;
      breakdown.contractual_co2e_tonnes = co2eTotalTonnes;
      snapshot.scope2Method = { approach: "MARKET_BASED", contractualFactor: factorValue, unit: factorUnit, source: sourceReference };
      if (input.geography === "VE") warnings.push("El factor contractual es específico de la empresa; conserve el instrumento contractual asociado.");
    } else {
      const grid = database.prepare("SELECT * FROM electricity_library WHERE country_region = ? OR grid_code = ? ORDER BY year DESC LIMIT 1").get(input.geography === "VE" ? "Venezuela (Nacional)" : input.geography === "US-CAMX" ? "Estados Unidos (CAMX)" : "Colombia (Nacional)", input.geography === "VE" ? "VE_INTERCONECTADA" : input.geography === "US-CAMX" ? "US_CAMX" : "CO_NATIONAL") as Record<string, unknown>;
      const pending = grid.status === "PENDIENTE_VALIDACION_OFICIAL";
      const selectedCo2Factor = pending ? 0.45 : asNumber(grid.ef_co2_kg_kwh);
      const selectedCh4Factor = pending ? 0 : asNumber(grid.ef_ch4_g_kwh);
      const selectedN2oFactor = pending ? 0 : asNumber(grid.ef_n2o_g_kwh);
      const ch4Tonnes = kwh * selectedCh4Factor * 27 / 1_000_000;
      const n2oTonnes = kwh * selectedN2oFactor * 273 / 1_000_000;
      const co2Tonnes = kwh * selectedCo2Factor / 1000;
      co2eTotalTonnes = co2Tonnes + ch4Tonnes + n2oTonnes;
      breakdown.co2_tonnes = co2Tonnes;
      breakdown.ch4_co2e_tonnes = ch4Tonnes;
      breakdown.n2o_co2e_tonnes = n2oTonnes;
      factorValue = selectedCo2Factor;
      factorUnit = "kgCO2e/kWh";
      factorUsed = pending ? "IPCC_GLOBAL_GRID_AVERAGE_0.45_KG · FBK-001" : String(grid.grid_code);
      factorStatus = pending ? "PENDIENTE_VALIDACION_OFICIAL · FALLBACK_APLICADO" : String(grid.status);
      sourceReference = pending ? "FBK-001 · IPCC global default 0.45 kgCO2e/kWh" : String(grid.source_id);
      fallbackApplied = pending;
      uncertaintyPct = pending ? 20 : asNumber(grid.uncertainty_pct);
      if (pending) warnings.push("La red venezolana permanece PENDIENTE_VALIDACION_OFICIAL. Se aplicó FBK-001 (0,45 kgCO₂e/kWh); resultado estimado, no verificado.");
      snapshot.factor = { ...grid, selectedFallbackValue: selectedCo2Factor, selectedCh4Factor, selectedN2oFactor, fallbackRule: pending ? "FBK-001" : null, gwpAr6: { ch4Combustion: 27, n2o: 273 } };
    }
  }

  if (input.category === "FUEL") {
    const fuel = database.prepare("SELECT * FROM fuel_library WHERE fuel_code = ?").get(input.subcategory) as Record<string, unknown>;
    scope = "Scope 1";
    let activityForFactor = input.activityValue;
    const expectedUnit = String(fuel.default_unit);
    if (["kg", "t", "g"].includes(input.activityUnit)) {
      const kg = input.activityUnit === "kg" ? input.activityValue : input.activityUnit === "t" ? input.activityValue * 1000 : input.activityValue / 1000;
      const density = asNumber(fuel.density_kg_l);
      if (expectedUnit !== "liter" || !(density > 0 && density < 2)) throw Object.assign(new Error("No hay densidad compatible documentada para convertir esta unidad de combustible."), { statusCode: 400, errors: ["FBK-002 · Usa la unidad de referencia de la biblioteca; no se asigna una densidad inventada."], warnings });
      activityForFactor = kg / density;
    } else if (expectedUnit === "m3" && input.activityUnit === "liter") {
      activityForFactor = input.activityValue / 1000;
    } else if (expectedUnit === "liter" && input.activityUnit === "m3") {
      activityForFactor = input.activityValue * 1000;
    }
    const co2Kg = activityForFactor * asNumber(fuel.co2_factor_kg_unit);
    const ch4Kg = activityForFactor * asNumber(fuel.ch4_factor_g_unit) * 27 / 1000;
    const n2oKg = activityForFactor * asNumber(fuel.n2o_factor_g_unit) * 273 / 1000;
    co2eTotalTonnes = (co2Kg + ch4Kg + n2oKg) / 1000;
    breakdown.co2_tonnes = co2Kg / 1000;
    breakdown.ch4_combustion_co2e_tonnes = ch4Kg / 1000;
    breakdown.n2o_co2e_tonnes = n2oKg / 1000;
    factorValue = asNumber(fuel.co2_factor_kg_unit);
    factorUnit = `kgCO2e/${expectedUnit}`;
    factorUsed = String(fuel.fuel_code);
    factorStatus = String(fuel.status);
    sourceReference = String(fuel.source_id);
    snapshot.factor = { ...fuel, ch4GwpContext: "CH4_COMBUSTION", gwpCh4Ar6: 27, gwpN2oAr6: 273 };
  }

  if (input.category === "WATER") {
    const factor = waterFactor(input.subcategory)!;
    scope = "Huella hídrica operacional";
    const supply = normalizedValue * asNumber(factor.ef_supply_kgco2e_m3);
    const treatment = normalizedValue * asNumber(factor.ef_treatment_kgco2e_m3);
    co2eTotalTonnes = (supply + treatment) / 1000;
    breakdown.supply_co2e_kg = supply;
    breakdown.treatment_co2e_kg = treatment;
    factorValue = asNumber(factor.ef_supply_kgco2e_m3) + asNumber(factor.ef_treatment_kgco2e_m3);
    factorUnit = "kgCO2e/m3";
    factorUsed = String(factor.process_code);
    factorStatus = String(factor.status);
    sourceReference = String(factor.source_id);
    if (input.dischargedM3 !== undefined || input.reusedM3 !== undefined) {
      const balanceDifference = input.activityValue - (input.dischargedM3 ?? 0) - (input.reusedM3 ?? 0);
      snapshot.waterBalanceDifferenceM3 = balanceDifference;
      (snapshot as Record<string, unknown>).waterReusePct = input.activityValue > 0 ? ((input.reusedM3 ?? 0) / input.activityValue) * 100 : 0;
    }
    if (input.denominatorValue !== undefined) {
      (snapshot as Record<string, unknown>).waterIntensity = { value: input.activityValue / input.denominatorValue, unit: `m3/${input.denominatorUnit || "unidad"}` };
    }
    snapshot.factor = factor;
    metricValue = normalizedValue;
    metricUnit = "m3";
  }

  if (input.category === "WASTE") {
    scope = "Scope 3 · Residuos";
    const destinationCode = input.subcategory || "DST-001";
    const destination = database.prepare("SELECT * FROM waste_destination WHERE dest_id = ?").get(destinationCode) as Record<string, unknown>;
    const pending = destination.status === "PENDIENTE_VALIDACION_OFICIAL";
    const emissionFactor = asNumber(destination.ef_kgco2e_per_kg);
    const wasteKg = normalizedValue;
    co2eTotalTonnes = wasteKg * emissionFactor / 1000;
    factorValue = emissionFactor;
    factorUnit = "kgCO2e/kg";
    factorUsed = String(destination.destination_code);
    factorStatus = String(destination.status);
    sourceReference = String(destination.source_id);
    if (pending) {
      fallbackApplied = true;
      uncertaintyPct = Math.max(20, uncertaintyPct);
      warnings.push("El factor del destino seleccionado está PENDIENTE_VALIDACION_OFICIAL; el resultado es estimado.");
    }
    if (!input.subcategory) {
      warnings.push("VD-007 · No se declaró destino; FBK-003 aplica el peor caso conservador DST-001.");
      fallbackApplied = true;
    }
    snapshot.factor = destination;
    snapshot.wasteMassKg = wasteKg;
    metricValue = wasteKg;
    metricUnit = "kg";
  }

  if (input.category === "MATERIAL") {
    scope = "Scope 3 · Materiales";
    const material = database.prepare("SELECT * FROM material_library WHERE material_code = ?").get(input.subcategory) as Record<string, unknown>;
    const recycledPct = input.recycledContentPct ?? asNumber(material.recycled_content_default_pct);
    const embodied = asNumber(material.embodied_carbon_kgco2e_kg);
    co2eTotalTonnes = normalizedValue * embodied * (1 - recycledPct / 100) / 1000;
    breakdown.embodied_carbon_tonnes = co2eTotalTonnes;
    factorValue = embodied;
    factorUnit = "kgCO2e/kg";
    factorUsed = String(material.material_code);
    factorStatus = String(material.status);
    sourceReference = String(material.source_id);
    if (input.productMassKg !== undefined && input.byproductMassKg !== undefined && input.productMassKg + input.byproductMassKg > normalizedValue) throw Object.assign(new Error("La masa de producto y subproductos supera el material ingresado."), { statusCode: 400, errors: ["VAL-012 · El balance de masa de salida no puede superar la entrada."], warnings });
    if (input.recoveredMassKg !== undefined && input.materialEligibleKg !== undefined) {
      if (input.materialEligibleKg === 0 && input.recoveredMassKg > 0) throw Object.assign(new Error("La masa recuperada no puede exceder una base elegible igual a cero."), { statusCode: 400, errors: ["VAL-009 · El denominador del ICO debe ser mayor que cero."], warnings });
      if (input.recoveredMassKg > input.materialEligibleKg) throw Object.assign(new Error("El material reincorporado, reutilizado o reciclado supera la masa elegible."), { statusCode: 400, errors: ["VAL-010 · El balance de circularidad supera el denominador elegible."], warnings });
      const circularity = input.materialEligibleKg > 0 ? input.recoveredMassKg / input.materialEligibleKg * 100 : 0;
      (snapshot as Record<string, unknown>).circularityIndexPct = circularity;
      (snapshot as Record<string, unknown>).recoverableMaterialPct = input.activityValue > 0 ? Math.min(100, input.recoveredMassKg / normalizedValue * 100) : 0;
    }
    if (input.denominatorValue !== undefined) (snapshot as Record<string, unknown>).materialIntensity = { value: normalizedValue / input.denominatorValue, unit: `${normalizedUnit}/${input.denominatorUnit || "unidad"}` };
    snapshot.factor = { ...material, recycledContentPct: recycledPct };
  }

  if (input.category === "REFRIGERANT") {
    scope = "Scope 1 · Fugas fugitivas";
    const refrigerant = database.prepare("SELECT * FROM refrigerant_library WHERE refrigerant_code = ?").get(input.subcategory) as Record<string, unknown>;
    const ar6GwpId = input.subcategory === "R-134a" ? "GWP-005" : input.subcategory === "R-410A" ? "GWP-006" : null;
    const ar6Gwp = ar6GwpId ? database.prepare("SELECT gwp_ar6 FROM gwp_library WHERE gwp_id = ?").get(ar6GwpId) as { gwp_ar6: number } | undefined : undefined;
    const selectedGwp = ar6Gwp ? asNumber(ar6Gwp.gwp_ar6) : asNumber(refrigerant.gwp_100yr);
    const gasTonnes = normalizedValue * selectedGwp / 1000;
    co2eTotalTonnes = gasTonnes;
    breakdown.refrigerant_co2e_tonnes = gasTonnes;
    factorValue = selectedGwp;
    factorUnit = "kgCO2e/kg";
    factorUsed = String(refrigerant.refrigerant_code);
    factorStatus = String(refrigerant.status);
    sourceReference = String(refrigerant.source_id);
    snapshot.factor = { ...refrigerant, selectedGwp100: selectedGwp, gwpLibraryId: ar6GwpId, gwpStandard: ar6Gwp ? "IPCC AR6" : "GWP informado por REFRIGERANT_LIBRARY; versión no especificada" };
    if (!ar6Gwp) warnings.push("La biblioteca de refrigerantes no especifica versión GWP para este gas; se conserva el valor de referencia sin atribuirlo a AR6.");
  }

  if (input.category === "CUSTOM") {
    const module = getMeasurementModuleForPeriod(input.subcategory, input.reportingPeriod);
    if (!module || module.version === null) throw Object.assign(new Error("El módulo no tiene parámetros vigentes para el período reportado."), { statusCode: 409 });
    scope = `Indicador ambiental · ${String(module.name)}`;
    metricValue = normalizedValue;
    metricUnit = String(module.metricName);
    factorUsed = module.factorValue === null || module.factorValue === undefined ? "Sin factor de GEI aplicado" : `Módulo ${String(module.module_id)} v${String(module.version)}`;
    factorValue = module.factorValue === null || module.factorValue === undefined ? null : asNumber(module.factorValue);
    factorUnit = String(module.factorUnit ?? "");
    factorStatus = String(module.status ?? "NO_APLICA");
    sourceReference = String(module.sourceReference ?? input.sourceReference.trim());
    if (factorValue !== null && factorStatus === "VIGENTE") {
      co2eTotalTonnes = normalizedValue * factorValue / 1000;
      breakdown.module_co2e_tonnes = co2eTotalTonnes;
    } else if (factorValue === null) {
      warnings.push("El módulo no tiene un factor de GEI; se conserva el indicador operacional sin asignar emisiones.");
    }
    snapshot.measurementModule = { ...module, moduleId: String(module.module_id), inputUnit: String(module.unit) };
  }

  if (input.category === "AI" || input.category === "INTERNET") {
    const reportedCo2eKg = input.reportedCo2eKg;
    scope = reportedCo2eKg === undefined ? "Uso digital · impacto no cuantificado" : "Uso digital · GEI reportado fuera del inventario";
    metricValue = input.activityValue;
    metricUnit = input.category === "AI" ? "solicitudes" : "GB";
    if (reportedCo2eKg !== undefined) {
      factorUsed = "GEI informado por el proveedor";
      factorUnit = "kgCO2e reportados";
      factorStatus = "Dato informativo · fuera del inventario corporativo";
      breakdown.reported_co2e_kg = reportedCo2eKg;
    } else {
      factorUsed = "Sin impacto cuantificado";
      factorUnit = "No aplica";
      factorStatus = "Impacto ambiental no cuantificado";
    }
    if (input.reportedEnergyKwh !== undefined) breakdown.reported_energy_kwh = input.reportedEnergyKwh;
    if (input.reportedWaterM3 !== undefined) breakdown.reported_water_m3 = input.reportedWaterM3;
    digitalUsage = { provider: input.digitalProvider!, ...(input.aiModel ? { model: input.aiModel } : {}), ...(input.aiInputTokens !== undefined ? { inputTokens: input.aiInputTokens } : {}), ...(input.aiOutputTokens !== undefined ? { outputTokens: input.aiOutputTokens } : {}), ...(input.internetUploadGb !== undefined ? { uploadGb: input.internetUploadGb } : {}), ...(input.internetDownloadGb !== undefined ? { downloadGb: input.internetDownloadGb } : {}), ...(input.reportedEnergyKwh !== undefined ? { reportedEnergyKwh: input.reportedEnergyKwh } : {}), ...(input.reportedWaterM3 !== undefined ? { reportedWaterM3: input.reportedWaterM3 } : {}), ...(reportedCo2eKg !== undefined ? { reportedCo2eKg } : {}) };
    snapshot.digitalUsage = digitalUsage;
  }

  if (input.category === "AIR") {
    scope = "Emisión atmosférica";
    metricValue = normalizedValue;
    metricUnit = "kg contaminante";
    if (input.subcategory === "CO2" || input.subcategory === "CH4" || input.subcategory === "N2O") {
      const gwp = input.subcategory === "CO2" ? 1 : input.subcategory === "CH4" ? input.gasOrigin === "fugitiveFossil" ? 29.8 : 27 : 273;
      co2eTotalTonnes = normalizedValue * gwp / 1000;
      breakdown[`${input.subcategory.toLowerCase()}_co2e_tonnes`] = co2eTotalTonnes;
      factorValue = gwp;
      factorUnit = "kgCO2e/kg gas";
      factorUsed = `GWP_AR6_${input.subcategory}`;
      factorStatus = "VIGENTE";
      sourceReference = "SRC-004";
      if (input.subcategory === "CH4") warnings.push(input.gasOrigin === "fugitiveFossil" ? "GWP100 29,8 aplicado para CH₄ fugitivo fósil / proceso (IPCC AR6)." : "GWP100 27 aplicado para CH₄ de combustión o biogénico (IPCC AR6).");
    } else {
      const pollutant = database.prepare("SELECT * FROM air_pollutants WHERE pollutant_code = ?").get(input.subcategory) as Record<string, unknown> | undefined;
      const pollutantNames: Record<string, string> = { SOX: "SO2", NOX: "NOX", PM10: "PM10", VOC: "VOC" };
      const resolvedCode = pollutantNames[input.subcategory];
      const resolved = pollutant ?? (resolvedCode ? database.prepare("SELECT * FROM air_pollutants WHERE pollutant_code = ?").get(resolvedCode) as Record<string, unknown> : undefined);
      factorUsed = String(resolved?.pollutant_code ?? input.subcategory);
      factorStatus = String(resolved?.status ?? "SIN_FACTOR_DE_EMISION");
      sourceReference = resolved ? String(resolved.source_id) : input.sourceReference.trim();
      factorValue = null;
      factorUnit = "kg contaminante";
      warnings.push("Contaminante criterio expresado en masa; no se convierte a CO₂e.");
    }
    snapshot.airClassification = { pollutant: input.subcategory, ...(input.subcategory === "CH4" ? { gasOrigin: input.gasOrigin ?? "combustion" } : {}) };
  }

  if (input.category === "PACKAGING") {
    const packaging = database.prepare("SELECT * FROM packaging_library WHERE packaging_code = ?").get(input.subcategory) as Record<string, unknown>;
    scope = "Materiales · Envases y empaques";
    metricValue = normalizedValue * asNumber(packaging.avg_weight_g) / 1000;
    metricUnit = "kg de empaque";
    const recovered = input.recoveredMassKg ?? 0;
    const recycledPct = input.recycledContentPct ?? 0;
    if (recovered > metricValue) throw Object.assign(new Error("La masa recuperada de empaques no puede exceder la masa cargada."), { statusCode: 400, errors: ["VAL-011 · Verifica recuperación vs carga de empaque."], warnings });
    (snapshot as Record<string, unknown>).recoveredMassKg = recovered;
    (snapshot as Record<string, unknown>).recoveryPct = metricValue > 0 ? recovered / metricValue * 100 : 0;
    (snapshot as Record<string, unknown>).recycledContentPct = recycledPct;
    factorUsed = String(packaging.packaging_code);
    factorStatus = "SIN_FACTOR_CO2E_DOCUMENTADO";
    sourceReference = String(packaging.source_id);
    warnings.push("La biblioteca informa masa unitaria y reciclabilidad, pero no aporta factor de CO₂e para este empaque.");
    snapshot.factor = packaging;
  }

  const threshold = getThreshold(input.category);
  let thresholdStatus: CalculationResult["thresholdStatus"] = "NORMAL";
  let thresholdValue: number | null = null;
  if (threshold && input.category === "ELECTRICITY") {
    thresholdValue = normalizedValue + asNumber((database.prepare("SELECT COALESCE(SUM(normalized_value), 0) AS total FROM calculation_runs WHERE tenant_id = ? AND reporting_period = ? AND category = 'ELECTRICITY' AND (? IS NULL OR calculation_id != ?)").get(input.tenantId, input.reportingPeriod, excludingCalculationId ?? null, excludingCalculationId ?? null) as { total: number }).total);
  } else if (threshold && input.category === "WATER") {
    thresholdValue = normalizedValue + asNumber((database.prepare("SELECT COALESCE(SUM(normalized_value), 0) AS total FROM calculation_runs WHERE tenant_id = ? AND reporting_period = ? AND category = 'WATER' AND (? IS NULL OR calculation_id != ?)").get(input.tenantId, input.reportingPeriod, excludingCalculationId ?? null, excludingCalculationId ?? null) as { total: number }).total);
  } else if (threshold && input.category === "WASTE" && input.wasteHazardous) {
    const priorWaste = database.prepare("SELECT normalized_value, snapshot_json FROM calculation_runs WHERE tenant_id = ? AND reporting_period = ? AND category = 'WASTE' AND (? IS NULL OR calculation_id != ?)").all(input.tenantId, input.reportingPeriod, excludingCalculationId ?? null, excludingCalculationId ?? null) as { normalized_value: number; snapshot_json: string }[];
    const priorHazardousKg = priorWaste.reduce((total, run) => total + (JSON.parse(run.snapshot_json).activity.wasteHazardous ? asNumber(run.normalized_value) : 0), 0);
    thresholdValue = (normalizedValue + priorHazardousKg) / 1000;
  } else if (threshold && input.category === "FUEL" && co2eTotalTonnes !== null) {
    const priorScopeOne = database.prepare("SELECT COALESCE(SUM(co2e_total_tonnes), 0) AS total FROM calculation_runs WHERE tenant_id = ? AND reporting_period = ? AND scope LIKE 'Scope 1%' AND (? IS NULL OR calculation_id != ?)").get(input.tenantId, input.reportingPeriod, excludingCalculationId ?? null, excludingCalculationId ?? null) as { total: number };
    thresholdValue = co2eTotalTonnes + asNumber(priorScopeOne.total);
  }
  if (threshold && thresholdValue !== null && thresholdValue >= asNumber(threshold.critical_limit)) thresholdStatus = "CRITICO";
  else if (threshold && thresholdValue !== null && thresholdValue >= asNumber(threshold.warning_limit)) thresholdStatus = "ADVERTENCIA";
  if (thresholdStatus !== "NORMAL" && threshold) warnings.push(`${thresholdStatus}: ${String(threshold.metric_name)}. ${String(threshold.action_required)}.`);
  if (thresholdStatus !== "NORMAL" || input.category === "WASTE" && fallbackApplied) snapshot.recommendations = getRecommendations(input.category, thresholdStatus, fallbackApplied);

  if (co2eTotalTonnes !== null && !Number.isFinite(co2eTotalTonnes)) throw Object.assign(new Error("El resultado no es finito; no se guardó la corrida."), { statusCode: 422, errors: ["El cálculo produjo un valor no válido."], warnings });

  const result: Omit<CalculationResult, "calculationId" | "createdAt"> = {
    category: input.category,
    scope,
    activityValue: input.activityValue,
    activityUnit: input.activityUnit,
    normalizedValue,
    normalizedUnit,
    geography: input.geography,
    reportingPeriod: input.reportingPeriod,
    metricValue,
    metricUnit,
    co2eTotalTonnes,
    factorUsed,
    factorValue,
    factorUnit,
    factorStatus,
    sourceReference: input.sourceReference.trim(),
    fallbackApplied,
    uncertaintyPct,
    dataQualityScore,
    dataQualityRating: ratingForScore(dataQualityScore),
    dataQualityTier: fallbackApplied ? "Tier 3" : dataQualityScore >= 9 ? "Tier 1" : dataQualityScore >= 7 ? "Tier 2" : "Tier 3",
    thresholdStatus,
    warnings,
    validation: Array.from({ length: 15 }, (_, index) => `VD-${String(index + 1).padStart(3, "0")}`),
    breakdown,
    ...(input.category === "WATER" && input.dischargedM3 !== undefined || input.category === "WATER" && input.reusedM3 !== undefined ? { waterBalanceDifferenceM3: input.activityValue - (input.dischargedM3 ?? 0) - (input.reusedM3 ?? 0) } : {}),
    ...(input.category === "WATER" && input.reusedM3 !== undefined ? { waterReusePct: input.activityValue > 0 ? input.reusedM3 / input.activityValue * 100 : 0 } : {}),
    ...(input.category === "MATERIAL" && input.recoveredMassKg !== undefined && input.materialEligibleKg !== undefined ? { circularityIndexPct: input.materialEligibleKg > 0 ? input.recoveredMassKg / input.materialEligibleKg * 100 : 0 } : {}),
    ...(input.category === "MATERIAL" && input.recoveredMassKg !== undefined ? { recoverableMaterialPct: normalizedValue > 0 ? Math.min(100, input.recoveredMassKg / normalizedValue * 100) : 0 } : {}),
    ...(input.category === "MATERIAL" && input.productMassKg !== undefined && input.byproductMassKg !== undefined ? { balanceDifferenceKg: normalizedValue - (input.productMassKg + input.byproductMassKg) } : {}),
    ...(digitalUsage ? { digitalUsage } : {}),
    snapshot: { ...snapshot, recommendations: (snapshot.recommendations as unknown[]) ?? [] },
  };
  return result;
}

function getRecommendations(category: string, threshold: string, fallbackApplied: boolean) {
  const allowed = new Set<string>([category]);
  if (threshold !== "NORMAL") {
    if (category === "ELECTRICITY") allowed.add("ELECTRICITY");
    if (category === "WATER") allowed.add("WATER");
    if (category === "FUEL") allowed.add("FUEL");
  }
  if (fallbackApplied && category === "WASTE") allowed.add("WASTE");
  return database.prepare(`SELECT rec_id AS id, domain_category AS category, probable_cause AS probableCause, opportunity, recommended_action AS action, indicative_investment AS investment, timeframe, priority, venezuela_availability AS venezuelaAvailability, payback_months AS paybackMonths FROM recommendation_engine WHERE domain_category IN (${Array.from(allowed).map(() => "?").join(", ")})`).all(...Array.from(allowed));
}

function insertCalculation(calculationId: string, input: EnvironmentalInput, computed: ReturnType<typeof compute>, createdAt: string) {
  database.prepare(`INSERT INTO calculation_runs (calculation_id, tenant_id, facility_id, facility_name, category, subcategory, scope, activity_value, activity_unit, normalized_value, normalized_unit, geography, reporting_period, metric_value, metric_unit, co2e_total_tonnes, factor_used, factor_value, factor_unit, factor_status, source_reference, fallback_applied, uncertainty_pct, data_quality_score, data_quality_rating, data_quality_tier, threshold_status, warnings_json, validation_json, breakdown_json, snapshot_json, created_at, created_by) VALUES (${Array.from({ length: 33 }, () => "?").join(", ")})`).run(
    calculationId, input.tenantId, input.facilityId, input.facilityName, input.category, input.subcategory, computed.scope, input.activityValue, input.activityUnit, computed.normalizedValue, computed.normalizedUnit, input.geography, input.reportingPeriod, computed.metricValue, computed.metricUnit, computed.co2eTotalTonnes, computed.factorUsed, computed.factorValue, computed.factorUnit, computed.factorStatus, computed.sourceReference, computed.fallbackApplied ? 1 : 0, computed.uncertaintyPct, computed.dataQualityScore, computed.dataQualityRating, computed.dataQualityTier, computed.thresholdStatus, JSON.stringify(computed.warnings), JSON.stringify(computed.validation), JSON.stringify(computed.breakdown), JSON.stringify(computed.snapshot), createdAt, input.createdByUserId ?? null,
  );
}

function saveAudit(row: Record<string, unknown>, action: "EDIT" | "DELETE", changedAt: string) {
  database.prepare("INSERT INTO calculation_run_audit (audit_id, calculation_id, tenant_id, action, changed_at, previous_record_json) VALUES (?, ?, ?, ?, ?, ?)").run(randomUUID(), String(row.calculation_id), String(row.tenant_id), action, changedAt, JSON.stringify(row));
}

function passwordDigest(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

function tokenDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newToken() {
  return randomBytes(32).toString("hex");
}

function isPlatformAdmin(email: string) {
  const admins = (process.env.KLIMATKA_PLATFORM_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

function authIdentity(userId: string, activeCompanyId: string | null): AuthIdentity | null {
  const user = database.prepare("SELECT user_id AS id, email, first_name AS firstName, last_name AS lastName, job_title AS jobTitle FROM users WHERE user_id = ?").get(userId) as Record<string, unknown> | undefined;
  if (!user) return null;
  const companies = (database.prepare("SELECT c.company_id AS id, c.name, c.rif, c.email, c.employee_count AS employeeCount, m.role FROM company_memberships m JOIN companies c ON c.company_id = m.company_id WHERE m.user_id = ? ORDER BY c.name COLLATE NOCASE").all(userId) as Record<string, unknown>[]).map((row): AuthCompany => ({ id: String(row.id), name: String(row.name), rif: String(row.rif), email: String(row.email), employeeCount: asNumber(row.employeeCount), role: String(row.role) as AuthCompany["role"] }));
  const company = companies.find((item) => item.id === activeCompanyId) ?? null;
  return { id: String(user.id), email: String(user.email), firstName: String(user.firstName), lastName: String(user.lastName), jobTitle: String(user.jobTitle), role: company?.role ?? "none", isPlatformAdmin: isPlatformAdmin(String(user.email)), company, companies };
}

export function registerUser(input: UserRegistration) {
  const userId = randomUUID();
  const now = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const sessionToken = newToken();
  database.prepare("INSERT INTO users (user_id, email, first_name, last_name, job_title, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(userId, input.email.trim().toLowerCase(), input.firstName.trim(), input.lastName.trim(), input.jobTitle.trim(), salt, passwordDigest(input.password, salt), now);
  database.prepare("INSERT INTO auth_sessions (token_hash, user_id, company_id, expires_at, created_at) VALUES (?, ?, NULL, ?, ?)").run(tokenDigest(sessionToken), userId, new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(), now);
  return { identity: authIdentity(userId, null)!, sessionToken };
}

export function createCompanyForUser(userId: string, sessionToken: string, input: CompanyRegistration) {
  const companyId = `company-${randomUUID()}`;
  const now = new Date().toISOString();
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare("INSERT INTO companies (company_id, name, rif, email, employee_count, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(companyId, input.companyName.trim(), input.rif.trim().toUpperCase(), input.companyEmail.trim().toLowerCase(), input.employeeCount, now);
    database.prepare("INSERT INTO company_memberships (company_id, user_id, role, created_at) VALUES (?, ?, 'admin', ?)").run(companyId, userId, now);
    database.prepare("UPDATE auth_sessions SET company_id = ? WHERE token_hash = ? AND user_id = ?").run(companyId, tokenDigest(sessionToken), userId);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) throw Object.assign(new Error("Ya existe una empresa con ese RIF."), { statusCode: 409 });
    throw error;
  }
  return authIdentity(userId, companyId)!;
}

export function loginUser(email: string, password: string) {
  const row = database.prepare("SELECT user_id AS userId, password_salt AS passwordSalt, password_hash AS passwordHash FROM users WHERE email = ? COLLATE NOCASE").get(email.trim().toLowerCase()) as Record<string, unknown> | undefined;
  if (!row) throw Object.assign(new Error("Correo o contraseña incorrectos."), { statusCode: 401 });
  const actual = Buffer.from(passwordDigest(password, String(row.passwordSalt)), "hex");
  const expected = Buffer.from(String(row.passwordHash), "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw Object.assign(new Error("Correo o contraseña incorrectos."), { statusCode: 401 });
  const userId = String(row.userId);
  const defaultCompany = database.prepare("SELECT company_id AS companyId FROM company_memberships WHERE user_id = ? ORDER BY created_at LIMIT 1").get(userId) as { companyId: string } | undefined;
  const sessionToken = newToken();
  const now = new Date().toISOString();
  database.prepare("INSERT INTO auth_sessions (token_hash, user_id, company_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(tokenDigest(sessionToken), userId, defaultCompany?.companyId ?? null, new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(), now);
  return { identity: authIdentity(userId, defaultCompany?.companyId ?? null)!, sessionToken };
}

export function createPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const emailHash = tokenDigest(normalizedEmail);
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare("DELETE FROM password_reset_requests WHERE requested_at < ?").run(new Date(nowMs - 1000 * 60 * 60 * 24 * 30).toISOString());
    const previousRequest = database.prepare("SELECT requested_at AS requestedAt FROM password_reset_requests WHERE email_hash = ?").get(emailHash) as { requestedAt: string } | undefined;
    if (previousRequest && nowMs - Date.parse(previousRequest.requestedAt) < 60_000) {
      database.exec("COMMIT");
      return null;
    }
    database.prepare("INSERT INTO password_reset_requests (email_hash, requested_at) VALUES (?, ?) ON CONFLICT (email_hash) DO UPDATE SET requested_at = excluded.requested_at").run(emailHash, now);
    const user = database.prepare("SELECT user_id AS userId FROM users WHERE email = ? COLLATE NOCASE").get(normalizedEmail) as { userId: string } | undefined;
    if (!user) {
      database.exec("COMMIT");
      return null;
    }
    const token = newToken();
    database.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL").run(user.userId);
    database.prepare("INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at, used_at) VALUES (?, ?, ?, ?, NULL)").run(tokenDigest(token), user.userId, new Date(nowMs + 30 * 60_000).toISOString(), now);
    database.exec("COMMIT");
    return { email: normalizedEmail, token };
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function discardPasswordReset(token: string) {
  database.prepare("DELETE FROM password_reset_tokens WHERE token_hash = ?").run(tokenDigest(token));
}

export function resetUserPassword(token: string, password: string) {
  const now = new Date().toISOString();
  database.exec("BEGIN IMMEDIATE");
  try {
    const reset = database.prepare("SELECT user_id AS userId FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?").get(tokenDigest(token), now) as { userId: string } | undefined;
    if (!reset) {
      database.exec("COMMIT");
      return false;
    }
    const salt = randomBytes(16).toString("hex");
    database.prepare("UPDATE users SET password_salt = ?, password_hash = ? WHERE user_id = ?").run(salt, passwordDigest(password, salt), reset.userId);
    database.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ?").run(now, tokenDigest(token));
    database.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? AND token_hash <> ?").run(reset.userId, tokenDigest(token));
    database.prepare("DELETE FROM auth_sessions WHERE user_id = ?").run(reset.userId);
    database.exec("COMMIT");
    return true;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function getSessionIdentity(sessionToken: string) {
  const row = database.prepare("SELECT user_id AS userId, company_id AS companyId FROM auth_sessions WHERE token_hash = ? AND expires_at > ?").get(tokenDigest(sessionToken), new Date().toISOString()) as { userId: string; companyId: string | null } | undefined;
  return row ? authIdentity(row.userId, row.companyId) : null;
}

export function switchActiveCompany(sessionToken: string, userId: string, companyId: string) {
  const membership = database.prepare("SELECT 1 FROM company_memberships WHERE user_id = ? AND company_id = ?").get(userId, companyId);
  if (!membership) throw Object.assign(new Error("No tienes acceso a esa empresa."), { statusCode: 403 });
  database.prepare("UPDATE auth_sessions SET company_id = ? WHERE token_hash = ? AND user_id = ?").run(companyId, tokenDigest(sessionToken), userId);
  return authIdentity(userId, companyId)!;
}

export function deleteSession(sessionToken: string) {
  database.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").run(tokenDigest(sessionToken));
}

export function createCompanyInvitation(companyId: string, createdBy: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const token = newToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  database.prepare("INSERT INTO company_invitations (token_hash, company_id, email, created_by, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(tokenDigest(token), companyId, normalizedEmail, createdBy, expiresAt, new Date().toISOString());
  return { token, expiresAt };
}

export function getCompanyInvitation(token: string): CompanyInvitation | null {
  const row = database.prepare("SELECT i.email, c.name AS companyName, i.expires_at AS expiresAt FROM company_invitations i JOIN companies c ON c.company_id = i.company_id WHERE i.token_hash = ? AND i.accepted_at IS NULL AND i.expires_at > ?").get(tokenDigest(token), new Date().toISOString()) as Record<string, unknown> | undefined;
  return row ? { email: String(row.email), companyName: String(row.companyName), expiresAt: String(row.expiresAt) } : null;
}

export function acceptCompanyInvitation(token: string, userId: string, email: string) {
  const invitation = database.prepare("SELECT company_id AS companyId, email FROM company_invitations WHERE token_hash = ? AND accepted_at IS NULL AND expires_at > ?").get(tokenDigest(token), new Date().toISOString()) as { companyId: string; email: string } | undefined;
  if (!invitation || invitation.email.toLowerCase() !== email.trim().toLowerCase()) throw Object.assign(new Error("La invitación no es válida, expiró o corresponde a otro correo."), { statusCode: 400 });
  const now = new Date().toISOString();
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare("INSERT INTO company_memberships (company_id, user_id, role, created_at) VALUES (?, ?, 'member', ?) ON CONFLICT (company_id, user_id) DO NOTHING").run(invitation.companyId, userId, now);
    database.prepare("UPDATE company_invitations SET accepted_at = ? WHERE token_hash = ? AND accepted_at IS NULL").run(now, tokenDigest(token));
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  return { identity: authIdentity(userId, invitation.companyId)!, companyId: invitation.companyId };
}

export function getCompanyProfile(companyId: string) {
  return database.prepare("SELECT name, rif, email, employee_count AS employeeCount FROM companies WHERE company_id = ?").get(companyId) as { name: string; rif: string; email: string; employeeCount: number } | undefined;
}

function measurementModuleFromRow(row: Record<string, unknown>): MeasurementModule {
  const currentVersion: MeasurementModuleVersion | null = row.version === null ? null : { id: String(row.versionId), moduleId: String(row.moduleId), version: asNumber(row.version), name: String(row.versionName), description: String(row.versionDescription), unit: String(row.versionUnit), metricName: String(row.versionMetricName), factorValue: row.factorValue === null ? null : asNumber(row.factorValue), factorUnit: String(row.factorUnit), sourceReference: String(row.sourceReference), status: String(row.status) as MeasurementModuleVersion["status"], validFrom: String(row.validFrom), createdAt: String(row.versionCreatedAt) };
  return { id: String(row.moduleId), code: String(row.code), name: String(row.name), description: String(row.description), unit: String(row.unit), metricName: String(row.metricName), active: Boolean(row.active), currentVersion };
}

const measurementModuleSelect = `SELECT m.module_id AS moduleId, m.module_code AS code, m.name, m.description, m.unit, m.metric_name AS metricName, m.active, v.version_id AS versionId, v.version, v.name AS versionName, v.description AS versionDescription, v.unit AS versionUnit, v.metric_name AS versionMetricName, v.factor_value AS factorValue, v.factor_unit AS factorUnit, v.source_reference AS sourceReference, v.status, v.valid_from AS validFrom, v.created_at AS versionCreatedAt FROM measurement_modules m LEFT JOIN measurement_module_versions v ON v.module_id = m.module_id AND v.version = (SELECT MAX(v2.version) FROM measurement_module_versions v2 WHERE v2.module_id = m.module_id)`;

export function getMeasurementModules(activeOnly = false) {
  const rows = database.prepare(`${measurementModuleSelect}${activeOnly ? " WHERE m.active = 1" : ""} ORDER BY m.name COLLATE NOCASE`).all() as Record<string, unknown>[];
  return rows.map(measurementModuleFromRow);
}

function getMeasurementModulesForPeriod(reportingPeriod: string) {
  const rows = database.prepare("SELECT m.module_id AS moduleId, m.module_code AS code, COALESCE(v.name, m.name) AS name, COALESCE(v.description, m.description) AS description, COALESCE(v.unit, m.unit) AS unit, COALESCE(v.metric_name, m.metric_name) AS metricName, m.active, v.version_id AS versionId, v.version, v.name AS versionName, v.description AS versionDescription, v.unit AS versionUnit, v.metric_name AS versionMetricName, v.factor_value AS factorValue, v.factor_unit AS factorUnit, v.source_reference AS sourceReference, v.status, v.valid_from AS validFrom, v.created_at AS versionCreatedAt FROM measurement_modules m LEFT JOIN measurement_module_versions v ON v.version_id = (SELECT v2.version_id FROM measurement_module_versions v2 WHERE v2.module_id = m.module_id AND v2.valid_from <= ? ORDER BY v2.valid_from DESC, v2.version DESC LIMIT 1) WHERE m.active = 1 ORDER BY COALESCE(v.name, m.name) COLLATE NOCASE").all(`${reportingPeriod}-01`) as Record<string, unknown>[];
  return rows.map(measurementModuleFromRow);
}

export function createMeasurementModule(input: Omit<MeasurementModule, "id" | "active" | "currentVersion"> & { factorValue?: number | null; factorUnit: string; sourceReference: string; status: MeasurementModuleVersion["status"]; validFrom: string }) {
  if (input.factorValue != null && !input.sourceReference.trim()) throw Object.assign(new Error("Un parámetro con factor requiere fuente documental."), { statusCode: 400 });
  const moduleId = `module-${randomUUID()}`;
  const now = new Date().toISOString();
  try {
    database.exec("BEGIN IMMEDIATE");
    database.prepare("INSERT INTO measurement_modules (module_id, module_code, name, description, unit, metric_name, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)").run(moduleId, input.code.toUpperCase(), input.name.trim(), input.description.trim(), input.unit.trim(), input.metricName.trim(), now);
    database.prepare("INSERT INTO measurement_module_versions (version_id, module_id, version, name, description, unit, metric_name, factor_value, factor_unit, source_reference, status, valid_from, created_at) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), moduleId, input.name.trim(), input.description.trim(), input.unit.trim(), input.metricName.trim(), input.factorValue ?? null, input.factorUnit, input.sourceReference.trim(), input.status, input.validFrom, now);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) throw Object.assign(new Error("Ya existe un módulo con ese código."), { statusCode: 409 });
    throw error;
  }
  return getMeasurementModules().find((module) => module.id === moduleId)!;
}

export function updateMeasurementModule(moduleId: string, input: { name: string; description: string; unit: string; metricName: string; active: boolean; factorValue?: number | null; factorUnit: string; sourceReference: string; status: MeasurementModuleVersion["status"]; validFrom: string }) {
  const exists = database.prepare("SELECT module_id FROM measurement_modules WHERE module_id = ?").get(moduleId);
  if (!exists) throw Object.assign(new Error("No se encontró el módulo."), { statusCode: 404 });
  if (input.factorValue != null && !input.sourceReference.trim()) throw Object.assign(new Error("Un parámetro con factor requiere fuente documental."), { statusCode: 400 });
  const current = getMeasurementModules().find((module) => module.id === moduleId)!;
  const now = new Date().toISOString();
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare("UPDATE measurement_modules SET name = ?, description = ?, unit = ?, metric_name = ?, active = ? WHERE module_id = ?").run(input.name.trim(), input.description.trim(), input.unit.trim(), input.metricName.trim(), input.active ? 1 : 0, moduleId);
    const nextVersion = (current.currentVersion?.version ?? 0) + 1;
    database.prepare("INSERT INTO measurement_module_versions (version_id, module_id, version, name, description, unit, metric_name, factor_value, factor_unit, source_reference, status, valid_from, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), moduleId, nextVersion, input.name.trim(), input.description.trim(), input.unit.trim(), input.metricName.trim(), input.factorValue ?? null, input.factorUnit, input.sourceReference.trim(), input.status, input.validFrom, now);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  return getMeasurementModules().find((module) => module.id === moduleId)!;
}

export function getMeasurementModuleVersions(moduleId: string) {
  const rows = database.prepare("SELECT version_id AS id, module_id AS moduleId, version, name, description, unit, metric_name AS metricName, factor_value AS factorValue, factor_unit AS factorUnit, source_reference AS sourceReference, status, valid_from AS validFrom, created_at AS createdAt FROM measurement_module_versions WHERE module_id = ? ORDER BY version DESC").all(moduleId) as Record<string, unknown>[];
  return rows.map((row): MeasurementModuleVersion => ({ id: String(row.id), moduleId: String(row.moduleId), version: asNumber(row.version), name: String(row.name), description: String(row.description), unit: String(row.unit), metricName: String(row.metricName), factorValue: row.factorValue === null ? null : asNumber(row.factorValue), factorUnit: String(row.factorUnit), sourceReference: String(row.sourceReference), status: String(row.status) as MeasurementModuleVersion["status"], validFrom: String(row.validFrom), createdAt: String(row.createdAt) }));
}

export function setSessionCompany(sessionToken: string, companyId: string) {
  database.prepare("UPDATE auth_sessions SET company_id = ? WHERE token_hash = ?").run(companyId, tokenDigest(sessionToken));
}

function duplicateSourceError(error: unknown): never {
  const message = error instanceof Error ? error.message : "Error al guardar la corrida.";
  if (message.includes("UNIQUE constraint failed")) throw Object.assign(new Error("Esta fuente ya fue contabilizada para la instalación, categoría y período."), { statusCode: 409, errors: ["VD-011 · Evita contabilizar dos veces la misma fuente."] });
  throw error;
}

export function getFacilityHeadcount(tenantId: string, facilityId: string, reportingPeriod: string) {
  const row = database.prepare("SELECT employee_count AS employeeCount FROM facility_headcounts WHERE tenant_id = ? AND facility_id = ? AND reporting_period = ?").get(tenantId, facilityId, reportingPeriod) as { employeeCount: number } | undefined;
  return row ? asNumber(row.employeeCount) : null;
}

export function getFacilityHeadcounts(tenantId: string, year: string, month?: string) {
  const rows = month
    ? database.prepare("SELECT facility_id AS facilityId, facility_name AS facilityName, reporting_period AS reportingPeriod, employee_count AS employeeCount FROM facility_headcounts WHERE tenant_id = ? AND reporting_period = ? ORDER BY facility_name").all(tenantId, `${year}-${month}`)
    : database.prepare("SELECT facility_id AS facilityId, facility_name AS facilityName, reporting_period AS reportingPeriod, employee_count AS employeeCount FROM facility_headcounts WHERE tenant_id = ? AND reporting_period LIKE ? ORDER BY facility_name, reporting_period").all(tenantId, `${year}-%`);
  return (rows as Record<string, unknown>[]).map((row) => ({
    facilityId: String(row.facilityId),
    facilityName: String(row.facilityName),
    reportingPeriod: String(row.reportingPeriod),
    employeeCount: asNumber(row.employeeCount),
  }));
}

function saveFacilityHeadcount(input: EnvironmentalInput, updatedAt: string) {
  if (input.employeeCount === undefined) return;
  database.prepare("INSERT INTO facility_headcounts (tenant_id, facility_id, facility_name, reporting_period, employee_count, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (tenant_id, facility_id, reporting_period) DO UPDATE SET facility_name = excluded.facility_name, employee_count = excluded.employee_count, updated_at = excluded.updated_at").run(input.tenantId, input.facilityId, input.facilityName, input.reportingPeriod, input.employeeCount, updatedAt);
}

export function createCalculation(input: EnvironmentalInput): CalculationResult {
  const computed = compute(input);
  const createdAt = new Date().toISOString();
  const calculationId = `CALC-${createdAt.slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8)}`;
  database.exec("BEGIN IMMEDIATE");
  try {
    saveFacilityHeadcount(input, createdAt);
    insertCalculation(calculationId, input, computed, createdAt);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    duplicateSourceError(error);
  }
  return { ...computed, calculationId, createdAt };
}

export function updateCalculation(calculationId: string, tenantId: string, input: EnvironmentalInput): CalculationResult {
  database.exec("BEGIN IMMEDIATE");
  try {
    const current = database.prepare("SELECT * FROM calculation_runs WHERE calculation_id = ? AND tenant_id = ?").get(calculationId, tenantId) as Record<string, unknown> | undefined;
    if (!current) throw Object.assign(new Error("No se encontró el registro que deseas modificar."), { statusCode: 404 });
    const computed = compute(input, calculationId);
    const previousSnapshot = JSON.parse(String(current.snapshot_json)) as Record<string, unknown>;
    const previousRevision = typeof previousSnapshot.revision === "number" ? previousSnapshot.revision : 1;
    const revised = { ...computed, snapshot: { ...computed.snapshot, revision: previousRevision + 1 } };
    const changedAt = new Date().toISOString();
    saveAudit(current, "EDIT", changedAt);
    saveFacilityHeadcount(input, changedAt);
    database.prepare("DELETE FROM calculation_runs WHERE calculation_id = ? AND tenant_id = ?").run(calculationId, tenantId);
    insertCalculation(calculationId, input, revised, changedAt);
    database.exec("COMMIT");
    return { ...revised, calculationId, createdAt: changedAt };
  } catch (error) {
    database.exec("ROLLBACK");
    duplicateSourceError(error);
  }
}

export function deleteCalculation(calculationId: string, tenantId: string) {
  database.exec("BEGIN IMMEDIATE");
  try {
    const current = database.prepare("SELECT * FROM calculation_runs WHERE calculation_id = ? AND tenant_id = ?").get(calculationId, tenantId) as Record<string, unknown> | undefined;
    if (!current) throw Object.assign(new Error("No se encontró el registro que deseas eliminar."), { statusCode: 404 });
    saveAudit(current, "DELETE", new Date().toISOString());
    database.prepare("DELETE FROM calculation_runs WHERE calculation_id = ? AND tenant_id = ?").run(calculationId, tenantId);
    database.exec("COMMIT");
    return { calculationId };
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function getCalculationHistory(calculationId: string, tenantId: string) {
  return (database.prepare("SELECT action, changed_at AS changedAt, previous_record_json AS previousRecord FROM calculation_run_audit WHERE calculation_id = ? AND tenant_id = ? ORDER BY changed_at DESC").all(calculationId, tenantId) as Record<string, unknown>[]).map((entry) => ({ action: String(entry.action), changedAt: String(entry.changedAt), previousRecord: fromRow(JSON.parse(String(entry.previousRecord)) as Record<string, unknown>) }));
}

function fromRow(row: Record<string, unknown>): CalculationResult {
  const snapshot = JSON.parse(String(row.snapshot_json)) as Record<string, unknown>;
  const run: CalculationResult = {
    calculationId: String(row.calculation_id),
    category: String(row.category) as ActivityCategory,
    scope: String(row.scope),
    activityValue: asNumber(row.activity_value),
    activityUnit: String(row.activity_unit),
    normalizedValue: asNumber(row.normalized_value),
    normalizedUnit: String(row.normalized_unit),
    geography: String(row.geography),
    reportingPeriod: String(row.reporting_period),
    metricValue: asNumber(row.metric_value),
    metricUnit: String(row.metric_unit),
    co2eTotalTonnes: row.co2e_total_tonnes === null ? null : asNumber(row.co2e_total_tonnes),
    factorUsed: String(row.factor_used),
    factorValue: row.factor_value === null ? null : asNumber(row.factor_value),
    factorUnit: String(row.factor_unit),
    factorStatus: String(row.factor_status),
    sourceReference: String(row.source_reference),
    fallbackApplied: Boolean(row.fallback_applied),
    uncertaintyPct: asNumber(row.uncertainty_pct),
    dataQualityScore: asNumber(row.data_quality_score),
    dataQualityRating: String(row.data_quality_rating),
    dataQualityTier: String(row.data_quality_tier),
    thresholdStatus: String(row.threshold_status) as CalculationResult["thresholdStatus"],
    warnings: JSON.parse(String(row.warnings_json)) as string[],
    validation: JSON.parse(String(row.validation_json)) as string[],
    breakdown: JSON.parse(String(row.breakdown_json)) as Record<string, number>,
    snapshot,
    createdAt: String(row.created_at),
  };
  const digitalUsage = snapshot.digitalUsage;
  if (digitalUsage && typeof digitalUsage === "object") run.digitalUsage = digitalUsage as CalculationResult["digitalUsage"];
  for (const key of ["waterBalanceDifferenceM3", "waterReusePct", "circularityIndexPct", "recoverableMaterialPct", "balanceDifferenceKg"] as const) {
    const value = snapshot[key];
    if (typeof value === "number") run[key] = value;
  }
  return run;
}

export function getOverview(tenantId: string): EnvironmentalOverview {
  const totals = database.prepare(`SELECT COUNT(*) AS runCount, COUNT(co2e_total_tonnes) AS co2eRunCount, COALESCE(SUM(co2e_total_tonnes), 0) AS co2eTonnes, COALESCE(SUM(CASE WHEN category = 'ELECTRICITY' THEN normalized_value ELSE 0 END), 0) AS electricityKwh, COALESCE(SUM(CASE WHEN category = 'WATER' THEN normalized_value ELSE 0 END), 0) AS waterM3, COALESCE(SUM(CASE WHEN category = 'WASTE' THEN normalized_value ELSE 0 END), 0) / 1000 AS wasteTonnes FROM calculation_runs WHERE tenant_id = ?`).get(tenantId) as Record<string, unknown>;
  const recentRuns = (database.prepare("SELECT * FROM calculation_runs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 8").all(tenantId) as Record<string, unknown>[]).map(fromRow);
  const monthlyEmissions = (database.prepare("SELECT reporting_period AS period, SUM(co2e_total_tonnes) AS tonnes FROM calculation_runs WHERE tenant_id = ? AND co2e_total_tonnes IS NOT NULL GROUP BY reporting_period ORDER BY reporting_period DESC LIMIT 6").all(tenantId) as Record<string, unknown>[]).map((row) => ({ period: String(row.period), tonnes: asNumber(row.tonnes) })).reverse();
  const availablePeriods = (database.prepare("SELECT DISTINCT reporting_period AS period FROM calculation_runs WHERE tenant_id = ? ORDER BY reporting_period DESC").all(tenantId) as { period: string }[]).map((row) => row.period);
  const availableYears = [...new Set(availablePeriods.map((period) => period.slice(0, 4)))];
  const library = {
    tableCount: libraryTableCount,
    factorCount: (database.prepare("SELECT (SELECT COUNT(*) FROM factor_library) + (SELECT COUNT(*) FROM electricity_library) + (SELECT COUNT(*) FROM fuel_library) + (SELECT COUNT(*) FROM water_library) + (SELECT COUNT(*) FROM material_library) + (SELECT COUNT(*) FROM waste_destination) + (SELECT COUNT(*) FROM refrigerant_library) AS count").get() as { count: number }).count,
    sourceCount: (database.prepare("SELECT COUNT(*) AS count FROM source_library").get() as { count: number }).count,
    pendingNationalCount: (database.prepare("SELECT COUNT(*) AS count FROM factor_library WHERE status = 'PENDIENTE_VALIDACION_OFICIAL' AND factor_code != 'GRID_VE_2024'").get() as { count: number }).count + (database.prepare("SELECT COUNT(*) AS count FROM electricity_library WHERE status = 'PENDIENTE_VALIDACION_OFICIAL'").get() as { count: number }).count + (database.prepare("SELECT COUNT(*) AS count FROM waste_destination WHERE status = 'PENDIENTE_VALIDACION_OFICIAL'").get() as { count: number }).count,
    validationRuleCount: (database.prepare("SELECT COUNT(*) AS count FROM validation_rules").get() as { count: number }).count,
  };
  const pendingFactors = database.prepare("SELECT factor_code AS code, factor_name AS name, status, value_co2e AS value, unit FROM factor_library WHERE status = 'PENDIENTE_VALIDACION_OFICIAL' AND factor_code != 'GRID_VE_2024' UNION ALL SELECT grid_code AS code, country_region AS name, status, ef_co2_kg_kwh AS value, 'kgCO2e/kWh' AS unit FROM electricity_library WHERE status = 'PENDIENTE_VALIDACION_OFICIAL' UNION ALL SELECT destination_code AS code, destination_name AS name, status, ef_kgco2e_per_kg AS value, 'kgCO2e/kg' AS unit FROM waste_destination WHERE status = 'PENDIENTE_VALIDACION_OFICIAL'").all() as EnvironmentalOverview["pendingFactors"];
  return {
    totals: { co2eTonnes: asNumber(totals.co2eTonnes), co2eRunCount: asNumber(totals.co2eRunCount), electricityKwh: asNumber(totals.electricityKwh), waterM3: asNumber(totals.waterM3), wasteTonnes: asNumber(totals.wasteTonnes), runCount: asNumber(totals.runCount) },
    monthlyEmissions,
    availablePeriods,
    availableYears,
    recentRuns,
    library,
    pendingFactors,
  };
}

export function getInputOptions(reportingPeriod?: string) {
  return {
    modules: reportingPeriod ? getMeasurementModulesForPeriod(reportingPeriod) : getMeasurementModules(true),
    fuels: database.prepare("SELECT fuel_code AS code, fuel_name AS name, default_unit AS unit FROM fuel_library ORDER BY fuel_name").all(),
    water: database.prepare("SELECT process_code AS code, process_name AS name FROM water_library ORDER BY process_name").all(),
    wasteDestinations: database.prepare("SELECT destination_code AS code, destination_name AS name FROM waste_destination ORDER BY destination_name").all(),
    materials: database.prepare("SELECT material_code AS code, material_name AS name FROM material_library ORDER BY material_name").all(),
    packaging: database.prepare("SELECT packaging_code AS code, packaging_name AS name FROM packaging_library ORDER BY packaging_name").all(),
    refrigerants: database.prepare("SELECT refrigerant_code AS code, chemical_name AS name FROM refrigerant_library WHERE status = 'VIGENTE' ORDER BY chemical_name").all(),
  };
}

export function getLibrary() {
  return {
    counts: Object.fromEntries(factorTables.map((table) => [table, (database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count])),
    electricity: database.prepare("SELECT grid_code AS code, country_region AS name, ef_co2_kg_kwh AS co2Factor, ef_ch4_g_kwh AS ch4Factor, ef_n2o_g_kwh AS n2oFactor, year, status, source_id AS sourceId, data_quality_tier AS tier, uncertainty_pct AS uncertaintyPct FROM electricity_library ORDER BY elec_id").all(),
    fuels: database.prepare("SELECT fuel_code AS code, fuel_name AS name, default_unit AS unit, co2_factor_kg_unit AS co2Factor, ch4_factor_g_unit AS ch4Factor, n2o_factor_g_unit AS n2oFactor, density_kg_l AS density, ncv_gj_unit AS ncv, status, source_id AS sourceId FROM fuel_library ORDER BY fuel_id").all(),
    water: database.prepare("SELECT process_code AS code, process_name AS name, ef_supply_kgco2e_m3 AS supplyFactor, ef_treatment_kgco2e_m3 AS treatmentFactor, status, source_id AS sourceId FROM water_library ORDER BY water_id").all(),
    wasteDestinations: database.prepare("SELECT dest_id AS code, destination_name AS name, ef_kgco2e_per_kg AS factor, status, source_id AS sourceId FROM waste_destination ORDER BY dest_id").all(),
    materials: database.prepare("SELECT material_code AS code, material_name AS name, embodied_carbon_kgco2e_kg AS embodiedFactor, recycled_content_default_pct AS recycledContentPct, status, source_id AS sourceId FROM material_library ORDER BY mat_id").all(),
    sources: database.prepare("SELECT source_id AS id, source_title AS title, author_org AS organization, publication_year AS year, reliability_tier AS tier, doi_or_url AS reference FROM source_library ORDER BY source_id").all(),
    gwp: database.prepare("SELECT gwp_id AS id, gas_name AS gas, chemical_formula AS formula, context, gwp_ar6 AS gwp, source_reference AS source FROM gwp_library ORDER BY gwp_id").all(),
    conversions: database.prepare("SELECT conversion_id AS id, from_unit AS fromUnit, to_unit AS toUnit, multiplier, description FROM conversion_library ORDER BY conversion_id").all(),
    packaging: database.prepare("SELECT packaging_code AS code, packaging_name AS name, material_type AS material, avg_weight_g AS avgWeightG, recyclable, status, source_id AS sourceId FROM packaging_library ORDER BY pkg_id").all(),
    refrigerants: database.prepare("SELECT refrigerant_code AS code, chemical_name AS name, gwp_100yr AS gwp, status, source_id AS sourceId FROM refrigerant_library WHERE status = 'VIGENTE' ORDER BY ref_id").all(),
    pollutants: database.prepare("SELECT pollutant_code AS code, pollutant_name AS name, status, source_id AS sourceId FROM air_pollutants ORDER BY pollutant_id").all(),
    rules: database.prepare("SELECT rule_id AS id, target_table AS target, field_name AS field, rule_expression AS expression, error_message AS errorMessage FROM validation_rules ORDER BY rule_id").all(),
    methodology: database.prepare("SELECT component, standard_reference AS reference, version, compliance FROM methodology_version ORDER BY component").all(),
    roadmap: database.prepare("SELECT phase_code AS code, phase_name AS name, time_horizon AS horizon, core_objectives AS objectives, deliverable_output AS output FROM reporting_roadmap ORDER BY phase_code").all(),
  };
}

export function getRuns(tenantId: string, year?: string, month?: string) {
  const period = month ? `${year}-${month}` : year;
  if (!period) return (database.prepare("SELECT * FROM calculation_runs WHERE tenant_id = ? ORDER BY reporting_period DESC, created_at DESC LIMIT 1000").all(tenantId) as Record<string, unknown>[]).map(fromRow);
  const pattern = month ? period : `${year}-%`;
  return (database.prepare("SELECT * FROM calculation_runs WHERE tenant_id = ? AND reporting_period LIKE ? ORDER BY reporting_period DESC, created_at DESC LIMIT 1000").all(tenantId, pattern) as Record<string, unknown>[]).map(fromRow);
}

export function getAllRuns(tenantId: string) {
  return (database.prepare("SELECT * FROM calculation_runs WHERE tenant_id = ? ORDER BY reporting_period DESC, created_at DESC").all(tenantId) as Record<string, unknown>[]).map(fromRow);
}

export function getDatabaseHealth(tenantId: string) {
  return database.prepare("SELECT COUNT(*) AS runCount FROM calculation_runs WHERE tenant_id = ?").get(tenantId);
}
