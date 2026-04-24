import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const signupDefaults = {
  fullName: "",
  location: "",
  email: "",
  password: "",
  role: "customer"
};

const signinDefaults = {
  email: "",
  password: ""
};

const resetDefaults = {
  email: "",
  code: "",
  password: "",
  confirmPassword: "",
  token: "",
  stage: "idle"
};

export function AuthPage() {
  function isLandlordRole(role) {
    return role === "landlord" || role === "admin";
  }

  const { login, register, forgotPassword, verifyResetCode, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [signin, setSignin] = useState(signinDefaults);
  const [signup, setSignup] = useState(signupDefaults);
  const [resetFlow, setResetFlow] = useState(resetDefaults);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function resetResetFlow(nextEmail = "") {
    setResetFlow({ ...resetDefaults, email: nextEmail });
  }

  function onCancelSignup() {
    setError("");
    setMessage("");
    navigate("/");
  }

  async function onSignin(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const user = await login(signin);
      navigate(isLandlordRole(user.role) ? "/landlord/dashboard" : "/tenant/welcome", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function onSignup(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (signup.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const user = await register(signup);
      navigate(isLandlordRole(user.role) ? "/landlord/dashboard" : "/tenant/welcome", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    const email = String(signin.email || "").trim();
    if (!email) {
      setError("Enter your email first to request a reset.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result = await forgotPassword(email);
      setMessage(result.message || "Verification code sent.");
      setResetFlow({ ...resetDefaults, email, stage: "verify" });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyResetCode(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!resetFlow.code.trim()) {
      setError("Enter the verification code from your email.");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyResetCode(resetFlow.email, resetFlow.code.trim());
      setResetFlow((previous) => ({
        ...previous,
        stage: "new-password",
        token: result.resetToken,
        code: ""
      }));
      setMessage(result.message || "Code verified. Create your new password.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function onCreateNewPassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (resetFlow.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (resetFlow.password !== resetFlow.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(resetFlow.token, resetFlow.password);
      setMessage(result.message || "Password reset successful. You can now sign in.");
      resetResetFlow(signin.email);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function cancelResetFlow() {
    setError("");
    setMessage("");
    resetResetFlow(signin.email);
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>Crenit Access</h1>
        <p className="subtitle">One app for tenants and landlords with secure role-based access.</p>

        <div className="mode-switch">
          <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign In</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign Up</button>
        </div>

        {mode === "signin" && (
          <form onSubmit={onSignin} className="form-grid">
            <label>
              Email
              <input
                type="email"
                value={signin.email}
                onChange={(event) => setSignin((previous) => ({ ...previous, email: event.target.value }))}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={signin.password}
                onChange={(event) => setSignin((previous) => ({ ...previous, password: event.target.value }))}
                required
              />
            </label>
            <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
            <button type="button" className="ghost" onClick={onForgotPassword} disabled={loading}>
              {loading && resetFlow.stage !== "idle" ? "Please wait..." : "Forgot Password"}
            </button>
          </form>
        )}

        {mode === "signin" && resetFlow.stage === "verify" && (
          <form onSubmit={onVerifyResetCode} className="form-grid auth-reset-panel">
            <h2>Verify Reset Code</h2>
            <p>Enter the 6-digit code sent to <strong>{resetFlow.email}</strong>.</p>
            <label>
              Verification Code
              <input
                inputMode="numeric"
                maxLength={6}
                value={resetFlow.code}
                onChange={(event) =>
                  setResetFlow((previous) => ({
                    ...previous,
                    code: event.target.value.replace(/\D/g, "").slice(0, 6)
                  }))
                }
                required
              />
            </label>
            <button type="submit" disabled={loading}>{loading ? "Verifying..." : "Verify Code"}</button>
            <button type="button" className="ghost" onClick={cancelResetFlow}>Cancel</button>
          </form>
        )}

        {mode === "signin" && resetFlow.stage === "new-password" && (
          <form onSubmit={onCreateNewPassword} className="form-grid auth-reset-panel">
            <h2>Create New Password</h2>
            <label>
              New Password
              <input
                type="password"
                minLength={6}
                value={resetFlow.password}
                onChange={(event) => setResetFlow((previous) => ({ ...previous, password: event.target.value }))}
                required
              />
            </label>
            <label>
              Confirm New Password
              <input
                type="password"
                minLength={6}
                value={resetFlow.confirmPassword}
                onChange={(event) =>
                  setResetFlow((previous) => ({ ...previous, confirmPassword: event.target.value }))
                }
                required
              />
            </label>
            <button type="submit" disabled={loading}>{loading ? "Saving..." : "Save New Password"}</button>
            <button type="button" className="ghost" onClick={cancelResetFlow}>Cancel</button>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={onSignup} className="form-grid">
            <label>
              Full Name
              <input
                value={signup.fullName}
                onChange={(event) => setSignup((previous) => ({ ...previous, fullName: event.target.value }))}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={signup.email}
                onChange={(event) => setSignup((previous) => ({ ...previous, email: event.target.value }))}
                required
              />
            </label>
            <label>
              Location
              <input
                value={signup.location}
                onChange={(event) => setSignup((previous) => ({ ...previous, location: event.target.value }))}
                placeholder="City, State"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                minLength={6}
                value={signup.password}
                onChange={(event) => setSignup((previous) => ({ ...previous, password: event.target.value }))}
                required
              />
            </label>
            <label>
              Role
              <select
                value={signup.role}
                onChange={(event) => setSignup((previous) => ({ ...previous, role: event.target.value }))}
              >
                <option value="customer">Tenant</option>
                <option value="landlord">Landlord</option>
              </select>
            </label>
            <button type="submit" disabled={loading}>{loading ? "Creating account..." : "Create Account"}</button>
            <button type="button" className="ghost" onClick={onCancelSignup}>Cancel</button>
          </form>
        )}

        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="ok-text">{message}</p> : null}
      </section>
    </div>
  );
}
