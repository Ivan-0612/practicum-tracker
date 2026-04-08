"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import { ChevronLeft, User, GraduationCap, Briefcase, KeyRound, Save, AlertCircle, CheckCircle2, Calendar } from "lucide-react";

// --- LÓGICA DINÁMICA DE AÑOS ACADÉMICOS ---
const obtenerPeriodoActual = () => {
  const hoy = new Date();
  const año = hoy.getFullYear();
  return hoy.getMonth() < 8 ? `${año - 1}/${año}` : `${año}/${año + 1}`;
};

const generarPeriodos = () => {
  const hoy = new Date();
  
  // Calculamos en qué año empezó realmente el curso actual
  const añoBase = hoy.getMonth() < 8 ? hoy.getFullYear() - 1 : hoy.getFullYear();
  
  const periodos = [];
  // Rango: 4 años en el pasado (-4), el actual (0), y 2 en el futuro (2)
  for (let i = -4; i <= 2; i++) {
    periodos.push(`${añoBase + i}/${añoBase + i + 1}`);
  }
  
  // Opcional: Le damos la vuelta para que los años más recientes salgan arriba del todo en la lista
  return periodos.reverse(); 
};

export default function NuevoAlumno() {
  const router = useRouter();
  const periodosDinamicos = generarPeriodos();
  
  const [especialidadesLista, setEspecialidadesLista] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    email_personal: "",
    curso: 2,
    grupo: "",
    email_acceso: "",
    password_acceso: "",
    email_tutor_hospital: "", 
    email_tutor_universidad: "",
    numero_rotacion: 1,
    especialidad_id: "", 
    periodo_academico: obtenerPeriodoActual() // <-- Automático para este año
  });
  
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchEspecialidades = async () => {
        const token = Cookies.get("practicum_token");
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/v1/admin/especialidades`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEspecialidadesLista(data);
                if (data.length > 0) {
                    setFormData(prev => ({ ...prev, especialidad_id: data[0].id }));
                }
            }
        } catch (error) {
            console.error("Error al cargar especialidades", error);
        }
    };
    fetchEspecialidades();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje({ tipo: "", texto: "" });

    if (!formData.especialidad_id) {
        setMensaje({ tipo: "error", texto: "Debes crear al menos una Especialidad en el Panel de Admin antes de matricular alumnos." });
        setIsLoading(false);
        return;
    }

    try {
      const token = Cookies.get("practicum_token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/v1/alumnos/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          curso: Number(formData.curso),
          numero_rotacion: Number(formData.numero_rotacion),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // --- MEJORA AQUÍ: Capturamos el mensaje específico del backend ---
        const errorMsg = data.detail || "Error al crear el alumno";
        throw new Error(typeof errorMsg === 'string' ? errorMsg : "Error en los datos enviados");
      }

      setMensaje({ tipo: "success", texto: "✅ Alumno, Tutores y Especialidad vinculados con éxito" });
      setTimeout(() => router.push("/admin/panel"), 2000);
    } catch (err: any) {
      // Si el servidor está caído o hay un error de red, err.message será "Failed to fetch"
      // Pero si el backend responde con 400, mostrará "Ya existe un estudiante..."
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setIsLoading(false);
    }
  };

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

        <div className="bg-ufv-blanco shadow-xl rounded-3xl p-6 md:p-10 border-t-4 border-ufv-azul">
          <div className="flex flex-col md:flex-row items-start md:items-center mb-10 gap-6 border-b border-gray-100 pb-8">
            <Image src="/logo-ufv.png" alt="Logo UFV" width={56} height={56} className="object-contain" />
            <div>
              <h1 className="text-3xl font-black text-ufv-azul-oscuro">Alta de Nuevo Alumno</h1>
              <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">Universidad Francisco de Vitoria</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-10">
            
            {/* SECCIÓN 1: DATOS PERSONALES */}
            <section>
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-3">
                <div className="bg-blue-50 p-2 rounded-lg text-ufv-azul"><User className="w-5 h-5" /></div>
                <h3 className="text-xl font-black text-ufv-azul-oscuro">Información Personal</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre</label>
                  <input type="text" required className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:border-ufv-azul outline-none" onChange={e => setFormData({...formData, nombre: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Apellidos</label>
                  <input type="text" required className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:border-ufv-azul outline-none" onChange={e => setFormData({...formData, apellidos: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                  <input type="email" placeholder="ejemplo@gmail.com" required className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:border-ufv-azul outline-none" onChange={e => setFormData({...formData, email_personal: e.target.value, email_acceso: e.target.value})} />
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: DATOS ACADÉMICOS */}
            <section>
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-3">
                <div className="bg-blue-50 p-2 rounded-lg text-ufv-azul"><GraduationCap className="w-5 h-5" /></div>
                <h3 className="text-xl font-black text-ufv-azul-oscuro">Ubicación Académica</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Curso Académico</label>
                  <select value={formData.curso} onChange={e => setFormData({...formData, curso: parseInt(e.target.value)})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:border-ufv-azul outline-none">
                    <option value={2}>2º Grado Enfermería</option>
                    <option value={3}>3º Grado Enfermería</option>
                    <option value={4}>4º Grado Enfermería</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Grupo</label>
                  <input type="text" placeholder="Ej: A" required className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:border-ufv-azul outline-none" onChange={e => setFormData({...formData, grupo: e.target.value})} />
                </div>
              </div>
            </section>

            {/* SECCIÓN 3: ASIGNACIÓN DE PRÁCTICAS Y TUTORES (ACTUALIZADA) */}
            <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-white p-2 rounded-lg text-ufv-rosa-oscuro shadow-sm border border-gray-100"><Briefcase className="w-5 h-5" /></div>
                <h3 className="text-xl font-black text-ufv-azul-oscuro">Asignación de Prácticas y Tutores</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Especialidad (Unidad)</label>
                  <select 
                    required
                    value={formData.especialidad_id}
                    onChange={e => setFormData({...formData, especialidad_id: e.target.value})}
                    className="w-full border border-gray-300 p-3 rounded-xl bg-white focus:border-ufv-azul outline-none"
                  >
                    {especialidadesLista.length === 0 && <option value="">No hay especialidades creadas</option>}
                    {especialidadesLista.map(esp => (
                        <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Núm. de Rotación</label>
                  <select value={formData.numero_rotacion} onChange={e => setFormData({...formData, numero_rotacion: parseInt(e.target.value)})} className="w-full border border-gray-300 p-3 rounded-xl bg-white focus:border-ufv-azul outline-none">
                    <option value={1}>Rotación 1</option><option value={2}>Rotación 2</option><option value={3}>Rotación 3</option>
                  </select>
                </div>

                {/* --- NUEVO DESPLEGABLE DINÁMICO: AÑO ACADÉMICO --- */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-500" /> Año Académico</label>
                  <select 
                    value={formData.periodo_academico} 
                    onChange={e => setFormData({...formData, periodo_academico: e.target.value})} 
                    className="w-full border border-gray-300 p-3 rounded-xl bg-white focus:border-ufv-azul outline-none font-bold text-ufv-azul-oscuro"
                  >
                    {periodosDinamicos.map(periodo => (
                      <option key={periodo} value={periodo}>{periodo}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Tutor Clínico (Hospital)</label>
                  <input type="email" placeholder="hospital@gmail.com" required className="w-full border border-gray-300 p-3 rounded-xl bg-white focus:border-ufv-azul outline-none" onChange={e => setFormData({...formData, email_tutor_hospital: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Tutor Académico (Universidad)</label>
                  <input type="email" placeholder="universidad@ufv.es" required className="w-full border border-gray-300 p-3 rounded-xl bg-white focus:border-ufv-azul outline-none" onChange={e => setFormData({...formData, email_tutor_universidad: e.target.value})} />
                </div>
              </div>

            </section>

            {/* SECCIÓN 4: LOGIN */}
            <section>
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-3">
                <div className="bg-blue-50 p-2 rounded-lg text-ufv-azul"><KeyRound className="w-5 h-5" /></div>
                <h3 className="text-xl font-black text-ufv-azul-oscuro">Credenciales</h3>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Contraseña Provisional</label>
                <input type="password" placeholder="Mínimo 8 caracteres" required className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:border-ufv-azul outline-none md:w-1/2" onChange={e => setFormData({...formData, password_acceso: e.target.value})} />
              </div>
            </section>

            {mensaje.texto && (
              <div className={`p-4 rounded-xl font-bold flex items-center gap-3 ${mensaje.tipo === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {mensaje.tipo === "success" ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>} {mensaje.texto}
              </div>
            )}

            <button type="submit" disabled={isLoading} className={`w-full py-4 rounded-xl font-bold text-white shadow-md flex justify-center items-center gap-3 transition-all ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-ufv-azul hover:bg-ufv-azul-oscuro active:scale-95"}`}>
              {isLoading ? "Procesando Alta..." : (<><Save className="w-5 h-5" /> Finalizar y Guardar</>)}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}