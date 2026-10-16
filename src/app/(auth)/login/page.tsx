"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  CalendarCheck,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand/brand-logo";

const FEATURES = [
  { icon: CalendarCheck, text: "Absensi masuk & pulang harian" },
  { icon: MapPin, text: "Bukti foto dan lokasi GPS" },
  { icon: ShieldCheck, text: "Dipantau pembimbing & HRD" },
];

// Bidak warna solid (mengikuti ikon logo) sebagai hiasan panel brand.
const SQUARES = [
  { color: "#22d3ee", left: "10%", top: "16%", size: 60 },
  { color: "#fbbf24", left: "70%", top: "12%", size: 42 },
  { color: "#34d399", left: "80%", top: "48%", size: 50 },
  { color: "#fb7185", left: "16%", top: "64%", size: 38 },
  { color: "#60a5fa", left: "50%", top: "78%", size: 56 },
  { color: "#a78bfa", left: "32%", top: "34%", size: 32 },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email atau password salah.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* ── Panel brand (hanya layar besar) ───────────────────────── */}
      <aside className="relative hidden overflow-hidden bg-ink px-7 pb-12 pt-10 text-white lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:px-14 lg:py-14">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {SQUARES.map((s, i) => (
            <span
              key={i}
              className="absolute rounded-2xl opacity-20"
              style={{
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                backgroundColor: s.color,
              }}
            />
          ))}
        </div>

        <div className="relative flex justify-center lg:justify-start">
          <BrandLogo width={200} tile priority />
        </div>

        <div className="relative mt-10 lg:mt-0">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/60">
            Your Trusted Partner
          </p>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            Sistem Daily Activity PKL
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/70">
            Catat absensi dan aktivitas harian PKL dalam satu tempat — rapi,
            cepat, dan terpercaya.
          </p>

          <ul className="mt-7 space-y-3">
            {FEATURES.map((f) => (
              <li
                key={f.text}
                className="flex items-center gap-3 text-sm text-white/90"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <f.icon className="h-4 w-4" aria-hidden />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-10 hidden text-xs text-white/50 lg:block">
          © Trans Hybrid · Internal PKL
        </p>
      </aside>

      {/* ── Panel form ────────────────────────────────────────────── */}
      <main className="flex flex-1 items-start justify-center px-5 py-8 sm:px-8 lg:items-center lg:py-10">
        <div className="animate-fade-up w-full max-w-sm">
          {/* Header brand ringkas untuk HP: form langsung terlihat tanpa scroll */}
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <BrandLogo width={132} priority />
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              Your Trusted Partner
            </p>
            <h1 className="mt-1 text-lg font-extrabold tracking-tight text-text">
              Sistem Daily Activity PKL
            </h1>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-text">
            Selamat datang 👋
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Masuk untuk melanjutkan ke dashboard Anda.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@transhybrid.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div>
              <span className="mb-1.5 block text-sm font-medium text-text">
                Password
              </span>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 pr-11 text-sm text-text shadow-sm outline-none transition-colors placeholder:text-text-muted/60 hover:border-primary/40 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-primary-soft hover:text-primary"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>

          <p className="mt-7 text-center text-xs text-text-muted">
            Lupa password? Hubungi HRD atau administrator.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
