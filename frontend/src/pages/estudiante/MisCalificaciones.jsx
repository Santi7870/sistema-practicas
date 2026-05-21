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

  const abrirPreview = async (entrega) => {
    try {
      const response = await api.get(`/estudiante/entregas/${entrega.id}/preview`, {
        responseType: 'blob',
      });
      const contentType = response.headers['content-type'] || '';
      const blob = new Blob([response.data], { type: contentType });

      if (!contentType.includes('pdf')) {
        descargarBlob(blob, entrega.nombreArchivo || `entrega-${entrega.id}`);
        return;
      }

      if (preview.url) URL.revokeObjectURL(preview.url);
      setPreview({
        open: true,
        url: URL.createObjectURL(blob),
        nombre: entrega.nombreArchivo || 'archivo.pdf',
      });
    } catch (err) {
      setError(err?.message || 'No se pudo abrir la vista previa.');
    }
  };

  const descargarEntrega = async (entrega) => {
    try {
      const response = await api.get(`/estudiante/entregas/${entrega.id}/descargar`, {
        responseType: 'blob',
      });
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      descargarBlob(new Blob([response.data], { type: contentType }), entrega.nombreArchivo || `entrega-${entrega.id}`);
    } catch (err) {
      setError(err?.message || 'No se pudo descargar el archivo.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
        
        {/* Botón de Retorno Fuera de la Tarjeta */}
        <div className="flex items-center">
          <Link
            to={requestedTipo ? `/estudiante/mis-practicas?tipo=${requestedTipo}` : "/estudiante/mis-practicas"}
            className="inline-flex items-center gap-2 text-[11px] font-extrabold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-100"
          >
            <FiArrowLeft className="h-4 w-4 text-slate-400" /> Volver a Mis Prácticas
          </Link>
        </div>

        {esSoloLectura && (
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 shadow-md animate-fadeIn">
            <div className="p-2 bg-amber-500/20 text-amber-800 rounded-xl border border-amber-500/30">
              <FiInfo className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Vista de Solo Lectura — Calificaciones de Prácticas {requestedTipo === 'comunitaria' ? 'Comunitarias' : 'Laborales'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Historial académico de esta modalidad. No se permiten nuevas acciones de entrega.
              </p>
            </div>
          </div>
        )}

        {/* Cabecera Simple */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-2">
              <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">
                Libro de Calificaciones
              </span>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                Mis Calificaciones
              </h1>
              <p className="text-slate-500 text-sm max-w-xl leading-relaxed">
                Esta vista es de consulta académica. Recuerda que para subir tus reportes y anexos debes hacerlo desde la sección de entregas en tus ciclos.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 w-full text-center border border-slate-200/50">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Nota Promedio Final</span>
              <span className={`block text-4xl font-black ${colorNota(libro?.notaFinal)} mt-1`}>
                {libro?.notaFinal ?? '--'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-1">Promedio de los 3 Ciclos</span>
            </div>
          </div>
        </div>

        {/* Banner de Estado de Aprobación */}
        {libro && (
          <div className={`p-6 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm transition-all duration-300 ${
            libro.notaFinal === null || libro.notaFinal === undefined
              ? 'bg-blue-50/50 border-blue-100/80 text-blue-800'
              : libro.notaFinal >= 7
                ? 'bg-emerald-50/50 border-emerald-100/80 text-emerald-800'
                : 'bg-rose-50/50 border-rose-100/80 text-rose-800'
          }`}>
            <div className="space-y-1.5 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">
                Verificación de Estado Académico
              </span>
              <h3 className="text-lg font-black tracking-tight">
                {libro.notaFinal === null || libro.notaFinal === undefined
                  ? 'Prácticas Preprofesionales en Curso 📖'
                  : libro.notaFinal >= 7
                    ? '¡Felicidades! Cumples con los requisitos de Aprobación 🎉'
                    : 'Atención: Calificación Insuficiente para Aprobación ⚠️'}
              </h3>
              <p className="text-xs opacity-90 leading-relaxed max-w-3xl">
                {libro.notaFinal === null || libro.notaFinal === undefined
                  ? 'Actualmente te encuentras en proceso. Una vez que tus tutores califiquen todas tus entregas en los tres ciclos correspondientes, se calculará tu promedio final acumulado. La nota mínima para aprobar es de 7.0.'
                  : libro.notaFinal >= 7
                    ? `Has aprobado satisfactoriamente tus prácticas preprofesionales con una calificación promedio final de ${libro.notaFinal} / 10.00. Cumples con el estándar académico de aprobación mínima (7.00).`
                    : `Tu calificación promedio acumulada de los ciclos calificados es de ${libro.notaFinal} / 10.00, la cual se encuentra por debajo de la nota mínima aprobatoria exigida por la ESPOCH (7.00). Por favor, contacta con tu tutor asignado.`}
              </p>
            </div>
            
            <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
              <span className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border shadow-sm ${
                libro.notaFinal === null || libro.notaFinal === undefined
                  ? 'bg-white border-blue-200 text-blue-700'
                  : libro.notaFinal >= 7
                    ? 'bg-white border-emerald-200 text-emerald-700'
                    : 'bg-white border-rose-200 text-rose-700'
              }`}>
                {libro.notaFinal === null || libro.notaFinal === undefined
                  ? 'En Curso'
                  : libro.notaFinal >= 7
                    ? 'Aprobado ✓'
                    : 'Reprobado ✗'}
              </span>
            </div>
          </div>
        )}


        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl font-bold flex items-center space-x-2 text-sm shadow-sm">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Tablas por Ciclos */}
        {(libro?.ciclos || []).map((ciclo) => (
          <div key={ciclo.numeroCiclo} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-800">Ciclo {ciclo.numeroCiclo}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Detalle de tareas y notas académicas de este progreso.</p>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200/60 rounded-2xl shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Promedio del Ciclo:</span>
                <span className={`text-base font-black ${colorNota(ciclo.promedio)}`}>
                  {ciclo.promedio ?? '--'}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed min-w-[950px]">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="w-[22%] text-left px-6 py-3.5">Tarea</th>
                    <th className="w-[10%] text-left px-6 py-3.5">Puntaje max</th>
                    <th className="w-[10%] text-left px-6 py-3.5">Mi nota</th>
                    <th className="w-[12%] text-left px-6 py-3.5">Estado</th>
                    <th className="w-[18%] text-left px-6 py-3.5">Cierre / Countdown</th>
                    <th className="w-[18%] text-left px-6 py-3.5">Retroalimentación</th>
                    <th className="w-[10%] text-left px-6 py-3.5">Archivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ciclo.tareas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-semibold bg-slate-50/10">
                        No hay tareas configuradas en este ciclo por tu tutor.
                      </td>
                    </tr>
                  ) : (
                    ciclo.tareas.map((t) => {
                      const disponibilidad = tareaMap.get(t.id);
                      const entrega = t.entrega || disponibilidad?.entrega || null;

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="w-[22%] px-6 py-4">
                            <div className="flex flex-col space-y-0.5 min-w-0" title={`${t.codigo} - ${t.titulo}`}>
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                                {t.codigo}
                              </span>
                              <span className="font-bold text-slate-800 text-sm leading-snug truncate">
                                {t.titulo}
                              </span>
                            </div>
                          </td>
                          <td className="w-[10%] px-6 py-4 text-slate-600 font-bold">{t.puntajeMaximo}</td>
                          <td className="w-[10%] px-6 py-4">
                            {entrega?.nota !== null && entrega?.nota !== undefined ? (
                              <span className={`font-black ${colorNota(entrega.nota)}`}>
                                {entrega.nota}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-semibold">—</span>
                            )}
                          </td>
                          <td className="w-[12%] px-6 py-4">
                            {renderEstadoBadge(entrega?.estado || 'sin_entrega')}
                          </td>
                          <td className="w-[18%] px-6 py-4 space-y-1">
                            <p className="text-xs text-slate-700 font-bold">
                              {t.fechaCierre ? new Date(t.fechaCierre).toLocaleString() : '—'}
                            </p>
                            {t.fechaCierre && (
                              <p className={`text-[10px] font-bold ${disponibilidad?.estadoVentana === 'abierta' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {formatCountdown(t.fechaCierre, now)}
                              </p>
                            )}
                          </td>
                          <td className="w-[18%] px-6 py-4">
                            <p className="text-xs text-slate-600 leading-normal max-h-12 overflow-y-auto break-words" title={entrega?.comentarioDocente || ''}>
                              {entrega?.comentarioDocente || '—'}
                            </p>
                          </td>
                          <td className="w-[10%] px-6 py-4">
                            {entrega ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => abrirPreview(entrega)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold border border-sky-200/50 transition-all text-xs"
                                  title="Ver archivo"
                                >
                                  <FiEye className="h-3.5 w-3.5" /> Ver
                                </button>
                                <button
                                  onClick={() => descargarEntrega(entrega)}
                                  className="inline-flex items-center justify-center p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border border-slate-200/50 transition-all text-xs"
                                  title="Descargar archivo"
                                >
                                  <FiDownload className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-bold">Sin archivo</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md p-4 flex items-center justify-center animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="font-extrabold text-slate-800 truncate pr-4">Vista previa - {preview.nombre}</h4>
              <button
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm transition-all"
                onClick={() => {
                  if (preview.url) URL.revokeObjectURL(preview.url);
                  setPreview({ open: false, url: '', nombre: '' });
                }}
              >
                Cerrar
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
