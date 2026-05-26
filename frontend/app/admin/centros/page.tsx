"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Save, Trash2, Building2, UserPlus } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { useToast } from "@/components/ToastProvider";
import ConfirmDialog from "@/components/ConfirmDialog";

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
  const { toast } = useToast();
  const [centros, setCentros] = useState<Centro[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState<{ id: string } | null>(null);

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
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/centros`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        // page_size=200 para traer todos los profesores sin paginación
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/profesores?page_size=200`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const dataCentros = resCentros.ok ? await resCentros.json() : [];
      const dataProf = resProf.ok ? await resProf.json() : { resultados: [] };

      setCentros(Array.isArray(dataCentros) ? dataCentros : []);
      // FIX: el endpoint devuelve { resultados: [...] }, no un array directo
      setProfesores(Array.isArray(dataProf.resultados) ? dataProf.resultados : []);
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
      if (!res.ok) throw new Error(data.detail || "No se pudo guardar el centro");
      toast.success("Centro guardado correctamente.");
      setFormData({ nombre: "", tutor_hospital_email: "", tutor_universidad_email: "" });
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message || "Error guardando centro");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCentro = async (centroId: string) => {
    const token = Cookies.get("practicum_token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/centros/${centroId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.detail || "No se pudo eliminar el centro");
      return;
    }
    toast.success("Centro eliminado correctamente.");
    cargarDatos();
  };

  const tutoresHospital = profesores.filter(
    (p) => (p.tipo_tutor || "").toLowerCase() === "hospital"
  );
  const tutoresUniversidad = profesores.filter(
    (p) => (p.tipo_tutor || "").toLowerCase() === "universidad"
  );

  const selectClass =
    "pl-3 pr-8 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-500 w-full";
  const inputClass =
    "px-3 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none transition-all text-sm text-gray-700 dark:text-gray-300 font-medium shadow-sm hover:border-gray-300 dark:hover:border-gray-500 w-full";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Breadcrumb items={[
          { label: "Panel", href: "/admin/panel" },
          { label: "Centros" },
        ]} />

        <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">

          {/* Cabecera */}
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-xl text-ufv-azul">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-ufv-azul-oscuro dark:text-white">Centros y Tutores</h1>
          </div>

          {/* Formulario de nuevo centro */}
          <form onSubmit={guardarCentro} className="mb-8">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              Añadir nuevo centro
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              {/* Nombre */}
              <div className="flex-1 min-w-[200px]">
                <input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre del centro"
                  required
                  className={inputClass}
                />
              </div>

              {/* Tutor hospital */}
              <div className="relative min-w-[200px] flex-1">
                <select
                  value={formData.tutor_hospital_email}
                  onChange={(e) => setFormData({ ...formData, tutor_hospital_email: e.target.value })}
                  className={selectClass}
                  required
                >
                  <option value="">Tutor hospital{tutoresHospital.length === 0 && loading ? "…" : tutoresHospital.length === 0 ? " (ninguno)" : ""}</option>
                  {tutoresHospital.map((prof) => (
                    <option key={prof.id} value={prof.email}>{prof.email}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              {/* Tutor universidad */}
              <div className="relative min-w-[200px] flex-1">
                <select
                  value={formData.tutor_universidad_email}
                  onChange={(e) => setFormData({ ...formData, tutor_universidad_email: e.target.value })}
                  className={selectClass}
                  required
                >
                  <option value="">Tutor universidad{tutoresUniversidad.length === 0 && loading ? "…" : tutoresUniversidad.length === 0 ? " (ninguno)" : ""}</option>
                  {tutoresUniversidad.map((prof) => (
                    <option key={prof.id} value={prof.email}>{prof.email}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              {/* Botón */}
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2 bg-ufv-azul text-white rounded-xl font-bold flex items-center gap-2 hover:bg-ufv-azul-oscuro transition-all shadow-sm text-sm shrink-0 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {guardando ? "Guardando..." : "Guardar centro"}
              </button>
            </div>
          </form>

          {/* Tabla de centros */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : centros.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 font-medium text-sm">
              No hay centros registrados todavía.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3">Centro</th>
                    <th className="px-4 py-3">Tutor Hospital</th>
                    <th className="px-4 py-3">Tutor Universidad</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {centros.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-800 dark:text-gray-100">{c.nombre}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.tutor_hospital_email || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.tutor_universidad_email || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-widest ${c.activo ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                          {c.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setConfirmEliminar({ id: c.id })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
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

      <ConfirmDialog
        isOpen={!!confirmEliminar}
        title="Eliminar centro"
        message="¿Seguro que quieres eliminar este centro de prácticas? Esta acción lo desactivará del sistema."
        confirmLabel="Sí, eliminar"
        variant="danger"
        onConfirm={() => { if (confirmEliminar) { eliminarCentro(confirmEliminar.id); setConfirmEliminar(null); } }}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  );
}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              {/* Botón */}
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2 bg-ufv-azul text-white rounded-xl font-bold flex items-center gap-2 hover:bg-ufv-azul-oscuro transition-all shadow-sm text-sm shrink-0 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {guardando ? "Guardando..." : "Guardar centro"}
              </button>
            </div>
          </form>

          {/* Tabla de centros */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : centros.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 font-medium text-sm">
              No hay centros registrados todavía.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3">Centro</th>
                    <th className="px-4 py-3">Tutor Hospital</th>
                    <th className="px-4 py-3">Tutor Universidad</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {centros.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-800 dark:text-gray-100">{c.nombre}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.tutor_hospital_email || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.tutor_universidad_email || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-widest ${c.activo ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                          {c.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setConfirmEliminar({ id: c.id })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
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

      <ConfirmDialog
        isOpen={!!confirmEliminar}
        title="Eliminar centro"
        message="¿Seguro que quieres eliminar este centro de prácticas? Esta acción lo desactivará del sistema."
        confirmLabel="Sí, eliminar"
        variant="danger"
        onConfirm={() => { if (confirmEliminar) { eliminarCentro(confirmEliminar.id); setConfirmEliminar(null); } }}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  );
}
