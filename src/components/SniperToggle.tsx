"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Zap, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SniperToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("user_id", user.id)
      .single();

    const newPrefs = { ...(profile?.preferences || {}), sniper_enabled: !enabled };

    const { error } = await supabase
      .from("profiles")
      .update({ preferences: newPrefs })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Error actualizando preferencias");
    } else {
      setEnabled(!enabled);
      toast.success(
        !enabled
          ? "⚡ Modo Sniper activado — postularé por ti cada mañana"
          : "Modo Sniper desactivado"
      );
    }
    setLoading(false);
  }

  return (
    <div className={`rounded-2xl border-2 p-5 transition-all ${enabled ? "border-primary-400 bg-primary-50" : "border-gray-100 bg-white"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${enabled ? "bg-primary-600" : "bg-gray-100"}`}>
            <Zap size={18} className={enabled ? "text-white" : "text-gray-400"} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Modo Sniper</h3>
              {enabled && (
                <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full font-medium animate-pulse">
                  ACTIVO
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Cada mañana postulo automáticamente a tus 10 mejores matches del día.
              Recibes un resumen por email con los resultados.
            </p>
            {enabled && (
              <p className="text-xs text-primary-600 font-medium mt-1.5">
                ✅ Próxima ejecución: mañana a las 6:00 AM
              </p>
            )}
          </div>
        </div>

        {/* Toggle switch */}
        <button
          onClick={toggle}
          disabled={loading}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${
            enabled ? "bg-primary-600" : "bg-gray-200"
          } ${loading ? "opacity-50" : ""}`}
        >
          {loading ? (
            <Loader2 size={14} className="absolute left-1/2 -translate-x-1/2 text-white animate-spin" />
          ) : (
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`} />
          )}
        </button>
      </div>

      {!enabled && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            💡 Actívalo una vez y olvídate. La app trabaja por ti mientras duermes.
          </p>
        </div>
      )}
    </div>
  );
}
