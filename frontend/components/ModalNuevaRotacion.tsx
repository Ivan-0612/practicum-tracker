"use client";

import { useState } from "react";
import Cookies from "js-cookie";

interface ModalProps {
  alumnoId: string;
  emailAlumno: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalNuevaRotacion({ alumnoId, emailAlumno, isOpen, onClose, onSuccess }: ModalProps) {
  const [emailTutor, setEmailTutor] = useState("");
  const [curso, setCurso] = useState(2);
  const [numeroRotacion, setNumeroRotacion] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  if (!isOpen) return null;

  const handleAsignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTutor.trim()) return;

    setLoading(true);
    setMensaje({ tipo: "", texto: "" });

    try {
      const token = Cookies.get("practicum_token");
      
      const url = new URL("http://127.0.0.1:8000/api/v1/alumnos/asignar-rotacion");
      url.searchParams.append("alumno_id", alumnoId);
      url.searchParams.append("email_tutor", emailTutor);
      url.searchParams.append("curso", curso.toString());
      url.searchParams.append("numero_rotacion", numeroRotacion.toString());

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        // Si el backend envió un mensaje en 'detail', lo usamos. 
        // Si no, usamos un texto genérico según el código de estado.
        const errorMensaje = data.detail || `Error del servidor (${res.status})`;
        throw new Error(errorMensaje);
      }

      setMensaje({ tipo: "success", texto: "✅ Nueva rotación asignada" });
      setTimeout(() => {
        setEmailTutor("");
        setCurso(2);
        setNumeroRotacion(1);
        setMensaje({ tipo: "", texto: "" });
        onSuccess();
        onClose();
      }, 1500);

    } catch (err: any) {
      // Si llega aquí porque el servidor está caído es un TypeError (Failed to fetch)
      // Si llega aquí por nuestro 'throw new Error', mostrará el mensaje del backend
      const mensajeFinal = err.message === "Failed to fetch" 
        ? "Rotación existente."
        : err.message;
        
      setMensaje({ tipo: "error", texto: "❌ " + mensajeFinal });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Nueva Rotación</h3>
          <button onClick={onClose} className="text-blue-100 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            Alumno: <span className="font-bold text-gray-900">{emailAlumno}</span>
          </p>

          <form onSubmit={handleAsignar} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Curso</label>
                <select 
                  value={curso} 
                  onChange={(e) => setCurso(Number(e.target.value))} 
                  className="w-full border-2 border-blue-200 p-2.5 rounded-lg outline-none text-gray-900 bg-white font-medium"
                >
                  <option value={2}>2º Curso</option>
                  <option value={3}>3º Curso</option>
                  <option value={4}>4º Curso</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Práctica</label>
                <select 
                  value={numeroRotacion} 
                  onChange={(e) => setNumeroRotacion(Number(e.target.value))} 
                  className="w-full border-2 border-blue-200 p-2.5 rounded-lg outline-none text-gray-900 bg-white font-medium"
                >
                  <option value={1}>Rotación 1</option>
                  <option value={2}>Rotación 2</option>
                  <option value={3}>Rotación 3</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email del Tutor</label>
              <input 
                type="email" 
                required 
                value={emailTutor} 
                onChange={(e) => setEmailTutor(e.target.value)} 
                placeholder="profesor@uni.edu" 
                className="w-full border-2 border-blue-200 p-2.5 rounded-lg outline-none text-gray-900 bg-white" 
              />
            </div>

            {mensaje.texto && <div className={`p-3 rounded-md text-sm font-medium ${mensaje.tipo === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{mensaje.texto}</div>}

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition-colors">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">Asignar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}