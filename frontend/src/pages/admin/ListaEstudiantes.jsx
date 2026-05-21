import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  const [cargando, setCargando] = useState(true);

  // Estados para el proceso de Auto-Asignación
  const [asignando, setAsignando] = useState(false);
  const [modalResumen, setModalResumen] = useState(null); // { totalAsignados, resumen: [], modalidad }
  const [errorAsignacion, setErrorAsignacion] = useState('');

  // Nuevos Estados para Monitor y Asignación Rápida
  const [docentes, setDocentes] = useState([]);
  const [monitorAbierto, setMonitorAbierto] = useState(false);
  const [busquedaTutor, setBusquedaTutor] = useState('');
  const [asignandoEstudianteId, setAsignandoEstudianteId] = useState(null);

  useEffect(() => {
    cargarEstudiantes();
    cargarDocentes();
  }, []);

  useEffect(() => {
    filtrarEstudiantes();
  }, [busqueda, estadoFiltro, tabActiva, estudiantes]);

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

  const asignarTutorRapido = async (estudianteId, tutorId) => {
    setAsignandoEstudianteId(estudianteId);
    setErrorAsignacion('');
    try {
      await api.put(`/admin/estudiantes/${estudianteId}/asignar-tutor`, {
        tutorId: tutorId ? parseInt(tutorId) : null
      });
      // Recargar estudiantes y docentes para refrescar cargas e interfaz
      await Promise.all([cargarEstudiantes(), cargarDocentes()]);
    } catch (error) {
      console.error('Error al asignar tutor de forma rápida:', error);
      setErrorAsignacion(error.response?.data?.message || 'Error al asignar el tutor.');
    } finally {
      setAsignandoEstudianteId(null);
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
      filtrados = filtrados.filter(
        (est) => est.estadoProceso === estadoFiltro
      );
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Control de Alumnos y Matrículas
            </h1>
            <p className="text-gray-600 mt-1">
              Monitorea las fases de los estudiantes, visualiza convenios y distribuye tutores académicos.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => setMonitorAbierto(true)}
              className="inline-flex items-center space-x-2 px-5 py-3 bg-white hover:bg-gray-50 text-indigo-600 hover:text-indigo-700 rounded-xl font-extrabold text-sm border border-gray-200 hover:border-indigo-200 shadow-sm transition-all transform active:scale-95 duration-200"
            >
              <span>👨‍🏫 Monitor de Tutores</span>
              <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                {docentes.length} Activos
              </span>
            </button>
          </div>
        </div>

        {/* Métrica Resumen Rápido */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-primary-100 rounded-lg text-primary-600">
              <FiUsers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Alumnos</p>
              <h3 className="text-2xl font-bold text-gray-900">{estudiantes.length}</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
              <FiBriefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Prácticas Laborales</p>
              <h3 className="text-2xl font-bold text-gray-900">{countLaborales}</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
              <FiBookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Prácticas Comunales</p>
              <h3 className="text-2xl font-bold text-gray-900">{countComunales}</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
              <FiAlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Sin Matrícula</p>
              <h3 className="text-2xl font-bold text-gray-900">{countSinMatricula}</h3>
            </div>
          </div>
        </div>

        {/* Buscador y Filtro Rápido */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por estudiante, código, tutor o convenio..."
              className="w-full bg-gray-50 pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
            />
          </div>

          <div className="relative min-w-[200px]">
            <FiFilter className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="w-full bg-gray-50 pl-11 pr-8 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm appearance-none cursor-pointer"
            >
              <option value="todos">Todos los Estados (Fases)</option>
              <option value="sin_asignar">Sin Inscribir</option>
              <option value="asignado">Asignado (Fase 1)</option>
              <option value="pendiente_inicio">Pendiente de Inicio (Fase 2)</option>
              <option value="en_proceso">En Proceso (Fase 3-4)</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>
        </div>

        {/* Pestañas Estilizadas Premium */}
        <div className="border-b border-gray-200 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex space-x-2 overflow-x-auto pb-px">
            <button
              onClick={() => { setTabActiva('laborales'); setEstadoFiltro('todos'); }}
              className={`px-5 py-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap flex items-center space-x-2 ${
                tabActiva === 'laborales'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiBriefcase className="h-4 w-4" />
              <span>💼 Prácticas Laborales</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                tabActiva === 'laborales' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {countLaborales}
              </span>
            </button>

            <button
              onClick={() => { setTabActiva('comunales'); setEstadoFiltro('todos'); }}
              className={`px-5 py-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap flex items-center space-x-2 ${
                tabActiva === 'comunales'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiBookOpen className="h-4 w-4" />
              <span>🤝 Prácticas Comunales</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                tabActiva === 'comunales' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {countComunales}
              </span>
            </button>

            <button
              onClick={() => { setTabActiva('sin_matricula'); setEstadoFiltro('todos'); }}
              className={`px-5 py-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap flex items-center space-x-2 ${
                tabActiva === 'sin_matricula'
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiAlertCircle className="h-4 w-4" />
              <span>⚠️ Sin Matrícula / Registro</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                tabActiva === 'sin_matricula' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {countSinMatricula}
              </span>
            </button>
          </div>

          {/* Botón de Auto-Asignación Mágica (Solo para Laborales o Comunales) */}
          {(tabActiva === 'laborales' || tabActiva === 'comunales') && (
            <button
              onClick={() => ejecutarAutoAsignacion(tabActiva)}
              disabled={asignando}
              className={`mb-2 sm:mb-0 inline-flex items-center space-x-2 px-5 py-3 rounded-xl text-white font-extrabold text-sm shadow-md transition-all ${
                tabActiva === 'laborales'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-600/10'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-600/10'
              } disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95`}
            >
              <FiCpu className={`h-4 w-4 ${asignando ? 'animate-spin' : ''}`} />
              <span>✨ Auto-Asignar Tutores</span>
            </button>
          )}
        </div>

        {/* Alertas de error en asignación */}
        {errorAsignacion && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-3 text-sm animate-fade-in">
            <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{errorAsignacion}</span>
          </div>
        )}

        {/* Listado Principal de Alumnos */}
        {estudiantesFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <FiUsers className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No hay alumnos registrados en esta sección
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {busqueda || estadoFiltro !== 'todos'
                ? 'Intenta borrar el buscador o ajustar los filtros de fase actual.'
                : 'No se registran alumnos bajo esta modalidad actualmente.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Estudiante
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Código / Semestre
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Fase Actual
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Empresa Convenio
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Tutor Académico
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-150">
                  {estudiantesFiltrados.map((estudiante) => {
                    const badge = getEstadoBadge(estudiante.estadoProceso);
                    const tutorName = estudiante.inscripcion?.tutor?.nombres;

                    return (
                      <tr
                        key={estudiante.id}
                        className="hover:bg-gray-50/80 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-700">
                              <FiUser className="h-5 w-5 text-gray-500" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">
                                {estudiante.nombres || 'Sin Completar Datos'}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                <FiMail className="h-3.5 w-3.5 mr-1 text-gray-400" />
                                {estudiante.usuario?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {estudiante.codigo || 'S/C'}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {estudiante.semestre ? `${estudiante.semestre}° Semestre` : 'Sin Semestre'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                            {badge.texto}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {estudiante.inscripcion?.convenio ? (
                            <div className="max-w-xs">
                              <div
                                className="text-sm font-semibold text-gray-800 truncate"
                                title={estudiante.inscripcion.convenio.nombreEmpresa}
                              >
                                {estudiante.inscripcion.convenio.nombreEmpresa}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Área: {estudiante.inscripcion.convenio.area || 'General'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs italic">Ninguno</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {estudiante.inscripcion && estudiante.inscripcion.activa ? (
                            <div className="flex items-center space-x-2">
                              {asignandoEstudianteId === estudiante.id ? (
                                <div className="flex items-center space-x-2 text-xs text-gray-500 font-semibold py-1">
                                  <svg className="animate-spin h-4 w-4 text-indigo-600" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  <span className="animate-pulse">Guardando...</span>
                                </div>
                              ) : (
                                <select
                                  value={estudiante.inscripcion.tutorId || ''}
                                  onChange={(e) => asignarTutorRapido(estudiante.id, e.target.value)}
                                  className={`bg-white border rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[220px] shadow-sm transition-all duration-200 ${
                                    estudiante.inscripcion.tutorId
                                      ? 'border-emerald-200 text-emerald-800 bg-emerald-50/30 hover:border-emerald-300'
                                      : 'border-amber-200 text-amber-800 bg-amber-50/30 hover:border-amber-300'
                                  }`}
                                >
                                  <option value="" className="text-amber-800 bg-white font-bold">
                                    ⚠️ Sin Tutor Asignado
                                  </option>
                                  {docentes
                                    .filter(d => {
                                      const tipo = estudiante.inscripcion.tipoPractica;
                                      if (tipo === 'laboral') {
                                        return d.tipoTutor === 'laborales' || d.tipoTutor === 'ambas';
                                      } else if (tipo === 'comunitaria') {
                                        return d.tipoTutor === 'comunales' || d.tipoTutor === 'ambas';
                                      }
                                      return true;
                                    })
                                    .map(docente => (
                                      <option key={docente.id} value={docente.id} className="text-gray-900 bg-white font-semibold">
                                        👨‍🏫 {docente.nombres} ({docente.cargaActiva || 0} alu.)
                                      </option>
                                    ))
                                  }
                                </select>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-500 border border-gray-200">
                              🚫 Requiere Matrícula
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <Link
                            to={`/admin/estudiantes/${estudiante.id}`}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-primary-50 text-gray-700 hover:text-primary-700 rounded-lg transition-all font-bold text-xs border border-transparent hover:border-primary-200"
                          >
                            <FiEye className="h-3.5 w-3.5" />
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
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-scale-up">
            {/* Header del Modal con degradado según modalidad */}
            <div className={`p-6 text-white ${
              modalResumen.modalidad === 'laborales'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-800'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-800'
            } relative`}>
              <button
                onClick={() => setModalResumen(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-full transition-colors"
              >
                <FiX className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <FiCpu className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold">Auto-Asignación Realizada</h3>
                  <p className="text-white/80 text-xs mt-0.5 capitalize">
                    Modalidad: {modalResumen.modalidad === 'laborales' ? 'Prácticas Laborales' : 'Prácticas Comunales'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6">
              {modalResumen.totalAsignados === 0 ? (
                <div className="text-center py-6">
                  <FiInfo className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                  <h4 className="font-bold text-gray-900 mb-1">Sin Cambios de Distribución</h4>
                  <p className="text-gray-500 text-sm max-w-xs mx-auto">
                    {modalResumen.message || 'Todas las matrículas aprobadas activas ya disponen de tutor en este momento.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center space-x-3 mb-6">
                    <FiCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <p className="text-xs font-semibold text-emerald-800 leading-relaxed">
                      Se han distribuido de manera balanceada <span className="font-extrabold text-sm">{modalResumen.totalAsignados}</span> estudiante(s) sin tutor entre los docentes calificados.
                    </p>
                  </div>

                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">
                    Resumen de Carga Académica Asignada
                  </h4>
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {modalResumen.resumen.map((tutor, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900">👨‍🏫 {tutor.nombres}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Carga total activa: <span className="font-semibold text-gray-800">{tutor.cargaTotal}</span> estudiantes
                          </p>
                        </div>
                        <span className="bg-primary-100 text-primary-800 text-xs font-extrabold px-3 py-1 rounded-full border border-primary-200">
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
                className={`w-full mt-6 py-3 text-white font-bold text-sm rounded-xl transition-all ${
                  modalResumen.modalidad === 'laborales'
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/10'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/10'
                }`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Lateral - Monitor de Tutores */}
      {/* Backdrop */}
      {monitorAbierto && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
          onClick={() => setMonitorAbierto(false)}
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 max-w-full flex pl-10 z-50 transition-transform duration-300 ease-in-out transform ${
          monitorAbierto ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col h-full">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white flex items-center justify-between shadow-md flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <FiUsers className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">Monitor de Tutores</h3>
                <p className="text-white/80 text-xs mt-0.5">Disponibilidad y Cargas Activas</p>
              </div>
            </div>
            <button
              onClick={() => setMonitorAbierto(false)}
              className="text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-2 rounded-full transition-colors focus:outline-none"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Search bar inside drawer */}
          <div className="p-4 border-b border-gray-150 bg-gray-50 flex items-center flex-shrink-0">
            <div className="relative w-full">
              <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar tutor por nombre..."
                value={busquedaTutor}
                onChange={(e) => setBusquedaTutor(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-gray-700 bg-white shadow-sm"
              />
            </div>
          </div>

          {/* Docentes List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {docentes
              .filter(d => d.nombres.toLowerCase().includes(busquedaTutor.toLowerCase()))
              .length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <span className="text-4xl block mb-2">🕵️‍♂️</span>
                  <p className="text-sm font-semibold">No se encontraron docentes.</p>
                </div>
              ) : (
                docentes
                  .filter(d => d.nombres.toLowerCase().includes(busquedaTutor.toLowerCase()))
                  .map(doc => {
                    const maxCapacidad = 7;
                    const carga = doc.cargaActiva || 0;
                    const porcentaje = Math.min((carga / maxCapacidad) * 100, 100);
                    
                    let barColor = 'bg-emerald-500';
                    let textColor = 'text-emerald-700';
                    let bgBadge = 'bg-emerald-50 border-emerald-200';
                    let estadoLabel = 'Disponible (Carga Baja)';

                    if (carga >= 7) {
                      barColor = 'bg-rose-500';
                      textColor = 'text-rose-700';
                      bgBadge = 'bg-rose-50 border-rose-200';
                      estadoLabel = 'Al Límite (Carga Alta)';
                    } else if (carga >= 4) {
                      barColor = 'bg-amber-500';
                      textColor = 'text-amber-700';
                      bgBadge = 'bg-amber-50 border-amber-200';
                      estadoLabel = 'Moderado (Carga Media)';
                    }

                    return (
                      <div
                        key={doc.id}
                        className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{doc.nombres}</h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">{doc.departamento || 'Sin departamento'}</p>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border capitalize ${
                              doc.tipoTutor === 'comunales'
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : doc.tipoTutor === 'laborales'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {doc.tipoTutor === 'ambas' ? 'Ambas Especialidades' : doc.tipoTutor}
                          </span>
                        </div>

                        {/* Workload Progress Bar */}
                        <div className="space-y-1 mt-3">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className={`${textColor} bg-opacity-10 rounded px-1.5 py-0.5 border ${bgBadge} text-[9px] font-bold`}>
                              {estadoLabel}
                            </span>
                            <span className="text-gray-700 text-xs">
                              {carga} / {maxCapacidad} alumnos
                            </span>
                          </div>
                          <div className="w-full rounded-full h-2 overflow-hidden shadow-inner bg-gray-100">
                            <div
                              className={`${barColor} h-full transition-all duration-500`}
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
          </div>

          {/* Footer in Drawer */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex-shrink-0">
            <div className="flex justify-between text-xs text-gray-500 font-bold mb-2">
              <span>Total Docentes Activos:</span>
              <span className="text-gray-900">{docentes.length}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 font-bold">
              <span>Promedio de Carga:</span>
              <span className="text-gray-900">
                {docentes.length > 0
                  ? (docentes.reduce((acc, curr) => acc + (curr.cargaActiva || 0), 0) / docentes.length).toFixed(1)
                  : 0}{' '}
                alumnos/tutor
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListaEstudiantes;