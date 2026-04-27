import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Zap, Mail, FileText, BarChart3, ArrowRight, CheckCircle } from "lucide-react";

export default async function LandingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-violet-600 rounded-lg flex items-center justify-center shadow-sm">
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">AutoApply Chile</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth/login"
              className="text-slate-600 hover:text-slate-900 px-4 py-2 text-sm font-medium transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/auth/register"
              className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 active:scale-[0.98] transition-all shadow-sm">
              Comenzar gratis →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 border border-primary-100 px-3.5 py-1.5 rounded-full text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse" />
            IA que postula por ti · Chile
          </div>

          {/* Headline */}
          <h1 className="text-6xl font-bold text-slate-900 mb-6 leading-[1.1] tracking-tight">
            Postula a{" "}
            <span className="bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent">
              100 trabajos
            </span>
            <br />mientras duermes
          </h1>

          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Sube tu CV una vez. Nuestra IA genera cartas de presentación personalizadas
            y las envía directamente a los reclutadores desde tu Gmail.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/register"
              className="bg-primary-600 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-primary-700 active:scale-[0.98] transition-all shadow-sm inline-flex items-center gap-2">
              Comenzar gratis <ArrowRight size={16} />
            </Link>
            <Link href="/auth/login"
              className="text-slate-600 px-6 py-3.5 text-base font-medium hover:text-slate-900 transition-colors">
              Ya tengo cuenta →
            </Link>
          </div>

          <p className="text-sm text-slate-400 mt-5 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-green-500" /> Sin tarjeta de crédito</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-green-500" /> Gratis para siempre</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-green-500" /> Desde tu Gmail</span>
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-slate-100 bg-slate-50 py-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { value: "500+", label: "Trabajos en Chile", color: "text-primary-600" },
              { value: "10 seg", label: "Para generar tu carta", color: "text-violet-600" },
              { value: "100%", label: "Personalizada por IA", color: "text-emerald-600" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Cómo funciona</h2>
            <p className="text-slate-500">Tres pasos. Una vez. Y listo.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: FileText,
                title: "Sube tu CV",
                desc: "Sube tu PDF. La IA extrae automáticamente tu experiencia, skills y datos de contacto.",
                color: "bg-blue-50 text-blue-600",
              },
              {
                step: "02",
                icon: Zap,
                title: "La IA trabaja por ti",
                desc: "Cada día buscamos trabajos que calcen con tu perfil y generamos cartas únicas y naturales.",
                color: "bg-violet-50 text-violet-600",
              },
              {
                step: "03",
                icon: Mail,
                title: "El mail llega directo",
                desc: "El reclutador recibe un mail desde tu Gmail con tu carta personalizada y CV adjunto.",
                color: "bg-emerald-50 text-emerald-600",
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-card hover:shadow-card-hover transition-all duration-200 group">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                    <item.icon size={18} />
                  </div>
                  <span className="text-3xl font-bold text-slate-100 group-hover:text-slate-200 transition-colors">{item.step}</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Todo lo que necesitas</h2>
            <p className="text-slate-500">Una plataforma completa para tu búsqueda de empleo</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: "⚡", title: "Modo Sniper", desc: "Actívalo y postula automáticamente a tus 10 mejores matches cada mañana." },
              { icon: "🧠", title: "IA que entiende tu perfil", desc: "Claude analiza tu CV y redacta cartas que suenan humanas, no robóticas." },
              { icon: "📧", title: "Desde tu Gmail", desc: "Los mails salen desde tu cuenta. El reclutador ve tu nombre, no un sistema." },
              { icon: "📊", title: "Dashboard completo", desc: "Ve todas tus postulaciones, estado y carta generada en un solo lugar." },
              { icon: "🎯", title: "Match inteligente", desc: "Filtra por empresas conocidas, modalidad, ubicación y compatibilidad de skills." },
              { icon: "🔒", title: "Tu información segura", desc: "Tu CV y datos se guardan cifrados. Nunca compartimos tu información." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 bg-white rounded-xl border border-slate-100 p-4 shadow-card">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">{f.title}</h4>
                  <p className="text-slate-500 text-sm mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-br from-primary-600 to-violet-600 rounded-3xl p-12 text-white shadow-xl">
            <BarChart3 size={40} className="mx-auto mb-4 opacity-80" />
            <h2 className="text-3xl font-bold mb-3">Empieza hoy, gratis</h2>
            <p className="text-primary-100 mb-8 text-lg">
              Mientras otros postulantes llenan formularios uno a uno, tú ya tienes 50 cartas enviadas.
            </p>
            <Link href="/auth/register"
              className="inline-flex items-center gap-2 bg-white text-primary-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-primary-50 active:scale-[0.98] transition-all text-base">
              Crear cuenta gratis <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-primary-600 to-violet-600 rounded flex items-center justify-center">
              <Zap size={11} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">AutoApply Chile</span>
          </div>
          <p className="text-sm text-slate-400">Hecho para el mercado laboral chileno · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
