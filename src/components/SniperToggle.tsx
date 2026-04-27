"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Zap, Loader2, Target } from "lucide-react";
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
    <div className={`rounded-2xl border-2 p-5 transition-all duration-300 ${
      enabled
        ? "border-primary-200 bg-gradient-to-br from-primary-50 to-violet-50"
        : "border-slate-100 bg-white"
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
            enabled
              ? "bg-gradient-to-br from-primary-600 to-violet-600 shadow-glow"
              : "bg-slate-100"
          }`}>
            {enabled
              ? <Zap size={18} className="text-white" />
              : <Target size={18} className="text-slate-400" />
            }
          </div>

          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-slate-900 text-sm">Modo Sniper</h3>
              {enabled && (
                <span className="px-2 py-0.5 bg-primary-600 text-white text-[10px] font-bold rounded-full tracking-wide animate-pulse">
                  ACTIVO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              {enabled
                ? "Postulo automáticamente a tus mejores matches cada mañana."
                : "Actívalo y postulo automáticamente a tus 10 mejores matches cada mañana."}
            </p>
            {enabled && (
              <p className="text-xs text-primary-600 font-medium mt-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse inline-block" />
                Próxima ejecución: mañana a las 6:00 AM
              </p>
            )}
          </div>
        </div>

        <button
          onClick={toggle}
          disabled={loading}
          aria-label={enabled ? "Desactivar Modo Sniper" : "Activar Modo Sniper"}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 ${
            enabled ? "bg-primary-600" : "bg-slate-200"
          } ${loading ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
        >
          {loading ? (
            <Loader2 size={14} className="absolute left-1/2 -translate-x-1/2 text-white animate-spin" />
          ) : (
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`} />
          )}
        </button>
      </div>

      {!enabled && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Zap size={11} className="text-primary-400" />
            Actívalo una vez y olvídate. La app trabaja por ti mientras duermes.
          </p>
        </div>
      )}
    </div>
  );
}
