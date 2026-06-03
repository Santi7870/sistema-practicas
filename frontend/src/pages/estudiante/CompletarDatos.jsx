import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import api from '../../services/api';
import { FiUser, FiHash, FiBookOpen, FiSave, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

const CompletarDatos = () => {
  const { estudiante, actualizarEstudiante } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombres: '',
    codigo: '',
    semestre: '',
  });

  const [errors, setErrors] = useState({});
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    // Si ya tiene datos, pre-llenar el formulario
    if (estudiante) {
      setFormData({
        nombres: estudiante.nombres || '',
        codigo: estudiante.codigo || '',
        semestre: estudiante.semestre || '',
      });
    }
  }, [estudiante]);

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.nombres.trim()) {
      nuevosErrores.nombres = 'Los nombres son requeridos';
    } else if (formData.nombres.trim().length < 3) {
      nuevosErrores.nombres = 'Los nombres deben tener al menos 3 caracteres';
    }

    if (!formData.codigo.trim()) {
      nuevosErrores.codigo = 'El código es requerido';
    } else if (!/^\d{4}$/.test(formData.codigo)) {
      nuevosErrores.codigo = 'El código debe tener exactamente 4 dígitos';
    }

    if (!formData.semestre) {
      nuevosErrores.semestre = 'El semestre es requerido';
    } else if (formData.semestre < 1 || formData.semestre > 10) {
      nuevosErrores.semestre = 'El semestre debe estar entre 1 y 10';
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpiar error del campo al escribir
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    if (!validarFormulario()) {
      return;
    }

    setCargando(true);

    try {
      const response = await api.put('/estudiante/completar-datos', {
        nombres: formData.nombres.trim(),
        codigo: formData.codigo.trim(),
        semestre: parseInt(formData.semestre),
      });

      setMensaje({
        tipo: 'success',
        texto: response.data.message || 'Datos guardados exitosamente',
      });

      // Actualizar contexto
      actualizarEstudiante(response.data.data);

      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'Error al guardar los datos',
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="bg-white rounded-xl border-l-4 border-l-[#ec3724] border-t border-r border-b border-slate-200 shadow-sm p-6">
          <h1 className="text-xl font-bold text-slate-900 leading-tight">
            Completar Datos Personales
          </h1>
          <p className="text-slate-500 text-xs font-semibold mt-1">
            Por favor completa tu información para continuar con el proceso de
            prácticas preprofesionales de forma oficial en la institución.
          </p>
        </div>

        {/* Mensaje de éxito/error */}
        {mensaje.texto && (
          <div
            className={`p-4 rounded border flex items-center space-x-2 text-xs shadow-sm mb-6 ${
              mensaje.tipo === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {mensaje.tipo === 'success' ? (
              <FiCheckCircle className="h-4 w-4" />
            ) : (
              <FiAlertCircle className="h-4 w-4" />
            )}
            <span className="font-bold">{mensaje.texto}</span>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white rounded-xl border border-slate-250 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombres completos */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nombres Completos <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  name="nombres"
                  value={formData.nombres}
                  onChange={handleChange}
                  className={`w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ec3724] focus:border-[#ec3724] text-xs text-slate-700 placeholder-slate-400 transition ${errors.nombres ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  placeholder="Ej: Juan Carlos Pérez López"
                />
              </div>
              {errors.nombres && (
                <p className="mt-1 text-[11px] font-bold text-red-650">{errors.nombres}</p>
              )}
            </div>

            {/* Código */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Código de Estudiante <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiHash className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleChange}
                  maxLength="4"
                  className={`w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ec3724] focus:border-[#ec3724] text-xs text-slate-700 placeholder-slate-400 transition ${errors.codigo ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  placeholder="Ej: 1234"
                />
              </div>
              {errors.codigo && (
                <p className="mt-1 text-[11px] font-bold text-red-650">{errors.codigo}</p>
              )}
              <p className="mt-1 text-[10px] text-slate-400 font-semibold uppercase">
                Código de 4 dígitos proporcionado por la institución
              </p>
            </div>

            {/* Semestre */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Semestre Actual <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiBookOpen className="h-4 w-4 text-slate-400" />
                </div>
                <select
                  name="semestre"
                  value={formData.semestre}
                  onChange={handleChange}
                  className={`w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ec3724] focus:border-[#ec3724] text-xs text-slate-700 bg-white appearance-none cursor-pointer transition ${errors.semestre ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                >
                  <option value="">Selecciona tu semestre</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}° Semestre
                    </option>
                  ))}
                </select>
              </div>
              {errors.semestre && (
                <p className="mt-1 text-[11px] font-bold text-red-650">{errors.semestre}</p>
              )}
            </div>

            {/* Información adicional */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <FiAlertCircle className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">
                    Información Importante
                  </h4>
                  <ul className="text-xs text-slate-655 space-y-1 font-semibold text-slate-600">
                    <li>• Verifica que tu código sea correcto</li>
                    <li>• Una vez guardado, no podrás cambiar tu código</li>
                    <li>• Estos datos serán usados en todos los documentos oficiales</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-xs font-bold transition"
                disabled={cargando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#ec3724] hover:bg-[#d12a1a] text-white font-bold rounded text-xs transition flex items-center space-x-1.5 shadow-sm"
                disabled={cargando}
              >
                {cargando ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 mr-1 text-white"
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
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="h-4 w-4" />
                    <span>Guardar Datos</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Ayuda */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 font-semibold uppercase">
            ¿Tienes problemas? Contacta al administrador del sistema
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompletarDatos;