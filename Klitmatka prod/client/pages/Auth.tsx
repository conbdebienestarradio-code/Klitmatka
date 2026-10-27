import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { CompanyInvitation } from "@shared/auth";
import klimatkaLogo from "../lib/klimatka-logo.png";

type AuthMode = "register" | "login" | "invitation";

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const invitationToken = searchParams.get("token") ?? "";
  const returnTo = searchParams.get("returnTo") ?? "/";
  const [invitation, setInvitation] = useState<CompanyInvitation | null>(null);
  const [invitationError, setInvitationError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const title = mode === "login" ? "Inicia sesión" : mode === "invitation" ? "Únete a tu empresa" : "Crea tu perfil personal";

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me").then(async (response) => {
      if (!response.ok) return null;
      return await response.json() as { id: string };
    }).then(async (identity) => {
      if (!active) return;
      if (identity && mode === "invitation" && invitationToken) {
        const accepted = await fetch(`/api/auth/invitations/${encodeURIComponent(invitationToken)}/accept`, { method: "POST" });
        if (accepted.ok) navigate("/", { replace: true });
        else {
          const result = await accepted.json();
          setInvitationError(result.message ?? "No se pudo aceptar la invitación.");
        }
      } else if (identity && mode !== "invitation") navigate("/", { replace: true });
    }).finally(() => {
      if (active) setCheckingSession(false);
    });
    return () => { active = false; };
  }, [mode, navigate, invitationToken]);

  useEffect(() => {
    if (mode !== "invitation") return;
    if (!invitationToken) {
      setInvitationError("Falta el enlace de invitación.");
      return;
    }
    let active = true;
    fetch(`/api/auth/invitations/${encodeURIComponent(invitationToken)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? "La invitación no está disponible.");
        return data as CompanyInvitation;
      })
      .then((data) => {
        if (!active) return;
        setInvitation(data);
        setEmail(data.email);
      })
      .catch((cause) => {
        if (active) setInvitationError(cause instanceof Error ? cause.message : "La invitación no está disponible.");
      });
    return () => { active = false; };
  }, [mode, invitationToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode !== "login" && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login" ? { email, password } : { firstName, lastName, jobTitle, email, password };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "No fue posible completar el acceso.");
      if (mode === "invitation") {
        const accepted = await fetch(`/api/auth/invitations/${encodeURIComponent(invitationToken)}/accept`, { method: "POST" });
        const acceptance = await accepted.json();
        if (!accepted.ok) throw new Error(acceptance.message ?? "No se pudo aceptar la invitación.");
      }
      navigate(mode === "login" ? returnTo : "/", { replace: true });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible completar el acceso.";
      setError(message.includes("ya tiene una cuenta") || message.includes("ya tiene un perfil") ? "Este correo ya tiene un perfil. Inicia sesión para unirte a la empresa." : message);
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return <main className="auth-loading"><LoaderCircle className="spin" size={25} /><span>Preparando el acceso seguro…</span></main>;
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand"><img src={klimatkaLogo} alt="Klimatka, plataforma de inteligencia ambiental" /></div>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-subtitle">
          {mode === "login" ? "Continúa con tu perfil de Klimatka." : mode === "invitation" ? invitation ? `Invitación para ${invitation.companyName}` : invitationError : "Tu perfil personal puede administrar varias empresas."}
        </p>
        {mode === "invitation" && invitationError && <div className="auth-error" role="alert">{invitationError}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode !== "login" && (
            <div className="auth-section">
              <h2>Datos personales</h2>
              <div className="auth-field-row">
                <label className="auth-field"><span>Nombre</span><input autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required maxLength={100} /></label>
                <label className="auth-field"><span>Apellidos</span><input autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required maxLength={100} /></label>
              </div>
              <label className="auth-field"><span>Cargo profesional</span><input autoComplete="organization-title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} required maxLength={120} placeholder="Consultora ambiental" /></label>
            </div>
          )}
          <div className="auth-section">
            {mode === "register" && <h2>Acceso a Klimatka</h2>}
            <label className="auth-field"><span>Correo electrónico</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} readOnly={mode === "invitation"} placeholder="tu@correo.com" /></label>
            <label className="auth-field"><span>Contraseña</span><span className="auth-password"><input type={passwordVisible ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === "login" ? 1 : 12} maxLength={128} /><button type="button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}>{passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{mode !== "login" && <small>Mínimo 12 caracteres.</small>}</label>
            {mode !== "login" && <label className="auth-field"><span>Confirmar contraseña</span><span className="auth-password"><input type={confirmVisible ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12} maxLength={128} /><button type="button" onClick={() => setConfirmVisible((visible) => !visible)} aria-label={confirmVisible ? "Ocultar contraseña" : "Mostrar contraseña"}>{confirmVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>}
          </div>
          {mode === "register" && <p className="auth-helper">Al crear tu perfil, iniciarás sesión automáticamente. Luego registrarás tu primera empresa para acceder al panel.</p>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-submit" type="submit" disabled={submitting || (mode === "invitation" && !invitation)}>
            {submitting ? <LoaderCircle className="spin" size={17} /> : null}
            {submitting ? "Procesando…" : mode === "login" ? "Iniciar sesión" : mode === "invitation" ? "Crear perfil y unirme" : "Crear mi perfil"}
          </button>
        </form>
        {mode !== "invitation" && (
          <p className="auth-switch">
            {mode === "login" ? "¿Aún no tienes perfil? " : "¿Ya tienes un perfil? "}
            <Link to={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Crear mi perfil" : "Inicia sesión aquí"}</Link>
          </p>
        )}
        {mode === "login" && <p className="auth-recovery-link"><Link to="/recover">¿Olvidaste tu contraseña?</Link></p>}
        {mode === "invitation" && <p className="auth-switch">¿Ya tienes perfil? <Link to={`/login?returnTo=${encodeURIComponent(`/register/invitation?token=${invitationToken}`)}`}>Inicia sesión para aceptar la invitación</Link></p>}
      </section>
    </main>
  );
}
