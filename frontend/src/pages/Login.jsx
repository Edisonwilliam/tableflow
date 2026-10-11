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
} from "../components/AuthUI";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, googleLogin } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAccountNotFound, setGoogleAccountNotFound] = useState(false);

  const notice = location.state?.message;

  const redirectUser = (user) => {
    navigate(user.role === "restaurant" ? "/dashboard" : "/", { replace: true });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setGoogleAccountNotFound(false);
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
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
        throw new Error("Google did not return a valid credential.");
      }

      const result = await googleLogin(credentialResponse.credential);
      redirectUser(result.user);
    } catch (err) {
      const data = err.response?.data;

      setError(data?.message || err.message || "Google login failed. Please try again.");

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
      <div className="flex flex-col gap-5">
        {notice && <Notice>{notice}</Notice>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field
            id="login-email"
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
            id="login-password"
            label="Password"
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
            labelAction={
              <button
                type="button"
                onClick={() => setError("Password recovery is not available yet.")}
                className={`-my-1 h-8 px-1 text-xs ${linkCls}`}
              >
                Forgot password?
              </button>
            }
          />

          {error && (
            <ErrorBox>
              <p>{error}</p>

              {googleAccountNotFound && (
                <p className="mt-2.5">
                  <Link
                    to="/register"
                    state={{ message: "No TableFlow account was found. Please register to continue." }}
                    className={`${linkCls} underline`}
                  >
                    Create an account →
                  </Link>
                </p>
              )}
            </ErrorBox>
          )}

          <PrimaryButton type="submit" loading={loading} loadingText="Signing in…">
            Sign in
          </PrimaryButton>
        </form>

        <Divider />

        <div className="flex flex-col gap-3">
          <GoogleSlot>
            {(width) => (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  setError("Google verification failed. Please try again.");
                  setGoogleAccountNotFound(false);
                }}
                text="continue_with"
                theme="filled_black"
                shape="pill"
                size="large"
                width={String(width)}
                useOneTap={false}
              />
            )}
          </GoogleSlot>

          {googleLoading && <GoogleStatus>Signing in with Google…</GoogleStatus>}
        </div>

        <BottomText>
          Don't have an account?{" "}
          <Link to="/register" className={linkCls}>
            Create an account
          </Link>
        </BottomText>
      </div>
    </AuthLayout>
  );
};

export default Login;