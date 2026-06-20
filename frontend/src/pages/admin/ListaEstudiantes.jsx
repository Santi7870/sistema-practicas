import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../services/api';
import {
  FiSearch,
  FiFilter,
  FiUsers,
  FiEye,
  FiMail,
  FiHash,
  FiBookOpen,
  FiCpu,
  FiAlertCircle,
  FiCheck,
  FiX,
  FiInfo,
  FiBriefcase,
  FiUser
} from 'react-icons/fi';

const ListaEstudiantes = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [estudiantesFiltrados, setEstudiantesFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [tabActiva, setTabActiva] = useState('laborales'); // 'laborales', 'comunales', 'sin_matricula'
  const [paraleloFiltro, setParaleloFiltro] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const location = useLocation();

  // Estados para el proceso de Auto-Asignación
  const [asignando, setAsignando] = useState(false);
  const [modalResumen, setModalResumen] = useState(null); // { totalAsignados, resumen: [], modalidad }
  const [errorAsignacion, setErrorAsignacion] = useState('');

  // Nuevos Estados para Monitor y Asignación Rápida
  const [docentes, setDocentes] = useState([]);
  const [paralelos, setParalelos] = useState([]);
  const [monitorAbierto, setMonitorAbierto] = useState(false);

  useEffect(() => {
    cargarEstudiantes();
    cargarDocentes();
    cargarParalelos();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filtroParam = params.get('filtro');
    if (filtroParam === 'revision') {
      setEstadoFiltro('revision_f1');
    }
  }, [location.search]);

  useEffect(() => {
    filtrarEstudiantes();
  }, [busqueda, estadoFiltro, paraleloFiltro, tabActiva, estudiantes]);

  const cargarParalelos = async () => {
    try {
      const response = await api.get('/admin/paralelos');
      setParalelos(response.data.data);
    } catch (error) {
      console.error('Error al cargar paralelos:', error);
    }
  };

  const cargarDocentes = async () => {
    try {
      const response = await api.get('/admin/docentes');
      setDocentes(response.data.data);
    } catch (error) {
      console.error('Error al cargar docentes:', error);
    }
  };

  const cargarEstudiantes = async () => {
    try {
      setCargando(true);
      const response = await api.get('/admin/estudiantes');
      setEstudiantes(response.data.data);
    } catch (error) {
      console.error('Error al cargar estudiantes:', error);
    } finally {
      setCargando(false);
    }
  };
  const filtrarEstudiantes = () => {
    let filtrados = [...estudiantes];

    // 1. Filtrar por Tab Activa (Modalidades)
    if (tabActiva === 'laborales') {
      filtrados = filtrados.filter(
        (est) => est.inscripcion?.activa && est.inscripcion?.tipoPractica === 'laboral'
      );
    } else if (tabActiva === 'comunales') {
      filtrados = filtrados.filter(
        (est) => est.inscripcion?.activa && est.inscripcion?.tipoPractica === 'comunitaria'
      );
    } else if (tabActiva === 'sin_matricula') {
      filtrados = filtrados.filter(
        (est) => !est.inscripcion || !est.inscripcion?.activa || est.estadoProceso === 'sin_asignar'
      );
    }

    // 2. Filtrar por estado de proceso (si es distinto a 'todos')
    if (estadoFiltro !== 'todos') {
      if (estadoFiltro === 'revision_f1') {
        filtrados = filtrados.filter(
          (est) => est.estadoProceso === 'asignado' && est.inscripcion?.estadoDocumentosRequisitos === 'en_revision'
        );
      } else {
        filtrados = filtrados.filter(
          (est) => est.estadoProceso === estadoFiltro
        );
      }
    }

    // 2.5 Filtrar por paralelo (si es distinto a 'todos')
    if (paraleloFiltro !== 'todos') {
      if (paraleloFiltro === 'sin_paralelo') {
        filtrados = filtrados.filter(
          (est) => !est.inscripcion?.paraleloId
        );
      } else {
        filtrados = filtrados.filter(
          (est) => est.inscripcion?.paraleloId === parseInt(paraleloFiltro)
        );
      }
    }

    // 3. Filtrar por búsqueda (nombres, código, email, tutor)
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      filtrados = filtrados.filter(
        (est) =>
          est.nombres?.toLowerCase().includes(busquedaLower) ||
          est.codigo?.includes(busqueda) ||
          est.usuario?.email?.toLowerCase().includes(busquedaLower) ||
          est.inscripcion?.tutor?.nombres?.toLowerCase().includes(busquedaLower) ||
          est.inscripcion?.convenio?.nombreEmpresa?.toLowerCase().includes(busquedaLower)
      );
    }

    setEstudiantesFiltrados(filtrados);
  };

  const ejecutarAutoAsignacion = async (modalidad) => {
    setAsignando(true);
    setErrorAsignacion('');
    try {
      const response = await api.post('/admin/docentes/auto-asignar', { modalidad });
      
      if (response.data.success) {
        setModalResumen({
          modalidad,
          totalAsignados: response.data.data.totalAsignados,
          resumen: response.data.data.resumen,
          message: response.data.message
        });
        // Recargar los estudiantes para refrescar tutores en pantalla
        await cargarEstudiantes();
        // Recargar docentes para refrescar el monitor lateral
        await cargarDocentes();
      } else {
        setErrorAsignacion(response.data.message || 'Ocurrió un error al auto-asignar.');
      }
    } catch (error) {
      console.error('Error al auto-asignar tutores:', error);
      setErrorAsignacion(error.response?.data?.message || 'Error en la conexión con el servidor.');
    } finally {
      setAsignando(false);
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      sin_asignar: { color: 'bg-gray-100 text-gray-800 border-gray-200', texto: 'Sin Inscribir' },
      asignado: { color: 'bg-amber-100 text-amber-800 border-amber-200', texto: 'Asignado (F1)' },
      pendiente_inicio: { color: 'bg-blue-100 text-blue-800 border-blue-200', texto: 'Pend. Inicio (F2)' },
      en_proceso: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', texto: 'En Proceso (F3-F4)' },
      finalizado: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', texto: 'Finalizado' },
    };
    return badges[estado] || { color: 'bg-gray-100 text-gray-800 border-gray-200', texto: estado };
  };

  // Conteos dinámicos para las pestañas
  const countLaborales = estudiantes.filter(
    (est) => est.inscripcion?.activa && est.inscripcion?.tipoPractica === 'laboral'
  ).length;

  const countComunales = estudiantes.filter(
    (est) => est.inscripcion?.activa && est.inscripcion?.tipoPractica === 'comunitaria'
  ).length;

  const countSinMatricula = estudiantes.filter(
    (est) => !est.inscripcion || !est.inscripcion?.activa || est.estadoProceso === 'sin_asignar'
  ).length;

  if (cargando && estudiantes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
        
        {/* Welcome Header */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
          <div className="pl-2">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
              Control de Alumnos y Matrículas
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Monitorea las fases de los estudiantes, gestiona la acreditación de prácticas y distribuye paralelos.
            </p>
          </div>
        </div>

        {/* Métricas Resumen Académico */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
              <FiUsers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Alumnos</span>
              <h3 className="text-2xl font-black text-slate-800 mt-0.5">{estudiantes.length}</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className="p-2.5 bg-rose-50 text-[#ec3724] rounded-lg border border-rose-100">
              <FiBriefcase className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Prácticas Laborales</span>
              <h3 className="text-2xl font-black text-slate-800 mt-0.5">{countLaborales}</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <FiBookOpen className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Prácticas Comunitarias</span>
              <h3 className="text-2xl font-black text-slate-800 mt-0.5">{countComunales}</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
              <FiAlertCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Sin Matrícula</span>
              <h3 className="text-2xl font-black text-slate-800 mt-0.5">{countSinMatricula}</h3>
            </div>
          </div>
        </div>

        {/* Buscador y Filtro Rápido */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-450" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por estudiante, código de barras, tutor asignado o convenio..."
              className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
            />
          </div>

          <div className="relative min-w-[200px]">
            <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-450" />
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-700 cursor-pointer appearance-none"
            >
              <option value="todos">Todos los Estados (Fases)</option>
              <option value="sin_asignar">Sin Inscribir</option>
              <option value="asignado">Asignado (Fase 1)</option>
              <option value="revision_f1">Pendientes de Revisión (F1)</option>
              <option value="pendiente_inicio">Pendiente de Inicio (Fase 2)</option>
              <option value="en_proceso">En Proceso (Fase 3-4)</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>

          <div className="relative min-w-[200px]">
            <FiBookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-450" />
            <select
              value={paraleloFiltro}
              onChange={(e) => setParaleloFiltro(e.target.value)}
              className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-700 cursor-pointer appearance-none"
            >
              <option value="todos">Todos los Paralelos</option>
              <option value="sin_paralelo">Sin Paralelo Asignado</option>
              {paralelos
                .filter(p => p.tipoPractica === tabActiva)
                .map(p => (
                  <option key={p.id} value={p.id}>
                    Paralelo {p.nombre}
                  </option>
                ))
              }
            </select>
          </div>
        </div>

        {/* Pestañas Estilizadas Premium */}
        <div className="border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex space-x-2 overflow-x-auto pb-px">
            <button
              onClick={() => { setTabActiva('laborales'); setEstadoFiltro('todos'); setParaleloFiltro('todos'); }}
              className={`px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
                tabActiva === 'laborales'
                  ? 'border-[#ec3724] text-[#ec3724]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FiBriefcase className="h-4 w-4" />
              <span>Prácticas Laborales</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] font-black ${
                tabActiva === 'laborales' ? 'bg-rose-50 text-[#ec3724] border border-rose-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {countLaborales}
              </span>
            </button>

            <button
              onClick={() => { setTabActiva('comunales'); setEstadoFiltro('todos'); setParaleloFiltro('todos'); }}
              className={`px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
                tabActiva === 'comunales'
                  ? 'border-[#ec3724] text-[#ec3724]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FiBookOpen className="h-4 w-4" />
              <span>Prácticas Comunitarias</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] font-black ${
                tabActiva === 'comunales' ? 'bg-[#ec3724]/10 text-[#ec3724]' : 'bg-slate-100 text-slate-600'
              }`}>
                {countComunales}
              </span>
            </button>

            <button
              onClick={() => { setTabActiva('sin_matricula'); setEstadoFiltro('todos'); setParaleloFiltro('todos'); }}
              className={`px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
                tabActiva === 'sin_matricula'
                  ? 'border-[#ec3724] text-[#ec3724]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FiAlertCircle className="h-4 w-4" />
              <span>Sin Matrícula / Registro</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] font-black ${
                tabActiva === 'sin_matricula' ? 'bg-amber-50 text-amber-800 border border-amber-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {countSinMatricula}
              </span>
            </button>
          </div>
        </div>

        {/* Alertas de error en asignación */}
        {errorAsignacion && (
          <div className="p-4 bg-rose-50 border border-rose-150 text-[#ec3724] rounded-xl flex items-center gap-3 text-xs font-bold">
            <FiAlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
            <span>{errorAsignacion}</span>
          </div>
        )}

        {/* Listado Principal de Alumnos */}
        {estudiantesFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <FiUsers className="h-12 w-12 text-slate-350 mx-auto mb-4" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
              No hay alumnos registrados en esta sección
            </h3>
            <p className="text-[11px] font-semibold text-slate-500">
              {busqueda || estadoFiltro !== 'todos'
                ? 'Intenta borrando el buscador o ajustando los filtros de fase actual.'
                : 'No se registran alumnos bajo esta modalidad actualmente.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 table-auto">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-550 font-black uppercase text-[9px] tracking-wider divide-x divide-slate-200">
                    <th className="px-3.5 py-3 text-left w-[220px]">Estudiante</th>
                    <th className="px-3.5 py-3 text-left w-[120px]">Código / Semestre</th>
                    <th className="px-3.5 py-3 text-left w-[120px]">Fase Actual</th>
                    <th className="px-3.5 py-3 text-left w-[180px]">Empresa Convenio</th>
                    <th className="px-3.5 py-3 text-left w-[200px]">Paralelo / Tutor Académico</th>
                    <th className="px-3.5 py-3 text-center w-[100px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 text-slate-700 font-semibold">
                  {estudiantesFiltrados.map((estudiante) => {
                    const badge = getEstadoBadge(estudiante.estadoProceso);

                    return (
                      <tr
                        key={estudiante.id}
                        className="hover:bg-slate-50/50 transition-colors divide-x divide-slate-100 text-[11px]"
                      >
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center min-w-0">
                            <div className="bg-slate-100 w-7 h-7 rounded-full flex items-center justify-center font-bold text-slate-655 border border-slate-250 flex-shrink-0">
                              <FiUser className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <div className="ml-2.5 min-w-0">
                              <div className="text-[11px] font-black text-slate-900 uppercase truncate max-w-[170px]" title={estudiante.nombres || 'Sin Completar Datos'}>
                                {estudiante.nombres || 'Sin Completar Datos'}
                              </div>
                              <div className="text-[9px] text-slate-400 flex items-center mt-0.5 truncate max-w-[170px]" title={estudiante.usuario?.email}>
                                <FiMail className="h-3 w-3 mr-1 text-slate-400" />
                                {estudiante.usuario?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="text-[11px] text-slate-900 font-bold">
                            {estudiante.codigo || 'S/C'}
                          </div>
                          <div className="text-[9px] text-slate-450 mt-0.5 font-bold uppercase">
                            {estudiante.semestre ? `${estudiante.semestre}° Semestre` : 'Sin Semestre'}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${badge.color}`}>
                              {badge.texto}
                            </span>
                            {estudiante.estadoProceso === 'asignado' && estudiante.inscripcion && (
                              (() => {
                                const reqState = estudiante.inscripcion.estadoDocumentosRequisitos;
                                if (reqState === 'en_revision') {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-55 bg-blue-50 text-blue-700 border border-blue-150 rounded text-[7px] font-black uppercase tracking-widest animate-pulse">
                                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                      Por Revisar
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-200 rounded text-[7px] font-black uppercase tracking-widest">
                                      Pendiente Entrega
                                    </span>
                                  );
                                }
                              })()
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          {estudiante.inscripcion?.convenio ? (
                            <div className="max-w-[170px]">
                              <div
                                className="text-[11px] font-bold text-slate-800 truncate uppercase"
                                title={estudiante.inscripcion.convenio.nombreEmpresa}
                              >
                                {estudiante.inscripcion.convenio.nombreEmpresa}
                              </div>
                              <div className="text-[9px] text-slate-450 mt-0.5 font-black uppercase tracking-wider truncate">
                                Área: {estudiante.inscripcion.convenio.area || 'General'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[9px] font-black uppercase italic">Ninguno</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5">
                          {estudiante.inscripcion && estudiante.inscripcion.activa ? (
                            (() => {
                              const par = paralelos.find(p => p.id === estudiante.inscripcion.paraleloId);
                              return (
                                <span className="text-slate-800 font-bold">
                                  {par ? `Paralelo ${par.nombre} (${par.docente?.nombres?.split(' ')[0] || 'Sin Tutor'})` : 'Sin Paralelo'}
                                </span>
                              );
                            })()
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200/60">
                              Requiere Matrícula
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <Link
                            to={`/admin/estudiantes/${estudiante.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-lg transition-all font-black text-[9px] uppercase tracking-wider border border-slate-250/60 shadow-sm"
                          >
                            <FiEye className="h-3 w-3" />
                            <span>Gestionar</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Premium de Resumen de Asignación Automática */}
      {modalResumen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-slate-200 animate-scale-up">
            
            {/* Header del Modal */}
            <div className="p-6 bg-slate-800 text-white relative">
              <button
                onClick={() => setModalResumen(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-full transition-colors"
              >
                <FiX className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <FiCpu className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider">Distribución Automática Procesada</h3>
                  <p className="text-white/80 text-[10px] font-bold mt-0.5 uppercase tracking-wide">
                    Modalidad: {modalResumen.modalidad === 'laborales' ? 'Prácticas Laborales' : 'Prácticas Comunitarias'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6">
              {modalResumen.totalAsignados === 0 ? (
                <div className="text-center py-6">
                  <FiInfo className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <h4 className="font-black text-slate-850 text-xs uppercase tracking-wider mb-1">Sin Cambios de Distribución</h4>
                  <p className="text-slate-500 text-xs font-semibold max-w-xs mx-auto leading-relaxed">
                    {modalResumen.message || 'Todas las matrículas aprobadas activas ya disponen de tutor en este momento.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3 mb-6">
                    <FiCheck className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-emerald-800 leading-relaxed">
                      Se han distribuido de manera balanceada <span className="font-black text-sm">{modalResumen.totalAsignados}</span> estudiante(s) sin tutor entre los docentes calificados.
                    </p>
                  </div>

                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Resumen de Carga Académica Asignada
                  </h4>
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {modalResumen.resumen.map((tutor, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase">{tutor.nombres}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                            Carga total activa: <span className="font-black text-slate-700">{tutor.cargaTotal}</span> estudiantes
                          </p>
                        </div>
                        <span className="bg-rose-50 text-[#ec3724] text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded border border-rose-100">
                          +{tutor.nuevos} nuevos
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Botón de cierre */}
              <button
                onClick={() => setModalResumen(null)}
                className="w-full mt-6 py-3 bg-[#ec3724] hover:bg-[#d32010] text-white font-black text-xs uppercase tracking-widest rounded-lg transition-all active:scale-[0.98] shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaEstudiantes;