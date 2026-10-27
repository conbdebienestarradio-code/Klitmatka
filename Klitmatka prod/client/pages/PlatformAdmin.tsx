import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Check, ClipboardList, LoaderCircle, Plus, Save, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { MeasurementModule, MeasurementModuleVersion } from "@shared/auth";

type ModuleForm = {
  code: string;
  name: string;
  description: string;
  unit: string;
  metricName: string;
  factorValue: string;
  factorUnit: string;
  sourceReference: string;
  status: MeasurementModuleVersion["status"];
  validFrom: string;
  active: boolean;
};

const emptyForm: ModuleForm = { code: "", name: "", description: "", unit: "", metricName: "", factorValue: "", factorUnit: "", sourceReference: "", status: "PENDIENTE_VALIDACION_OFICIAL", validFrom: new Date().toISOString().slice(0, 10), active: true };

export default function PlatformAdminPage() {
  const [modules, setModules] = useState<MeasurementModule[]>([]);
  const [form, setForm] = useState<ModuleForm>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [versions, setVersions] = useState<MeasurementModuleVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  async function loadModules() {
    const response = await fetch("/api/platform-admin/modules");
    if (response.status === 401 || response.status === 403) {
      setAuthorized(false);
      return;
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? "No se pudieron cargar los módulos.");
    setAuthorized(true);
    setModules(result as MeasurementModule[]);
  }

  useEffect(() => {
    loadModules().catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudieron cargar los módulos.")).finally(() => setLoading(false));
  }, []);

  function beginEdit(module: MeasurementModule) {
    setEditingId(module.id);
    setVersions([]);
    setMessage("");
    setError("");
    setForm({
      code: module.code,
      name: module.name,
      description: module.description,
      unit: module.unit,
      metricName: module.metricName,
      factorValue: module.currentVersion?.factorValue === null || module.currentVersion?.factorValue === undefined ? "" : String(module.currentVersion.factorValue),
      factorUnit: module.currentVersion?.factorUnit ?? "",
      sourceReference: module.currentVersion?.sourceReference ?? "",
      status: module.currentVersion?.status ?? "PENDIENTE_VALIDACION_OFICIAL",
      validFrom: module.currentVersion?.validFrom ?? new Date().toISOString().slice(0, 10),
      active: module.active,
    });
    fetch(`/api/platform-admin/modules/${encodeURIComponent(module.id)}/versions`).then((response) => response.json()).then((result) => setVersions(result as MeasurementModuleVersion[])).catch(() => setVersions([]));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const payload = { ...form, factorValue: form.factorValue === "" ? null : Number(form.factorValue) };
    try {
      const response = await fetch(editingId ? `/api/platform-admin/modules/${encodeURIComponent(editingId)}` : "/api/platform-admin/modules", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "No se pudo guardar el módulo.");
      setMessage(editingId ? "Se guardó una nueva versión del módulo." : "Módulo creado.");
      setForm(emptyForm);
      setEditingId("");
      setVersions([]);
      await loadModules();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el módulo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="auth-loading"><LoaderCircle className="spin" size={24} /><span>Cargando administración…</span></main>;
  if (authorized === false) return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span><ShieldCheck size={20} /></span><b>Klimatka</b></div><h1>Acceso restringido</h1><p className="auth-subtitle">Esta intranet requiere una cuenta de administración de Klimatka.</p><Link className="button-secondary platform-back" to="/">Volver al panel</Link></section></main>;

  return (
    <main className="auth-page platform-admin-page">
      <div className="platform-admin-shell">
        <header className="platform-admin-header">
          <div><Link className="platform-back-link" to="/"><ArrowLeft size={16} /> Panel de empresa</Link><span className="platform-admin-kicker"><ShieldCheck size={15} /> INTRANET DE KLIMATKA</span><h1>Módulos de medición</h1><p>Versiona unidades y factores con su fuente y vigencia. Las versiones anteriores se conservan.</p></div>
          <span className="platform-admin-count"><ClipboardList size={16} /> {modules.length} módulos</span>
        </header>
        <div className="platform-admin-grid">
          <section className="platform-module-list" aria-label="Módulos existentes">
            {modules.map((module) => (
              <article className="platform-module-card" key={module.id}>
                <div className="platform-module-head"><span className={`platform-module-dot ${module.active ? "active" : ""}`} /><div><b>{module.name}</b><small>{module.code} · {module.active ? "Activo" : "Inactivo"}</small></div><button type="button" className="button-secondary" onClick={() => beginEdit(module)}>Editar</button></div>
                <p>{module.description || "Sin descripción."}</p>
                <div className="platform-module-meta"><span>Unidad <b>{module.unit}</b></span><span>Indicador <b>{module.metricName}</b></span></div>
                {module.currentVersion && <div className="platform-module-version"><span>Versión {module.currentVersion.version}</span><span>{module.currentVersion.factorValue === null ? "Sin factor de GEI" : `${module.currentVersion.factorValue} ${module.currentVersion.factorUnit}`}</span><span>{module.currentVersion.status}</span></div>}
              </article>
            ))}
            {!modules.length && <div className="platform-empty">Aún no hay módulos adicionales.</div>}
          </section>
          <section className="platform-editor-card">
            <div className="platform-editor-heading"><span className="platform-editor-icon"><Plus size={17} /></span><div><h2>{editingId ? "Actualizar parámetros" : "Agregar módulo"}</h2><p>{editingId ? "Guardar genera una nueva versión metodológica." : "El módulo aparecerá en los formularios de actividad al activarse."}</p></div></div>
            <form className="auth-form platform-module-form" onSubmit={submit}>
              {!editingId && <label className="auth-field"><span>Código único</span><input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} required maxLength={40} pattern="[A-Z0-9_-]+" placeholder="TRANSPORTE" /></label>}
              <label className="auth-field"><span>Nombre del módulo</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required maxLength={120} /></label>
              <label className="auth-field"><span>Descripción</span><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={2} maxLength={500} /></label>
              <div className="auth-field-row"><label className="auth-field"><span>Unidad de actividad</span><input value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} required maxLength={40} placeholder="km" /></label><label className="auth-field"><span>Unidad del indicador</span><input value={form.metricName} onChange={(event) => setForm((current) => ({ ...current, metricName: event.target.value }))} required maxLength={80} placeholder="km recorridos" /></label></div>
              <div className="auth-field-row"><label className="auth-field"><span>Factor CO₂e por unidad (opcional)</span><input type="number" min="0" step="any" value={form.factorValue} onChange={(event) => setForm((current) => ({ ...current, factorValue: event.target.value }))} placeholder="Dejar vacío si no se cuantifica" /></label><label className="auth-field"><span>Unidad del factor</span><input value={form.factorUnit} onChange={(event) => setForm((current) => ({ ...current, factorUnit: event.target.value }))} maxLength={80} placeholder="kgCO₂e/km" /></label></div>
              <label className="auth-field"><span>Fuente documental</span><input value={form.sourceReference} onChange={(event) => setForm((current) => ({ ...current, sourceReference: event.target.value }))} maxLength={500} placeholder="Documento, norma o URL" /></label>
              <div className="auth-field-row"><label className="auth-field"><span>Estado metodológico</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ModuleForm["status"] }))}><option value="PENDIENTE_VALIDACION_OFICIAL">Pendiente de validación oficial</option><option value="VIGENTE">Vigente</option></select></label><label className="auth-field"><span>Vigente desde</span><input type="date" value={form.validFrom} onChange={(event) => setForm((current) => ({ ...current, validFrom: event.target.value }))} required /></label></div>
              {editingId && <label className="platform-active-toggle"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /> Módulo disponible en captura</label>}
              {error && <div className="auth-error" role="alert">{error}</div>}{message && <div className="platform-success" role="status"><Check size={15} />{message}</div>}
              <button className="auth-submit" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Save size={16} />}{saving ? "Guardando…" : editingId ? "Guardar nueva versión" : "Crear módulo"}</button>
              {editingId && <button type="button" className="button-secondary platform-cancel-edit" onClick={() => { setEditingId(""); setForm(emptyForm); setVersions([]); }}>Cancelar edición</button>}
            </form>
            {versions.length > 0 && <div className="platform-history"><h3>Historial de parámetros</h3>{versions.map((version) => <div key={version.id}><b>v{version.version}</b><span>{version.name} · {version.unit} · {version.metricName}</span><span>{version.factorValue === null ? "Sin factor" : `${version.factorValue} ${version.factorUnit}`}</span><small>{version.status} · Desde {version.validFrom} · {version.sourceReference || "Sin fuente"}</small></div>)}</div>}
          </section>
        </div>
      </div>
    </main>
  );
}
