"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import { 
  ChevronLeft, Trash2, Users, Search, Loader2, 
  UserPlus, Filter, GraduationCap, Briefcase 
} from "lucide-react";

// Definimos la interfaz para saber qué datos esperamos
interface Profesor {
  id: string;
  email: string;
  tipo_tutor?: string;
}

export default function ListaProfesores() {
  const router = useRouter();
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos"); // <-- NUEVO ESTADO PARA EL FILTRO

  const fetchProfesores = async () => {
    setIsLoading(true);
    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/profesores`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setProfesores(data);
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

  const handleEliminar = async (id: string, email: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la cuenta de profesor:\n${email}?`)) return;

    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/profesores/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✅ ${data?.mensaje || "Operación completada."}`);
        fetchProfesores(); 
      } else {
        const errorData = await res.json();
        alert(`❌ Error: ${errorData.detail || "No se pudo eliminar al profesor"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión con el servidor.");
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
      alert(`❌ ${error.message || "Error al actualizar el tipo"}`);
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* BOTÓN VOLVER */}
        <button 
            type="button" 
            onClick={() => router.push("/admin/panel")} 
            className="mb-6 text-gray-500 hover:text-ufv-azul font-bold flex items-center gap-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al Panel
        </button>

        {/* TARJETA PRINCIPAL */}
        <div className="bg-ufv-blanco shadow-xl rounded-3xl p-6 md:p-10 border-t-4 border-ufv-azul">
          
          {/* CABECERA CON LOGO */}
          <div className="flex flex-col md:flex-row items-start md:items-center mb-10 gap-6 border-b border-gray-100 pb-8">
            <Image src="/logo-ufv.png" alt="Logo UFV" width={56} height={56} className="object-contain" />
            <div>
              <h1 className="text-3xl font-black text-ufv-azul-oscuro">Gestión de Tutores</h1>
              <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">Universidad Francisco de Vitoria</p>
            </div>
          </div>

          <div className="space-y-8">
            
            {/* BARRA DE ACCIONES Y FILTROS */}
            <section className="flex flex-col xl:flex-row gap-4 w-full">
              
              {/* GRUPO 1: BÚSQUEDA Y FILTRO */}
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                
                {/* Buscador */}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="Buscar tutor por correo electrónico..." 
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-12 pr-4 h-14 bg-gray-50 border border-gray-200 rounded-2xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul focus:bg-white outline-none transition-all text-gray-700 font-medium shadow-sm"
                  />
                </div>

                {/* Filtro Desplegable */}
                <div className="relative w-full md:w-64 shrink-0">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select 
                    value={filtroTipo} 
                    onChange={(e) => setFiltroTipo(e.target.value)} 
                    className="w-full pl-12 pr-10 h-14 bg-gray-50 border border-gray-200 rounded-2xl focus:border-ufv-azul focus:ring-1 focus:ring-ufv-azul outline-none appearance-none transition-all text-gray-700 font-bold cursor-pointer shadow-sm"
                  >
                    <option value="todos">Todos los roles</option>
                    <option value="hospital">Tutor Hospital</option>
                    <option value="universidad">Tutor Universidad</option>
                  </select>
                  {/* Flechita personalizada para el select */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
                
              </div>

              {/* GRUPO 2: BOTONES DE ACCIÓN */}
              <div className="flex gap-3 shrink-0">
                <button 
                  onClick={() => router.push("/admin/profesores/nuevo")} 
                  className="h-14 px-6 bg-ufv-azul text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-ufv-azul-oscuro transition-all shadow-sm"
                >
                  <UserPlus className="w-5 h-5 shrink-0" />
                  <span className="whitespace-nowrap">+ Nuevo Tutor</span>
                </button>
              </div>

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
                            
                            {/* --- NUEVO: ETIQUETA VISUAL DEL ROL --- */}
                            <div className="flex items-center gap-2 mt-1.5">
                              {profesor.tipo_tutor === "universidad" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-blue-100 text-ufv-azul border border-blue-200">
                                  <GraduationCap className="w-3.5 h-3.5" /> Tutor Universidad 
                                </span>
                              ) : profesor.tipo_tutor === "hospital" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-pink-100 text-ufv-rosa-oscuro border border-pink-200">
                                  <Briefcase className="w-3.5 h-3.5" /> Tutor Hospital 
                                </span>
                              )}
                              {!profesor.tipo_tutor && (
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
                          onClick={() => handleEliminar(profesor.id, profesor.email)}
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
    </div>
  );
}