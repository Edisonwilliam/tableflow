import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import {
  BottomText,
  Divider,
  ErrorBox,
  Field,
  GoogleSlot,
  GoogleStatus,
  Notice,
  PrimaryButton,
  linkCls,
  ring,
  serif,
} from "../components/AuthUI";

/* =========================================================
   ICONS
========================================================= */

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  width: "20",
  height: "20",
};

const CustomerIcon = (
  <svg {...iconProps}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
  </svg>
);

const RestaurantIcon = (
  <svg {...iconProps}>
    <path d="M3 21h18" />
    <path d="M5 21V8l7-5 7 5v13" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

/* =========================================================
   ROLE CARD
========================================================= */

const RoleCard = ({ active, onClick, title, description, icon }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition duration-300 active:scale-[0.99] ${ring} ${
      active
        ? "border-[#dfa274] bg-[#c88755]/10 shadow-[0_0_0_3px_rgba(200,135,85,0.12)]"
        : "border-[#f4eee5]/10 bg-white/[0.025] [@media(hover:hover)]:hover:border-[#dfa274]/45 [@media(hover:hover)]:hover:bg-white/[0.045]"
    }`}
  >
    <span
      aria-hidden="true"
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition duration-300 ${
        active ? "bg-[#c88755] text-[#171310]" : "bg-white/[0.06] text-[#dfa274]"
      }`}
    >
      {icon}
    </span>

    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-[#fffaf3]">{title}</span>
      <span className="mt-0.5 block text-xs leading-5 text-[#a79b8e]">{description}</span>
    </span>

    <span
      aria-hidden="true"
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition duration-300 ${
        active ? "border-[#c88755] bg-[#c88755] text-[#171310]" : "border-[#f4eee5]/20 text-transparent"
      }`}
    >
      ✓
    </span>
  </button>
);

const RoleGroup = ({ labelId, value, onChange }) => (
  <div role="group" aria-labelledby={labelId} className="grid gap-3">
    <RoleCard
      active={value === "customer"}
      onClick={() => onChange("customer")}
      title="Customer"
      description="Discover restaurants and reserve tables."
      icon={CustomerIcon}
    />

    <RoleCard
      active={value === "restaurant"}
      onClick={() => onChange("restaurant")}
      title="Restaurant"
      description="Manage your restaurant, menu and reservations."
      icon={RestaurantIcon}
    />
  </div>
);

/* =========================================================
   REGISTER
========================================================= */

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { register, prepareGoogleRegistration, completeGoogleRegistration } = useAuth();

  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "" });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [googleStep, setGoogleStep] = useState(false);
  const [googleRegistrationToken, setGoogleRegistrationToken] = useState("");
  const [googleProfile, setGoogleProfile] = useState(null);
  const [googleRole, setGoogleRole] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [googleAccountExists, setGoogleAccountExists] = useState(false);

  const notice = location.state?.message;

  /* ---------- handlers ---------- */

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setError("");
  };

  const handleRoleChange = (role) => {
    setFormData((previous) => ({ ...previous, role }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.role) {
      setError("Please select Customer or Restaurant.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const result = await register(formData.name, formData.email, formData.password, formData.role);

      navigate(result.user.role === "restaurant" ? "/dashboard" : "/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleError("");
    setGoogleAccountExists(false);
    setGoogleLoading(true);

    try {
      if (!credentialResponse.credential) {
        throw new Error("Google did not return a valid credential.");
      }

      const result = await prepareGoogleRegistration(credentialResponse.credential);

      setGoogleRegistrationToken(result.registrationToken);
      setGoogleProfile(result.profile);
      setGoogleRole("");
      setGoogleStep(true);
    } catch (err) {
      const data = err.response?.data;

      setGoogleError(data?.message || err.message || "Google registration failed. Please try again.");

      if (data?.code === "ACCOUNT_EXISTS") {
        setGoogleAccountExists(true);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleCompleteGoogleRegistration = async () => {
    if (!googleRole) {
      setGoogleError("Please select an account type to continue.");
      return;
    }

    if (!googleRegistrationToken) {
      setGoogleError("Your registration session is missing. Please start again.");
      return;
    }

    setGoogleError("");
    setGoogleLoading(true);

    try {
      const result = await completeGoogleRegistration(googleRegistrationToken, googleRole);

      navigate(result.user.role === "restaurant" ? "/dashboard" : "/", { replace: true });
    } catch (err) {
      const data = err.response?.data;

      setGoogleError(data?.message || "Unable to complete registration. Please try again.");

      if (data?.code === "ACCOUNT_EXISTS" || data?.code === "REGISTRATION_SESSION_EXPIRED") {
        setGoogleAccountExists(data?.code === "ACCOUNT_EXISTS");
        setGoogleStep(false);
        setGoogleRegistrationToken("");
        setGoogleProfile(null);
        setGoogleRole("");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const resetGoogleRegistration = () => {
    setGoogleStep(false);
    setGoogleRegistrationToken("");
    setGoogleProfile(null);
    setGoogleRole("");
    setGoogleError("");
    setGoogleAccountExists(false);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Your next great dining experience starts here."
      description="Join TableFlow to discover restaurants, reserve tables, and enjoy a better dining experience."
    >
      <div className="flex flex-col gap-5">
        {notice && !googleStep && <Notice>{notice}</Notice>}

        {!googleStep ? (
          <>
            {/* ============================================
                STEP 1 — Standard registration
            ============================================ */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <Field
                id="register-name"
                label="Full name"
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                maxLength={100}
                required
              />

              <Field
                id="register-email"
                label="Email address"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                inputMode="email"
                required
              />

              <Field
                id="register-password"
                label="Password"
                type="password"
                name="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={6}
                required
              />

              <div>
                <span id="register-role-label" className="mb-2 block text-xs font-semibold tracking-[0.02em] text-[#c8bdb0]">
                  How will you use TableFlow?
                </span>

                <RoleGroup labelId="register-role-label" value={formData.role} onChange={handleRoleChange} />
              </div>

              {error && (
                <ErrorBox>
                  <p>{error}</p>
                </ErrorBox>
              )}

              <PrimaryButton type="submit" loading={loading} loadingText="Creating account…">
                Create account
              </PrimaryButton>
            </form>

            <Divider />

            {/* ---------- GOOGLE ---------- */}
            <div className="flex flex-col gap-3">
              <GoogleSlot>
                {(width) => (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                      setGoogleError("Google verification failed. Please try again.");
                    }}
                    text="signup_with"
                    theme="filled_black"
                    shape="pill"
                    size="large"
                    width={String(width)}
                    useOneTap={false}
                  />
                )}
              </GoogleSlot>

              {googleLoading && <GoogleStatus>Verifying your Google account…</GoogleStatus>}

              {googleError && (
                <ErrorBox>
                  <p>{googleError}</p>

                  {googleAccountExists && (
                    <p className="mt-2.5">
                      <Link to="/login" className={`${linkCls} underline`}>
                        Go to Login →
                      </Link>
                    </p>
                  )}
                </ErrorBox>
              )}
            </div>
          </>
        ) : (
          /* ============================================
             STEP 2 — Google role selection
          ============================================ */
          <>
            {/* Profile card */}
            <div className="flex items-center gap-4 rounded-2xl border border-[#f4eee5]/10 bg-white/[0.03] p-4">
              {googleProfile?.picture ? (
                <img
                  src={googleProfile.picture}
                  alt={googleProfile?.name || "Google profile"}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[#dfa274]/30"
                />
              ) : (
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#c88755]/20 text-lg text-[#dfa274] ${serif}`}>
                  {googleProfile?.name?.[0]?.toUpperCase() || "G"}
                </div>
              )}

              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7fc7ae]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7fc7ae]" />
                  Verified with Google
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-[#fffaf3]">
                  {googleProfile?.name || "Your Google account"}
                </p>

                <p className="truncate text-xs text-[#a79b8e]">{googleProfile?.email}</p>
              </div>
            </div>

            {/* Step header */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#dfa274]">One last step</p>

              <h3 id="google-role-label" className={`mt-2 text-2xl font-medium leading-tight text-[#fffaf3] ${serif}`}>
                How will you use TableFlow?
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#a79b8e]">
                This helps us set up the right experience for you.
              </p>
            </div>

            <RoleGroup
              labelId="google-role-label"
              value={googleRole}
              onChange={(role) => {
                setGoogleRole(role);
                setGoogleError("");
              }}
            />

            {googleError && (
              <ErrorBox>
                <p>{googleError}</p>
              </ErrorBox>
            )}

            <PrimaryButton
              type="button"
              onClick={handleCompleteGoogleRegistration}
              disabled={!googleRole}
              loading={googleLoading}
              loadingText="Creating account…"
            >
              Create account
            </PrimaryButton>

            <button
              type="button"
              onClick={resetGoogleRegistration}
              disabled={googleLoading}
              className={`mx-auto h-11 rounded-full px-4 text-sm font-semibold text-[#c8bdb0] transition disabled:opacity-50 [@media(hover:hover)]:hover:text-[#fffaf3] ${ring}`}
            >
              ← Back to registration
            </button>
          </>
        )}

        <BottomText>
          Already have an account?{" "}
          <Link to="/login" className={linkCls}>
            Sign in
          </Link>
        </BottomText>
      </div>
    </AuthLayout>
  );
};

export default Register;