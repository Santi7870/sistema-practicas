import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../services/api';
import {
  FiArrowLeft,
  FiUser,
  FiFileText,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiBriefcase,
  FiMessageSquare,
  FiClock,
  FiBookOpen,
  FiActivity,
  FiCheck,
  FiChevronRight,
  FiFile,
} from 'react-icons/fi';

const DocenteDetalleEstudiante = () => {
  const { id } = useParams();
  const [estudiante, setEstudiante] = useState(null);
  const [inscripcion, setInscripcion] = useState(null);
  const [calificaciones, setCalificaciones] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  
  // Estado para la calificación de tareas académicas por ciclo
  const [activeEntrega, setActiveEntrega] = useState(null); // Tarea y entrega que se está calificando
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formNota, setFormNota] = useState('');
  const [formComentario, setFormComentario] = useState('');
  const [cargandoRevision, setCargandoRevision] = useState(false);
  
  const [mensajeOperacion, setMensajeOperacion] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    cargarDetalle();
  }, [id]);

  const cargarDetalle = async () => {
    try {
      setCargando(true);
      setError('');
      
      const [responseEstudiante, responseCalificaciones] = await Promise.all([
        api.get(`/docente/estudiantes/${id}`),
        api.get(`/docente/estudiantes/${id}/calificaciones`).catch((err) => {
          console.warn('No se pudieron cargar las calificaciones del estudiante:', err);
          return { data: { data: null } };
        }),
      ]);

      const data = responseEstudiante.data.data;
      setEstudiante(data);
      setInscripcion(data.inscripcion);
      setCalificaciones(responseCalificaciones.data.data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al cargar los detalles del estudiante.');
    } finally {
      setCargando(false);
    }
  };

  const descargarEntrega = async (entregaId, nombreArchivo) => {
    try {
      const response = await api.get(`/docente/entregas/${entregaId}/descargar`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nombreArchivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar:', error);
      setMensajeOperacion({
        tipo: 'error',
        texto: 'Error al descargar el archivo de la tarea.',
      });
      setTimeout(() => setMensajeOperacion({ tipo: '', texto: '' }), 4000);
    }
  };

  const abrirModalCalificar = (tarea, entrega) => {
    if (!entrega) {
      setActiveEntrega({
        entregaId: null,
        tareaId: tarea.id,
        codigo: tarea.codigo,
        titulo: tarea.titulo,
        puntajeMaximo: tarea.puntajeMaximo,
        nombreArchivo: 'Sin entregar (Calificación Directa)',
        nota: null,
        comentarioDocente: ''
      });
      setFormNota('');
      setFormComentario('');
    } else {
      setActiveEntrega({
        entregaId: entrega.id,
        tareaId: tarea.id,
        codigo: tarea.codigo,
        titulo: tarea.titulo,
        puntajeMaximo: tarea.puntajeMaximo,
        nombreArchivo: entrega.nombreArchivo,
        nota: entrega.nota,
        comentarioDocente: entrega.comentarioDocente
      });
      setFormNota(entrega.nota !== null && entrega.nota !== undefined ? String(entrega.nota) : '');
      setFormComentario(entrega.comentarioDocente || '');
    }
    setModalAbierto(true);
  };

  const cerrarModalCalificar = () => {
    setModalAbierto(false);
    setActiveEntrega(null);
    setFormNota('');
    setFormComentario('');
  };

  const guardarCalificacion = async (e) => {
    e.preventDefault();
    setError('');

    const notaValor = parseFloat(formNota);
    if (isNaN(notaValor) || notaValor < 0 || notaValor > (activeEntrega?.puntajeMaximo || 10)) {
      setError(`La nota debe ser un número válido entre 0 y ${activeEntrega?.puntajeMaximo || 10}.`);
      return;
    }

    setCargandoRevision(true);

    try {
      let response;
      if (!activeEntrega.entregaId) {
        response = await api.post(`/docente/tareas/${activeEntrega.tareaId}/estudiantes/${inscripcion.id}/calificar-sin-entrega`, {
          nota: notaValor,
          comentario: formComentario,
        });
      } else {
        response = await api.put(`/docente/entregas/${activeEntrega.entregaId}/calificar`, {
          nota: notaValor,
          comentario: formComentario,
        });
      }

      if (response.data.success) {
        setMensajeOperacion({
          tipo: 'success',
          texto: `Calificación guardada con éxito para la tarea ${activeEntrega.codigo}.`,
        });
        cerrarModalCalificar();
        cargarDetalle(); // Recargar datos para ver la actualización
        setTimeout(() => setMensajeOperacion({ tipo: '', texto: '' }), 4000);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error al registrar la calificación.');
    } finally {
      setCargandoRevision(false);
    }
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

  if (error && !estudiante) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error de Acceso</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link
            to="/docente/estudiantes"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition"
          >
            Volver a la Lista
          </Link>
        </div>
      </div>
    );
  }

  const getEstadoProcesoTexto = (estado) => {
    const text = {
      sin_asignar: 'Sin Completar Datos',
      asignado: 'Convenio Pendiente',
      pendiente_inicio: 'Convenio Aprobado',
      en_proceso: 'Ciclos Activos',
      finalizado: 'Finalizado / Aprobado',
    };
    return text[estado] || estado;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Enlace atrás */}
        <div>
          <Link
            to="/docente/estudiantes"
            className="inline-flex items-center space-x-2 text-slate-600 hover:text-[#ec3724] font-bold text-xs transition"
          >
            <FiArrowLeft className="h-4 w-4" />
            <span>Volver a la lista de estudiantes</span>
          </Link>
        </div>

        {mensajeOperacion.texto && (
          <div
            className={`p-4 rounded border flex items-center space-x-2 text-xs shadow-sm transition-all duration-300 ${
              mensajeOperacion.tipo === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {mensajeOperacion.tipo === 'success' ? (
              <FiCheckCircle className="h-4 w-4 flex-shrink-0" />
            ) : (
              <FiAlertCircle className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="font-bold">{mensajeOperacion.texto}</span>
          </div>
        )}

        {/* Ficha Informativa del Alumno */}
        <div className="bg-white rounded-xl border-l-4 border-l-[#ec3724] border-t border-r border-b border-slate-200 shadow-sm p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-slate-100 rounded-full blur-2xl"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="bg-slate-150 bg-slate-100 text-slate-700 border border-slate-350 h-14 w-14 rounded-xl flex items-center justify-center font-extrabold shadow-sm">
                <FiUser className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  {estudiante.nombres || 'Sin Completar Nombre'}
                </h1>
                <p className="text-slate-500 text-xs font-semibold mt-0.5">
                  Matrícula activa en el sistema de prácticas preprofesionales
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`px-3 py-1 rounded text-[10px] font-bold ${
                  inscripcion?.tipoPractica === 'comunitaria'
                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                    : 'bg-slate-200 text-slate-800 border border-slate-300'
                }`}
              >
                Prácticas {inscripcion?.tipoPractica === 'comunitaria' ? 'Comunales' : 'Laborales'}
              </span>
              <span className="px-3 py-1 rounded bg-slate-105 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                {getEstadoProcesoTexto(estudiante.estadoProceso)}
              </span>
              <Link
                to={`/docente/estudiantes/${estudiante.id}/calificaciones`}
                className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded shadow-sm transition duration-200"
              >
                <FiFileText className="h-3.5 w-3.5" />
                <span>Libro de Calificaciones</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-200 text-xs">
            <div>
              <p className="text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Código de Estudiante</p>
              <p className="font-bold text-slate-800">{estudiante.codigo || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Correo Institucional</p>
              <p className="font-bold text-slate-800">{estudiante.usuario?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Semestre</p>
              <p className="font-bold text-slate-800">{estudiante.semestre}° Semestre</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Empresa / Convenio</p>
              <p className="font-bold text-slate-800 flex items-center space-x-1">
                <FiBriefcase className="h-3.5 w-3.5 text-slate-500" />
                <span>{inscripcion?.convenio?.nombreEmpresa || 'No definido'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Panel de Entregables y Progreso en Formato Rejilla */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Columna Izquierda (Tareas y Entregables por Ciclo) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-slate-50">
                <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <span>Tareas y Entregables por Ciclo</span>
                </h2>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
                  Revisa y califica los archivos y tareas académicas subidas por el estudiante en cada uno de los 3 ciclos
                </p>
              </div>

              <div className="p-5 space-y-8">
                {calificaciones?.ciclos ? (
                  calificaciones.ciclos.map((ciclo) => (
                    <div key={ciclo.numeroCiclo} className="space-y-3">
                      <h3 className="text-xs font-bold text-[#ec3724] uppercase tracking-wider border-b pb-2 flex items-center justify-between">
                        <span>Ciclo {ciclo.numeroCiclo}</span>
                        <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded text-xs font-bold border border-slate-200">
                          Promedio: {ciclo.promedio !== null && ciclo.promedio !== undefined ? ciclo.promedio.toFixed(2) : '--'}
                        </span>
                      </h3>

                      <div className="grid grid-cols-1 gap-4">
                        {ciclo.tareas?.length === 0 ? (
                          <div className="text-center py-6 border border-dashed border-slate-200 rounded bg-slate-55 bg-slate-50">
                            <p className="text-xs text-slate-400 font-semibold">No hay tareas creadas para este ciclo.</p>
                          </div>
                        ) : (
                          ciclo.tareas.map((tarea) => {
                            const docSubido = tarea.entrega;
                            const isAnexoB = tarea.titulo?.toLowerCase().includes('anexo b');

                            if (docSubido) {
                              const isCalificada = docSubido.estado === 'calificada' || docSubido.estado === 'aprobado';
                              const isTarde = docSubido.estado === 'tarde' || docSubido.estado === 'rechazado';

                              return (
                                <div
                                  key={tarea.id}
                                  className="bg-white rounded border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in"
                                >
                                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                                    <div
                                      className={`p-2.5 rounded flex-shrink-0 ${
                                        isCalificada
                                          ? 'bg-slate-100 text-slate-800 border border-slate-300'
                                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                                      }`}
                                    >
                                      <FiFileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                        <span className="text-[9px] font-bold text-slate-700 uppercase bg-slate-100 border border-slate-250 px-2 py-0.5 rounded">
                                          {tarea.codigo}
                                        </span>
                                        <h4 className="font-bold text-slate-800 text-xs truncate">{tarea.titulo}</h4>
                                        <span className="text-[10px] text-slate-400 font-bold">
                                          ({tarea.puntajeMaximo} pts máx)
                                        </span>
                                      </div>
                                      
                                      <p className="text-[10px] text-slate-400 font-semibold mt-1 truncate">
                                        Archivo: <span className="text-slate-600 font-semibold">{docSubido.nombreArchivo}</span>
                                      </p>
                                      
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                        <span
                                          className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                            isCalificada
                                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                                              : isTarde
                                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                                          }`}
                                        >
                                          {isCalificada
                                            ? tarea.titulo.toLowerCase().includes('anexo f')
                                              ? 'Cumplido'
                                              : `Calificada: ${docSubido.nota} / ${tarea.puntajeMaximo}`
                                            : isTarde
                                            ? 'Entregada Tarde'
                                            : 'Pendiente de Calificar'}
                                        </span>
                                        <span className="text-[9px] text-slate-400 flex items-center space-x-1 font-semibold">
                                          <FiClock className="h-3 w-3" />
                                          <span>Subido: {new Date(docSubido.fechaEntrega || docSubido.createdAt).toLocaleDateString()}</span>
                                        </span>
                                      </div>

                                      {docSubido.comentarioDocente && (
                                        <div className="mt-2 bg-slate-50 border border-slate-200 rounded p-2.5 text-[10px] text-slate-700 max-w-xl flex items-start space-x-1.5 leading-relaxed">
                                          <FiMessageSquare className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-slate-500" />
                                          <div>
                                            <strong>Retroalimentación: </strong>
                                            <span>{docSubido.comentarioDocente}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2 self-end md:self-auto flex-shrink-0">
                                    <button
                                      onClick={() => descargarEntrega(docSubido.id, docSubido.nombreArchivo)}
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded transition flex items-center space-x-1 text-xs font-bold shadow-sm border border-slate-350"
                                      title="Descargar archivo"
                                    >
                                      <FiDownload className="h-3.5 w-3.5" />
                                      <span>Descargar</span>
                                    </button>

                                    {tarea.titulo.toLowerCase().includes('anexo f') ? (
                                      <Link
                                        to={`/docente/tareas/${tarea.id}`}
                                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-2 rounded transition flex items-center space-x-1.5 text-xs shadow-sm"
                                      >
                                        <FiActivity className="h-3.5 w-3.5" />
                                        <span>Gestionar Anexo F</span>
                                      </Link>
                                    ) : isAnexoB ? (
                                      <Link
                                        to={`/docente/tareas/${tarea.id}`}
                                        className="bg-[#ec3724] hover:bg-[#d12a1a] text-white font-bold px-3 py-2 rounded transition flex items-center space-x-1 text-xs shadow-sm"
                                      >
                                        <FiCheckCircle className="h-3.5 w-3.5" />
                                        <span>{docSubido.nota !== null ? 'Recalificar en Tarea' : 'Calificar en Tarea'}</span>
                                      </Link>
                                    ) : (
                                      <button
                                        onClick={() => abrirModalCalificar(tarea, docSubido)}
                                        className="bg-[#ec3724] hover:bg-[#d12a1a] text-white font-bold px-3 py-2 rounded transition flex items-center space-x-1 text-xs shadow-sm"
                                      >
                                        <FiCheckCircle className="h-3.5 w-3.5" />
                                        <span>{docSubido.nota !== null ? 'Recalificar' : 'Calificar'}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            } else {
                              // Tarea pendiente de subir por el estudiante
                              return (
                                <div
                                  key={tarea.id}
                                  className="bg-slate-50 rounded border border-dashed border-slate-200 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:bg-slate-50/80"
                                >
                                  <div className="flex items-start space-x-3">
                                    <div className="p-2.5 rounded bg-slate-100 text-slate-400 border border-slate-200 flex-shrink-0">
                                      <FiFile className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-200 px-2 py-0.5 rounded">
                                          {tarea.codigo}
                                        </span>
                                        <h4 className="font-bold text-slate-650 text-xs">{tarea.titulo}</h4>
                                        <span className="text-[10px] text-slate-400 font-semibold">
                                          ({tarea.puntajeMaximo} pts máx)
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-400 font-medium mt-1">
                                        El estudiante aún no ha cargado ningún archivo para esta tarea.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="self-end md:self-auto flex items-center gap-2">
                                    <span className="inline-flex items-center space-x-1 bg-slate-100 border border-slate-200 text-slate-500 text-[9px] font-bold px-2.5 py-1 rounded uppercase tracking-wide">
                                      <FiClock className="h-3 w-3" />
                                      <span>Sin Entregar</span>
                                    </span>
                                    {tarea.titulo.toLowerCase().includes('anexo f') ? (
                                      <Link
                                        to={`/docente/tareas/${tarea.id}`}
                                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded transition flex items-center space-x-1.5 text-xs shadow-sm"
                                      >
                                        <FiActivity className="h-3.5 w-3.5" />
                                        <span>Gestionar Anexo F</span>
                                      </Link>
                                    ) : isAnexoB ? (
                                      <Link
                                        to={`/docente/tareas/${tarea.id}`}
                                        className="bg-[#ec3724] hover:bg-[#d12a1a] text-white font-bold px-3 py-1.5 rounded transition flex items-center space-x-1 text-xs shadow-sm"
                                      >
                                        <FiCheckCircle className="h-3.5 w-3.5" />
                                        <span>Calificar en Tarea</span>
                                      </Link>
                                    ) : (
                                      <button
                                        onClick={() => abrirModalCalificar(tarea, null)}
                                        className="bg-[#ec3724] hover:bg-[#d12a1a] text-white font-bold px-3 py-1.5 rounded transition flex items-center space-x-1 text-xs shadow-sm"
                                      >
                                        <FiCheckCircle className="h-3.5 w-3.5" />
                                        <span>Calificar</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          })
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 border border-dashed border-slate-250 rounded bg-slate-50">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No se encontraron ciclos ni tareas asignadas.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha (Resumen de Progreso Académico) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 relative">
              <div className="absolute top-0 right-0 h-16 w-16 bg-red-500/5 rounded-full blur-xl"></div>
              
              <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center space-x-2">
                <FiActivity className="h-4 w-4 text-[#ec3724]" />
                <span>Progreso Académico</span>
              </h2>
              <p className="text-[10px] text-slate-400 mb-4 uppercase tracking-wide">
                Avance del estudiante en las tareas académicas de ciclos
              </p>

              {/* Nota Final */}
              <div className="bg-slate-800 text-white rounded-lg p-4 mb-4 shadow-sm relative overflow-hidden flex items-center justify-between">
                <div className="absolute -bottom-6 -right-6 h-20 w-20 bg-white/5 rounded-full blur-lg"></div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Nota Global Estimada</p>
                  <p className="text-2xl font-black mt-0.5">
                    {calificaciones?.notaFinal !== null && calificaciones?.notaFinal !== undefined
                      ? calificaciones.notaFinal.toFixed(2)
                      : '--'}
                  </p>
                </div>
                <div>
                  {calificaciones?.notaFinal !== null && calificaciones?.notaFinal !== undefined ? (
                    calificaciones.notaFinal >= 7 ? (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded text-xs font-bold">
                        Aprobado
                      </span>
                    ) : calificaciones.notaFinal >= 5 ? (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded text-xs font-bold">
                        En Progreso
                      </span>
                    ) : (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded text-xs font-bold">
                        Reprobado
                      </span>
                    )
                  ) : (
                    <span className="bg-white/10 text-white/70 px-3 py-1 rounded text-xs font-bold border border-white/10">
                      Sin Notas
                    </span>
                  )}
                </div>
              </div>

              {/* Ciclos */}
              <div className="space-y-3">
                {calificaciones?.ciclos ? (
                  calificaciones.ciclos.map((ciclo) => {
                    const promedio = ciclo.promedio;
                    const percent = promedio !== null && promedio !== undefined ? Math.min(100, Math.max(0, (promedio / 10) * 100)) : 0;
                    
                    const barColor =
                      promedio === null ? 'bg-slate-200' :
                      promedio >= 7 ? 'bg-emerald-500' :
                      promedio >= 5 ? 'bg-amber-500' : 'bg-rose-500';

                    const textColor =
                      promedio === null ? 'text-slate-500' :
                      promedio >= 7 ? 'text-emerald-600' :
                      promedio >= 5 ? 'text-amber-600' : 'text-rose-600';

                    return (
                      <div key={ciclo.numeroCiclo} className="border border-slate-200 rounded p-4 hover:bg-slate-50/50 transition">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-slate-800">Ciclo {ciclo.numeroCiclo}</p>
                          <p className={`text-xs font-bold ${textColor}`}>
                            Promedio: {promedio !== null && promedio !== undefined ? promedio.toFixed(2) : '--'}
                          </p>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {ciclo.tareasCalificadas} / {ciclo.totalTareas} tareas calificadas
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                          <div
                            className={`h-1 rounded-full ${barColor} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded">
                    <p className="text-xs text-slate-400">No se encontraron ciclos de tareas asignados.</p>
                  </div>
                )}
              </div>

              {/* Botón de Acción Directa */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <Link
                  to={`/docente/estudiantes/${estudiante.id}/calificaciones`}
                  className="w-full inline-flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 rounded transition shadow-sm border border-slate-200"
                >
                  <FiBookOpen className="h-4 w-4" />
                  <span>Ver Libro de Calificaciones</span>
                  <FiChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Calificación y Retroalimentación */}
        {modalAbierto && activeEntrega && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-xl max-w-lg w-full shadow-xl overflow-hidden border border-slate-200">
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div>
                  <span className="tracking-widest text-[9px] font-bold text-[#ec3724] bg-red-50 px-2 py-0.5 rounded uppercase border border-red-100">
                    {activeEntrega.codigo}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    Calificar Tarea Académica
                  </h3>
                </div>
                <button
                  onClick={cerrarModalCalificar}
                  className="text-slate-500 hover:text-slate-800 font-bold bg-slate-100 hover:bg-slate-200 h-8 w-8 rounded-full flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={guardarCalificacion}>
                <div className="p-5 space-y-4">
                  {error && (
                    <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-lg p-3 flex items-center space-x-2 text-xs font-semibold animate-in fade-in duration-200">
                      <FiAlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tarea Académica</label>
                    <p className="font-bold text-slate-800 text-xs truncate">{activeEntrega.titulo}</p>
                    {activeEntrega.entregaId ? (
                      <p className="text-[11px] text-[#ec3724] font-semibold mt-1">
                        Archivo: <span className="underline cursor-pointer font-bold" onClick={() => descargarEntrega(activeEntrega.entregaId, activeEntrega.nombreArchivo)}>{activeEntrega.nombreArchivo}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 font-semibold mt-1">
                        Archivo: <span className="font-bold">{activeEntrega.nombreArchivo}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Calificación (Máx {activeEntrega.puntajeMaximo})
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={activeEntrega.puntajeMaximo}
                          value={formNota}
                          onChange={(e) => setFormNota(e.target.value)}
                          placeholder="Ej: 9.5"
                          className="w-full p-2.5 pr-12 border border-slate-350 bg-white rounded focus:border-[#ec3724] focus:outline-none focus:ring-1 focus:ring-[#ec3724] text-slate-800 font-extrabold text-xs transition shadow-sm"
                          required
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          / {activeEntrega.puntajeMaximo}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Retroalimentación / Comentarios
                    </label>
                    <textarea
                      rows="4"
                      value={formComentario}
                      onChange={(e) => setFormComentario(e.target.value)}
                      placeholder="Escribe observaciones o comentarios de mejora para el estudiante..."
                      className="w-full p-2.5 border border-slate-350 bg-white rounded focus:border-[#ec3724] focus:outline-none focus:ring-1 focus:ring-[#ec3724] text-xs text-slate-700 placeholder-slate-400 transition shadow-sm leading-relaxed"
                    ></textarea>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={cerrarModalCalificar}
                    className="px-4 py-2 border border-slate-200 rounded hover:bg-slate-100 font-bold text-slate-500 transition text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={cargandoRevision}
                    className="px-5 py-2 rounded bg-[#ec3724] hover:bg-[#d12a1a] text-white font-bold shadow transition text-xs flex items-center disabled:opacity-50"
                  >
                    {cargandoRevision ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Guardando...
                      </span>
                    ) : (
                      'Guardar Nota'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocenteDetalleEstudiante;
