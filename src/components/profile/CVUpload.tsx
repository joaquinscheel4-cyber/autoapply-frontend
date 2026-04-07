"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ParsedCV } from "@/types";
import { Upload, FileText, Loader2 } from "lucide-react";

interface Props {
  onComplete: (data: { parsed: ParsedCV; url: string; text: string }) => void;
}

export default function CVUpload({ onComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  async function handleUpload() {
    if (!file) return;
    setUploading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // 1. Upload to Supabase Storage
      const path = `${user.id}/cv.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(path, file, { upsert: true });

      if (uploadError) throw new Error("Error subiendo CV: " + uploadError.message);

      const { data: { publicUrl } } = supabase.storage.from("cvs").getPublicUrl(path);

      // 2. Parse CV with Claude via API
      const formData = new FormData();
      formData.append("cv", file);

      const parseRes = await fetch("/api/cv/parse", {
        method: "POST",
        body: formData,
      });

      if (!parseRes.ok) {
        const err = await parseRes.json();
        throw new Error(err.error || "Error al procesar el CV");
      }

      const { parsed, text } = await parseRes.json();

      toast.success("CV procesado correctamente");
      onComplete({ parsed, url: publicUrl, text });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8">
      <h2 className="text-lg font-semibold mb-1">Sube tu CV</h2>
      <p className="text-sm text-gray-500 mb-6">
        Solo PDF. La IA leerá tu experiencia, skills y datos de contacto.
      </p>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary-400 bg-primary-50"
            : file
            ? "border-green-300 bg-green-50"
            : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileText size={36} className="text-green-500" />
            <p className="font-medium text-gray-900">{file.name}</p>
            <p className="text-sm text-gray-400">
              {(file.size / 1024).toFixed(0)} KB · Haz clic para cambiar
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={36} className="text-gray-300" />
            <p className="font-medium text-gray-600">
              {isDragActive ? "Suelta aquí..." : "Arrastra tu CV o haz clic"}
            </p>
            <p className="text-sm text-gray-400">Solo PDF, máximo 10MB</p>
          </div>
        )}
      </div>

      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Procesando con IA...
            </>
          ) : (
            "Procesar CV →"
          )}
        </button>
      )}
    </div>
  );
}
