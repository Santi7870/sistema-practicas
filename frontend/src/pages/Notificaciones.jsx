import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import {
  FiBell,
  FiCheck,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiFileText,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Notificaciones = () => {
  const navigate = useNavigate();
  const { esAdmin } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);
  const [filtro, setFiltro] = useState('todas'); // todas, leidas, no_leidas
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const obtenerEnlace = (notificacion) => {
    if (notificacion.enlace) {
      // Corregir sobre la marcha enlaces antiguos incorrectos guardados en la BD
      if (notificacion.enlace === '/mis-practicas') {
        return '/estudiante/mis-practicas';
      }
      return notificacion.enlace;
    }
    
    // Fallback inteligente para notificaciones antiguas que no tienen enlace en BD
    if (esAdmin()) {
      return '/admin/estudiantes';
    } else {
      return '/estudiante/mis-practicas';
    }
  };

  useEffect(() => {
    cargarNotificaciones();
  }, []);

  const cargarNotificaciones = async () => {
    try {
      const response = await api.get('/notificaciones');
      setNotificaciones(response.data.data.notificaciones);
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
      setMensaje({
        tipo: 'error',
        texto: 'Error al cargar notificaciones',
      });
    } finally {
      setCargando(false);
    }
  };

  const marcarComoLeida = async (id) => {
    try {
      await api.put(`/notificaciones/${id}/marcar-leida`);
      setNotificaciones((prev) =>
        prev.map((not) => (not.id === id ? { ...not, leida: true } : not))
      );
    } catch (error) {
      console.error('Error al marcar notificación:', error);
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await api.put('/notificaciones/marcar-todas-leidas');
      setNotificaciones((prev) => prev.map((not) => ({ ...not, leida: true })));
      setMensaje({
        tipo: 'success',
        texto: 'Todas las notificaciones marcadas como leídas',
      });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: 'Error al marcar notificaciones',
      });
    }
  };

  const eliminarNotificacion = async (id) => {
    if (!window.confirm('¿Eliminar esta notificación?')) return;

    try {
      await api.delete(`/notificaciones/${id}`);
      setNotificaciones((prev) => prev.filter((not) => not.id !== id));
      setMensaje({
        tipo: 'success',
        texto: 'Notificación eliminada',
      });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: 'Error al eliminar notificación',
      });
    }
  };

  const getIconoTipo = (tipo) => {
    const iconos = {
      registro: FiBell,
      aprobacion: FiCheckCircle,
      rechazo: FiAlertCircle,
      documento_subido: FiFileText,
      documento_revisado: FiFileText,
      cambio_estado: FiInfo,
      sistema: FiInfo,
    };
    return iconos[tipo] || FiBell;
  };

  const getColorTipo = (tipo) => {
    const colores = {
      registro: 'bg-blue-100 text-blue-600',
      aprobacion: 'bg-green-100 text-green-600',
      rechazo: 'bg-red-100 text-red-600',
      documento_subido: 'bg-purple-100 text-purple-600',
      documento_revisado: 'bg-yellow-100 text-yellow-600',
      cambio_estado: 'bg-indigo-100 text-indigo-600',
      sistema: 'bg-gray-100 text-gray-600',
    };
    return colores[tipo] || 'bg-gray-100 text-gray-600';
  };

  const notificacionesFiltradas = notificaciones.filter((not) => {
    if (filtro === 'leidas') return not.leida;
    if (filtro === 'no_leidas') return !not.leida;
    return true;
  });

  const noLeidas = notificaciones.filter((not) => !not.leida).length;

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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Notificaciones
            </h1>
            <p className="text-gray-600">
              {noLeidas > 0
                ? `Tienes ${noLeidas} ${noLeidas === 1 ? 'notificación nueva' : 'notificaciones nuevas'}`
                : 'No tienes notificaciones nuevas'}
            </p>
          </div>
          {noLeidas > 0 && (
            <button
              onClick={marcarTodasLeidas}
              className="btn btn-outline flex items-center space-x-2"
            >
              <FiCheck className="h-5 w-5" />
              <span>Marcar todas como leídas</span>
            </button>
          )}
        </div>

        {/* Mensaje */}
        {mensaje.texto && (
          <div
            className={`alert ${
              mensaje.tipo === 'success' ? 'alert-success' : 'alert-error'
            } flex items-center space-x-2 mb-6`}
          >
            <FiAlertCircle className="h-5 w-5" />
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFiltro('todas')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filtro === 'todas'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({notificaciones.length})
            </button>
            <button
              onClick={() => setFiltro('no_leidas')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filtro === 'no_leidas'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              No leídas ({noLeidas})
            </button>
            <button
              onClick={() => setFiltro('leidas')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filtro === 'leidas'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Leídas ({notificaciones.length - noLeidas})
            </button>
          </div>
        </div>

        {/* Lista de notificaciones */}
        {notificacionesFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FiBell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No hay notificaciones
            </h3>
            <p className="text-gray-600">
              {filtro === 'leidas'
                ? 'No tienes notificaciones leídas'
                : filtro === 'no_leidas'
                ? '¡Estás al día! No tienes notificaciones pendientes'
                : 'Aún no tienes ninguna notificación'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notificacionesFiltradas.map((notificacion) => {
              const Icono = getIconoTipo(notificacion.tipo);
              const colorTipo = getColorTipo(notificacion.tipo);

              const enlaceDestino = obtenerEnlace(notificacion);

              return (
                <div
                  key={notificacion.id}
                  className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-4 ${
                    !notificacion.leida ? 'border-l-4 border-primary-500 bg-primary-50/10' : ''
                  } ${enlaceDestino ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  onClick={async () => {
                    if (!notificacion.leida) {
                      await marcarComoLeida(notificacion.id);
                    }
                    if (enlaceDestino) {
                      navigate(enlaceDestino);
                    }
                  }}
                >
                  <div className="flex items-start space-x-4">
                    {/* Icono */}
                    <div className={`p-3 rounded-full ${colorTipo}`}>
                      <Icono className="h-6 w-6" />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3
                          className={`text-lg font-semibold ${
                            !notificacion.leida
                              ? 'text-gray-900'
                              : 'text-gray-600'
                          }`}
                        >
                          {notificacion.titulo}
                        </h3>
                        {!notificacion.leida && (
                          <span className="ml-2 w-2 h-2 bg-primary-500 rounded-full"></span>
                        )}
                      </div>
                      <p
                        className={`text-sm mb-2 ${
                          !notificacion.leida
                            ? 'text-gray-700'
                            : 'text-gray-500'
                        }`}
                      >
                        {notificacion.mensaje}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(
                          new Date(notificacion.createdAt),
                          "d 'de' MMMM, yyyy 'a las' HH:mm",
                          { locale: es }
                        )}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center space-x-2">
                      {!notificacion.leida && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            marcarComoLeida(notificacion.id);
                          }}
                          className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                          title="Marcar como leída"
                        >
                          <FiCheck className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarNotificacion(notificacion.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notificaciones;