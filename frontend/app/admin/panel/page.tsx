"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import ModalTipoAltaAlumno from "@/components/ModalTipoAltaAlumno";
import { 
  LogOut, 
  FileJson, 
  Users, 
  UserPlus, 
  GraduationCap, 
  Settings, 
  Loader2, 
  Tag,
  Trash2,
  Eye,
  X,
  Clapperboard, 
  Code2,
  Save,
  Search,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  RefreshCcw,
  CheckCircle,
  XCircle,
  ArrowRight,
  Edit3,
  Zap,
  ArrowLeft
} from "lucide-react";

// --- COMPONENTE: RENDERIZADOR VISTA EVALUACIÓN COMPACTA (VERSIÓN UFV) ---
const RenderizadorEvaluacionCompacta = ({ data }: { data: any }) => {
  if (!data || !data.apartados) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-2xl text-sm font-medium flex items-center gap-3">
        <AlertCircle className="w-6 h-6 text-amber-500" />
        <div>
          <p className="font-bold">Estructura JSON no reconocida.</p>
          <p className="text-xs opacity-80">No se encontraron los 'apartados' esperados. Usa el Código Raw para ver el archivo.</p>
        </div>
      </div>
    );
  }

  const nivelesKeys = data.niveles ? Object.keys(data.niveles).sort() : [];

  return (
    <div className="space-y-6">
      <div className="bg-ufv-azul-oscuro p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-10"><FileJson className="w-40 h-40" /></div>
        <div className="relative z-10">
          <div className="flex gap-2 mb-2">
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Versión {data.version}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Curso {data.curso_academico}</span>
          </div>
          <h2 className="text-xl font-black">{data.titulo_rotacion}</h2>
          <p className="text-sm text-blue-100 font-medium mt-1">Curso {data.curso}º - Rotación {data.rotacion}</p>
        </div>
      </div>

      {data.niveles && (
        <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
          <h3 className="text-xs font-black text-ufv-azul uppercase tracking-widest mb-3 flex items-center gap-2"><Tag className="w-4 h-4" /> Leyenda de Evaluación</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(data.niveles).map(([key, descripcion]) => (
              <div key={key} className="bg-white p-3 rounded-xl border border-blue-100/50 shadow-sm flex items-start gap-3">
                <div className="bg-ufv-azul text-white font-black w-6 h-6 rounded flex items-center justify-center shrink-0 text-sm">{key}</div>
                <p className="text-[11px] text-gray-600 font-medium leading-snug">{String(descripcion)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.bloque_sinon && data.bloque_sinon.elementos && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b border-gray-200 p-3 px-4"><h3 className="text-sm font-black text-gray-800">{data.bloque_sinon.titulo}</h3></div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 max-h-64 overflow-y-auto bg-gray-50/30">
            {data.bloque_sinon.elementos.map((item: any) => (
              <div key={item.id} className="flex items-start gap-2 group">
                <div className="w-4 h-4 rounded border border-gray-300 mt-0.5 shrink-0 bg-white group-hover:border-ufv-azul transition-colors"></div>
                <span className="text-[11px] text-gray-600 font-medium leading-tight group-hover:text-gray-900 transition-colors">{item.texto}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {data.apartados.map((apartado: any) => (
          <div key={apartado.numero} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 p-3 px-4 flex items-center gap-3">
              <div className="bg-ufv-azul-oscuro text-white text-xs font-black rounded-full w-6 h-6 flex items-center justify-center shrink-0">{apartado.numero}</div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide">{apartado.titulo}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {apartado.elementos.map((elemento: any, idx: number) => (
                <div key={elemento.id} className="p-3 px-4 flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-blue-50/30 transition-colors">
                  <p className="text-xs text-gray-700 font-medium leading-relaxed flex-1"><span className="text-gray-400 font-bold mr-2">{idx + 1}.</span>{elemento.texto}</p>
                  <div className="flex gap-1.5 shrink-0 self-end md:self-auto">
                    {nivelesKeys.map(nivel => (
                      <div key={nivel} className="w-8 h-8 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400 hover:border-ufv-azul hover:bg-blue-50 hover:text-ufv-azul cursor-default transition-all">{nivel}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function AdminPanel() {
  const router = useRouter();
  
  const [isUploading, setIsUploading] = useState(false);
  const [nombreEspecialidad, setNombreEspecialidad] = useState("");
  const [archivoJSON, setArchivoJSON] = useState<File | null>(null);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [isLoadingEspecialidades, setIsLoadingEspecialidades] = useState(true);

  // ESTADO PARA EL BUSCADOR DE ESPECIALIDADES
  const [busquedaEspecialidad, setBusquedaEspecialidad] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jsonPreview, setJsonPreview] = useState<any>(null);
  const [nombrePreview, setNombrePreview] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [modoVista, setModoVista] = useState<"compacta" | "raw">("compacta");
  
  const [idPreview, setIdPreview] = useState<string>("");
  const [rawText, setRawText] = useState(""); 
  const [isSavingJSON, setIsSavingJSON] = useState(false);

  // ESTADOS PARA EL WIZARD DE PLANTILLAS EXCEL
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | null>(null);
  const [wizardEspecialidadId, setWizardEspecialidadId] = useState("");
  const [wizardEspecialidadNombre, setWizardEspecialidadNombre] = useState("");
  const [excelActionMode, setExcelActionMode] = useState<"new" | "existing">("new");
  const [archivoExcelWizard, setArchivoExcelWizard] = useState<File | null>(null);
  const [isLoadingWizardData, setIsLoadingWizardData] = useState(false);
  const [isSavingWizardMapping, setIsSavingWizardMapping] = useState(false);
  const [wizardRows, setWizardRows] = useState<any[]>([]);
  const [wizardStep3Mode, setWizardStep3Mode] = useState<"visual" | "json">("visual");
  const [mappingExcelJson, setMappingExcelJson] = useState("{}");
  const [excelTemplateStatus, setExcelTemplateStatus] = useState<{ [id: string]: boolean }>({});
  const [especialidadesTab, setEspecialidadesTab] = useState<"json" | "excel" | "mapping">("excel");
  
  // ESTADOS PARA MAPPING GLOBAL
  const [mappingGlobalJson, setMappingGlobalJson] = useState("{}");
  const [isLoadingMappingGlobal, setIsLoadingMappingGlobal] = useState(false);
  const [isSavingMappingGlobal, setIsSavingMappingGlobal] = useState(false);
  const [ucGlobalJson, setUcGlobalJson] = useState("{}");
  const [archivoUcGlobal, setArchivoUcGlobal] = useState<File | null>(null);
  const [isLoadingUcGlobal, setIsLoadingUcGlobal] = useState(false);
  const [isSavingUcGlobal, setIsSavingUcGlobal] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState<number[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);

  // ESTADOS DE ESTADÍSTICAS DE USUARIOS
  const [statsUsuarios, setStatsUsuarios] = useState({ alumnos: 0, profesores: 0, total: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [modalAltaAlumnoAbierto, setModalAltaAlumnoAbierto] = useState(false);

  const fetchUcGlobal = async () => {
    setIsLoadingUcGlobal(true);
    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/unidades-competencia/global`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUcGlobalJson(JSON.stringify(data.uc_json || {}, null, 2));
      } else {
        setUcGlobalJson("{}");
      }
    } catch {
      setUcGlobalJson("{}");
    } finally {
      setIsLoadingUcGlobal(false);
    }
  };

  const guardarUcGlobal = async () => {
    let ucObj: any;
    try {
      ucObj = JSON.parse(ucGlobalJson);
    } catch {
      alert("⚠️ El JSON de UC global no es válido.");
      return;
    }

    setIsSavingUcGlobal(true);
    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/unidades-competencia/global`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(ucObj),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`❌ ${err.detail || "No se pudo guardar UC global"}`);
        return;
      }

      alert("✅ Plantilla UC global guardada correctamente.");
      fetchUcGlobal();
    } catch {
      alert("❌ Error de conexión al guardar UC global.");
    } finally {
      setIsSavingUcGlobal(false);
    }
  };

  const subirArchivoUcGlobal = async () => {
    if (!archivoUcGlobal) {
      alert("⚠️ Selecciona un archivo JSON de UC global.");
      return;
    }

    setIsSavingUcGlobal(true);
    const token = Cookies.get("practicum_token");

    try {
      const text = await archivoUcGlobal.text();
      const ucObj = JSON.parse(text);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/unidades-competencia/global`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(ucObj),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`❌ ${err.detail || "No se pudo subir UC global"}`);
        return;
      }

      alert("✅ Archivo UC global subido correctamente.");
      setArchivoUcGlobal(null);
      fetchUcGlobal();
    } catch {
      alert("❌ Error leyendo/subiendo archivo UC global.");
    } finally {
      setIsSavingUcGlobal(false);
    }
  };

  const fetchEspecialidades = async () => {
    setIsLoadingEspecialidades(true);
    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/especialidades`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEspecialidades(data);
        // Actualizar estado de plantillas
        const statusMap: { [id: string]: boolean } = {};
        for (const esp of data) {
          statusMap[esp.id] = esp.plantilla_excel_storage_path ? true : false;
        }
        setExcelTemplateStatus(statusMap);
      }
    } catch (error) {
      console.error("Error al cargar especialidades", error);
    } finally {
      setIsLoadingEspecialidades(false);
    }
  };

  const fetchStatsUsuarios = async () => {
    setIsLoadingStats(true);
    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/usuarios/stats`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setStatsUsuarios(data);
      } else {
        setStatsUsuarios({ alumnos: 0, profesores: 0, total: 0 });
      }
    } catch (error) {
      console.error("Error al cargar estadísticas", error);
      setStatsUsuarios({ alumnos: 0, profesores: 0, total: 0 });
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchEspecialidades();
    fetchStatsUsuarios();
    fetchMappingGlobal();
    fetchUcGlobal();
  }, []);

  const handleLogout = () => {
    Cookies.remove("practicum_token");
    Cookies.remove("practicum_rol");
    router.push("/login");
  };

  const handleCrearEspecialidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreEspecialidad || !archivoJSON) { alert("⚠️ Debes introducir un nombre y seleccionar un archivo JSON."); return; }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("nombre", nombreEspecialidad);
    formData.append("file", archivoJSON);
    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/especialidades`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        alert("✅ Especialidad y Rúbrica creadas correctamente.");
        setNombreEspecialidad(""); setArchivoJSON(null); fetchEspecialidades();
      } else {
        const errorData = await res.json();
        alert(`❌ Error: ${errorData.detail || "No se pudo crear la especialidad"}`);
      }
    } catch (err) { alert("❌ Error de conexión con el backend."); } finally { setIsUploading(false); }
  };

  const handleEliminarEspecialidad = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${nombre}"?`)) return;
    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/especialidades/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) { alert("✅ Especialidad eliminada."); fetchEspecialidades(); } 
      else { const errorData = await res.json(); alert(`❌ Error: ${errorData.detail || "No se pudo eliminar la especialidad"}`); }
    } catch (error) { alert("❌ Error de conexión con el servidor."); }
  };

  const handleVerPreview = async (id: string, nombre: string) => {
    setIdPreview(id); setNombrePreview(nombre); setIsModalOpen(true); setIsLoadingPreview(true);
    setJsonPreview(null); setRawText(""); setModoVista("compacta");
    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/especialidades/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJsonPreview(data.contenido_json);
        setRawText(JSON.stringify(data.contenido_json, null, 2)); 
      } else { alert("❌ No se pudo cargar el archivo."); setIsModalOpen(false); }
    } catch (error) { alert("❌ Error de conexión."); setIsModalOpen(false); } finally { setIsLoadingPreview(false); }
  };

  const handleGuardarJSON = async () => {
    try {
      const jsonValidado = JSON.parse(rawText);
      setIsSavingJSON(true);
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/especialidades/${idPreview}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(jsonValidado)
      });
      if (res.ok) {
        alert("✅ Archivo JSON actualizado.");
        setJsonPreview(jsonValidado);
      } else {
        const err = await res.json();
        alert(`❌ ${err.detail || "Error al guardar"}`);
      }
    } catch (error) { alert("⚠️ Formato JSON Inválido."); } finally { setIsSavingJSON(false); }
  };

  const parseFilaFromMappingValue = (value: string): string => {
    if (!value || typeof value !== "string") return "";
    const raw = value.trim().toUpperCase();
    const match = raw.match(/([A-Z]+\d+)$/);
    return match ? match[1] : "";
  };

  const normalizeCellRef = (value: string): string => {
    const raw = (value || "").trim().toUpperCase();
    if (!raw) return "";

    const fromFull = raw.match(/(?:[A-Z0-9_]+!)?([A-Z]+\d+)$/);
    if (fromFull) return fromFull[1];

    const onlyDigits = raw.match(/^(\d+)$/);
    if (onlyDigits) return `B${onlyDigits[1]}`;

    return "";
  };

  const fetchMappingGlobal = async () => {
    setIsLoadingMappingGlobal(true);
    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/plantilla-excel/mapping`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMappingGlobalJson(JSON.stringify(data.mapping_json || {}, null, 2));
      } else {
        setMappingGlobalJson("{}");
      }
    } catch {
      console.error("Error al cargar mapping global");
      setMappingGlobalJson("{}");
    } finally {
      setIsLoadingMappingGlobal(false);
    }
  };

  const guardarMappingGlobal = async () => {
    try {
      const mappingObj = JSON.parse(mappingGlobalJson);
      setIsSavingMappingGlobal(true);
      const token = Cookies.get("practicum_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/plantilla-excel/mapping`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(mappingObj)
      });
      if (res.ok) {
        alert("✅ Mapping global guardado correctamente.");
        fetchMappingGlobal();
      } else {
        const err = await res.json();
        alert(`❌ ${err.detail || "No se pudo guardar el mapping"}`);
      }
    } catch {
      alert("⚠️ El JSON de mapeo no es válido.");
    } finally {
      setIsSavingMappingGlobal(false);
    }
  };

  // --- FUNCIONES DEL WIZARD ---

  const cargarWizardEspecialidad = async (especialidadId: string) => {
    setIsLoadingWizardData(true);
    const token = Cookies.get("practicum_token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/especialidades/${especialidadId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Extraer filas de la rúbrica para mapeo visual
        const filasExtraidas: any[] = [];
        const mappingObj = JSON.parse(mappingGlobalJson || "{}");
        if (data.contenido_json && data.contenido_json.apartados) {
          data.contenido_json.apartados.forEach((apartado: any, apartadoIdx: number) => {
            if (apartado.elementos) {
              apartado.elementos.forEach((elemento: any, elementoIdx: number) => {
                filasExtraidas.push({
                  id: elemento.id || `${apartadoIdx}_${elementoIdx}`,
                  texto: elemento.texto,
                  apartado: apartado.titulo,
                  fila: parseFilaFromMappingValue(mappingObj[elemento.id] || "")
                });
              });
            }
          });
        }
        setWizardRows(filasExtraidas);
        // Cargar mapping existente si hay
        setMappingExcelJson(JSON.stringify(mappingObj, null, 2));
      }
    } catch (error) {
      console.error("Error al cargar especialidad para wizard", error);
      alert("❌ No se pudo cargar la especialidad");
    } finally {
      setIsLoadingWizardData(false);
    }
  };

  const construirMappingDesdeWizard = () => {
    // Construir mapping desde los wizardRows con ids reales de rúbrica
    const mappingObj: any = {};
    for (const row of wizardRows) {
      const key = row.id;
      if (!key) continue;
      const normalizedCell = normalizeCellRef(row.fila || "");
      if (!normalizedCell) continue;
      mappingObj[key] = `EVALUACION!${normalizedCell}`;
    }
    return mappingObj;
  };

  const parseMappingExcelJson = (): any => {
    try {
      return JSON.parse(mappingExcelJson);
    } catch {
      throw new Error("JSON de mapeo inválido");
    }
  };

  const guardarWizard = async () => {
    try {
      setIsSavingWizardMapping(true);
      const token = Cookies.get("practicum_token");
      
      let mappingFinal: any;
      if (wizardStep3Mode === "visual") {
        mappingFinal = construirMappingDesdeWizard();
      } else {
        mappingFinal = parseMappingExcelJson();
      }

      // Guardar mapping global
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/plantilla-excel/mapping`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(mappingFinal)
      });

      if (res.ok) {
        alert("✅ Mapping guardado correctamente");
        setMappingGlobalJson(JSON.stringify(mappingFinal, null, 2));
        resetWizard();
      } else {
        const err = await res.json();
        alert(`❌ ${err.detail || "No se pudo guardar el mapping"}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error}`);
    } finally {
      setIsSavingWizardMapping(false);
    }
  };

  const handleSubirPlantillaExcel = async () => {
    if (!wizardEspecialidadId || !archivoExcelWizard) {
      alert("⚠️ Selecciona especialidad y archivo");
      return;
    }
    setIsSavingWizardMapping(true);
    const token = Cookies.get("practicum_token");
    const formData = new FormData();
    formData.append("file", archivoExcelWizard);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/especialidades/${wizardEspecialidadId}/plantilla-excel`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData,
        }
      );

      if (res.ok) {
        alert("✅ Plantilla Excel guardada correctamente");
        setExcelTemplateStatus(prev => ({ ...prev, [wizardEspecialidadId]: true }));
        setArchivoExcelWizard(null);
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.detail || "No se pudo subir la plantilla"}`);
      }
    } catch {
      alert("❌ Error de conexión");
    } finally {
      setIsSavingWizardMapping(false);
    }
  };

  const resetWizard = () => {
    setWizardStep(null);
    setWizardEspecialidadId("");
    setWizardEspecialidadNombre("");
    setExcelActionMode("new");
    setArchivoExcelWizard(null);
    setWizardRows([]);
    setWizardStep3Mode("visual");
    setMappingExcelJson("{}");
  };

  const handleSubirPlantillaYMappingEnSecuencia = async () => {
    if (!wizardEspecialidadId || !archivoExcelWizard) {
      alert("⚠️ Selecciona especialidad y archivo");
      return;
    }

    setIsSavingWizardMapping(true);
    const token = Cookies.get("practicum_token");

    try {
      // 1. Subir plantilla
      const formData = new FormData();
      formData.append("file", archivoExcelWizard);
      const resPlantilla = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/especialidades/${wizardEspecialidadId}/plantilla-excel`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData,
        }
      );

      if (!resPlantilla.ok) {
        const err = await resPlantilla.json();
        throw new Error(err.detail || "No se pudo subir la plantilla");
      }

      // 2. Guardar mapping global
      let mappingFinal: any;
      if (wizardStep3Mode === "visual") {
        mappingFinal = construirMappingDesdeWizard();
      } else {
        mappingFinal = parseMappingExcelJson();
      }

      const resMapping = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/plantilla-excel/mapping`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(mappingFinal)
      });

      if (!resMapping.ok) {
        const err = await resMapping.json();
        throw new Error(err.detail || "No se pudo guardar el mapping");
      }

      alert("✅ Plantilla y mapping guardados correctamente");
      setExcelTemplateStatus(prev => ({ ...prev, [wizardEspecialidadId]: true }));
      setMappingGlobalJson(JSON.stringify(mappingFinal, null, 2));
      resetWizard();
    } catch (error) {
      alert(`❌ Error: ${error}`);
    } finally {
      setIsSavingWizardMapping(false);
    }
  };

  useEffect(() => {
    if (!searchTerm) { setMatches([]); setCurrentMatch(0); return; }
    const regex = new RegExp(searchTerm, 'gi');
    const indices = []; let match;
    while ((match = regex.exec(rawText)) !== null) { indices.push(match.index); }
    setMatches(indices); setCurrentMatch(0);
    if (indices.length > 0) saltarAMatch(0, indices, true); 
  }, [searchTerm, rawText]);

  const saltarAMatch = (index: number, arrayMatches = matches, isTyping = false) => {
    if (!textareaRef.current || arrayMatches.length === 0) return;
    const target = arrayMatches[index]; const textarea = textareaRef.current;
    textarea.focus();
    textarea.setSelectionRange(target, target + searchTerm.length);
    const textoHastaPalabra = rawText.substring(0, target);
    const lineas = textoHastaPalabra.split('\n');
    const ALTO_LINEA = 20; const ANCHO_LETRA = 8.4;
    textarea.scrollTop = (lineas.length * ALTO_LINEA) - (textarea.clientHeight / 2);
    textarea.scrollLeft = (lineas[lineas.length - 1].length * ANCHO_LETRA) - (textarea.clientWidth / 2);
    if (isTyping && searchInputRef.current) { setTimeout(() => { searchInputRef.current?.focus(); }, 10); }
    setCurrentMatch(index);
  };

  // FILTRO DINÁMICO DE ESPECIALIDADES
  const especialidadesFiltradas = especialidades.filter(esp => 
    esp.nombre.toLowerCase().includes(busquedaEspecialidad.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 relative">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex items-center gap-4">
            <Image src="/logo-ufv.png" alt="Logo UFV" width={56} height={56} className="object-contain" />
            <div>
              <h1 className="text-3xl font-black text-ufv-azul-oscuro">Panel de Administración</h1>
              <p className="text-xs font-bold text-ufv-rosa-oscuro uppercase tracking-widest mt-1">Universidad Francisco de Vitoria</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-white text-red-600 px-5 py-2.5 rounded-xl font-bold border border-red-200 hover:bg-red-50 transition-all shadow-sm active:scale-95"><LogOut className="w-4 h-4" /> Cerrar sesión</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* GESTIÓN DE ESPECIALIDADES */}
          <div className="bg-ufv-blanco p-8 rounded-3xl shadow-xl border-t-4 border-ufv-azul relative flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-50 p-2.5 rounded-xl text-ufv-azul"><Settings className="w-6 h-6" /></div>
              <h2 className="text-xl font-black text-ufv-azul-oscuro">Gestión de Especialidades</h2>
            </div>

            <div className="mb-5 bg-gray-50 border border-gray-200 rounded-2xl p-1 grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setEspecialidadesTab("json")}
                className={`py-2.5 rounded-xl text-sm font-black transition-all ${especialidadesTab === "json" ? "bg-white text-ufv-azul shadow-sm border border-blue-100" : "text-gray-500 hover:text-gray-700"}`}
              >
                Rúbrica JSON
              </button>
              <button
                type="button"
                onClick={() => setEspecialidadesTab("mapping")}
                className={`py-2.5 rounded-xl text-sm font-black transition-all ${especialidadesTab === "mapping" ? "bg-white text-ufv-azul shadow-sm border border-blue-100" : "text-gray-500 hover:text-gray-700"}`}
              >
                Mapping Global
              </button>
              <button
                type="button"
                onClick={() => setEspecialidadesTab("excel")}
                className={`py-2.5 rounded-xl text-sm font-black transition-all ${especialidadesTab === "excel" ? "bg-white text-ufv-azul shadow-sm border border-blue-100" : "text-gray-500 hover:text-gray-700"}`}
              >
                Plantilla Excel
              </button>
            </div>
            
            {especialidadesTab === "json" && (
            <form onSubmit={handleCrearEspecialidad} className="space-y-4 border-t border-gray-100 pt-6">
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre de la Especialidad</label>
                  <input type="text" required value={nombreEspecialidad} onChange={e => setNombreEspecialidad(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:border-ufv-azul outline-none transition-all" />
              </div>
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Archivo Actividades NIC (.json)</label>
                  <input type="file" accept=".json" required onChange={e => setArchivoJSON(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-ufv-azul hover:file:bg-blue-100 cursor-pointer" />
              </div>
              <button type="submit" disabled={isUploading} className={`w-full mt-4 px-5 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm border ${isUploading ? "bg-gray-100 text-gray-400 border-gray-200" : "bg-ufv-azul text-white hover:bg-ufv-azul-oscuro"}`}>
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileJson className="w-5 h-5" />} {isUploading ? "Guardando..." : "Crear Especialidad (NIC)"}
              </button>
            </form>
            )}

            {especialidadesTab === "mapping" && (
            <div className="space-y-4 border-t border-gray-100 pt-6">
              <div>
                <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                  <Code2 className="w-4 h-4" /> Mapping Global (Compartido)
                </h3>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  Configura aquí el mapping único que se reutilizará para <strong>TODAS</strong> las especialidades. 
                  Cada especialidad tendrá su propia plantilla Excel, pero todas usarán este mapping.
                </p>
              </div>

              {isLoadingMappingGlobal ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-ufv-azul" />
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">Plantilla global de unidades de competencia</h4>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => setArchivoUcGlobal(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={subirArchivoUcGlobal}
                      disabled={!archivoUcGlobal || isSavingUcGlobal}
                      className="w-full px-4 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isSavingUcGlobal ? "Subiendo UC..." : "Subir JSON UC Global"}
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2">JSON actual UC global</h4>
                    {isLoadingUcGlobal ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-ufv-azul" />
                      </div>
                    ) : (
                      <textarea
                        value={ucGlobalJson}
                        onChange={(e) => setUcGlobalJson(e.target.value)}
                        placeholder='{"apartados":[],"niveles":{}}'
                        className="w-full min-h-64 border border-gray-200 rounded-xl bg-gray-50 p-4 text-xs font-mono outline-none focus:border-ufv-azul focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                        spellCheck={false}
                      />
                    )}
                    <button
                      type="button"
                      onClick={guardarUcGlobal}
                      disabled={isSavingUcGlobal}
                      className={`mt-3 w-full px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${isSavingUcGlobal ? "bg-gray-100 text-gray-400 border border-gray-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                    >
                      {isSavingUcGlobal ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      {isSavingUcGlobal ? "Guardando UC..." : "Guardar UC Global"}
                    </button>
                  </div>

                  <textarea
                    value={mappingGlobalJson}
                    onChange={(e) => setMappingGlobalJson(e.target.value)}
                    placeholder='{"a1_01":"EVALUACION!B5","a1_02":"EVALUACION!B6"}'
                    className="w-full min-h-96 border border-gray-200 rounded-xl bg-gray-50 p-4 text-xs font-mono outline-none focus:border-ufv-azul focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                    spellCheck={false}
                  />
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs text-blue-800 font-medium leading-relaxed">
                      <strong>Formato esperado:</strong> Un objeto JSON con claves por indicador y valores tipo <span className="font-mono bg-blue-100 px-1 rounded">"EVALUACION!B86"</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={guardarMappingGlobal}
                    disabled={isSavingMappingGlobal}
                    className={`w-full px-5 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${isSavingMappingGlobal ? "bg-gray-100 text-gray-400 border border-gray-200" : "bg-ufv-azul text-white hover:bg-ufv-azul-oscuro active:scale-95"}`}
                  >
                    {isSavingMappingGlobal ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSavingMappingGlobal ? "Guardando..." : "Guardar Mapping Global"}
                  </button>
                </>
              )}
            </div>
            )}

            {especialidadesTab === "excel" && !wizardStep && (
            <div className="space-y-4 border-t border-gray-100 pt-6">
              <div>
                <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" /> Estado de Plantillas por Especialidad
                </h3>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  Visualiza qué especialidades tienen plantilla Excel por especialidad configurada.
                </p>
              </div>

              <div className="space-y-3">
                {isLoadingEspecialidades ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-ufv-azul" />
                  </div>
                ) : (
                  especialidades.map((esp) => (
                    <div key={esp.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-ufv-azul hover:bg-blue-50/30 transition-all group">
                      <div className="flex items-center gap-3 flex-1">
                        {excelTemplateStatus[esp.id] ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm truncate">{esp.nombre}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <span className="text-xs text-gray-500">
                              {excelTemplateStatus[esp.id] ? "✅ Plantilla presente" : "❌ Sin plantilla"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setWizardEspecialidadId(esp.id);
                          setWizardEspecialidadNombre(esp.nombre);
                          setWizardStep(2);
                          cargarWizardEspecialidad(esp.id);
                        }}
                        className="ml-2 flex items-center gap-1 px-4 py-2.5 bg-ufv-azul text-white rounded-lg font-bold text-sm hover:bg-ufv-azul-oscuro transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Edit3 className="w-4 h-4" /> Configurar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            )}

            {especialidadesTab === "excel" && wizardStep && (
            <div className="space-y-4 border-t border-gray-100 pt-6">
              {/* --- WIZARD UI --- */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-gray-800">Configurar Plantilla Excel</h3>
                  <p className="text-xs text-gray-500 mt-1">Especialidad: <span className="font-bold text-ufv-azul">{wizardEspecialidadNombre}</span></p>
                </div>
                <button
                  onClick={resetWizard}
                  className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* INDICADOR DE PASO */}
              <div className="flex gap-2 mb-6">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      step <= (wizardStep || 0)
                        ? step === wizardStep
                          ? "bg-ufv-azul"
                          : "bg-blue-200"
                        : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>

              {/* PASO 1: SELECCIONAR ESPECIALIDAD */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-800">Paso 1: Seleccionar Especialidad</h4>
                  <p className="text-sm text-gray-600">Ya seleccionada: <span className="font-bold">{wizardEspecialidadNombre}</span></p>
                  <button
                    onClick={() => {
                      setExcelActionMode("new");
                      setWizardStep(2);
                    }}
                    className="w-full flex items-center justify-between p-4 bg-ufv-azul text-white rounded-xl hover:bg-ufv-azul-oscuro transition-all shadow-sm"
                  >
                    <span className="font-bold">Continuar</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* PASO 2: ELEGIR MODO */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-800">Paso 2: Elegir Acción</h4>
                  <p className="text-sm text-gray-600 mb-4">¿Qué deseas hacer con la plantilla?</p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => {
                        setExcelActionMode("new");
                        setWizardStep(3);
                      }}
                      className="p-4 border-2 border-gray-200 rounded-xl hover:border-ufv-azul hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="flex items-start gap-3">
                        <Upload className="w-5 h-5 text-ufv-azul mt-0.5" />
                        <div>
                          <p className="font-bold text-gray-800">Subir Nueva Plantilla</p>
                          <p className="text-xs text-gray-500 mt-1">Selecciona un archivo Excel para esta especialidad</p>
                        </div>
                      </div>
                    </button>

                    {excelTemplateStatus[wizardEspecialidadId] && (
                      <button
                        onClick={() => {
                          setExcelActionMode("existing");
                          setWizardStep(3);
                        }}
                        className="p-4 border-2 border-gray-200 rounded-xl hover:border-ufv-azul hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="flex items-start gap-3">
                          <Eye className="w-5 h-5 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-bold text-gray-800">Usar Plantilla Existente</p>
                            <p className="text-xs text-gray-500 mt-1">Mapear la plantilla actual a la rúbrica</p>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setWizardStep(1)}
                    className="w-full p-3 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 font-bold text-sm"
                  >
                    ← Atrás
                  </button>
                </div>
              )}

              {/* PASO 3: MAPEO O SUBIDA */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-800">
                    {excelActionMode === "new" ? "Paso 3: Subir Plantilla" : "Paso 3: Mapear Plantilla"}
                  </h4>

                  {excelActionMode === "new" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Selecciona archivo Excel</label>
                        <input
                          type="file"
                          accept=".xlsx"
                          onChange={(e) => setArchivoExcelWizard(e.target.files?.[0] || null)}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-ufv-azul hover:file:bg-blue-100"
                        />
                        {archivoExcelWizard && (
                          <p className="text-xs text-green-600 font-bold mt-2">✅ {archivoExcelWizard.name}</p>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          if (archivoExcelWizard) {
                            setWizardStep(4);
                          } else {
                            alert("⚠️ Selecciona un archivo");
                          }
                        }}
                        className="w-full p-3 bg-ufv-azul text-white rounded-xl font-bold hover:bg-ufv-azul-oscuro transition-all"
                      >
                        Continuar → Mapeo
                      </button>
                    </div>
                  )}

                  {excelActionMode === "existing" && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">Mapea los elementos de la rúbrica a las filas del Excel</p>
                      
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => setWizardStep3Mode("visual")}
                          className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                            wizardStep3Mode === "visual"
                              ? "bg-ufv-azul text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          <Zap className="w-4 h-4 inline mr-1" /> Visual
                        </button>
                        <button
                          onClick={() => setWizardStep3Mode("json")}
                          className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                            wizardStep3Mode === "json"
                              ? "bg-gray-800 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          <Code2 className="w-4 h-4 inline mr-1" /> JSON
                        </button>
                      </div>

                      {wizardStep3Mode === "visual" && (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          {isLoadingWizardData ? (
                            <div className="flex justify-center py-6">
                              <Loader2 className="w-6 h-6 animate-spin text-ufv-azul" />
                            </div>
                          ) : wizardRows.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-6">No hay elementos para mapear</p>
                          ) : (
                            wizardRows.map((row, idx) => (
                              <div key={row.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <p className="text-xs text-gray-600 font-bold mb-1">{row.apartado}</p>
                                <p className="text-sm text-gray-800 mb-2 font-medium">{row.texto}</p>
                                <input
                                  type="text"
                                  value={row.fila || ""}
                                  onChange={(e) => {
                                    const newRows = [...wizardRows];
                                    newRows[idx].fila = e.target.value;
                                    setWizardRows(newRows);
                                  }}
                                  placeholder="ej: B86, B87..."
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-ufv-azul focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {wizardStep3Mode === "json" && (
                        <textarea
                          value={mappingExcelJson}
                          onChange={(e) => setMappingExcelJson(e.target.value)}
                          placeholder='{"a1_01":"B5","a1_02":"B6"}'
                          className="w-full min-h-64 p-3 border border-gray-200 rounded-lg bg-gray-50 font-mono text-sm focus:border-ufv-azul outline-none"
                        />
                      )}

                      <button
                        onClick={() => setWizardStep(4)}
                        className="w-full p-3 bg-ufv-azul text-white rounded-xl font-bold hover:bg-ufv-azul-oscuro transition-all"
                      >
                        Continuar → Resumen
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setWizardStep(2)}
                    className="w-full p-3 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 font-bold text-sm"
                  >
                    ← Atrás
                  </button>
                </div>
              )}

              {/* PASO 4: RESUMEN Y GUARDAR */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-800">Paso 4: Resumen y Guardar</h4>

                  {excelActionMode === "new" && archivoExcelWizard && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-sm font-bold text-green-800">📄 Archivo a subir:</p>
                      <p className="text-xs text-green-700 mt-1">{archivoExcelWizard.name}</p>
                    </div>
                  )}

                  {excelActionMode === "existing" && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-sm font-bold text-blue-800">Mapping configurado:</p>
                      <p className="text-xs text-blue-700 mt-1 font-mono">
                        {wizardStep3Mode === "visual"
                          ? `${wizardRows.filter(r => r.fila).length} elementos mapeados`
                          : "JSON validado"}
                      </p>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                    <p className="text-xs font-bold text-amber-900">💡 Nota:</p>
                    <p className="text-xs text-amber-800 mt-1">
                      El mapping se guardará de forma global y se aplicará automáticamente a todas las especialidades.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setWizardStep(3)}
                      className="flex-1 p-3 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 font-bold text-sm"
                    >
                      ← Atrás
                    </button>
                    <button
                       onClick={async () => {
                         if (excelActionMode === "new" && archivoExcelWizard) {
                           await handleSubirPlantillaYMappingEnSecuencia();
                         } else if (excelActionMode === "existing") {
                           await guardarWizard();
                         }
                       }}
                      disabled={isSavingWizardMapping}
                      className={`flex-1 p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        isSavingWizardMapping
                          ? "bg-gray-100 text-gray-400"
                          : "bg-ufv-azul text-white hover:bg-ufv-azul-oscuro"
                      }`}
                    >
                      {isSavingWizardMapping ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isSavingWizardMapping ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 flex-1 flex flex-col">
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Especialidades Activas</h3>
              
              {/* BUSCADOR DE LA LISTA */}
              <div className="mb-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar especialidad..." 
                  value={busquedaEspecialidad}
                  onChange={(e) => setBusquedaEspecialidad(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-ufv-azul transition-all"
                />
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 flex flex-col h-52 overflow-hidden shrink-0">
                {isLoadingEspecialidades ? (
                  <div className="flex justify-center items-center p-6"><Loader2 className="w-6 h-6 animate-spin text-ufv-azul" /></div>
                ) : especialidadesFiltradas.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm font-medium">No se encontraron especialidades.</div>
                ) : (
                  <ul className="overflow-y-auto p-2">
                    {especialidadesFiltradas.map((esp) => (
                      <li key={esp.id} className="flex items-center justify-between gap-3 p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200">
                        <div className="flex items-center gap-3 truncate">
                          <div className="bg-blue-100 p-1.5 rounded-md text-ufv-azul"><Tag className="w-4 h-4" /></div>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-700 text-sm truncate block">{esp.nombre}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleVerPreview(esp.id, esp.nombre)} className="p-2 text-gray-400 hover:text-ufv-azul hover:bg-blue-50 rounded-lg transition-all"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => handleEliminarEspecialidad(esp.id, esp.nombre)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* MÓDULO 2: GESTIÓN DE USUARIOS */}
          <div className="bg-ufv-blanco p-8 rounded-3xl shadow-xl border-t-4 border-ufv-azul flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-50 p-2.5 rounded-xl text-ufv-azul"><Users className="w-6 h-6" /></div>
              <h2 className="text-xl font-black text-ufv-azul-oscuro">Gestión de Usuarios</h2>
            </div>
            
            <p className="text-gray-500 font-medium mb-6 leading-relaxed">
              Administra las cuentas de acceso al sistema. Da de alta a nuevos docentes y matricula a los estudiantes en sus rotaciones correspondientes.
            </p>
            
            {/* --- PANEL DE ESTADÍSTICAS (AHORA DINÁMICO) --- */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gray-50/80 border border-gray-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all ">
                <GraduationCap className="w-6 h-6 text-ufv-azul mb-2 opacity-70" />
                <span className="text-3xl font-black text-gray-800">
                  {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /> : statsUsuarios.alumnos}
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Alumnos</span>
              </div>
              
              <div className="bg-gray-50/80 border border-gray-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all ">
                <UserPlus className="w-6 h-6 text-ufv-azul mb-2 opacity-70" />
                <span className="text-3xl font-black text-gray-800">
                  {isLoadingStats ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /> : statsUsuarios.profesores}
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Profesores</span>
              </div>

              <div className="col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl text-ufv-azul shadow-sm"><Users className="w-5 h-5" /></div>
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Total Cuentas Activas</span>
                </div>
                <span className="text-2xl font-black text-ufv-azul-oscuro">
                  {isLoadingStats ? <Loader2 className="w-5 h-5 animate-spin text-ufv-azul" /> : statsUsuarios.total-1}
                </span>
              </div>
            </div>
            {/* --------------------------------------------- */}

            {/* --- BOTONES DE GESTIÓN DE USUARIOS --- */}
            <div className="flex flex-col gap-3 mt-8">
              {/* Fila 1: Botones de CREAR TUTORES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  onClick={() => router.push("/admin/profesores/nuevo?tipo=hospital")} 
                  className="bg-ufv-azul text-white px-4 py-3.5 rounded-xl shadow-md hover:bg-ufv-azul-oscuro font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all text-xs"
                >
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Nuevo Tutor
                  </div>
                  <span className="opacity-80 text-[10px] uppercase">Hospital</span>
                </button>

                <button 
                  onClick={() => router.push("/admin/profesores/nuevo?tipo=universidad")} 
                  className="bg-ufv-azul text-white px-4 py-3.5 rounded-xl shadow-md hover:bg-ufv-azul-oscuro font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all text-xs"
                >
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Nuevo Tutor
                  </div>
                  <span className="opacity-80 text-[10px] uppercase">Universidad</span>
                </button>
              </div>

              {/* Fila 2: Alumnos */}
              <button 
                onClick={() => setModalAltaAlumnoAbierto(true)} 
                className="w-full bg-ufv-azul-oscuro text-white px-4 py-3.5 rounded-xl shadow-md hover:bg-ufv-azul font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <GraduationCap className="w-5 h-5" /> Nuevo Alumno
              </button>
              
              {/* Fila 3: Ver Listas */}
              <div className="flex flex-col sm:flex-row gap-3 mt-1">
                <button onClick={() => router.push("/admin/profesores")} className="flex-1 bg-blue-50 text-ufv-azul border border-blue-100 px-4 py-3.5 rounded-xl hover:bg-blue-100 font-bold flex items-center justify-center gap-2 transition-all">
                  <Users className="w-4 h-4" /> Ver Profesores
                </button>
                <button onClick={() => router.push("/admin/alumnos")} className="flex-1 bg-blue-50 text-ufv-azul border border-blue-100 px-4 py-3.5 rounded-xl hover:bg-blue-100 font-bold flex items-center justify-center gap-2 transition-all">
                  <GraduationCap className="w-4 h-4" /> Ver Alumnos
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL DE PREVISUALIZACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm shadow-2xl">
          <div className="bg-white rounded-3xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-ufv-azul p-2 rounded-xl"><FileJson className="w-5 h-5" /></div>
                <div><h3 className="text-lg font-black text-gray-800">Previsualización de Rúbrica</h3><p className="text-xs text-gray-500 font-bold">{nombrePreview}</p></div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><X className="w-6 h-6" /></button>
            </div>

            <div className="bg-white border-b border-gray-100 px-6 py-3 flex justify-between items-center gap-4 flex-wrap">
              <div className="flex gap-2">
                <button onClick={() => setModoVista("compacta")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${modoVista === "compacta" ? "bg-blue-50 text-ufv-azul border border-blue-100" : "text-gray-500 hover:bg-gray-50"}`}><Clapperboard className="w-4 h-4" /> Vista de Evaluación</button>
                <button onClick={() => { setModoVista("raw"); setSearchTerm(""); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${modoVista === "raw" ? "bg-gray-800 text-white border border-gray-900" : "text-gray-500 hover:bg-gray-50"}`}><Code2 className="w-4 h-4" /> Código Raw (JSON)</button>
              </div>
              {modoVista === "raw" && (
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 focus-within:border-ufv-azul focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input ref={searchInputRef} type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saltarAMatch(currentMatch < matches.length - 1 ? currentMatch + 1 : 0); } }} className="bg-transparent border-none outline-none text-sm text-gray-800 w-48 placeholder:text-gray-400" />
                  {matches.length > 0 ? (
                    <div className="flex items-center gap-1 border-l border-gray-300 pl-2 ml-1">
                      <span className="text-[10px] text-gray-500 font-bold mr-1 w-8 text-center">{currentMatch + 1}/{matches.length}</span>
                      <button onClick={() => saltarAMatch(currentMatch > 0 ? currentMatch - 1 : matches.length - 1)} className="p-1 hover:bg-gray-200 rounded text-gray-600"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => saltarAMatch(currentMatch < matches.length - 1 ? currentMatch + 1 : 0)} className="p-1 hover:bg-gray-200 rounded text-gray-600"><ChevronDown className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : searchTerm ? <span className="text-[10px] text-red-500 font-bold ml-2">0/0</span> : null}
                </div>
              )}
            </div>

            <div className={`p-6 overflow-y-auto flex-1 relative ${modoVista === "raw" ? "bg-[#1e1e1e] p-0" : "bg-gray-50/50"}`}>
              {isLoadingPreview ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-10"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /><p className="text-gray-400 font-medium text-sm">Leyendo rúbrica...</p></div>
              ) : jsonPreview ? (
                modoVista === "raw" ? (
                  <textarea ref={textareaRef} wrap="off" value={rawText} onChange={(e) => setRawText(e.target.value)} className="w-full h-full min-h-[60vh] bg-[#1e1e1e] text-green-400 font-mono text-sm p-6 outline-none resize-none focus:ring-2 focus:ring-inset focus:ring-ufv-azul transition-all overflow-auto" spellCheck="false" />
                ) : <RenderizadorEvaluacionCompacta data={jsonPreview} />
              ) : <div className="text-center text-gray-500 py-10 font-medium">El archivo JSON está vacío o no se pudo leer.</div>}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center">
              {modoVista === "raw" ? (
                <button onClick={handleGuardarJSON} disabled={isSavingJSON} className={`px-6 py-2.5 font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm ${isSavingJSON ? 'bg-gray-200 text-gray-500' : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'}`}>{isSavingJSON ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {isSavingJSON ? "Guardando..." : "Guardar JSON"}</button>
              ) : <div></div>}
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold rounded-xl transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <ModalTipoAltaAlumno
        isOpen={modalAltaAlumnoAbierto}
        onClose={() => setModalAltaAlumnoAbierto(false)}
        onManual={() => router.push("/admin/alumnos/nuevo")}
        onExcel={() => router.push("/admin/alumnos/importar")}
      />
    </div>
  );
}