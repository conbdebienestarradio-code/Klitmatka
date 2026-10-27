import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type { EnvironmentalInput } from "../shared/environment";

let server: Server;
let baseUrl = "";
let sessionCookie = "";

const verifiedQuality = {
  source: 2 as const,
  measurement: 2 as const,
  temporalRepresentativeness: 2 as const,
  operationalRepresentativeness: 2 as const,
  traceability: 2 as const,
};

const electricityInput: EnvironmentalInput = {
  tenantId: "tenant-test",
  facilityId: "facility-test",
  facilityName: "Instalación de prueba",
  category: "ELECTRICITY",
  subcategory: "LOCATION_BASED",
  activityValue: 15000,
  activityUnit: "kWh",
  geography: "VE",
  reportingPeriod: "2026-06",
  sourceType: "FACTURA_COMERCIAL",
  sourceReference: "FACT-TEST-0001",
  quality: verifiedQuality,
};

async function request(path: string, body?: unknown, method?: string, cookie = sessionCookie) {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, body === undefined && !method && !cookie ? undefined : {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: response.status === 204 ? {} : await response.json() as Record<string, any>, setCookie: response.headers.get("set-cookie") };
}

beforeAll(async () => {
  process.env.SW_ENVIRONMENT_DATABASE_PATH = ":memory:";
  const { createServer } = await import("./index");
  server = createServer().listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  const registered = await request("/api/auth/register", {
    firstName: "Admin",
    lastName: "Klimatka",
    jobTitle: "Consultor ambiental",
    email: "admin@bienestarradio.test",
    password: "SeguraClavePrueba123",
  }, "POST", "");
  expect(registered.status).toBe(201);
  expect(registered.body.company).toBeNull();
  sessionCookie = registered.setCookie?.split(";")[0] ?? "";
  const company = await request("/api/auth/companies", {
    companyEmail: "contacto@bienestarradio.test",
    rif: "J-12345678-9",
    companyName: "Bienestar Radio",
    employeeCount: 25,
  });
  expect(company.status).toBe(201);
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe("environmental calculation API", () => {
  it("requires a session and exposes the registered company profile", async () => {
    const anonymous = await request("/api/environment/overview", undefined, undefined, "");
    const profile = await request("/api/auth/me");
    expect(anonymous.status).toBe(401);
    expect(profile.status).toBe(200);
    expect(profile.body).toMatchObject({ email: "admin@bienestarradio.test", role: "admin", company: { name: "Bienestar Radio", rif: "J-12345678-9", email: "contacto@bienestarradio.test", employeeCount: 25 } });
  });

  it("lets an administrator invite a same-company member", async () => {
    const invite = await request("/api/auth/invitations", { email: "analista@bienestarradio.test" });
    expect(invite.status).toBe(201);
    const preview = await request(`/api/auth/invitations/${invite.body.token}`, undefined, undefined, "");
    expect(preview.body).toMatchObject({ email: "analista@bienestarradio.test", companyName: "Bienestar Radio" });
    const registeredMember = await request("/api/auth/register", {
      firstName: "Ana",
      lastName: "Analista",
      jobTitle: "Analista ambiental",
      email: "analista@bienestarradio.test",
      password: "SeguraClaveMiembro123",
    }, "POST", "");
    expect(registeredMember.status).toBe(201);
    const memberCookie = registeredMember.setCookie?.split(";")[0] ?? "";
    const joined = await request(`/api/auth/invitations/${invite.body.token}/accept`, undefined, "POST", memberCookie);
    expect(joined.status).toBe(200);
    expect(joined.body.role).toBe("member");
    const memberInvite = await request("/api/auth/invitations", { email: "otra@bienestarradio.test" }, "POST", memberCookie);
    expect(memberInvite.status).toBe(403);
    expect((await request("/api/environment/overview", undefined, undefined, memberCookie)).status).toBe(200);
  });

  it("sends a generic reset response and allows a reset token only once", async () => {
    const registered = await request("/api/auth/register", {
      firstName: "Usuario",
      lastName: "Recuperación",
      jobTitle: "Consultor",
      email: "recuperacion@bienestarradio.test",
      password: "ClaveOriginalSegura123",
    }, "POST", "");
    const resetCookie = registered.setCookie?.split(";")[0] ?? "";
    const previousApiKey = process.env.RESEND_API_KEY;
    const previousSender = process.env.RESEND_FROM_EMAIL;
    const previousAppUrl = process.env.KLIMATKA_APP_URL;
    const originalFetch = globalThis.fetch;
    let sentEmail: Record<string, unknown> | undefined;
    let emailDeliveryStatus = 200;
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "Klimatka <no-reply@example.test>";
    process.env.KLIMATKA_APP_URL = "https://klimatka.example.test";
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "https://api.resend.com/emails") {
        sentEmail = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(JSON.stringify({ id: "email_test_id" }), { status: emailDeliveryStatus, headers: { "Content-Type": "application/json" } });
      }
      return originalFetch(input, init);
    });
    try {
      const requested = await request("/api/auth/password-reset/request", { email: "RECUPERACION@BIENESTARRADIO.TEST" }, "POST", "");
      const unknown = await request("/api/auth/password-reset/request", { email: "ausente@bienestarradio.test" }, "POST", "");
      expect(requested.status).toBe(200);
      expect(requested.body).toEqual(unknown.body);
      expect(sentEmail?.to).toEqual(["recuperacion@bienestarradio.test"]);
      const resetUrlText = String(sentEmail?.text).split(/\r?\n/).find((line) => line.startsWith("https://"));
      if (!resetUrlText) throw new Error("Reset URL was not included in the email.");
      const token = new URL(resetUrlText).searchParams.get("token");
      expect(token).toBeTruthy();
      const changed = await request("/api/auth/password-reset/complete", { token, password: "ClaveNuevaSegura456" }, "POST", "");
      expect(changed.status).toBe(200);
      expect((await request("/api/auth/password-reset/complete", { token, password: "ClaveDiferente7890" }, "POST", "")).status).toBe(400);
      expect((await request("/api/auth/me", undefined, undefined, resetCookie)).status).toBe(401);
      expect((await request("/api/auth/login", { email: "recuperacion@bienestarradio.test", password: "ClaveOriginalSegura123" }, "POST", "")).status).toBe(401);
      expect((await request("/api/auth/login", { email: "recuperacion@bienestarradio.test", password: "ClaveNuevaSegura456" }, "POST", "")).status).toBe(200);
      const failedDeliveryUser = await request("/api/auth/register", {
        firstName: "Correo",
        lastName: "Fallido",
        jobTitle: "Consultor",
        email: "correo-fallido@bienestarradio.test",
        password: "ClaveOriginalSegura123",
      }, "POST", "");
      expect(failedDeliveryUser.status).toBe(201);
      emailDeliveryStatus = 503;
      const failedDelivery = await request("/api/auth/password-reset/request", { email: "correo-fallido@bienestarradio.test" }, "POST", "");
      const failedUnknown = await request("/api/auth/password-reset/request", { email: "otro-ausente@bienestarradio.test" }, "POST", "");
      expect(failedDelivery.status).toBe(200);
      expect(failedDelivery.body).toEqual(failedUnknown.body);
    } finally {
      vi.unstubAllGlobals();
      if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previousApiKey;
      if (previousSender === undefined) delete process.env.RESEND_FROM_EMAIL;
      else process.env.RESEND_FROM_EMAIL = previousSender;
      if (previousAppUrl === undefined) delete process.env.KLIMATKA_APP_URL;
      else process.env.KLIMATKA_APP_URL = previousAppUrl;
    }
  });

  it("loads the relational reference libraries from the approved workbook", async () => {
    const { status, body } = await request("/api/environment/overview");
    expect(status).toBe(200);
    expect(body.library.tableCount).toBe(24);
    expect(body.library.sourceCount).toBe(9);
    expect(body.library.pendingNationalCount).toBe(3);
    expect(body.totals.runCount).toBe(0);
  });

  it("applies FBK-001 to pending Venezuelan electricity without presenting a verified factor", async () => {
    const { status, body } = await request("/api/environment/calculate", electricityInput);
    expect(status).toBe(201);
    expect(body.co2eTotalTonnes).toBe(6.75);
    expect(body.factorUsed).toContain("FBK-001");
    expect(body.fallbackApplied).toBe(true);
    expect(body.factorStatus).toContain("PENDIENTE_VALIDACION_OFICIAL");
    expect(body.sourceReference).toBe(electricityInput.sourceReference);
    expect(body.snapshot.factor.fallbackRule).toBe("FBK-001");

    const year = await request("/api/environment/runs?year=2026");
    const month = await request("/api/environment/runs?year=2026&month=06");
    const emptyMonth = await request("/api/environment/runs?year=2026&month=07");
    expect(year.status).toBe(200);
    expect(year.body).toHaveLength(1);
    expect(month.body).toHaveLength(1);
    expect(month.body[0].reportingPeriod).toBe("2026-06");
    expect(emptyMonth.body).toHaveLength(0);
  });

  it("records AI usage and provider-reported impact without deriving or assigning corporate emissions", async () => {
    const before = await request("/api/environment/overview");
    const { status, body } = await request("/api/environment/calculate", {
      ...electricityInput,
      category: "AI",
      subcategory: "GENERATIVE",
      activityValue: 250,
      activityUnit: "solicitudes",
      sourceReference: "TEST-AI-REPORT-0001",
      digitalProvider: "Proveedor de prueba",
      aiModel: "Modelo documentado",
      aiInputTokens: 12000,
      aiOutputTokens: 3600,
      reportedEnergyKwh: 2.4,
      reportedWaterM3: 0.8,
      reportedCo2eKg: 1.7,
    });
    expect(status).toBe(201);
    expect(body.co2eTotalTonnes).toBeNull();
    expect(body.scope).toContain("fuera del inventario");
    expect(body.normalizedValue).toBe(250);
    expect(body.normalizedUnit).toBe("solicitudes");
    expect(body.digitalUsage).toMatchObject({ provider: "Proveedor de prueba", model: "Modelo documentado", inputTokens: 12000, outputTokens: 3600, reportedEnergyKwh: 2.4, reportedWaterM3: 0.8, reportedCo2eKg: 1.7 });
    expect(body.warnings.some((warning: string) => warning.includes("no se deriva"))).toBe(true);
    const after = await request("/api/environment/overview");
    expect(after.body.totals.co2eTonnes).toBe(before.body.totals.co2eTonnes);
    const history = await request("/api/environment/runs?year=2026&month=06");
    expect(history.body.find((run: Record<string, any>) => run.calculationId === body.calculationId).digitalUsage.provider).toBe("Proveedor de prueba");
    const exportRuns = await request("/api/environment/runs/export");
    expect(exportRuns.body.some((run: Record<string, any>) => run.calculationId === body.calculationId)).toBe(true);
  });

  it("records internet traffic only when upload and download match total, without inferring emissions", async () => {
    const { status, body } = await request("/api/environment/calculate", {
      ...electricityInput,
      category: "INTERNET",
      subcategory: "FIXED",
      activityValue: 15,
      activityUnit: "GB",
      sourceReference: "TEST-INTERNET-0001",
      digitalProvider: "ISP de prueba",
      internetUploadGb: 3,
      internetDownloadGb: 12,
    });
    expect(status).toBe(201);
    expect(body.co2eTotalTonnes).toBeNull();
    expect(body.digitalUsage).toMatchObject({ provider: "ISP de prueba", uploadGb: 3, downloadGb: 12 });

    const mismatch = await request("/api/environment/calculate", {
      ...electricityInput,
      category: "INTERNET",
      subcategory: "FIXED",
      activityValue: 15,
      activityUnit: "GB",
      sourceReference: "TEST-INTERNET-MISMATCH-0001",
      digitalProvider: "ISP de prueba",
      internetUploadGb: 3,
      internetDownloadGb: 10,
    });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.errors[0]).toContain("coincidir");
  });

  it("rejects a month filter without a valid year", async () => {
    const { status } = await request("/api/environment/runs?month=06");
    expect(status).toBe(400);
  });

  it("stores employee counts by facility and month without changing absolute emissions", async () => {
    const beforeTotals = (await request("/api/environment/overview")).body.totals;
    const created = await request("/api/environment/calculate", {
      ...electricityInput,
      tenantId: "bienestar-radio",
      sourceReference: "TEST-HEADCOUNT-0001",
      employeeCount: 25,
    });
    expect(created.status).toBe(201);
    expect(created.body.co2eTotalTonnes).toBe(6.75);
    const afterTotals = (await request("/api/environment/overview")).body.totals;
    expect(afterTotals.co2eTonnes - beforeTotals.co2eTonnes).toBe(6.75);

    const current = await request("/api/environment/headcounts/current?facilityId=facility-test&reportingPeriod=2026-06");
    expect(current.body.employeeCount).toBe(25);
    const month = await request("/api/environment/headcounts?year=2026&month=06");
    expect(month.body).toEqual([{ facilityId: "facility-test", facilityName: "Instalación de prueba", reportingPeriod: "2026-06", employeeCount: 25 }]);
    const invalid = await request("/api/environment/calculate", {
      ...electricityInput,
      sourceReference: "TEST-HEADCOUNT-INVALID",
      employeeCount: 0,
    });
    expect(invalid.status).toBe(400);
  });

  it("recalculates edited records, preserves prior versions, and removes deleted records from active totals", async () => {
    const input = { ...electricityInput, sourceReference: "TEST-EDIT-0001" };
    const baseline = (await request("/api/environment/overview")).body.totals.co2eTonnes;
    const created = await request("/api/environment/calculate", input);
    expect(created.status).toBe(201);
    const invalidUpdate = await request(`/api/environment/runs/${created.body.calculationId}`, { ...input, activityValue: -1 }, "PATCH");
    expect(invalidUpdate.status).toBe(400);
    const unchanged = await request(`/api/environment/runs?year=2026`);
    expect(unchanged.body.find((run: Record<string, any>) => run.calculationId === created.body.calculationId).activityValue).toBe(15000);

    const revisedInput = { ...input, activityValue: 20000 };
    const updated = await request(`/api/environment/runs/${created.body.calculationId}`, revisedInput, "PATCH");
    expect(updated.status).toBe(200);
    expect(updated.body.calculationId).toBe(created.body.calculationId);
    expect(updated.body.activityValue).toBe(20000);
    expect(updated.body.co2eTotalTonnes).toBe(9);
    expect(updated.body.snapshot.revision).toBe(2);

    const history = await request(`/api/environment/runs/${created.body.calculationId}/history`);
    expect(history.body).toHaveLength(1);
    expect(history.body[0].action).toBe("EDIT");
    expect(history.body[0].previousRecord.activityValue).toBe(15000);

    const deleted = await request(`/api/environment/runs/${created.body.calculationId}`, undefined, "DELETE");
    expect(deleted.status).toBe(200);
    expect(deleted.body.calculationId).toBe(created.body.calculationId);
    expect((await request("/api/environment/runs?year=2026")).body.some((run: Record<string, any>) => run.calculationId === created.body.calculationId)).toBe(false);
    expect((await request("/api/environment/overview")).body.totals.co2eTonnes).toBe(baseline);
    const finalHistory = await request(`/api/environment/runs/${created.body.calculationId}/history`);
    expect(finalHistory.body).toHaveLength(2);
    expect(finalHistory.body[0].action).toBe("DELETE");
  });

  it("does not allow the same input source to be counted twice", async () => {
    const { status, body } = await request("/api/environment/calculate", electricityInput);
    expect(status).toBe(409);
    expect(body.errors[0]).toContain("VD-011");
  });

  it("requires a documented contractual factor for market-based electricity", async () => {
    const { status, body } = await request("/api/environment/calculate", {
      ...electricityInput,
      subcategory: "MARKET_BASED",
      sourceReference: "FACT-TEST-MARKET-0001",
    });
    expect(status).toBe(400);
    expect(body.errors[0]).toContain("VD-007");
  });

  it("keeps criterion pollutants in mass and prevents invalid percentages", async () => {
    const pollutant = await request("/api/environment/calculate", {
      ...electricityInput,
      category: "AIR",
      subcategory: "PM10",
      activityValue: 12,
      activityUnit: "kg",
      sourceReference: "TEST-PM10-0001",
    });
    expect(pollutant.status).toBe(201);
    expect(pollutant.body.co2eTotalTonnes).toBeNull();
    expect(pollutant.body.metricUnit).toBe("kg contaminante");

    const invalidPercent = await request("/api/environment/calculate", {
      ...electricityInput,
      category: "MATERIAL",
      subcategory: "ALUMINUM_PRIMARY",
      activityValue: 100,
      activityUnit: "kg",
      sourceReference: "TEST-MATERIAL-0001",
      recycledContentPct: 101,
    });
    expect(invalidPercent.status).toBe(400);
    expect(invalidPercent.body.errors[0]).toContain("VAL-005");
  });

  it("lets one consultant switch between companies without mixing analyses", async () => {
    const registered = await request("/api/auth/register", {
      firstName: "Carla",
      lastName: "Consultora",
      jobTitle: "Consultora ambiental",
      email: "carla@consultora.test",
      password: "ClavePersonalSegura2026",
    }, "POST", "");
    expect(registered.status).toBe(201);
    expect(registered.body.company).toBeNull();
    const consultantCookie = registered.setCookie?.split(";")[0] ?? "";
    const firstCompany = await request("/api/auth/companies", { companyEmail: "contacto@primera.test", rif: "J-11223344-5", companyName: "Primera Empresa", employeeCount: 12 }, "POST", consultantCookie);
    expect(firstCompany.status).toBe(201);
    const firstRun = await request("/api/environment/calculate", { ...electricityInput, tenantId: "spoofed-company", sourceReference: "TEST-CONSULTANT-FIRST-0001" }, "POST", consultantCookie);
    expect(firstRun.status).toBe(201);
    expect(firstRun.body.snapshot.activity.createdByUserId).toBe(registered.body.id);

    const secondCompany = await request("/api/auth/companies", { companyEmail: "contacto@segunda.test", rif: "J-55667788-9", companyName: "Segunda Empresa", employeeCount: 34 }, "POST", consultantCookie);
    expect(secondCompany.status).toBe(201);
    expect(secondCompany.body.companies).toHaveLength(2);
    expect((await request("/api/environment/runs?year=2026", undefined, undefined, consultantCookie)).body).toEqual([]);

    const switchedBack = await request("/api/auth/companies/switch", { companyId: firstCompany.body.company.id }, "POST", consultantCookie);
    expect(switchedBack.status).toBe(200);
    expect(switchedBack.body.company.id).toBe(firstCompany.body.company.id);
    const firstCompanyRuns = await request("/api/environment/runs?year=2026", undefined, undefined, consultantCookie);
    expect(firstCompanyRuns.body.map((run: Record<string, any>) => run.calculationId)).toContain(firstRun.body.calculationId);
  });

  it("restricts module administration and versions custom parameters by effective date", async () => {
    const previousAdmins = process.env.KLIMATKA_PLATFORM_ADMIN_EMAILS;
    try {
      process.env.KLIMATKA_PLATFORM_ADMIN_EMAILS = "";
      expect((await request("/api/platform-admin/modules")).status).toBe(403);
      process.env.KLIMATKA_PLATFORM_ADMIN_EMAILS = "admin@bienestarradio.test";
      const created = await request("/api/platform-admin/modules", {
        code: "TEST_CUSTOM_METER",
        name: "Medición de prueba",
        description: "Módulo de validación automatizada.",
        unit: "km",
        metricName: "kilómetros recorridos",
        factorValue: 0.5,
        factorUnit: "kgCO₂e/km",
        sourceReference: "Fuente documentada de prueba",
        status: "VIGENTE",
        validFrom: "2025-01-01",
      });
      expect(created.status).toBe(201);
      expect((await request("/api/platform-admin/modules", undefined, undefined, "")).status).toBe(401);

      const updated = await request(`/api/platform-admin/modules/${created.body.id}`, {
        name: "Distancia de transporte",
        description: "Versión actualizada del módulo de validación.",
        unit: "mi",
        metricName: "millas recorridas",
        factorValue: 0.8,
        factorUnit: "kgCO₂e/km",
        sourceReference: "Fuente actualizada de prueba",
        status: "VIGENTE",
        validFrom: "2027-01-01",
        active: true,
      }, "PUT");
      expect(updated.status).toBe(200);
      const history = await request(`/api/platform-admin/modules/${created.body.id}/versions`);
      expect(history.body.map((version: Record<string, any>) => version.version)).toEqual([2, 1]);
      expect(history.body[0]).toMatchObject({ name: "Distancia de transporte", unit: "mi", metricName: "millas recorridas" });
      expect(history.body[1]).toMatchObject({ name: "Medición de prueba", unit: "km", metricName: "kilómetros recorridos" });

      const historicalOptions = await request("/api/environment/options?reportingPeriod=2026-06");
      expect(historicalOptions.body.modules.find((module: Record<string, any>) => module.id === created.body.id)).toMatchObject({ name: "Medición de prueba", unit: "km" });
      const currentOptions = await request("/api/environment/options?reportingPeriod=2027-06");
      expect(currentOptions.body.modules.find((module: Record<string, any>) => module.id === created.body.id)).toMatchObject({ name: "Distancia de transporte", unit: "mi" });
      expect((await request("/api/environment/options?reportingPeriod=2027-99")).status).toBe(400);

      const historical = await request("/api/environment/calculate", { ...electricityInput, category: "CUSTOM", subcategory: created.body.id, activityValue: 100, activityUnit: "km", reportingPeriod: "2026-06", sourceReference: "TEST-CUSTOM-HISTORICAL-0001" });
      expect(historical.status).toBe(201);
      expect(historical.body.co2eTotalTonnes).toBe(0.05);
      expect(historical.body.snapshot.measurementModule.version).toBe(1);
      expect(historical.body.metricUnit).toBe("kilómetros recorridos");
      const current = await request("/api/environment/calculate", { ...electricityInput, category: "CUSTOM", subcategory: created.body.id, activityValue: 100, activityUnit: "mi", reportingPeriod: "2027-06", sourceReference: "TEST-CUSTOM-CURRENT-0001" });
      expect(current.status).toBe(201);
      expect(current.body.co2eTotalTonnes).toBe(0.08);
      expect(current.body.snapshot.measurementModule.version).toBe(2);
      expect(current.body.metricUnit).toBe("millas recorridas");
    } finally {
      if (previousAdmins === undefined) delete process.env.KLIMATKA_PLATFORM_ADMIN_EMAILS;
      else process.env.KLIMATKA_PLATFORM_ADMIN_EMAILS = previousAdmins;
    }
  });

  it("keeps company records inaccessible to other accounts", async () => {
    const created = await request("/api/environment/calculate", { ...electricityInput, sourceReference: "TEST-COMPANY-ISOLATION-0001" });
    expect(created.status).toBe(201);
    const other = await request("/api/auth/register", {
      firstName: "Otra",
      lastName: "Empresa",
      jobTitle: "Consultora",
      email: "admin@otraempresa.test",
      password: "SeguraClaveOtraEmpresa123",
    }, "POST", "");
    expect(other.status).toBe(201);
    const otherCookie = other.setCookie?.split(";")[0] ?? "";
    const otherCompany = await request("/api/auth/companies", { companyEmail: "contacto@otraempresa.test", rif: "J-87654321-0", companyName: "Otra Empresa", employeeCount: 7 }, "POST", otherCookie);
    expect(otherCompany.status).toBe(201);
    expect((await request("/api/environment/runs?year=2026", undefined, undefined, otherCookie)).body).toEqual([]);
    expect((await request(`/api/environment/runs/${created.body.calculationId}/history`, undefined, undefined, otherCookie)).body).toEqual([]);
    expect((await request(`/api/environment/runs/${created.body.calculationId}`, undefined, "DELETE", otherCookie)).status).toBe(404);
    expect((await request("/api/environment/runs?year=2026", undefined, undefined, sessionCookie)).body.some((run: Record<string, any>) => run.calculationId === created.body.calculationId)).toBe(true);
    const loggedIn = await request("/api/auth/login", { email: "admin@otraempresa.test", password: "SeguraClaveOtraEmpresa123" }, "POST", "");
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body.company.id).toBe(otherCompany.body.company.id);
  });

  it("labels water balance differences and does not divide by a zero denominator", async () => {
    const water = await request("/api/environment/calculate", {
      ...electricityInput,
      category: "WATER",
      subcategory: "MUNICIPAL_SUPPLY",
      activityValue: 120,
      activityUnit: "m3",
      sourceReference: "TEST-WATER-0001",
      dischargedM3: 80,
      reusedM3: 20,
    });
    expect(water.status).toBe(201);
    expect(water.body.waterBalanceDifferenceM3).toBe(20);

    const zeroDenominator = await request("/api/environment/calculate", {
      ...electricityInput,
      category: "WATER",
      subcategory: "MUNICIPAL_SUPPLY",
      activityValue: 20,
      activityUnit: "m3",
      sourceReference: "TEST-WATER-0002",
      denominatorValue: 0,
    });
    expect(zeroDenominator.status).toBe(400);
    expect(zeroDenominator.body.errors[0]).toContain("denominador");
  });

  it("uses the documented conservative unknown-waste destination fallback", async () => {
    const { status, body } = await request("/api/environment/calculate", {
      ...electricityInput,
      category: "WASTE",
      subcategory: "",
      activityValue: 1000,
      activityUnit: "kg",
      sourceReference: "TEST-WASTE-0001",
    });
    expect(status).toBe(201);
    expect(body.factorUsed).toBe("LANDFILL_UNCONTROLLED");
    expect(body.fallbackApplied).toBe(true);
    expect(body.warnings.some((warning: string) => warning.includes("FBK-003"))).toBe(true);
  });

  it("does not produce a result when the DQ score is insufficient", async () => {
    const { status, body } = await request("/api/environment/calculate", {
      ...electricityInput,
      sourceReference: "TEST-DQ-LOW-0001",
      quality: { source: 0, measurement: 0, temporalRepresentativeness: 0, operationalRepresentativeness: 0, traceability: 0 },
    });
    expect(status).toBe(422);
    expect(body.errors[0]).toContain("QD-06");
  });

  it("does not extrapolate a grid factor beyond its validity window", async () => {
    const { status, body } = await request("/api/environment/calculate", { ...electricityInput, reportingPeriod: "2027-01", sourceReference: "TEST-GRID-OUTSIDE-PERIOD" });
    expect(status).toBe(400);
    expect(body.errors[0]).toContain("VD-010");
  });

  it("accepts historical electricity when the period-specific contractual factor and source are provided", async () => {
    const locationBased = await request("/api/environment/calculate", {
      ...electricityInput,
      reportingPeriod: "2019-06",
      sourceReference: "TEST-GRID-2019-0001",
    });
    expect(locationBased.status).toBe(400);
    expect(locationBased.body.errors[0]).toContain("VD-010");

    const { status, body } = await request("/api/environment/calculate", {
      ...electricityInput,
      subcategory: "MARKET_BASED",
      reportingPeriod: "2019-06",
      contractualFactor: 0.62,
      contractualFactorSource: "Contrato energético 2019",
      sourceReference: "TEST-MARKET-2019-0001",
    });
    expect(status).toBe(201);
    expect(body.co2eTotalTonnes).toBe(9.3);
    expect(body.reportingPeriod).toBe("2019-06");
    const historicalYear = await request("/api/environment/runs?year=2019");
    const historicalMonth = await request("/api/environment/runs?year=2019&month=06");
    expect(historicalYear.body).toHaveLength(1);
    expect(historicalMonth.body[0].reportingPeriod).toBe("2019-06");
  });

  it("converts fuel mass only using its documented density and applies combustion GWP", async () => {
    const { status, body } = await request("/api/environment/calculate", {
      ...electricityInput,
      category: "FUEL",
      subcategory: "DIESEL_GENERIC",
      activityValue: 100,
      activityUnit: "kg",
      sourceReference: "TEST-DIESEL-MASS-0001",
    });
    expect(status).toBe(201);
    expect(body.normalizedValue).toBe(100);
    expect(body.co2eTotalTonnes).toBeCloseTo((100 / 0.84 * (2.6878 + 0.23 * 27 / 1000 + 0.004 * 273 / 1000)) / 1000, 8);
    expect(body.snapshot.normalization.toUnit).toBe("kg");
  });

  it("aggregates hazardous-waste mass before applying THR-004", async () => {
    const { status, body } = await request("/api/environment/calculate", {
      ...electricityInput,
      category: "WASTE",
      subcategory: "DST-002",
      activityValue: 20000,
      activityUnit: "kg",
      sourceReference: "TEST-HAZARDOUS-WASTE-0001",
      wasteHazardous: true,
    });
    expect(status).toBe(201);
    expect(body.thresholdStatus).toBe("CRITICO");
    expect(body.warnings.some((warning: string) => warning.includes("residuos peligrosos"))).toBe(true);
  });
});
