"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import { AlertCircle, CheckCircle2, ChevronLeft, FileSpreadsheet, Loader2, Upload } from "lucide-react";

type ResultadoImportacionRotaciones = {
  total_filas: number;
  creados: number;
  duplicados: number;
  fallidos: number;
  creados_detalle: Array<{ fila: number; email_alumno: string; rotacion_id: string }>;
  fallos: Array<{ fila: number; email_alumno?: string | null; motivo: string }>;
};

export default function ImportarRotacionesExcel() {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacionRotaciones | null>(null);
  const [errorGlobal, setErrorGlobal] = useState("");

  const handleSubir = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal("");
    setResultado(null);

    if (!archivo) {
      setErrorGlobal("Selecciona un archivo XLSX antes de importar.");
      return;
    }

    const token = Cookies.get("practicum_token");
    const formData = new FormData();
    formData.append("file", archivo);

    setIsUploading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/alumnos/importar-rotaciones-excel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "No se pudo importar el Excel de rotaciones");
      }
      setResultado(data);
    } catch (error: any) {
      setErrorGlobal(error.message || "Error al importar rotaciones");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => router.push("/admin/alumnos")}
          className="mb-6 text-gray-500 hover:text-ufv-azul font-bold flex items-center gap-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Volver a Alumnos
        </button>

        <div className="bg-white shadow-xl rounded-3xl p-6 md:p-10 border-t-4 border-ufv-azul">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 border-b border-gray-100 pb-8 mb-8">
            <Image src="/logo-ufv.png" alt="Logo UFV" width={56} height={56} className="object-contain" />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-ufv-rosa-oscuro mb-2">Importación masiva</p>
              <h1 className="text-3xl font-black text-ufv-azul-oscuro">Asignar rotaciones desde Excel</h1>
              <p className="text-sm text-gray-500 mt-2 max-w-2xl">
                Importa rotaciones para alumnos ya existentes. Si una fila falla, se registra el motivo y se continúa con las demás.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handleSubir} className="space-y-5">
              <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-6 text-center">
                <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-white shadow-sm text-ufv-azul flex items-center justify-center">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-black text-gray-900">Selecciona el archivo XLSX</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Debe incluir columnas de email del alumno, curso, rotación, periodo académico, especialidad, centro y tutores.
                </p>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setArchivo(e.target.files ? e.target.files[0] : null)}
                  className="mt-5 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-ufv-azul hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 leading-relaxed">
                <p className="font-bold text-gray-800 mb-2">Validaciones</p>
                <ul className="space-y-2 list-disc pl-5">
                  <li>El alumno debe existir previamente.</li>
                  <li>No se permite repetir alumno + rotación + periodo académico.</li>
                  <li>Curso y rotación se limpian para extraer solo números.</li>
                  <li>Tutores y especialidad deben existir.</li>
                </ul>
              </div>

              {errorGlobal && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{errorGlobal}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading}
                className="w-full px-5 py-4 rounded-2xl font-bold text-white bg-ufv-azul hover:bg-ufv-azul-oscuro disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                {isUploading ? "Importando..." : "Importar rotaciones"}
              </button>
            </form>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-green-700">Creadas</p>
                  <p className="text-3xl font-black text-green-700 mt-2">{resultado?.creados ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-amber-700">Fallidas</p>
                  <p className="text-3xl font-black text-amber-700 mt-2">{resultado?.fallidos ?? 0}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-4">
                <p className="text-sm font-black text-gray-800 mb-3">Resumen</p>
                {resultado ? (
                  <div className="space-y-3 text-sm">
                    <p className="text-gray-600">Filas procesadas: <span className="font-bold text-gray-900">{resultado.total_filas}</span></p>
                    <p className="text-gray-600">Duplicados: <span className="font-bold text-gray-900">{resultado.duplicados}</span></p>
                    <p className="text-gray-600">Creadas: <span className="font-bold text-green-700">{resultado.creados}</span></p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aquí aparecerá el resultado al finalizar la importación.</p>
                )}
              </div>

              {resultado && resultado.fallos.length > 0 && (
                <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <p className="text-sm font-black text-gray-800">Filas rechazadas</p>
                  </div>
                  <div className="max-h-[28rem] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-white sticky top-0">
                        <tr className="text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100">
                          <th className="text-left p-3">Fila</th>
                          <th className="text-left p-3">Alumno</th>
                          <th className="text-left p-3">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.fallos.map((fallo) => (
                          <tr key={`${fallo.fila}-${fallo.email_alumno || "sin-email"}`} className="border-t border-gray-100">
                            <td className="p-3 font-bold text-gray-700">{fallo.fila}</td>
                            <td className="p-3 text-gray-600">{fallo.email_alumno || "-"}</td>
                            <td className="p-3 text-gray-600">{fallo.motivo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {resultado && resultado.creados_detalle.length > 0 && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-black text-green-700 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Rotaciones creadas
                  </p>
                  <div className="space-y-2 text-sm text-green-900/90 max-h-48 overflow-y-auto pr-1">
                    {resultado.creados_detalle.map((item) => (
                      <div key={`${item.fila}-${item.rotacion_id}`} className="flex items-center justify-between gap-3 bg-white/70 rounded-xl px-3 py-2 border border-green-100">
                        <span className="font-bold">Fila {item.fila}</span>
                        <span className="truncate">{item.email_alumno}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}