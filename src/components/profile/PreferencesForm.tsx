"use client";

import { useState } from "react";
import { ParsedCV, UserPreferences } from "@/types";
import { Loader2, Plus, X } from "lucide-react";

const CHILEAN_LOCATIONS = [
  "Santiago", "Remoto", "Valparaíso", "Concepción", "La Serena",
  "Antofagasta", "Temuco", "Rancagua", "Talca", "Arica",
];

const INDUSTRIES = [
  "Tecnología", "Finanzas", "Salud", "Educación", "Retail",
  "Construcción", "Minería", "Agroindustria", "Servicios", "Manufactura",
  "Consultoría", "Marketing", "Logística", "Legal", "Energía",
];

interface Props {
  parsedCV: ParsedCV;
  onSave: (prefs: UserPreferences) => Promise<void>;
}

export default function PreferencesForm({ parsedCV, onSave }: Props) {
  const [loading, setLoading] = useState(false);
  const [targetRoles, setTargetRoles] = useState<string[]>(
    parsedCV.current_role ? [parsedCV.current_role] : []
  );
  const [newRole, setNewRole] = useState("");
  const [salaryExpectation, setSalaryExpectation] = useState<number | null>(null);
  const [preferredLocations, setPreferredLocations] = useState<string[]>(["Santiago"]);
  const [remotePreference, setRemotePreference] = useState<UserPreferences["remote_preference"]>("cualquiera");
  const [industries, setIndustries] = useState<string[]>([]);
  const [excludedCompanies, setExcludedCompanies] = useState("");
  const [yearsExperience, setYearsExperience] = useState<number>(
    parsedCV.years_experience || 0
  );
  const [jobSearchMode, setJobSearchMode] = useState<UserPreferences["job_search_mode"]>("moderate");
  const [autoApply, setAutoApply] = useState(true);

  function addRole() {
    const r = newRole.trim();
    if (r && !targetRoles.includes(r)) {
      setTargetRoles((prev) => [...prev, r]);
    }
    setNewRole("");
  }

  function toggleLocation(loc: string) {
    setPreferredLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  }

  function toggleIndustry(ind: string) {
    setIndustries((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (targetRoles.length === 0) {
      alert("Agrega al menos un cargo objetivo");
      return;
    }
    if (preferredLocations.length === 0) {
      alert("Selecciona al menos una ubicación");
      return;
    }
    setLoading(true);
    const prefs: UserPreferences = {
      target_roles: targetRoles,
      salary_expectation: salaryExpectation,
      preferred_locations: preferredLocations,
      remote_preference: remotePreference,
      industries_of_interest: industries,
      excluded_companies: excludedCompanies
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      years_experience: yearsExperience,
      job_search_mode: jobSearchMode,
      auto_apply_enabled: autoApply,
    };
    await onSave(prefs);
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8">
      <h2 className="text-lg font-semibold mb-1">Tus preferencias de trabajo</h2>
      <p className="text-sm text-gray-500 mb-6">
        Basado en tu CV detectamos: {parsedCV.current_role || "sin cargo detectado"} ·{" "}
        {parsedCV.seniority || "seniority no detectado"} · {parsedCV.years_experience || "?"} años exp.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Target roles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cargos que buscas *
          </label>
          <div className="flex gap-2 mb-2">
            <input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRole())}
              placeholder="ej: Desarrollador Full Stack"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={addRole}
              className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm"
            >
              <Plus size={14} /> Agregar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {targetRoles.map((role) => (
              <span
                key={role}
                className="flex items-center gap-1 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm"
              >
                {role}
                <button type="button" onClick={() => setTargetRoles((p) => p.filter((r) => r !== role))}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Salary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expectativa salarial (CLP bruto mensual)
          </label>
          <input
            type="number"
            value={salaryExpectation || ""}
            onChange={(e) => setSalaryExpectation(e.target.value ? Number(e.target.value) : null)}
            placeholder="ej: 1500000"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Locations */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ubicaciones preferidas *
          </label>
          <div className="flex flex-wrap gap-2">
            {CHILEAN_LOCATIONS.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => toggleLocation(loc)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  preferredLocations.includes(loc)
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Remote */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modalidad
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["remoto", "híbrido", "presencial", "cualquiera"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setRemotePreference(mode === "híbrido" ? "hybrid" : mode === "remoto" ? "remote" : mode === "presencial" ? "presencial" : "cualquiera")}
                className={`py-2 rounded-lg text-sm border capitalize transition-colors ${
                  remotePreference === (mode === "híbrido" ? "hybrid" : mode === "remoto" ? "remote" : mode)
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Industries */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rubros de interés (opcional)
          </label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind}
                type="button"
                onClick={() => toggleIndustry(ind)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  industries.includes(ind)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modo de búsqueda
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { value: "conservative", label: "Conservador", desc: "Solo alta compatibilidad (70%+)" },
                { value: "moderate", label: "Moderado", desc: "Buena compatibilidad (45%+)" },
                { value: "aggressive", label: "Agresivo", desc: "Cualquier trabajo relevante (20%+)" },
              ] as const
            ).map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setJobSearchMode(m.value)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  jobSearchMode === m.value
                    ? "bg-primary-50 border-primary-400"
                    : "bg-white border-gray-200 hover:border-primary-300"
                }`}
              >
                <p className="font-medium text-sm">{m.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Auto apply toggle */}
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
          <div>
            <p className="font-medium text-sm text-gray-900">Postulación automática diaria</p>
            <p className="text-xs text-gray-500">La IA postulará por ti cada mañana</p>
          </div>
          <button
            type="button"
            onClick={() => setAutoApply(!autoApply)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              autoApply ? "bg-primary-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                autoApply ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {loading ? "Guardando..." : "Guardar y comenzar →"}
        </button>
      </form>
    </div>
  );
}
