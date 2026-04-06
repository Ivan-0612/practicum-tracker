"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import { ChevronLeft, Trash2, Users, Search, Loader2, UserPlus } from "lucide-react";

export default function ListaProfesores() {
  const router = useRouter();
  const [profesores, setProfesores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const fetchProfesores = async () => {
    setIsLoading(true);
    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/profesores`, {
        headers: { "Authorization": `Bearer ${token}` }
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
        alert("✅ Profesor eliminado correctamente.");
        fetchProfesores(); // Recarga la lista
      } else {
        const errorData = await res.json();
        alert(`❌ Error: ${errorData.detail || "No se pudo eliminar al profesor"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión con el servidor.");
    }
  };

  const profesoresFiltrados = profesores.filter(prof => 
    prof.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
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
            
            {/* BARRA DE ACCIONES (Buscador + Botón Nuevo) */}
            <section className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-200 flex items-center gap-3 focus-within:border-ufv-azul focus-within:ring-2 focus-within:ring-blue-50 transition-all">
                <Search className="w-5 h-5 text-gray-400 ml-2" />
                <input 
                  type="text" 
                  placeholder="Buscar tutor por correo electrónico..." 
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="flex-1 bg-transparent outline-none border-none text-gray-700 placeholder:text-gray-400"
                />
              </div>
              
              <button 
                onClick={() => router.push("/admin/profesores/nuevo")} 
                className="bg-ufv-azul text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-ufv-azul-oscuro active:scale-95 transition-all shadow-sm shrink-0"
              >
                <UserPlus className="w-5 h-5" /> Nuevo Tutor
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
                  <div className="text-center p-12 text-gray-500 font-medium">
                    {busqueda ? "No hay profesores que coincidan con la búsqueda." : "No hay profesores registrados."}
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
                            <p className="font-bold text-gray-800 text-lg">{profesor.email}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                            </div>
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