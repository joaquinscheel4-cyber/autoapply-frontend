"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import CVUpload from "@/components/profile/CVUpload";
import PreferencesForm from "@/components/profile/PreferencesForm";
import StandardAnswersForm from "@/components/profile/StandardAnswersForm";
import { ParsedCV, UserPreferences } from "@/types";
import { CheckCircle2 } from "lucide-react";

type Step = "cv" | "preferences" | "answers" | "done";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("cv");
  const [parsedCV, setParsedCV] = useState<ParsedCV | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvText, setCvText] = useState<string | null>(null);
  const [savedPrefs, setSavedPrefs] = useState<UserPreferences | null>(null);

  async function handleCVParsed(data: { parsed: ParsedCV; url: string; text: string }) {
    setParsedCV(data.parsed);
    setCvUrl(data.url);
    setCvText(data.text);
    setStep("preferences");
  }

  async function handlePreferencesSaved(prefs: UserPreferences) {
    setSavedPrefs(prefs);
    setStep("answers");
  }

  async function handleAnswersSaved(standardAnswers: Record<string, string>) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        cv_url: cvUrl,
        cv_text: cvText,
        parsed_cv: parsedCV,
        preferences: { ...savedPrefs, standard_answers: standardAnswers },
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      toast.error("Error guardando perfil: " + error.message);
      return;
    }

    setStep("done");
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  const steps = [
    { key: "cv", label: "CV" },
    { key: "preferences", label: "Preferencias" },
    { key: "answers", label: "Preguntas" },
    { key: "done", label: "¡Listo!" },
  ];

  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-xl font-bold text-primary-700">AutoApply Chile</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Configura tu perfil</h1>
          <p className="text-gray-500">Solo toma 3 minutos. Lo haces una vez.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                step === s.key ? "bg-primary-600 text-white" :
                i < currentIndex ? "bg-green-500 text-white" :
                "bg-gray-200 text-gray-500"
              }`}>
                {i < currentIndex ? "✓" : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${step === s.key ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className="w-6 h-px bg-gray-200 hidden sm:block mx-1" />}
            </div>
          ))}
        </div>

        {step === "cv" && <CVUpload onComplete={handleCVParsed} />}
        {step === "preferences" && parsedCV && (
          <PreferencesForm parsedCV={parsedCV} onSave={handlePreferencesSaved} />
        )}
        {step === "answers" && parsedCV && (
          <StandardAnswersForm parsedCV={parsedCV} onSave={handleAnswersSaved} />
        )}
        {step === "done" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">¡Perfil completo!</h2>
            <p className="text-gray-500">Redirigiendo a tu dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
