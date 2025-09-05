// /auth/useForgotPassword.js
import { useCallback, useMemo, useState } from "react";
import { supabase } from "../supabaseClient"; // import client directly

export function useForgotPassword({ redirectTo }) {
  const [email, setEmail] = useState("");
  const [banner, setBanner] = useState({ type: "", msg: "" });
  const [isLoading, setIsLoading] = useState(false);

  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  const canSubmit = emailValid && !isLoading;

  const handleReset = useCallback(async () => {
    const e = email.trim();
    if (!e) {
      setBanner({ type: "error", msg: "Please enter your email." });
      return;
    }
    if (!emailValid) {
      setBanner({ type: "error", msg: "Please enter a valid email address." });
      return;
    }

    setBanner({ type: "", msg: "" });
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo,
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
