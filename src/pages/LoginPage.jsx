import { useState } from "react";
import {
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/useAuth";

const LoginPage = () => {
  const { signInWithPassword, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState("signin"); // "signin" | "signup"

  // Sign In fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up fields
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignInSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      await signInWithPassword(email, password);
    } catch (loginError) {
      const msg = loginError?.message || "Unable to sign in. Please verify your credentials.";
      if (msg.toLowerCase().includes("email not confirmed")) {
        setError("Your email has not been confirmed yet. Please check your inbox for the confirmation link, or disable 'Confirm email' in Supabase Authentication settings.");
      } else if (msg.toLowerCase().includes("invalid login credentials")) {
        setError("Invalid email or password. Please verify your credentials or register a new member account.");
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMsg("");

    if (signUpPassword !== signUpConfirmPassword) {
      setError("Passwords do not match. Please verify your password.");
      return;
    }

    if (signUpPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signUp({
        email: signUpEmail,
        password: signUpPassword,
        fullName: signUpName,
        phone: signUpPhone,
      });

      if (result?.data?.session) {
        setSuccessMsg("Account created and verified! Redirecting to your dashboard...");
      } else {
        setSuccessMsg(
          "Registration submitted to Supabase! You can now sign in with your email and password."
        );
        setEmail(signUpEmail);
        setPassword(signUpPassword);
        setTimeout(() => setActiveTab("signin"), 2000);
      }
    } catch (signupError) {
      const msg = signupError?.message || "Failed to create account.";
      if (msg.includes("rate limit")) {
        setError(
          "Supabase default email rate limit reached. In your Supabase Dashboard → Authentication → Providers → Email, turn OFF 'Confirm email' to allow immediate user registration."
        );
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-panel">
        <aside className="login-branding">
          <div className="brand-mark">
            <LockKeyhole size={26} />
          </div>
          <div>
            <p className="eyebrow">LedgerOne</p>
            <h1>{activeTab === "signin" ? "Secure Portal" : "Join LedgerOne"}</h1>
          </div>
          <div className="brand-copy">
            <span>
              {activeTab === "signin"
                ? "Enterprise chit fund administration and member financial ledger."
                : "Register a personal member account to track investments, installments, and live auctions."}
            </span>
          </div>

          <div
            style={{
              marginTop: "auto",
              paddingTop: "24px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: "#93c5fd",
            }}
          >
            <span>● Connected to Supabase Production Database</span>
          </div>
        </aside>

        <section className="login-form-panel">
          {/* Header */}
          <div className="login-header" style={{ marginBottom: "18px" }}>
            <p className="eyebrow subtle">
              {activeTab === "signin" ? "LedgerOne Portal" : "Member Enrollment"}
            </p>
            <h2>{activeTab === "signin" ? "Sign In" : "Create Account"}</h2>

            {/* TAB SELECTOR */}
            <div
              style={{
                display: "flex",
                gap: "4px",
                background: "#f1f5f9",
                padding: "4px",
                borderRadius: "12px",
                marginTop: "16px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signin");
                  setError("");
                  setSuccessMsg("");
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  background: activeTab === "signin" ? "#ffffff" : "transparent",
                  color: activeTab === "signin" ? "#0f172a" : "#64748b",
                  boxShadow: activeTab === "signin" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signup");
                  setError("");
                  setSuccessMsg("");
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  background: activeTab === "signup" ? "#ffffff" : "transparent",
                  color: activeTab === "signup" ? "#0f172a" : "#64748b",
                  boxShadow: activeTab === "signup" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                Register as Member
              </button>
            </div>
          </div>

          {/* SIGN IN FORM */}
          {activeTab === "signin" ? (
            <form onSubmit={handleSignInSubmit} className="login-form">
              <label className="field-group">
                <span>Email address</span>
                <div className="input-wrap">
                  <Mail size={17} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label className="field-group">
                <span>Password</span>
                <div className="input-wrap">
                  <LockKeyhole size={17} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="visibility-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="login-error" style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <p style={{ margin: 0 }}>{error}</p>
                </div>
              )}

              {successMsg && (
                <div
                  style={{
                    background: "#ecfdf5",
                    color: "#065f46",
                    border: "1px solid #a7f3d0",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <CheckCircle2 size={16} color="#059669" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button className="primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Login"}
              </button>

              <div style={{ textAlign: "center", marginTop: "12px", fontSize: "13px", color: "#64748b" }}>
                <span>Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signup");
                    setError("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#1d4ed8",
                    fontWeight: "600",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Register here
                </button>
              </div>
            </form>
          ) : (
            /* MEMBER SIGN UP FORM */
            <form onSubmit={handleSignUpSubmit} className="login-form">
              <label className="field-group">
                <span>Full Name</span>
                <div className="input-wrap">
                  <User size={17} />
                  <input
                    type="text"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    required
                  />
                </div>
              </label>

              <label className="field-group">
                <span>Email address</span>
                <div className="input-wrap">
                  <Mail size={17} />
                  <input
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label className="field-group">
                <span>Phone number</span>
                <div className="input-wrap">
                  <Phone size={17} />
                  <input
                    type="tel"
                    value={signUpPhone}
                    onChange={(e) => setSignUpPhone(e.target.value)}
                    placeholder="+91 98450 12345"
                  />
                </div>
              </label>

              <label className="field-group">
                <span>Password</span>
                <div className="input-wrap">
                  <LockKeyhole size={17} />
                  <input
                    type={showSignUpPassword ? "text" : "password"}
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="visibility-toggle"
                    onClick={() => setShowSignUpPassword((v) => !v)}
                    aria-label="Toggle password visibility"
                  >
                    {showSignUpPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <label className="field-group">
                <span>Confirm Password</span>
                <div className="input-wrap">
                  <LockKeyhole size={17} />
                  <input
                    type={showSignUpPassword ? "text" : "password"}
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </label>

              {error && (
                <div className="login-error" style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <p style={{ margin: 0 }}>{error}</p>
                </div>
              )}

              {successMsg && (
                <div
                  style={{
                    background: "#ecfdf5",
                    color: "#065f46",
                    border: "1px solid #a7f3d0",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <CheckCircle2 size={18} color="#059669" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button className="primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating Account..." : "Register as Member"}
              </button>

              <div style={{ textAlign: "center", marginTop: "12px", fontSize: "13px", color: "#64748b" }}>
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signin");
                    setError("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#1d4ed8",
                    fontWeight: "600",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
