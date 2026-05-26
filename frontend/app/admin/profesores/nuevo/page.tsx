"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { UserPlus, Mail, KeyRound, Save, CheckCircle2, AlertCircle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { validarPasswordFuerte } from "@/lib/utils";

function NuevoProfesorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tipoInicial =
    searchParams.get("tipo") === "hospital" || searchParams.get("tipo") === "universidad"
      ? (searchParams.get("tipo") as "hospital" | "universidad")
      : "hospital";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tipoTutor, setTipoTutor] = useState<"hospital" | "universidad">(tipoInicial);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje({ tipo: "", texto: "" });

    const token = Cookies.get("practicum_token");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/profesores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, password, rol: "profesor", tipo_tutor: tipoTutor }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 422 && errorData.detail) {
          const detail = Array.isArray(errorData.detail)
            ? errorData.detail[0].msg
            : errorData.detail;
          throw new Error(detail);
        }
        throw new Error(errorData.detail || "Error al crear el profesor. Verifica los datos o si el email ya existe.");
      }

      setMensaje({ tipo: "success", texto: "Profesor dado de alta correctamente." });
      setTimeout(() => router.push("/admin/panel"), 1500);
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all text-sm text-gray-700 dark:text-gray-300 font-medium shadow-sm hover:border-gray-300 dark:hover:border-gray-500";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] p-4 md:p-8">
      <div className="max-w-xl mx-auto">

        <Breadcrumb items={[
          { label: "Panel", href: "/admin/panel" },
          { label: "Tutores", href: "/admin/profesores" },
          { label: "Nuevo tutor" },
        ]} />

        <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">

          {/* Cabecera */}
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-xl text-ufv-azul">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-ufv-azul-oscuro dark:text-white">Alta de Nuevo Tutor</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Universidad Francisco de Vitoria</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@gmail.com"
                  className={inputClass}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Tipo de tutor */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tipo de Tutor</label>
              <div className="relative">
                <select
                  value={tipoTutor}
                  onChange={(e) => setTipoTutor(e.target.value as "hospital" | "universidad")}
                  className="pl-3 pr-8 py-2 w-full bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-500"
                >
                  <option value="hospital">Tutor Hospital</option>
                  <option value="universidad">Tutor Universidad</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Contraseña Provisional</label>
              <div className="relative">
                <KeyRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Ej: Practicum2024!"
                  className={inputClass}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Mensaje */}
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

            {/* Botón */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-ufv-azul text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-ufv-azul-oscuro transition-all shadow-sm text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isLoading ? "Registrando tutor..." : "Finalizar y Guardar"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default function NuevoProfesor() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-[#0B1120]" />}>
      <NuevoProfesorContent />
    </Suspense>
  );
}
