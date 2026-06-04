import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiLock, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import api from '../../services/api';

const CambiarPasswordObligatorio = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);
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
        email: usuario.email.trim().toLowerCase(),
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Encabezado con logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img
              src="/espochlogo.png"
              alt="Logo Oficial ESPOCH"
              className="h-20 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">
            SISTEMA DE PRÁCTICAS
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
            ESPOCH - Carrera de Software
          </p>
        </div>

        {/* Tarjeta de Formulario */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-lg font-black text-slate-800 mb-2 text-center uppercase tracking-wider">
            Primer Ingreso Seguro
          </h2>
          <p className="text-xs font-semibold text-slate-500 text-center mb-6">
            Debes establecer una contraseña personal definitiva para continuar.
          </p>

          {exito ? (
            <div className="text-center py-6 space-y-4">
              <h3 className="text-base font-black text-green-600 uppercase tracking-wider">
                ¡Contraseña actualizada!
              </h3>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                Tu clave ha sido guardada de forma segura. Redirigiéndote al inicio de sesión para ingresar con tu nueva credencial...
              </p>
              <div className="flex justify-center pt-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 flex items-center space-x-2 text-xs font-semibold">
                  <FiAlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

               <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nueva Contraseña Definitiva
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={mostrarPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#ec3724] focus:border-[#ec3724] text-slate-800 placeholder-slate-400 focus:outline-none transition duration-200 shadow-sm"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {mostrarPassword ? (
                      <FiEyeOff className="h-4 w-4" />
                    ) : (
                      <FiEye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={mostrarConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#ec3724] focus:border-[#ec3724] text-slate-800 placeholder-slate-400 focus:outline-none transition duration-200 shadow-sm"
                    placeholder="Repite la contraseña"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmPassword(!mostrarConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {mostrarConfirmPassword ? (
                      <FiEyeOff className="h-4 w-4" />
                    ) : (
                      <FiEye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full bg-[#ec3724] hover:bg-[#d32010] text-white font-bold py-2.5 px-4 rounded-lg shadow-sm text-xs uppercase tracking-wider transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {cargando ? (
                    <span className="flex items-center">
                      <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
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

              <div className="text-center pt-2 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs font-bold text-slate-500 hover:text-[#ec3724] uppercase tracking-wider transition"
                >
                  Salir / Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-8">
          © 2026 ESPOCH - Escuela Superior Politécnica de Chimborazo
        </p>
      </div>
    </div>
  );
};

export default CambiarPasswordObligatorio;
