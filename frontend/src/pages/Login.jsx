import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, googleLogin } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAccountNotFound, setGoogleAccountNotFound] =
    useState(false);

  const notice = location.state?.message;

  const redirectUser = (user) => {
    navigate(
      user.role === "restaurant" ? "/dashboard" : "/",
      { replace: true }
    );
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setGoogleAccountNotFound(false);
    setLoading(true);

    try {
      const result = await login(
        formData.email,
        formData.password
      );

      redirectUser(result.user);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Google Login must never create an account.
  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setGoogleAccountNotFound(false);
    setGoogleLoading(true);

    try {
      if (!credentialResponse.credential) {
        throw new Error(
          "Google did not return a valid credential."
        );
      }

      const result = await googleLogin(
        credentialResponse.credential
      );

      redirectUser(result.user);
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.message ||
          err.message ||
          "Google login failed. Please try again."
      );

      if (data?.code === "ACCOUNT_NOT_FOUND") {
        setGoogleAccountNotFound(true);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Return to the table."
      description="Sign in to manage your reservations and continue your TableFlow experience."
    >
      <div className="tf-auth-form">
        {/* ---------- NOTICE ---------- */}
        {notice && (
          <div className="tf-auth-notice" role="status">
            <span aria-hidden="true">✦</span>
            <p>{notice}</p>
          </div>
        )}

        {/* ---------- FORM ---------- */}
        <form onSubmit={handleSubmit}>
          <div className="tf-field">
            <label className="tf-label" htmlFor="login-email">
              Email address
            </label>

            <input
              id="login-email"
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
            <div className="tf-password-row">
              <label
                className="tf-label"
                htmlFor="login-password"
              >
                Password
              </label>

              <button
                type="button"
                className="tf-link-button"
                onClick={() =>
                  setError(
                    "Password recovery is not available yet."
                  )
                }
              >
                Forgot password?
              </button>
            </div>

            <input
              id="login-password"
              className="tf-input"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="tf-error" role="alert">
              <p>{error}</p>

              {googleAccountNotFound && (
                <p style={{ marginTop: 10 }}>
                  <Link
                    to="/register"
                    state={{
                      message:
                        "No TableFlow account was found. Please register to continue.",
                    }}
                    style={{
                      color: "var(--tf-copper-light)",
                      fontWeight: 600,
                      textDecoration: "underline",
                      textUnderlineOffset: 4,
                    }}
                  >
                    Create an account →
                  </Link>
                </p>
              )}
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
                Signing in…
              </span>
            ) : (
              "Sign in"
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
                setError(
                  "Google verification failed. Please try again."
                );
                setGoogleAccountNotFound(false);
              }}
              text="continue_with"
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
              Signing in with Google…
            </p>
          )}
        </div>

        {/* ---------- FOOTER ---------- */}
        <p className="tf-bottom-text">
          Don't have an account?{" "}
          <Link to="/register">Create an account</Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Login;