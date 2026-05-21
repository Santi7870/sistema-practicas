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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
            Mis Alumnos Asignados
          </h1>
          <p className="text-gray-500">
            Busca, filtra y revisa el progreso académico y los entregables subidos por tus estudiantes asignados.
          </p>
        </div>

        {/* Panel de Filtros */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="relative md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Buscar Estudiante
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Nombre, código o correo institucional..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 placeholder-gray-400 transition"
              />
            </div>
          </div>

          {/* Modalidad */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Modalidad de Prácticas
            </label>
            <div className="relative">
              <FiFilter className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
              <select
                value={filtroModalidad}
                onChange={(e) => setFiltroModalidad(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white appearance-none cursor-pointer transition"
              >
                <option value="todas">Todas las prácticas</option>
                <option value="comunales">Prácticas Comunales</option>
                <option value="laborales">Prácticas Laborales</option>
              </select>
            </div>
          </div>

          {/* Estado de Proceso */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Estado del Proceso
            </label>
            <div className="relative">
              <FiActivity className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white appearance-none cursor-pointer transition"
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
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          {estudiantesFiltrados.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">No se encontraron estudiantes</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                No hay resultados que coincidan con los criterios de búsqueda o filtros seleccionados. Intenta modificarlos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-4">Estudiante</th>
                    <th className="px-6 py-4">Código / Email</th>
                    <th className="px-6 py-4">Empresa / Convenio</th>
                    <th className="px-6 py-4">Modalidad</th>
                    <th className="px-6 py-4 whitespace-nowrap">Estado Proceso</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {estudiantesFiltrados.map((inscripcion) => {
                    const est = inscripcion.estudiante;
                    const email = est?.usuario?.email || '';
                    const empresa = inscripcion.convenio?.nombreEmpresa || 'Por definir';
                    const modalidad =
                      inscripcion.tipoPractica === 'comunitaria' ? 'Comunales' : 'Laborales';

                    const getEstadoBadge = (estado) => {
                      const badges = {
                        sin_asignar: 'bg-gray-100 text-gray-600 border border-gray-200',
                        asignado: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
                        pendiente_inicio: 'bg-blue-50 text-blue-700 border border-blue-200',
                        en_proceso: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                        finalizado: 'bg-green-50 text-green-700 border border-green-200',
                      };
                      return badges[estado] || 'bg-gray-100 text-gray-600';
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
                      <tr key={inscripcion.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-tr from-indigo-100 to-indigo-200 text-indigo-700 h-9 w-9 rounded-full flex items-center justify-center font-bold">
                              <FiUser className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-gray-900">
                              {est.nombres || 'Sin Completar Nombre'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="block text-xs font-semibold text-gray-500">
                            {est.codigo || 'S/C'}
                          </span>
                          <span className="text-xs text-gray-400">{email}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">
                          {empresa}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                              inscripcion.tipoPractica === 'comunitaria'
                                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {modalidad}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${getEstadoBadge(est.estadoProceso)}`}>
                            {getEstadoTexto(est.estadoProceso)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link
                            to={`/docente/estudiantes/${est.id}`}
                            className="inline-flex items-center space-x-1 font-bold text-indigo-600 hover:text-indigo-800 transition"
                          >
                            <span>Gestionar</span>
                            <FiChevronRight className="h-4 w-4" />
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
