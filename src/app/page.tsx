import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-xl font-bold text-primary-700">AutoApply Chile</span>
        <div className="flex gap-3">
          <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm">
            Iniciar sesión
          </Link>
          <Link
            href="/auth/register"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700"
          >
            Comenzar gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium mb-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Automatiza tus postulaciones en Chile
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Postula a <span className="text-primary-600">100 trabajos</span>
          <br />mientras duermes
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Sube tu CV una vez. Nuestra IA genera cartas de presentación personalizadas
          y las envía automáticamente a las empresas que buscan tu perfil en Chile.
        </p>
        <Link
          href="/auth/register"
          className="bg-primary-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-primary-700 inline-block"
        >
          Comenzar gratis →
        </Link>
        <p className="text-sm text-gray-400 mt-4">Sin tarjeta de crédito · Gratis para siempre</p>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">¿Cómo funciona?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Sube tu CV",
                desc: "Sube tu CV en PDF. La IA extrae automáticamente tu experiencia, skills y datos de contacto.",
              },
              {
                step: "2",
                title: "La IA trabaja por ti",
                desc: "Cada día buscamos trabajos en Chile que coincidan con tu perfil y generamos cartas personalizadas.",
              },
              {
                step: "3",
                title: "Revisa tus postulaciones",
                desc: "En tu dashboard ves cada postulación enviada, la empresa, el cargo y la carta generada.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        AutoApply Chile · Hecho con ❤️ para el mercado laboral chileno
      </footer>
    </div>
  );
}
