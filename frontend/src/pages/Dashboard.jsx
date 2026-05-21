import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import {
  FiUsers,
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiTrendingUp,
  FiCalendar,
  FiArrowRight,
  FiBriefcase,
  FiBookOpen,
  FiMail,
  FiCheck,
  FiChevronRight,
  FiInfo,
  FiEye,
} from 'react-icons/fi';

const Dashboard = () => {
  const { usuario, esAdmin, esEstudiante, esDocente } = useAuth();

  if (esDocente()) {
    return <Navigate to="/docente/dashboard" replace />;
  }

  const [estadisticas, setEstadisticas] = useState(null);
  const [dashboardEstudiante, setDashboardEstudiante] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      if (esAdmin()) {
        const response = await api.get('/admin/dashboard');
        setEstadisticas(response.data.data);
      } else if (esEstudiante()) {
        const response = await api.get('/estudiante/dashboard');
        setDashboardEstudiante(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {esAdmin() ? 'Panel de Administración' : 'Mi Dashboard'}
          </h1>
          <p className="text-gray-600">
            Bienvenido, {usuario?.email}
          </p>
        </div>

        {esAdmin() && estadisticas && <DashboardAdmin estadisticas={estadisticas} />}
        {esEstudiante() && dashboardEstudiante && (
          <DashboardEstudiante data={dashboardEstudiante} onReload={cargarDatos} />
        )}
      </div>
    </div>
  );
};

// Componente EstadoBar para el Administrador
const EstadoBar = ({ label, valor, total, color }) => {
  const porcentaje = total > 0 ? (valor / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-900 font-bold">{valor} ({Math.round(porcentaje)}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${porcentaje}%` }}
        ></div>
      </div>
    </div>
  );
};

// Dashboard del Administrador
const DashboardAdmin = ({ estadisticas }) => {
  const { registrosPendientes, estudiantes, convenios } = estadisticas;

  const tarjetas = [
    {
      titulo: 'Registros Pendientes',
      valor: registrosPendientes,
      icon: FiClock,
      color: 'bg-yellow-500',
      link: '/admin/registros-pendientes',
      descripcion: 'Requieren aprobación',
    },
    {
      titulo: 'Total Estudiantes',
      valor: estudiantes.total,
      icon: FiUsers,
      color: 'bg-blue-500',
      link: '/admin/estudiantes',
      descripcion: 'En el sistema',
    },
    {
      titulo: 'Tutores / Docentes',
      valor: estadisticas.docentes?.total || 0,
      icon: FiBookOpen,
      color: 'bg-teal-600',
      link: '/admin/docentes',
      descripcion: 'Gestionar tutores',
    },
    {
      titulo: 'Cupos Disponibles',
      valor: convenios.cuposDisponibles,
      icon: FiCheckCircle,
      color: 'bg-purple-500',
      link: '/admin/convenios',
      descripcion: 'Para asignar',
    },
  ];

  return (
    <>
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {tarjetas.map((tarjeta, index) => (
          <Link
            key={index}
            to={tarjeta.link}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${tarjeta.color} p-3 rounded-lg`}>
                <tarjeta.icon className="h-6 w-6 text-white" />
              </div>
              <FiArrowRight className="h-5 w-5 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {tarjeta.valor}
            </h3>
            <p className="text-sm font-medium text-gray-600 mb-1">
              {tarjeta.titulo}
            </p>
            <p className="text-xs text-gray-500">{tarjeta.descripcion}</p>
          </Link>
        ))}
      </div>

      {/* Distribución de estudiantes por estado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Estudiantes por Estado
          </h2>
          <div className="space-y-4">
            <EstadoBar
              label="Sin Asignar"
              valor={estudiantes.sinAsignar}
              total={estudiantes.total}
              color="bg-gray-500"
            />
            <EstadoBar
              label="Asignados (Fase 1)"
              valor={estudiantes.asignados}
              total={estudiantes.total}
              color="bg-yellow-500"
            />
            <EstadoBar
              label="Pendiente de Inicio (Fase 2)"
              valor={estudiantes.pendienteInicio}
              total={estudiantes.total}
              color="bg-blue-500"
            />
            <EstadoBar
              label="En Proceso (Fase 3-4)"
              valor={estudiantes.enProceso}
              total={estudiantes.total}
              color="bg-purple-500"
            />
            <EstadoBar
              label="Finalizados"
              valor={estudiantes.finalizados}
              total={estudiantes.total}
              color="bg-green-500"
            />
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Acciones Rápidas
          </h2>
          <div className="space-y-3">
            <Link
              to="/admin/registros-pendientes"
              className="flex items-center justify-between p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FiClock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    Aprobar Registros
                  </p>
                  <p className="text-sm text-gray-600">
                    {registrosPendientes} pendientes
                  </p>
                </div>
              </div>
              <FiArrowRight className="h-5 w-5 text-gray-400" />
            </Link>

            <Link
              to="/admin/estudiantes"
              className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FiUsers className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Ver Estudiantes</p>
                  <p className="text-sm text-gray-600">
                    Gestionar {estudiantes.total} estudiantes
                  </p>
                </div>
              </div>
              <FiArrowRight className="h-5 w-5 text-gray-400" />
            </Link>

            <Link
              to="/admin/convenios"
              className="flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FiFileText className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Gestionar Convenios</p>
                  <p className="text-sm text-gray-600">
                    {convenios.activos} convenios activos
                  </p>
                </div>
              </div>
              <FiArrowRight className="h-5 w-5 text-gray-400" />
            </Link>

            <Link
              to="/admin/docentes"
              className="flex items-center justify-between p-4 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FiBookOpen className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="font-medium text-gray-900">Gestionar Docentes / Tutores</p>
                  <p className="text-sm text-gray-600">
                    {estadisticas.docentes?.total || 0} tutores registrados
                  </p>
                </div>
              </div>
              <FiArrowRight className="h-5 w-5 text-gray-400" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

// Dashboard del Estudiante
const DashboardEstudiante = ({ data, onReload }) => {
  const { estudiante, siguientePaso, accionesRequeridas, tieneComunitariaAprobada, tieneLaboralAprobada } = data;
  const [iniciandoLaboral, setIniciandoLaboral] = useState(false);
  const [errorLaboral, setErrorLaboral] = useState('');

  const datosCompletos = estudiante.nombres && estudiante.codigo && estudiante.semestre;
  const finalizado = estudiante.estadoProceso === 'finalizado' || (data.notaFinal !== null && data.notaFinal >= 7);

  const handleIniciarLaborales = async () => {
    setIniciandoLaboral(true);
    setErrorLaboral('');
    try {
      const response = await api.put('/estudiante/iniciar-laborales');
      if (response.data.success) {
        if (onReload) onReload();
      } else {
        setErrorLaboral(response.data.message || 'Error al iniciar prácticas laborales.');
      }
    } catch (err) {
      console.error(err);
      setErrorLaboral(err.response?.data?.message || 'Error al iniciar prácticas laborales.');
    } finally {
      setIniciandoLaboral(false);
    }
  };

  // Helper para determinar el estado de cada fase en el Stepper
  const getStepStatus = (stepIndex) => {
    const estado = estudiante.estadoProceso;
    const tieneConvenio = estudiante.inscripcion !== null;
    const inscripcionAprobada = estudiante.inscripcion?.estadoInscripcion === 'aprobada';
    const enProceso = estado === 'en_proceso';

    if (stepIndex === 1) {
      if (datosCompletos) return 'completed';
      return 'active';
    }
    if (stepIndex === 2) {
      if (!datosCompletos) return 'pending';
      if (tieneConvenio) return 'completed';
      return 'active';
    }
    if (stepIndex === 3) {
      if (!tieneConvenio) return 'pending';
      if (inscripcionAprobada || estado === 'pendiente_inicio' || enProceso || finalizado) return 'completed';
      return 'active';
    }
    if (stepIndex === 4) {
      if (!inscripcionAprobada && estado !== 'pendiente_inicio' && estado !== 'en_proceso' && !finalizado) return 'pending';
      if (finalizado) return 'completed';
      if (enProceso || estado === 'pendiente_inicio') return 'active';
      return 'pending';
    }
    if (stepIndex === 5) {
      if (finalizado) return 'completed';
      return 'pending';
    }
    return 'pending';
  };

  const phases = [
    { title: 'Perfil', desc: 'Datos personales', step: 1 },
    { title: 'Inscripción', desc: 'Elegir convenio', step: 2 },
    { title: 'Aprobación', desc: 'Validación académica', step: 3 },
    { title: 'Ciclos', desc: 'Anexos y entregas', step: 4 },
    { title: 'Finalizado', desc: 'Prácticas aprobadas', step: 5 }
  ];

  // 1. Bloqueo por semestre < 5
  if (estudiante.semestre && estudiante.semestre < 5) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-gradient-to-br from-red-950 via-slate-900 to-rose-950 border border-red-500/30 rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-rose-600/15 rounded-full blur-3xl"></div>
          
          <div className="inline-flex p-5 bg-red-500/10 rounded-2xl text-red-400 mb-6 border border-red-500/20 shadow-lg shadow-red-500/10 animate-bounce">
            <FiAlertCircle className="h-14 w-14" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
            Acceso Restringido: Semestre Insuficiente
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto mb-8 text-base md:text-lg leading-relaxed">
            De acuerdo con el reglamento de prácticas preprofesionales de la carrera de <strong className="text-red-400">Ingeniería en Software de la ESPOCH</strong>, debes estar cursando al menos el <strong className="text-white font-extrabold bg-red-500/20 px-2 py-0.5 rounded">5to Semestre</strong> para iniciar tu proceso.
            <br />
            <span className="block mt-4 text-sm text-slate-400">
              Actualmente estás registrado en el <strong className="text-red-400 font-bold">{estudiante.semestre}° Semestre</strong>.
            </span>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/estudiante/completar-datos"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 hover:shadow-red-500/40 transition-all duration-300 transform hover:-translate-y-1 text-center"
            >
              Actualizar mi Semestre
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Tarjeta de Felicitación Comunitaria Completada
  if (finalizado && estudiante.inscripcion?.tipoPractica === 'comunitaria' && !tieneLaboralAprobada) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-emerald-950 border border-indigo-500/20 rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl"></div>

          <div className="inline-flex p-5 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-3xl text-white mb-6 relative shadow-xl shadow-emerald-500/30">
            <FiCheckCircle className="h-14 w-14" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </span>
          </div>
          
          <h2 className="text-4xl font-black text-white mb-3 tracking-tight">
            ¡Felicitaciones, {estudiante.nombres || 'David'}! 🎉
          </h2>
          <h3 className="text-xl md:text-2xl font-bold text-indigo-400 mb-6">
            Prácticas Comunitarias Completadas con Éxito
          </h3>
          <p className="text-slate-300 max-w-2xl mx-auto mb-8 text-base md:text-lg leading-relaxed">
            Has finalizado y aprobado el 100% de tus <strong>Prácticas Comunitarias</strong>. Tu dedicación ha sido sobresaliente. 
            El siguiente gran paso en tu formación académica es iniciar tus <strong>Prácticas Laborales</strong>.
          </p>

          {errorLaboral && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 max-w-md mx-auto mb-6 p-4 rounded-xl flex items-center justify-center space-x-2 text-sm">
              <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{errorLaboral}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mx-auto w-fit">
            <button
              onClick={handleIniciarLaborales}
              disabled={iniciandoLaboral}
              className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-xl shadow-indigo-500/30 hover:shadow-indigo-400/40 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center space-x-3"
            >
              {iniciandoLaboral ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Activando Módulo Laboral...</span>
                </>
              ) : (
                <>
                  <FiBriefcase className="h-5 w-5" />
                  <span>Iniciar Prácticas Laborales</span>
                </>
              )}
            </button>
            <Link
              to="/estudiante/mis-practicas?tipo=comunitaria"
              className="w-full sm:w-auto px-8 py-5 bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/20 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center space-x-2 text-sm"
            >
              <FiEye className="h-5 w-5" />
              <span>Ver Historial Comunitaria</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Tarjeta de Felicitación Definitiva (Ambas modalidades completadas)
  if (finalizado && (estudiante.inscripcion?.tipoPractica === 'laboral' || tieneLaboralAprobada)) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 border border-emerald-500/30 rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"></div>

          <div className="inline-flex p-6 bg-gradient-to-tr from-emerald-500 via-teal-500 to-green-600 rounded-full text-white mb-6 relative shadow-2xl shadow-emerald-500/30">
            <FiCheckCircle className="h-20 w-20 animate-pulse" />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
            ¡Enhorabuena, {estudiante.nombres || 'David'}! 🏆
          </h2>
          <h3 className="text-xl md:text-2xl font-black text-emerald-400 mb-6">
            Prácticas Preprofesionales 100% Acreditadas
          </h3>
          <p className="text-slate-300 max-w-2xl mx-auto mb-10 text-base md:text-lg leading-relaxed">
            Has completado con éxito la totalidad de tus requisitos académicos de prácticas en la <strong className="text-white">ESPOCH</strong>.
            Felicidades por alcanzar esta gran meta académica y estar un paso más cerca de tu título profesional de <strong>Ingeniero en Software</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            <Link
              to="/estudiante/mis-practicas?tipo=comunitaria"
              className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-emerald-500/30 rounded-2xl p-5 flex items-center space-x-4 shadow-lg transition-all duration-300 transform hover:-translate-y-1 group"
            >
              <div className="bg-emerald-500/20 p-3 rounded-xl text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                <FiCheckCircle className="h-6 w-6" />
              </div>
              <div className="text-left">
                <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Requisito 1</span>
                <span className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">Prácticas Comunitarias</span>
              </div>
            </Link>

            <Link
              to="/estudiante/mis-practicas?tipo=laboral"
              className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-emerald-500/30 rounded-2xl p-5 flex items-center space-x-4 shadow-lg transition-all duration-300 transform hover:-translate-y-1 group"
            >
              <div className="bg-emerald-500/20 p-3 rounded-xl text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                <FiCheckCircle className="h-6 w-6" />
              </div>
              <div className="text-left">
                <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Requisito 2</span>
                <span className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">Prácticas Laborales</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getEstadoBadge = (estado) => {
    const badges = {
      sin_asignar: { bg: 'bg-slate-500/10 border-slate-500/30 text-slate-400', texto: 'Sin Asignar' },
      asignado: { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', texto: 'Asignado a Tutor' },
      pendiente_inicio: { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', texto: 'Inscripción Aprobada' },
      en_proceso: { bg: 'bg-sky-500/10 border-sky-500/30 text-sky-400', texto: 'En Curso' },
      finalizado: { bg: 'bg-green-500/15 border-green-500/30 text-green-400', texto: 'Finalizado' },
    };
    return badges[estado] || badges.sin_asignar;
  };

  const badge = finalizado
    ? { bg: 'bg-green-500/15 border-green-500/30 text-green-400', texto: 'Aprobado Académicamente' }
    : getEstadoBadge(estudiante.estadoProceso);
  const degreeProgress = estudiante.semestre ? Math.min(100, Math.max(0, (estudiante.semestre / 10) * 100)) : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Tarjeta de Bienvenida Principal */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-[#075985] to-indigo-950 rounded-3xl p-6 md:p-8 shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-sky-300 border border-white/10">
              Panel de Estudiante
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Bienvenido de nuevo, <span className="bg-gradient-to-r from-sky-400 to-indigo-300 bg-clip-text text-transparent">{estudiante.nombres || 'David Panchi'}</span> 👋
            </h2>
            <p className="text-slate-300 text-sm md:text-base max-w-xl">
              Monitorea el progreso de tus prácticas preprofesionales, realiza tus entregas por ciclos y mantente en comunicación con tu tutor.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 w-full md:w-auto min-w-[240px] space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Código</span>
              <span className="text-sm font-black text-white">{estudiante.codigo || '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Semestre</span>
              <span className="inline-flex px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-black">
                {estudiante.semestre}° Semestre
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Modalidad</span>
              <span className="inline-flex px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold">
                {estudiante.inscripcion ? (estudiante.inscripcion.tipoPractica === 'laboral' ? '💼 Laboral' : '🤝 Comunitaria') : 'Ninguna'}
              </span>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Carrera Completada</span>
                <span>{Math.round(degreeProgress)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-sky-400 to-indigo-400 h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${degreeProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper de Ruta Académica */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-md border border-slate-100">
        <h3 className="text-base font-extrabold text-slate-900 mb-6 uppercase tracking-wider flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary-600 animate-ping"></span>
          Ruta del Proceso Académico
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
          <div className="hidden md:block absolute top-[26px] left-[10%] right-[10%] h-[2px] bg-slate-100 -z-0"></div>

          {phases.map((ph, idx) => {
            const status = getStepStatus(ph.step);
            return (
              <div key={idx} className="flex md:flex-col items-center gap-4 md:text-center relative z-10">
                <div className="flex-shrink-0">
                  {status === 'completed' && (
                    <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 border-4 border-emerald-100 transition-all duration-300">
                      <FiCheck className="h-5 w-5 stroke-[3px]" />
                    </div>
                  )}
                  {status === 'active' && (
                    <div className="h-12 w-12 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-600/30 border-4 border-primary-100 ring-4 ring-primary-500/10 animate-pulse transition-all duration-300">
                      <span className="text-sm font-black">{ph.step}</span>
                    </div>
                  )}
                  {status === 'pending' && (
                    <div className="h-12 w-12 rounded-full bg-slate-50 border-2 border-slate-200 text-slate-400 flex items-center justify-center transition-all duration-300">
                      <span className="text-sm font-bold">{ph.step}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className={`text-sm font-black ${status === 'pending' ? 'text-slate-400' : 'text-slate-800'}`}>
                    {ph.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-normal mt-0.5">
                    {ph.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid Principal de Contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Card de Siguiente Paso */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-md border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-primary-600"></div>
            
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <FiInfo className="text-primary-600 h-5 w-5" />
                Siguiente Paso Requerido
              </h3>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                {badge.texto}
              </span>
            </div>

            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-4">
              <div className="p-3 bg-white rounded-xl text-primary-600 shadow-sm border border-slate-100">
                <FiTrendingUp className="h-6 w-6" />
              </div>
              <div className="space-y-2 flex-grow">
                <p className="text-sm font-bold text-slate-800 leading-snug">
                  {siguientePaso}
                </p>
                
                <div className="pt-2">
                  {accionesRequeridas.length > 0 ? (
                    accionesRequeridas.map((accion, index) => (
                      <div key={index} className="space-y-3">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {accion.descripcion}
                        </p>
                        {accion.tipo === 'completar_datos' && (
                          <Link
                            to="/estudiante/completar-datos"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg hover:shadow-primary-600/10 transition-all transform hover:-translate-y-0.5"
                          >
                            Completar Datos
                            <FiChevronRight />
                          </Link>
                        )}
                        {accion.tipo === 'inscribirse' && (
                          <Link
                            to="/estudiante/inscripcion"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg hover:shadow-primary-600/10 transition-all transform hover:-translate-y-0.5"
                          >
                            Elegir Convenio
                            <FiChevronRight />
                          </Link>
                        )}
                        {accion.tipo === 'subir_documentos' && (
                          <Link
                            to="/estudiante/mis-practicas"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg hover:shadow-primary-600/10 transition-all transform hover:-translate-y-0.5"
                          >
                            Ir a Ciclos y Entregas
                            <FiChevronRight />
                          </Link>
                        )}
                      </div>
                    ))
                  ) : estudiante.estadoProceso === 'sin_asignar' ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Ya tienes tus datos completos. Ahora debes inscribirte a una modalidad (Comunitaria o Laboral) seleccionando uno de los convenios activos.
                      </p>
                      <Link
                        to="/estudiante/inscripcion"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg hover:shadow-primary-600/10 transition-all transform hover:-translate-y-0.5"
                      >
                        Elegir Convenio
                        <FiChevronRight />
                      </Link>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Tu proceso se encuentra al día. No tienes acciones inmediatas pendientes en tu panel.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detalles de Acreditación (Convenio y Tutor) */}
          {estudiante.inscripcion ? (
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-md border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-wider">
                Detalle de Acreditación de Prácticas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Convenio Card */}
                <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full blur-xl"></div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-primary-600/10 text-primary-600 rounded-xl">
                      <FiBriefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Convenio Activo</span>
                      <h4 className="text-sm font-black text-slate-800 leading-tight">
                        {estudiante.inscripcion.convenio?.nombreEmpresa || 'Convenio Seleccionado'}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between border-b border-slate-200/50 pb-2">
                      <span className="text-slate-500">Área Técnica</span>
                      <span className="font-semibold text-slate-800">{estudiante.inscripcion.convenio?.area || 'Desarrollo'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-2">
                      <span className="text-slate-500">Horario Asignado</span>
                      <span className="font-semibold text-slate-800">{estudiante.inscripcion.convenio?.horario || 'Flexible'}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-500">Contacto</span>
                      <span className="font-semibold text-slate-800 text-right">{estudiante.inscripcion.convenio?.contacto || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Tutor Académico Card */}
                <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-slate-50 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-600/10 text-indigo-600 rounded-xl">
                        <FiUsers className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Tutor Académico</span>
                        <h4 className="text-sm font-black text-slate-800 leading-tight">
                          {estudiante.inscripcion.tutor?.nombres || 'Docente Tutor'}
                        </h4>
                      </div>
                    </div>

                    {estudiante.inscripcion.tutor ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-200/50 pb-2">
                          <span className="text-slate-500">Departamento</span>
                          <span className="font-semibold text-slate-800">{estudiante.inscripcion.tutor.departamento || 'Software'}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="text-slate-500">Correo Electrónico</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[150px]">{estudiante.inscripcion.tutor.usuario?.email}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 leading-normal bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                        Tu tutor académico está pendiente de asignación por parte de coordinación.
                      </p>
                    )}
                  </div>

                  {estudiante.inscripcion.tutor && (
                    <a
                      href={`mailto:${estudiante.inscripcion.tutor.usuario?.email}`}
                      className="mt-4 inline-flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-lg"
                    >
                      <FiMail className="h-4 w-4" />
                      Contactar por Correo
                    </a>
                  )}
                </div>

              </div>
            </div>
          ) : !datosCompletos ? (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-6 md:p-8 text-center border-2 border-dashed border-slate-200 opacity-60 relative overflow-hidden">
              <div className="absolute inset-0 bg-slate-900/[0.02] backdrop-blur-[0.5px] flex items-center justify-center"></div>
              <div className="relative z-10">
                <div className="inline-flex p-4 bg-slate-200/80 rounded-2xl text-slate-400 mb-4">
                  <FiBriefcase className="h-8 w-8" />
                </div>
                <h4 className="text-base font-black text-slate-400 mb-2">Inscripción Bloqueada</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
                  Para comenzar a inscribirte a un convenio, primero debes completar tus datos personales en el perfil.
                </p>
                <button
                  disabled
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-300 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed shadow-none"
                >
                  Explorar Convenios Disponibles
                  <FiChevronRight />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-6 md:p-8 text-center border-2 border-dashed border-slate-300">
              <div className="inline-flex p-4 bg-slate-200 rounded-2xl text-slate-500 mb-4">
                <FiBriefcase className="h-8 w-8" />
              </div>
              <h4 className="text-base font-black text-slate-800 mb-2">No estás inscrito a ningún convenio</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
                Para comenzar a acreditar tus horas de prácticas laborales o comunitarias, debes pre-inscribirte a uno de los convenios autorizados.
              </p>
              <Link
                to="/estudiante/inscripcion"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md transition-all transform hover:-translate-y-0.5"
              >
                Explorar Convenios Disponibles
                <FiChevronRight />
              </Link>
            </div>
          )}
        </div>

        {/* Columna Derecha: Acceso Rápido */}
        <div className="space-y-8">
          <div className="bg-slate-950 rounded-3xl p-6 md:p-8 shadow-xl border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[460px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/10 rounded-full blur-2xl"></div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                Acceso Rápido
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Accesos directos para la autogestión de tus tareas y revisiones del ciclo académico.
              </p>

              <div className="space-y-3.5 pt-2">
                
                {/* Ciclos y Entregas */}
                <Link
                  to="/estudiante/mis-practicas"
                  className="group block p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 hover:border-white/20 transition-all transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 group-hover:scale-105 transition-transform">
                        <FiCalendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">Ciclos y Entregas</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Sube tus reportes y anexos</p>
                      </div>
                    </div>
                    <FiArrowRight className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                </Link>

                {/* Calificaciones */}
                <Link
                  to="/estudiante/calificaciones"
                  className="group block p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 hover:border-white/20 transition-all transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 group-hover:scale-105 transition-transform">
                        <FiFileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">Calificaciones</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Notas y retroalimentación</p>
                      </div>
                    </div>
                    <FiArrowRight className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                </Link>

                {/* Notificaciones */}
                <Link
                  to="/notificaciones"
                  className="group block p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 hover:border-white/20 transition-all transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:scale-105 transition-transform">
                        <FiAlertCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">Notificaciones</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Avisos y novedades</p>
                      </div>
                    </div>
                    <FiArrowRight className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                </Link>

              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
