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
      if (notificacion.enlace === '/mis-practicas') {
        return '/estudiante/mis-practicas';
      }
      return notificacion.enlace;
    }
    
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
      registro: 'bg-slate-50 border-slate-200 text-slate-600',
      aprobacion: 'bg-slate-50 border-slate-200 text-[#ec3724]',
      rechazo: 'bg-red-50 border-red-100 text-red-600',
      documento_subido: 'bg-slate-50 border-slate-200 text-slate-600',
      documento_revisado: 'bg-slate-50 border-slate-200 text-slate-600',
      cambio_estado: 'bg-slate-50 border-slate-200 text-slate-600',
      sistema: 'bg-slate-50 border-slate-200 text-slate-600',
    };
    return colores[tipo] || 'bg-slate-50 border-slate-200 text-slate-600';
  };

  const notificacionesFiltradas = notificaciones.filter((not) => {
    if (filtro === 'leidas') return not.leida;
    if (filtro === 'no_leidas') return !not.leida;
    return true;
  });

  const noLeidas = notificaciones.filter((not) => !not.leida).length;

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
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="border-l-4 border-[#ec3724] pl-4">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              Notificaciones
            </h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
              {noLeidas > 0
                ? `Tienes ${noLeidas} ${noLeidas === 1 ? 'notificación nueva' : 'notificaciones nuevas'} sin leer`
                : 'No tienes notificaciones nuevas'}
            </p>
          </div>
          {noLeidas > 0 && (
            <button
              onClick={marcarTodasLeidas}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-2 px-4 rounded-lg text-xs uppercase tracking-wider transition-colors border border-slate-200 flex items-center space-x-1.5"
            >
              <FiCheck className="h-3.5 w-3.5" />
              <span>Marcar todas como leídas</span>
            </button>
          )}
        </div>

        {/* Mensaje */}
        {mensaje.texto && (
          <div
            className={`p-3 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center space-x-2 mb-6 ${
              mensaje.tipo === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <FiAlertCircle className="h-4 w-4" />
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFiltro('todas')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                filtro === 'todas'
                  ? 'bg-[#ec3724] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas ({notificaciones.length})
            </button>
            <button
              onClick={() => setFiltro('no_leidas')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                filtro === 'no_leidas'
                  ? 'bg-[#ec3724] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              No leídas ({noLeidas})
            </button>
            <button
              onClick={() => setFiltro('leidas')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                filtro === 'leidas'
                  ? 'bg-[#ec3724] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Leídas ({notificaciones.length - noLeidas})
            </button>
          </div>
        </div>

        {/* Lista de notificaciones */}
        {notificacionesFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FiBell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider mb-1">
              Bandeja Vacía
            </h3>
            <p className="text-xs font-semibold text-slate-500 max-w-sm mx-auto leading-relaxed">
              {filtro === 'leidas'
                ? 'No tienes notificaciones registradas como leídas'
                : filtro === 'no_leidas'
                ? 'No tienes alertas pendientes en tu bandeja'
                : 'Aún no has recibido ninguna notificación en el sistema'}
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
                  className={`bg-white rounded-xl border border-slate-200 transition-all p-4 ${
                    !notificacion.leida ? 'border-l-4 border-[#ec3724] bg-slate-50/50' : ''
                  } ${enlaceDestino ? 'cursor-pointer hover:border-slate-300' : ''}`}
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
                    <div className={`p-2.5 rounded-lg border flex-shrink-0 ${colorTipo}`}>
                      <Icono className="h-5 w-5" />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3
                          className={`text-sm font-bold truncate ${
                            !notificacion.leida
                              ? 'text-slate-900 font-extrabold'
                              : 'text-slate-600'
                          }`}
                        >
                          {notificacion.titulo}
                        </h3>
                        {!notificacion.leida && (
                          <span className="ml-2 w-2 h-2 bg-[#ec3724] rounded-full flex-shrink-0 mt-1.5"></span>
                        )}
                      </div>
                      <p
                        className={`text-xs mb-2 leading-relaxed ${
                          !notificacion.leida
                            ? 'text-slate-700 font-semibold'
                            : 'text-slate-500 font-medium'
                        }`}
                      >
                        {notificacion.mensaje}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {format(
                          new Date(notificacion.createdAt),
                          "d 'de' MMMM, yyyy 'a las' HH:mm",
                          { locale: es }
                        )}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center space-x-1 ml-4 flex-shrink-0">
                      {!notificacion.leida && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            marcarComoLeida(notificacion.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-[#ec3724] hover:bg-slate-50 rounded transition-colors"
                          title="Marcar como leída"
                        >
                          <FiCheck className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarNotificacion(notificacion.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-[#ec3724] hover:bg-slate-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <FiTrash2 className="h-4 w-4" />
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