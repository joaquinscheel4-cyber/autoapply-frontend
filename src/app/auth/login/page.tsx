"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Zap, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos"
          : error.message
      );
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-600 to-violet-700 flex-col justify-between p-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">AutoApply Chile</span>
        </Link>

        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Tu próximo trabajo<br />te está esperando
          </h2>
          <p className="text-primary-100 text-lg leading-relaxed mb-8">
            La IA postula por ti mientras tú te enfocas en lo que importa.
          </p>
          <div className="space-y-3">
            {[
              "Cartas personalizadas generadas en segundos",
              "Postulaciones enviadas desde tu Gmail",
              "Dashboard con todo tu historial",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2.5 text-primary-100 text-sm">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-bold">✓</span>
                </div>
                {feat}
              </div>
            ))}
          </div>
        </div>

        <p className="text-primary-200 text-xs">AutoApply Chile · {new Date().getFullYear()}</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 justify-center mb-8 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-violet-600 rounded-lg flex items-center justify-center">
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-bold text-slate-900">AutoApply Chile</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Bienvenido de vuelta</h1>
            <p className="text-slate-500 text-sm mt-1">Inicia sesión para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm mt-2"
            >
              {loading ? "Ingresando..." : <><span>Iniciar sesión</span><ArrowRight size={15} /></>}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            ¿No tienes cuenta?{" "}
            <Link href="/auth/register" className="text-primary-600 font-semibold hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
