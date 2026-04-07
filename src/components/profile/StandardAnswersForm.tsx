"use client";

import { useState } from "react";
import { ParsedCV } from "@/types";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

// Preguntas estándar más importantes (las que los formularios siempre piden)
const QUESTIONS = [
  {
    id: "linkedin_url",
    label: "LinkedIn URL",
    type: "url",
    placeholder: "https://linkedin.com/in/tu-perfil",
    hint: "Muy importante — la mayoría de los ATS lo piden",
    required: false,
  },
  {
    id: "portfolio_url",
    label: "Portfolio / GitHub / Sitio web",
    type: "url",
    placeholder: "https://github.com/tu-usuario",
    hint: "Para roles tech es casi obligatorio",
    required: false,
  },
  {
    id: "rut",
    label: "RUT",
    type: "text",
    placeholder: "12.345.678-9",
    hint: "Requerido en empresas chilenas (no se deduce del CV)",
    required: false,
  },
  {
    id: "current_location",
    label: "Ciudad donde vives",
    type: "text",
    placeholder: "Santiago, Chile",
    hint: "Aparece en casi todos los formularios",
    required: false,
  },
  {
    id: "start_date",
    label: "¿Cuándo puedes empezar?",
    type: "select",
    options: ["Inmediatamente", "2 semanas", "1 mes", "2 meses", "3 meses"],
    required: false,
  },
  {
    id: "salary_expectation",
    label: "Pretensión de renta (CLP bruto mensual)",
    type: "number",
    placeholder: "ej: 1500000",
    hint: "Si no quieres revelarla, déjala en blanco (la IA estimará una)",
    required: false,
  },
  {
    id: "english_level",
    label: "Nivel de inglés",
    type: "select",
    options: ["Básico", "Intermedio", "Avanzado", "Fluido", "Nativo"],
    required: false,
  },
  {
    id: "work_authorization",
    label: "¿Tienes permiso de trabajo en Chile?",
    type: "select",
    options: ["Sí", "No"],
    required: false,
  },
  {
    id: "willing_to_relocate",
    label: "¿Estás dispuesto a reubicarte?",
    type: "select",
    options: ["Sí", "No", "Depende"],
    required: false,
  },
  {
    id: "greatest_strength",
    label: "Tu mayor fortaleza profesional",
    type: "textarea",
    placeholder: "Ej: Mi capacidad de resolver problemas complejos de forma estructurada...",
    hint: "2-3 oraciones. La IA la puede generar por ti →",
    required: false,
  },
  {
    id: "why_role",
    label: "¿Por qué te interesa este tipo de roles?",
    type: "textarea",
    placeholder: "Ej: Me apasiona construir productos que impactan directamente en los usuarios...",
    hint: "Se personaliza por empresa al postular",
    required: false,
  },
  {
    id: "biggest_achievement",
    label: "Tu mayor logro profesional",
    type: "textarea",
    placeholder: "Ej: Lideré la migración de la base de datos que redujo latencia en un 40%...",
    required: false,
  },
];

interface Props {
  parsedCV: ParsedCV;
  onSave: (answers: Record<string, string>) => Promise<void>;
}

export default function StandardAnswersForm({ parsedCV, onSave }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({
    current_location: "Santiago, Chile",
    start_date: "Inmediatamente",
    english_level: inferEnglishLevel(parsedCV.languages || []),
    work_authorization: "Sí",
    willing_to_relocate: "No",
    salary_expectation: parsedCV.years_experience
      ? String(estimateSalary(parsedCV.years_experience, parsedCV.seniority))
      : "",
    linkedin_url: parsedCV.linkedin || "",
  });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  function set(id: string, val: string) {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }

  async function fillWithAI() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/profile/generate-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsed_cv: parsedCV }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAnswers((prev) => ({ ...prev, ...data.answers }));
      toast.success("IA completó las respuestas basándose en tu CV");
    } catch {
      toast.error("Error generando respuestas con IA");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await onSave(answers);
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Preguntas estándar de postulación</h2>
          <p className="text-sm text-gray-500 mt-1">
            Los formularios de trabajo siempre preguntan esto. Complétalo una vez y la IA lo usará en cada postulación.
          </p>
        </div>
        <button
          type="button"
          onClick={fillWithAI}
          disabled={aiLoading}
          className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 shrink-0"
        >
          {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {aiLoading ? "Generando..." : "Rellenar con IA"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {QUESTIONS.map((q) => (
          <div key={q.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {q.label}
              {q.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {q.hint && <p className="text-xs text-gray-400 mb-1.5">{q.hint}</p>}

            {q.type === "select" ? (
              <select
                value={answers[q.id] || ""}
                onChange={(e) => set(q.id, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">— Seleccionar —</option>
                {q.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : q.type === "textarea" ? (
              <textarea
                rows={3}
                value={answers[q.id] || ""}
                onChange={(e) => set(q.id, e.target.value)}
                placeholder={q.placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            ) : (
              <input
                type={q.type}
                value={answers[q.id] || ""}
                onChange={(e) => set(q.id, e.target.value)}
                placeholder={q.placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            )}
          </div>
        ))}

        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">¿No sabes qué poner?</p>
          <p className="text-xs text-blue-600">
            Usa el botón <strong>"Rellenar con IA"</strong> arriba — Claude leerá tu CV y completará automáticamente las respuestas que no hayas llenado. Siempre puedes editarlas después.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {loading ? "Guardando..." : "Guardar y terminar →"}
        </button>
      </form>
    </div>
  );
}

function inferEnglishLevel(languages: string[]): string {
  const str = languages.join(" ").toLowerCase();
  if (str.includes("nativ") || str.includes("fluent") || str.includes("fluido")) return "Fluido";
  if (str.includes("advanced") || str.includes("avanzado")) return "Avanzado";
  if (str.includes("english") || str.includes("inglés") || str.includes("ingles")) return "Intermedio";
  return "Básico";
}

function estimateSalary(years: number, seniority: string | null): number {
  const base: Record<string, number> = {
    junior: 800000,
    "semi-senior": 1400000,
    senior: 2200000,
    lead: 3000000,
  };
  return base[seniority || "semi-senior"] || 1200000 + years * 50000;
}
