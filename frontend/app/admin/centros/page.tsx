"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { ChevronLeft, Save, Trash2 } from "lucide-react";

type Profesor = { id: string; email: string; tipo_tutor: string };
type Centro = {
  id: string;
  nombre: string;
  tutor_hospital_email: string;
  tutor_universidad_email: string;
  activo: boolean;
};

export default function CentrosAdminPage() {
  const router = useRouter();
  const [centros, setCentros] = useState<Centro[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    tutor_hospital_email: "",
    tutor_universidad_email: "",
  });

  const cargarDatos = async () => {
    setLoading(true);
    const token = Cookies.get("practicum_token");
    try {
      const [resCentros, resProf] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/centros`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/profesores`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const dataCentros = resCentros.ok ? await resCentros.json() : [];
      const dataProf = resProf.ok ? await resProf.json() : [];

      setCentros(Array.isArray(dataCentros) ? dataCentros : []);
      setProfesores(Array.isArray(dataProf) ? dataProf : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const guardarCentro = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = Cookies.get("practicum_token");
    setGuardando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/centros`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "No se pudo guardar el centro");
      }
      setFormData({ ...formData, nombre: "" });
      cargarDatos();
    } catch (error: any) {
      alert(error.message || "Error guardando centro");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCentro = async (centroId: string) => {
    if (!confirm("¿Eliminar/desactivar este centro?")) return;
    const token = Cookies.get("practicum_token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/centros/${centroId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.detail || "No se pudo eliminar el centro");
      return;
    }
    cargarDatos();
  };

  const tutoresHospital = profesores.filter((p) => (p.tipo_tutor || "").toLowerCase().includes("hosp"));
  const tutoresUniversidad = profesores.filter((p) => (p.tipo_tutor || "").toLowerCase().includes("uni"));

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <button
          type="button"
          onClick={() => router.push("/admin/panel")}
          className="mb-6 text-gray-500 hover:text-ufv-azul font-bold flex items-center gap-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al Panel
        </button>

        <div className="bg-white rounded-3xl border-t-4 border-ufv-azul shadow-xl p-6 md:p-10">
          <h1 className="text-3xl font-black text-ufv-azul-oscuro mb-6">Centros y Tutores</h1>

          <form onSubmit={guardarCentro} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-8">
            <input
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Nombre del centro"
              required
              className="md:col-span-3 border border-gray-200 rounded-xl px-3 py-2"
            />
            <select
              value={formData.tutor_hospital_email}
              onChange={(e) => setFormData({ ...formData, tutor_hospital_email: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2"
              required
            >
              <option value="">Tutor hospital</option>
              {tutoresHospital.map((prof) => (
                <option key={prof.id} value={prof.email}>{prof.email}</option>
              ))}
            </select>
            <select
              value={formData.tutor_universidad_email}
              onChange={(e) => setFormData({ ...formData, tutor_universidad_email: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2"
              required
            >
              <option value="">Tutor universidad</option>
              {tutoresUniversidad.map((prof) => (
                <option key={prof.id} value={prof.email}>{prof.email}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={guardando}
              className="md:col-span-5 bg-ufv-azul text-white rounded-xl px-4 py-3 font-bold flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> {guardando ? "Guardando..." : "Guardar centro"}
            </button>
          </form>

          {loading ? (
            <div className="text-sm text-gray-500">Cargando centros...</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-3">Centro</th>
                    <th className="p-3">Tutor Hospital</th>
                    <th className="p-3">Tutor Universidad</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {centros.map((c) => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="p-3 font-bold">{c.nombre}</td>
                      <td className="p-3">{c.tutor_hospital_email}</td>
                      <td className="p-3">{c.tutor_universidad_email}</td>
                      <td className="p-3">{c.activo ? "Activo" : "Inactivo"}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => eliminarCentro(c.id)}
                          className="inline-flex items-center gap-1 text-red-600 font-bold"
                        >
                          <Trash2 className="w-4 h-4" /> Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
