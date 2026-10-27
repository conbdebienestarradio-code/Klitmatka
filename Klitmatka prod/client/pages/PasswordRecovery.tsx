import { type FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import klimatkaLogo from "../lib/klimatka-logo.png";

type RecoveryMode = "request" | "reset";

export default function PasswordRecovery({ mode }: { mode: RecoveryMode }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (mode === "reset" && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/password-reset/${mode === "request" ? "request" : "complete"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "request" ? { email } : { token, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "No fue posible completar la solicitud.");
      setMessage(result.message ?? "Solicitud completada.");
      setComplete(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible completar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  const invalidToken = mode === "reset" && !token;

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="recovery-title">
        <div className="auth-brand"><img src={klimatkaLogo} alt="Klimatka, plataforma de inteligencia ambiental" /></div>
        <h1 id="recovery-title">{mode === "request" ? "Recupera tu acceso" : "Crea una contraseña nueva"}</h1>
        <p className="auth-subtitle">
          {mode === "request" ? "Te enviaremos un enlace seguro a tu correo electrónico." : "Elige una contraseña de al menos 12 caracteres."}
        </p>
        {invalidToken ? (
          <div className="auth-error" role="alert">El enlace no es válido. Solicita uno nuevo para recuperar el acceso.</div>
        ) : complete ? (
          <div className="auth-success" role="status">{message}</div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "request" ? (
              <label className="auth-field"><span>Correo electrónico</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} placeholder="tu@correo.com" /></label>
            ) : (
              <>
                <label className="auth-field"><span>Nueva contraseña</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} maxLength={128} /></label>
                <label className="auth-field"><span>Confirmar contraseña</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12} maxLength={128} /></label>
              </>
            )}
            {error && <div className="auth-error" role="alert">{error}</div>}
            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" size={17} /> : null}
              {submitting ? "Procesando…" : mode === "request" ? "Enviar enlace" : "Actualizar contraseña"}
            </button>
          </form>
        )}
        {complete && mode === "request" && <p className="auth-recovery-note">Si no recibes el mensaje, revisa la carpeta de correo no deseado.</p>}
        <p className="auth-switch"><Link to="/login">Volver a iniciar sesión</Link></p>
      </section>
    </main>
  );
}
