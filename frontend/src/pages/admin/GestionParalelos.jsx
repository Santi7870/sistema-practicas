import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../services/api';
import {
  FiUsers,
  FiUser,
  FiPlus,
  FiTrash2,
  FiShuffle,
  FiBookOpen,
  FiBriefcase,
  FiAward,
  FiCornerDownRight,
  FiAlertCircle,
  FiCheckCircle,
} from 'react-icons/fi';

const GestionParalelos = () => {
  const [modalidad, setModalidad] = useState('laboral'); // 'laboral' o 'comunitaria'
  const [paralelos, setParalelos] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [estudiantesSinParalelo, setEstudiantesSinParalelo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [procesando, setProcesando] = useState(false);

  // Estados para Modal de Mover Estudiante
  const [modalMoverAbierto, setModalMoverAbierto] = useState(false);
  const [moverInscripcionId, setMoverInscripcionId] = useState(null);
  const [moverNombreEstudiante, setMoverNombreEstudiante] = useState('');
  const [moverParaleloDestino, setMoverParaleloDestino] = useState('');

  // Estados para Modal de Agregar Estudiante Manual
  const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false);
  const [agregarParaleloId, setAgregarParaleloId] = useState(null);
  const [agregarParaleloNombre, setAgregarParaleloNombre] = useState('');
  const [estudianteElegidoId, setEstudianteElegidoId] = useState('');

  // Estados para Modal de Ver Estudiantes
  const [modalVerEstudiantesAbierto, setModalVerEstudiantesAbierto] = useState(false);
  const [paraleloSeleccionado, setParaleloSeleccionado] = useState(null);

  // Estado para Modal de Estudiantes sin Paralelo
  const [modalVerSinParaleloAbierto, setModalVerSinParaleloAbierto] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [modalidad]);

  const abrirModalVerEstudiantes = (paralelo) => {
    setParaleloSeleccionado(paralelo);
    setModalVerEstudiantesAbierto(true);
  };


  const cargarDatos = async () => {
    try {
      setCargando(true);
      setMensaje({ tipo: '', texto: '' });

      // 1. Cargar paralelos con sus docentes y estudiantes asignados
      const responseParalelos = await api.get(`/admin/paralelos?tipo=${modalidad}`);
      const freshParalelos = responseParalelos.data.data;
      setParalelos(freshParalelos);

      // Sincronizar el modal de vista si ya está abierto
      if (modalVerEstudiantesAbierto && paraleloSeleccionado) {
        const updated = freshParalelos.find((p) => p.id === paraleloSeleccionado.id);
        if (updated) {
          setParaleloSeleccionado(updated);
        }
      }

      // 2. Cargar docentes de esta especialidad de forma estricta
      const responseDocentes = await api.get('/admin/docentes');
      const tipoTutorRequerido = modalidad === 'laboral' ? 'laborales' : 'comunales';
      const docentesFiltrados = responseDocentes.data.data.filter(
        (doc) => doc.tipoTutor === tipoTutorRequerido || doc.tipoTutor === 'ambas'
      );
      setDocentes(docentesFiltrados);

      // 3. Cargar todos los estudiantes de la lista general para encontrar a los aprobados y activos sin paralelo
      const responseEstudiantes = await api.get('/admin/estudiantes');
      const sinParalelo = responseEstudiantes.data.data.filter(
        (est) =>
          est.inscripcion &&
          est.inscripcion.tipoPractica === modalidad &&
          est.inscripcion.estadoInscripcion === 'aprobada' &&
          est.inscripcion.activa === true &&
          !est.inscripcion.paraleloId
      );
      setEstudiantesSinParalelo(sinParalelo);
    } catch (error) {
      console.error('Error al cargar datos de paralelos:', error);
      setMensaje({ tipo: 'error', texto: 'No se pudieron cargar los datos de los paralelos.' });
    } finally {
      setCargando(false);
    }
  };

  const mostrarMensajeTemporal = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000);
  };

  // Asignar docente a paralelo manualmente
  const handleAsignarDocente = async (paraleloId, docenteId) => {
    if (docenteId) {
      const docIdNum = parseInt(docenteId, 10);
      const docElegido = docentes.find((d) => d.id === docIdNum);
      if (docElegido && docElegido.paralelos && docElegido.paralelos.length > 0) {
        const otroParalelo = docElegido.paralelos[0];
        if (otroParalelo.id !== paraleloId) {
          const confirmar = window.confirm(
            `El tutor ${docElegido.nombres} ya está asignado al Paralelo ${otroParalelo.nombre} de prácticas ${otroParalelo.tipoPractica}es.\n\n¿Deseas transferirlo a este paralelo? (Esto liberará su asignación en el Paralelo ${otroParalelo.nombre}).`
          );
          if (!confirmar) {
            cargarDatos(); // Reestablecer selección visual
            return;
          }
        }
      }
    }

    try {
      setProcesando(true);
      const response = await api.put(`/admin/paralelos/${paraleloId}/docente`, {
        docenteId: docenteId ? parseInt(docenteId, 10) : null,
      });
      if (response.data.success) {
        mostrarMensajeTemporal('success', response.data.message);
        cargarDatos();
      }
    } catch (error) {
      console.error(error);
      mostrarMensajeTemporal('error', error.response?.data?.message || 'Error al asignar docente.');
    } finally {
      setProcesando(false);
    }
  };

  // Quitar estudiante de paralelo
  const handleQuitarEstudiante = async (inscripcionId) => {
    if (!window.confirm('¿Está seguro de remover a este estudiante del paralelo? También perderá su docente asignado.')) {
      return;
    }

    try {
      setProcesando(true);
      const response = await api.put('/admin/paralelos/mover-estudiante', {
        inscripcionId,
        paraleloId: null,
      });
      if (response.data.success) {
        mostrarMensajeTemporal('success', response.data.message);
        cargarDatos();
      }
    } catch (error) {
      console.error(error);
      mostrarMensajeTemporal('error', error.response?.data?.message || 'Error al remover estudiante.');
    } finally {
      setProcesando(false);
    }
  };

  // Mover estudiante a otro paralelo
  const abrirModalMover = (inscripcionId, estudianteNombre, paraleloIdActual) => {
    setMoverInscripcionId(inscripcionId);
    setMoverNombreEstudiante(estudianteNombre);
    setMoverParaleloDestino('');
    setModalMoverAbierto(true);
  };

  const handleMoverEstudiante = async (e) => {
    e.preventDefault();
    if (!moverParaleloDestino) return;

    try {
      setProcesando(true);
      const response = await api.put('/admin/paralelos/mover-estudiante', {
        inscripcionId: moverInscripcionId,
        paraleloId: parseInt(moverParaleloDestino, 10),
      });
      if (response.data.success) {
        mostrarMensajeTemporal('success', response.data.message);
        setModalMoverAbierto(false);
        cargarDatos();
      }
    } catch (error) {
      console.error(error);
      mostrarMensajeTemporal('error', error.response?.data?.message || 'Error al mover estudiante.');
    } finally {
      setProcesando(false);
    }
  };

  // Agregar estudiante manualmente a paralelo
  const abrirModalAgregar = (paraleloId, paraleloNombre) => {
    setAgregarParaleloId(paraleloId);
    setAgregarParaleloNombre(paraleloNombre);
    setEstudianteElegidoId('');
    setModalAgregarAbierto(true);
  };

  const handleAgregarEstudiante = async (e) => {
    e.preventDefault();
    if (!estudianteElegidoId) return;

    try {
      setProcesando(true);
      const response = await api.put('/admin/paralelos/mover-estudiante', {
        inscripcionId: parseInt(estudianteElegidoId, 10),
        paraleloId: agregarParaleloId,
      });
      if (response.data.success) {
        mostrarMensajeTemporal('success', response.data.message);
        setModalAgregarAbierto(false);
        cargarDatos();
      }
    } catch (error) {
      console.error(error);
      mostrarMensajeTemporal('error', error.response?.data?.message || 'Error al agregar estudiante.');
    } finally {
      setProcesando(false);
    }
  };

  // Distribución automática de estudiantes
  const handleAutoDistribuirEstudiantes = async () => {
    if (!window.confirm('¿Está seguro de distribuir automáticamente a todos los estudiantes sin paralelo de forma equitativa?')) {
      return;
    }

    try {
      setProcesando(true);
      const response = await api.post('/admin/paralelos/distribuir-estudiantes', {
        tipoPractica: modalidad,
      });
      if (response.data.success) {
        mostrarMensajeTemporal('success', response.data.message);
        cargarDatos();
      }
    } catch (error) {
      console.error(error);
      mostrarMensajeTemporal('error', error.response?.data?.message || 'Error al distribuir estudiantes.');
    } finally {
      setProcesando(false);
    }
  };

  // Distribución automática de docentes
  const handleAutoDistribuirDocentes = async () => {
    if (!window.confirm('¿Está seguro de distribuir equitativamente a los docentes de esta modalidad entre los 8 paralelos?')) {
      return;
    }

    try {
      setProcesando(true);
      const response = await api.post('/admin/paralelos/distribuir-docentes', {
        tipoPractica: modalidad,
      });
      if (response.data.success) {
        mostrarMensajeTemporal('success', response.data.message);
        cargarDatos();
      }
    } catch (error) {
      console.error(error);
      mostrarMensajeTemporal('error', error.response?.data?.message || 'Error al distribuir docentes.');
    } finally {
      setProcesando(false);
    }
  };

  if (cargando && paralelos.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ec3724]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 animate-fadeIn">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
          <div className="pl-2">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
              Gestión de Paralelos y Distribución
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Administra los 8 paralelos académicos. Distribuye estudiantes y docentes equitativamente de forma automatizada o manual.
            </p>
          </div>
          {/* Tabs de modalidad */}
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 flex-shrink-0">
            <button
              onClick={() => setModalidad('laboral')}
              className={`px-4 py-1.5 rounded-md font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 ${
                modalidad === 'laboral'
                  ? 'bg-white text-[#ec3724] shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FiBriefcase className="h-3.5 w-3.5" />
              <span>Laborales</span>
            </button>
            <button
              onClick={() => setModalidad('comunitaria')}
              className={`px-4 py-1.5 rounded-md font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 ${
                modalidad === 'comunitaria'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FiAward className="h-3.5 w-3.5" />
              <span>Comunitarias</span>
            </button>
          </div>
        </div>

        {/* Notificaciones de mensaje temporal */}
        {mensaje.texto && (
          <div className={`border rounded-lg p-4 flex items-center gap-2 text-xs font-bold leading-relaxed ${mensaje.tipo === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-150 text-[#ec3724]'}`}>
            {mensaje.tipo === 'success' ? (
              <FiCheckCircle className="h-4.5 w-4.5 flex-shrink-0" />
            ) : (
              <FiAlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
            )}
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Barra de Acciones de Distribución */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-slate-100 text-slate-700 p-3 rounded-lg border border-slate-200">
              <FiUsers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider">
                Alumnos sin paralelo en prácticas {modalidad === 'laboral' ? 'laborales' : 'comunitarias'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold flex items-center gap-2 flex-wrap leading-relaxed">
                <span>Hay <strong className="text-slate-900 font-black">{estudiantesSinParalelo.length}</strong> estudiantes aprobados esperando asignación.</span>
                {estudiantesSinParalelo.length > 0 && (
                  <button
                    onClick={() => setModalVerSinParaleloAbierto(true)}
                    className="text-xs font-black underline transition cursor-pointer text-[#ec3724] hover:text-[#d32010] uppercase tracking-wider text-[10px]"
                  >
                    (Ver lista completa)
                  </button>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 flex-shrink-0">
            <button
              onClick={handleAutoDistribuirDocentes}
              disabled={procesando || docentes.length === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-250 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all"
            >
              <FiShuffle className="h-3.5 w-3.5" />
              <span>Asignar Docentes Automático</span>
            </button>
            <button
              onClick={handleAutoDistribuirEstudiantes}
              disabled={procesando || estudiantesSinParalelo.length === 0}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] ${
                modalidad === 'laboral'
                  ? 'bg-[#ec3724] hover:bg-[#d32010]'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <FiUsers className="h-3.5 w-3.5" />
              <span>Distribuir Estudiantes Equitativamente</span>
            </button>
          </div>
        </div>

        {/* Grid de Paralelos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {paralelos.map((paralelo) => {
            const numAlumnos = paralelo.inscripciones ? paralelo.inscripciones.length : 0;
            return (
              <div
                key={paralelo.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
              >
                {/* Header de la Tarjeta */}
                <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-sm font-black uppercase tracking-wider ${
                        modalidad === 'laboral' ? 'text-[#ec3724]' : 'text-emerald-700'
                      }`}
                    >
                      Paralelo {paralelo.nombre}
                    </span>
                    <span className="bg-slate-200 text-slate-750 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-slate-300">
                      {numAlumnos} Alumnos
                    </span>
                  </div>

                  {/* Selector de Docente */}
                  <div className="mt-4">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Tutor Académico
                    </label>
                    <select
                      value={paralelo.docenteId || ''}
                      onChange={(e) => handleAsignarDocente(paralelo.id, e.target.value)}
                      disabled={procesando}
                      className="w-full text-[11px] font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#ec3724] cursor-pointer shadow-sm"
                    >
                      <option value="">-- Sin Tutor Asignado --</option>
                      {docentes.map((doc) => {
                        const asignadoAOtro = doc.paralelos && doc.paralelos.length > 0 && doc.paralelos[0].id !== paralelo.id;
                        return (
                          <option key={doc.id} value={doc.id}>
                            {doc.nombres} {asignadoAOtro ? `(Paralelo ${doc.paralelos[0].nombre})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Lista de Alumnos */}
                <div className="p-4 flex-1 space-y-2 overflow-y-auto max-h-[220px] divide-y divide-slate-100">
                  {numAlumnos === 0 ? (
                    <div className="text-center py-8 text-slate-400 font-semibold text-[10px] uppercase italic">
                      Sin estudiantes asignados
                    </div>
                  ) : (
                    paralelo.inscripciones.map((ins) => (
                      <div
                        key={ins.id}
                        className="pt-2 flex items-center justify-between text-[11px] font-semibold text-slate-750"
                      >
                        <div className="flex items-center space-x-2 overflow-hidden min-w-0">
                          <div className="bg-slate-100 text-slate-600 h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 border border-slate-200">
                            <FiUser className="h-3 w-3" />
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-slate-900 truncate uppercase text-[10.5px]">{ins.estudiante?.nombres}</p>
                            <p className="text-[9px] text-slate-400 font-bold font-mono tracking-wider mt-0.5">{ins.estudiante?.codigo}</p>
                          </div>
                        </div>
                        {/* Acciones del Alumno */}
                        <div className="flex items-center space-x-0.5 flex-shrink-0">
                          <button
                            onClick={() =>
                              abrirModalMover(ins.id, ins.estudiante?.nombres, paralelo.id)
                            }
                            title="Mover Estudiante"
                            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition border border-transparent hover:border-slate-250"
                          >
                            <FiCornerDownRight className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleQuitarEstudiante(ins.id)}
                            title="Remover de Paralelo"
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-[#ec3724] rounded transition border border-transparent hover:border-rose-200"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer de la tarjeta */}
                <div className="p-3 bg-slate-50/50 border-t border-slate-200 flex justify-between items-center gap-1">
                  <button
                    onClick={() => abrirModalVerEstudiantes(paralelo)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-250 rounded-lg font-black text-[9px] uppercase tracking-wider shadow-sm transition-all"
                  >
                    <FiBookOpen className="h-3 w-3" />
                    <span>Ver Alumnos ({numAlumnos})</span>
                  </button>
                  <button
                    onClick={() => abrirModalAgregar(paralelo.id, paralelo.nombre)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-white text-[#ec3724] hover:bg-rose-50 border border-slate-250 hover:border-rose-200 rounded-lg font-black text-[9px] uppercase tracking-wider shadow-sm transition-all"
                  >
                    <FiPlus className="h-3 w-3" />
                    <span>Agregar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal de Mover Estudiante */}
        {modalMoverAbierto && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-scale-up">
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center relative">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider pl-2">Mover Estudiante de Paralelo</h3>
                <button
                  onClick={() => setModalMoverAbierto(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  Cerrar
                </button>
              </div>

              <form onSubmit={handleMoverEstudiante}>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Estudiante</p>
                    <p className="font-black text-slate-900 uppercase text-sm">{moverNombreEstudiante}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                      Seleccionar Paralelo de Destino
                    </label>
                    <select
                      required
                      value={moverParaleloDestino}
                      onChange={(e) => setMoverParaleloDestino(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-350 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold cursor-pointer shadow-sm"
                    >
                      <option value="">-- Elige un Paralelo --</option>
                      {paralelos.map((p) => (
                        <option key={p.id} value={p.id}>
                          Paralelo {p.nombre} (Tutor: {p.docente?.nombres || 'Ninguno'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMoverAbierto(false)}
                    className="inline-flex items-center justify-center px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={procesando}
                    className="inline-flex items-center justify-center px-5 py-2 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98]"
                  >
                    Confirmar Cambio
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Agregar Estudiante Manual */}
        {modalAgregarAbierto && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-scale-up">
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center relative">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider pl-2">
                  Agregar Estudiante a Paralelo {agregarParaleloNombre}
                </h3>
                <button
                  onClick={() => setModalAgregarAbierto(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  Cerrar
                </button>
              </div>

              <form onSubmit={handleAgregarEstudiante}>
                <div className="p-6 space-y-4">
                  {estudiantesSinParalelo.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 font-bold text-xs uppercase italic">
                      No hay estudiantes aprobados en cola esperando asignación.
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                        Seleccionar Estudiante Aprobado
                      </label>
                      <select
                        required
                        value={estudianteElegidoId}
                        onChange={(e) => setEstudianteElegidoId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-350 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold cursor-pointer shadow-sm"
                      >
                        <option value="">-- Elige un Estudiante --</option>
                        {estudiantesSinParalelo.map((est) => (
                          <option key={est.id} value={est.inscripcion?.id}>
                            {est.nombres} ({est.codigo}) - {est.semestre}° Semestre
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAgregarAbierto(false)}
                    className="inline-flex items-center justify-center px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={procesando || estudiantesSinParalelo.length === 0}
                    className="inline-flex items-center justify-center px-5 py-2 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98]"
                  >
                    Asignar Alumno
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Ver Estudiantes Detallado */}
        {modalVerEstudiantesAbierto && paraleloSeleccionado && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-scale-up flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center relative flex-shrink-0">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
                <div className="pl-2">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span>Paralelo {paraleloSeleccionado.nombre}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                      Modalidad {paraleloSeleccionado.tipoPractica}es
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                    Tutor Académico: <span className="text-slate-700">{paraleloSeleccionado.docente?.nombres || 'Sin Tutor Asignado'}</span>
                  </p>
                </div>
                <button
                  onClick={() => setModalVerEstudiantesAbierto(false)}
                  className="text-slate-400 hover:text-slate-650 font-bold"
                >
                  Cerrar
                </button>
              </div>

              {/* Contenido (Scrollable) */}
              <div className="p-6 overflow-y-auto flex-1">
                {(!paraleloSeleccionado.inscripciones || paraleloSeleccionado.inscripciones.length === 0) ? (
                  <div className="text-center py-12">
                    <div className="bg-slate-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                      <FiUsers className="h-6 w-6 text-slate-400" />
                    </div>
                    <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">No hay estudiantes en este paralelo</h4>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1">Puedes agregar estudiantes manualmente o distribuirlos equitativamente.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-auto">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-[9px] font-black text-slate-550 uppercase tracking-wider divide-x divide-slate-200">
                          <th className="py-2.5 px-3.5 text-left w-[240px]">Estudiante</th>
                          <th className="py-2.5 px-3.5 text-left w-[180px]">Código / Semestre</th>
                          <th className="py-2.5 px-3.5 text-left w-[220px]">Correo Institucional</th>
                          <th className="py-2.5 px-3.5 text-left w-[180px]">Fase de Proceso</th>
                          <th className="py-2.5 px-3.5 text-center w-[120px]">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white font-semibold text-slate-700">
                        {paraleloSeleccionado.inscripciones.map((ins) => {
                          const est = ins.estudiante;
                          return (
                            <tr key={ins.id} className="hover:bg-slate-50/50 transition text-[11px] divide-x divide-slate-100">
                              <td className="py-2.5 px-3.5 font-black text-slate-900 uppercase truncate max-w-[220px]">{est?.nombres}</td>
                              <td className="py-2.5 px-3.5 text-slate-600 font-bold uppercase truncate max-w-[180px]">
                                <span className="font-mono text-xs">{est?.codigo}</span>
                                <span className="text-slate-300 mx-1.5">•</span>
                                <span>{est?.semestre}° Semestre</span>
                              </td>
                              <td className="py-2.5 px-3.5 text-slate-500 font-bold truncate max-w-[220px]" title={est?.usuario?.email}>{est?.usuario?.email}</td>
                              <td className="py-2.5 px-3.5">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                  est?.estadoProceso === 'finalizado'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : est?.estadoProceso === 'en_proceso'
                                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                                    : est?.estadoProceso === 'pendiente_inicio'
                                    ? 'bg-amber-50 border-amber-250 text-amber-800'
                                    : 'bg-slate-50 border-slate-200 text-slate-655'
                                }`}>
                                  {est?.estadoProceso === 'sin_asignar' && 'Sin Inscribir'}
                                  {est?.estadoProceso === 'asignado' && 'Asignado'}
                                  {est?.estadoProceso === 'pendiente_inicio' && 'Pend. Inicio'}
                                  {est?.estadoProceso === 'en_proceso' && 'En Proceso'}
                                  {est?.estadoProceso === 'finalizado' && 'Finalizado'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 text-center">
                                <div className="flex justify-center items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setModalVerEstudiantesAbierto(false);
                                      abrirModalMover(ins.id, est?.nombres, paraleloSeleccionado.id);
                                    }}
                                    className="px-2.5 py-1 bg-white text-slate-700 hover:bg-slate-50 border border-slate-250 rounded font-black text-[9px] uppercase tracking-wider shadow-sm transition"
                                  >
                                    Mover
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (window.confirm(`¿Remover a ${est?.nombres} del Paralelo ${paraleloSeleccionado.nombre}?`)) {
                                        setModalVerEstudiantesAbierto(false);
                                        await handleQuitarEstudiante(ins.id);
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-white text-[#ec3724] hover:bg-rose-50 border border-slate-250 hover:border-rose-200 rounded font-black text-[9px] uppercase tracking-wider shadow-sm transition"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setModalVerEstudiantesAbierto(false)}
                  className="inline-flex items-center justify-center px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de Ver Estudiantes Sin Paralelo General */}
        {modalVerSinParaleloAbierto && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-scale-up flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center relative flex-shrink-0">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
                <div className="pl-2">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span>Estudiantes Sin Paralelo Asignado</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                      Modalidad {modalidad === 'laboral' ? 'Laborales' : 'Comunitarias'} ({estudiantesSinParalelo.length})
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                    Lista general de estudiantes aprobados y listos para ser distribuidos formalmente.
                  </p>
                </div>
                <button
                  onClick={() => setModalVerSinParaleloAbierto(false)}
                  className="text-slate-400 hover:text-slate-650 font-bold"
                >
                  Cerrar
                </button>
              </div>

              {/* Contenido */}
              <div className="p-6 overflow-y-auto flex-1">
                {estudiantesSinParalelo.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-slate-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                      <FiUsers className="h-6 w-6 text-slate-400" />
                    </div>
                    <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">No hay estudiantes pendientes</h4>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1">Todos los estudiantes aprobados ya tienen asignado un paralelo.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-auto">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-[9px] font-black text-slate-550 uppercase tracking-wider divide-x divide-slate-200">
                          <th className="py-2.5 px-3.5 text-left w-[240px]">Estudiante</th>
                          <th className="py-2.5 px-3.5 text-left w-[185px]">Código / Semestre</th>
                          <th className="py-2.5 px-3.5 text-left w-[240px]">Correo Institucional</th>
                          <th className="py-2.5 px-3.5 text-left w-[240px]">Convenio Asociado</th>
                          <th className="py-2.5 px-3.5 text-center w-[120px]">Estado de Espera</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white font-semibold text-slate-700">
                        {estudiantesSinParalelo.map((est) => (
                          <tr key={est.id} className="hover:bg-slate-50/50 transition text-[11px] divide-x divide-slate-100">
                            <td className="py-2.5 px-3.5 font-black text-slate-900 uppercase truncate max-w-[240px]">{est.nombres}</td>
                            <td className="py-2.5 px-3.5 text-slate-600 font-bold uppercase truncate max-w-[185px]">
                              <span className="font-mono text-xs">{est.codigo}</span>
                              <span className="text-slate-300 mx-1.5">•</span>
                              <span>{est.semestre}° Semestre</span>
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-500 font-bold truncate max-w-[240px]">{est.usuario?.email}</td>
                            <td className="py-2.5 px-3.5 text-slate-600 font-bold uppercase truncate max-w-[240px]">
                              {est.inscripcion?.convenio?.nombreEmpresa || 'Sin Convenio Registrado'}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border bg-amber-50 border-amber-250 text-amber-800 animate-pulse">
                                Pendiente
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setModalVerSinParaleloAbierto(false)}
                  className="inline-flex items-center justify-center px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionParalelos;

