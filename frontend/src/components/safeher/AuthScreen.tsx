import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, ShieldAlert, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { PublicHeader } from "./PublicHeader";

type AuthMode = "login" | "register";

type AuthScreenProps = {
  mode: AuthMode;
};

const initialForm = {
  username: "",
  password: "",
  email: "",
  passwordConfirm: "",
  firstName: "",
  lastName: "",
  phone: "",
  emergencyContactName: "",
  emergencyContactEmail: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "other",
};

export function AuthScreen({ mode }: AuthScreenProps) {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, ready } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  useEffect(() => {
    if (ready && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, ready, navigate]);

  const updateField = (field: keyof typeof initialForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isRegister) {
        await register({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          password_confirm: form.passwordConfirm,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          phone: form.phone.trim(),
          emergency_contact_name: form.emergencyContactName.trim(),
          emergency_contact_email: form.emergencyContactEmail.trim(),
          emergency_contact_phone: form.emergencyContactPhone.trim(),
          emergency_contact_relationship: form.emergencyContactRelationship,
        });
      } else {
        await login({
          username: form.username.trim(),
          password: form.password,
        });
      }

      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to complete request.");
    } finally {
      setSubmitting(false);
    }
  };

  const featurePills = [
    { icon: ShieldCheck, label: "JWT backed sessions" },
    { icon: ShieldAlert, label: "Emergency workflow ready" },
    { icon: UserPlus, label: "Quick account setup" },
  ];

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <main className="mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl gap-10 px-6 pb-16 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-soft-highlight">
            <ShieldCheck className="h-4 w-4" />
            {isRegister ? "Create your SafeHer account" : "Welcome back to SafeHer"}
          </div>

          <div className="space-y-5">
            <h1 className="max-w-2xl font-display text-5xl font-bold leading-[0.92] tracking-tight md:text-7xl">
              Safety that starts with a signed-in route.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-foreground/65 md:text-lg">
              Sign in to launch live tracking, view the OpenStreetMap route, and keep your emergency contacts in sync with every movement.
            </p>
          </div>

          <div id="features" className="grid gap-3 sm:grid-cols-3">
            {featurePills.map(({ icon: Icon, label }) => (
              <div key={label} className="glass rounded-2xl px-4 py-4">
                <Icon className="h-5 w-5 text-soft-highlight" />
                <div className="mt-3 text-sm text-neutral-light">{label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="text-xs uppercase tracking-[0.25em] text-soft-highlight/80">What you get</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <InfoCard title="Live route monitoring" description="Track moving coordinates, safety scores, and SOS response in one place." />
              <InfoCard title="Emergency contacts" description="Store trusted people and notify them when the risk engine sees trouble." />
            </div>
          </div>
        </section>

        <section className="lg:justify-self-end">
          <Card className="w-full max-w-xl border-white/10 bg-white/5 shadow-[0_30px_90px_-35px_rgba(0,0,0,0.8)] backdrop-blur">
            <CardHeader className="space-y-2 border-b border-white/5">
              <CardTitle className="text-3xl">{isRegister ? "Create account" : "Sign in"}</CardTitle>
              <CardDescription className="text-foreground/60">
                {isRegister
                  ? "Set up your profile and begin tracking in under a minute."
                  : "Use your SafeHer credentials to continue to the dashboard."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Username" value={form.username} onChange={updateField("username")} autoComplete="username" required />
                  {isRegister && <Field label="Email" value={form.email} onChange={updateField("email")} type="email" autoComplete="email" required />}
                </div>

                {isRegister && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name" value={form.firstName} onChange={updateField("firstName")} autoComplete="given-name" />
                    <Field label="Last name" value={form.lastName} onChange={updateField("lastName")} autoComplete="family-name" />
                  </div>
                )}

                {isRegister && <Field label="Phone" value={form.phone} onChange={updateField("phone")} type="tel" autoComplete="tel" />}

                {isRegister && (
                  <div className="rounded-3xl border border-white/10 bg-bg-deep/30 p-5">
                    <div className="mb-4 space-y-1">
                      <div className="text-sm font-semibold text-neutral-light">Emergency contact</div>
                      <p className="text-xs leading-relaxed text-foreground/55">
                        Add one trusted person now so SOS alerts can carry live location details immediately.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Contact name"
                        value={form.emergencyContactName}
                        onChange={updateField("emergencyContactName")}
                        autoComplete="name"
                      />
                      <Field
                        label="Contact relationship"
                        value={form.emergencyContactRelationship}
                        onChange={updateField("emergencyContactRelationship")}
                        autoComplete="off"
                      />
                      <Field
                        label="Contact email"
                        value={form.emergencyContactEmail}
                        onChange={updateField("emergencyContactEmail")}
                        type="email"
                        autoComplete="email"
                      />
                      <Field
                        label="Contact phone"
                        value={form.emergencyContactPhone}
                        onChange={updateField("emergencyContactPhone")}
                        type="tel"
                        autoComplete="tel"
                      />
                    </div>
                  </div>
                )}

                <Field
                  label="Password"
                  value={form.password}
                  onChange={updateField("password")}
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                />

                {isRegister && (
                  <Field
                    label="Confirm password"
                    value={form.passwordConfirm}
                    onChange={updateField("passwordConfirm")}
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                )}

                {error && <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-full bg-gradient-to-br from-soft-highlight to-green-accent text-bg-deep shadow-[0_0_40px_-8px_hsl(var(--soft-highlight)/0.55)] transition hover:shadow-[0_0_50px_-6px_hsl(var(--soft-highlight)/0.8)]"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isRegister ? "Create account" : "Continue to dashboard"}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>

              <div className="flex items-center justify-between gap-4 text-sm text-foreground/60">
                <span>{isRegister ? "Already have an account?" : "Need a new account?"}</span>
                <Link
                  to={isRegister ? "/login" : "/register"}
                  className="font-medium text-soft-highlight transition hover:text-soft-highlight/80"
                >
                  {isRegister ? "Sign in" : "Register"}
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-foreground/75">{label}</Label>
      <Input
        {...props}
        className="h-11 rounded-2xl border-white/10 bg-bg-deep/60 text-neutral-light placeholder:text-foreground/35 focus-visible:ring-soft-highlight/60"
      />
    </div>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-bg-deep/40 p-4">
      <h3 className="font-semibold text-neutral-light">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/60">{description}</p>
    </div>
  );
}