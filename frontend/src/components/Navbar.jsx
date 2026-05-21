import { Link, useNavigate } from 'react-router-dom';
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
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);

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
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo y título */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="bg-primary-600 text-white p-2 rounded-lg">
                <FiHome className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Sistema de Prácticas
                </h1>
                <p className="text-xs text-gray-500">ESPOCH - Software</p>
              </div>
            </Link>
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
                  {usuario?.email}
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
                  {usuario?.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {usuario?.rol}
                </p>
              </div>

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