import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { FiUser, FiSearch, FiChevronRight, FiFilter, FiActivity } from 'react-icons/fi';

const DocenteEstudiantes = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [estudiantesFiltrados, setEstudiantesFiltrados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroModalidad, setFiltroModalidad] = useState('todas'); // todas, comunales, laborales
  const [filtroEstado, setFiltroEstado] = useState('todos'); // todos, pendiente_inicio, en_proceso, finalizado

  // Estado para el paralelo asignado al docente
  const [paraleloDocente, setParaleloDocente] = useState(null);

  useEffect(() => {
    cargarEstudiantes();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [estudiantes, busqueda, filtroModalidad, filtroEstado]);

  const cargarEstudiantes = async () => {
    try {
      setCargando(true);
      const response = await api.get('/docente/estudiantes');
      setEstudiantes(response.data.data);
      setParaleloDocente(response.data.paraleloAsignado);
    } catch (error) {
      console.error('Error al cargar lista de estudiantes:', error);
    } finally {
      setCargando(false);
    }
  };

  const aplicarFiltros = () => {
    let filtrados = [...estudiantes];

    // Búsqueda por nombre, código o email
    if (busqueda.trim() !== '') {
      const query = busqueda.toLowerCase();
      filtrados = filtrados.filter((ins) => {
        const est = ins.estudiante;
        return (
          est?.nombres?.toLowerCase().includes(query) ||
          est?.codigo?.toLowerCase().includes(query) ||
          est?.usuario?.email?.toLowerCase().includes(query)
        );
      });
    }

    // Filtro de modalidad (tipoPractica)
    if (filtroModalidad !== 'todas') {
      const tipo = filtroModalidad === 'comunales' ? 'comunitaria' : 'laboral';
      filtrados = filtrados.filter((ins) => ins.tipoPractica === tipo);
    }

    // Filtro de estado
    if (filtroEstado !== 'todos') {
      filtrados = filtrados.filter((ins) => ins.estudiante?.estadoProceso === filtroEstado);
    }

    setEstudiantesFiltrados(filtrados);
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#ec3724]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Encabezado con Paralelo Asignado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-xl border-l-4 border-l-[#ec3724] border-t border-r border-b border-slate-200 shadow-sm p-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-1">
              Mis Alumnos Asignados
            </h1>
            <p className="text-slate-500 text-xs font-semibold">
              Busca, filtra y revisa el progreso académico y los entregables subidos por tus estudiantes asignados.
            </p>
          </div>
          
          {paraleloDocente ? (
            <div className={`px-4 py-2 rounded border flex items-center space-x-3 bg-slate-50 border-slate-200 text-slate-800`}>
              <div className="p-1 text-slate-500">
                <FiActivity className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tu Paralelo Asignado</p>
                <p className="font-bold text-xs">Paralelo {paraleloDocente.nombre}</p>
              </div>
            </div>
          ) : (
            <div className="px-4 py-2 rounded bg-red-50 border border-red-155 text-[#ec3724] flex items-center space-x-3">
              <FiActivity className="h-4 w-4" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">Tu Paralelo Asignado</p>
                <p className="font-bold text-xs">Sin Paralelo Asignado</p>
              </div>
            </div>
          )}
        </div>

        {/* Panel de Filtros */}
        <div className="bg-white rounded-xl p-5 border border-slate-250 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="relative md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Buscar Estudiante
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Nombre, código o correo institucional..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ec3724] focus:border-[#ec3724] text-xs text-slate-700 placeholder-slate-400 transition"
              />
            </div>
          </div>

          {/* Modalidad */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Modalidad de Prácticas
            </label>
            <div className="relative">
              <FiFilter className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                value={filtroModalidad}
                onChange={(e) => setFiltroModalidad(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ec3724] focus:border-[#ec3724] text-xs text-slate-700 bg-white appearance-none cursor-pointer transition"
              >
                <option value="todas">Todas las prácticas</option>
                <option value="comunales">Prácticas Comunales</option>
                <option value="laborales">Prácticas Laborales</option>
              </select>
            </div>
          </div>

          {/* Estado de Proceso */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Estado del Proceso
            </label>
            <div className="relative">
              <FiActivity className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ec3724] focus:border-[#ec3724] text-xs text-slate-700 bg-white appearance-none cursor-pointer transition"
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente_inicio">Convenio Aprobado</option>
                <option value="en_proceso">Ciclos Activos</option>
                <option value="finalizado">Finalizado / Aprobado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla / Grid de Estudiantes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {estudiantesFiltrados.length === 0 ? (
            <div className="text-center py-16 px-4">
              <FiSearch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-xs font-bold text-slate-550 uppercase tracking-wider mb-2">No se encontraron estudiantes</h3>
              <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
                No hay resultados que coincidan con los criterios de búsqueda o filtros seleccionados. Intenta modificarlos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-55 bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3">Estudiante</th>
                    <th className="px-4 py-3">Código / Email</th>
                    <th className="px-4 py-3">Empresa / Convenio</th>
                    <th className="px-4 py-3">Modalidad</th>
                    <th className="px-4 py-3 whitespace-nowrap">Estado Proceso</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {estudiantesFiltrados.map((inscripcion) => {
                    const est = inscripcion.estudiante;
                    const email = est?.usuario?.email || '';
                    const empresa = inscripcion.convenio?.nombreEmpresa || 'Por definir';
                    const modalidad =
                      inscripcion.tipoPractica === 'comunitaria' ? 'Comunales' : 'Laborales';

                    const getEstadoBadge = (estado) => {
                      const badges = {
                        sin_asignar: 'bg-slate-100 text-slate-600 border border-slate-200',
                        asignado: 'bg-amber-50 text-amber-700 border border-amber-100',
                        pendiente_inicio: 'bg-blue-50 text-blue-700 border border-blue-200',
                        en_proceso: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                        finalizado: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                      };
                      return badges[estado] || 'bg-slate-100 text-slate-600';
                    };

                    const getEstadoTexto = (estado) => {
                      const text = {
                        sin_asignar: 'Sin Completar Datos',
                        asignado: 'Convenio Pendiente',
                        pendiente_inicio: 'Convenio Aprobado',
                        en_proceso: 'Ciclos Activos',
                        finalizado: 'Finalizado / Aprobado',
                      };
                      return text[estado] || estado;
                    };

                    return (
                      <tr key={inscripcion.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="bg-slate-100 text-slate-700 border border-slate-350 h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs">
                              <FiUser className="h-3.5 w-3.5" />
                            </div>
                            <span className="font-bold text-slate-800 text-xs">
                              {est.nombres || 'Sin Completar Nombre'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="block text-[10px] font-bold text-slate-500">
                            {est.codigo || 'S/C'}
                          </span>
                          <span className="text-[10px] text-slate-400">{email}</span>
                        </td>
                        <td className="px-4 py-3.5 max-w-[200px] truncate text-slate-600 font-semibold text-xs" title={empresa}>
                          {empresa}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                              inscripcion.tipoPractica === 'comunitaria'
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : 'bg-slate-200 text-slate-800 border border-slate-300'
                            }`}
                          >
                            {modalidad}
                          </span>
                          {inscripcion.paralelo && (
                            <span className="block text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
                              Paralelo {inscripcion.paralelo.nombre}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${getEstadoBadge(est.estadoProceso)}`}>
                            {getEstadoTexto(est.estadoProceso)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <Link
                            to={`/docente/estudiantes/${est.id}`}
                            className="inline-flex items-center gap-0.5 px-3 py-1.5 bg-[#ec3724] hover:bg-[#d12a1a] text-white font-bold rounded text-xs transition-colors shadow-sm"
                          >
                            <span>Gestionar</span>
                            <FiChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocenteEstudiantes;
