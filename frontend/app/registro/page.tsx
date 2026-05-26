"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Cookies from "js-cookie";
import { ArrowLeft, ArrowRight, CheckCircle2, UserPlus, AlertCircle, ExternalLink } from "lucide-react";
import { validarPasswordFuerte } from "@/lib/utils";

type Especialidad = { id: string; nombre: string };
type Centro = {
  id: string;
  nombre: string;
  tutor_hospital_email: string;
  tutor_universidad_email: string;
};

const formatearPeriodoAcademico = (inicio: number, fin: number) => `${inicio}/${String(fin).slice(-2)}`;
const obtenerPeriodoActual = () => {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  return hoy.getMonth() < 8 ? formatearPeriodoAcademico(anio - 1, anio) : formatearPeriodoAcademico(anio, anio + 1);
};

export default function RegistroAlumnoPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);

  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const periodoActual = obtenerPeriodoActual();
  const periodosAcademicos = useMemo(() => {
    const añoActual = Number(periodoActual.split("/")[0]);
    return [
      formatearPeriodoAcademico(añoActual - 1, añoActual),
      periodoActual,
      formatearPeriodoAcademico(añoActual + 1, añoActual + 2),
    ];
  }, [periodoActual]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmarPassword: "",
    nombre: "",
    apellidos: "",
    grupo: "",
    email_personal: "",
    curso: 2,
    numero_rotacion: 1,
    periodo_academico: periodoActual,
    especialidad_id: "",
    centro_practicas_id: "",
  });

  const centrosFiltrados = useMemo(() => centros, [centros]);

  const continuarPaso2 = async () => {
    setErrorMsg("");
    setOkMsg("");

    if (!formData.email || !formData.password || !formData.nombre || !formData.apellidos) {
      setErrorMsg("Completa todos los campos obligatorios del paso 1.");
      return;
    }

    if (!aceptaPrivacidad) {
      setErrorMsg("Debes aceptar la política de privacidad para continuar.");
      return;
    }

    if (formData.password !== formData.confirmarPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    const { valida, msg } = validarPasswordFuerte(formData.password);
    if (!valida) {
      setErrorMsg(msg);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/registro/verificar-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "No se pudo verificar el correo");
      }

      const especialidadesApi = Array.isArray(data.especialidades) ? data.especialidades : [];
      const centrosApi = Array.isArray(data.centros) ? data.centros : [];

      setEspecialidades(especialidadesApi);
      setCentros(centrosApi);

      const primeraEspecialidad = especialidadesApi[0]?.id || "";
      const primerCentro = centrosApi[0]?.id || "";

      setFormData((prev) => ({
        ...prev,
        especialidad_id: prev.especialidad_id || primeraEspecialidad,
        centro_practicas_id: prev.centro_practicas_id || primerCentro,
      }));

      setPaso(2);
    } catch (error: any) {
      setErrorMsg(error.message || "Error validando el correo.");
    } finally {
      setIsLoading(false);
    }
  };

  const completarRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setOkMsg("");

    if (!formData.especialidad_id || !formData.centro_practicas_id) {
      setErrorMsg("Selecciona especialidad y centro.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/registro/completar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          email: formData.email.trim(),
          email_personal: formData.email.trim(),
          curso: Number(formData.curso),
          numero_rotacion: Number(formData.numero_rotacion),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "No se pudo completar el registro");
      }

      Cookies.set("practicum_token", data.access_token, { expires: 1 });
      Cookies.set("practicum_rol", data.rol, { expires: 1 });
      setOkMsg("Registro completado. Redirigiendo al dashboard...");
      setTimeout(() => router.push("/alumno/dashboard"), 900);
    } catch (error: any) {
      setErrorMsg(error.message || "Error al completar el registro");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] flex flex-col justify-center p-4 md:p-8">
      <div className="max-w-3xl w-full mx-auto">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mb-5 text-gray-500 dark:text-gray-400 hover:text-ufv-azul dark:hover:text-ufv-azul font-bold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al login
        </button>

        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 md:p-10">
          <div className="flex items-center gap-4 mb-8 border-b border-gray-100 dark:border-gray-700 pb-6">
            <Image src="/logo-ufv.png" alt="Logo UFV" width={56} height={56} className="object-contain" />
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-ufv-azul-oscuro dark:text-white">Registro de Alumno</h1>
              <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">Paso {paso} de 2</p>
            </div>
          </div>

          <form onSubmit={completarRegistro} className="space-y-6">
            {paso === 1 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email (pre-registrado por admin)</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-[#0B1120] focus:bg-white dark:focus:bg-[#0B1120] focus:border-ufv-azul outline-none text-gray-700 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-[#0B1120] focus:bg-white dark:focus:bg-[#0B1120] focus:border-ufv-azul outline-none text-gray-700 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Apellidos</label>
                    <input
                      type="text"
                      required
                      value={formData.apellidos}
                      onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                      className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-[#0B1120] focus:bg-white dark:focus:bg-[#0B1120] focus:border-ufv-azul outline-none text-gray-700 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Contraseña</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-[#0B1120] focus:bg-white dark:focus:bg-[#0B1120] focus:border-ufv-azul outline-none text-gray-700 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Confirmar contraseña</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={formData.confirmarPassword}
                      onChange={(e) => setFormData({ ...formData, confirmarPassword: e.target.value })}
                      className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-[#0B1120] focus:bg-white dark:focus:bg-[#0B1120] focus:border-ufv-azul outline-none text-gray-700 dark:text-gray-200"
                    />
                  </div>
                </div>

                {/* Cláusula informativa */}
                <div className={`rounded-xl border p-4 transition-colors ${aceptaPrivacidad ? "border-ufv-azul bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B1120]"}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aceptaPrivacidad}
                      onChange={(e) => setAceptaPrivacidad(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-ufv-azul shrink-0"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      He leído y acepto la{" "}
                      <a
                        href="/politica-privacidad"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-ufv-azul hover:text-ufv-azul-oscuro underline inline-flex items-center gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        política de privacidad
                        <ExternalLink className="w-3 h-3" />
                      </a>{" "}
                      de la UFV. El responsable del tratamiento es la Universidad Francisco de Vitoria. La
                      legitimación es el consentimiento del interesado. Los datos se conservarán cinco años.
                      Puede ejercitar sus derechos en{" "}
                      <a href="mailto:dpd@ufv.es" className="font-bold text-ufv-azul underline" onClick={(e) => e.stopPropagation()}>
                        dpd@ufv.es
                      </a>.
                    </span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={continuarPaso2}
                  disabled={isLoading || !aceptaPrivacidad}
                  className="w-full py-3.5 rounded-xl font-bold text-white bg-ufv-azul hover:bg-ufv-azul-oscuro disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-5 h-5" /> {isLoading ? "Verificando..." : "Continuar"}
                </button>
              </>
            )}

            {paso === 2 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Curso</label>
                    <select
                      value={formData.curso}
                      onChange={(e) => setFormData({ ...formData, curso: Number(e.target.value) })}
                      className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-[#0B1120] focus:bg-white dark:focus:bg-[#0B1120] focus:border-ufv-azul outline-none text-gray-700 dark:text-gray-200"
                    >
                      <option value={2}>2º</option>
                      <option value={3}>3º</option>
                      <option value={4}>4º</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Rotación</label>
                    <select
                      value={formData.numero_rotacion}
                      onChange={(e) => setFormData({ ...formData, numero_rotacion: Number(e.target.value) })}
                      className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-[#0B1120] focus:bg-white dark:focus:bg-[#0B1120] focus:border-ufv-azul outline-none text-gray-700 dark:text-gray-200"
                    >
                      <option value={1}>Rotación 1</option>
                      <option value={2}>Rotación 2</option>
                      <option value={3}>Rotación 3</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Grupo</label>
                    <input
                      type="text"
                      required
                      value={formData.grupo}
                      onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                      className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-[#0B1120] focus:bg-white dark:focus:bg-[#0B1120] focus:border-ufv-azul outline-none text-gray-700 dark:text-gray-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Especialidad</label>
                    <select
                      value={formData.especialidad_id}
                      onChange={(e) => {
                        const nuevaEspecialidad = e.target.value;
                        setFormData({ ...formData, especialidad_id: nuevaEspecialidad });
                      }}
                      className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-[#0B1120] focus:bg-white dark:focus:bg-[#0B1120] focus:border-ufv-azul outline-none text-gray-700 dark:text-gray-200"
                    >
                      {especialidades.map((esp) => (
                        <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Centro</label>
                    <select
                      value={formData.centro_practicas_id}
                      onChange={(e) => setFormData({ ...formData, centro_practicas_id: e.target.value })}
                      className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-[#0B1120] focus:bg-white dark:focus:bg-[#0B1120] focus:border-ufv-azul outline-none text-gray-700 dark:text-gray-200"
                    >
                      {centrosFiltrados.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Periodo académico</label>
                    <select
                      value={formData.periodo_academico}
                      onChange={(e) => setFormData({ ...formData, periodo_academico: e.target.value })}
                      className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl bg-gray-50 dark:bg-[#0B1120] focus:bg-white dark:focus:bg-[#0B1120] focus:border-ufv-azul outline-none text-gray-700 dark:text-gray-200"
                    >
                      {periodosAcademicos.map((periodo) => (
                        <option key={periodo} value={periodo}>
                          {periodo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setPaso(1)}
                    className="w-full py-3.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0B1120] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Volver
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl font-bold text-white bg-ufv-azul hover:bg-ufv-azul-oscuro disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <ArrowRight className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />} Finalizar registro
                  </button>
                </div>
              </>
            )}

            {errorMsg && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {okMsg && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{okMsg}</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
