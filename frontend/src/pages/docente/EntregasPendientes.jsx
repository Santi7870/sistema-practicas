import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiArrowLeft,
  FiSearch,
  FiFilter,
  FiBookOpen,
  FiClipboard,
  FiUser,
  FiClock,
  FiFileText,
  FiAlertCircle
} from 'react-icons/fi';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

const EntregasPendientes = () => {
  const location = useLocation();
  const [entregas, setEntregas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroCiclo, setFiltroCiclo] = useState('todos');
  const [filtroModalidad, setFiltroModalidad] = useState('todas');

  const cargarPendientes = async () => {
    try {
      setCargando(true);
      setError('');
      // Solicitamos con un límite alto (500) para obtener todas las entregas pendientes de tutoría activa
      const response = await api.get('/docente/entregas/pendientes?limit=500');
      setEntregas(response.data.data || []);
    } catch (err) {
      console.error('Error al cargar entregas pendientes:', err);
      setError(err?.response?.data?.message || err?.message || 'No se pudieron cargar las entregas pendientes.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPendientes();
  }, []);

  const entregasFiltradas = useMemo(() => {
    return entregas.filter((e) => {
      // 1. Filtro por búsqueda
      const query = busqueda.toLowerCase().trim();
      const nombresMatch = e.inscripcion?.estudiante?.nombres?.toLowerCase().includes(query) || false;
      const emailMatch = e.inscripcion?.estudiante?.usuario?.email?.toLowerCase().includes(query) || false;
      const tituloMatch = e.tarea?.titulo?.toLowerCase().includes(query) || false;
      const codigoMatch = e.tarea?.codigo?.toLowerCase().includes(query) || false;
      const searchMatch = query === '' || nombresMatch || emailMatch || tituloMatch || codigoMatch;

      // 2. Filtro por Ciclo
      const cicloMatch = filtroCiclo === 'todos' || String(e.tarea?.numeroCiclo) === filtroCiclo;

      // 3. Filtro por Modalidad
      const modalidadMatch =
        filtroModalidad === 'todas' ||
        (filtroModalidad === 'laboral' && e.inscripcion?.tipoPractica === 'laboral') ||
        (filtroModalidad === 'comunitaria' && e.inscripcion?.tipoPractica === 'comunitaria');

      return searchMatch && cicloMatch && modalidadMatch;
    });
  }, [entregas, busqueda, filtroCiclo, filtroModalidad]);

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Botón Volver y Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/docente/dashboard"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <FiArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Volver al Inicio</span>
          </Link>
        </div>

        {/* Encabezado Principal */}
        <div className="bg-white rounded-xl border-l-4 border-l-[#ec3724] border-t border-r border-b border-slate-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-slate-100 rounded-full blur-2xl"></div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
            Bandeja de Entregas Pendientes
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1.5">
            Aquí se muestran todos los entregables subidos por tus estudiantes tutorados que se encuentran en estado <strong className="text-[#ec3724] font-bold">Pendiente</strong> o <strong className="text-amber-600 font-bold">Tardío</strong>.
          </p>
        </div>

        {/* Panel de Búsqueda y Filtros */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Buscador */}
          <div className="relative md:col-span-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Buscar Entrega
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por estudiante, código o título de tarea..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ec3724] focus:border-[#ec3724] text-xs text-slate-700 placeholder-slate-400 transition shadow-sm"
              />
            </div>
          </div>

          {/* Filtro Ciclo */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Filtrar por Ciclo
            </label>
            <div className="relative">
              <FiFilter className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                value={filtroCiclo}
                onChange={(e) => setFiltroCiclo(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ec3724] focus:border-[#ec3724] text-xs text-slate-700 bg-white appearance-none cursor-pointer transition shadow-sm font-semibold"
              >
                <option value="todos">Todos los Ciclos</option>
                <option value="1">Ciclo 1</option>
                <option value="2">Ciclo 2</option>
                <option value="3">Ciclo 3 (Supletorio)</option>
              </select>
            </div>
          </div>

          {/* Filtro Modalidad */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              Filtrar por Modalidad
            </label>
            <div className="relative">
              <FiFilter className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                value={filtroModalidad}
                onChange={(e) => setFiltroModalidad(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ec3724] focus:border-[#ec3724] text-xs text-slate-700 bg-white appearance-none cursor-pointer transition shadow-sm font-semibold"
              >
                <option value="todas">Todas las Modalidades</option>
                <option value="laboral">Prácticas Laborales</option>
                <option value="comunitaria">Prácticas Comunales</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Listado de Entregas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Entregas por Calificar ({entregasFiltradas.length})
            </h2>
            <button
              onClick={cargarPendientes}
              className="text-xs font-bold text-[#ec3724] hover:underline bg-transparent border-0 cursor-pointer"
            >
              Actualizar Bandeja
            </button>
          </div>

          {cargando ? (
            <div className="p-16 text-center text-slate-450 flex flex-col items-center justify-center gap-3">
              <svg className="animate-spin h-8 w-8 text-[#ec3724]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Cargando entregas pendientes...</p>
            </div>
          ) : entregasFiltradas.length === 0 ? (
            <div className="p-16 text-center text-slate-400 bg-white">
              <FiClipboard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-black text-slate-500 uppercase tracking-wider">
                Bandeja de entrada vacía
              </p>
              <p className="text-xs text-slate-400 mt-1 font-semibold">
                No tienes entregas pendientes por revisar que coincidan con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-550 font-black uppercase text-[9px] tracking-wider divide-x divide-slate-200">
                    <th className="px-5 py-3">Estudiante</th>
                    <th className="px-5 py-3">Tarea Académica</th>
                    <th className="px-5 py-3">Archivo de Entrega</th>
                    <th className="px-5 py-3">Fecha de Envío</th>
                    <th className="px-5 py-3 text-center">Estado</th>
                    <th className="px-5 py-3 text-center w-[120px]">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-705 text-slate-700 font-semibold bg-white">
                  {entregasFiltradas.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors divide-x divide-slate-100">
                      {/* Estudiante */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-300 shadow-sm flex-shrink-0">
                            {getInitials(e.inscripcion?.estudiante?.nombres)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs uppercase">
                              {e.inscripcion?.estudiante?.nombres || 'Sin nombre'}
                            </p>
                            <p className="text-[9px] font-bold text-slate-450 mt-0.5">
                              {e.inscripcion?.estudiante?.usuario?.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Tarea Académica */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {e.tarea?.codigo}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            Ciclo {e.tarea?.numeroCiclo}
                          </span>
                          <span className={`inline-block px-1.5 py-0.2 px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            e.inscripcion?.tipoPractica === 'laboral'
                              ? 'bg-rose-50 text-[#ec3724] border border-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {e.inscripcion?.tipoPractica === 'comunitaria' ? 'Comunales' : 'Laborales'}
                          </span>
                        </div>
                        <p className="font-black text-slate-900 truncate uppercase mt-1.5 max-w-[220px]" title={e.tarea?.titulo}>
                          {e.tarea?.titulo}
                        </p>
                      </td>

                      {/* Archivo */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-600 truncate max-w-[200px]" title={e.nombreArchivo}>
                          <FiFileText className="text-slate-400 w-4 h-4 flex-shrink-0" />
                          <span className="truncate text-xs font-semibold">{e.nombreArchivo}</span>
                        </div>
                      </td>

                      {/* Fecha de Envío */}
                      <td className="px-5 py-3.5 text-slate-600 font-bold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <FiClock className="text-slate-400 w-3.5 h-3.5" />
                          <span>{new Date(e.fechaEntrega).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                          e.estado === 'tarde'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-sky-50 border-sky-200 text-sky-700'
                        }`}>
                          {e.estado === 'tarde' ? 'Tardía' : 'A tiempo'}
                        </span>
                      </td>

                      {/* Acción Calificar */}
                      <td className="px-5 py-3.5 text-center">
                        <Link
                          to={`/docente/tareas/${e.tarea?.id}`}
                          state={{ from: location.pathname }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ec3724] hover:bg-[#d12a1a] text-white border border-[#ec3724] rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm transition-all"
                        >
                          <FiBookOpen className="h-3.5 w-3.5" /> Calificar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EntregasPendientes;
