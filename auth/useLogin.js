// /auth/useLogin.js
import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import { supabase } from "../supabaseClient"; // adjust if your client lives elsewhere

// useLogin
export function useLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Basic email format check
  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  // Enable submit only when the form looks valid and we're not already submitting
  const canSubmit = emailValid && password.length >= 6 && !isLoading;

  // Attempts to sign in via Supabase
  const handleLogin = useCallback(async () => {
    const e = email.trim();
    const p = password;

    // Guard: both fields required
    if (!e || !p) {
      setLoginError("Please enter both email and password.");
      return;
    }
    // Guard: email format
    if (!emailValid) {
      setLoginError("Please enter a valid email address.");
      return;
    }

    setLoginError("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: e,
        password: p,
      });

      if (error) {
        // Normalize a common Supabase error into a clearer message
        if (error.message?.includes("Invalid login credentials")) {
          setLoginError("Wrong email or password. Please try again.");
        } else {
          setLoginError(error.message || "Login failed. Please try again.");
        }
        return;
      }

      const { user } = data || {};
      if (!user?.email_confirmed_at) {
        Alert.alert(
          "Email not verified",
          "Please verify your email before logging in."
        );
        await supabase.auth.signOut();
        return;
      }

      // success path: navigator will swap stacks via onAuthStateChange in App.js
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [email, password, emailValid]);

  return {
    // state
    email,
    password,
    loginError,
    isLoading,
    // derived
    emailValid,
    canSubmit,
    // actions
    setEmail: (t) => {
      setEmail(t);
      setLoginError("");
    },
    setPassword: (t) => {
      setPassword(t);
      setLoginError("");
    },
    setLoginError,
    handleLogin,
  };
}
