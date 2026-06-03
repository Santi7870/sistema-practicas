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
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#ec3724]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
          <div className="pl-2">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
              {esAdmin() ? 'Panel de Control - Administración' : 'Mi Portal Académico'}
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Bienvenido, <strong className="text-slate-800">{usuario?.email}</strong>. Gestiona los procesos institucionales vigentes.
            </p>
          </div>
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
      <div className="flex justify-between text-[11px] font-bold">
        <span className="text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-slate-800">{valor} estudiantes ({Math.round(porcentaje)}%)</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 border border-slate-200/50">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
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
      color: 'bg-rose-50 border-rose-200 text-[#ec3724]',
      link: '/admin/registros-pendientes',
      descripcion: 'Requieren aprobación de cuenta',
    },
    {
      titulo: 'Total Estudiantes',
      valor: estudiantes.total,
      icon: FiUsers,
      color: 'bg-sky-50 border-sky-200 text-sky-700',
      link: '/admin/estudiantes',
      descripcion: 'Matriculados en el sistema',
    },
    {
      titulo: 'Tutores / Docentes',
      valor: estadisticas.docentes?.total || 0,
      icon: FiBookOpen,
      color: 'bg-slate-100 border-slate-200 text-slate-700',
      link: '/admin/docentes',
      descripcion: 'Docentes tutores registrados',
    },
    {
      titulo: 'Cupos Disponibles',
      valor: convenios.cuposDisponibles,
      icon: FiCheckCircle,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      link: '/admin/convenios',
      descripcion: 'Vacantes totales de convenios',
    },
  ];

  return (
    <>
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tarjetas.map((tarjeta, index) => (
          <Link
            key={index}
            to={tarjeta.link}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-slate-350 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-lg border ${tarjeta.color} flex items-center justify-center`}>
                <tarjeta.icon className="h-5 w-5" />
              </div>
              <FiArrowRight className="h-4 w-4 text-slate-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                {tarjeta.valor}
              </h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                {tarjeta.titulo}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{tarjeta.descripcion}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Distribución de estudiantes por estado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6 border-b border-slate-100 pb-3">
            Distribución de Estudiantes por Estado del Proceso
          </h2>
          <div className="space-y-4">
            <EstadoBar
              label="Sin Inscripción"
              valor={estudiantes.sinAsignar}
              total={estudiantes.total}
              color="bg-slate-400"
            />
            <EstadoBar
              label="Asignados a Convenio (Fase 1)"
              valor={estudiantes.asignados}
              total={estudiantes.total}
              color="bg-amber-500"
            />
            <EstadoBar
              label="Pendiente Inicio de Ciclo (Fase 2)"
              valor={estudiantes.pendienteInicio}
              total={estudiantes.total}
              color="bg-sky-500"
            />
            <EstadoBar
              label="En Progreso Académico (Fase 3-4)"
              valor={estudiantes.enProceso}
              total={estudiantes.total}
              color="bg-indigo-500"
            />
            <EstadoBar
              label="Acreditados y Finalizados"
              valor={estudiantes.finalizados}
              total={estudiantes.total}
              color="bg-emerald-500"
            />
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6 border-b border-slate-100 pb-3">
            Consola Académica de Acciones Rápidas
          </h2>
          <div className="space-y-3">
            <Link
              to="/admin/registros-pendientes"
              className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-sm relative overflow-hidden group"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
              <div className="flex items-center gap-3 pl-1">
                <FiClock className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Aprobar Cuentas y Registros
                  </p>
                  <p className="text-[10px] font-semibold text-slate-550">
                    {registrosPendientes} cuentas estudiantiles en espera de validación
                  </p>
                </div>
              </div>
              <FiChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/admin/estudiantes"
              className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-sm relative overflow-hidden group"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ec3724]" />
              <div className="flex items-center gap-3 pl-1">
                <FiUsers className="h-5 w-5 text-[#ec3724]" />
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Gestionar Estudiantes</p>
                  <p className="text-[10px] font-semibold text-slate-550">
                    Ver, calificar e inspeccionar a los {estudiantes.total} estudiantes inscritos
                  </p>
                </div>
              </div>
              <FiChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/admin/convenios"
              className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-sm relative overflow-hidden group"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
              <div className="flex items-center gap-3 pl-1">
                <FiFileText className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Gestionar Convenios</p>
                  <p className="text-[10px] font-semibold text-slate-550">
                    Administrar y configurar los {convenios.activos} convenios y proyectos institucionales
                  </p>
                </div>
              </div>
              <FiChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/admin/docentes"
              className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-sm relative overflow-hidden group"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500" />
              <div className="flex items-center gap-3 pl-1">
                <FiBookOpen className="h-5 w-5 text-sky-500" />
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Gestionar Docentes / Tutores</p>
                  <p className="text-[10px] font-semibold text-slate-550">
                    Administrar los {estadisticas.docentes?.total || 0} docentes y tutores académicos de la carrera
                  </p>
                </div>
              </div>
              <FiChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/admin/paralelos"
              className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-sm relative overflow-hidden group"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
              <div className="flex items-center gap-3 pl-1">
                <FiUsers className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Gestionar Paralelos / Distribución</p>
                  <p className="text-[10px] font-semibold text-slate-550">
                    Distribuir equitativamente alumnos y tutores en paralelos institucionales
                  </p>
                </div>
              </div>
              <FiChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

// Dashboard del Estudiante
const DashboardEstudiante = ({ data, onReload }) => {
  const { usuario } = useAuth();
  const { estudiante, siguientePaso, accionesRequeridas, tieneComunitariaAprobada, tieneLaboralAprobada } = data;
  const [iniciandoLaboral, setIniciandoLaboral] = useState(false);
  const [errorLaboral, setErrorLaboral] = useState('');

  const obtenerNombreDesdeEmail = (email) => {
    if (!email) return 'Estudiante';
    const prefix = email.split('@')[0];
    const parts = prefix.split('.');
    return parts
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  };

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
      <div className="max-w-3xl mx-auto mt-8">
        <div className="bg-white border-2 border-rose-200 rounded-xl p-8 md:p-10 text-center shadow-sm relative overflow-hidden">
          <div className="inline-flex p-4 bg-rose-50 rounded-xl text-[#ec3724] mb-5 border border-rose-100">
            <FiAlertCircle className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-black text-slate-850 mb-3 uppercase tracking-wide">
            Acceso Restringido: Semestre Insuficiente
          </h2>
          <p className="text-xs font-semibold text-slate-650 max-w-xl mx-auto mb-6 leading-relaxed">
            De acuerdo con el reglamento de prácticas preprofesionales de la carrera de <strong className="text-slate-900">Ingeniería en Software de la ESPOCH</strong>, debes estar cursando al menos el <strong className="text-[#ec3724] font-black bg-rose-50 px-2 py-0.5 rounded border border-rose-100/50">5to Semestre</strong> para iniciar tu proceso.
            <br />
            <span className="block mt-3 text-[11px] text-slate-450 uppercase font-black tracking-wider">
              Tu registro actual: {estudiante.semestre}° Semestre
            </span>
          </p>
          <div className="flex justify-center">
            <Link
              to="/estudiante/completar-datos"
              className="btn btn-primary"
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
      <div className="max-w-3xl mx-auto mt-8">
        <div className="bg-white border border-slate-200 rounded-xl p-8 md:p-10 text-center shadow-sm">
          <div className="inline-flex p-4 bg-emerald-50 rounded-xl text-emerald-600 mb-5 border border-emerald-100">
            <FiCheckCircle className="h-10 w-10" />
          </div>
          
          <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-wide">
            ¡Felicitaciones, {estudiante.nombres || obtenerNombreDesdeEmail(usuario?.email)}!
          </h2>
          <h3 className="text-sm font-black text-[#ec3724] uppercase tracking-wider mb-4">
            Prácticas Comunitarias Acreditadas
          </h3>
          <p className="text-xs font-semibold text-slate-650 max-w-xl mx-auto mb-6 leading-relaxed">
            Has finalizado y aprobado el 100% de tus <strong>Prácticas Comunitarias</strong>. El siguiente paso en tu itinerario académico es dar inicio a tus <strong>Prácticas Laborales</strong>.
          </p>

          {errorLaboral && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 max-w-md mx-auto mb-6 p-4 rounded-xl flex items-center justify-center space-x-2 text-xs font-bold">
              <FiAlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorLaboral}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleIniciarLaborales}
              disabled={iniciandoLaboral}
              className="btn btn-primary flex items-center justify-center gap-2"
            >
              {iniciandoLaboral ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Activando...</span>
                </>
              ) : (
                <>
                  <FiBriefcase className="h-4 w-4" />
                  <span>Iniciar Prácticas Laborales</span>
                </>
              )}
            </button>
            <Link
              to="/estudiante/mis-practicas?tipo=comunitaria"
              className="btn btn-secondary flex items-center justify-center gap-2"
            >
              <FiEye className="h-4 w-4" />
              <span>Ver Historial de Comunitaria</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Tarjeta de Felicitación Definitiva (Ambas modalidades completadas)
  if (finalizado && (estudiante.inscripcion?.tipoPractica === 'laboral' || tieneLaboralAprobada)) {
    return (
      <div className="max-w-3xl mx-auto mt-8">
        <div className="bg-white border border-slate-200 rounded-xl p-8 md:p-10 text-center shadow-sm">
          <div className="inline-flex p-5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 mb-5">
            <FiCheckCircle className="h-16 w-16" />
          </div>
          
          <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-wide">
            ¡Enhorabuena, {estudiante.nombres || obtenerNombreDesdeEmail(usuario?.email)}! 🏆
          </h2>
          <h3 className="text-sm font-black text-emerald-600 uppercase tracking-wider mb-6">
            Prácticas Preprofesionales 100% Acreditadas
          </h3>
          <p className="text-xs font-semibold text-slate-650 max-w-xl mx-auto mb-8 leading-relaxed">
            Has completado con éxito la totalidad de tus requisitos académicos de prácticas preprofesionales en la <strong className="text-slate-900">ESPOCH</strong>. Felicidades por alcanzar esta meta y estar un paso más cerca de tu título profesional como <strong>Ingeniero en Software</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
            <Link
              to="/estudiante/mis-practicas?tipo=comunitaria"
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-center space-x-3 transition-all group"
            >
              <div className="bg-emerald-500 text-white p-2 rounded-lg group-hover:scale-105 transition-transform">
                <FiCheck className="h-5 w-5 stroke-[3px]" />
              </div>
              <div className="text-left">
                <span className="block text-[9px] text-slate-400 font-black uppercase tracking-wider">Acreditado</span>
                <span className="font-bold text-xs text-slate-800 group-hover:text-[#ec3724] transition-colors">Prácticas Comunitarias</span>
              </div>
            </Link>

            <Link
              to="/estudiante/mis-practicas?tipo=laboral"
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-center space-x-3 transition-all group"
            >
              <div className="bg-emerald-500 text-white p-2 rounded-lg group-hover:scale-105 transition-transform">
                <FiCheck className="h-5 w-5 stroke-[3px]" />
              </div>
              <div className="text-left">
                <span className="block text-[9px] text-slate-400 font-black uppercase tracking-wider">Acreditado</span>
                <span className="font-bold text-xs text-slate-800 group-hover:text-[#ec3724] transition-colors">Prácticas Laborales</span>
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
      <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
        {/* Acento lateral rojo ESPOCH */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pl-2">
          <div className="space-y-2">
            <div className="inline-flex px-2.5 py-0.5 bg-rose-50 text-[10px] font-black uppercase tracking-wider text-[#ec3724] border border-rose-100/80 rounded-md">
              Panel del Estudiante
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Bienvenido, {estudiante.nombres || obtenerNombreDesdeEmail(usuario?.email)} 👋
            </h2>
            <p className="text-xs font-semibold text-slate-500 max-w-xl leading-relaxed">
              Monitorea el progreso de tus prácticas preprofesionales, realiza tus entregas por ciclos académicos y mantente en comunicación directa con tu tutor asignado.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 w-full md:w-auto min-w-[260px] space-y-3.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Código Estudiante</span>
              <span className="text-xs font-black text-slate-800">{estudiante.codigo || '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Semestre</span>
              <span className="inline-flex px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md text-[10px] font-black">
                {estudiante.semestre}° Semestre
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modalidad</span>
              <span className="inline-flex px-2 py-0.5 bg-rose-50 text-[#ec3724] border border-rose-100/50 rounded-md text-[10px] font-black">
                {estudiante.inscripcion ? (estudiante.inscripcion.tipoPractica === 'laboral' ? '💼 Laboral' : '🤝 Comunitaria') : 'Pendiente'}
              </span>
            </div>
            {estudiante.inscripcion && estudiante.inscripcion.paralelo && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paralelo</span>
                <span className="inline-flex px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md text-[10px] font-black">
                  Paralelo {estudiante.inscripcion.paralelo.nombre}
                </span>
              </div>
            )}
            <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
              <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Carrera Completada</span>
                <span>{Math.round(degreeProgress)}%</span>
              </div>
              <div className="w-full bg-slate-205 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-[#ec3724] h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${degreeProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper de Ruta Académica */}
      <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-slate-200">
        <h3 className="text-xs font-black text-slate-800 mb-6 uppercase tracking-wider flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#ec3724] animate-ping"></span>
          Ruta del Proceso Académico
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
          <div className="hidden md:block absolute top-[24px] left-[10%] right-[10%] h-[1px] bg-slate-200 -z-0"></div>

          {phases.map((ph, idx) => {
            const status = getStepStatus(ph.step);
            return (
              <div key={idx} className="flex md:flex-col items-center gap-4 md:text-center relative z-10">
                <div className="flex-shrink-0">
                  {status === 'completed' && (
                    <div className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-emerald-100 transition-all duration-300">
                      <FiCheck className="h-4 w-4 stroke-[3px]" />
                    </div>
                  )}
                  {status === 'active' && (
                    <div className="h-10 w-10 rounded-full bg-[#ec3724] text-white flex items-center justify-center border-2 border-red-100 ring-4 ring-[#ec3724]/10 transition-all duration-300">
                      <span className="text-xs font-black">{ph.step}</span>
                    </div>
                  )}
                  {status === 'pending' && (
                    <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center transition-all duration-300">
                      <span className="text-xs font-bold">{ph.step}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className={`text-xs font-black ${status === 'pending' ? 'text-slate-400' : 'text-slate-800'} uppercase tracking-wide`}>
                    {ph.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
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
          <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#ec3724]"></div>
            
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-black text-slate-850 uppercase tracking-wider flex items-center gap-2">
                <FiInfo className="text-[#ec3724] h-4 w-4" />
                Siguiente Paso Requerido
              </h3>
              <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${badge.bg}`}>
                {badge.texto}
              </span>
            </div>

            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/60 mt-4">
              <div className="p-3 bg-white rounded-lg text-[#ec3724] shadow-sm border border-slate-200/60 flex-shrink-0">
                <FiTrendingUp className="h-5 w-5" />
              </div>
              <div className="space-y-2 flex-grow">
                <p className="text-xs font-bold text-slate-800 leading-relaxed">
                  {siguientePaso}
                </p>
                
                <div className="pt-2">
                  {accionesRequeridas.length > 0 ? (
                    accionesRequeridas.map((accion, index) => (
                      <div key={index} className="space-y-3">
                        <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                          {accion.descripcion}
                        </p>
                        {accion.tipo === 'completar_datos' && (
                          <Link
                            to="/estudiante/completar-datos"
                            className="inline-flex items-center justify-center px-4 py-1.5 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] w-fit"
                          >
                            Completar Datos
                          </Link>
                        )}
                        {accion.tipo === 'inscribirse' && (
                          <Link
                            to="/estudiante/inscripcion"
                            className="inline-flex items-center justify-center px-4 py-1.5 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] w-fit"
                          >
                            Elegir Convenio
                          </Link>
                        )}
                        {accion.tipo === 'subir_documentos' && (
                          <Link
                            to="/estudiante/mis-practicas"
                            className="inline-flex items-center justify-center px-4 py-1.5 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] w-fit"
                          >
                            Ir a Ciclos y Entregas
                          </Link>
                        )}
                      </div>
                    ))
                  ) : estudiante.estadoProceso === 'sin_asignar' ? (
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                        Ya tienes tus datos completos. Ahora debes inscribirte a una modalidad (Comunitaria o Laboral) seleccionando uno de los convenios activos.
                      </p>
                      <Link
                        to="/estudiante/inscripcion"
                        className="inline-flex items-center justify-center px-4 py-1.5 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] w-fit"
                      >
                        Elegir Convenio
                      </Link>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-450 uppercase font-black tracking-wider leading-relaxed">
                      Tu proceso se encuentra al día. No tienes acciones inmediatas pendientes en tu panel.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detalles de Acreditación (Convenio y Tutor) */}
          {estudiante.inscripcion ? (
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-slate-200">
              <h3 className="text-xs font-black text-slate-800 mb-6 uppercase tracking-wider">
                Detalle de Acreditación de Prácticas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Convenio Card */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-rose-50 border border-rose-100 text-[#ec3724] rounded-lg">
                      <FiBriefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-[9px] font-black uppercase text-slate-450 tracking-wider">Convenio Seleccionado</span>
                      <h4 className="text-xs font-black text-slate-800 leading-tight">
                        {estudiante.inscripcion.convenio?.nombreEmpresa || 'Convenio Seleccionado'}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                      <span className="text-slate-500 font-semibold">Área Técnica</span>
                      <span className="font-bold text-slate-700">{estudiante.inscripcion.convenio?.area || 'Desarrollo'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                      <span className="text-slate-500 font-semibold">Horario Asignado</span>
                      <span className="font-bold text-slate-700">{estudiante.inscripcion.convenio?.horario || 'Flexible'}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-500 font-semibold">Contacto</span>
                      <span className="font-bold text-slate-700 text-right truncate max-w-[140px]">{estudiante.inscripcion.convenio?.contacto || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Tutor Académico Card */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 border border-slate-200 text-slate-650 rounded-lg">
                        <FiUsers className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-[9px] font-black uppercase text-slate-450 tracking-wider">Tutor Académico</span>
                        <h4 className="text-xs font-black text-slate-800 leading-tight">
                          {estudiante.inscripcion.tutor?.nombres || 'Docente Tutor'}
                        </h4>
                      </div>
                    </div>

                    {estudiante.inscripcion.tutor ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                          <span className="text-slate-500 font-semibold">Departamento</span>
                          <span className="font-bold text-slate-700">{estudiante.inscripcion.tutor.departamento || 'Software'}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="text-slate-500 font-semibold">Correo Electrónico</span>
                          <span className="font-bold text-slate-700 truncate max-w-[130px]">{estudiante.inscripcion.tutor.usuario?.email}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-amber-700 font-bold leading-normal bg-amber-50 p-3 rounded-lg border border-amber-200">
                        Tu tutor académico está pendiente de asignación por parte de coordinación.
                      </p>
                    )}
                  </div>

                  {estudiante.inscripcion.tutor && (
                    <a
                      href={`mailto:${estudiante.inscripcion.tutor.usuario?.email}`}
                      className="mt-4 btn btn-secondary flex items-center justify-center gap-2 w-full text-center"
                    >
                      <FiMail className="h-3.5 w-3.5" />
                      Contactar por Correo
                    </a>
                  )}
                </div>

              </div>
            </div>
          ) : !datosCompletos ? (
            <div className="bg-slate-50 rounded-xl p-6 md:p-8 text-center border border-dashed border-slate-350 opacity-60">
              <div className="inline-flex p-3.5 bg-slate-200 text-slate-400 rounded-lg mb-4">
                <FiBriefcase className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-black text-slate-500 mb-1 uppercase tracking-wide">Inscripción Bloqueada</h4>
              <p className="text-xs font-semibold text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
                Para comenzar a inscribirte a un convenio, primero debes completar tus datos personales en el perfil.
              </p>
              <button
                disabled
                className="btn btn-secondary cursor-not-allowed opacity-50"
              >
                Explorar Convenios Disponibles
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-6 md:p-8 text-center border border-dashed border-slate-300 shadow-sm">
              <div className="inline-flex p-3.5 bg-slate-200 text-slate-500 rounded-lg mb-4">
                <FiBriefcase className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-black text-slate-800 mb-1 uppercase tracking-wide">Sin convenio inscrito</h4>
              <p className="text-xs font-semibold text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
                Para comenzar a acreditar tus horas de prácticas, debes pre-inscribirte a uno de los convenios autorizados de la carrera.
              </p>
              <Link
                to="/estudiante/inscripcion"
                className="btn btn-primary"
              >
                Explorar Convenios Disponibles
              </Link>
            </div>
          )}
        </div>

        {/* Columna Derecha: Acceso Rápido */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[460px]">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider">
                Acceso Rápido
              </h3>
              <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                Accesos directos para la autogestión de tus tareas y revisiones del ciclo académico.
              </p>

              <div className="space-y-3 pt-2">
                
                {/* Ciclos y Entregas */}
                <Link
                  to="/estudiante/mis-practicas"
                  className="group block p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-lg bg-rose-50 border border-rose-100 text-[#ec3724] flex items-center justify-center transition-transform group-hover:scale-105">
                        <FiCalendar className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 group-hover:text-[#ec3724] transition-colors">Ciclos y Entregas</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Sube reportes y anexos</p>
                      </div>
                    </div>
                    <FiArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-650 transition-colors" />
                  </div>
                </Link>

                {/* Calificaciones */}
                <Link
                  to="/estudiante/calificaciones"
                  className="group block p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-250 text-slate-600 flex items-center justify-center transition-transform group-hover:scale-105">
                        <FiFileText className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 group-hover:text-[#ec3724] transition-colors">Calificaciones</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Notas y retroalimentación</p>
                      </div>
                    </div>
                    <FiArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-650 transition-colors" />
                  </div>
                </Link>

                {/* Notificaciones */}
                <Link
                  to="/notificaciones"
                  className="group block p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-250 text-slate-600 flex items-center justify-center transition-transform group-hover:scale-105">
                        <FiAlertCircle className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 group-hover:text-[#ec3724] transition-colors">Notificaciones</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Avisos e incidencias</p>
                      </div>
                    </div>
                    <FiArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-650 transition-colors" />
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
