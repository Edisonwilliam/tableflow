import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const serif = "font-['Playfair_Display',serif]";

/* ---------- loading screen ---------- */

const RouteLoading = () => {
  // Hold back for a beat so fast auth checks don't flash the loader.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-[#0d0a08] px-6"
    >
      {/* ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_50%_45%,rgba(200,135,85,0.16),transparent_70%)]"
      />

      <div
        className={`relative flex flex-col items-center transition-all duration-700 ease-out ${
          visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        {/* plate */}
        <div className="relative grid h-28 w-28 place-items-center">
          {/* soft pulse behind the plate */}
          <span
            aria-hidden="true"
            className="absolute inset-3 rounded-full bg-[#c88755]/20 blur-xl motion-safe:animate-pulse"
          />

          {/* slow dashed orbit */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-dashed border-[#dfa274]/30 motion-safe:animate-[spin_14s_linear_infinite_reverse]"
          />

          {/* spinning copper arc */}
          <span
            aria-hidden="true"
            className="absolute inset-3 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_90deg,#c88755_250deg,#dfa274_340deg,transparent_360deg)] motion-safe:animate-[spin_1.6s_cubic-bezier(0.5,0.1,0.5,0.9)_infinite]"
          />

          {/* inner plate + monogram */}
          <span
            aria-hidden="true"
            className="absolute inset-[14px] grid place-items-center rounded-full border border-[#f4eee5]/10 bg-[#0d0a08] shadow-[inset_0_0_24px_rgba(200,135,85,0.12)]"
          >
            <span className={`text-4xl font-medium italic leading-none text-[#dfa274] ${serif}`}>T</span>
          </span>
        </div>

        {/* label */}
        <p className={`mt-8 text-2xl font-medium tracking-[-0.02em] text-[#fffaf3] ${serif}`}>
          TableFlow
        </p>

        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#a79b8e]">
          Setting your table
          <span aria-hidden="true" className="flex items-end gap-[3px] pb-[3px]">
            <i className="h-1 w-1 rounded-full bg-[#dfa274] motion-safe:animate-bounce" />
            <i className="h-1 w-1 rounded-full bg-[#dfa274] motion-safe:animate-bounce [animation-delay:150ms]" />
            <i className="h-1 w-1 rounded-full bg-[#dfa274] motion-safe:animate-bounce [animation-delay:300ms]" />
          </span>
        </p>

        <span className="sr-only">Loading TableFlow</span>
      </div>
    </div>
  );
};

/* ---------- route guard ---------- */

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();

  // Wait until authentication state has been checked
  if (loading) {
    return <RouteLoading />;
  }

  // User is not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // User is logged in but doesn't have permission
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Restaurant owners go to their dashboard
    if (user?.role === "restaurant") {
      return <Navigate to="/dashboard" replace />;
    }

    // Customers go back to the home page
    if (user?.role === "customer") {
      return <Navigate to="/" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;