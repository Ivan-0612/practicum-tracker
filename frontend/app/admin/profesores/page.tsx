"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import {
  Trash2, Users, Search, Loader2,
  UserPlus, Filter, GraduationCap, Briefcase, Stethoscope
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { useToast } from "@/components/ToastProvider";
import ConfirmDialog from "@/components/ConfirmDialog";

// Definimos la interfaz para saber qué datos esperamos
interface Profesor {
  id: string;
  email: string;
  tipo_tutor?: string;
}

export default function ListaProfesores() {
  const router = useRouter();
  const { toast } = useToast();
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmEliminar, setConfirmEliminar] = useState<{ id: string; email: string } | null>(null);

  // Estados para filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos"); // <-- NUEVO ESTADO PARA EL FILTRO

  const fetchProfesores = async () => {
    setIsLoading(true);
    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/profesores?page_size=200`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        // El endpoint devuelve { total, page, page_size, resultados: [...] }, no un array directo
        setProfesores(Array.isArray(data.resultados) ? data.resultados : []);
      }
    } catch (error) {
      console.error("Error al cargar profesores", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfesores();
  }, []);

  const handleEliminar = async (id: string) => {
    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/profesores/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data?.mensaje || "Cuenta eliminada correctamente.");
        fetchProfesores();
      } else {
        const errorData = await res.json();
        toast.error(errorData.detail || "No se pudo eliminar al profesor.");
      }
    } catch (error) {
      toast.error("Error de conexión con el servidor.");
    }
  };

  const actualizarTipoTutor = async (id: string, tipo_tutor: "hospital" | "universidad") => {
    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/profesores/${id}/tipo`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tipo_tutor }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "No se pudo actualizar el tipo de tutor");
      }
      fetchProfesores();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar el tipo de tutor.");
    }
  };

  // --- LÓGICA DE FILTRADO COMBINADO ---
  const profesoresFiltrados = profesores.filter(prof => {
    const coincideBusqueda = prof.email.toLowerCase().includes(busqueda.toLowerCase());
    
    // Si el filtro es "todos", pasa. Si no, debe coincidir con el tipo_tutor del profesor.
    // Manejamos el caso en que tipo_tutor sea null/undefined para profesores antiguos.
    const tipoReal = prof.tipo_tutor || "no_especificado"; 
    const coincideTipo = filtroTipo === "todos" || tipoReal === filtroTipo;

    return coincideBusqueda && coincideTipo;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        <Breadcrumb items={[
          { label: "Panel", href: "/admin/panel" },
          { label: "Tutores" },
        ]} />

        <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">

          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-xl text-ufv-azul">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-ufv-azul-oscuro dark:text-white">Gestión de Tutores</h1>
          </div>

          <div className="space-y-8">
            
            {/* BARRA DE ACCIONES Y FILTROS */}
            <section className="flex flex-wrap items-center gap-2">

              {/* Buscador */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar tutor por correo electrónico..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul focus:bg-white outline-none transition-all text-sm text-gray-700 dark:text-gray-300 font-medium shadow-sm hover:border-gray-300 dark:hover:border-gray-500"
                />
              </div>

              {/* Filtro rol */}
              <div className="relative">
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 rounded-xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-500"
                >
                  <option value="todos">Todos los roles</option>
                  <option value="hospital">Tutor Hospital</option>
                  <option value="universidad">Tutor Universidad</option>
                  <option value="campo">Tutor de Campo</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              {/* Botón nuevo tutor */}
              <button
                onClick={() => router.push("/admin/profesores/nuevo")}
                className="ml-auto px-5 py-2 bg-ufv-azul text-white rounded-xl font-bold flex items-center gap-2 hover:bg-ufv-azul-oscuro transition-all shadow-sm text-sm shrink-0"
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">+ Nuevo Tutor</span>
              </button>

            </section>

            {/* LISTA DE USUARIOS */}
            <section>
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-3">
                <div className="bg-blue-50 p-2 rounded-lg text-ufv-azul"><Users className="w-5 h-5" /></div>
                <h3 className="text-xl font-black text-ufv-azul-oscuro">Cuentas Docentes Activas</h3>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center p-12 gap-3 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin text-ufv-azul" />
                    <p className="font-medium text-sm">Cargando profesores...</p>
                  </div>
                ) : profesoresFiltrados.length === 0 ? (
                  <div className="text-center p-12 text-gray-500 font-medium bg-gray-50/50">
                    {busqueda || filtroTipo !== "todos" 
                      ? "No hay tutores que coincidan con los filtros actuales." 
                      : "No hay profesores registrados."}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {profesoresFiltrados.map((profesor) => (
                      <div key={profesor.id} className="p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-blue-50/50 transition-colors group">
                        
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center text-ufv-azul font-black uppercase shrink-0 text-xl shadow-sm">
                            {profesor.email.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-lg leading-tight">{profesor.email}</p>
                            
                            {/* --- ETIQUETA VISUAL DEL ROL --- */}
                            <div className="flex items-center gap-2 mt-1.5">
                              {profesor.tipo_tutor === "universidad" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-blue-100 text-ufv-azul border border-blue-200">
                                  <GraduationCap className="w-3.5 h-3.5" /> Tutor Universidad
                                </span>
                              ) : profesor.tipo_tutor === "hospital" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-pink-100 text-ufv-rosa-oscuro border border-pink-200">
                                  <Briefcase className="w-3.5 h-3.5" /> Tutor Hospital
                                </span>
                              ) : profesor.tipo_tutor === "campo" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  <Stethoscope className="w-3.5 h-3.5" /> Tutor de Campo
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-200">
                                    Sin tipo
                                  </span>
                                  <button
                                    onClick={() => actualizarTipoTutor(profesor.id, "hospital")}
                                    className="text-[10px] px-2 py-1 rounded-md bg-pink-50 text-ufv-rosa-oscuro border border-pink-200 font-black uppercase tracking-wider"
                                  >
                                    Marcar Hospital
                                  </button>
                                  <button
                                    onClick={() => actualizarTipoTutor(profesor.id, "universidad")}
                                    className="text-[10px] px-2 py-1 rounded-md bg-blue-50 text-ufv-azul border border-blue-200 font-black uppercase tracking-wider"
                                  >
                                    Marcar Universidad
                                  </button>
                                </div>
                              )}
                            </div>
                            {/* -------------------------------------- */}


                          </div>
                        </div>
                        
                        <button
                          onClick={() => setConfirmEliminar({ id: profesor.id, email: profesor.email })}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-bold text-sm shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" /> Eliminar
                        </button>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
          
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!confirmEliminar}
        title="Eliminar cuenta de tutor"
        message={`¿Seguro que quieres eliminar la cuenta de:\n${confirmEliminar?.email}\n\nEsta acción desactivará su acceso al sistema.`}
        confirmLabel="Sí, eliminar"
        onConfirm={() => { if (confirmEliminar) { handleEliminar(confirmEliminar.id); setConfirmEliminar(null); } }}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  );
}