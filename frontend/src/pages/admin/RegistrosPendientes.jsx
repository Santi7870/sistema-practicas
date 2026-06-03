import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../services/api';
import { FiCheck, FiX, FiClock, FiMail, FiAlertCircle } from 'react-icons/fi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const RegistrosPendientes = () => {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [modalRechazo, setModalRechazo] = useState({ abierto: false, usuarioId: null });
  const [motivoRechazo, setMotivoRechazo] = useState('');

  useEffect(() => {
    cargarRegistros();
  }, []);

  const cargarRegistros = async () => {
    try {
      const response = await api.get('/admin/registros-pendientes');
      setRegistros(response.data.data);
    } catch (error) {
      console.error('Error al cargar registros:', error);
      setMensaje({
        tipo: 'error',
        texto: 'Error al cargar registros pendientes',
      });
    } finally {
      setCargando(false);
    }
  };

  const aprobarRegistro = async (usuarioId, email) => {
    if (!window.confirm(`¿Aprobar el registro de ${email}?`)) {
      return;
    }

    setProcesando(usuarioId);
    try {
      await api.put(`/admin/aprobar-registro/${usuarioId}`);
      setMensaje({
        tipo: 'success',
        texto: 'Registro aprobado exitosamente',
      });
      cargarRegistros();
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'Error al aprobar registro',
      });
    } finally {
      setProcesando(null);
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    }
  };

  const abrirModalRechazo = (usuarioId) => {
    setModalRechazo({ abierto: true, usuarioId });
    setMotivoRechazo('');
  };

  const rechazarRegistro = async () => {
    if (!motivoRechazo.trim()) {
      alert('Por favor proporciona un motivo de rechazo');
      return;
    }

    setProcesando(modalRechazo.usuarioId);
    try {
      await api.put(`/admin/rechazar-registro/${modalRechazo.usuarioId}`, {
        motivo: motivoRechazo,
      });
      setMensaje({
        tipo: 'success',
        texto: 'Registro rechazado',
      });
      cargarRegistros();
      setModalRechazo({ abierto: false, usuarioId: null });
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'Error al rechazar registro',
      });
    } finally {
      setProcesando(null);
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="border-l-4 border-[#ec3724] pl-4 mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            Registros Pendientes de Aprobación
          </h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
            Revisa y aprueba o rechaza los nuevos registros de estudiantes en el sistema
          </p>
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

        {/* Contador */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
              <FiClock className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800 tracking-tight">
                {registros.length}
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {registros.length === 1
                  ? 'Registro pendiente de verificación'
                  : 'Registros pendientes de verificación'}
              </p>
            </div>
          </div>
        </div>

        {/* Lista de registros */}
        {registros.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="bg-slate-50 w-16 h-16 rounded-full border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <FiCheck className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider mb-1">
              Bandeja de Entrada Vacía
            </h3>
            <p className="text-xs font-semibold text-slate-500 max-w-sm mx-auto leading-relaxed">
              No hay solicitudes de registro pendientes de aprobación en este momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {registros.map((registro) => (
              <div
                key={registro.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Icono */}
                    <div className="bg-slate-50 border border-slate-100 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiMail className="h-5 w-5 text-slate-500" />
                    </div>

                    {/* Información */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 truncate">
                        {registro.email}
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                        Solicitado:{' '}
                        {format(new Date(registro.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => aprobarRegistro(registro.id, registro.email)}
                      disabled={procesando === registro.id}
                      className="bg-[#ec3724] hover:bg-[#d32010] text-white font-bold py-2 px-4 rounded-lg text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center space-x-1.5"
                    >
                      {procesando === registro.id ? (
                        <svg
                          className="animate-spin h-3.5 w-3.5 text-white"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <>
                          <FiCheck className="h-3.5 w-3.5" />
                          <span>Aprobar</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => abrirModalRechazo(registro.id)}
                      disabled={procesando === registro.id}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center space-x-1.5 border border-slate-200"
                    >
                      <FiX className="h-3.5 w-3.5" />
                      <span>Rechazar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de rechazo */}
        {modalRechazo.abierto && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Rechazar Solicitud de Registro
                </h2>
                <button
                  onClick={() =>
                    setModalRechazo({ abierto: false, usuarioId: null })
                  }
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Motivo de Rechazo *
                </label>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows="4"
                  className="w-full text-slate-800 text-sm border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-[#ec3724] focus:border-[#ec3724] placeholder-slate-400 bg-slate-50"
                  placeholder="Explica el motivo del rechazo (será enviado al estudiante)"
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() =>
                    setModalRechazo({ abierto: false, usuarioId: null })
                  }
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg text-xs uppercase tracking-wider transition-colors border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={rechazarRegistro}
                  className="flex-1 bg-[#ec3724] hover:bg-[#d32010] text-white font-bold py-2 px-4 rounded-lg text-xs uppercase tracking-wider transition-colors"
                  disabled={!motivoRechazo.trim()}
                >
                  Confirmar Rechazo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrosPendientes;