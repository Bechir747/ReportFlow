import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types";
import Button from "../components/Button";
import Input from "../components/Input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    const role = user.role;
    if (role === UserRole.ADMIN) navigate("/admin", { replace: true });
    else if (role === UserRole.DEPOSITOR) navigate("/depositor", { replace: true });
    else if (role === UserRole.APPROVER) navigate("/approver", { replace: true });
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-surface)",
      }}
    >
      <div
        style={{
          width: 400,
          padding: "var(--space-xl)",
          background: "var(--color-surface-container-lowest)",
          border: "1px solid var(--color-outline-variant)",
          borderRadius: "var(--rounded-md)",
        }}
      >
        <h1
          style={{
            font: "var(--font-headline)",
            color: "var(--color-primary)",
            margin: "0 0 var(--space-lg)",
          }}
        >
          ReportFlow
        </h1>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && (
            <p style={{ font: "var(--font-body-md)", color: "var(--color-error)", margin: 0 }}>{error}</p>
          )}
          <Button type="submit" loading={loading} style={{ width: "100%" }}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
