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
            Registros Pendientes de Aprobación
          </h1>
          <p className="text-gray-600">
            Revisa y aprueba o rechaza los nuevos registros de estudiantes
          </p>
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

        {/* Contador */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="bg-yellow-100 p-4 rounded-lg">
              <FiClock className="h-8 w-8 text-yellow-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {registros.length}
              </p>
              <p className="text-gray-600">
                {registros.length === 1
                  ? 'Registro pendiente'
                  : 'Registros pendientes'}
              </p>
            </div>
          </div>
        </div>

        {/* Lista de registros */}
        {registros.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheck className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              ¡Todo al día!
            </h3>
            <p className="text-gray-600">
              No hay registros pendientes de aprobación en este momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {registros.map((registro) => (
              <div
                key={registro.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Avatar */}
                    <div className="bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center">
                      <FiMail className="h-6 w-6 text-primary-600" />
                    </div>

                    {/* Información */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        {registro.email}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Registrado el{' '}
                        {format(new Date(registro.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                          locale: es,
                        })}
                      </p>
                    </div>

                    {/* Badge */}
                    <span className="badge badge-warning">Pendiente</span>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center space-x-3 ml-6">
                    <button
                      onClick={() => aprobarRegistro(registro.id, registro.email)}
                      disabled={procesando === registro.id}
                      className="btn btn-success flex items-center space-x-2"
                    >
                      {procesando === registro.id ? (
                        <svg
                          className="animate-spin h-5 w-5"
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
                          <FiCheck className="h-5 w-5" />
                          <span>Aprobar</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => abrirModalRechazo(registro.id)}
                      disabled={procesando === registro.id}
                      className="btn btn-danger flex items-center space-x-2"
                    >
                      <FiX className="h-5 w-5" />
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Rechazar Registro
                </h2>
                <button
                  onClick={() =>
                    setModalRechazo({ abierto: false, usuarioId: null })
                  }
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo del rechazo *
                </label>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows="4"
                  className="input"
                  placeholder="Explica el motivo del rechazo (será enviado al estudiante)"
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() =>
                    setModalRechazo({ abierto: false, usuarioId: null })
                  }
                  className="flex-1 btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={rechazarRegistro}
                  className="flex-1 btn btn-danger"
                  disabled={!motivoRechazo.trim()}
                >
                  Rechazar
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