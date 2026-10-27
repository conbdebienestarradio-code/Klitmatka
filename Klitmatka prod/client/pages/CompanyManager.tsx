import { useState, type FormEvent } from "react";
import { Building2, ChevronRight, Leaf, LoaderCircle, Plus, Users } from "lucide-react";
import type { AuthIdentity } from "@shared/auth";

type CompanyForm = {
  companyName: string;
  rif: string;
  companyEmail: string;
  employeeCount: string;
};

export default function CompanyManager({ identity, onIdentityChange, onContinue }: { identity: AuthIdentity; onIdentityChange: (identity: AuthIdentity) => void; onContinue: () => void }) {
  const [form, setForm] = useState<CompanyForm>({ companyName: "", rif: "", companyEmail: "", employeeCount: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeCompanyId, setActiveCompanyId] = useState("");

  async function selectCompany(companyId: string) {
    setError("");
    setActiveCompanyId(companyId);
    try {
      const response = await fetch("/api/auth/companies/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "No se pudo seleccionar la empresa.");
      onIdentityChange(result as AuthIdentity);
      onContinue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo seleccionar la empresa.");
    } finally {
      setActiveCompanyId("");
    }
  }

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/auth/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, employeeCount: Number(form.employeeCount) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "No se pudo crear la empresa.");
      onIdentityChange(result as AuthIdentity);
      onContinue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la empresa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-page company-manager-page">
      <section className="auth-card company-manager-card" aria-labelledby="company-manager-title">
        <div className="auth-brand"><span><Leaf size={22} /></span><b>Klimatka</b></div>
        <h1 id="company-manager-title">Tus empresas</h1>
        <p className="auth-subtitle">Hola, {identity.firstName}. Administra tus espacios de análisis desde un solo perfil.</p>
        <div className="company-manager-profile">
          <span className="company-manager-avatar">{`${identity.firstName[0] ?? ""}${identity.lastName[0] ?? ""}`.toUpperCase()}</span>
          <span><b>{identity.firstName} {identity.lastName}</b><small>{identity.email} · {identity.jobTitle}</small></span>
        </div>
        {identity.companies.length > 0 && (
          <div className="company-manager-list">
            <h2>Espacios disponibles</h2>
            {identity.companies.map((company) => (
              <article className={`company-manager-item ${identity.company?.id === company.id ? "company-manager-current" : ""}`} key={company.id}>
                <span className="company-manager-icon"><Building2 size={18} /></span>
                <span className="company-manager-details"><b>{company.name}</b><small>RIF {company.rif} · {company.role === "admin" ? "Administradora" : "Miembro"}</small></span>
                <span className="company-manager-count"><Users size={14} /> {company.employeeCount}</span>
                <button type="button" className="company-manager-select" disabled={activeCompanyId !== ""} onClick={() => void selectCompany(company.id)} aria-label={`Abrir ${company.name}`}>
                  {activeCompanyId === company.id ? <LoaderCircle className="spin" size={16} /> : <ChevronRight size={17} />}
                </button>
              </article>
            ))}
          </div>
        )}
        <form className="auth-form company-manager-form" onSubmit={createCompany}>
          <div className="auth-section">
            <h2><Plus size={16} /> Crear empresa</h2>
            <label className="auth-field"><span>Nombre de la empresa</span><input autoComplete="organization" value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} required minLength={2} maxLength={160} placeholder="Mi Empresa S.A." /></label>
            <div className="auth-field-row">
              <label className="auth-field"><span>RIF</span><input value={form.rif} onChange={(event) => setForm((current) => ({ ...current, rif: event.target.value }))} required minLength={6} maxLength={30} placeholder="J-12345678-9" /></label>
              <label className="auth-field"><span>Número de empleados</span><input type="number" inputMode="numeric" min="1" max="10000000" step="1" value={form.employeeCount} onChange={(event) => setForm((current) => ({ ...current, employeeCount: event.target.value }))} required /></label>
            </div>
            <label className="auth-field"><span>Correo de la empresa</span><input type="email" autoComplete="organization" value={form.companyEmail} onChange={(event) => setForm((current) => ({ ...current, companyEmail: event.target.value }))} required maxLength={254} placeholder="contacto@empresa.com" /></label>
            <p className="auth-helper">El total declarado queda en el perfil. Las intensidades por empleado se calculan con la dotación registrada por sede y mes.</p>
          </div>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-submit" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : null}{saving ? "Guardando empresa…" : "Crear espacio empresarial"}</button>
        </form>
        <p className="auth-switch"><button type="button" className="company-manager-logout" onClick={() => { fetch("/api/auth/logout", { method: "POST" }).finally(() => window.location.assign("/login")); }}>Cerrar sesión</button></p>
      </section>
    </main>
  );
}
