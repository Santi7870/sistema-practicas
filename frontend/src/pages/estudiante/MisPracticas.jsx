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

  const subirEntrega = async (tareaId) => {
    const archivo = archivoTarea[tareaId];
    if (!archivo) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un archivo antes de subir la entrega.' });
      return;
    }

    try {
      setSubiendoTareaId(tareaId);
      const formData = new FormData();
      formData.append('archivo', archivo);
      await api.post(`/estudiante/tareas/${tareaId}/entregar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMensaje({ tipo: 'success', texto: 'Entrega subida correctamente.' });
      await cargarDatos();
      setArchivoTarea((prev) => ({ ...prev, [tareaId]: null }));
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No tienes una inscripcion activa</h2>
            <p className="text-gray-600 mb-4">
              Para participar en ciclos y tareas, primero debes tener una inscripcion activa.
            </p>
            <Link
              to="/estudiante/inscripcion"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
            >
              Ir a Inscripcion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        

        {/* Barra de Navegación Rápida Fuera de la Tarjeta */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-[11px] font-extrabold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-100 w-fit"
          >
            <FiArrowLeft className="h-4 w-4 text-slate-400" /> Volver al Dashboard
          </Link>
          <Link
            to={requestedTipo ? `/estudiante/calificaciones?tipo=${requestedTipo}` : "/estudiante/calificaciones"}
            className="inline-flex items-center gap-2 text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider bg-white px-4 py-2.5 rounded-xl shadow-sm border border-indigo-100 hover:border-indigo-200 w-fit"
          >
            <FiBookOpen className="h-4 w-4 text-indigo-500" /> Ver calificaciones
          </Link>
        </div>

        {esSoloLectura && (
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 shadow-md animate-fadeIn">
            <div className="p-2 bg-amber-500/20 text-amber-800 rounded-xl border border-amber-500/30">
              <FiInfo className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Vista de Solo Lectura — Historial de Prácticas {requestedTipo === 'comunitaria' ? 'Comunitarias' : 'Laborales'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Esta modalidad se encuentra acreditada y finalizada. No se permiten nuevas entregas ni modificaciones de archivos.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{esSoloLectura ? 'Práctica Acreditada (Historial)' : 'Matricula activa'}</p>
            <h1 className="text-2xl font-black text-gray-900 mt-1">
              {inscripcionActiva.convenio?.nombreEmpresa || 'Practica asignada'}
            </h1>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border bg-gray-50 p-3">
              <p className="text-gray-500">Modalidad</p>
              <p className="font-bold text-gray-900 capitalize">{inscripcionActiva.tipoPractica || '---'}</p>
            </div>
            <div className="rounded-xl border bg-gray-50 p-3">
              <p className="text-gray-500">Area</p>
              <p className="font-bold text-gray-900">{inscripcionActiva.convenio?.area || '---'}</p>
            </div>
            <div className="rounded-xl border bg-gray-50 p-3">
              <p className="text-gray-500">Fecha de inscripcion</p>
              <p className="font-bold text-gray-900">{formatearFecha(inscripcionActiva.fechaInscripcion)}</p>
            </div>
          </div>
        </div>

        {mensaje.texto && (
          <div
            className={`rounded-xl border p-3 flex items-center gap-2 text-sm ${
              mensaje.tipo === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <FiAlertCircle className="h-5 w-5" />
            <span>{mensaje.texto}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
            <div className="p-4 border-b bg-gray-50">
              <div className="relative">
                <FiSearch className="absolute top-3 left-3 text-gray-400" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar titulo o descripcion..."
                  className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="p-3 space-y-3">
              {[1, 2, 3].map((ciclo) => {
                const isActivo = cicloActivo === ciclo;
                const tareasCiclo = tareasPorCiclo[ciclo] || [];
                return (
                  <div key={ciclo} className={`rounded-xl border ${isActivo ? 'border-indigo-300 bg-indigo-50/40' : 'border-gray-200'}`}>
                    <button
                      className="w-full text-left px-3 py-3"
                      onClick={() => setCicloActivo(ciclo)}
                    >
                      <p className={`font-bold ${isActivo ? 'text-indigo-900' : 'text-gray-900'}`}>Ciclo {ciclo}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {tareasCiclo.length} tarea(s) | Promedio: {promediosCiclo[ciclo] ?? '--'}
                      </p>
                    </button>

                    {isActivo && (
                      <div className="px-2 pb-2 space-y-1">
                        {tareasCiclo.length === 0 ? (
                          <p className="text-xs text-gray-500 px-2 py-2">No hay tareas en este ciclo.</p>
                        ) : (
                          tareasCiclo.map((t) => {
                            const selected = tareaSeleccionadaId === t.id;
                            const estadoEntrega = t.entrega?.estado || 'sin_entrega';
                            return (
                              <button
                                key={t.id}
                                onClick={() => setTareaSeleccionadaId(t.id)}
                                className={`w-full text-left rounded-lg px-2 py-2 border transition ${
                                  selected
                                    ? 'border-indigo-500 bg-white'
                                    : 'border-transparent hover:border-gray-200 hover:bg-white'
                                }`}
                              >
                                <div className="flex flex-col space-y-0.5">
                                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                                    {t.codigo}
                                  </span>
                                  <span className="text-sm font-bold text-slate-800 leading-snug line-clamp-2">
                                    {t.titulo}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-1">
                                  {estadoVentanaLabel[t.estadoVentana] || t.estadoVentana} | Estado: {estadoEntrega}
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

          <main className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            {!tareaSeleccionada ? (
              <div className="p-8 text-center text-gray-500">
                Selecciona una tarea del panel izquierdo para ver su detalle.
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex flex-col space-y-0.5">
                    <span className="text-xs font-extrabold uppercase text-indigo-600 tracking-widest">
                      {tareaSeleccionada.codigo}
                    </span>
                    <h2 className="text-2xl font-black text-slate-800 leading-tight">
                      {tareaSeleccionada.titulo}
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-xl bg-gray-50 border p-3">
                    <p className="text-gray-500">Puntaje maximo</p>
                    <p className="font-bold text-gray-900 mt-1">{tareaSeleccionada.puntajeMaximo}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border p-3">
                    <p className="text-gray-500">Apertura</p>
                    <p className="font-bold text-gray-900 mt-1">
                      {new Date(tareaSeleccionada.fechaApertura).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border p-3">
                    <p className="text-gray-500">Cierre</p>
                    <p className="font-bold text-gray-900 mt-1">
                      {new Date(tareaSeleccionada.fechaCierre).toLocaleString()}
                    </p>
                    <p className={`text-xs mt-1 font-semibold ${
                      tareaSeleccionada.estadoVentana === 'abierta' ? 'text-emerald-700' : 'text-gray-500'
                    }`}>
                      {formatCountdown(tareaSeleccionada.fechaCierre, ahora)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border p-3">
                    <p className="text-gray-500">Mi nota</p>
                    <p className={`font-bold mt-1 ${colorNota(tareaSeleccionada.entrega?.nota)}`}>
                      {tareaSeleccionada.entrega?.nota ?? '--'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Se refleja en Calificaciones</p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Instrucciones</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {tareaSeleccionada.descripcion || 'Sin descripcion para esta tarea.'}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      estadoVentanaClass[tareaSeleccionada.estadoVentana] || 'bg-gray-100 text-gray-700'
                    }`}>
                      {estadoVentanaLabel[tareaSeleccionada.estadoVentana] || tareaSeleccionada.estadoVentana}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      estadoEntregaClass[tareaSeleccionada.entrega?.estado || 'sin_entrega'] || 'bg-gray-100 text-gray-700'
                    }`}>
                      Estado entrega: {tareaSeleccionada.entrega?.estado || 'sin_entrega'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                      Ciclo {tareaSeleccionada.numeroCiclo}
                    </span>
                  </div>

                  {tareaSeleccionada.entrega && (
                    <div className="mb-4 rounded-lg bg-gray-50 border p-3">
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <FiFileText /> Archivo enviado: {tareaSeleccionada.entrega.nombreArchivo}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Enviado: {new Date(tareaSeleccionada.entrega.fechaEntrega).toLocaleString()}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => verEntrega(tareaSeleccionada.entrega.id, tareaSeleccionada.entrega.nombreArchivo)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-sky-100 text-sky-800 font-semibold text-sm"
                        >
                          <FiEye /> Ver
                        </button>
                        <button
                          onClick={() => descargarEntrega(tareaSeleccionada.entrega.id, tareaSeleccionada.entrega.nombreArchivo)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-gray-100 text-gray-700 font-semibold text-sm"
                        >
                          <FiDownload /> Descargar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-900">Subir o reemplazar entrega</h3>

                    {esSoloLectura ? (
                      <p className="text-sm text-slate-500 italic bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center gap-2">
                        <FiAlertCircle className="text-slate-400 h-5 w-5 flex-shrink-0" />
                        Esta modalidad está aprobada y acreditada. La entrega de archivos se encuentra deshabilitada (Vista de Solo Lectura).
                      </p>
                    ) : tareaSeleccionada.puedeEntregar ? (
                      <>
                        <label
                          htmlFor={`archivo-${tareaSeleccionada.id}`}
                          className="block w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition cursor-pointer p-5"
                        >
                          <input
                            id={`archivo-${tareaSeleccionada.id}`}
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                            onChange={(e) =>
                              setArchivoTarea((prev) => ({
                                ...prev,
                                [tareaSeleccionada.id]: e.target.files?.[0] || null,
                              }))
                            }
                          />
                          <div className="flex items-center justify-center gap-2 text-gray-700">
                            <FiUpload className="h-5 w-5" />
                            <span className="text-sm font-medium">Suelta archivos o haz clic para examinar</span>
                          </div>
                          <p className="text-xs text-gray-500 text-center mt-2">Permitidos: PDF, DOC, DOCX</p>
                          {archivoTarea[tareaSeleccionada.id] && (
                            <p className="text-xs text-indigo-700 text-center mt-2 font-semibold">
                              Archivo seleccionado: {archivoTarea[tareaSeleccionada.id].name}
                            </p>
                          )}
                        </label>
                        <button
                          onClick={() => subirEntrega(tareaSeleccionada.id)}
                          disabled={subiendoTareaId === tareaSeleccionada.id}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-60"
                        >
                          <FiUpload />
                          {subiendoTareaId === tareaSeleccionada.id ? 'Enviando...' : 'Enviar'}
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <FiClock className="h-4 w-4" />
                        {mensajeBloqueoEntrega(tareaSeleccionada)}
                      </p>
                    )}
                  </div>

                  {tareaSeleccionada.entrega?.comentarioDocente && (
                    <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <FiCheckCircle /> Retroalimentacion del docente
                      </h4>
                      <p className="text-sm text-gray-700 mt-1">
                        {tareaSeleccionada.entrega.comentarioDocente}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-600 flex items-center gap-2">
          <FiBriefcase className="text-gray-500" />
          Gestiona tus entregas por ciclo desde esta pantalla.
        </div>
      </div>

      {preview.open && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h4 className="font-bold text-gray-900 truncate">Vista previa - {preview.nombre}</h4>
              <button
                className="px-3 py-1 rounded bg-gray-100 text-gray-700 font-semibold"
                onClick={() => {
                  if (preview.url) URL.revokeObjectURL(preview.url);
                  setPreview({ open: false, url: '', nombre: '' });
                }}
              >
                Cerrar
              </button>
            </div>
            <iframe title="mi-entrega-preview" src={preview.url} className="w-full h-full" />
          </div>
        </div>
      )}
    </div>
  );
};

export default MisPracticas;
