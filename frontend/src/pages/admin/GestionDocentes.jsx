import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  const [tipoTutor, setTipoTutor] = useState('laborales'); // comunales, laborales
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
        setTipoTutor('laborales');
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
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
          <div className="pl-2">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
              Gestión de Docentes Tutores
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Registra nuevos profesores y supervisa la carga de alumnos asignada para la revisión de carpetas de prácticas.
            </p>
          </div>
          <button
            onClick={() => setModalAbierto(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98]"
          >
            <FiUserPlus className="h-4 w-4" />
            <span>Registrar Nuevo Docente</span>
          </button>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="relative w-full">
            <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-450" />
            <input
              type="text"
              placeholder="Buscar docente por nombre, correo institucional o departamento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
            />
          </div>
        </div>

        {/* Listado de Docentes */}
        {docentesFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
            <FiUser className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">No se encontraron docentes</h3>
            <p className="text-[11px] font-semibold text-slate-500">
              {busqueda
                ? 'Intenta ajustar los criterios de búsqueda en el filtro.'
                : 'No hay docentes registrados en el sistema.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 table-auto">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-550 font-black uppercase text-[9px] tracking-wider divide-x divide-slate-200">
                    <th className="px-3.5 py-3 text-left w-[240px]">Docente</th>
                    <th className="px-3.5 py-3 text-left w-[200px]">Correo Institucional</th>
                    <th className="px-3.5 py-3 text-left w-[200px]">Departamento Académico</th>
                    <th className="px-3.5 py-3 text-left w-[180px]">Especialidad de Tutoría</th>
                    <th className="px-3.5 py-3 text-left w-[180px]">Paralelo Asignado</th>
                    <th className="px-3.5 py-3 text-center w-[120px]">Alumnos Activos</th>
                    <th className="px-3.5 py-3 text-center w-[100px]">Estado Cuenta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white font-semibold text-slate-700">
                  {docentesFiltrados.map((doc) => {
                    const esActivo = doc.estadoCuenta === 'activo';

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors divide-x divide-slate-100 text-[11px]">
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center min-w-0">
                            <div className="bg-slate-100 text-slate-600 h-7 w-7 rounded-full flex items-center justify-center font-bold border border-slate-250 flex-shrink-0">
                              <FiUser className="h-3.5 w-3.5" />
                            </div>
                            <span className="ml-2.5 font-black text-slate-900 uppercase truncate max-w-[200px]">{doc.nombres}</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 font-bold truncate max-w-[200px]" title={doc.email}>
                          {doc.email}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-500 font-bold uppercase truncate max-w-[200px]" title={doc.departamento || 'Sin especificar'}>
                          {doc.departamento || 'Sin especificar'}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                              doc.tipoTutor === 'comunales'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : doc.tipoTutor === 'laborales'
                                  ? 'bg-rose-50 text-[#ec3724] border-rose-100'
                                  : 'bg-slate-50 text-slate-800 border-slate-200'
                            }`}
                          >
                            {doc.tipoTutor === 'ambas' ? 'Comunales y Laborales' : doc.tipoTutor === 'comunales' ? 'comunitarias' : doc.tipoTutor}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          {doc.paralelos && doc.paralelos.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              {doc.paralelos.map((p) => {
                                const esLaboral = p.tipoPractica === 'laboral';
                                return (
                                  <Link
                                    key={p.id}
                                    to="/admin/paralelos"
                                    className={`inline-flex items-center gap-1.5 w-max px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider transition-all hover:scale-102 ${
                                      esLaboral
                                        ? 'bg-rose-50 border-rose-100 text-[#ec3724] hover:bg-rose-100'
                                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                    title={`Ir a detalles del Paralelo ${p.nombre}`}
                                  >
                                    <span>Paralelo {p.nombre}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-black text-[9px] uppercase italic">Sin Paralelo</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-black text-slate-800 text-xs">
                          {doc.cargaActiva}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                              esActivo ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-100 text-[#ec3724]'
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
            <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-scale-up border border-slate-200">
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Registrar Docente Tutor</h3>
                <button
                  onClick={() => setModalAbierto(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  Cerrar
                </button>
              </div>

              <form onSubmit={registrarDocente}>
                <div className="p-6 space-y-4">
                  {errorRegistro && (
                    <div className="bg-rose-50 text-[#ec3724] border border-rose-150 rounded-lg p-4 flex items-center gap-2 text-xs font-bold leading-relaxed">
                      <FiAlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                      <span>{errorRegistro}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={nombres}
                      onChange={(e) => setNombres(e.target.value)}
                      placeholder="Ej. Ing. Juan Carlos Pérez"
                      className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                      Correo Institucional (@espoch.edu.ec)
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="juan.perez@espoch.edu.ec"
                        className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                      Departamento Académico
                    </label>
                    <input
                      type="text"
                      value={departamento}
                      onChange={(e) => setDepartamento(e.target.value)}
                      placeholder="Ej. Departamento de Computación"
                      className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                      Especialidad o Tipo de Tutoría
                    </label>
                    <div className="relative">
                      <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <select
                        value={tipoTutor}
                        onChange={(e) => setTipoTutor(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-700 cursor-pointer appearance-none"
                      >
                        <option value="laborales">Solo Prácticas Laborales</option>
                        <option value="comunales">Solo Prácticas Comunitarias</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="inline-flex items-center justify-center px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={cargandoRegistro}
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98]"
                  >
                    {cargandoRegistro ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-3.5 w-3.5 mr-2 text-white" viewBox="0 0 24 24">
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

        {/* Modal de Clave Generada Obligatoria */}
        {modalClaveAbierto && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl p-8 text-center space-y-6 border border-slate-200">
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 h-16 w-16 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <FiCheckCircle className="h-10 w-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  ¡Docente Creado con Éxito!
                </h3>
                <p className="text-slate-500 text-xs font-semibold">
                  Se ha registrado formalmente la cuenta de <strong className="text-slate-800">{nombreDocenteCreado}</strong>.
                </p>
              </div>

              {/* Caja de clave temporal */}
              <div className="bg-slate-50 border-2 border-dashed border-slate-350 rounded-xl p-5 relative overflow-hidden">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Contraseña Temporal de Acceso
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xl font-black font-mono tracking-widest text-slate-800 select-all">
                    {claveGenerada}
                  </span>
                  <button
                    onClick={copiarClave}
                    className="p-2 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-lg transition shadow-sm border border-slate-300"
                    title="Copiar contraseña"
                  >
                    <FiCopy className="h-4 w-4" />
                  </button>
                </div>
                {copiado && (
                  <p className="text-emerald-600 text-[10px] font-black uppercase tracking-wider mt-2">
                    ¡Copiada al portapapeles!
                  </p>
                )}
              </div>

              {/* Alerta de visualización única */}
              <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-4 text-[10px] flex items-start gap-2.5 text-left font-semibold">
                <FiAlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div>
                  <strong className="font-black uppercase tracking-wider block mb-0.5">¡Advertencia de Seguridad!</strong>
                  <span>
                    Entrega esta contraseña al docente tutor. Por motivos de seguridad y encriptación, <span className="underline font-bold">no se volverá a mostrar en pantalla</span>.
                  </span>
                </div>
              </div>

              <div>
                <button
                  onClick={() => setModalClaveAbierto(false)}
                  className="w-full bg-[#ec3724] hover:bg-[#d32010] text-white font-black py-3 px-4 rounded-lg shadow-md text-xs uppercase tracking-widest transition active:scale-[0.98]"
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
