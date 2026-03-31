"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { X, Save, Loader2, Briefcase, GraduationCap, Mail } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  alumnoId: string;
  emailAlumno: string;
  onSuccess: () => void;
}

export default function ModalNuevaRotacion({ isOpen, onClose, alumnoId, emailAlumno, onSuccess }: ModalProps) {
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    curso: 3,
    numero_rotacion: 2,
    email_tutor: "",
    especialidad_id: "" // <-- NUEVO CAMPO
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cargar las especialidades al abrir el modal
  useEffect(() => {
    if (isOpen) {
      cargarEspecialidades();
      setFormData({ curso: 3, numero_rotacion: 2, email_tutor: "", especialidad_id: "" });
      setError("");
    }
  }, [isOpen]);

  const cargarEspecialidades = async () => {
    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch("http://127.0.0.1:8000/api/v1/admin/especialidades", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEspecialidades(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, especialidad_id: data[0].id }));
        }
      }
    } catch (err) {
      console.error("Error al cargar especialidades", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.especialidad_id) {
        setError("Debes seleccionar una especialidad.");
        return;
    }

    setLoading(true);
    setError("");

    try {
      const token = Cookies.get("practicum_token");
      const res = await fetch("http://127.0.0.1:8000/api/v1/alumnos/asignar-rotacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          alumno_id: alumnoId,
          especialidad_id: formData.especialidad_id, // <-- SE ENVÍA LA ESPECIALIDAD
          curso: Number(formData.curso),
          numero_rotacion: Number(formData.numero_rotacion),
          email_tutor: formData.email_tutor
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al asignar la rotación");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl border-t-4 border-ufv-azul animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-2xl font-black text-ufv-azul-oscuro">Asignar Rotación</h2>
            <p className="text-sm font-bold text-gray-500 mt-1">
              Alumno: <span className="text-ufv-rosa-oscuro">{emailAlumno}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-4">
            
            {/* NUEVO DESPLEGABLE: ESPECIALIDAD */}
            <div>
              <label className="flex items-center gap-2 text-xs font-black text-ufv-azul uppercase tracking-widest mb-2">
                <Briefcase className="w-4 h-4" /> Especialidad
              </label>
              <select 
                required
                className="w-full p-3.5 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none text-gray-900 font-medium"
                value={formData.especialidad_id}
                onChange={(e) => setFormData({...formData, especialidad_id: e.target.value})}
              >
                {especialidades.length === 0 && <option value="">Cargando especialidades...</option>}
                {especialidades.map(esp => (
                    <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-ufv-azul uppercase tracking-widest mb-2">
                  <GraduationCap className="w-4 h-4" /> Curso
                </label>
                <select 
                  className="w-full p-3.5 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none text-gray-900 font-medium"
                  value={formData.curso}
                  onChange={(e) => setFormData({...formData, curso: parseInt(e.target.value)})}
                >
                  <option value={2}>2º Curso</option>
                  <option value={3}>3º Curso</option>
                  <option value={4}>4º Curso</option>
                </select>
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-ufv-azul uppercase tracking-widest mb-2">
                  Nº Rotación
                </label>
                <select 
                  className="w-full p-3.5 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none text-gray-900 font-medium"
                  value={formData.numero_rotacion}
                  onChange={(e) => setFormData({...formData, numero_rotacion: parseInt(e.target.value)})}
                >
                  <option value={1}>Rotación 1</option>
                  <option value={2}>Rotación 2</option>
                  <option value={3}>Rotación 3</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-black text-ufv-azul uppercase tracking-widest mb-2">
                <Mail className="w-4 h-4" /> Email del Tutor
              </label>
              <input 
                type="email" 
                required
                placeholder="tutor@ufv.es"
                className="w-full p-3.5 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-ufv-azul focus:border-ufv-azul outline-none text-gray-900 font-medium"
                value={formData.email_tutor}
                onChange={(e) => setFormData({...formData, email_tutor: e.target.value})}
              />
            </div>
          </div>

          {error && (
            <p className="text-center text-xs font-bold p-3.5 rounded-xl bg-red-50 text-red-700 border border-red-100">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-3.5 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors border border-transparent"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-3.5 bg-ufv-azul text-white font-bold rounded-xl hover:bg-ufv-azul-oscuro shadow-md active:scale-95 transition-all border border-transparent flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {loading ? "Asignando..." : "Asignar Rotación"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}