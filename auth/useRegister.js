// /auth/useRegister.js
import { useCallback, useMemo, useState } from "react";
import { supabase } from "../supabaseClient"; // adjust path if needed

export function useRegister() {
  // Local state
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Banner message for UI feedback: "", "error", or "success"
  const [banner, setBanner] = useState({ type: "", msg: "" }); // '', 'error', 'success'
  const [isLoading, setIsLoading] = useState(false);

  // Derived validation
  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  const strongEnough = useMemo(() => password.length >= 6, [password]);
  const canSubmit = emailValid && strongEnough && !isLoading;

  const handleRegister = useCallback(async () => {
    const e = email.trim();
    const u = (username || e.split("@")[0]).trim();
    const p = password;

    // Basic guards
    if (!e || !p) {
      setBanner({ type: "error", msg: "Please enter email and password." });
      return { ok: false };
    }
    if (!emailValid) {
      setBanner({ type: "error", msg: "Please enter a valid email address." });
      return { ok: false };
    }
    if (!strongEnough) {
      setBanner({
        type: "error",
        msg: "Password must be at least 6 characters.",
      });
      return { ok: false };
    }

    setBanner({ type: "", msg: "" });
    setIsLoading(true);

    try {
      // Note: Supabase will send a verification email if configured
      const { data, error } = await supabase.auth.signUp({
        email: e,
        password: p,
        options: {
          emailRedirectTo: "https://reset-password-page-one.vercel.app",
          data: { username: u }, // stored in user_metadata
        },
      });

      if (error) {
        setBanner({
          type: "error",
          msg: error.message || "Registration failed. Please try again.",
        });
        return { ok: false, error };
      }

      // Success (usually requires email verification)
      setBanner({
        type: "success",
        msg: "Registration successful. Please check your email to verify your account.",
      });
      return { ok: true, data };
    } catch (err) {
      console.error("Register error:", err);
      setBanner({ type: "error", msg: "Unexpected error. Please try again." });
      return { ok: false, error: err };
    } finally {
      setIsLoading(false);
    }
  }, [email, username, password, emailValid, strongEnough]);

  // Expose state, derived flags, setters (which also clear banner), and the submit action
  return {
    // state
    email,
    username,
    password,
    banner,
    isLoading,
    // derived
    emailValid,
    strongEnough,
    canSubmit,
    // setters
    setEmail: (t) => {
      setEmail(t);
      setBanner({ type: "", msg: "" });
    },
    setUsername: (t) => {
      setUsername(t);
      setBanner({ type: "", msg: "" });
    },
    setPassword: (t) => {
      setPassword(t);
      setBanner({ type: "", msg: "" });
    },
    // action
    handleRegister,
  };
}
