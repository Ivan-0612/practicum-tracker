"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import { ChevronLeft, Mail, Save, AlertCircle, CheckCircle2 } from "lucide-react";

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/v1/alumnos/pre-registro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "No se pudo pre-registrar el alumno");
      }

      setMensaje({ tipo: "success", texto: "✅ Alumno pre-registrado correctamente. Ya puede completar su alta desde Registro." });
      setEmail("");
    } catch (err: any) {
      setMensaje({ tipo: "error", texto: err.message || "Error de conexión" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => router.push("/admin/panel")}
          className="mb-6 text-gray-500 hover:text-ufv-azul font-bold flex items-center gap-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al Panel
        </button>

        <div className="bg-ufv-blanco shadow-xl rounded-3xl p-6 md:p-10 border-t-4 border-ufv-azul">
          <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
            <Image src="/logo-ufv.png" alt="Logo UFV" width={56} height={56} className="object-contain" />
            <div>
              <h1 className="text-3xl font-black text-ufv-azul-oscuro">Pre-registro de Alumno</h1>
              <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">Solo correo institucional</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-gray-700">
              Desde ahora, el alta administrativa solo guarda el correo. El resto de datos del alumno se completan en su propio flujo de registro en dos pasos.
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Correo del alumno</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:border-ufv-azul outline-none"
                  placeholder="alumno@ufv.es"
                />
              </div>
            </div>

            {mensaje.texto && (
              <div className={`p-4 rounded-xl font-bold flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {mensaje.tipo === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {mensaje.texto}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-md flex justify-center items-center gap-3 transition-all ${
                isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-ufv-azul hover:bg-ufv-azul-oscuro"
              }`}
            >
              <Save className="w-5 h-5" /> {isLoading ? "Guardando..." : "Guardar pre-registro"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
