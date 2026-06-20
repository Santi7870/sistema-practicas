import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiHome, 
  FiLogOut, 
  FiBell, 
  FiUser,
  FiMenu,
  FiX
} from 'react-icons/fi';
import { useState, useEffect } from 'react';
import api from '../services/api';

const Navbar = () => {
  const { usuario, logout, docente, estudiante } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);

  const navLinkClass = ({ isActive }) =>
    `px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap self-center ${
      isActive
        ? 'text-[#ec3724] bg-red-50/60 font-black shadow-sm border border-red-100/50'
        : 'text-slate-600 hover:text-[#ec3724] hover:bg-slate-50'
    }`;

  useEffect(() => {
    if (usuario) {
      cargarNotificaciones();
      const interval = setInterval(cargarNotificaciones, 15000); // Actualiza cada 15 segundos
      return () => clearInterval(interval);
    }
  }, [usuario]);

  const cargarNotificaciones = async () => {
    try {
      const response = await api.get('/notificaciones/no-leidas');
      if (response.data && response.data.cantidad !== undefined) {
        setNoLeidas(response.data.cantidad);
      }
    } catch (error) {
      console.error('Error al cargar conteo de notificaciones:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo y título */}
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              <Link to="/dashboard" className="flex items-center flex-shrink-0" title="Ir al Dashboard">
                <img
                  src="/espochlogo.png"
                  alt="Logo ESPOCH"
                  className="h-10 w-auto object-contain flex-shrink-0 hover:scale-105 transition-transform"
                />
              </Link>
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <Link
                  to="/dashboard"
                  className="p-1.5 text-slate-400 hover:text-[#ec3724] hover:bg-slate-50 rounded-lg transition-all"
                  title="Ir al Dashboard"
                >
                  <FiHome className="h-5 w-5" />
                </Link>
                <div className="whitespace-nowrap">
                  <h1 className="text-sm font-extrabold text-slate-900 leading-none whitespace-nowrap">
                    Sistema de Prácticas
                  </h1>
                  <span className="text-[10px] font-bold text-slate-400 block mt-1 whitespace-nowrap">
                    ESPOCH - Software
                  </span>
                </div>
              </div>
            </div>
            {usuario?.rol === 'admin' && (
              <div className="hidden md:flex items-center space-x-1 border-l border-slate-200 pl-4 ml-4 h-8 self-center">
                <NavLink to="/dashboard" className={navLinkClass}>Inicio</NavLink>
                <NavLink to="/admin/estudiantes" className={navLinkClass}>Estudiantes</NavLink>
                <NavLink to="/admin/convenios" className={navLinkClass}>Convenios</NavLink>
                <NavLink to="/admin/docentes" className={navLinkClass}>Docentes</NavLink>
                <NavLink to="/admin/paralelos" className={navLinkClass}>Paralelos</NavLink>
              </div>
            )}

            {usuario?.rol === 'estudiante' && (
              <div className="hidden md:flex items-center space-x-1 border-l border-slate-200 pl-4 ml-4 h-8 self-center">
                <NavLink to="/dashboard" className={navLinkClass}>Inicio</NavLink>
                <NavLink to="/formatos" className={navLinkClass}>Formatos Oficiales</NavLink>
              </div>
            )}

            {usuario?.rol === 'docente' && (
              <div className="hidden md:flex items-center space-x-1 border-l border-slate-200 pl-4 ml-4 h-8 self-center">
                <NavLink
                  to="/docente/dashboard"
                  className={navLinkClass}
                >
                  Inicio
                </NavLink>
                <NavLink
                  to="/docente/ciclos"
                  className={navLinkClass}
                >
                  Gestión de Ciclos/Tareas
                </NavLink>
                <NavLink
                  to="/docente/estudiantes"
                  className={navLinkClass}
                  end
                >
                  Estudiantes
                </NavLink>
                <NavLink
                  to="/docente/entregas-pendientes"
                  className={navLinkClass}
                >
                  Entregas por Calificar
                </NavLink>
                <NavLink
                  to="/formatos"
                  className={navLinkClass}
                >
                  Formatos Oficiales
                </NavLink>
              </div>
            )}
          </div>

          {/* Menú desktop */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {/* Notificaciones */}
            <Link
              to="/notificaciones"
              className="relative p-2 text-gray-600 hover:text-primary-600 transition-colors"
            >
              <FiBell className="h-6 w-6" />
              {/* Badge de notificaciones no leídas */}
              {noLeidas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold px-1 shadow-sm leading-none">
                  {noLeidas}
                </span>
              )}
            </Link>

            {/* Información del usuario */}
            <div className="flex items-center space-x-3 border-l pl-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {usuario?.rol === 'docente' ? (docente?.nombres || usuario?.email) : (usuario?.rol === 'estudiante' ? (estudiante?.nombres || usuario?.email) : usuario?.email)}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {usuario?.rol}
                </p>
              </div>
              <div className="bg-primary-100 text-primary-700 p-2 rounded-full">
                <FiUser className="h-5 w-5" />
              </div>
            </div>


            {/* Botón de cerrar sesión */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiLogOut className="h-5 w-5" />
              <span>Salir</span>
            </button>
          </div>

          {/* Botón menú móvil */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMenuAbierto(!menuAbierto)}
              className="text-gray-600 hover:text-primary-600 p-2"
            >
              {menuAbierto ? (
                <FiX className="h-6 w-6" />
              ) : (
                <FiMenu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        {menuAbierto && (
          <div className="md:hidden border-t py-4">
            <div className="space-y-3">
              <div className="px-4 py-2 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">
                  {usuario?.rol === 'docente' ? (docente?.nombres || usuario?.email) : (usuario?.rol === 'estudiante' ? (estudiante?.nombres || usuario?.email) : usuario?.email)}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {usuario?.rol}
                </p>
              </div>

              {usuario?.rol === 'admin' && (
                <div className="space-y-1 border-b border-slate-100 pb-3">
                  <Link to="/dashboard" className="flex items-center px-4 py-2 text-sm font-bold text-slate-700 hover:text-[#ec3724] hover:bg-slate-50 rounded-lg transition-all" onClick={() => setMenuAbierto(false)}>Inicio</Link>
                  <Link to="/admin/estudiantes" className="flex items-center px-4 py-2 text-sm font-bold text-slate-700 hover:text-[#ec3724] hover:bg-slate-50 rounded-lg transition-all" onClick={() => setMenuAbierto(false)}>Estudiantes</Link>
                  <Link to="/admin/convenios" className="flex items-center px-4 py-2 text-sm font-bold text-slate-700 hover:text-[#ec3724] hover:bg-slate-50 rounded-lg transition-all" onClick={() => setMenuAbierto(false)}>Convenios</Link>
                  <Link to="/admin/docentes" className="flex items-center px-4 py-2 text-sm font-bold text-slate-700 hover:text-[#ec3724] hover:bg-slate-50 rounded-lg transition-all" onClick={() => setMenuAbierto(false)}>Docentes</Link>
                  <Link to="/admin/paralelos" className="flex items-center px-4 py-2 text-sm font-bold text-slate-700 hover:text-[#ec3724] hover:bg-slate-50 rounded-lg transition-all" onClick={() => setMenuAbierto(false)}>Paralelos</Link>
                </div>
              )}

              {usuario?.rol === 'estudiante' && (
                <div className="space-y-1 border-b border-slate-100 pb-3">
                  <Link to="/dashboard" className="flex items-center px-4 py-2 text-sm font-bold text-slate-700 hover:text-[#ec3724] hover:bg-slate-50 rounded-lg transition-all" onClick={() => setMenuAbierto(false)}>Inicio</Link>
                  <Link to="/formatos" className="flex items-center px-4 py-2 text-sm font-bold text-slate-700 hover:text-[#ec3724] hover:bg-slate-50 rounded-lg transition-all" onClick={() => setMenuAbierto(false)}>Formatos Oficiales</Link>
                </div>
              )}

              {usuario?.rol === 'docente' && (
                <div className="space-y-1 border-b border-slate-100 pb-3">
                  <Link
                    to="/docente/dashboard"
                    className="flex items-center px-4 py-2 text-sm font-bold text-slate-700 hover:text-[#ec3724] hover:bg-slate-50 rounded-lg transition-all"
                    onClick={() => setMenuAbierto(false)}
                  >
                    Inicio
                  </Link>
                  <Link
                    to="/docente/ciclos"
                    className="flex items-center px-4 py-2 text-sm font-bold text-slate-700 hover:text-[#ec3724] hover:bg-slate-50 rounded-lg transition-all"
                    onClick={() => setMenuAbierto(false)}
                  >
                    Gestión de Ciclos/Tareas
                  </Link>
                  <Link
                    to="/docente/estudiantes"
                    className="flex items-center px-4 py-2 text-sm font-bold text-slate-700 hover:text-[#ec3724] hover:bg-slate-50 rounded-lg transition-all"
                    onClick={() => setMenuAbierto(false)}
                  >
                    Estudiantes
                  </Link>
                  <Link
                    to="/docente/entregas-pendientes"
                    onClick={() => setMenuAbierto(false)}
                    className="flex items-center px-4 py-2 text-sm font-bold text-slate-700 hover:text-[#ec3724] hover:bg-slate-50 rounded-lg transition-all"
                  >
                    Entregas por Calificar
                  </Link>
                  <Link
                    to="/formatos"
                    className="flex items-center px-4 py-2 text-sm font-bold text-slate-700 hover:text-[#ec3724] hover:bg-slate-50 rounded-lg transition-all"
                    onClick={() => setMenuAbierto(false)}
                  >
                    Formatos Oficiales
                  </Link>
                </div>
              )}

              <Link
                to="/notificaciones"
                className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                onClick={() => setMenuAbierto(false)}
              >
                <FiBell className="h-5 w-5" />
                <span>Notificaciones</span>
                {noLeidas > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold px-1.5 leading-none shadow-sm">
                    {noLeidas}
                  </span>
                )}
              </Link>

              <button
                onClick={() => {
                  handleLogout();
                  setMenuAbierto(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FiLogOut className="h-5 w-5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;