import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ApiError, login, register } from "../lib/api";
import { AuthUser } from "../lib/authStorage";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

type Mode = "login" | "register";

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const user =
        mode === "login"
          ? await login(email, password)
          : await register(username, email, password);
      onAuthenticated(user);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setUsername("");
    setEmail("");
    setPassword("");
  };

  return (
    <div
      className="flex-1 flex flex-col justify-center px-6 py-10 overflow-y-auto"
      style={{ background: "var(--background)" }}
    >
      {/* Logo */}
      <div className="text-center mb-10">
        <h1 className="text-6xl logo-font text-primary tracking-wide mb-3">neesh</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to discover hidden spots"
            : "Join and share your secret spots"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              placeholder="explorer42"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="h-12 rounded-xl"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-xl pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              tabIndex={-1}
            >
              {showPassword
                ? <EyeOff className="size-4" />
                : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-xl text-white font-semibold mt-2 transition-opacity disabled:opacity-60"
          style={{ background: "#2C1A0E" }}
        >
          {submitting
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={switchMode}
        className="text-center text-sm text-muted-foreground mt-6"
      >
        {mode === "login" ? (
          <>
            Don't have an account?{" "}
            <span className="font-semibold" style={{ color: "#2C1A0E" }}>Sign up</span>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <span className="font-semibold" style={{ color: "#2C1A0E" }}>Sign in</span>
          </>
        )}
      </button>
    </div>
  );
}
