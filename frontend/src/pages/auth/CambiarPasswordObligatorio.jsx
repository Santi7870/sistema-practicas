import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiLock, FiAlertCircle } from 'react-icons/fi';
import api from '../../services/api';

const CambiarPasswordObligatorio = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);

  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setCargando(true);

    try {
      const response = await api.post('/auth/cambiar-password-obligatorio', {
        email: usuario.email,
        password,
        confirmPassword,
      });

      if (response.data.success) {
        setExito(true);
        setTimeout(() => {
          logout(); // Desloguear para que inicien sesión con la nueva clave definitiva
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar la contraseña.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-bounce">
            <span className="text-4xl text-indigo-600">🔐</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Primer Ingreso Seguro</h1>
          <p className="text-indigo-100">
            Debes establecer una contraseña personal definitiva para continuar.
          </p>
        </div>

        {/* Tarjeta de Formulario */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-filter backdrop-blur-lg bg-opacity-95 border border-white border-opacity-20 transition-all duration-300">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Cambiar Contraseña
          </h2>

          {exito ? (
            <div className="text-center py-6 space-y-4 animate-fade-in">
              <div className="text-5xl">✨</div>
              <h3 className="text-xl font-bold text-green-600">¡Contraseña actualizada!</h3>
              <p className="text-gray-600 text-sm">
                Tu clave ha sido guardada de forma segura. Redirigiéndote al inicio de sesión para ingresar con tu nueva credencial...
              </p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 flex items-center space-x-2 text-sm">
                  <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nueva Contraseña Definitiva
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-indigo-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 placeholder-gray-400 focus:outline-none transition duration-200 shadow-sm"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-indigo-400" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 placeholder-gray-400 focus:outline-none transition duration-200 shadow-sm"
                    placeholder="Repite la contraseña"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {cargando ? (
                    <span className="flex items-center">
                      <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Guardando contraseña...
                    </span>
                  ) : (
                    'Establecer y Guardar Clave'
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={logout}
                  className="text-sm font-semibold text-gray-500 hover:text-indigo-600 transition"
                >
                  Salir / Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CambiarPasswordObligatorio;
