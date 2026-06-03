import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiDownload, FiEye, FiInfo, FiArrowLeft } from 'react-icons/fi';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

const colorNota = (nota) => {
  if (nota === null || nota === undefined) return 'text-slate-400';
  if (nota >= 7) return 'text-emerald-600';
  if (nota >= 5) return 'text-amber-600';
  return 'text-rose-600';
};

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

const renderEstadoBadge = (estado) => {
  const styles = {
    calificada: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700',
    pendiente: 'bg-amber-500/10 border-amber-500/30 text-amber-700',
    tarde: 'bg-rose-500/10 border-rose-500/30 text-rose-700',
    sin_entrega: 'bg-slate-500/10 border-slate-500/30 text-slate-500',
  };
  const label = {
    calificada: 'Calificada',
    pendiente: 'Pendiente',
    tarde: 'Tarde',
    sin_entrega: 'Sin Entrega',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[estado] || styles.sin_entrega}`}>
      {label[estado] || 'Sin Entrega'}
    </span>
  );
};

const MisCalificaciones = () => {
  const [searchParams] = useSearchParams();
  const requestedTipo = searchParams.get('tipo');
  const esSoloLectura = requestedTipo ? true : false;

  const [tareasDisponibles, setTareasDisponibles] = useState([]);
  const [libro, setLibro] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const [preview, setPreview] = useState({ open: false, url: '', nombre: '' });

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (preview.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview.url]);

  const cargar = async () => {
    try {
      setError('');
      const params = {};
      if (requestedTipo) {
        params.tipo = requestedTipo;
      }
      const [tareasRes, califRes] = await Promise.all([
        api.get('/estudiante/tareas', { params }),
        api.get('/estudiante/calificaciones', { params }),
      ]);
      setTareasDisponibles(tareasRes.data.data || []);
      setLibro(califRes.data.data);
    } catch (err) {
      setError(err?.message || 'No se pudo cargar tu módulo de calificaciones.');
    }
  };

  useEffect(() => {
    cargar();
  }, [requestedTipo]);

  const tareaMap = useMemo(() => {
    const map = new Map();
    for (const t of tareasDisponibles) map.set(t.id, t);
    return map;
  }, [tareasDisponibles]);

  const promBase = useMemo(() => {
    if (!libro?.ciclos) return null;
    const c1 = libro.ciclos.find((c) => c.numeroCiclo === 1);
    const c2 = libro.ciclos.find((c) => c.numeroCiclo === 2);
    if (!c1 || !c2 || c1.promedio === null || c2.promedio === null) return null;
    const sum = parseFloat(c1.promedio) + parseFloat(c2.promedio);
    return Math.round((sum / 2 + Number.EPSILON) * 100) / 100;
  }, [libro?.ciclos]);

  const c1Prom = useMemo(() => {
    if (!libro?.ciclos) return null;
    const c1 = libro.ciclos.find((c) => c.numeroCiclo === 1);
    return c1 && c1.promedio !== null ? Number(c1.promedio) : null;
  }, [libro]);
  
  const c2Prom = useMemo(() => {
    if (!libro?.ciclos) return null;
    const c2 = libro.ciclos.find((c) => c.numeroCiclo === 2);
    return c2 && c2.promedio !== null ? Number(c2.promedio) : null;
  }, [libro]);

  const c3Prom = useMemo(() => {
    if (!libro?.ciclos) return null;
    const c3 = libro.ciclos.find((c) => c.numeroCiclo === 3);
    return c3 && c3.promedio !== null ? Number(c3.promedio) : null;
  }, [libro]);

  const promSupLocal = useMemo(() => {
    if (promBase === null || c3Prom === null) return null;
    return Math.round(((promBase + c3Prom) / 2 + Number.EPSILON) * 100) / 100;
  }, [promBase, c3Prom]);

  const descargarBlob = (blob, nombre) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const abrirPreview = async (entrega, subTarea = null) => {
    try {
      const params = {};
      if (subTarea) params.subTarea = subTarea;

      const response = await api.get(`/estudiante/entregas/${entrega.id}/preview`, {
        responseType: 'blob',
        params,
      });
      const contentType = response.headers['content-type'] || '';
      const blob = new Blob([response.data], { type: contentType });

      const nombre = subTarea === 'interno'
        ? (entrega.nombreArchivoInterno || 'tutor_interno.pdf')
        : subTarea === 'externo'
          ? (entrega.nombreArchivoExterno || 'tutor_externo.pdf')
          : (entrega.nombreArchivo || `entrega-${entrega.id}`);

      if (!contentType.includes('pdf')) {
        descargarBlob(blob, nombre);
        return;
      }

      if (preview.url) URL.revokeObjectURL(preview.url);
      setPreview({
        open: true,
        url: URL.createObjectURL(blob),
        nombre,
      });
    } catch (err) {
      setError(err?.message || 'No se pudo abrir la vista previa.');
    }
  };

  const descargarEntrega = async (entrega, subTarea = null) => {
    try {
      const params = {};
      if (subTarea) params.subTarea = subTarea;

      const response = await api.get(`/estudiante/entregas/${entrega.id}/descargar`, {
        responseType: 'blob',
        params,
      });
      const contentType = response.headers['content-type'] || 'application/octet-stream';

      const nombre = subTarea === 'interno'
        ? (entrega.nombreArchivoInterno || 'tutor_interno.pdf')
        : subTarea === 'externo'
          ? (entrega.nombreArchivoExterno || 'tutor_externo.pdf')
          : (entrega.nombreArchivo || `entrega-${entrega.id}`);

      descargarBlob(new Blob([response.data], { type: contentType }), nombre);
    } catch (err) {
      setError(err?.message || 'No se pudo descargar el archivo.');
    }
  };
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
        
        {/* Botón de Retorno */}
        <div className="flex items-center">
          <Link
            to={requestedTipo ? `/estudiante/mis-practicas?tipo=${requestedTipo}` : "/estudiante/mis-practicas"}
            className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-[#ec3724] transition-colors uppercase tracking-widest bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200"
          >
            <FiArrowLeft className="h-3.5 w-3.5" /> Volver a Mis Prácticas
          </Link>
        </div>

        {esSoloLectura && (
          <div className="bg-white border-l-4 border-amber-500 rounded-lg p-4 flex items-start gap-3 shadow-sm">
            <FiInfo className="h-5 w-5 text-amber-555 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Vista de Solo Lectura — Calificaciones de Prácticas {requestedTipo === 'comunitaria' ? 'Comunitarias' : 'Laborales'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                Historial académico consolidado de esta modalidad. No se permiten nuevas acciones de entrega.
              </p>
            </div>
          </div>
        )}

        {/* Cabecera Simple */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-2">
              <span className="text-[10px] font-black text-[#ec3724] uppercase tracking-widest block">
                Libro de Calificaciones
              </span>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
                Mis Calificaciones
              </h1>
              <p className="text-xs font-semibold text-slate-500 max-w-xl leading-relaxed">
                Esta vista es de consulta académica oficial. Recuerda que para subir tus reportes y anexos debes hacerlo desde la sección de entregas en tus ciclos.
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 w-full text-center border border-slate-200/60">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Nota Promedio Final</span>
              <span className={`block text-3xl font-black ${colorNota(libro?.notaFinal)} mt-1`}>
                {libro?.notaFinal !== null && libro?.notaFinal !== undefined ? Number(libro.notaFinal).toFixed(2) : '--'}
              </span>
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Promedio General</span>
            </div>
          </div>
        </div>

        {/* Historial Académico Oficial - Estilo Yankay (Calco de Referencia) */}
        {libro && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs table-fixed min-w-[950px] border-collapse">
                <thead>
                  {/* Fila superior de Categorías */}
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[9px] tracking-wider divide-x divide-slate-200">
                    <th colSpan={5} className="py-2 text-center">Información de Asignatura</th>
                    <th colSpan={4} className="py-2 text-center">Acumulativos de Rendimiento</th>
                    <th colSpan={4} className="py-2 text-center">Recuperación (Supletorio)</th>
                  </tr>
                  {/* Fila de Columnas */}
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[9px] tracking-wider divide-x divide-slate-200">
                    <th className="py-3 text-center">Código</th>
                    <th className="py-3 text-center">Asignatura</th>
                    <th className="py-3 text-center">Matrícula</th>
                    <th className="py-3 text-center">PAO</th>
                    <th className="py-3 text-center">Paralelo</th>
                    
                    <th className="py-3 text-center">Ciclo 1</th>
                    <th className="py-3 text-center">Ciclo 2</th>
                    <th className="py-3 bg-emerald-50/70 text-center">Promedio</th>
                    <th className="py-3 text-center">Equivalencia</th>
                    
                    <th className="py-3 text-center">Acumulativo</th>
                    <th className="py-3 text-center">Evaluación</th>
                    <th className="py-3 bg-emerald-50/70 text-center">Promedio</th>
                    <th className="py-3 text-center">Equivalencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700 font-semibold">
                  <tr className="divide-x divide-slate-200 bg-white">
                    <td className="py-4 text-center font-bold text-slate-500">SO-14</td>
                    <td className="py-4 text-center font-black text-slate-800 text-[10px] uppercase truncate px-2">
                      {requestedTipo === 'comunitaria' ? 'Prácticas Comunitarias' : 'Prácticas Laborales'}
                    </td>
                    <td className="py-4 text-center">
                      <span className="inline-flex px-1.5 py-0.5 bg-slate-100 border border-slate-250 rounded font-black text-[10px]">1</span>
                    </td>
                    <td className="py-4 text-center">5°</td>
                    <td className="py-4 text-center">A</td>
                    
                    {/* Acumulativos */}
                    <td className="py-4 text-center">{c1Prom !== null ? c1Prom.toFixed(2) : '--'}</td>
                    <td className="py-4 text-center">{c2Prom !== null ? c2Prom.toFixed(2) : '--'}</td>
                    <td className="py-4 bg-emerald-50/40 font-black text-slate-900 text-xs text-center border-l border-r border-slate-200">
                      {promBase !== null ? promBase.toFixed(2) : '--'}
                    </td>
                    <td className="py-4 text-center flex items-center justify-center h-full my-auto">
                      {promBase === null ? (
                        <span className="bg-sky-500 text-white font-black text-[9px] uppercase rounded px-2.5 py-1 tracking-wider">SIN REGISTRO</span>
                      ) : promBase >= 7 ? (
                        <span className="bg-emerald-500 text-white font-black text-[9px] uppercase rounded px-2.5 py-1 tracking-wider">APRUEBA</span>
                      ) : (
                        <span className="bg-red-500 text-white font-black text-[9px] uppercase rounded px-2.5 py-1 tracking-wider">REPRUEBA</span>
                      )}
                    </td>
                    
                    {/* Recuperación */}
                    <td className="py-4 text-center">
                      {promBase === null || promBase >= 7 ? 'SIN REGISTRO' : promBase.toFixed(2)}
                    </td>
                    <td className="py-4 text-center">
                      {promBase === null || promBase >= 7 ? 'SIN REGISTRO' : (c3Prom !== null ? c3Prom.toFixed(2) : 'SIN REGISTRO')}
                    </td>
                    <td className="py-4 bg-emerald-50/40 font-black text-slate-900 text-xs text-center border-l border-r border-slate-200">
                      {promBase === null || promBase >= 7 ? 'SIN REGISTRO' : (c3Prom !== null ? promSupLocal.toFixed(2) : '--')}
                    </td>
                    <td className="py-4 text-center">
                      {promBase === null ? (
                        <span className="bg-sky-500 text-white font-black text-[9px] uppercase rounded px-2.5 py-1 tracking-wider">SIN REGISTRO</span>
                      ) : promBase >= 7 ? (
                        <span className="bg-sky-500 text-white font-black text-[9px] uppercase rounded px-2.5 py-1 tracking-wider">SIN REGISTRO</span>
                      ) : c3Prom === null ? (
                        <span className="bg-sky-500 text-white font-black text-[9px] uppercase rounded px-2.5 py-1 tracking-wider">SIN REGISTRO</span>
                      ) : promSupLocal >= 7 ? (
                        <span className="bg-emerald-500 text-white font-black text-[9px] uppercase rounded px-2.5 py-1 tracking-wider">APRUEBA</span>
                      ) : (
                        <span className="bg-red-500 text-white font-black text-[9px] uppercase rounded px-2.5 py-1 tracking-wider">REPRUEBA</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Banner de Estado de Aprobación */}
        {libro && (
          <div className={`p-5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
            libro.notaFinal === null || libro.notaFinal === undefined
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : libro.notaFinal >= 7
                ? 'bg-emerald-50 border-emerald-200 text-emerald-805 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-[#ec3724]'
          }`}>
            <div className="space-y-1.5 flex-1">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-85 block">
                Verificación de Estado Académico
              </span>
              <h3 className="text-sm font-black uppercase tracking-wider">
                {libro.notaFinal === null || libro.notaFinal === undefined
                  ? 'Prácticas Preprofesionales en Curso'
                  : libro.notaFinal >= 7
                    ? 'Acreditación Aprobada Satisfactoriamente ✓'
                    : 'Atención: Calificación Insuficiente ⚠️'}
              </h3>
              <p className="text-xs font-semibold opacity-90 leading-relaxed max-w-4xl">
                {libro.notaFinal === null || libro.notaFinal === undefined
                  ? 'Actualmente te encuentras en proceso de acreditación de tus actividades. Una vez que tu docente tutor califique tus entregas pendientes en los tres ciclos correspondientes, se consolidará tu acta definitiva. La nota mínima para aprobar es de 7.00.'
                  : libro.notaFinal >= 7
                    ? `Felicidades, has aprobado y acreditado satisfactoriamente tus horas de prácticas preprofesionales con una calificación acumulada final de ${Number(libro.notaFinal).toFixed(2)} / 10.00.`
                    : `Tu calificación final definitiva es de ${Number(libro.notaFinal).toFixed(2)} / 10.00, la cual se encuentra por debajo de la nota aprobatoria institucional exigida por la ESPOCH (7.00). Por favor, toma contacto con tu docente tutor.`}
              </p>
            </div>
            
            <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
              <span className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider border shadow-sm ${
                libro.notaFinal === null || libro.notaFinal === undefined
                  ? 'bg-white border-blue-200 text-blue-700'
                  : libro.notaFinal >= 7
                    ? 'bg-white border-emerald-200 text-emerald-700'
                    : 'bg-white border-rose-200 text-[#ec3724]'
              }`}>
                {libro.notaFinal === null || libro.notaFinal === undefined
                  ? 'En Curso'
                  : libro.notaFinal >= 7
                    ? 'Aprobado'
                    : 'Reprobado'}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-[#ec3724] p-4 rounded-xl font-bold flex items-center space-x-2 text-xs shadow-sm uppercase tracking-wider">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Tablas por Ciclos */}
        {(libro?.ciclos || []).map((ciclo) => (
          <div key={ciclo.numeroCiclo} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  {ciclo.numeroCiclo === 3 ? 'Examen Supletorio' : `Ciclo Académico ${ciclo.numeroCiclo}`}
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase tracking-wider">
                  {ciclo.numeroCiclo === 3
                    ? 'Evaluación y entregable de recuperación académica de tus prácticas.'
                    : 'Detalle de tareas y notas académicas de este progreso.'}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-250 rounded-lg shadow-sm">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  {ciclo.numeroCiclo === 3 ? 'Nota del Supletorio:' : 'Promedio del Ciclo:'}
                </span>
                <span className={`text-xs font-black ${colorNota(ciclo.promedio)}`}>
                  {ciclo.promedio !== null && ciclo.promedio !== undefined ? Number(ciclo.promedio).toFixed(2) : '--'}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs table-fixed min-w-[950px] border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 uppercase text-[9px] font-black tracking-wider divide-x divide-slate-200">
                    <th className="w-[22%] text-left px-5 py-3">Tarea / Código</th>
                    <th className="w-[10%] text-center px-5 py-3">Puntaje Max</th>
                    <th className="w-[10%] text-center px-5 py-3">Mi Nota</th>
                    <th className="w-[12%] text-center px-5 py-3">Estado</th>
                    <th className="w-[18%] text-left px-5 py-3">Entrega Límite</th>
                    <th className="w-[18%] text-left px-5 py-3">Retroalimentación</th>
                    <th className="w-[10%] text-center px-5 py-3">Archivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {ciclo.numeroCiclo === 3 && promBase !== null && (
                    <tr className="bg-slate-50/50 font-semibold divide-x divide-slate-200">
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col space-y-0.5">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                            Nota Acumulada
                          </span>
                          <span className="font-black text-slate-800 text-xs uppercase leading-snug">
                            Promedio Ciclo 1 y 2
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-500 font-bold">10.00</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`font-black ${colorNota(promBase)}`}>
                          {promBase}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-wider">
                          Base Habilitante
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-bold">—</td>
                      <td className="px-5 py-3.5 text-slate-500 italic text-[10px] leading-relaxed pr-3">
                        Nota de base para el cálculo del supletorio (Fórmula: [Promedio base + Supletorio] / 2).
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-400 font-bold">—</td>
                    </tr>
                  )}
                  {ciclo.tareas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-semibold uppercase tracking-wider bg-slate-50/10">
                        No hay tareas configuradas en este ciclo por tu tutor.
                      </td>
                    </tr>
                  ) : (
                    ciclo.tareas.map((t) => {
                      const disponibilidad = tareaMap.get(t.id);
                      const entrega = t.entrega || disponibilidad?.entrega || null;

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/20 transition-colors divide-x divide-slate-150">
                          <td className="px-5 py-3">
                            <div className="flex flex-col space-y-0.5 min-w-0" title={`${t.codigo} - ${t.titulo}`}>
                              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                                {t.codigo}
                              </span>
                              <span className="font-bold text-slate-800 text-xs truncate uppercase tracking-wide">
                                {t.titulo}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center text-slate-550 font-bold">{t.puntajeMaximo}</td>
                          <td className="px-5 py-3 text-center">
                            {t.titulo.toLowerCase().includes('anexo f') && entrega?.estado === 'calificada' ? (
                              <span className="text-emerald-600 font-bold uppercase">Cumplido</span>
                            ) : entrega?.nota !== null && entrega?.nota !== undefined ? (
                              <span className={`font-black ${colorNota(entrega.nota)}`}>
                                {entrega.nota}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-semibold">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {renderEstadoBadge(entrega?.estado || 'sin_entrega')}
                          </td>
                          <td className="px-5 py-3 space-y-0.5">
                            <p className="text-[10px] text-slate-700 font-bold">
                              {t.fechaCierre ? new Date(t.fechaCierre).toLocaleString() : '—'}
                            </p>
                            {t.fechaCierre && (
                              <p className={`text-[9px] font-bold ${disponibilidad?.estadoVentana === 'abierta' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {formatCountdown(t.fechaCierre, now)}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-[10px] text-slate-500 leading-normal max-h-12 overflow-y-auto break-words" title={entrega?.comentarioDocente || ''}>
                              {entrega?.comentarioDocente || '—'}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-center">
                            {entrega ? (
                              t.titulo.toLowerCase().includes('anexo b') ? (
                                <div className="flex flex-col gap-1 items-center">
                                  {/* Tutor Interno */}
                                  {entrega.nombreArchivoInterno ? (
                                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 justify-between max-w-[85px] w-full">
                                      <span className="text-[8px] font-black text-slate-500 pl-1 uppercase">TI</span>
                                      <div className="flex gap-0.5">
                                        <button
                                          onClick={() => abrirPreview(entrega, 'interno')}
                                          className="p-1 rounded bg-sky-100 text-sky-800 hover:bg-sky-200"
                                          title="Ver Evaluación Tutor Interno"
                                        >
                                          <FiEye className="h-2.5 w-2.5" />
                                        </button>
                                        <button
                                          onClick={() => descargarEntrega(entrega, 'interno')}
                                          className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                                          title="Descargar"
                                        >
                                          <FiDownload className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[8px] text-slate-400 font-bold italic">TI: —</span>
                                  )}

                                  {/* Tutor Externo */}
                                  {entrega.nombreArchivoExterno ? (
                                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 justify-between max-w-[85px] w-full">
                                      <span className="text-[8px] font-black text-slate-500 pl-1 uppercase">TE</span>
                                      <div className="flex gap-0.5">
                                        <button
                                          onClick={() => abrirPreview(entrega, 'externo')}
                                          className="p-1 rounded bg-sky-100 text-sky-800 hover:bg-sky-200"
                                          title="Ver Evaluación Tutor Externo"
                                        >
                                          <FiEye className="h-2.5 w-2.5" />
                                        </button>
                                        <button
                                          onClick={() => descargarEntrega(entrega, 'externo')}
                                          className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                                          title="Descargar"
                                        >
                                          <FiDownload className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[8px] text-slate-400 font-bold italic">TE: —</span>
                                  )}
                                </div>
                              ) : t.titulo.toLowerCase().includes('anexo f') ? (
                                <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-650 border border-slate-200 text-[10px] font-black uppercase whitespace-nowrap">
                                  Docente ✓
                                </span>
                              ) : !entrega.rutaArchivo ? (
                                <span className="text-[10px] text-slate-400 font-bold italic">Sin archivo</span>
                              ) : (
                                <div className="flex gap-1 items-center justify-center">
                                  <button
                                    onClick={() => abrirPreview(entrega)}
                                    className="p-1 rounded bg-sky-100 text-sky-850 hover:bg-sky-200 border border-sky-200/40"
                                    title="Ver archivo"
                                  >
                                    <FiEye className="h-3 w-3 text-sky-700" />
                                  </button>
                                  <button
                                    onClick={() => descargarEntrega(entrega)}
                                    className="p-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-250/40"
                                    title="Descargar archivo"
                                  >
                                    <FiDownload className="h-3 w-3" />
                                  </button>
                                </div>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Sin archivo</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {preview.open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center animate-fadeIn">
          <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider truncate pr-4">Vista Previa - {preview.nombre}</h4>
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

export default MisCalificaciones;
