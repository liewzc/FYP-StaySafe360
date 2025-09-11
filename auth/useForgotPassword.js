// /auth/useForgotPassword.js
import { useCallback, useMemo, useState } from "react";
import { supabase } from "../supabaseClient"; // import client directly

/**
 * useForgotPassword
 * - Manages email input + validation state
 * - Calls Supabase `resetPasswordForEmail`
 * - Exposes banner messages for UI feedback and a loading flag
 */
export function useForgotPassword({ redirectTo }) {
  // Local state
  const [email, setEmail] = useState("");
  const [banner, setBanner] = useState({ type: "", msg: "" });
  const [isLoading, setIsLoading] = useState(false);

  // Simple email format check
  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  // Submit only when email looks valid and not loading
  const canSubmit = emailValid && !isLoading;

  // Send reset email via Supabase
  const handleReset = useCallback(async () => {
    const e = email.trim();
    // Basic guards
    if (!e) {
      setBanner({ type: "error", msg: "Please enter your email." });
      return;
    }
    if (!emailValid) {
      setBanner({ type: "error", msg: "Please enter a valid email address." });
      return;
    }

    // Clear banner and start loading
    setBanner({ type: "", msg: "" });
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo,// where Supabase will redirect after the user sets a new password
      });
      if (error) {
        setBanner({
          type: "error",
          msg: error.message || "Failed to send reset email.",
        });
      } else {
        setBanner({
          type: "success",
          msg: "Reset email sent. Please check your inbox.",
        });
      }
    } catch (err) {
      console.error("Reset error:", err);
      setBanner({ type: "error", msg: "Unexpected error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }, [email, emailValid, redirectTo]);

  // Expose API to the screen; typing in email clears any previous banner
  return {
    email,
    setEmail: (t) => {
      setEmail(t);
      setBanner({ type: "", msg: "" });
    },
    banner,
    isLoading,
    emailValid,
    canSubmit,
    handleReset,
  };
}
