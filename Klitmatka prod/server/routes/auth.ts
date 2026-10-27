import { Router } from "express";
import { z } from "zod";
import type { CompanyRegistration, UserRegistration } from "../../shared/auth";
import { acceptCompanyInvitation, createCompanyForUser, createCompanyInvitation, createPasswordReset, deleteSession, discardPasswordReset, getCompanyInvitation, loginUser, registerUser, resetUserPassword, setSessionCompany, switchActiveCompany } from "../environment-engine";
import { clearSessionCookie, readSessionToken, requireAdmin, requireAuthenticated, requireCompany, setSessionCookie } from "../auth-middleware";

const email = z.string().trim().email().max(254);
const password = z.string().min(12).max(128);
const personSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  jobTitle: z.string().trim().min(1).max(120),
  email,
  password,
});
const userRegistrationSchema = personSchema satisfies z.ZodType<UserRegistration>;
const companyRegistrationSchema = z.object({
  companyEmail: email,
  rif: z.string().trim().min(6).max(30),
  companyName: z.string().trim().min(2).max(160),
  employeeCount: z.number().int().positive().max(10_000_000),
}) satisfies z.ZodType<CompanyRegistration>;
const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
const passwordResetRequestSchema = z.object({ email });
const passwordResetSchema = z.object({ token: z.string().min(32).max(128), password });
const invitationSchema = z.object({ email });
const switchCompanySchema = z.object({ companyId: z.string().min(1) });

export const authRouter = Router();

authRouter.get("/me", requireAuthenticated, (req, res) => res.json(req.auth));

authRouter.post("/register", (req, res) => {
  const parsed = userRegistrationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Revisa los datos de tu perfil.", errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) });
    return;
  }
  try {
    const result = registerUser(parsed.data);
    setSessionCookie(res, result.sessionToken);
    res.status(201).json(result.identity);
  } catch (error) {
    const details = error as Error & { statusCode?: number };
    const message = details.message.includes("UNIQUE constraint failed") ? "Ese correo ya tiene una cuenta en Klimatka." : details.message;
    res.status(details.statusCode ?? 409).json({ message: message || "No se pudo crear la cuenta." });
  }
});

authRouter.post("/companies", requireAuthenticated, (req, res) => {
  const parsed = companyRegistrationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Revisa los datos de la empresa.", errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) });
    return;
  }
  try {
    const token = readSessionToken(req);
    if (!token) throw Object.assign(new Error("La sesión expiró."), { statusCode: 401 });
    res.status(201).json(createCompanyForUser(req.auth!.id, token, parsed.data));
  } catch (error) {
    const details = error as Error & { statusCode?: number };
    const message = details.message.includes("UNIQUE constraint failed") ? "Ya existe una empresa con ese RIF." : details.message;
    res.status(details.statusCode ?? 409).json({ message: message || "No se pudo crear la empresa." });
  }
});

authRouter.post("/companies/switch", requireAuthenticated, (req, res) => {
  const parsed = switchCompanySchema.safeParse(req.body);
  const token = readSessionToken(req);
  if (!parsed.success || !token) {
    res.status(400).json({ message: "Selecciona una empresa válida." });
    return;
  }
  try {
    res.json(switchActiveCompany(token, req.auth!.id, parsed.data.companyId));
  } catch (error) {
    const details = error as Error & { statusCode?: number };
    res.status(details.statusCode ?? 500).json({ message: details.message || "No se pudo cambiar de empresa." });
  }
});

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Ingresa un correo y una contraseña válidos." });
    return;
  }
  try {
    const result = loginUser(parsed.data.email, parsed.data.password);
    setSessionCookie(res, result.sessionToken);
    res.json(result.identity);
  } catch (error) {
    const details = error as Error & { statusCode?: number };
    res.status(details.statusCode ?? 500).json({ message: details.message || "No fue posible iniciar sesión." });
  }
});

authRouter.post("/password-reset/request", async (req, res) => {
  const parsed = passwordResetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Ingresa un correo electrónico válido." });
    return;
  }
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.RESEND_FROM_EMAIL;
  let resetUrl: URL;
  try {
    if (!apiKey || !sender || !process.env.KLIMATKA_APP_URL) throw new Error("Recovery email is not configured.");
    resetUrl = new URL("/reset-password", process.env.KLIMATKA_APP_URL);
  } catch {
    res.status(503).json({ message: "La recuperación por correo aún no está configurada. Contacta con administración." });
    return;
  }
  const reset = createPasswordReset(parsed.data.email);
  if (reset) {
    resetUrl.searchParams.set("token", reset.token);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: sender,
          to: [reset.email],
          subject: "Restablece tu contraseña de Klimatka",
          text: `Recibimos una solicitud para restablecer tu contraseña de Klimatka. Usa este enlace dentro de los próximos 30 minutos:\n\n${resetUrl}\n\nSi no solicitaste el cambio, puedes ignorar este mensaje.`,
        }),
      });
      if (!response.ok) throw new Error("Password reset email could not be sent.");
    } catch {
      discardPasswordReset(reset.token);
      console.error("Password recovery email delivery failed.");
    }
  }
  res.json({ message: "Si el correo corresponde a una cuenta, enviaremos un enlace para recuperar el acceso." });
});

authRouter.post("/password-reset/complete", (req, res) => {
  const parsed = passwordResetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "El enlace o la contraseña no son válidos. Usa una contraseña de al menos 12 caracteres." });
    return;
  }
  try {
    if (!resetUserPassword(parsed.data.token, parsed.data.password)) {
      res.status(400).json({ message: "El enlace expiró o ya fue utilizado. Solicita uno nuevo." });
      return;
    }
    res.json({ message: "Contraseña actualizada. Ya puedes iniciar sesión." });
  } catch {
    res.status(500).json({ message: "No se pudo actualizar la contraseña." });
  }
});

authRouter.post("/logout", requireAuthenticated, (req, res) => {
  const token = readSessionToken(req);
  if (token) deleteSession(token);
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/invitations/:token", (req, res) => {
  const invitation = getCompanyInvitation(req.params.token);
  if (!invitation) {
    res.status(404).json({ message: "La invitación no existe o expiró." });
    return;
  }
  res.json(invitation);
});

authRouter.post("/invitations/:token/accept", requireAuthenticated, (req, res) => {
  const sessionToken = readSessionToken(req);
  if (!sessionToken) {
    res.status(401).json({ message: "Inicia sesión para aceptar la invitación." });
    return;
  }
  try {
    const result = acceptCompanyInvitation(String(req.params.token), req.auth!.id, req.auth!.email);
    setSessionCompany(sessionToken, result.companyId);
    res.json(result.identity);
  } catch (error) {
    const details = error as Error & { statusCode?: number };
    res.status(details.statusCode ?? 500).json({ message: details.message || "No se pudo aceptar la invitación." });
  }
});

authRouter.post("/invitations", requireAuthenticated, requireCompany, requireAdmin, (req, res) => {
  const parsed = invitationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Ingresa un correo electrónico válido." });
    return;
  }
  try {
    const invitation = createCompanyInvitation(req.auth!.company!.id, req.auth!.id, parsed.data.email);
    res.status(201).json({ ...invitation, url: `/register/invitation?token=${encodeURIComponent(invitation.token)}` });
  } catch (error) {
    const details = error as Error & { statusCode?: number };
    res.status(details.statusCode ?? 500).json({ message: details.message || "No se pudo crear la invitación." });
  }
});
