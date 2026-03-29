"use client";

import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
// HEMOS BORRADO AQUÍ EL IMPORT DEL MODAL PORQUE AQUÍ NO HACE FALTA

export default function AdminPanel() {
  const router = useRouter();

  const handleLogout = () => {
    // Borramos las cookies y al login
    Cookies.remove("practicum_token");
    Cookies.remove("practicum_rol");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Panel de Administrador</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Gestión de Cuadernillos</h2>
            <p className="text-gray-600 mb-4">Sube los archivos JSON para configurar las rotaciones de este año.</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium">
              Subir Configuración
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Gestión de Usuarios</h2>
            <p className="text-gray-600 mb-4">Administra las cuentas de acceso al sistema.</p>
            
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Botón para Profesores */}
                <button 
                  onClick={() => router.push("/admin/profesores/nuevo")}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded shadow-sm hover:bg-indigo-700 transition-colors font-medium"
                >
                  + Nuevo Profesor
                </button>

                {/* Botón para Alumnos */}
                <button 
                  onClick={() => router.push("/admin/alumnos/nuevo")}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded shadow-sm hover:bg-green-700 transition-colors font-medium"
                >
                  + Nuevo Alumno
                </button>
              </div>

              {/* --- NUEVO BOTÓN: Ir a la lista de alumnos --- */}
              <button 
                onClick={() => router.push("/admin/alumnos")}
                className="w-full bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded shadow-sm hover:bg-blue-100 transition-colors font-bold mt-2"
              >
                Ver y Gestionar Alumnos Existentes
              </button>
              {/* ------------------------------------------- */}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}