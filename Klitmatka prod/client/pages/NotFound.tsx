import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">404</span>
      <h1 className="font-display text-4xl text-foreground">Esta ruta aún no existe.</h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">Vuelve al panel de inteligencia ambiental para continuar con tu línea base.</p>
      <Link to="/" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
        Volver al resumen
      </Link>
    </main>
  );
};

export default NotFound;
