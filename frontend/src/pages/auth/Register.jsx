import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMail, FiLock, FiAlertCircle, FiCheckCircle, FiEye, FiEyeOff } from 'react-icons/fi';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [cargando, setCargando] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito(false);
    setCargando(true);

    const cleanEmail = email.trim().toLowerCase();

    // Validaciones básicas
    if (!cleanEmail.endsWith('@espoch.edu.ec')) {
      setError('Debes usar tu correo institucional (@espoch.edu.ec)');
      setCargando(false);
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setCargando(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setCargando(false);
      return;
    }

    const resultado = await register(cleanEmail, password, confirmPassword);

    if (resultado.success) {
      setExito(true);
    } else {
      setError(resultado.message);
    }

    setCargando(false);
  };

  if (exito) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <FiCheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-lg font-black text-slate-800 mb-3 uppercase tracking-wider">
            ¡Registro Exitoso!
          </h2>
          <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed">
            Tu cuenta ha sido creada y está pendiente de aprobación por el
            administrador del sistema. Recibirás una notificación por correo una vez aprobada.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full btn btn-primary py-3 text-xs uppercase tracking-widest font-black mt-2"
          >
            Entendido, ir al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo y título */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img
              src="/espochlogo.png"
              alt="Logo Oficial ESPOCH"
              className="h-20 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">
            CREAR CUENTA
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
            Sistema de Prácticas - ESPOCH
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-lg font-black text-slate-800 mb-6 text-center uppercase tracking-wider">
            Registro de Estudiante
          </h2>

          {error && (
            <div className="alert alert-error mb-4 flex items-center space-x-2">
              <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Correo Institucional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="correo@espoch.edu.ec"
                  required
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400 font-bold">
                * Debe terminar en @espoch.edu.ec
              </p>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9 pr-10"
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

            {/* Confirmar Contraseña */}
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
                  className="input pl-9 pr-10"
                  placeholder="Repite tu contraseña"
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

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full btn btn-primary py-3 text-xs uppercase tracking-widest font-black disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {cargando ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
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
                  Registrando...
                </span>
              ) : (
                'Registrarse'
              )}
            </button>
          </form>

          {/* Link de login */}
          <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500">
              ¿Ya tienes una cuenta activa?{' '}
              <Link
                to="/login"
                className="text-[#ec3724] hover:text-[#d32010] font-black transition-colors"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-8">
          © 2026 ESPOCH - Escuela Superior Politécnica de Chimborazo
        </p>
      </div>
    </div>
  );
};

export default Register;