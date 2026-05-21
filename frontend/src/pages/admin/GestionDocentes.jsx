import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../services/api';
import {
  FiUserPlus,
  FiSearch,
  FiMail,
  FiBriefcase,
  FiCheckCircle,
  FiAlertCircle,
  FiCopy,
  FiUser,
} from 'react-icons/fi';

const GestionDocentes = () => {
  const [docentes, setDocentes] = useState([]);
  const [docentesFiltrados, setDocentesFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Estados para el Modal de Registro
  const [modalAbierto, setModalAbierto] = useState(false);
  const [email, setEmail] = useState('');
  const [nombres, setNombres] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [tipoTutor, setTipoTutor] = useState('ambas'); // comunales, laborales, ambas
  const [cargandoRegistro, setCargandoRegistro] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState('');

  // Estados para el Modal de Contraseña Generada (Opción B)
  const [claveGenerada, setClaveGenerada] = useState('');
  const [nombreDocenteCreado, setNombreDocenteCreado] = useState('');
  const [modalClaveAbierto, setModalClaveAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    cargarDocentes();
  }, []);

  useEffect(() => {
    filtrarDocentes();
  }, [busqueda, docentes]);

  const cargarDocentes = async () => {
    try {
      setCargando(true);
      const response = await api.get('/admin/docentes');
      setDocentes(response.data.data);
    } catch (error) {
      console.error('Error al cargar docentes:', error);
    } finally {
      setCargando(false);
    }
  };

  const filtrarDocentes = () => {
    if (!busqueda.trim()) {
      setDocentesFiltrados(docentes);
      return;
    }
    const query = busqueda.toLowerCase();
    const filtrados = docentes.filter(
      (doc) =>
        doc.nombres?.toLowerCase().includes(query) ||
        doc.email?.toLowerCase().includes(query) ||
        doc.departamento?.toLowerCase().includes(query)
    );
    setDocentesFiltrados(filtrados);
  };

  const registrarDocente = async (e) => {
    e.preventDefault();
    setErrorRegistro('');

    if (!email.endsWith('@espoch.edu.ec')) {
      setErrorRegistro('Debes registrar un correo institucional de la ESPOCH (@espoch.edu.ec).');
      return;
    }

    setCargandoRegistro(true);

    try {
      const response = await api.post('/admin/docentes', {
        email,
        nombres,
        departamento,
        tipoTutor,
      });

      if (response.data.success) {
        // Docente creado con éxito
        setNombreDocenteCreado(response.data.data.nombres);
        setClaveGenerada(response.data.data.passwordTemporal);
        
        // Limpiar formulario y cerrar modal de registro
        setEmail('');
        setNombres('');
        setDepartamento('');
        setTipoTutor('ambas');
        setModalAbierto(false);
        
        // Abrir modal de clave generada
        setModalClaveAbierto(true);
        cargarDocentes(); // Recargar lista
      }
    } catch (err) {
      console.error(err);
      setErrorRegistro(err.response?.data?.message || 'Error al registrar al docente.');
    } finally {
      setCargandoRegistro(false);
    }
  };

  const copiarClave = () => {
    navigator.clipboard.writeText(claveGenerada);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
              Gestión de Docentes (Tutores)
            </h1>
            <p className="text-gray-500">
              Registra nuevos profesores y supervisa la carga de alumnos asignada para la revisión de carpetas de prácticas.
            </p>
          </div>
          <button
            onClick={() => setModalAbierto(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-700/20 transition flex items-center space-x-2 transform hover:-translate-y-0.5"
          >
            <FiUserPlus className="h-5 w-5" />
            <span>Registrar Nuevo Docente</span>
          </button>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex items-center">
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar docente por nombre, correo institucional o departamento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 placeholder-gray-400 transition"
            />
          </div>
        </div>

        {/* Listado de Docentes */}
        {docentesFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-md">
            <div className="text-6xl mb-4">👨‍🏫</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron docentes</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {busqueda
                ? 'Intenta ajustar los criterios de búsqueda.'
                : 'No hay docentes registrados en el sistema.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-4 text-left">Docente</th>
                    <th className="px-6 py-4 text-left">Correo Institucional</th>
                    <th className="px-6 py-4 text-left">Departamento</th>
                    <th className="px-6 py-4 text-left">Especialidad de Tutoría</th>
                    <th className="px-6 py-4 text-center">Alumnos Activos</th>
                    <th className="px-6 py-4 text-center">Estado Cuenta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {docentesFiltrados.map((doc) => {
                    const esActivo = doc.estadoCuenta === 'activo';

                    return (
                      <tr key={doc.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="bg-indigo-100 text-indigo-700 h-9 w-9 rounded-full flex items-center justify-center font-bold">
                              <FiUser className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-gray-900">{doc.nombres}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">{doc.email}</td>
                        <td className="px-6 py-4 text-gray-500">{doc.departamento || 'Sin especificar'}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${
                              doc.tipoTutor === 'comunales'
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : doc.tipoTutor === 'laborales'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {doc.tipoTutor === 'ambas' ? 'Comunales y Laborales' : doc.tipoTutor}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-700 text-base">
                          {doc.cargaActiva}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              esActivo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {esActivo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de Registro de Docente */}
        {modalAbierto && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-scale-up border border-gray-100">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Registrar Docente en el Sistema</h3>
                <button
                  onClick={() => setModalAbierto(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={registrarDocente}>
                <div className="p-6 space-y-4">
                  {errorRegistro && (
                    <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 flex items-center space-x-2 text-sm">
                      <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
                      <span>{errorRegistro}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={nombres}
                      onChange={(e) => setNombres(e.target.value)}
                      placeholder="Ej. Ing. Juan Carlos Pérez"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 placeholder-gray-400 focus:outline-none transition shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Correo Institucional (@espoch.edu.ec)
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="juan.perez@espoch.edu.ec"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 placeholder-gray-400 focus:outline-none transition shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Departamento Académico
                    </label>
                    <input
                      type="text"
                      value={departamento}
                      onChange={(e) => setDepartamento(e.target.value)}
                      placeholder="Ej. Departamento de Computación"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 placeholder-gray-400 focus:outline-none transition shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Especialidad o Tipo de Tutoría
                    </label>
                    <div className="relative">
                      <FiBriefcase className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
                      <select
                        value={tipoTutor}
                        onChange={(e) => setTipoTutor(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white appearance-none cursor-pointer transition shadow-sm"
                      >
                        <option value="ambas">Ambas (Comunales y Laborales)</option>
                        <option value="comunales">Solo Prácticas Comunales</option>
                        <option value="laborales">Solo Prácticas Laborales</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 font-semibold text-gray-700 transition text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={cargandoRegistro}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/10 transition text-sm flex items-center"
                  >
                    {cargandoRegistro ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creando...
                      </span>
                    ) : (
                      'Crear Cuenta Docente'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Clave Generada Obligatoria (Opción B) */}
        {modalClaveAbierto && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-scale-up border border-indigo-100 p-8 text-center space-y-6">
              <div className="bg-emerald-100 text-emerald-600 h-20 w-20 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                <FiCheckCircle className="h-12 w-12" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  ¡Docente Creado con Éxito!
                </h3>
                <p className="text-gray-500 text-sm">
                  Se ha registrado la cuenta de <strong className="text-gray-800">{nombreDocenteCreado}</strong>.
                </p>
              </div>

              {/* Caja de clave temporal llamativa */}
              <div className="bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-2xl p-5 relative overflow-hidden group">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">
                  Contraseña Temporal de Acceso
                </p>
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-2xl font-black font-mono tracking-widest text-indigo-700 select-all">
                    {claveGenerada}
                  </span>
                  <button
                    onClick={copiarClave}
                    className="p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl transition shadow-sm"
                    title="Copiar contraseña"
                  >
                    <FiCopy className="h-4 w-4" />
                  </button>
                </div>
                {copiado && (
                  <p className="text-emerald-600 text-xs font-bold mt-2 animate-pulse">
                    ¡Copiada al portapapeles!
                  </p>
                )}
              </div>

              {/* Alerta de visualización única */}
              <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-2xl p-4 text-xs flex items-start space-x-2 text-left">
                <FiAlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">¡Advertencia de Seguridad!</strong>
                  <span>
                    Entrega esta contraseña al docente. Por motivos de seguridad y encriptación, <strong className="underline">no se volverá a mostrar en pantalla</strong>.
                  </span>
                </div>
              </div>

              <div>
                <button
                  onClick={() => setModalClaveAbierto(false)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition"
                >
                  Entendido y Guardado
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionDocentes;
