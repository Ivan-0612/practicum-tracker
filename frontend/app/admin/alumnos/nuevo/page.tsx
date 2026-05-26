"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Mail, Save, AlertCircle, CheckCircle2, GraduationCap } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

export default function NuevoAlumno() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje({ tipo: "", texto: "" });

    if (!email.trim()) {
      setMensaje({ tipo: "error", texto: "Debes indicar un correo institucional." });
      return;
    }

    setIsLoading(true);
    try {
      const token = Cookies.get("practicum_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/v1/alumnos/pre-registro`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "No se pudo pre-registrar el alumno");

      setMensaje({
        tipo: "success",
        texto: "Alumno pre-registrado correctamente. Ya puede completar su alta desde Registro.",
      });
      setEmail("");
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: err.message || "Error de conexión" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <Breadcrumb items={[
          { label: "Panel", href: "/admin/panel" },
          { label: "Alumnos", href: "/admin/alumnos" },
          { label: "Nuevo alumno" },
        ]} />

        <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">

          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-xl text-ufv-azul">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-ufv-azul-oscuro dark:text-white">Pre-registro de Alumno</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Solo correo institucional</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              El alta administrativa solo guarda el correo. El resto de datos del alumno se completan en su propio flujo de registro.
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Correo del alumno
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alumno@ufv.es"
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all text-sm text-gray-700 dark:text-gray-300 font-medium shadow-sm hover:border-gray-300 dark:hover:border-gray-500"
                />
              </div>
            </div>

            {mensaje.texto && (
              <div className={`p-4 rounded-xl font-bold flex items-center gap-3 text-sm ${
                mensaje.tipo === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
              }`}>
                {mensaje.tipo === "success"
                  ? <CheckCircle2 className="w-5 h-5 shrink-0" />
                  : <AlertCircle className="w-5 h-5 shrink-0" />}
                {mensaje.texto}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-ufv-azul text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-ufv-azul-oscuro transition-all shadow-sm text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isLoading ? "Guardando..." : "Guardar pre-registro"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
