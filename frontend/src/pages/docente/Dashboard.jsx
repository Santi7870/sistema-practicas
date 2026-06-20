import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiAlertCircle,
  FiArrowRight,
  FiBookOpen,
  FiCheckCircle,
  FiClipboard,
  FiUsers,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

const DocenteDashboard = () => {
  const { usuario, docente } = useAuth();
  const location = useLocation();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [entregasPendientes, setEntregasPendientes] = useState([]);
  const [paraleloDocente, setParaleloDocente] = useState(null);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError('');
      const [rEst, rTareas, rPend] = await Promise.all([
        api.get('/docente/estudiantes'),
        api.get('/docente/tareas'),
        api.get('/docente/entregas/pendientes?limit=8'),
      ]);
      setEstudiantes(rEst.data.data || []);
      setParaleloDocente(rEst.data.paraleloAsignado || null);
      setTareas(rTareas.data.data || []);
      setEntregasPendientes(rPend.data.data || []);
    } catch (err) {
      setError(err?.message || 'No se pudo cargar el panel docente.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const resumen = useMemo(() => {
    let enProceso = 0;
    let finalizados = 0;

    for (const inscripcion of estudiantes) {
      const estado = inscripcion?.estudiante?.estadoProceso;
      if (estado === 'en_proceso') enProceso += 1;
      if (estado === 'finalizado') finalizados += 1;
    }

    return {
      estudiantes: estudiantes.length,
      tareasCreadas: tareas.length,
      entregasPorCalificar: entregasPendientes.length,
      enProceso,
      finalizados,
    };
  }, [estudiantes, tareas, entregasPendientes]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="h-[calc(100vh-64px)] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
        
        {/* Welcome Header */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
          <div className="pl-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">Panel Docente Tutor</h1>
              {paraleloDocente ? (
                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider select-none ${
                  paraleloDocente.tipoPractica === 'laboral'
                    ? 'bg-rose-50 border-rose-100 text-[#ec3724]'
                    : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                }`}>
                  <span>{paraleloDocente.tipoPractica === 'laboral' ? '💼' : '🤝'}</span>
                  <span>Paralelo {paraleloDocente.nombre}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded border text-[10px] font-black bg-amber-50 border-amber-200 text-amber-800 uppercase tracking-wider select-none">
                  <span>⚠️</span>
                  <span>Sin Paralelo Asignado</span>
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-1.5">
              Bienvenido, <strong className="text-slate-800">{docente?.nombres || usuario?.email}</strong>. Gestiona tareas por ciclos y calificaciones.
            </p>
            {error && <p className="text-xs font-black text-rose-600 mt-2 uppercase tracking-wide">{error}</p>}
          </div>
          <div className="flex flex-wrap gap-2 pl-2 lg:pl-0">
            <Link
              to={paraleloDocente ? "/docente/ciclos" : "#"}
              onClick={(e) => !paraleloDocente && e.preventDefault()}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all ${
                paraleloDocente
                  ? 'bg-[#ec3724] text-white hover:bg-[#d32010] active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <FiClipboard /> Gestión de Ciclos y Tareas
            </Link>
            <Link
              to={paraleloDocente ? "/docente/estudiantes" : "#"}
              onClick={(e) => !paraleloDocente && e.preventDefault()}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all ${
                paraleloDocente
                  ? 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <FiUsers /> Ver Estudiantes
            </Link>
            <Link
              to="/formatos"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 active:scale-[0.98]"
            >
              <FiClipboard /> Formatos Oficiales
            </Link>
          </div>
        </div>

        {estudiantes.length === 0 && (
          <div className="bg-red-50 border-l-4 border-[#ec3724] p-5 rounded-r-xl shadow-sm animate-fadeIn">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertCircle className="h-6 w-6 text-[#ec3724]" />
              </div>
              <div className="ml-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Sin Estudiantes o Paralelos Asignados
                </h3>
                <div className="mt-1 text-xs font-semibold text-slate-650">
                  No tienes cursos, paralelos o estudiantes asignados actualmente. Si consideras que esto es un error, por favor contacta al administrador.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Estudiantes Tutelados</span>
            <p className="text-3xl font-black text-slate-800 mt-1">{resumen.estudiantes}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tareas Creadas</span>
            <p className="text-3xl font-black text-[#ec3724] mt-1">{resumen.tareasCreadas}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Por Calificar</span>
            <p className="text-3xl font-black text-rose-600 mt-1">{resumen.entregasPorCalificar}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">En Proceso</span>
            <p className="text-3xl font-black text-amber-600 mt-1">{resumen.enProceso}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Acreditados</span>
            <p className="text-3xl font-black text-emerald-600 mt-1">{resumen.finalizados}</p>
          </div>
        </div>

        {/* Pending Tasks Table Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Entregas Recientes por Calificar</h2>
            <Link
              to="/docente/ciclos"
              className="text-[#ec3724] hover:text-[#d32010] text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1 transition-colors"
            >
              Ir a Ciclos <FiArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {entregasPendientes.length === 0 ? (
            <div className="p-10 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white">
              No tienes entregas pendientes por calificar en tus ciclos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-550 font-black uppercase text-[9px] tracking-wider divide-x divide-slate-200">
                    <th className="px-5 py-3">Estudiante</th>
                    <th className="px-5 py-3">Tarea Académica</th>
                    <th className="px-5 py-3">Archivo</th>
                    <th className="px-5 py-3">Fecha de Entrega</th>
                    <th className="px-5 py-3 text-center">Estado</th>
                    <th className="px-5 py-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700 font-semibold bg-white">
                  {entregasPendientes.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors divide-x divide-slate-100">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-850 text-xs uppercase">{e.inscripcion?.estudiante?.nombres || 'Sin nombre'}</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">{e.inscripcion?.estudiante?.usuario?.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">{e.tarea?.codigo}</span>
                        <p className="font-bold text-slate-800 truncate uppercase max-w-[200px]" title={e.tarea?.titulo}>{e.tarea?.titulo}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-semibold truncate max-w-[150px]" title={e.nombreArchivo}>
                        {e.nombreArchivo}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-bold">
                        {new Date(e.fechaEntrega).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                          e.estado === 'tarde'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-sky-50 border-sky-200 text-sky-700'
                        }`}>
                          {e.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Link
                          to={`/docente/tareas/${e.tarea?.id}`}
                          state={{ from: location.pathname }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-850 hover:text-sky-900 border border-sky-200/50 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm transition-all"
                        >
                          <FiBookOpen className="h-3 w-3" /> Calificar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Informative Reminders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ec3724]" />
            <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-2">
              <FiAlertCircle className="text-[#ec3724] h-4 w-4" /> Recordatorio Académico
            </p>
            <p className="text-xs font-semibold text-slate-600 mt-2.5 leading-relaxed">
              Las entregas fuera de la ventana del cronograma institucional ya no se aceptan automáticamente. Valida rigurosamente las fechas de apertura y cierre al programar o extender cada tarea.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
            <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-2">
              <FiCheckCircle className="text-emerald-600 h-4 w-4" /> Estado de Evaluación
            </p>
            <p className="text-xs font-semibold text-slate-600 mt-2.5 leading-relaxed">
              Sistema de ciclos activo e integrado con cálculo automático de promedios ponderados y nota final sobre 10.00 puntos según las directivas del reglamento oficial de la ESPOCH.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DocenteDashboard;
