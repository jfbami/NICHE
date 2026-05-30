import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ApiError, login, register } from "../lib/api";
import { AuthUser } from "../lib/authStorage";
import { toast } from "sonner";

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

type Mode = "login" | "register";

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const heading = mode === "login" ? "Welcome back" : "Create your account";
  const subheading =
    mode === "login"
      ? "Sign in to discover hidden spots near you"
      : "Join the community sharing the world's best-kept secrets";

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

  return (
    <div className="flex-1 flex flex-col px-6 py-8 overflow-y-auto">
      <div className="text-center mb-8 mt-6">
        <h1 className="text-5xl logo-font text-primary tracking-wide mb-3">neesh</h1>
        <h2 className="text-primary mb-1">{heading}</h2>
        <p className="text-sm text-muted-foreground">{subheading}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="h-12"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="h-12"
          />
        </div>

        <Button type="submit" className="w-full h-12 mt-2" disabled={submitting}>
          {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="text-center text-sm text-muted-foreground mt-6"
      >
        {mode === "login" ? (
          <>
            Don't have an account?{" "}
            <span className="text-primary font-semibold">Sign up</span>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <span className="text-primary font-semibold">Sign in</span>
          </>
        )}
      </button>
    </div>
  );
}
