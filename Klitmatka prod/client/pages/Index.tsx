import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  Download,
  Droplets,
  Factory,
  FileBarChart2,
  Film,
  Flame,
  Gauge,
  Leaf,
  Lightbulb,
  LoaderCircle,
  LogOut,
  UserPlus,
  Menu,
  Plus,
  Pencil,
  PackageOpen,
  Recycle,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import klimatkaLogo from "../lib/klimatka-logo.png";
import klimatkaLogoAnimationBase from "../lib/klimatka-logo-animation-base.png";
import type { AuthIdentity, MeasurementModule } from "@shared/auth";
import {
  activityCategories,
  type ActivityCategory,
  type CalculationResult,
  type EnvironmentalInput,
  type EnvironmentalOverview,
  type FacilityHeadcount,
  type QualityDimension,
} from "@shared/environment";

const USER_MANUAL_DOWNLOAD_URL = "/manual-usuario.md";
const WELCOME_ANIMATION_DOWNLOAD_URL = "/klimatka-intro.mp4";

type Library = {
  electricity: {
    code: string;
    name: string;
    co2Factor: number;
    ch4Factor: number;
    n2oFactor: number;
    year: number;
    status: string;
    sourceId: string;
    tier: string;
    uncertaintyPct: number;
  }[];
  fuels: {
    code: string;
    name: string;
    unit: string;
    co2Factor: number;
    ch4Factor: number;
    n2oFactor: number;
    density: number;
    ncv: number;
    status: string;
    sourceId: string;
  }[];
  water: {
    code: string;
    name: string;
    supplyFactor: number;
    treatmentFactor: number;
    status: string;
    sourceId: string;
  }[];
  wasteDestinations: {
    code: string;
    name: string;
    factor: number;
    status: string;
    sourceId: string;
  }[];
  materials: {
    code: string;
    name: string;
    embodiedFactor: number;
    recycledContentPct: number;
    status: string;
    sourceId: string;
  }[];
  packaging: {
    code: string;
    name: string;
    material: string;
    avgWeightG: number;
    recyclable: string;
    status: string;
    sourceId: string;
  }[];
  refrigerants: {
    code: string;
    name: string;
    gwp: number;
    status: string;
    sourceId: string;
  }[];
  pollutants: {
    code: string;
    name: string;
    status: string;
    sourceId: string;
  }[];
  sources: {
    id: string;
    title: string;
    organization: string;
    year: number;
    tier: string;
    reference: string;
  }[];
  gwp: {
    id: string;
    gas: string;
    formula: string;
    context: string;
    gwp: number;
    source: string;
  }[];
  conversions: {
    id: string;
    fromUnit: string;
    toUnit: string;
    multiplier: number;
    description: string;
  }[];
  rules: {
    id: string;
    target: string;
    field: string;
    expression: string;
    errorMessage: string;
  }[];
  methodology: {
    component: string;
    reference: string;
    version: string;
    compliance: string;
  }[];
  roadmap: {
    code: string;
    name: string;
    horizon: string;
    objectives: string;
    output: string;
  }[];
  counts: Record<string, number>;
};

type ActivityOptions = {
  modules: MeasurementModule[];
  fuels: { code: string; name: string; unit: string }[];
  water: { code: string; name: string }[];
  wasteDestinations: { code: string; name: string }[];
  materials: { code: string; name: string }[];
  packaging: { code: string; name: string }[];
  refrigerants: { code: string; name: string }[];
};

type View = "Resumen" | "Registros" | "Calidad" | "Plan de acción";

type CalculationError = {
  message?: string;
  errors?: string[];
  warnings?: string[];
};

const qualityLabels = [
  "Fuente",
  "Medición",
  "Representatividad temporal",
  "Representatividad operacional",
  "Trazabilidad",
];
const qualityKeys: (keyof EnvironmentalInput["quality"])[] = [
  "source",
  "measurement",
  "temporalRepresentativeness",
  "operationalRepresentativeness",
  "traceability",
];
const monthOptions = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const categoryLabels: Record<ActivityCategory, string> = {
  ELECTRICITY: "Electricidad",
  FUEL: "Combustible",
  WATER: "Agua",
  WASTE: "Residuos",
  MATERIAL: "Materiales",
  PACKAGING: "Empaques",
  REFRIGERANT: "Refrigerantes",
  AIR: "Emisiones al aire",
  AI: "Uso de IA",
  INTERNET: "Internet",
  CUSTOM: "Módulos adicionales",
};
const categoryIcons: Record<ActivityCategory, typeof Zap> = {
  ELECTRICITY: Zap,
  FUEL: Flame,
  WATER: Droplets,
  WASTE: Recycle,
  MATERIAL: Factory,
  PACKAGING: PackageOpen,
  REFRIGERANT: Gauge,
  AIR: Activity,
  AI: Sparkles,
  INTERNET: Activity,
  CUSTOM: Activity,
};
const monthNow = new Date().toISOString().slice(0, 7);
const facilityIdForName = (facilityName: string) =>
  `facility-${facilityName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("es-VE", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return new Intl.DateTimeFormat("es", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function amountText(value: number | null | undefined, digits = 1) {
  return value === null || value === undefined
    ? "—"
    : formatNumber(value, digits);
}

function calculatedResultText(run: CalculationResult) {
  if (run.digitalUsage) {
    const reportedImpact =
      run.digitalUsage.reportedCo2eKg === undefined
        ? "impacto no cuantificado"
        : `${formatNumber(run.digitalUsage.reportedCo2eKg, 2)} kgCO₂e informados`;
    return `${formatNumber(run.activityValue, 2)} ${run.activityUnit} · ${reportedImpact}`;
  }
  return run.co2eTotalTonnes === null
    ? `${formatNumber(run.metricValue, 2)} ${run.metricUnit}`
    : `${formatNumber(run.co2eTotalTonnes, 3)} tCO₂e`;
}

function InputField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field-wrap">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Leaf;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={21} strokeWidth={1.7} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

function StatusTag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red";
}) {
  return (
    <span className={`status-tag status-${tone}`}>
      <i />
      {children}
    </span>
  );
}

function useEnvironmentalData(
  role: AuthIdentity["role"],
  companyId: string,
  year: string,
  periodMode: "ANUAL" | "MENSUAL",
  month: string,
  comparisonYear: string,
) {
  const [overview, setOverview] = useState<EnvironmentalOverview | null>(null);
  const [library, setLibrary] = useState<Library | null>(null);
  const [activityOptions, setActivityOptions] = useState<ActivityOptions | null>(null);
  const [runs, setRuns] = useState<CalculationResult[]>([]);
  const [periodRuns, setPeriodRuns] = useState<CalculationResult[]>([]);
  const [periodHeadcounts, setPeriodHeadcounts] = useState<FacilityHeadcount[]>([]);
  const [comparisonRuns, setComparisonRuns] = useState<CalculationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const [overviewResponse, libraryResponse, runsResponse] = await Promise.all(
      [
        fetch("/api/environment/overview"),
        fetch(role === "admin" ? "/api/environment/library" : "/api/environment/options"),
        fetch("/api/environment/runs"),
      ],
    );
    if (!overviewResponse.ok || !libraryResponse.ok || !runsResponse.ok)
      throw new Error("No fue posible cargar los datos ambientales.");
    const [overviewData, libraryData, runsData] = await Promise.all([
      overviewResponse.json(),
      libraryResponse.json(),
      runsResponse.json(),
    ]);
    setOverview(overviewData);
    setLibrary(role === "admin" ? libraryData : null);
    setActivityOptions(libraryData);
    setRuns(runsData);
  }, [role, companyId]);
  const refreshPeriodRuns = useCallback(
    async (
      selectedYear = year,
      selectedMode = periodMode,
      selectedMonth = month,
    ) => {
      const periodQuery = new URLSearchParams({ year: selectedYear });
      if (selectedMode === "MENSUAL") periodQuery.set("month", selectedMonth);
      const [response, headcountsResponse] = await Promise.all([
        fetch(`/api/environment/runs?${periodQuery.toString()}`),
        fetch(`/api/environment/headcounts?${periodQuery.toString()}`),
      ]);
      if (!response.ok || !headcountsResponse.ok)
        throw new Error("No fue posible cargar los registros del período.");
      const [runsData, headcountsData] = await Promise.all([
        response.json(),
        headcountsResponse.json(),
      ]);
      setPeriodRuns(runsData);
      setPeriodHeadcounts(headcountsData);
    },
    [companyId, year, periodMode, month],
  );
  const refreshComparisonRuns = useCallback(
    async (
      selectedYear = comparisonYear,
      selectedMode = periodMode,
      selectedMonth = month,
    ) => {
      const periodQuery = new URLSearchParams({ year: selectedYear });
      if (selectedMode === "MENSUAL") periodQuery.set("month", selectedMonth);
      const response = await fetch(
        `/api/environment/runs?${periodQuery.toString()}`,
      );
      if (!response.ok)
        throw new Error(
          "No fue posible cargar los registros del período de comparación.",
        );
      setComparisonRuns(await response.json());
    },
    [companyId, comparisonYear, periodMode, month],
  );
  useEffect(() => {
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [refresh]);
  useEffect(() => {
    Promise.all([refreshPeriodRuns(), refreshComparisonRuns()]).catch(
      () => undefined,
    );
  }, [refreshPeriodRuns, refreshComparisonRuns]);
  return {
    overview,
    library,
    activityOptions,
    runs,
    periodRuns,
    periodHeadcounts,
    comparisonRuns,
    loading,
    refresh,
    refreshPeriodRuns,
    refreshComparisonRuns,
  };
}

export default function Index({ identity, onManageCompanies }: { identity: AuthIdentity & { company: NonNullable<AuthIdentity["company"]> }; onManageCompanies: () => void }) {
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIntroComplete(true), 5_000);
    return () => window.clearTimeout(timeout);
  }, []);

  return introComplete ? <EnvironmentalWorkspace identity={identity} onManageCompanies={onManageCompanies} /> : <LaunchScreen />;
}

function LaunchScreen() {
  return (
    <main className="launch-screen" aria-busy="true">
      <div className="launch-card">
        <div className="launch-logo-frame">
          <img
            className="launch-logo-base"
            src={klimatkaLogoAnimationBase}
            alt=""
            aria-hidden="true"
          />
          <svg
            className="launch-wordmark"
            viewBox="0 0 1224 792"
            role="img"
            aria-label="Klimatka, plataforma de inteligencia ambiental"
          >
            <g className="launch-trajectories" aria-hidden="true">
              <path
                className="launch-trail"
                pathLength={1}
                style={{ animationDelay: "0ms" }}
                d="M264 320 C280 372 311 392 339 389"
              />
              <path
                className="launch-trail"
                pathLength={1}
                style={{ animationDelay: "120ms" }}
                d="M446 300 C438 333 421 352 401 371"
              />
              <path
                className="launch-trail"
                pathLength={1}
                style={{ animationDelay: "240ms" }}
                d="M594 306 C574 335 550 355 527 377"
              />
              <path
                className="launch-trail"
                pathLength={1}
                style={{ animationDelay: "360ms" }}
                d="M628 435 C658 410 684 394 706 377"
              />
              <path
                className="launch-trail"
                pathLength={1}
                style={{ animationDelay: "480ms" }}
                d="M836 320 C828 347 813 369 796 389"
              />
              <path
                className="launch-trail"
                pathLength={1}
                style={{ animationDelay: "600ms" }}
                d="M964 312 C944 340 915 365 892 385"
              />
              <path
                className="launch-trail"
                pathLength={1}
                style={{ animationDelay: "720ms" }}
                d="M1070 436 C1044 411 1024 391 1006 373"
              />
            </g>
            <g
              className="launch-wordmark-paths"
              transform="translate(0 792) scale(1 -1)"
              fill="#000"
            >
              <g className="launch-letter launch-letter-1">
                <rect x="318.818" y="339.222" width="35.173" height="146.62" />
              </g>
              <g className="launch-letter launch-letter-2">
                <rect x="381.85" y="339.223" width="34.976" height="106.901" />
                <path d="M412.38 490.09 C415.868 486.599 417.616 482.087 417.616 476.555 C417.616 471.152 415.868 466.675 412.38 463.118 C408.887 459.561 404.441 457.783 399.041 457.783 C393.638 457.783 389.192 459.561 385.704 463.118 C382.211 466.675 380.467 471.152 380.467 476.555 C380.467 482.087 382.211 486.599 385.704 490.09 C389.192 493.579 393.638 495.327 399.041 495.327 C404.441 495.327 408.887 493.579 412.38 490.09 Z" />
              </g>
              <g transform="translate(614.2264 436.4422)">
                <g className="launch-letter launch-letter-3">
                  <path d="M0 0 C6.98 -7.379 10.473 -17.324 10.473 -29.838 L10.473 -97.22 L-24.7 -97.22 L-24.7 -39.916 C-24.7 -33.858 -26.281 -29.081 -29.443 -25.589 C-32.605 -22.1 -36.887 -20.353 -42.287 -20.353 C-48.481 -20.486 -53.387 -22.758 -57.009 -27.17 C-60.633 -31.585 -62.443 -37.347 -62.443 -44.46 L-62.443 -97.22 L-97.616 -97.22 L-97.616 -39.916 C-97.616 -33.858 -99.195 -29.081 -102.358 -25.589 C-105.519 -22.1 -109.802 -20.353 -115.201 -20.353 C-121.395 -20.486 -126.336 -22.758 -130.022 -27.17 C-133.711 -31.585 -135.554 -37.347 -135.554 -44.46 L-135.554 -97.22 L-170.53 -97.22 L-170.53 9.682 L-135.554 9.682 L-135.554 -7.904 C-131.868 -1.714 -127.092 2.994 -121.229 6.224 C-115.369 9.451 -108.55 11.066 -100.777 11.066 C-92.082 11.066 -84.641 8.956 -78.447 4.742 C-72.258 0.525 -67.846 -5.335 -65.209 -12.844 C-61.785 -4.94 -56.879 1.018 -50.487 5.039 C-44.099 9.055 -36.557 11.066 -27.863 11.066 C-16.272 11.066 -6.984 7.376 0 0 Z" />
                </g>
              </g>
              <g transform="translate(701.5623 365.4048)">
                <g className="launch-letter launch-letter-4">
                  <path d="M0 0 C3.952 2.569 6.454 5.895 7.51 9.979 L7.51 19.266 L-13.437 19.266 C-23.317 19.266 -28.257 15.576 -28.257 8.2 C-28.257 4.511 -26.973 1.58 -24.404 -0.594 C-21.835 -2.767 -18.312 -3.853 -13.832 -3.853 C-8.564 -3.853 -3.952 -2.569 0 0 Z M29.641 71.926 C37.807 65.14 41.956 55.625 42.089 43.373 L42.089 -26.182 L7.51 -26.182 L7.51 -14.128 C0.395 -23.218 -10.343 -27.763 -24.7 -27.763 C-36.03 -27.763 -44.954 -24.7 -51.474 -18.575 C-57.995 -12.449 -61.256 -4.381 -61.256 5.632 C-61.256 15.774 -57.733 23.678 -50.684 29.343 C-43.639 35.006 -33.527 37.905 -20.353 38.038 L7.51 38.038 L7.51 39.224 C7.51 44.361 5.761 48.313 2.273 51.08 C-1.219 53.846 -6.258 55.229 -12.843 55.229 C-17.324 55.229 -22.363 54.504 -27.96 53.056 C-33.561 51.604 -39.193 49.499 -44.855 46.733 L-54.538 70.444 C-45.844 74.396 -37.512 77.326 -29.54 79.238 C-21.572 81.145 -13.307 82.103 -4.742 82.103 C10.01 82.103 21.47 78.71 29.641 71.926 Z" />
                </g>
              </g>
              <g transform="translate(836.92 346.01)">
                <g className="launch-letter launch-letter-5">
                  <path d="M0 0 C-3.95 -2.25 -8.5 -3.99 -13.64 -5.24 C-18.77 -6.49 -23.98 -7.12 -29.25 -7.12 C-39.79 -7.12 -48.31 -4.09 -54.84 1.97 C-61.36 8.03 -64.62 16.4 -64.62 27.07 L-64.62 72.91 L-64.62 96.23 L-64.62 113.19 L-393.83 113.19 L-393.83 148.36 L-1.46 148.36 L-1.46 113.19 L-29.64 113.19 L-29.64 96.23 L-29.64 72.91 L-29.64 32.6 C-29.64 25.09 -26.55 21.34 -20.35 21.34 C-16.53 21.34 -11.99 22.52 -6.72 24.89 Z" />
                </g>
              </g>
              <g transform="translate(923.2703 339.2227)">
                <g className="launch-letter launch-letter-6">
                  <path d="M0 0 L-22.526 40.31 L-33.396 29.047 L-33.396 0 L-68.568 0 L-68.568 146.62 L-33.396 146.62 L-33.396 70.741 L0.789 106.901 L40.704 106.901 L1.58 65.603 L41.495 0 Z" />
                </g>
              </g>
              <g transform="translate(1027.2068 365.4048)">
                <g className="launch-letter launch-letter-7">
                  <path d="M0 0 C3.952 2.569 6.454 5.895 7.51 9.979 L7.51 19.266 L-13.437 19.266 C-23.317 19.266 -28.257 15.576 -28.257 8.2 C-28.257 4.511 -26.973 1.58 -24.404 -0.594 C-21.835 -2.767 -18.312 -3.853 -13.832 -3.853 C-8.564 -3.853 -3.952 -2.569 0 0 Z M29.641 71.926 C37.807 65.14 41.956 55.625 42.089 43.373 L42.089 -26.182 L7.51 -26.182 L7.51 -14.128 C0.395 -23.218 -10.343 -27.763 -24.7 -27.763 C-36.03 -27.763 -44.954 -24.7 -51.474 -18.575 C-57.995 -12.449 -61.256 -4.381 -61.256 5.632 C-61.256 15.774 -57.733 23.678 -50.684 29.343 C-43.639 35.006 -33.527 37.905 -20.353 38.038 L7.51 38.038 L7.51 39.224 C7.51 44.361 5.761 48.313 2.273 51.08 C-1.219 53.846 -6.258 55.229 -12.843 55.229 C-17.324 55.229 -22.363 54.504 -27.96 53.056 C-33.56 51.604 -39.193 49.499 -44.855 46.733 L-54.538 70.444 C-45.844 74.396 -37.512 77.326 -29.54 79.238 C-21.572 81.145 -13.307 82.103 -4.742 82.103 C10.01 82.103 21.47 78.71 29.641 71.926 Z" />
                </g>
              </g>
            </g>
          </svg>
        </div>
        <p className="launch-kicker">Inteligencia Ambiental Empresarial</p>
        <p className="launch-status">Preparando tu espacio ambiental…</p>
        <div className="launch-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </main>
  );
}

function EnvironmentalWorkspace({ identity, onManageCompanies }: { identity: AuthIdentity & { company: NonNullable<AuthIdentity["company"]> }; onManageCompanies: () => void }) {
  const [periodMode, setPeriodMode] = useState<"ANUAL" | "MENSUAL">("ANUAL");
  const [selectedYear, setSelectedYear] = useState(monthNow.slice(0, 4));
  const [selectedMonth, setSelectedMonth] = useState(monthNow.slice(5, 7));
  const [comparisonYear, setComparisonYear] = useState(
    String(new Date().getFullYear() - 1),
  );
  const {
    overview,
    library,
    activityOptions,
    runs,
    periodRuns,
    periodHeadcounts,
    comparisonRuns,
    loading,
    refresh,
    refreshPeriodRuns,
    refreshComparisonRuns,
  } = useEnvironmentalData(
    identity.role,
    identity.company!.id,
    selectedYear,
    periodMode,
    selectedMonth,
    comparisonYear,
  );
  const [view, setView] = useState<View>("Resumen");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<CalculationResult | null>(null);
  const [captureCategory, setCaptureCategory] =
    useState<ActivityCategory>("ELECTRICITY");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastCreated, setLastCreated] = useState<CalculationResult | null>(
    null,
  );
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);
  const userInitials = `${identity.firstName[0] ?? ""}${identity.lastName[0] ?? ""}`.toUpperCase();
  const companyInitials = identity.company!.name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();

  const filteredRuns = useMemo(
    () =>
      runs.filter((run) =>
        `${run.calculationId} ${run.scope} ${run.factorUsed} ${run.reportingPeriod} ${categoryLabels[run.category]}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [runs, query],
  );
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1899 }, (_, index) =>
    String(currentYear - index),
  );
  const comparisonYearOptions = yearOptions.filter(
    (year) => year !== selectedYear,
  );
  const selectedPeriodLabel =
    periodMode === "ANUAL"
      ? selectedYear
      : `${monthOptions[Number(selectedMonth) - 1]} ${selectedYear}`;
  const openCapture = (category: ActivityCategory = "ELECTRICITY") => {
    setEditingRun(null);
    setCaptureCategory(category);
    setCaptureOpen(true);
  };
  const openEdit = (run: CalculationResult) => {
    setEditingRun(run);
    setCaptureCategory(run.category);
    setError("");
    setCaptureOpen(true);
  };

  const submitActivity = async (input: EnvironmentalInput) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        editingRun
          ? `/api/environment/runs/${encodeURIComponent(editingRun.calculationId)}`
          : "/api/environment/calculate",
        {
          method: editingRun ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const payload = (await response.json()) as
        CalculationResult | CalculationError;
      if (!response.ok) {
        const issue = payload as CalculationError;
        throw new Error(
          [issue.message, ...(issue.errors ?? [])].filter(Boolean).join("\n"),
        );
      }
      const calculated = payload as CalculationResult;
      const headcountNotice =
        input.employeeCount === undefined
          ? ""
          : ` Dotación registrada: ${input.employeeCount} empleados para esta sede y mes.`;
      setLastCreated(calculated);
      const capturedYear = input.reportingPeriod.slice(0, 4);
      const capturedMonth = input.reportingPeriod.slice(5, 7);
      const nextComparisonYear =
        comparisonYear === capturedYear
          ? (yearOptions.find((year) => year !== capturedYear) ??
            comparisonYear)
          : comparisonYear;
      setSelectedYear(capturedYear);
      setSelectedMonth(capturedMonth);
      setComparisonYear(nextComparisonYear);
      await Promise.all([
        refresh(),
        refreshPeriodRuns(capturedYear, periodMode, capturedMonth),
        refreshComparisonRuns(nextComparisonYear, periodMode, capturedMonth),
      ]);
      setCaptureOpen(false);
      if (editingRun) {
        setView("Resumen");
        setNotice(
          `Cálculo actualizado: ${calculatedResultText(calculated)} · ${formatPeriod(calculated.reportingPeriod)}. La versión anterior permanece en el historial del registro.${headcountNotice}`,
        );
      } else {
        setNotice(
          `Actividad calculada y guardada con su snapshot metodológico.${headcountNotice}`,
        );
      }
      setEditingRun(null);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No fue posible guardar la actividad.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteActivity = async (run: CalculationResult) => {
    if (
      !window.confirm(
        `¿Eliminar el registro ${run.calculationId}? Se retirará de los totales, pero quedará conservado en el historial de trazabilidad.`,
      )
    )
      return;
    setSaving(true);
    try {
      const response = await fetch(
        `/api/environment/runs/${encodeURIComponent(run.calculationId)}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as CalculationError;
      if (!response.ok)
        throw new Error(payload.message || "No se pudo eliminar el registro.");
      await Promise.all([
        refresh(),
        refreshPeriodRuns(),
        refreshComparisonRuns(),
      ]);
      setNotice(
        "Registro eliminado de los cálculos activos y conservado en el historial de trazabilidad.",
      );
    } catch (deletionError) {
      setNotice(
        deletionError instanceof Error
          ? deletionError.message
          : "No se pudo eliminar el registro.",
      );
    } finally {
      setSaving(false);
    }
  };

  const downloadReport = async () => {
    if (!periodRuns.length) {
      setNotice("No hay registros en el período seleccionado para exportar.");
      return;
    }
    const { buildEnvironmentalReportPdf, createEnvironmentalReport } =
      await import("../lib/environment-report");
    const report = createEnvironmentalReport(
      overview,
      library?.roadmap ?? [],
      periodRuns,
      library?.sources ?? [],
      identity.company!.name,
    );
    buildEnvironmentalReportPdf(report).save("informe-ejecutivo-ambiental.pdf");
    setNotice("Reporte ejecutivo descargado en formato PDF.");
  };

  const createInvitation = async () => {
    setInviteError("");
    setInviteSaving(true);
    try {
      const response = await fetch("/api/auth/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "No se pudo crear la invitación.");
      setInviteUrl(new URL(result.url, window.location.origin).toString());
    } catch (cause) {
      setInviteError(cause instanceof Error ? cause.message : "No se pudo crear la invitación.");
    } finally {
      setInviteSaving(false);
    }
  };

  const downloadPowerBiData = async () => {
    const response = await fetch("/api/environment/runs/export");
    if (!response.ok) {
      setNotice("No fue posible preparar la exportación de datos.");
      return;
    }
    const exportRuns = (await response.json()) as CalculationResult[];
    if (!exportRuns.length) {
      setNotice("No hay registros ambientales para exportar.");
      return;
    }
    const { buildPowerBiCsv } = await import("../lib/environment-report");
    const blob = new Blob([buildPowerBiCsv(exportRuns)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "datos-ambientales-power-bi.csv";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Datos tabulares del período descargados para Power BI.");
  };

  const navItems: { label: View; icon: typeof BarChart3 }[] = [
    { label: "Resumen", icon: BarChart3 },
    { label: "Registros", icon: ClipboardCheck },
    ...(identity.role === "admin" ? [{ label: "Calidad" as const, icon: ShieldCheck }] : []),
    { label: "Plan de acción", icon: Lightbulb },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <button type="button" className="workspace-select workspace-select-button" onClick={onManageCompanies} aria-label="Cambiar o administrar empresas">
          <span className="workspace-avatar">{companyInitials}</span>
          <span>
            <b>{identity.company!.name}</b>
            <small>RIF {identity.company!.rif}</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <div className="nav-heading">ESPACIO DE TRABAJO</div>
        <nav className="side-nav" aria-label="Navegación principal">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${view === label ? "nav-active" : ""}`}
              onClick={() => {
                setView(label);
                setMobileNavOpen(false);
              }}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span>
              <Sparkles size={16} />
            </span>
            <b>Diagnóstico confiable</b>
            <p>Datos trazables. Decisiones con impacto.</p>
            <button onClick={() => setView("Calidad")}>
              Conoce el método <ArrowRight size={13} />
            </button>
          </div>
          <div className="user-row">
            <span className="user-avatar">{userInitials}</span>
            <span>
              <b>{identity.firstName} {identity.lastName}</b>
              <small>{identity.role === "admin" ? "Administración" : identity.jobTitle}</small>
            </span>
            {identity.role === "admin" && <button className="icon-button sidebar-user-action" aria-label="Invitar a un usuario" onClick={() => setInviteOpen(true)}><UserPlus size={16} /></button>}
            <button className="icon-button sidebar-user-action" aria-label="Cerrar sesión" onClick={() => { fetch("/api/auth/logout", { method: "POST" }).finally(() => window.location.assign("/login")); }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={19} />
          </button>
          <div className="crumb">
            <span>{identity.company!.name}</span>
            <span className="crumb-slash">/</span>
            <b>{view}</b>
          </div>
          <div className="topbar-right">
            <span className="period-chip">
              <span className="live-dot" /> Período consultado{" "}
              <b>{selectedPeriodLabel}</b>
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-button notification-button"
              aria-label="Notificaciones"
              onClick={() => setNotice("No hay notificaciones nuevas.")}
            >
              <Bell size={18} />
              <i />
            </button>
            <button className="topbar-user" onClick={() => setView("Calidad")}>
              <span className="user-avatar">CB</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>

        <div className="content-wrap">
          {notice && (
            <div className="notice-bar">
              <Check size={15} />
              <span>{notice}</span>
              <button aria-label="Cerrar aviso" onClick={() => setNotice("")}>
                <X size={15} />
              </button>
            </div>
          )}
          <div className="content-branding">
            <img
              src={klimatkaLogo}
              alt="Klimatka, plataforma de inteligencia ambiental"
            />
          </div>
          {loading ? (
            <div className="loading-state">
              <LoaderCircle className="spin" size={24} />
              <span>Preparando tu espacio ambiental…</span>
            </div>
          ) : (
            <>
              {view === "Resumen" && (
                <Dashboard
                  overview={overview}
                  runs={periodRuns}
                  headcounts={periodHeadcounts}
                  comparisonRuns={comparisonRuns}
                  periodMode={periodMode}
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  comparisonYear={comparisonYear}
                  yearOptions={yearOptions}
                  comparisonYearOptions={comparisonYearOptions}
                  onPeriodModeChange={setPeriodMode}
                  onYearChange={(year) => {
                    setSelectedYear(year);
                    if (comparisonYear === year)
                      setComparisonYear(
                        yearOptions.find((option) => option !== year) ?? "",
                      );
                  }}
                  onComparisonYearChange={setComparisonYear}
                  onMonthChange={setSelectedMonth}
                  onCreate={openCapture}
                  onBrowse={() => setView("Registros")}
                  onQuality={identity.role === "admin" ? () => setView("Calidad") : undefined}
                  onExport={downloadReport}
                  onExportPowerBi={downloadPowerBiData}
                />
              )}
              {view === "Registros" && (
                <RecordsView
                  runs={filteredRuns}
                  query={query}
                  setQuery={setQuery}
                  onCreate={() => openCapture()}
                  onEdit={openEdit}
                  onDelete={deleteActivity}
                  deleting={saving}
                />
              )}
              {view === "Calidad" && <QualityView runs={runs} />}
              {view === "Plan de acción" && (
                <ActionView runs={runs} onCreate={() => setCaptureOpen(true)} />
              )}
            </>
          )}
          <footer className="footer-note">
            <span>SW Inteligencia Ambiental Empresarial</span>
            <span>
              <span className="footer-dot" /> Factores trazables · GHG Protocol
              · IPCC AR6
            </span>
          </footer>
        </div>
      </main>
      {mobileNavOpen && (
        <button
          className="mobile-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Cerrar navegación"
        />
      )}
      {inviteOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setInviteOpen(false); }}>
          <section className="auth-invite-modal" role="dialog" aria-modal="true" aria-labelledby="invite-title">
            <h2 id="invite-title">Invitar a la empresa</h2>
            <p>El enlace permite crear o asociar un perfil de miembro a <b>{identity.company!.name}</b>. Solo se puede usar con el correo invitado y vence en 7 días.</p>
            {!inviteUrl && <><label className="auth-field"><span>Correo electrónico del usuario</span><input type="email" autoComplete="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required maxLength={254} placeholder="persona@empresa.com" /></label><div className="auth-invite-link"><button className="button-primary" type="button" disabled={inviteSaving || !inviteEmail} onClick={createInvitation}>{inviteSaving ? "Creando…" : "Crear invitación"}</button><button className="button-secondary" type="button" onClick={() => setInviteOpen(false)}>Cancelar</button></div></>}
            {inviteUrl && <><label className="auth-field"><span>Enlace de invitación</span><div className="auth-invite-link"><input readOnly value={inviteUrl} /><button type="button" onClick={() => { navigator.clipboard.writeText(inviteUrl).then(() => setNotice("Enlace de invitación copiado.")); }}>Copiar enlace</button></div></label><div className="auth-invite-link"><button className="button-secondary" type="button" onClick={() => { setInviteOpen(false); setInviteUrl(""); setInviteEmail(""); }}>Listo</button></div></>}
            {inviteError && <div className="auth-error" role="alert">{inviteError}</div>}
          </section>
        </div>
      )}
      {captureOpen && (
        <CaptureModal
          key={editingRun?.calculationId ?? "new"}
          tenantId={identity.company!.id}
          library={activityOptions}
          initialCategory={captureCategory}
          initialRun={editingRun}
          saving={saving}
          error={error}
          onClose={() => {
            setCaptureOpen(false);
            setEditingRun(null);
            setError("");
          }}
          onSubmit={submitActivity}
          lastCreated={lastCreated}
        />
      )}
    </div>
  );
}

function Dashboard({
  overview,
  runs,
  headcounts,
  comparisonRuns,
  periodMode,
  selectedYear,
  selectedMonth,
  comparisonYear,
  yearOptions,
  comparisonYearOptions,
  onPeriodModeChange,
  onYearChange,
  onComparisonYearChange,
  onMonthChange,
  onCreate,
  onBrowse,
  onQuality,
  onExport,
  onExportPowerBi,
}: {
  overview: EnvironmentalOverview | null;
  runs: CalculationResult[];
  headcounts: FacilityHeadcount[];
  comparisonRuns: CalculationResult[];
  periodMode: "ANUAL" | "MENSUAL";
  selectedYear: string;
  selectedMonth: string;
  comparisonYear: string;
  yearOptions: string[];
  comparisonYearOptions: string[];
  onPeriodModeChange: (mode: "ANUAL" | "MENSUAL") => void;
  onYearChange: (year: string) => void;
  onComparisonYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
  onCreate: (category?: ActivityCategory) => void;
  onBrowse: () => void;
  onQuality?: () => void;
  onExport: () => void;
  onExportPowerBi: () => void;
}) {
  const hasRuns = runs.length > 0;
  const emissionsRuns = runs.filter(
    (run) => run.co2eTotalTonnes !== null && !run.digitalUsage,
  );
  const emissionsTotal = emissionsRuns.reduce(
    (sum, run) => sum + (run.co2eTotalTonnes ?? 0),
    0,
  );
  const electricityRuns = runs.filter((run) => run.category === "ELECTRICITY");
  const waterRuns = runs.filter((run) => run.category === "WATER");
  const wasteRuns = runs.filter((run) => run.category === "WASTE");
  const aiRuns = runs.filter((run) => run.category === "AI");
  const internetRuns = runs.filter((run) => run.category === "INTERNET");
  const sumActivity = (sourceRuns: CalculationResult[]) =>
    sourceRuns.length
      ? sourceRuns.reduce((sum, run) => sum + run.activityValue, 0)
      : null;
  const digitalTotal = (
    sourceRuns: CalculationResult[],
    key:
      | "inputTokens"
      | "outputTokens"
      | "uploadGb"
      | "downloadGb"
      | "reportedEnergyKwh"
      | "reportedWaterM3"
      | "reportedCo2eKg",
  ) => {
    const values = sourceRuns
      .map((run) => run.digitalUsage?.[key])
      .filter((value): value is number => value !== undefined);
    return values.length === sourceRuns.length && sourceRuns.length
      ? values.reduce((sum, value) => sum + value, 0)
      : null;
  };
  const digitalMetricText = (
    sourceRuns: CalculationResult[],
    key:
      | "inputTokens"
      | "outputTokens"
      | "uploadGb"
      | "downloadGb"
      | "reportedEnergyKwh"
      | "reportedWaterM3"
      | "reportedCo2eKg",
    unit: string,
    digits = 0,
  ) => {
    const values = sourceRuns
      .map((run) => run.digitalUsage?.[key])
      .filter((value): value is number => value !== undefined);
    if (!sourceRuns.length) return "Sin registros";
    if (!values.length) return "No informado";
    return `${formatNumber(
      values.reduce((sum, value) => sum + value, 0),
      digits,
    )} ${unit} · ${values.length}/${sourceRuns.length} registros con dato`;
  };
  const providersFor = (sourceRuns: CalculationResult[]) =>
    [
      ...new Set(
        sourceRuns
          .map((run) => run.digitalUsage?.provider)
          .filter((provider): provider is string => Boolean(provider)),
      ),
    ].join(", ") || "No informado";
  const aiRequests = sumActivity(aiRuns);
  const internetTraffic = sumActivity(internetRuns);
  const meanQuality = hasRuns
    ? runs.reduce((sum, run) => sum + run.dataQualityScore, 0) / runs.length
    : null;
  const rating =
    meanQuality === null
      ? "Sin datos"
      : meanQuality >= 9
        ? "Alta"
        : meanQuality >= 7
          ? "Media-alta"
          : meanQuality >= 5
            ? "Media"
            : meanQuality >= 3
              ? "Baja"
              : "Insuficiente";
  const monthlyTotals = new Map<string, number>();
  for (const run of emissionsRuns)
    monthlyTotals.set(
      run.reportingPeriod,
      (monthlyTotals.get(run.reportingPeriod) ?? 0) +
        (run.co2eTotalTonnes ?? 0),
    );
  const chartData = [...monthlyTotals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([period, tonnes]) => ({ period, tonnes }));
  const hasEmissions = chartData.length > 0;
  const periodLabel =
    periodMode === "ANUAL"
      ? selectedYear
      : `${monthOptions[Number(selectedMonth) - 1]} ${selectedYear}`;
  const comparisonEmissionsRuns = comparisonRuns.filter(
    (run) => run.co2eTotalTonnes !== null && !run.digitalUsage,
  );
  const comparisonAiRuns = comparisonRuns.filter(
    (run) => run.category === "AI",
  );
  const comparisonInternetRuns = comparisonRuns.filter(
    (run) => run.category === "INTERNET",
  );
  const comparisonPeriodLabel =
    periodMode === "ANUAL"
      ? comparisonYear
      : `${monthOptions[Number(selectedMonth) - 1]} ${comparisonYear}`;
  const comparisonMetrics = [
    {
      label: "Emisiones GEI",
      unit: "tCO₂e",
      digits: 2,
      current: emissionsRuns.length ? emissionsTotal : null,
      comparison: comparisonEmissionsRuns.length
        ? comparisonEmissionsRuns.reduce(
            (sum, run) => sum + (run.co2eTotalTonnes ?? 0),
            0,
          )
        : null,
    },
    {
      label: "Electricidad",
      unit: "kWh",
      digits: 0,
      current: electricityRuns.length
        ? electricityRuns.reduce((sum, run) => sum + run.normalizedValue, 0)
        : null,
      comparison: comparisonRuns.some((run) => run.category === "ELECTRICITY")
        ? comparisonRuns
            .filter((run) => run.category === "ELECTRICITY")
            .reduce((sum, run) => sum + run.normalizedValue, 0)
        : null,
    },
    {
      label: "Agua",
      unit: "m³",
      digits: 1,
      current: waterRuns.length
        ? waterRuns.reduce((sum, run) => sum + run.normalizedValue, 0)
        : null,
      comparison: comparisonRuns.some((run) => run.category === "WATER")
        ? comparisonRuns
            .filter((run) => run.category === "WATER")
            .reduce((sum, run) => sum + run.normalizedValue, 0)
        : null,
    },
    {
      label: "Residuos",
      unit: "t",
      digits: 2,
      current: wasteRuns.length
        ? wasteRuns.reduce((sum, run) => sum + run.normalizedValue, 0) / 1000
        : null,
      comparison: comparisonRuns.some((run) => run.category === "WASTE")
        ? comparisonRuns
            .filter((run) => run.category === "WASTE")
            .reduce((sum, run) => sum + run.normalizedValue, 0) / 1000
        : null,
    },
    {
      label: "Solicitudes de IA",
      unit: "solicitudes",
      digits: 0,
      current: aiRequests,
      comparison: sumActivity(comparisonAiRuns),
    },
    {
      label: "Tráfico de internet",
      unit: "GB",
      digits: 2,
      current: internetTraffic,
      comparison: sumActivity(comparisonInternetRuns),
    },
    {
      label: "Energía digital informada",
      unit: "kWh",
      digits: 2,
      current: digitalTotal([...aiRuns, ...internetRuns], "reportedEnergyKwh"),
      comparison: digitalTotal(
        [...comparisonAiRuns, ...comparisonInternetRuns],
        "reportedEnergyKwh",
      ),
    },
    {
      label: "Agua digital informada",
      unit: "m³",
      digits: 2,
      current: digitalTotal([...aiRuns, ...internetRuns], "reportedWaterM3"),
      comparison: digitalTotal(
        [...comparisonAiRuns, ...comparisonInternetRuns],
        "reportedWaterM3",
      ),
    },
    {
      label: "GEI digital reportado",
      unit: "kgCO₂e",
      digits: 2,
      current: digitalTotal([...aiRuns, ...internetRuns], "reportedCo2eKg"),
      comparison: digitalTotal(
        [...comparisonAiRuns, ...comparisonInternetRuns],
        "reportedCo2eKg",
      ),
    },
  ];
  const reportingPeriods =
    periodMode === "MENSUAL"
      ? [`${selectedYear}-${selectedMonth}`]
      : Array.from({ length: 12 }, (_, index) => `${selectedYear}-${String(index + 1).padStart(2, "0")}`);
  const facilityIds = new Set([
    ...runs.flatMap((run) => {
      const activity = run.snapshot.activity as EnvironmentalInput | undefined;
      return activity?.facilityId ? [activity.facilityId] : [];
    }),
    ...headcounts.map((headcount) => headcount.facilityId),
  ]);
  const employeeImpactRows = Array.from(facilityIds).map((facilityId) => {
    const facilityRuns = runs.filter(
      (run) =>
        (run.snapshot.activity as EnvironmentalInput | undefined)?.facilityId ===
        facilityId,
    );
    const facilityHeadcounts = headcounts.filter(
      (headcount) => headcount.facilityId === facilityId,
    );
    const headcountByPeriod = new Map(
      facilityHeadcounts.map((headcount) => [
        headcount.reportingPeriod,
        headcount.employeeCount,
      ]),
    );
    const availableHeadcounts = reportingPeriods
      .map((period) => headcountByPeriod.get(period))
      .filter((count): count is number => count !== undefined);
    const employeeCount =
      availableHeadcounts.length === reportingPeriods.length
        ? availableHeadcounts.reduce((sum, count) => sum + count, 0) /
          reportingPeriods.length
        : null;
    const emissionsRuns = facilityRuns.filter(
      (run) => run.co2eTotalTonnes !== null && !run.digitalUsage,
    );
    const electricityRuns = facilityRuns.filter(
      (run) => run.category === "ELECTRICITY",
    );
    const waterRuns = facilityRuns.filter((run) => run.category === "WATER");
    const wasteRuns = facilityRuns.filter((run) => run.category === "WASTE");
    const emissions = emissionsRuns.reduce(
      (total, run) => total + (run.co2eTotalTonnes ?? 0),
      0,
    );
    const electricity = electricityRuns.reduce(
      (total, run) => total + run.normalizedValue,
      0,
    );
    const water = waterRuns.reduce(
      (total, run) => total + run.normalizedValue,
      0,
    );
    const waste = wasteRuns.reduce(
      (total, run) => total + run.normalizedValue,
      0,
    );
    const activity = facilityRuns[0]?.snapshot.activity as
      | EnvironmentalInput
      | undefined;
    const facilityName =
      facilityHeadcounts[0]?.facilityName ?? activity?.facilityName ?? facilityId;
    return {
      facilityId,
      facilityName,
      employeeCount,
      coverage: availableHeadcounts.length,
      hasEmissions: emissionsRuns.length > 0,
      hasElectricity: electricityRuns.length > 0,
      hasWater: waterRuns.length > 0,
      hasWaste: wasteRuns.length > 0,
      emissions,
      electricity,
      water,
      waste,
    };
  });
  const qualityAverages = qualityKeys.map((key) => {
    const values = runs
      .map(
        (run) =>
          (run.snapshot.activity as EnvironmentalInput | undefined)?.quality?.[
            key
          ],
      )
      .filter((value): value is QualityDimension => value !== undefined);
    return values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  });

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> INTELIGENCIA QUE ACTIVA EL CAMBIO
          </div>
          <h1>
            El pulso ambiental
            <br className="desktop-break" /> de tu operación.
          </h1>
          <p>
            Una línea base clara para transformar cada dato en una mejor
            decisión.
          </p>
        </div>
        <div className="heading-actions">
          <button className="button-secondary" onClick={onExport}>
            <Download size={16} /> Exportar PDF
          </button>
          <button className="button-secondary" onClick={onExportPowerBi}>
            <FileBarChart2 size={16} /> Datos para Power BI
          </button>
          <a
            className="button-secondary"
            href={USER_MANUAL_DOWNLOAD_URL}
            download
          >
            <Download size={16} /> Descargar manual de usuario
          </a>
          <a
            className="button-secondary"
            href={WELCOME_ANIMATION_DOWNLOAD_URL}
            download
          >
            <Film size={16} /> Descargar animación MP4
          </a>
          <button className="button-primary" onClick={() => onCreate()}>
            <Plus size={17} /> Añadir actividad
          </button>
        </div>
      </div>
      <div className="period-filter" aria-label="Período del resumen">
        <span className="period-filter-icon">
          <CalendarDays size={16} />
        </span>
        <div className="period-filter-copy">
          <b>Período de consulta</b>
          <small>Consulta el desempeño ambiental por año o por mes.</small>
        </div>
        <label>
          <span>Vista</span>
          <select
            value={periodMode}
            onChange={(event) =>
              onPeriodModeChange(event.target.value as "ANUAL" | "MENSUAL")
            }
          >
            <option value="ANUAL">Año de gestión</option>
            <option value="MENSUAL">Mes específico</option>
          </select>
        </label>
        <label>
          <span>Año</span>
          <select
            value={selectedYear}
            onChange={(event) => onYearChange(event.target.value)}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        {periodMode === "MENSUAL" && (
          <label>
            <span>Mes</span>
            <select
              value={selectedMonth}
              onChange={(event) => onMonthChange(event.target.value)}
            >
              {monthOptions.map((month, index) => (
                <option key={month} value={String(index + 1).padStart(2, "0")}>
                  {month}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span>Comparar con</span>
          <select
            value={comparisonYear}
            onChange={(event) => onComparisonYearChange(event.target.value)}
          >
            {comparisonYearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <span className="period-filter-current">
          <span className="live-dot" />
          {periodLabel}
        </span>
      </div>
      <section
        className="panel comparison-panel"
        aria-label="Comparación entre períodos"
      >
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">
              COMPARACIÓN ·{" "}
              {periodMode === "MENSUAL"
                ? `MISMO MES · ${monthOptions[Number(selectedMonth) - 1].toUpperCase()}`
                : "AÑO DE GESTIÓN"}
            </span>
            <h2>
              {periodLabel} frente a {comparisonPeriodLabel}
            </h2>
          </div>
          <span className="round-icon">
            <BarChart3 size={17} />
          </span>
        </div>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Indicador</th>
                <th>{periodLabel}</th>
                <th>{comparisonPeriodLabel}</th>
                <th>Diferencia absoluta</th>
                <th>Variación (%)</th>
              </tr>
            </thead>
            <tbody>
              {comparisonMetrics.map((metric) => {
                const difference =
                  metric.current !== null && metric.comparison !== null
                    ? metric.current - metric.comparison
                    : null;
                const percent =
                  difference !== null && metric.comparison !== 0
                    ? (difference / metric.comparison) * 100
                    : null;
                const percentageChange =
                  difference === null
                    ? "Sin datos"
                    : percent === null
                      ? "No aplica (base cero)"
                      : difference > 0
                        ? `Aumentó ${formatNumber(percent, 1)}%`
                        : difference < 0
                          ? `Se redujo ${formatNumber(Math.abs(percent), 1)}%`
                          : "Sin cambio (0%)";
                return (
                  <tr key={metric.label}>
                    <th>{metric.label}</th>
                    <td>
                      {metric.current === null
                        ? "Sin datos"
                        : `${formatNumber(metric.current, metric.digits)} ${metric.unit}`}
                    </td>
                    <td>
                      {metric.comparison === null
                        ? "Sin datos"
                        : `${formatNumber(metric.comparison, metric.digits)} ${metric.unit}`}
                    </td>
                    <td>
                      {difference === null
                        ? "—"
                        : `${difference > 0 ? "+" : ""}${formatNumber(difference, metric.digits)} ${metric.unit}`}
                    </td>
                    <td
                      className={
                        percent === null
                          ? "comparison-no-change"
                          : percent > 0
                            ? "comparison-increase"
                            : percent < 0
                              ? "comparison-reduction"
                              : "comparison-no-change"
                      }
                    >
                      {percentageChange}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel employee-impact-panel" aria-label="Impacto ambiental por empleado">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">INTENSIDAD · {periodLabel.toUpperCase()}</span>
            <h2>Indicadores por sede y empleado</h2>
          </div>
          <span className="round-icon"><Factory size={17} /></span>
        </div>
        <p className="employee-impact-note">
          Los totales ambientales no cambian. La intensidad anual solo se calcula
          cuando hay dotación registrada para los 12 meses.
        </p>
        <div className="comparison-table-wrap">
          <table className="comparison-table employee-impact-table">
            <thead>
              <tr>
                <th>Sede</th>
                <th>Empleados{periodMode === "ANUAL" ? " promedio" : ""}</th>
                <th>tCO₂e / empleado</th>
                <th>kWh / empleado</th>
                <th>m³ agua / empleado</th>
                <th>kg residuos / empleado</th>
              </tr>
            </thead>
            <tbody>
              {employeeImpactRows.length ? employeeImpactRows.map((row) => (
                <tr key={row.facilityId}>
                  <th>{row.facilityName}</th>
                  <td>
                    {row.employeeCount === null
                      ? `Dato incompleto · ${row.coverage}/${reportingPeriods.length} ${periodMode === "ANUAL" ? "meses" : "mes"}`
                      : periodMode === "ANUAL"
                        ? formatNumber(row.employeeCount, 1)
                        : formatNumber(row.employeeCount, 0)}
                  </td>
                  <td>{row.employeeCount === null || !row.hasEmissions ? "—" : formatNumber(row.emissions / row.employeeCount, 4)}</td>
                  <td>{row.employeeCount === null || !row.hasElectricity ? "—" : formatNumber(row.electricity / row.employeeCount, 2)}</td>
                  <td>{row.employeeCount === null || !row.hasWater ? "—" : formatNumber(row.water / row.employeeCount, 3)}</td>
                  <td>{row.employeeCount === null || !row.hasWaste ? "—" : formatNumber(row.waste / row.employeeCount, 2)}</td>
                </tr>
              )) : (
                <tr><td colSpan={6}>Sin actividades registradas para este período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section
        className="kpi-grid"
        aria-label={`Indicadores principales · ${periodLabel}`}
      >
        <MetricCard
          icon={Activity}
          label="Huella GEI registrada"
          value={hasEmissions ? formatNumber(emissionsTotal, 2) : "—"}
          unit="tCO₂e"
          caption={
            hasEmissions
              ? `${emissionsRuns.length} corridas con emisiones calculadas`
              : "Sin emisiones en el período"
          }
          tone="forest"
          onClick={onBrowse}
        />
        <MetricCard
          icon={Zap}
          label="Electricidad"
          value={
            electricityRuns.length
              ? formatNumber(
                  electricityRuns.reduce(
                    (sum, run) => sum + run.normalizedValue,
                    0,
                  ),
                )
              : "—"
          }
          unit="kWh"
          caption={
            electricityRuns.length
              ? `${electricityRuns.length} registros del período`
              : "Sin registros en el período"
          }
          tone="lime"
          onClick={onBrowse}
        />
        <MetricCard
          icon={Droplets}
          label="Agua gestionada"
          value={
            waterRuns.length
              ? formatNumber(
                  waterRuns.reduce((sum, run) => sum + run.normalizedValue, 0),
                  1,
                )
              : "—"
          }
          unit="m³"
          caption={
            waterRuns.length
              ? `${waterRuns.length} registros del período`
              : "Sin registros en el período"
          }
          tone="blue"
          onClick={onBrowse}
        />
        <MetricCard
          icon={Recycle}
          label="Residuos registrados"
          value={
            wasteRuns.length
              ? formatNumber(
                  wasteRuns.reduce((sum, run) => sum + run.normalizedValue, 0) /
                    1000,
                  2,
                )
              : "—"
          }
          unit="t"
          caption={
            wasteRuns.length
              ? `${wasteRuns.length} registros del período`
              : "Sin registros en el período"
          }
          tone="amber"
          onClick={onBrowse}
        />
      </section>
      <section
        className="digital-usage-grid"
        aria-label={`Uso digital · ${periodLabel}`}
      >
        <article className="panel digital-usage-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">USO DIGITAL · {periodLabel}</span>
              <h2>Inteligencia artificial</h2>
            </div>
            <span className="round-icon">
              <Sparkles size={17} />
            </span>
          </div>
          <strong className="digital-usage-total">
            {aiRequests === null ? "—" : formatNumber(aiRequests)}{" "}
            <small>solicitudes</small>
          </strong>
          <div className="digital-usage-details">
            <p>
              Proveedores y modelos{" "}
              <b>
                {providersFor(aiRuns)}
                {[
                  ...new Set(
                    aiRuns
                      .map((run) => run.digitalUsage?.model)
                      .filter((model): model is string => Boolean(model)),
                  ),
                ].length
                  ? ` · ${[...new Set(aiRuns.map((run) => run.digitalUsage?.model).filter((model): model is string => Boolean(model)))].join(", ")}`
                  : ""}
              </b>
            </p>
            <p>
              Tokens de entrada{" "}
              <b>{digitalMetricText(aiRuns, "inputTokens", "tokens")}</b>
            </p>
            <p>
              Tokens de salida{" "}
              <b>{digitalMetricText(aiRuns, "outputTokens", "tokens")}</b>
            </p>
            <p>
              Energía informada{" "}
              <b>{digitalMetricText(aiRuns, "reportedEnergyKwh", "kWh", 2)}</b>
            </p>
            <p>
              Agua informada{" "}
              <b>{digitalMetricText(aiRuns, "reportedWaterM3", "m³", 2)}</b>
            </p>
            <p>
              GEI reportado por la fuente{" "}
              <b>{digitalMetricText(aiRuns, "reportedCo2eKg", "kgCO₂e", 2)}</b>
            </p>
          </div>
        </article>
        <article className="panel digital-usage-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">USO DIGITAL · {periodLabel}</span>
              <h2>Conectividad a internet</h2>
            </div>
            <span className="round-icon">
              <Activity size={17} />
            </span>
          </div>
          <strong className="digital-usage-total">
            {internetTraffic === null ? "—" : formatNumber(internetTraffic, 2)}{" "}
            <small>GB de tráfico</small>
          </strong>
          <div className="digital-usage-details">
            <p>
              Proveedores <b>{providersFor(internetRuns)}</b>
            </p>
            <p>
              Subida{" "}
              <b>{digitalMetricText(internetRuns, "uploadGb", "GB", 2)}</b>
            </p>
            <p>
              Descarga{" "}
              <b>{digitalMetricText(internetRuns, "downloadGb", "GB", 2)}</b>
            </p>
            <p>
              Energía informada{" "}
              <b>
                {digitalMetricText(internetRuns, "reportedEnergyKwh", "kWh", 2)}
              </b>
            </p>
            <p>
              Agua informada{" "}
              <b>
                {digitalMetricText(internetRuns, "reportedWaterM3", "m³", 2)}
              </b>
            </p>
            <p>
              GEI reportado por la fuente{" "}
              <b>
                {digitalMetricText(internetRuns, "reportedCo2eKg", "kgCO₂e", 2)}
              </b>
            </p>
          </div>
        </article>
      </section>
      <p className="digital-usage-note">
        Las solicitudes, tokens y GB son métricas de actividad, no factores de
        emisión. Los consumos y GEI reportados se conservan con su fuente, sin
        convertirse ni sumarse a los alcances corporativos.
      </p>
      {overview && overview.library.pendingNationalCount > 0 && (
        <div className="method-alert">
          <span className="method-alert-icon">
            <ShieldCheck size={17} />
          </span>
          <p>
            <b>Transparencia metodológica</b>
            <span>
              {overview.library.pendingNationalCount} factores permanecen
              pendientes de validación oficial. La plataforma conserva ese
              estatus y registra toda regla de respaldo aplicada.
            </span>
          </p>
          <span className="alert-pending">
            {overview.library.pendingNationalCount} pendientes
          </span>
        </div>
      )}

      <section className="dashboard-grid">
        <article className="panel emissions-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                DESEMPEÑO AMBIENTAL ·{" "}
                {periodMode === "ANUAL" ? "VISTA MENSUAL" : "VISTA DEL MES"}
              </span>
              <h2>Línea base GEI</h2>
            </div>
            <button className="text-button" onClick={onBrowse}>
              Ver registros <ArrowRight size={14} />
            </button>
          </div>
          {hasEmissions ? (
            <EmissionsChart data={chartData} />
          ) : (
            <div className="chart-empty">
              <div className="chart-decoration">
                <div className="chart-gridline chart-gridline-one" />
                <div className="chart-gridline chart-gridline-two" />
                <div className="chart-gridline chart-gridline-three" />
                <div className="chart-empty-note">
                  <span className="chart-leaf">
                    <Leaf size={19} />
                  </span>
                  <b>
                    {hasRuns
                      ? `Sin emisiones GEI · ${periodLabel}`
                      : `Sin registros · ${periodLabel}`}
                  </b>
                  <span>
                    Este resumen no muestra corridas con emisiones calculadas
                    para el período seleccionado.
                  </span>
                  <button onClick={() => onCreate()}>
                    Añadir actividad <ArrowRight size={14} />
                  </button>
                </div>
              </div>
              <div className="chart-axis">
                <span>Sin emisiones calculadas</span>
                <span>tCO₂e</span>
              </div>
            </div>
          )}
          {hasEmissions && (
            <div className="chart-foot">
              <span>
                <i className="legend-dot" /> Emisiones calculadas · meses con
                datos
              </span>
              <span>{periodLabel}</span>
            </div>
          )}
        </article>
        <article className="panel quality-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                CALIDAD DEL DIAGNÓSTICO · {periodLabel}
              </span>
              <h2>Índice DQ</h2>
            </div>
            <span className="round-icon">
              <ShieldCheck size={18} />
            </span>
          </div>
          <div className="quality-score-row">
            <strong>
              {meanQuality === null ? "—" : formatNumber(meanQuality, 1)}
            </strong>
            <span>/ 10</span>
            <StatusTag tone={hasRuns ? "green" : "neutral"}>{rating}</StatusTag>
          </div>
          <p className="quality-summary">
            {hasRuns
              ? `${runs.length} registros del período; puntaje promedio sobre cinco dimensiones.`
              : "No hay datos de calidad para el período seleccionado."}
          </p>
          <div className="quality-dimensions">
            {qualityLabels.map((label, index) => {
              const score = qualityAverages[index];
              const percent = score === null ? 0 : (score / 2) * 100;
              return (
                <div className="quality-row" key={label}>
                  <span>{label}</span>
                  <div className="quality-track">
                    <i style={{ width: `${percent}%` }} />
                  </div>
                  <b>{score === null ? "—" : `${formatNumber(percent)}%`}</b>
                </div>
              );
            })}
          </div>
          {onQuality && <button className="panel-footer-link" onClick={onQuality}>
            Cómo evaluamos la calidad <ArrowRight size={14} />
          </button>}
        </article>
      </section>
      <section className="lower-grid">
        <article className="panel modules-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">MEDICIÓN INTEGRADA</span>
              <h2>Módulos ambientales</h2>
            </div>
            <span className="module-counter">
              {activityCategories.length.toString().padStart(2, "0")}{" "}
              <span>módulos</span>
            </span>
          </div>
          <div className="module-grid">
            {activityCategories.map((category) => {
              const Icon = categoryIcons[category];
              const categoryRuns = runs.filter(
                (run) => run.category === category,
              ).length;
              return (
                <button
                  className="module-tile"
                  key={category}
                  onClick={() => onCreate(category)}
                >
                  <span
                    className={`module-icon module-${category.toLowerCase()}`}
                  >
                    <Icon size={17} />
                  </span>
                  <span>
                    <b>{categoryLabels[category]}</b>
                    <small>
                      {categoryRuns
                        ? `${categoryRuns} ${categoryRuns === 1 ? "registro" : "registros"} · ${periodLabel}`
                        : "Aún sin registros"}
                    </small>
                  </span>
                  <ArrowUpRight size={14} className="module-arrow" />
                </button>
              );
            })}
          </div>
        </article>
      </section>
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  caption,
  tone,
  onClick,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  unit: string;
  caption: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button className={`metric-card metric-${tone}`} onClick={onClick}>
      <span className="metric-card-top">
        <span className="metric-icon">
          <Icon size={17} strokeWidth={1.8} />
        </span>
        <ArrowUpRight size={15} className="metric-arrow" />
      </span>
      <span className="metric-label">{label}</span>
      <span className="metric-value">
        {value}
        <small>{unit}</small>
      </span>
      <span className="metric-caption">
        <i />
        {caption}
      </span>
    </button>
  );
}

function EmissionsChart({
  data,
}: {
  data: { period: string; tonnes: number }[];
}) {
  const width = 640;
  const height = 214;
  const padding = { top: 16, right: 12, bottom: 25, left: 42 };
  const max = Math.max(...data.map((entry) => entry.tonnes), 0.01) * 1.2;
  const x = (index: number) =>
    padding.left +
    (data.length === 1
      ? (width - padding.left - padding.right) / 2
      : (index * (width - padding.left - padding.right)) / (data.length - 1));
  const y = (value: number) =>
    height -
    padding.bottom -
    (value / max) * (height - padding.top - padding.bottom);
  const path = data
    .map(
      (entry, index) =>
        `${index === 0 ? "M" : "L"} ${x(index)} ${y(entry.tonnes)}`,
    )
    .join(" ");
  const area = `${path} L ${x(data.length - 1)} ${height - padding.bottom} L ${x(0)} ${height - padding.bottom} Z`;
  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Emisiones de gases de efecto invernadero por período"
      >
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7fc9a4" stopOpacity=".28" />
            <stop offset="100%" stopColor="#7fc9a4" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((step) => {
          const value = (max * (3 - step)) / 3;
          const yy = y(value);
          return (
            <g key={step}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={yy}
                y2={yy}
                stroke="#e8ece8"
                strokeDasharray="4 5"
              />
              <text
                x={padding.left - 9}
                y={yy + 3}
                textAnchor="end"
                fill="#8b9690"
                fontSize="10"
              >
                {formatNumber(value, 1)}
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#chartFill)" />
        <path
          d={path}
          fill="none"
          stroke="#35775e"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((entry, index) => (
          <g key={entry.period}>
            <circle
              cx={x(index)}
              cy={y(entry.tonnes)}
              r="4.2"
              fill="#fff"
              stroke="#35775e"
              strokeWidth="2.3"
            />
            <text
              x={x(index)}
              y={height - 5}
              textAnchor="middle"
              fill="#8b9690"
              fontSize="10"
            >
              {formatPeriod(entry.period)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function RecordsView({
  runs,
  query,
  setQuery,
  onCreate,
  onEdit,
  onDelete,
  deleting,
}: {
  runs: CalculationResult[];
  query: string;
  setQuery: (value: string) => void;
  onCreate: () => void;
  onEdit: (run: CalculationResult) => void;
  onDelete: (run: CalculationResult) => void;
  deleting: boolean;
}) {
  return (
    <>
      <div className="page-heading page-heading-small">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> TRAZABILIDAD DE ACTIVIDAD
          </div>
          <h1>Registros de cálculo</h1>
          <p>
            Corrige una actividad para volver a calcularla, o elimínala de los
            totales. Las versiones anteriores quedan en el historial.
          </p>
        </div>
        <button className="button-primary" onClick={onCreate}>
          <Plus size={17} /> Añadir actividad
        </button>
      </div>
      <div className="panel records-panel">
        <div className="records-toolbar">
          <div className="search-field">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por categoría, período o factor…"
            />
          </div>
          <span className="records-count">
            {runs.length} {runs.length === 1 ? "registro" : "registros"}
          </span>
        </div>
        {runs.length ? (
          <div className="records-list">
            {runs.map((run) => (
              <RunRow
                run={run}
                key={run.calculationId}
                onEdit={() => onEdit(run)}
                onDelete={() => onDelete(run)}
                deleting={deleting}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardCheck}
            title="Todavía no hay actividades"
            description="Al registrar una factura, medición o dato operativo, aparecerá aquí con su trazabilidad completa."
            action={
              <button className="button-primary" onClick={onCreate}>
                <Plus size={16} /> Añadir actividad
              </button>
            }
          />
        )}
      </div>
    </>
  );
}

function RunRow({
  run,
  onEdit,
  onDelete,
  deleting,
}: {
  run: CalculationResult;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const source = run.snapshot.activity as EnvironmentalInput | undefined;
  const Icon = categoryIcons[run.category];
  return (
    <article className="run-row">
      <span className={`run-icon module-${run.category.toLowerCase()}`}>
        <Icon size={17} />
      </span>
      <div className="run-name">
        <b>
          {categoryLabels[run.category]} <span>·</span>{" "}
          {source?.facilityName ?? "Instalación"}
        </b>
        <small>
          {run.calculationId} · {formatPeriod(run.reportingPeriod)} ·{" "}
          {run.scope}
        </small>
      </div>
      <div className="run-amount">
        <b>
          {run.digitalUsage
            ? run.digitalUsage.reportedCo2eKg === undefined
              ? "No cuantificado"
              : amountText(run.digitalUsage.reportedCo2eKg, 2)
            : amountText(run.co2eTotalTonnes, 3)}{" "}
          <small>
            {run.digitalUsage
              ? run.digitalUsage.reportedCo2eKg === undefined
                ? "impacto"
                : "kgCO₂e informado"
              : "tCO₂e"}
          </small>
        </b>
        <span>
          {formatNumber(run.activityValue, 2)} {run.activityUnit}
        </span>
      </div>
      <div className="run-quality">
        <b>{run.dataQualityScore}/10</b>
        <small>Índice DQ</small>
      </div>
      <StatusTag
        tone={
          run.digitalUsage
            ? "neutral"
            : run.fallbackApplied
              ? "amber"
              : run.thresholdStatus === "CRITICO"
                ? "red"
                : "green"
        }
      >
        {run.digitalUsage
          ? "Uso digital"
          : run.fallbackApplied
            ? "Fallback"
            : run.thresholdStatus === "NORMAL"
              ? "Calculado"
              : run.thresholdStatus}
      </StatusTag>
      <div className="run-actions">
        <button
          type="button"
          className="run-action-button"
          onClick={onEdit}
          disabled={deleting}
          aria-label={`Modificar ${categoryLabels[run.category]} de ${formatPeriod(run.reportingPeriod)}`}
          title="Modificar registro"
        >
          <Pencil size={14} />
          <span>Modificar</span>
        </button>
        <button
          type="button"
          className="run-action-button run-delete-button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Eliminar ${categoryLabels[run.category]} de ${formatPeriod(run.reportingPeriod)}`}
          title="Eliminar registro"
        >
          <Trash2 size={14} />
          <span>Eliminar</span>
        </button>
      </div>
      <details className="run-details">
        <summary>
          Ver trazabilidad <ChevronDown size={13} />
        </summary>
        <div className="run-detail-grid">
          {run.digitalUsage && (
            <>
              <div>
                <span>Proveedor digital</span>
                <b>
                  {run.digitalUsage.provider}
                  {run.digitalUsage.model ? ` · ${run.digitalUsage.model}` : ""}
                </b>
              </div>
              {run.digitalUsage.inputTokens !== undefined && (
                <div>
                  <span>Tokens de entrada</span>
                  <b>{formatNumber(run.digitalUsage.inputTokens)}</b>
                </div>
              )}
              {run.digitalUsage.outputTokens !== undefined && (
                <div>
                  <span>Tokens de salida</span>
                  <b>{formatNumber(run.digitalUsage.outputTokens)}</b>
                </div>
              )}
              {run.digitalUsage.uploadGb !== undefined && (
                <div>
                  <span>Tráfico de subida</span>
                  <b>{formatNumber(run.digitalUsage.uploadGb, 2)} GB</b>
                </div>
              )}
              {run.digitalUsage.downloadGb !== undefined && (
                <div>
                  <span>Tráfico de descarga</span>
                  <b>{formatNumber(run.digitalUsage.downloadGb, 2)} GB</b>
                </div>
              )}
              {run.digitalUsage.reportedEnergyKwh !== undefined && (
                <div>
                  <span>Energía informada por fuente</span>
                  <b>
                    {formatNumber(run.digitalUsage.reportedEnergyKwh, 2)} kWh
                  </b>
                </div>
              )}
              {run.digitalUsage.reportedWaterM3 !== undefined && (
                <div>
                  <span>Agua informada por fuente</span>
                  <b>{formatNumber(run.digitalUsage.reportedWaterM3, 2)} m³</b>
                </div>
              )}
              {run.digitalUsage.reportedCo2eKg !== undefined && (
                <div>
                  <span>GEI reportado · fuera de alcance</span>
                  <b>
                    {formatNumber(run.digitalUsage.reportedCo2eKg, 2)} kgCO₂e
                  </b>
                </div>
              )}
            </>
          )}
          <div>
            <span>Factor aplicado</span>
            <b>{run.factorUsed}</b>
          </div>
          <div>
            <span>Estado y fuente</span>
            <b>
              {run.factorStatus} ·{" "}
              {String(run.snapshot.factorSourceReference ?? "Fuente pendiente")}
            </b>
          </div>
          <div>
            <span>Fuente de actividad</span>
            <b>{run.sourceReference}</b>
          </div>
          <div>
            <span>Calidad del dato</span>
            <b>
              {run.dataQualityRating} · Tier{" "}
              {run.dataQualityTier.replace("Tier ", "")}
            </b>
          </div>
          <div>
            <span>Incertidumbre</span>
            <b>±{formatNumber(run.uncertaintyPct, 1)}%</b>
          </div>
          {run.waterBalanceDifferenceM3 !== undefined && (
            <div>
              <span>Balance hídrico</span>
              <b>
                Diferencia de balance / agua no contabilizada ·{" "}
                {formatNumber(run.waterBalanceDifferenceM3, 2)} m³
              </b>
            </div>
          )}
          {run.warnings.map((warning, index) => (
            <div
              className="run-warning"
              key={`${run.calculationId}-warning-${index}`}
            >
              <span>Advertencia metodológica</span>
              <b>{warning}</b>
            </div>
          ))}
        </div>
        {typeof run.snapshot.revision === "number" &&
          run.snapshot.revision > 1 && (
            <RunHistory calculationId={run.calculationId} />
          )}
      </details>
    </article>
  );
}

function RunHistory({ calculationId }: { calculationId: string }) {
  const [history, setHistory] = useState<
    | {
        action: "EDIT" | "DELETE";
        changedAt: string;
        previousRecord: CalculationResult;
      }[]
    | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadHistory = async (
    event: React.SyntheticEvent<HTMLDetailsElement>,
  ) => {
    if (!event.currentTarget.open || history !== null || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/environment/runs/${encodeURIComponent(calculationId)}/history`,
      );
      if (!response.ok) throw new Error("No fue posible cargar el historial.");
      setHistory(await response.json());
    } catch (historyError) {
      setError(
        historyError instanceof Error
          ? historyError.message
          : "No fue posible cargar el historial.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <details className="run-history" onToggle={loadHistory}>
      <summary>
        Historial de versiones <ChevronDown size={13} />
      </summary>
      {loading && <p className="run-history-message">Cargando historial…</p>}
      {error && <p className="run-history-message">{error}</p>}
      {history?.map((entry, index) => (
        <div className="run-history-entry" key={`${entry.changedAt}-${index}`}>
          <b>
            {entry.action === "EDIT"
              ? "Versión anterior"
              : "Registro eliminado"}{" "}
            ·{" "}
            {new Intl.DateTimeFormat("es-VE", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(entry.changedAt))}
          </b>
          <span>Resultado: {calculatedResultText(entry.previousRecord)}</span>
          <span>
            Actividad: {formatNumber(entry.previousRecord.activityValue, 2)}{" "}
            {entry.previousRecord.activityUnit} ·{" "}
            {formatPeriod(entry.previousRecord.reportingPeriod)}
          </span>
        </div>
      ))}
    </details>
  );
}

function QualityView({ runs }: { runs: CalculationResult[] }) {
  const dimensionDescriptions = [
    "Calidad y jerarquía de la fuente declarada.",
    "Dato medido directamente, documentado o estimado.",
    "Cobertura temporal del período reportado.",
    "Cobertura de procesos e instalaciones dentro del perímetro.",
    "Evidencia, referencia y capacidad de auditoría.",
  ];
  const meanScore = runs.length
    ? runs.reduce((sum, run) => sum + run.dataQualityScore, 0) / runs.length
    : null;
  const rating =
    meanScore === null
      ? "Sin datos"
      : meanScore >= 9
        ? "Alta"
        : meanScore >= 7
          ? "Media-alta"
          : meanScore >= 5
            ? "Media"
            : meanScore >= 3
              ? "Baja"
              : "Insuficiente";
  return (
    <>
      <div className="page-heading page-heading-small">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> CALIDAD Y TRAZABILIDAD
          </div>
          <h1>Qué tan confiable es el diagnóstico.</h1>
          <p>
            La calidad del dato acompaña cada resultado; no se confunde con el
            desempeño ambiental.
          </p>
        </div>
        <span className="library-version">
          <ShieldCheck size={15} /> Índice DQ
        </span>
      </div>
      <div className="quality-overview-grid">
        <article className="panel quality-overview-score">
          <span className="panel-kicker">
            PUNTAJE PROMEDIO DE LOS REGISTROS
          </span>
          <div className="large-score">
            {meanScore === null ? "—" : formatNumber(meanScore, 1)}
            <small> / 10</small>
          </div>
          <p>
            {meanScore === null
              ? "Registra actividad para conocer la calidad de la línea base."
              : `Nivel ${rating} · cálculo sobre cinco dimensiones.`}
          </p>
          <div className="quality-score-scale">
            <span>0 · Insuficiente</span>
            <span>10 · Alta</span>
            <i />
          </div>
        </article>
        <article className="panel quality-overview-score quality-factor-card">
          <span className="panel-kicker">LECTURA DEL RESULTADO</span>
          <h2 className="quality-explanation-title">
            El índice refleja la calidad de la evidencia.
          </h2>
          <p>
            Un puntaje bajo indica que los datos requieren más respaldo o
            cobertura antes de interpretar el diagnóstico como representativo.
          </p>
          <div className="quality-stat-line">
            <span>
              <b>{runs.length}</b> registros evaluados
            </span>
            <StatusTag tone="green">DQ</StatusTag>
          </div>
        </article>
      </div>
      <section className="panel dimensions-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">ÍNDICE DQ · 0–2 POR DIMENSIÓN</span>
            <h2>Cinco dimensiones de calidad</h2>
          </div>
          <span className="panel-caption">Máximo: 10 puntos</span>
        </div>
        {qualityLabels.map((label, index) => (
          <div className="dimension-card" key={label}>
            <span className="dimension-number">0{index + 1}</span>
            <div className="dimension-main">
              <b>{label}</b>
              <p>{dimensionDescriptions[index]}</p>
            </div>
            <div className="dimension-scale">
              <span>0 · Bajo</span>
              <ArrowRight size={13} />
              <span>1 · Parcial</span>
              <ArrowRight size={13} />
              <span>2 · Completo</span>
            </div>
          </div>
        ))}
        <div className="rating-ranges">
          <span>
            <b>9–10</b> Alta
          </span>
          <span>
            <b>7–8</b> Media-alta
          </span>
          <span>
            <b>5–6</b> Media
          </span>
          <span>
            <b>3–4</b> Baja
          </span>
          <span>
            <b>0–2</b> Insuficiente
          </span>
        </div>
        <p className="quality-method-note">
          Las comprobaciones técnicas se ejecutan automáticamente antes de
          guardar cada cálculo. Esta vista presenta su efecto en la calidad del
          diagnóstico.
        </p>
      </section>
    </>
  );
}

function ActionView({
  runs,
  onCreate,
}: {
  runs: CalculationResult[];
  onCreate: () => void;
}) {
  const recommendations = runs.flatMap((run) =>
    (
      (run.snapshot.recommendations as
        | {
            id: string;
            category: string;
            probableCause: string;
            opportunity: string;
            action: string;
            investment: string;
            timeframe: string;
            priority: string;
            venezuelaAvailability: string;
            paybackMonths: number | null;
          }[]
        | undefined) ?? []
    ).map((recommendation) => ({
      ...recommendation,
      calculationId: run.calculationId,
      period: run.reportingPeriod,
    })),
  );
  const roadmap = [
    {
      label: "0–90 días",
      title: "Línea base & diagnóstico",
      detail:
        "Completar inventario, validar datos de actividad y priorizar puntos críticos.",
      color: "roadmap-now",
    },
    {
      label: "3–6 meses",
      title: "Eficiencia & quick wins",
      detail:
        "Capturar ahorros operativos, atender fugas y desviar residuos valorizables.",
      color: "roadmap-soon",
    },
    {
      label: "6–12 meses",
      title: "Optimización tecnológica",
      detail:
        "Evaluar automatización, telemetría y modernización con datos propios.",
      color: "roadmap-mid",
    },
    {
      label: "12–36 meses",
      title: "Circularidad integral",
      detail:
        "Cerrar ciclos de materiales y estructurar una hoja de ruta de largo plazo.",
      color: "roadmap-long",
    },
  ];
  return (
    <>
      <div className="page-heading page-heading-small">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> MEJORA CONTINUA
          </div>
          <h1>Una ruta para avanzar.</h1>
          <p>
            Acciones ordenadas por causa, prioridad, inversión y horizonte de
            implementación.
          </p>
        </div>
        <button className="button-primary" onClick={onCreate}>
          <Plus size={16} /> Añadir actividad
        </button>
      </div>
      <div className="roadmap-grid">
        {roadmap.map((phase, index) => (
          <article className={`roadmap-card ${phase.color}`} key={phase.label}>
            <span className="roadmap-index">0{index + 1}</span>
            <span className="roadmap-time">{phase.label}</span>
            <h3>{phase.title}</h3>
            <p>{phase.detail}</p>
            <span className="roadmap-line" />
          </article>
        ))}
      </div>
      <section className="panel recommendation-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">RECOMMENDATION ENGINE</span>
            <h2>Oportunidades priorizadas</h2>
          </div>
          <span className="round-icon">
            <Lightbulb size={18} />
          </span>
        </div>
        {recommendations.length ? (
          recommendations.map((item, index) => (
            <article
              className="recommendation-row"
              key={`${item.calculationId}-${item.id}-${index}`}
            >
              <span className="recommendation-priority">
                {item.priority === "ALTA" ? (
                  <ArrowUpRight size={18} />
                ) : (
                  <ArrowDownRight size={18} />
                )}
              </span>
              <div className="recommendation-copy">
                <div>
                  <b>{item.action}</b>
                  <StatusTag
                    tone={item.priority === "ALTA" ? "amber" : "green"}
                  >
                    Prioridad {item.priority.toLowerCase()}
                  </StatusTag>
                </div>
                <p>
                  {item.probableCause} {item.opportunity}
                </p>
                <small>
                  {item.timeframe} · {item.investment} ·{" "}
                  {item.venezuelaAvailability}
                </small>
                {item.paybackMonths !== null ? (
                  <small>
                    Payback estimado: {formatNumber(item.paybackMonths)} meses
                  </small>
                ) : (
                  <small>Payback: requiere CAPEX y ahorro verificados.</small>
                )}
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            icon={Lightbulb}
            title="Las recomendaciones se activan con evidencia"
            description="Registra consumos o flujos. El motor comparará tus resultados con los umbrales documentados y generará acciones cuando haya datos suficientes."
            action={
              <button className="button-primary" onClick={onCreate}>
                <Plus size={16} /> Añadir actividad
              </button>
            }
          />
        )}
      </section>
    </>
  );
}

function CaptureModal({
  tenantId,
  library,
  initialCategory,
  initialRun,
  saving,
  error,
  onClose,
  onSubmit,
  lastCreated,
}: {
  tenantId: string;
  library: ActivityOptions | null;
  initialCategory: ActivityCategory;
  initialRun: CalculationResult | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (input: EnvironmentalInput) => void;
  lastCreated: CalculationResult | null;
}) {
  const initialActivity = initialRun?.snapshot.activity as
    EnvironmentalInput | undefined;
  const [category, setCategory] = useState<ActivityCategory>(
    initialRun?.category ?? initialCategory,
  );
  const [subcategory, setSubcategory] = useState(
    initialActivity?.subcategory ?? "LOCATION_BASED",
  );
  const [activityValue, setActivityValue] = useState(
    initialActivity ? String(initialActivity.activityValue) : "",
  );
  const [activityUnit, setActivityUnit] = useState(
    initialActivity?.activityUnit ?? "kWh",
  );
  const [facilityName, setFacilityName] = useState(
    initialActivity?.facilityName ?? "",
  );
  const [reportingPeriod, setReportingPeriod] = useState(
    initialActivity?.reportingPeriod ?? monthNow,
  );
  const [periodModules, setPeriodModules] = useState<MeasurementModule[]>(library?.modules ?? []);
  const [employeeCount, setEmployeeCount] = useState(
    initialActivity?.employeeCount === undefined
      ? ""
      : String(initialActivity.employeeCount),
  );
  const employeeCountEdited = useRef(false);
  const employeeContext = useRef({ facilityName, reportingPeriod });
  const [sourceType, setSourceType] = useState<
    EnvironmentalInput["sourceType"] | ""
  >(initialActivity?.sourceType ?? "");
  const [sourceReference, setSourceReference] = useState(
    initialActivity?.sourceReference ?? "",
  );
  const [geography, setGeography] = useState(
    initialActivity?.geography ?? "VE",
  );
  const [quality, setQuality] = useState<{
    source: QualityDimension | null;
    measurement: QualityDimension | null;
    temporalRepresentativeness: QualityDimension | null;
    operationalRepresentativeness: QualityDimension | null;
    traceability: QualityDimension | null;
  }>(
    initialActivity?.quality ?? {
      source: null,
      measurement: null,
      temporalRepresentativeness: null,
      operationalRepresentativeness: null,
      traceability: null,
    },
  );
  const [qualityError, setQualityError] = useState("");
  const [contractualFactor, setContractualFactor] = useState(
    initialActivity?.contractualFactor === undefined
      ? ""
      : String(initialActivity.contractualFactor),
  );
  const [contractualFactorSource, setContractualFactorSource] = useState(
    initialActivity?.contractualFactorSource ?? "",
  );
  const [recycledContentPct, setRecycledContentPct] = useState(
    initialActivity?.recycledContentPct === undefined
      ? ""
      : String(initialActivity.recycledContentPct),
  );
  const [recoveredMassKg, setRecoveredMassKg] = useState(
    initialActivity?.recoveredMassKg === undefined
      ? ""
      : String(initialActivity.recoveredMassKg),
  );
  const [materialEligibleKg, setMaterialEligibleKg] = useState(
    initialActivity?.materialEligibleKg === undefined
      ? ""
      : String(initialActivity.materialEligibleKg),
  );
  const [productMassKg, setProductMassKg] = useState(
    initialActivity?.productMassKg === undefined
      ? ""
      : String(initialActivity.productMassKg),
  );
  const [byproductMassKg, setByproductMassKg] = useState(
    initialActivity?.byproductMassKg === undefined
      ? ""
      : String(initialActivity.byproductMassKg),
  );
  const [wasteHazardous, setWasteHazardous] = useState<boolean | null>(
    initialActivity?.wasteHazardous ?? null,
  );
  const [dischargedM3, setDischargedM3] = useState(
    initialActivity?.dischargedM3 === undefined
      ? ""
      : String(initialActivity.dischargedM3),
  );
  const [reusedM3, setReusedM3] = useState(
    initialActivity?.reusedM3 === undefined
      ? ""
      : String(initialActivity.reusedM3),
  );
  const [denominatorValue, setDenominatorValue] = useState(
    initialActivity?.denominatorValue === undefined
      ? ""
      : String(initialActivity.denominatorValue),
  );
  const [denominatorUnit, setDenominatorUnit] = useState(
    initialActivity?.denominatorUnit ?? "t producto",
  );
  const [gasOrigin, setGasOrigin] = useState<EnvironmentalInput["gasOrigin"]>(
    initialActivity?.gasOrigin ?? "combustion",
  );
  const [digitalProvider, setDigitalProvider] = useState(
    initialActivity?.digitalProvider ?? "",
  );
  const [aiModel, setAiModel] = useState(initialActivity?.aiModel ?? "");
  const [aiInputTokens, setAiInputTokens] = useState(
    initialActivity?.aiInputTokens === undefined
      ? ""
      : String(initialActivity.aiInputTokens),
  );
  const [aiOutputTokens, setAiOutputTokens] = useState(
    initialActivity?.aiOutputTokens === undefined
      ? ""
      : String(initialActivity.aiOutputTokens),
  );
  const [internetUploadGb, setInternetUploadGb] = useState(
    initialActivity?.internetUploadGb === undefined
      ? ""
      : String(initialActivity.internetUploadGb),
  );
  const [internetDownloadGb, setInternetDownloadGb] = useState(
    initialActivity?.internetDownloadGb === undefined
      ? ""
      : String(initialActivity.internetDownloadGb),
  );
  const [reportedEnergyKwh, setReportedEnergyKwh] = useState(
    initialActivity?.reportedEnergyKwh === undefined
      ? ""
      : String(initialActivity.reportedEnergyKwh),
  );
  const [reportedWaterM3, setReportedWaterM3] = useState(
    initialActivity?.reportedWaterM3 === undefined
      ? ""
      : String(initialActivity.reportedWaterM3),
  );
  const [reportedCo2eKg, setReportedCo2eKg] = useState(
    initialActivity?.reportedCo2eKg === undefined
      ? ""
      : String(initialActivity.reportedCo2eKg),
  );

  useEffect(() => {
    let active = true;
    fetch(`/api/environment/options?reportingPeriod=${encodeURIComponent(reportingPeriod)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudieron cargar los parámetros del período.");
        return await response.json() as ActivityOptions;
      })
      .then((options) => { if (active) setPeriodModules(options.modules); })
      .catch(() => { if (active) setPeriodModules([]); });
    return () => { active = false; };
  }, [reportingPeriod]);

  const categoryOptions: Record<
    ActivityCategory,
    { code: string; name: string }[]
  > = {
    ELECTRICITY: [
      { code: "LOCATION_BASED", name: "Location-based · factor de red" },
      { code: "MARKET_BASED", name: "Market-based · factor contractual" },
    ],
    FUEL: library?.fuels ?? [],
    WATER: library?.water ?? [],
    WASTE: [
      { code: "", name: "Destino desconocido · peor caso FBK-003" },
      ...(library?.wasteDestinations ?? []),
    ],
    MATERIAL: library?.materials ?? [],
    PACKAGING: library?.packaging ?? [],
    REFRIGERANT: library?.refrigerants ?? [],
    AIR: [
      { code: "CO2", name: "CO₂ · gas de efecto invernadero" },
      { code: "CH4", name: "CH₄ · metano" },
      { code: "N2O", name: "N₂O · óxido nitroso" },
      { code: "PM10", name: "PM10 · contaminante criterio" },
      { code: "NOX", name: "NOx · contaminante criterio" },
      { code: "SOX", name: "SOx · contaminante criterio" },
      { code: "VOC", name: "VOC · contaminante criterio" },
    ],
    AI: [
      { code: "GENERATIVE", name: "IA generativa" },
      { code: "PREDICTIVE", name: "IA predictiva / analítica" },
      { code: "OTHER", name: "Otro uso de IA" },
    ],
    INTERNET: [
      { code: "FIXED", name: "Conexión fija" },
      { code: "MOBILE", name: "Conexión móvil" },
      { code: "SATELLITE", name: "Conexión satelital" },
      { code: "OTHER", name: "Otro tipo de conexión" },
    ],
    CUSTOM: periodModules.map((module) => ({ code: module.id, name: module.name })),
  };
  const options = categoryOptions[category];
  const activeSubcategory = options.some(
    (option) => option.code === subcategory,
  )
    ? subcategory
    : (options[0]?.code ?? "");
  const selectedFuel = library?.fuels.find(
    (fuel) => fuel.code === activeSubcategory,
  );
  const selectedModule = periodModules.find((module) => module.id === activeSubcategory);
  const unitsByCategory: Record<ActivityCategory, string[]> = {
    ELECTRICITY: ["kWh", "MWh", "Wh", "GJ", "MJ"],
    FUEL:
      selectedFuel?.unit === "m3"
        ? ["m3", "liter"]
        : ["liter", "m3", "kg", "t"],
    WATER: ["m3"],
    WASTE: ["kg", "t"],
    MATERIAL: ["kg", "t"],
    PACKAGING: ["unit"],
    REFRIGERANT: ["kg", "g", "t"],
    AIR: ["kg", "g", "t"],
    AI: ["solicitudes"],
    INTERNET: ["GB"],
    CUSTOM: selectedModule ? [selectedModule.unit] : ["unit"],
  };
  const units = unitsByCategory[category];
  const activeUnit = units.includes(activityUnit) ? activityUnit : units[0];

  useEffect(() => {
    if (activeUnit !== activityUnit) setActivityUnit(activeUnit);
    if (activeSubcategory !== subcategory) setSubcategory(activeSubcategory);
  }, [activeUnit, activeSubcategory, activityUnit, subcategory]);
  useEffect(() => {
    const contextChanged =
      employeeContext.current.facilityName !== facilityName ||
      employeeContext.current.reportingPeriod !== reportingPeriod;
    employeeContext.current = { facilityName, reportingPeriod };
    employeeCountEdited.current = false;
    if (contextChanged) setEmployeeCount("");
    if (!facilityName.trim()) return;
    let active = true;
    const facilityId =
      initialActivity?.facilityName === facilityName
        ? initialActivity.facilityId
        : facilityIdForName(facilityName);
    const query = new URLSearchParams({ facilityId, reportingPeriod });
    const timeout = window.setTimeout(() => {
      fetch(`/api/environment/headcounts/current?${query.toString()}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { employeeCount: number | null } | null) => {
          if (active && data && !employeeCountEdited.current)
            setEmployeeCount(
              data.employeeCount === null ? "" : String(data.employeeCount),
            );
        })
        .catch(() => undefined);
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [facilityName, reportingPeriod, initialActivity?.facilityId, initialActivity?.facilityName]);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const updateQuality = (key: keyof typeof quality, value: number) => {
    setQuality((current) => ({ ...current, [key]: value as QualityDimension }));
    setQualityError("");
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(activityValue);
    if (!Number.isFinite(value)) return;
    if (Object.values(quality).some((score) => score === null)) {
      setQualityError(
        "Completa las cinco dimensiones de calidad con evidencia para este registro.",
      );
      return;
    }
    const qualityMap = quality as EnvironmentalInput["quality"];
    const facilityId =
      initialActivity?.facilityName === facilityName
        ? initialActivity.facilityId
        : facilityIdForName(facilityName);
    onSubmit({
      tenantId,
      facilityId,
      facilityName,
      category,
      subcategory: activeSubcategory,
      activityValue: value,
      activityUnit: activeUnit,
      geography,
      reportingPeriod,
      ...(employeeCount !== "" ? { employeeCount: Number(employeeCount) } : {}),
      sourceType: sourceType as EnvironmentalInput["sourceType"],
      sourceReference,
      quality: qualityMap,
      ...(category === "AI" || category === "INTERNET"
        ? { digitalProvider: digitalProvider.trim() }
        : {}),
      ...(category === "AI"
        ? {
            ...(aiModel.trim() ? { aiModel: aiModel.trim() } : {}),
            ...(aiInputTokens !== ""
              ? { aiInputTokens: Number(aiInputTokens) }
              : {}),
            ...(aiOutputTokens !== ""
              ? { aiOutputTokens: Number(aiOutputTokens) }
              : {}),
          }
        : {}),
      ...(category === "INTERNET"
        ? {
            ...(internetUploadGb !== ""
              ? { internetUploadGb: Number(internetUploadGb) }
              : {}),
            ...(internetDownloadGb !== ""
              ? { internetDownloadGb: Number(internetDownloadGb) }
              : {}),
          }
        : {}),
      ...((category === "AI" || category === "INTERNET") &&
      reportedEnergyKwh !== ""
        ? { reportedEnergyKwh: Number(reportedEnergyKwh) }
        : {}),
      ...((category === "AI" || category === "INTERNET") &&
      reportedWaterM3 !== ""
        ? { reportedWaterM3: Number(reportedWaterM3) }
        : {}),
      ...((category === "AI" || category === "INTERNET") &&
      reportedCo2eKg !== ""
        ? { reportedCo2eKg: Number(reportedCo2eKg) }
        : {}),
      ...(activeSubcategory === "MARKET_BASED"
        ? {
            contractualFactor: Number(contractualFactor),
            contractualFactorSource,
          }
        : {}),
      ...(category === "AIR" && activeSubcategory === "CH4"
        ? { gasOrigin }
        : {}),
      ...(category === "MATERIAL" && recycledContentPct !== ""
        ? { recycledContentPct: Number(recycledContentPct) }
        : {}),
      ...(category === "MATERIAL" && recoveredMassKg !== ""
        ? { recoveredMassKg: Number(recoveredMassKg) }
        : {}),
      ...(category === "MATERIAL" && materialEligibleKg !== ""
        ? { materialEligibleKg: Number(materialEligibleKg) }
        : {}),
      ...(category === "MATERIAL" &&
      productMassKg !== "" &&
      byproductMassKg !== ""
        ? {
            productMassKg: Number(productMassKg),
            byproductMassKg: Number(byproductMassKg),
          }
        : {}),
      ...(category === "WASTE" && wasteHazardous !== null
        ? { wasteHazardous }
        : {}),
      ...(category === "WATER" && dischargedM3 !== ""
        ? { dischargedM3: Number(dischargedM3) }
        : {}),
      ...(category === "WATER" && reusedM3 !== ""
        ? { reusedM3: Number(reusedM3) }
        : {}),
      ...(category === "WATER" && denominatorValue !== ""
        ? { denominatorValue: Number(denominatorValue), denominatorUnit }
        : {}),
      ...(category === "MATERIAL" && denominatorValue !== ""
        ? { denominatorValue: Number(denominatorValue), denominatorUnit }
        : {}),
      ...(category === "PACKAGING" && recoveredMassKg !== ""
        ? { recoveredMassKg: Number(recoveredMassKg) }
        : {}),
    });
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="capture-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-title"
      >
        <div className="modal-header">
          <div>
            <span className="modal-kicker">
              <span className="live-dot" /> CAPTURA AMBIENTAL ·{" "}
              {initialRun ? "CORRECCIÓN DE REGISTRO" : "NUEVA CORRIDA"}
            </span>
            <h2 id="capture-title">
              {initialRun ? "Modificar registro" : "Registrar actividad"}
            </h2>
            <p>
              {initialRun
                ? "La actividad se volverá a validar y calcular; el resultado anterior permanecerá en el historial."
                : "El motor valida la fuente y el factor antes de guardar un resultado trazable."}
            </p>
          </div>
          <button
            className="icon-button modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="capture-form">
          <div className="form-section-title">
            <span>01</span> Actividad y período
          </div>
          <div className="form-grid">
            <InputField label="Módulo">
              <select
                value={category}
                onChange={(event) => {
                  const next = event.target.value as ActivityCategory;
                  setCategory(next);
                  setSubcategory("");
                  setActivityUnit(unitsByCategory[next][0]);
                }}
                className="form-control"
              >
                {Object.entries(categoryLabels).filter(([key]) => key !== "CUSTOM" || (library?.modules.length ?? 0) > 0).map(([key, label]) => (
                  <option value={key} key={key}>
                    {label}
                  </option>
                ))}
              </select>
            </InputField>
            <InputField label={category === "CUSTOM" ? "Módulo personalizado" : "Actividad / factor"}>
              <select
                value={activeSubcategory}
                onChange={(event) => {
                  setSubcategory(event.target.value);
                  const fuel = library?.fuels.find(
                    (item) => item.code === event.target.value,
                  );
                  if (fuel) setActivityUnit(fuel.unit);
                }}
                className="form-control"
              >
                {options.map((option) => (
                  <option value={option.code} key={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
            </InputField>
            <InputField
              label={
                category === "AI"
                  ? "Solicitudes de IA"
                  : category === "INTERNET"
                    ? "Tráfico total"
                    : "Cantidad"
              }
            >
              <input
                type="number"
                step={category === "AI" ? "1" : "any"}
                min="0"
                value={activityValue}
                onChange={(event) => setActivityValue(event.target.value)}
                placeholder="Ej. 15000"
                className="form-control"
                required
              />
            </InputField>
            <InputField label="Unidad">
              <select
                value={activeUnit}
                onChange={(event) => setActivityUnit(event.target.value)}
                className="form-control"
              >
                {units.map((unit) => (
                  <option key={unit}>{unit}</option>
                ))}
              </select>
            </InputField>
            <InputField label="Instalación">
              <input
                value={facilityName}
                onChange={(event) => setFacilityName(event.target.value)}
                placeholder="Nombre de sede o planta"
                className="form-control"
                required
              />
            </InputField>
            <InputField label="Período reportado">
              <div className="reporting-period-control">
                <select
                  value={reportingPeriod.slice(5, 7)}
                  onChange={(event) =>
                    setReportingPeriod(
                      `${reportingPeriod.slice(0, 4)}-${event.target.value}`,
                    )
                  }
                  className="form-control"
                  aria-label="Mes reportado"
                  required
                >
                  {monthOptions.map((label, index) => {
                    const value = String(index + 1).padStart(2, "0");
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <div className="reporting-year-stepper">
                  <button
                    type="button"
                    onClick={() =>
                      setReportingPeriod(
                        `${Number(reportingPeriod.slice(0, 4)) - 1}-${reportingPeriod.slice(5, 7)}`,
                      )
                    }
                    aria-label="Año anterior"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <output aria-live="polite">
                    {reportingPeriod.slice(0, 4)}
                  </output>
                  <button
                    type="button"
                    onClick={() =>
                      setReportingPeriod(
                        `${Number(reportingPeriod.slice(0, 4)) + 1}-${reportingPeriod.slice(5, 7)}`,
                      )
                    }
                    aria-label="Año siguiente"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </InputField>
            <InputField label="Empleados de la sede">
              <input
                type="number"
                min="1"
                step="1"
                value={employeeCount}
                onChange={(event) => {
                  employeeCountEdited.current = true;
                  setEmployeeCount(event.target.value);
                }}
                placeholder="Ej. 35"
                className="form-control"
                aria-describedby="employee-count-hint"
              />
              <span className="field-hint" id="employee-count-hint">
                Opcional. Si lo informas, se reutiliza en esta sede y mes.
              </span>
            </InputField>
            <InputField label="Geografía">
              <select
                value={geography}
                onChange={(event) => setGeography(event.target.value)}
                className="form-control"
              >
                <option value="VE">Venezuela · VE</option>
                <option value="US-CAMX">Estados Unidos · CAMX</option>
                <option value="CO">Colombia · Nacional</option>
              </select>
            </InputField>
            <InputField label="Tipo de fuente">
              <select
                value={sourceType}
                onChange={(event) =>
                  setSourceType(
                    event.target.value as EnvironmentalInput["sourceType"] | "",
                  )
                }
                className="form-control"
                required
              >
                <option value="">Selecciona una fuente</option>
                <option value="FACTURA_COMERCIAL">Factura comercial</option>
                <option value="MEDICION_DIRECTA">Medición directa</option>
                <option value="REGISTRO_OPERATIVO">Registro operativo</option>
                <option value="ESTIMACION">Estimación</option>
              </select>
            </InputField>
            <div className="form-grid-span">
              <InputField label="Referencia / documento de respaldo">
                <input
                  value={sourceReference}
                  onChange={(event) => setSourceReference(event.target.value)}
                  placeholder="Ej. Factura eléctrica N.º 2084 · junio"
                  className="form-control"
                  required
                />
              </InputField>
            </div>
          </div>
          {(category === "AI" || category === "INTERNET") && (
            <div className="special-input-grid digital-input-grid">
              <InputField
                label={
                  category === "AI"
                    ? "Proveedor de IA"
                    : "Proveedor de internet"
                }
              >
                <input
                  value={digitalProvider}
                  onChange={(event) => setDigitalProvider(event.target.value)}
                  placeholder="Nombre del proveedor"
                  className="form-control"
                  required
                />
              </InputField>
              {category === "AI" ? (
                <>
                  <InputField label="Modelo de IA">
                    <input
                      value={aiModel}
                      onChange={(event) => setAiModel(event.target.value)}
                      placeholder="Opcional"
                      className="form-control"
                    />
                  </InputField>
                  <InputField label="Tokens de entrada">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={aiInputTokens}
                      onChange={(event) => setAiInputTokens(event.target.value)}
                      placeholder="Si está informado"
                      className="form-control"
                    />
                  </InputField>
                  <InputField label="Tokens de salida">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={aiOutputTokens}
                      onChange={(event) =>
                        setAiOutputTokens(event.target.value)
                      }
                      placeholder="Si está informado"
                      className="form-control"
                    />
                  </InputField>
                </>
              ) : (
                <>
                  <InputField label="Tráfico de subida · GB">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={internetUploadGb}
                      onChange={(event) =>
                        setInternetUploadGb(event.target.value)
                      }
                      placeholder="Opcional"
                      className="form-control"
                    />
                  </InputField>
                  <InputField label="Tráfico de descarga · GB">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={internetDownloadGb}
                      onChange={(event) =>
                        setInternetDownloadGb(event.target.value)
                      }
                      placeholder="Opcional"
                      className="form-control"
                    />
                  </InputField>
                </>
              )}
              <InputField label="Energía informada · kWh">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={reportedEnergyKwh}
                  onChange={(event) => setReportedEnergyKwh(event.target.value)}
                  placeholder="Solo si la fuente la informa"
                  className="form-control"
                />
              </InputField>
              <InputField label="Agua informada · m³">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={reportedWaterM3}
                  onChange={(event) => setReportedWaterM3(event.target.value)}
                  placeholder="Solo si la fuente la informa"
                  className="form-control"
                />
              </InputField>
              <InputField label="GEI informado · kgCO₂e">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={reportedCo2eKg}
                  onChange={(event) => setReportedCo2eKg(event.target.value)}
                  placeholder="Solo si la fuente lo informa"
                  className="form-control"
                />
              </InputField>
              <p className="special-hint">
                Las solicitudes, tokens y GB describen uso, no emisiones.
                Registra energía, agua o GEI únicamente cuando el proveedor o
                una medición los documente; el GEI reportado se mantiene
                separado del inventario corporativo.
              </p>
            </div>
          )}
          {activeSubcategory === "MARKET_BASED" && (
            <div className="special-input-grid">
              <InputField label="Factor contractual · kgCO₂e/kWh">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={contractualFactor}
                  onChange={(event) => setContractualFactor(event.target.value)}
                  placeholder="Factor de contrato"
                  className="form-control"
                  required
                />
              </InputField>
              <InputField label="Fuente del factor contractual">
                <input
                  value={contractualFactorSource}
                  onChange={(event) =>
                    setContractualFactorSource(event.target.value)
                  }
                  placeholder="Contrato, instrumento o proveedor"
                  className="form-control"
                  required
                />
              </InputField>
            </div>
          )}
          {category === "AIR" && activeSubcategory === "CH4" && (
            <InputField label="Origen del metano">
              <select
                value={gasOrigin}
                onChange={(event) =>
                  setGasOrigin(
                    event.target.value as EnvironmentalInput["gasOrigin"],
                  )
                }
                className="form-control"
              >
                <option value="combustion">Combustión · GWP100 27</option>
                <option value="biogenic">Biogénico · GWP100 27</option>
                <option value="fugitiveFossil">
                  Fugitivo fósil / proceso · GWP100 29,8
                </option>
              </select>
            </InputField>
          )}
          {category === "WASTE" && (
            <div className="special-input-grid">
              <InputField label="Clasificación">
                <select
                  value={
                    wasteHazardous === null
                      ? ""
                      : wasteHazardous
                        ? "hazardous"
                        : "general"
                  }
                  onChange={(event) =>
                    setWasteHazardous(
                      event.target.value === ""
                        ? null
                        : event.target.value === "hazardous",
                    )
                  }
                  className="form-control"
                  required
                >
                  <option value="">Selecciona la clasificación</option>
                  <option value="general">Residuo no peligroso</option>
                  <option value="hazardous">Residuo peligroso</option>
                </select>
              </InputField>
              <p className="special-hint">
                El umbral THR-004 solo se aplica a residuos peligrosos
                identificados como tales.
              </p>
            </div>
          )}
          {category === "WATER" && (
            <div className="special-input-grid">
              <InputField label="Agua descargada · m³">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={dischargedM3}
                  onChange={(event) => setDischargedM3(event.target.value)}
                  placeholder="Opcional"
                  className="form-control"
                />
              </InputField>
              <InputField label="Agua reutilizada · m³">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={reusedM3}
                  onChange={(event) => setReusedM3(event.target.value)}
                  placeholder="Opcional"
                  className="form-control"
                />
              </InputField>
              <InputField label="Denominador productivo">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={denominatorValue}
                  onChange={(event) => setDenominatorValue(event.target.value)}
                  placeholder="Opcional"
                  className="form-control"
                />
              </InputField>
              <InputField label="Unidad de producto">
                <input
                  value={denominatorUnit}
                  onChange={(event) => setDenominatorUnit(event.target.value)}
                  className="form-control"
                />
              </InputField>
              <p className="special-hint">
                El balance hídrico se mostrará como “diferencia de balance /
                agua no contabilizada”, no como pérdida atribuida.
              </p>
            </div>
          )}
          {category === "MATERIAL" && (
            <div className="special-input-grid">
              <InputField label="Contenido reciclado · %">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={recycledContentPct}
                  onChange={(event) =>
                    setRecycledContentPct(event.target.value)
                  }
                  placeholder="Usar valor documentado"
                  className="form-control"
                />
              </InputField>
              <InputField label="Reintroducido / reutilizado / reciclado · kg">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={recoveredMassKg}
                  onChange={(event) => setRecoveredMassKg(event.target.value)}
                  placeholder="Opcional"
                  className="form-control"
                />
              </InputField>
              <InputField label="Material elegible para circularidad · kg">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={materialEligibleKg}
                  onChange={(event) =>
                    setMaterialEligibleKg(event.target.value)
                  }
                  placeholder="Opcional"
                  className="form-control"
                />
              </InputField>
              <InputField label="Denominador productivo">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={denominatorValue}
                  onChange={(event) => setDenominatorValue(event.target.value)}
                  placeholder="Opcional"
                  className="form-control"
                />
              </InputField>
              <InputField label="Producto final · kg">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={productMassKg}
                  onChange={(event) => setProductMassKg(event.target.value)}
                  placeholder="Opcional"
                  className="form-control"
                />
              </InputField>
              <InputField label="Subproductos · kg">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={byproductMassKg}
                  onChange={(event) => setByproductMassKg(event.target.value)}
                  placeholder="Opcional"
                  className="form-control"
                />
              </InputField>
              <p className="special-hint">
                Reciclabilidad potencial y material efectivamente recuperado se
                registran por separado.
              </p>
            </div>
          )}
          {category === "PACKAGING" && (
            <div className="special-input-grid">
              <InputField label="Contenido reciclado · %">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={recycledContentPct}
                  onChange={(event) =>
                    setRecycledContentPct(event.target.value)
                  }
                  placeholder="Opcional"
                  className="form-control"
                />
              </InputField>
              <InputField label="Masa de empaques recuperada · kg">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={recoveredMassKg}
                  onChange={(event) => setRecoveredMassKg(event.target.value)}
                  placeholder="Opcional"
                  className="form-control"
                />
              </InputField>
              <p className="special-hint">
                La masa recuperada no se infiere de la propiedad “reciclable”.
              </p>
            </div>
          )}
          <div className="form-section-title form-quality-title">
            <span>02</span> Calidad y trazabilidad{" "}
            <small>Asigna 0 = baja, 1 = parcial o 2 = completa.</small>
          </div>
          <div className="quality-input-grid">
            {qualityLabels.map((label, index) => {
              const key = (
                [
                  "source",
                  "measurement",
                  "temporalRepresentativeness",
                  "operationalRepresentativeness",
                  "traceability",
                ] as const
              )[index];
              return (
                <div className="quality-input" key={label}>
                  <span>{label}</span>
                  <div className="quality-choice-group">
                    {[0, 1, 2].map((value) => (
                      <button
                        type="button"
                        key={value}
                        className={
                          quality[key] === value
                            ? "quality-choice selected"
                            : "quality-choice"
                        }
                        onClick={() => updateQuality(key, value)}
                        aria-label={`${label}: ${value}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {(error || qualityError) && (
            <div className="form-error">
              <CircleHelp size={16} />
              <span>{error || qualityError}</span>
            </div>
          )}
          <div className="form-submit-row">
            <span>
              <ShieldCheck size={15} />{" "}
              {initialRun
                ? "Corrección versionada · No se inventan factores"
                : "Cálculo versionado · No se inventan factores"}
            </span>
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button className="button-primary" type="submit" disabled={saving}>
              {saving ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Zap size={16} />
              )}
              {saving
                ? "Calculando…"
                : initialRun
                  ? "Guardar corrección"
                  : "Validar y calcular"}
            </button>
          </div>
          {lastCreated && (
            <span className="sr-only">
              Último cálculo: {lastCreated.calculationId}
            </span>
          )}
        </form>
      </section>
    </div>
  );
}
