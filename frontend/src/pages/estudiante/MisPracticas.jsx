import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiFileText,
  FiSearch,
  FiUpload,
  FiArrowLeft,
  FiInfo,
} from 'react-icons/fi';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

const formatCountdown = (targetDate, nowDate) => {
  const diff = new Date(targetDate).getTime() - nowDate.getTime();
  if (diff <= 0) return 'Cerrada';
  const sec = Math.floor(diff / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m`;
};

const estadoVentanaLabel = {
  abierta: 'Abierta',
  proxima: 'Proximamente',
  cerrada: 'Cerrada',
};

const estadoVentanaClass = {
  abierta: 'bg-emerald-100 text-emerald-800',
  proxima: 'bg-amber-100 text-amber-800',
  cerrada: 'bg-gray-100 text-gray-700',
};

const estadoEntregaClass = {
  pendiente: 'bg-sky-100 text-sky-800',
  tarde: 'bg-amber-100 text-amber-800',
  calificada: 'bg-emerald-100 text-emerald-800',
  sin_entrega: 'bg-gray-100 text-gray-700',
};

const colorNota = (nota) => {
  if (nota === null || nota === undefined) return 'text-gray-500';
  if (nota >= 7) return 'text-emerald-700';
  if (nota >= 5) return 'text-amber-700';
  return 'text-rose-700';
};

const MisPracticas = () => {
  const [searchParams] = useSearchParams();
  const requestedTipo = searchParams.get('tipo');

  const [practicas, setPracticas] = useState(null);
  const [tareas, setTareas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [archivoTarea, setArchivoTarea] = useState({});
  const [subiendoTareaId, setSubiendoTareaId] = useState(null);
  const [ahora, setAhora] = useState(new Date());
  const [cicloActivo, setCicloActivo] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [tareaSeleccionadaId, setTareaSeleccionadaId] = useState(null);
  const [preview, setPreview] = useState({ open: false, url: '', nombre: '' });
  const [editandoEntregas, setEditandoEntregas] = useState({});

  const getFileIcon = (nombreArchivo) => {
    if (!nombreArchivo) return <FiFileText className="h-8 w-8 text-slate-400 flex-shrink-0" />;
    const ext = '.' + nombreArchivo.split('.').pop().toLowerCase();
    if (ext === '.pdf') {
      return <FiFileText className="h-8 w-8 text-rose-600 flex-shrink-0" />;
    } else if (ext === '.xls' || ext === '.xlsx') {
      return <FiFileText className="h-8 w-8 text-emerald-600 flex-shrink-0" />;
    } else if (ext === '.doc' || ext === '.docx') {
      return <FiFileText className="h-8 w-8 text-blue-600 flex-shrink-0" />;
    }
    return <FiFileText className="h-8 w-8 text-slate-500 flex-shrink-0" />;
  };

  const handleArchivoChange = (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Límite de tamaño: 20MB
    const limit = 20 * 1024 * 1024;
    if (file.size > limit) {
      setMensaje({
        tipo: 'error',
        texto: 'El archivo es demasiado grande. El tamaño máximo permitido es 20MB.',
      });
      e.target.value = null; // Reset input
      return;
    }

    // Extensión permitida
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setMensaje({
        tipo: 'error',
        texto: 'Formato de archivo no permitido. Solo se aceptan archivos PDF, DOC, DOCX, XLS y XLSX.',
      });
      e.target.value = null;
      return;
    }

    setArchivoTarea((prev) => ({
      ...prev,
      [key]: file,
    }));
    setMensaje({ tipo: '', texto: '' }); // Limpiar errores
  };

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (preview.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview.url]);

  const cargarDatos = async () => {
    setCargando(true);
    setMensaje({ tipo: '', texto: '' });
    try {
      const params = {};
      if (requestedTipo) {
        params.tipo = requestedTipo;
      }
      const [prRes, tareasRes] = await Promise.all([
        api.get('/estudiante/mis-practicas', { params }),
        api.get('/estudiante/tareas', { params }),
      ]);
      setPracticas(prRes.data.data || null);
      setTareas(tareasRes.data.data || []);
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.message || error.message || 'Error al cargar el modulo de ciclos.',
      });
      setPracticas(null);
      setTareas([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [requestedTipo]);

  const inscripcionActiva = useMemo(() => {
    if (!practicas) return null;
    if (requestedTipo) {
      return (practicas.inscripciones || []).find((i) => i.tipoPractica === requestedTipo) || null;
    }
    if (practicas.inscripcion?.activa) return practicas.inscripcion;
    return (practicas.inscripciones || []).find((i) => i.activa) || null;
  }, [practicas, requestedTipo]);

  const esSoloLectura = useMemo(() => {
    if (!inscripcionActiva) return false;
    if (requestedTipo && requestedTipo !== practicas?.inscripcion?.tipoPractica) {
      return true;
    }
    if (inscripcionActiva.activa === false) {
      return true;
    }
    if (practicas?.estadoProceso === 'finalizado') {
      return true;
    }
    return false;
  }, [inscripcionActiva, requestedTipo, practicas]);

  const tareasFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return tareas;
    return tareas.filter((t) => {
      const base = `${t.codigo || ''} ${t.titulo || ''} ${t.descripcion || ''}`.toLowerCase();
      return base.includes(term);
    });
  }, [tareas, busqueda]);

  const tareasPorCiclo = useMemo(() => {
    const grupos = { 1: [], 2: [], 3: [] };
    for (const t of tareasFiltradas) {
      const ciclo = Number(t.numeroCiclo);
      if (!grupos[ciclo]) grupos[ciclo] = [];
      grupos[ciclo].push(t);
    }
    return grupos;
  }, [tareasFiltradas]);

  const promediosCiclo = useMemo(() => {
    const result = { 1: null, 2: null, 3: null };
    [1, 2, 3].forEach((c) => {
      const calificadas = (tareasPorCiclo[c] || []).filter(
        (t) => t.entrega && t.entrega.nota !== null && t.entrega.nota !== undefined
      );
      if (!calificadas.length) return;
      const sum = calificadas.reduce((acc, t) => acc + Number(t.entrega.nota), 0);
      result[c] = Math.round((sum / calificadas.length) * 100) / 100;
    });
    return result;
  }, [tareasPorCiclo]);

  const promBaseLocal = useMemo(() => {
    const p1 = promediosCiclo[1];
    const p2 = promediosCiclo[2];
    if (p1 === null || p2 === null) return null;
    return Math.round(((p1 + p2) / 2 + Number.EPSILON) * 100) / 100;
  }, [promediosCiclo]);

  const promSupLocal = useMemo(() => {
    const base = promBaseLocal;
    const supTask = promediosCiclo[3];
    if (base === null || supTask === null) return null;
    return Math.round(((base + supTask) / 2 + Number.EPSILON) * 100) / 100;
  }, [promBaseLocal, promediosCiclo]);

  useEffect(() => {
    if (!tareasFiltradas.length) {
      setTareaSeleccionadaId(null);
      return;
    }

    const tareasActivas = tareasPorCiclo[cicloActivo] || [];
    if (tareasActivas.length > 0) {
      const seleccionEnCiclo = tareasActivas.some((t) => t.id === tareaSeleccionadaId);
      if (!seleccionEnCiclo) {
        setTareaSeleccionadaId(tareasActivas[0].id);
        return;
      }
    }

    const existeSeleccion = tareasFiltradas.some((t) => t.id === tareaSeleccionadaId);
    if (existeSeleccion) return;

    const primeraCiclo = tareasActivas[0];
    setTareaSeleccionadaId(primeraCiclo ? primeraCiclo.id : tareasFiltradas[0].id);
  }, [tareasFiltradas, tareasPorCiclo, cicloActivo, tareaSeleccionadaId]);

  const tareaSeleccionada = useMemo(
    () => tareas.find((t) => t.id === tareaSeleccionadaId) || null,
    [tareas, tareaSeleccionadaId]
  );

  const descargarBlob = (blob, nombre) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nombre);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const descargarEntrega = async (entregaId, nombreArchivo) => {
    try {
      const response = await api.get(`/estudiante/entregas/${entregaId}/descargar`, {
        responseType: 'blob',
      });
      const type = response.headers['content-type'] || 'application/octet-stream';
      descargarBlob(new Blob([response.data], { type }), nombreArchivo || `entrega-${entregaId}`);
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.message || 'No se pudo descargar la entrega.',
      });
    }
  };

  const verEntrega = async (entregaId, nombreArchivo) => {
    try {
      const response = await api.get(`/estudiante/entregas/${entregaId}/preview`, {
        responseType: 'blob',
      });
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });

      if (!contentType.includes('pdf')) {
        descargarBlob(blob, nombreArchivo || `entrega-${entregaId}`);
        return;
      }

      if (preview.url) URL.revokeObjectURL(preview.url);
      const url = URL.createObjectURL(blob);
      setPreview({
        open: true,
        url,
        nombre: nombreArchivo || `entrega-${entregaId}.pdf`,
      });
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.message || 'No se pudo abrir la vista previa.',
      });
    }
  };

  const subirEntrega = async (tareaId, subTarea = null) => {
    const key = subTarea ? `${tareaId}-${subTarea}` : tareaId;
    const archivo = archivoTarea[key];
    if (!archivo) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un archivo antes de subir la entrega.' });
      return;
    }

    try {
      setSubiendoTareaId(key);
      const formData = new FormData();
      formData.append('archivo', archivo);
      if (subTarea) {
        formData.append('subTarea', subTarea);
      }
      await api.post(`/estudiante/tareas/${tareaId}/entregar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMensaje({ tipo: 'success', texto: 'Entrega subida correctamente.' });
      await cargarDatos();
      setArchivoTarea((prev) => ({ ...prev, [key]: null }));
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.message || error.message || 'Error al subir entrega.',
      });
    } finally {
      setSubiendoTareaId(null);
    }
  };

  const mensajeBloqueoEntrega = (tarea) => {
    if (!tarea) return 'Entrega no disponible.';
    if (tarea.entrega?.estado === 'calificada') return 'Tu entrega ya fue calificada. No puedes reemplazarla.';
    if (tarea.estadoVentana === 'proxima') return 'La tarea aun no esta habilitada para entrega.';
    if (tarea.estadoVentana === 'cerrada') return 'La ventana de entrega ya cerro.';
    return 'Entrega no disponible.';
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '---';
    return new Intl.DateTimeFormat('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(fecha));
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </div>
    );
  }

  if (!inscripcionActiva) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-wider mb-2">No tienes una inscripción activa</h2>
            <p className="text-xs font-semibold text-slate-550 mb-6">
              Para participar en ciclos académicos y subir tus tareas, primero debes estar inscrito en una modalidad de prácticas preprofesionales.
            </p>
            <Link
              to="/estudiante/inscripcion"
              className="btn btn-primary"
            >
              Ir a Inscripciones
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Barra de Navegación Rápida */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-[10px] font-black text-slate-550 hover:text-[#ec3724] transition-colors uppercase tracking-widest bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 w-fit"
          >
            <FiArrowLeft className="h-3.5 w-3.5" /> Volver al Dashboard
          </Link>
          <Link
            to={requestedTipo ? `/estudiante/calificaciones?tipo=${requestedTipo}` : "/estudiante/calificaciones"}
            className="inline-flex items-center gap-2 text-[10px] font-black text-[#ec3724] hover:text-[#d32010] transition-colors uppercase tracking-widest bg-white px-4 py-2 rounded-lg shadow-sm border border-rose-100 hover:border-rose-200 w-fit"
          >
            <FiBookOpen className="h-3.5 w-3.5" /> Ver Calificaciones
          </Link>
        </div>

        {esSoloLectura && (
          <div className="bg-white border-l-4 border-amber-500 rounded-lg p-4 flex items-start gap-3 shadow-sm">
            <FiInfo className="h-5 w-5 text-amber-555 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Vista de Solo Lectura — Prácticas {requestedTipo === 'comunitaria' ? 'Comunitarias' : 'Laborales'} Acreditadas
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                Este ciclo se encuentra validado y finalizado académicamente por la institución. Las entregas y modificaciones de archivos están inhabilitadas.
              </p>
            </div>
          </div>
        )}

        {/* Encabezado General del Módulo */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-450 tracking-widest block">
              {esSoloLectura ? 'Práctica Acreditada (Historial)' : 'Matrícula de Prácticas Activa'}
            </span>
            <h1 className="text-xl font-black text-slate-900 mt-1 uppercase tracking-wide">
              {inscripcionActiva.convenio?.nombreEmpresa || 'Práctica Asignada'}
            </h1>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Modalidad</span>
              <span className="font-black text-slate-800 uppercase tracking-wide">{inscripcionActiva.tipoPractica || '---'}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Área Técnica</span>
              <span className="font-black text-slate-800 uppercase tracking-wide">{inscripcionActiva.convenio?.area || '---'}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fecha de Inscripción</span>
              <span className="font-black text-slate-800">{formatearFecha(inscripcionActiva.fechaInscripcion)}</span>
            </div>
          </div>
        </div>

        {mensaje.texto && (
          <div
            className={`rounded-lg border p-3.5 flex items-center gap-2.5 text-xs font-bold ${
              mensaje.tipo === 'success'
                ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                : 'bg-rose-50 border-rose-250 text-[#ec3724]'
            }`}
          >
            <FiAlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
            <span>{mensaje.texto}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          
          {/* Navegador de Ciclos y Tareas (Estilo Menú Moodle) */}
          <aside className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit">
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <div className="relative">
                <FiSearch className="absolute top-3 left-3 text-slate-400 h-3.5 w-3.5" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar anexo o código..."
                  className="w-full border border-slate-300 rounded-md pl-8 pr-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724]"
                />
              </div>
            </div>

            <div className="p-2 space-y-2.5">
              {[1, 2, 3].filter((c) => c !== 3 || (tareasPorCiclo[3] && tareasPorCiclo[3].length > 0)).map((ciclo) => {
                const isActivo = cicloActivo === ciclo;
                const tareasCiclo = tareasPorCiclo[ciclo] || [];
                return (
                  <div key={ciclo} className={`rounded-lg overflow-hidden border ${isActivo ? 'border-slate-350 bg-slate-50/50' : 'border-slate-200'}`}>
                    <button
                      className={`w-full text-left px-3 py-2.5 border-b border-slate-200 ${isActivo ? 'bg-slate-100 border-l-4 border-l-[#ec3724]' : 'bg-white'}`}
                      onClick={() => setCicloActivo(ciclo)}
                    >
                      <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        {ciclo === 3 ? 'Examen Supletorio' : `Ciclo ${ciclo}`}
                      </p>
                      <p className="text-[10px] font-bold text-slate-450 uppercase mt-0.5">
                        {tareasCiclo.length} tarea(s) {ciclo !== 3 ? `| Prom: ${promediosCiclo[ciclo] !== null ? promediosCiclo[ciclo].toFixed(2) : '--'}` : `| Base: ${promBaseLocal !== null ? promBaseLocal.toFixed(2) : '--'}`}
                      </p>
                    </button>

                    {isActivo && (
                      <div className="p-1 space-y-1 bg-white">
                        {tareasCiclo.length === 0 ? (
                          <p className="text-[10px] text-slate-400 font-bold uppercase p-3 text-center">Sin tareas registradas.</p>
                        ) : (
                          tareasCiclo.map((t) => {
                            const selected = tareaSeleccionadaId === t.id;
                            const estadoEntrega = t.entrega?.estado || 'sin_entrega';
                            return (
                              <button
                                key={t.id}
                                onClick={() => setTareaSeleccionadaId(t.id)}
                                className={`w-full text-left rounded px-2.5 py-2 border transition-all text-xs font-semibold ${
                                  selected
                                    ? 'border-rose-150 bg-rose-50/30 text-[#ec3724]'
                                    : 'border-transparent hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex flex-col space-y-0.5">
                                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                    {t.codigo}
                                  </span>
                                  <span className="font-bold leading-tight truncate">
                                    {t.titulo}
                                  </span>
                                </div>
                                <p className="text-[9px] font-bold uppercase text-slate-455 mt-1 flex items-center gap-1">
                                  {estadoVentanaLabel[t.estadoVentana] || t.estadoVentana} • {estadoEntrega}
                                </p>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
          
          {/* Detalles de la Tarea y Envíos (Estilo Moodle SpeedGrader / Ficha) */}
          <main className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit">
            {!tareaSeleccionada ? (
              <div className="p-10 text-center text-slate-400 font-bold uppercase text-xs">
                Selecciona una tarea en el panel izquierdo para ver su detalle de envío.
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Cabecera Sección de Información - Estilo Académico Limpio */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                  <FiFileText className="h-4.5 w-4.5 text-slate-500" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Detalle Académico de la Tarea: {tareaSeleccionada.codigo} - {tareaSeleccionada.titulo}
                  </span>
                </div>

                <div className="px-6 pb-6 space-y-6">
                  
                  {cicloActivo === 3 && promBaseLocal !== null && (
                    <div className="bg-slate-50 border-l-4 border-l-[#ec3724] border border-slate-200 rounded-lg p-4 flex items-start gap-3">
                      <FiInfo className="h-5 w-5 text-[#ec3724] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wide">
                          Examen Supletorio Activo
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                          Promedio Base obtenido (Ciclos 1 y 2): <strong className="text-[#ec3724]">{promBaseLocal.toFixed(2)}</strong> / 10.00. 
                          La calificación final será promediada de la siguiente forma: **(Nota Base + Nota Examen Supletorio) / 2**.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Ficha de Instrucciones y Contenido */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Instrucciones de la Tarea
                    </div>
                    <div className="p-4 bg-white text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-line">
                      {tareaSeleccionada.descripcion || 'No se han registrado instrucciones especiales para esta tarea.'}
                    </div>
                    {tareaSeleccionada.templateName && (
                      <div className="border-t border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-3 animate-fadeIn">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-700">
                            📁 Archivo de apoyo: {tareaSeleccionada.templateName}
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const response = await api.get(`/estudiante/tareas/${tareaSeleccionada.id}/descargar-plantilla`, {
                                responseType: 'blob',
                              });
                              const url = window.URL.createObjectURL(new Blob([response.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', tareaSeleccionada.templateName || 'plantilla.pdf');
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error('Error al descargar plantilla:', error);
                              alert('No se pudo descargar el archivo de apoyo. Por favor, reintente más tarde.');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ec3724] hover:bg-[#d32010] text-white rounded text-xs font-bold shadow-sm transition"
                        >
                          <FiDownload className="h-3.5 w-3.5" />
                          <span>Descargar archivo de apoyo</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tabla Oficial de Estado de la Entrega (Estilo Moodle) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-150 border-b border-slate-200 px-4 py-2 text-[10px] font-black text-slate-650 uppercase tracking-wider flex items-center gap-1.5">
                      <FiCalendar className="text-[#ec3724] h-3.5 w-3.5" />
                      Estado de la Entrega
                    </div>
                    
                    <div className="divide-y divide-slate-200 text-xs">
                      {/* Estado */}
                      <div className="grid grid-cols-[140px_1fr] md:grid-cols-[200px_1fr] divide-x divide-slate-200">
                        <div className="bg-slate-50 px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Estado de la entrega</div>
                        <div className="px-4 py-2.5 font-bold text-slate-800 flex items-center">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            estadoEntregaClass[tareaSeleccionada.entrega?.estado || 'sin_entrega']
                          }`}>
                            {tareaSeleccionada.entrega?.estado || 'sin_entrega'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Calificación */}
                      <div className="grid grid-cols-[140px_1fr] md:grid-cols-[200px_1fr] divide-x divide-slate-200">
                        <div className="bg-slate-50 px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Estado de la calificación</div>
                        <div className="px-4 py-2.5 font-black flex items-center text-slate-800">
                          {tareaSeleccionada.entrega?.nota !== null && tareaSeleccionada.entrega?.nota !== undefined ? (
                            <span className={`text-xs font-black ${colorNota(tareaSeleccionada.entrega.nota)}`}>
                              Calificado ({tareaSeleccionada.entrega.nota} / 10.00)
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sin Calificar</span>
                          )}
                        </div>
                      </div>

                      {/* Fecha de Cierre */}
                      <div className="grid grid-cols-[140px_1fr] md:grid-cols-[200px_1fr] divide-x divide-slate-200">
                        <div className="bg-slate-50 px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Fecha de entrega limite</div>
                        <div className="px-4 py-2.5 font-bold text-slate-700 flex items-center">
                          {new Date(tareaSeleccionada.fechaCierre).toLocaleString()}
                        </div>
                      </div>

                      {/* Tiempo Restante */}
                      <div className="grid grid-cols-[140px_1fr] md:grid-cols-[200px_1fr] divide-x divide-slate-200">
                        <div className="bg-slate-50 px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Tiempo restante</div>
                        <div className="px-4 py-2.5 font-black flex items-center">
                          <span className={tareaSeleccionada.estadoVentana === 'abierta' ? 'text-emerald-650' : 'text-slate-550'}>
                            {formatCountdown(tareaSeleccionada.fechaCierre, ahora)}
                          </span>
                        </div>
                      </div>

                      {/* Archivos Enviados */}
                      <div className="grid grid-cols-[140px_1fr] md:grid-cols-[200px_1fr] divide-x divide-slate-200">
                        <div className="bg-slate-50 px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Archivos enviados</div>
                        <div className="px-4 py-3 text-slate-700 font-semibold space-y-3">
                          {tareaSeleccionada.titulo.toLowerCase().includes('anexo b') ? (
                            <div className="space-y-3">
                              {/* Subtarea 1: Tutor Interno */}
                              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Subtarea 1: Tutor Interno</span>
                                  {tareaSeleccionada.entrega?.nombreArchivoInterno && (
                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">Subido</span>
                                  )}
                                </div>
                                {tareaSeleccionada.entrega?.nombreArchivoInterno ? (
                                  <div className="mt-2 space-y-2">
                                    <p className="text-xs font-bold text-slate-800 truncate">{tareaSeleccionada.entrega.nombreArchivoInterno}</p>
                                    <div className="flex gap-1.5">
                                      {tareaSeleccionada.entrega.nombreArchivoInterno.toLowerCase().endsWith('.pdf') && (
                                        <button
                                          onClick={() => verEntrega(tareaSeleccionada.entrega.id, tareaSeleccionada.entrega.nombreArchivoInterno)}
                                          className="btn btn-secondary py-1 px-2.5 text-[9px]"
                                        >
                                          Ver PDF
                                        </button>
                                      )}
                                      <button
                                        onClick={() => descargarEntrega(tareaSeleccionada.entrega.id, tareaSeleccionada.entrega.nombreArchivoInterno)}
                                        className="btn btn-secondary py-1 px-2.5 text-[9px]"
                                      >
                                        Descargar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Sin entrega registrada</p>
                                )}
                              </div>

                              {/* Subtarea 2: Tutor Externo */}
                              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Subtarea 2: Tutor Externo</span>
                                  {tareaSeleccionada.entrega?.nombreArchivoExterno && (
                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">Subido</span>
                                  )}
                                </div>
                                {tareaSeleccionada.entrega?.nombreArchivoExterno ? (
                                  <div className="mt-2 space-y-2">
                                    <p className="text-xs font-bold text-slate-800 truncate">{tareaSeleccionada.entrega.nombreArchivoExterno}</p>
                                    <div className="flex gap-1.5">
                                      {tareaSeleccionada.entrega.nombreArchivoExterno.toLowerCase().endsWith('.pdf') && (
                                        <button
                                          onClick={() => verEntrega(tareaSeleccionada.entrega.id, tareaSeleccionada.entrega.nombreArchivoExterno)}
                                          className="btn btn-secondary py-1 px-2.5 text-[9px]"
                                        >
                                          Ver PDF
                                        </button>
                                      )}
                                      <button
                                        onClick={() => descargarEntrega(tareaSeleccionada.entrega.id, tareaSeleccionada.entrega.nombreArchivoExterno)}
                                        className="btn btn-secondary py-1 px-2.5 text-[9px]"
                                      >
                                        Descargar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Sin entrega registrada</p>
                                )}
                              </div>
                            </div>
                          ) : tareaSeleccionada.entrega ? (
                            tareaSeleccionada.titulo.toLowerCase().includes('anexo f') ? (
                              <p className="text-xs text-emerald-600 font-black uppercase tracking-wider">✓ Calificado por Docente (Documento de uso reservado)</p>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-800">{tareaSeleccionada.entrega.nombreArchivo || 'Nota registrada directamente por el tutor'}</p>
                                {tareaSeleccionada.entrega.rutaArchivo && (
                                  <div className="flex gap-1.5">
                                    {tareaSeleccionada.entrega.nombreArchivo?.toLowerCase().endsWith('.pdf') && (
                                      <button
                                        onClick={() => verEntrega(tareaSeleccionada.entrega.id, tareaSeleccionada.entrega.nombreArchivo)}
                                        className="btn btn-secondary py-1 px-2.5 text-[9px]"
                                      >
                                        Ver PDF
                                      </button>
                                    )}
                                    <button
                                      onClick={() => descargarEntrega(tareaSeleccionada.entrega.id, tareaSeleccionada.entrega.nombreArchivo)}
                                      className="btn btn-secondary py-1 px-2.5 text-[9px]"
                                    >
                                      Descargar
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sin entrega registrada</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Caja de Cargas / Subida de Archivos */}
                  <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider">Buzón de Entregas</h3>
                    
                    {tareaSeleccionada.titulo.toLowerCase().includes('anexo f') ? (
                      <div className="bg-rose-50 border border-rose-150 rounded-lg p-4 text-[#ec3724] text-[11px] font-semibold leading-relaxed">
                        * Este es un documento de calificación final de uso reservado del tutor académico. Tu docente tutor subirá la rúbrica (Anexo F) directamente al sistema una vez concluido el ciclo.
                      </div>
                    ) : esSoloLectura ? (
                      <p className="text-xs text-slate-500 font-semibold italic">
                        El proceso de acreditación de prácticas ya está finalizado. No se permiten nuevas entregas.
                      </p>
                    ) : tareaSeleccionada.puedeEntregar ? (
                      tareaSeleccionada.titulo.toLowerCase().includes('anexo b') ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Buzón Tutor Interno */}
                          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 shadow-sm">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Subir Evaluación Tutor Interno</span>
                            {tareaSeleccionada.entrega?.nombreArchivoInterno && !editandoEntregas[`${tareaSeleccionada.id}-interno`] ? (
                              <div className="bg-slate-100 rounded-lg border border-slate-200 p-3 flex flex-col items-center space-y-3 text-center">
                                <div className="flex items-center space-x-2 text-left w-full">
                                  {getFileIcon(tareaSeleccionada.entrega.nombreArchivoInterno)}
                                  <div className="truncate flex-grow">
                                    <p className="text-[11px] font-black text-slate-800 truncate">{tareaSeleccionada.entrega.nombreArchivoInterno}</p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Entregado</p>
                                  </div>
                                </div>
                                <div className="flex gap-1.5 w-full justify-center">
                                  {tareaSeleccionada.entrega.nombreArchivoInterno.toLowerCase().endsWith('.pdf') && (
                                    <button
                                      onClick={() => verEntrega(tareaSeleccionada.entrega.id, tareaSeleccionada.entrega.nombreArchivoInterno)}
                                      className="btn btn-secondary py-1 px-2.5 text-[9px] uppercase font-black"
                                    >
                                      Ver
                                    </button>
                                  )}
                                  <button
                                    onClick={() => descargarEntrega(tareaSeleccionada.entrega.id, tareaSeleccionada.entrega.nombreArchivoInterno)}
                                    className="btn btn-secondary py-1 px-2.5 text-[9px] uppercase font-black"
                                  >
                                    Descargar
                                  </button>
                                  {tareaSeleccionada.entrega.estado !== 'calificada' && (
                                    <button
                                      onClick={() => setEditandoEntregas(prev => ({ ...prev, [`${tareaSeleccionada.id}-interno`]: true }))}
                                      className="btn btn-primary py-1 px-2.5 text-[9px] uppercase font-black"
                                    >
                                      Editar
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <>
                                <label
                                  htmlFor={`archivo-${tareaSeleccionada.id}-interno`}
                                  className="block w-full border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-center"
                                >
                                  <input
                                    id={`archivo-${tareaSeleccionada.id}-interno`}
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    className="hidden"
                                    onChange={(e) => handleArchivoChange(e, `${tareaSeleccionada.id}-interno`)}
                                  />
                                  <div className="flex flex-col items-center gap-1.5 text-slate-500">
                                    <FiUpload className="h-4.5 w-4.5 text-[#ec3724]" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Seleccionar Archivo</span>
                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Límite: 20MB (PDF, Word)</span>
                                  </div>
                                </label>
                                {archivoTarea[`${tareaSeleccionada.id}-interno`] && (
                                  <div className="flex items-center justify-between bg-rose-50/50 p-2 rounded border border-rose-100 mt-1">
                                    <p className="text-[9px] font-black text-[#ec3724] truncate max-w-[130px]">
                                      {archivoTarea[`${tareaSeleccionada.id}-interno`].name}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => setArchivoTarea(prev => ({ ...prev, [`${tareaSeleccionada.id}-interno`]: null }))}
                                      className="text-[8px] font-black text-slate-500 hover:text-[#ec3724] uppercase tracking-wider"
                                    >
                                      Limpiar
                                    </button>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => subirEntrega(tareaSeleccionada.id, 'interno')}
                                    disabled={subiendoTareaId === `${tareaSeleccionada.id}-interno` || !archivoTarea[`${tareaSeleccionada.id}-interno`]}
                                    className="btn btn-primary w-full py-2 flex items-center justify-center gap-1.5 text-[9px] uppercase tracking-wider font-black disabled:opacity-50 animate-pulse-slow"
                                  >
                                    <FiUpload className="h-3.5 w-3.5" />
                                    {subiendoTareaId === `${tareaSeleccionada.id}-interno` ? 'Enviando...' : 'Enviar Evaluación TI'}
                                  </button>
                                  {tareaSeleccionada.entrega?.nombreArchivoInterno && (
                                    <button
                                      onClick={() => {
                                        setEditandoEntregas(prev => ({ ...prev, [`${tareaSeleccionada.id}-interno`]: false }));
                                        setArchivoTarea(prev => ({ ...prev, [`${tareaSeleccionada.id}-interno`]: null }));
                                      }}
                                      className="btn btn-secondary py-2 px-3 text-[9px] uppercase font-black tracking-wider"
                                    >
                                      Cancelar
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Buzón Tutor Externo */}
                          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 shadow-sm">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Subir Evaluación Tutor Externo</span>
                            {tareaSeleccionada.entrega?.nombreArchivoExterno && !editandoEntregas[`${tareaSeleccionada.id}-externo`] ? (
                              <div className="bg-slate-100 rounded-lg border border-slate-200 p-3 flex flex-col items-center space-y-3 text-center">
                                <div className="flex items-center space-x-2 text-left w-full">
                                  {getFileIcon(tareaSeleccionada.entrega.nombreArchivoExterno)}
                                  <div className="truncate flex-grow">
                                    <p className="text-[11px] font-black text-slate-800 truncate">{tareaSeleccionada.entrega.nombreArchivoExterno}</p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Entregado</p>
                                  </div>
                                </div>
                                <div className="flex gap-1.5 w-full justify-center">
                                  {tareaSeleccionada.entrega.nombreArchivoExterno.toLowerCase().endsWith('.pdf') && (
                                    <button
                                      onClick={() => verEntrega(tareaSeleccionada.entrega.id, tareaSeleccionada.entrega.nombreArchivoExterno)}
                                      className="btn btn-secondary py-1 px-2.5 text-[9px] uppercase font-black"
                                    >
                                      Ver
                                    </button>
                                  )}
                                  <button
                                    onClick={() => descargarEntrega(tareaSeleccionada.entrega.id, tareaSeleccionada.entrega.nombreArchivoExterno)}
                                    className="btn btn-secondary py-1 px-2.5 text-[9px] uppercase font-black"
                                  >
                                    Descargar
                                  </button>
                                  {tareaSeleccionada.entrega.estado !== 'calificada' && (
                                    <button
                                      onClick={() => setEditandoEntregas(prev => ({ ...prev, [`${tareaSeleccionada.id}-externo`]: true }))}
                                      className="btn btn-primary py-1 px-2.5 text-[9px] uppercase font-black"
                                    >
                                      Editar
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <>
                                <label
                                  htmlFor={`archivo-${tareaSeleccionada.id}-externo`}
                                  className="block w-full border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-center"
                                >
                                  <input
                                    id={`archivo-${tareaSeleccionada.id}-externo`}
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    className="hidden"
                                    onChange={(e) => handleArchivoChange(e, `${tareaSeleccionada.id}-externo`)}
                                  />
                                  <div className="flex flex-col items-center gap-1.5 text-slate-500">
                                    <FiUpload className="h-4.5 w-4.5 text-[#ec3724]" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Seleccionar Archivo</span>
                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Límite: 20MB (PDF, Word)</span>
                                  </div>
                                </label>
                                {archivoTarea[`${tareaSeleccionada.id}-externo`] && (
                                  <div className="flex items-center justify-between bg-rose-50/50 p-2 rounded border border-rose-100 mt-1">
                                    <p className="text-[9px] font-black text-[#ec3724] truncate max-w-[130px]">
                                      {archivoTarea[`${tareaSeleccionada.id}-externo`].name}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => setArchivoTarea(prev => ({ ...prev, [`${tareaSeleccionada.id}-externo`]: null }))}
                                      className="text-[8px] font-black text-slate-500 hover:text-[#ec3724] uppercase tracking-wider"
                                    >
                                      Limpiar
                                    </button>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => subirEntrega(tareaSeleccionada.id, 'externo')}
                                    disabled={subiendoTareaId === `${tareaSeleccionada.id}-externo` || !archivoTarea[`${tareaSeleccionada.id}-externo`]}
                                    className="btn btn-primary w-full py-2 flex items-center justify-center gap-1.5 text-[9px] uppercase tracking-wider font-black disabled:opacity-50 animate-pulse-slow"
                                  >
                                    <FiUpload className="h-3.5 w-3.5" />
                                    {subiendoTareaId === `${tareaSeleccionada.id}-externo` ? 'Enviando...' : 'Enviar Evaluación TE'}
                                  </button>
                                  {tareaSeleccionada.entrega?.nombreArchivoExterno && (
                                    <button
                                      onClick={() => {
                                        setEditandoEntregas(prev => ({ ...prev, [`${tareaSeleccionada.id}-externo`]: false }));
                                        setArchivoTarea(prev => ({ ...prev, [`${tareaSeleccionada.id}-externo`]: null }));
                                      }}
                                      className="btn btn-secondary py-2 px-3 text-[9px] uppercase font-black tracking-wider"
                                    >
                                      Cancelar
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tareaSeleccionada.entrega?.nombreArchivo && !editandoEntregas[tareaSeleccionada.id] ? (
                            <div className="bg-slate-100 rounded-xl border border-slate-200 p-5 flex flex-col items-center text-center space-y-4">
                              <div className="flex items-center space-x-3 text-left w-full max-w-md mx-auto">
                                {getFileIcon(tareaSeleccionada.entrega.nombreArchivo)}
                                <div className="truncate flex-grow">
                                  <p className="text-xs font-black text-slate-800 truncate">{tareaSeleccionada.entrega.nombreArchivo}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                    Entregado el {new Date(tareaSeleccionada.entrega.fechaEntrega).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex gap-2 w-full justify-center">
                                {tareaSeleccionada.entrega.nombreArchivo.toLowerCase().endsWith('.pdf') && (
                                  <button
                                    onClick={() => verEntrega(tareaSeleccionada.entrega.id, tareaSeleccionada.entrega.nombreArchivo)}
                                    className="btn btn-secondary py-2 px-3 text-[10px] uppercase font-black tracking-wider flex items-center gap-1.5"
                                  >
                                    <FiEye className="h-3.5 w-3.5" /> Ver PDF
                                  </button>
                                )}
                                <button
                                  onClick={() => descargarEntrega(tareaSeleccionada.entrega.id, tareaSeleccionada.entrega.nombreArchivo)}
                                  className="btn btn-secondary py-2 px-3 text-[10px] uppercase font-black tracking-wider flex items-center gap-1.5"
                                >
                                  <FiDownload className="h-3.5 w-3.5" /> Descargar
                                </button>
                                {tareaSeleccionada.entrega.estado !== 'calificada' && (
                                  <button
                                    onClick={() => setEditandoEntregas(prev => ({ ...prev, [tareaSeleccionada.id]: true }))}
                                    className="btn btn-primary py-2 px-3 text-[10px] uppercase font-black tracking-wider flex items-center gap-1.5"
                                  >
                                    Editar Entrega
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              <label
                                htmlFor={`archivo-${tareaSeleccionada.id}`}
                                className="block w-full border-2 border-dashed border-slate-300 rounded-xl p-5 bg-white hover:bg-slate-50/50 cursor-pointer text-center"
                              >
                                <input
                                  id={`archivo-${tareaSeleccionada.id}`}
                                  type="file"
                                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                                  className="hidden"
                                  onChange={(e) => handleArchivoChange(e, tareaSeleccionada.id)}
                                />
                                <div className="flex flex-col items-center gap-1.5 text-slate-655">
                                  <FiUpload className="h-6 w-6 text-[#ec3724] mb-1" />
                                  <span className="text-xs font-black uppercase tracking-wider">Suelta archivos o haz clic para examinar</span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Formatos permitidos: PDF, Word (DOC, DOCX), Excel (XLS, XLSX)</span>
                                  <span className="text-[9px] text-[#ec3724] font-black uppercase tracking-wider">Límite: Máximo 20MB</span>
                                </div>
                              </label>
                              {archivoTarea[tareaSeleccionada.id] && (
                                <div className="flex items-center justify-between bg-rose-50/50 p-2.5 rounded border border-rose-100 max-w-md mx-auto w-full mt-1">
                                  <p className="text-xs font-black text-[#ec3724] truncate max-w-[280px]">
                                    Seleccionado: {archivoTarea[tareaSeleccionada.id].name}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setArchivoTarea(prev => ({ ...prev, [tareaSeleccionada.id]: null }))}
                                    className="text-[9px] font-black text-slate-500 hover:text-[#ec3724] uppercase tracking-wider"
                                  >
                                    Limpiar
                                  </button>
                                </div>
                              )}
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => subirEntrega(tareaSeleccionada.id)}
                                  disabled={subiendoTareaId === tareaSeleccionada.id || !archivoTarea[tareaSeleccionada.id]}
                                  className="btn btn-primary px-5 py-2.5 flex items-center gap-2 text-xs font-black uppercase tracking-wider disabled:opacity-50"
                                >
                                  <FiUpload className="h-4 w-4" />
                                  {subiendoTareaId === tareaSeleccionada.id ? 'Subiendo Entrega...' : 'Guardar Entrega'}
                                </button>
                                {tareaSeleccionada.entrega?.nombreArchivo && (
                                  <button
                                    onClick={() => {
                                      setEditandoEntregas(prev => ({ ...prev, [tareaSeleccionada.id]: false }));
                                      setArchivoTarea(prev => ({ ...prev, [tareaSeleccionada.id]: null }));
                                    }}
                                    className="btn btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider"
                                  >
                                    Cancelar
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    ) : (
                      <p className="text-xs text-[#ec3724] font-bold flex items-center gap-1.5 bg-rose-50 border border-rose-150 p-3 rounded-lg">
                        <FiClock className="h-4.5 w-4.5 flex-shrink-0" />
                        {mensajeBloqueoEntrega(tareaSeleccionada)}
                      </p>
                    )}
                  </div>

                  {/* Retroalimentación / Comentarios del Docente */}
                  {tareaSeleccionada.entrega?.comentarioDocente && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Retroalimentación del Docente Tutor
                      </div>
                      <div className="p-4 bg-white text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-line italic">
                        "{tareaSeleccionada.entrega.comentarioDocente}"
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </main>
        </div>

        {/* Footer Informativo */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-[10px] font-black uppercase text-slate-450 tracking-widest flex items-center gap-2.5 shadow-sm">
          <FiBriefcase className="text-slate-400 h-4.5 w-4.5 flex-shrink-0" />
          <span>Gestión Oficial de Entregas por Ciclos de Prácticas Académicas de la ESPOCH</span>
        </div>
      </div>

      {preview.open && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider truncate">Vista Previa - {preview.nombre}</h4>
              <button
                className="btn btn-secondary py-1 px-3"
                onClick={() => {
                  if (preview.url) URL.revokeObjectURL(preview.url);
                  setPreview({ open: false, url: '', nombre: '' });
                }}
              >
                Cerrar Ventana
              </button>
            </div>
            <iframe title="mi-entrega-preview" src={preview.url} className="w-full h-full border-0" />
          </div>
        </div>
      )}
    </div>
  );
};

export default MisPracticas;
