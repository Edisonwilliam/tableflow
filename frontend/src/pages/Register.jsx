import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

/* =========================================================
   ICONS
========================================================= */

const CustomerIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
  >
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
  </svg>
);

const RestaurantIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
  >
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
    className={`tf-auth-role-card ${
      active ? "tf-auth-role-card-active" : ""
    }`}
  >
    <span className="tf-auth-role-icon" aria-hidden="true">
      {icon}
    </span>

    <div className="tf-auth-role-content">
      <span className="tf-auth-role-title">{title}</span>
      <span className="tf-auth-role-description">
        {description}
      </span>
    </div>

    {active && (
      <span className="tf-auth-role-check" aria-hidden="true">
        ✓
      </span>
    )}
  </button>
);

/* =========================================================
   REGISTER
========================================================= */

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    prepareGoogleRegistration,
    completeGoogleRegistration,
  } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [googleStep, setGoogleStep] = useState(false);
  const [googleRegistrationToken, setGoogleRegistrationToken] =
    useState("");
  const [googleProfile, setGoogleProfile] = useState(null);
  const [googleRole, setGoogleRole] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [googleAccountExists, setGoogleAccountExists] =
    useState(false);

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
      const result = await register(
        formData.name,
        formData.email,
        formData.password,
        formData.role
      );

      navigate(
        result.user.role === "restaurant"
          ? "/dashboard"
          : "/",
        { replace: true }
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed. Please try again."
      );
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
        throw new Error(
          "Google did not return a valid credential."
        );
      }

      const result = await prepareGoogleRegistration(
        credentialResponse.credential
      );

      setGoogleRegistrationToken(result.registrationToken);
      setGoogleProfile(result.profile);
      setGoogleRole("");
      setGoogleStep(true);
    } catch (err) {
      const data = err.response?.data;

      setGoogleError(
        data?.message ||
          err.message ||
          "Google registration failed. Please try again."
      );

      if (data?.code === "ACCOUNT_EXISTS") {
        setGoogleAccountExists(true);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleCompleteGoogleRegistration = async () => {
    if (!googleRole) {
      setGoogleError(
        "Please select an account type to continue."
      );
      return;
    }

    if (!googleRegistrationToken) {
      setGoogleError(
        "Your registration session is missing. Please start again."
      );
      return;
    }

    setGoogleError("");
    setGoogleLoading(true);

    try {
      const result = await completeGoogleRegistration(
        googleRegistrationToken,
        googleRole
      );

      navigate(
        result.user.role === "restaurant"
          ? "/dashboard"
          : "/",
        { replace: true }
      );
    } catch (err) {
      const data = err.response?.data;

      setGoogleError(
        data?.message ||
          "Unable to complete registration. Please try again."
      );

      if (
        data?.code === "ACCOUNT_EXISTS" ||
        data?.code === "REGISTRATION_SESSION_EXPIRED"
      ) {
        setGoogleAccountExists(
          data?.code === "ACCOUNT_EXISTS"
        );
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
      <div className="tf-auth-form">
        {/* ---------- NOTICE ---------- */}
        {notice && !googleStep && (
          <div className="tf-auth-notice" role="status">
            <span aria-hidden="true">✦</span>
            <p>{notice}</p>
          </div>
        )}

        {!googleStep ? (
          <>
            {/* ============================================
                STEP 1 — Standard registration
            ============================================ */}
            <form onSubmit={handleSubmit}>
              <div className="tf-field">
                <label
                  className="tf-label"
                  htmlFor="register-name"
                >
                  Full name
                </label>

                <input
                  id="register-name"
                  className="tf-input"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </div>

              <div className="tf-field">
                <label
                  className="tf-label"
                  htmlFor="register-email"
                >
                  Email address
                </label>

                <input
                  id="register-email"
                  className="tf-input"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="tf-field">
                <label
                  className="tf-label"
                  htmlFor="register-password"
                >
                  Password
                </label>

                <input
                  id="register-password"
                  className="tf-input"
                  type="password"
                  name="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>

              <div className="tf-field">
                <span className="tf-label">
                  How will you use TableFlow?
                </span>

                <div className="tf-auth-role-grid">
                  <RoleCard
                    active={formData.role === "customer"}
                    onClick={() =>
                      handleRoleChange("customer")
                    }
                    title="Customer"
                    description="Discover restaurants and reserve tables."
                    icon={CustomerIcon}
                  />

                  <RoleCard
                    active={formData.role === "restaurant"}
                    onClick={() =>
                      handleRoleChange("restaurant")
                    }
                    title="Restaurant"
                    description="Manage your restaurant, menu and reservations."
                    icon={RestaurantIcon}
                  />
                </div>
              </div>

              {error && (
                <div className="tf-error" role="alert">
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="tf-primary-button"
                disabled={loading}
              >
                {loading ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      justifyContent: "center",
                    }}
                  >
                    <span className="tf-spinner" />
                    Creating account…
                  </span>
                ) : (
                  "Create account"
                )}
              </button>
            </form>

            {/* ---------- DIVIDER ---------- */}
            <div className="tf-divider">
              <span>or continue with</span>
            </div>

            {/* ---------- GOOGLE ---------- */}
            <div className="tf-google-wrap">
              <div className="tf-google-shell">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    setGoogleError(
                      "Google verification failed. Please try again."
                    );
                  }}
                  text="signup_with"
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  width="316"
                  useOneTap={false}
                />
              </div>

              {googleLoading && (
                <p className="tf-google-status" role="status">
                  <span className="tf-spinner tf-spinner--accent" />
                  Verifying your Google account…
                </p>
              )}

              {googleError && (
                <div className="tf-error" role="alert">
                  <p>{googleError}</p>

                  {googleAccountExists && (
                    <p style={{ marginTop: 10 }}>
                      <Link
                        to="/login"
                        style={{
                          color: "var(--tf-copper-light)",
                          fontWeight: 600,
                          textDecoration: "underline",
                          textUnderlineOffset: 4,
                        }}
                      >
                        Go to Login →
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ============================================
             STEP 2 — Google role selection
          ============================================ */
          <>
            {/* Profile card */}
            <div className="tf-auth-profile">
              {googleProfile?.picture ? (
                <img
                  src={googleProfile.picture}
                  alt={
                    googleProfile?.name ||
                    "Google profile"
                  }
                  className="tf-auth-profile-avatar"
                />
              ) : (
                <div className="tf-auth-profile-avatar-fallback">
                  {googleProfile?.name?.[0]?.toUpperCase() ||
                    "G"}
                </div>
              )}

              <div className="tf-auth-profile-info">
                <div className="tf-auth-profile-badges">
                  <span>Verified</span>
                  <span className="tf-auth-profile-dot" />
                  <span>Google</span>
                </div>

                <p className="tf-auth-profile-name">
                  {googleProfile?.name ||
                    "Your Google account"}
                </p>

                <p className="tf-auth-profile-email">
                  {googleProfile?.email}
                </p>
              </div>
            </div>

            {/* Step header */}
            <div>
              <p className="tf-auth-step-eyebrow">
                One last step
              </p>

              <h3 className="tf-auth-step-title">
                How will you use TableFlow?
              </h3>

              <p className="tf-auth-step-description">
                This helps us set up the right
                experience for you.
              </p>
            </div>

            {/* Role selection */}
            <div className="tf-auth-role-grid">
              <RoleCard
                active={googleRole === "customer"}
                onClick={() => {
                  setGoogleRole("customer");
                  setGoogleError("");
                }}
                title="Customer"
                description="Discover restaurants and reserve tables."
                icon={CustomerIcon}
              />

              <RoleCard
                active={googleRole === "restaurant"}
                onClick={() => {
                  setGoogleRole("restaurant");
                  setGoogleError("");
                }}
                title="Restaurant"
                description="Manage your restaurant, menu and reservations."
                icon={RestaurantIcon}
              />
            </div>

            {googleError && (
              <div className="tf-error" role="alert">
                <p>{googleError}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleCompleteGoogleRegistration}
              disabled={!googleRole || googleLoading}
              className="tf-primary-button"
            >
              {googleLoading ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    justifyContent: "center",
                  }}
                >
                  <span className="tf-spinner" />
                  Creating account…
                </span>
              ) : (
                "Create account"
              )}
            </button>

            <button
              type="button"
              onClick={resetGoogleRegistration}
              disabled={googleLoading}
              className="tf-auth-back-link"
            >
              ← Back to registration
            </button>
          </>
        )}

        {/* ---------- FOOTER ---------- */}
        <p className="tf-bottom-text">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Register;