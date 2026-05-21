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
      const response = await api.put(`/docente/entregas/${activeEntrega.entregaId}/calificar`, {
        nota: notaValor,
        comentario: formComentario,
      });

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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Enlace atrás */}
        <div className="mb-6">
          <Link
            to="/docente/estudiantes"
            className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 font-bold transition"
          >
            <FiArrowLeft className="h-5 w-5" />
            <span>Volver a la lista de estudiantes</span>
          </Link>
        </div>

        {mensajeOperacion.texto && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-center space-x-2 text-sm shadow-sm transition-all duration-300 ${
              mensajeOperacion.tipo === 'success'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {mensajeOperacion.tipo === 'success' ? (
              <FiCheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="font-semibold">{mensajeOperacion.texto}</span>
          </div>
        )}

        {/* Ficha Informativa del Alumno */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 md:p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white h-16 w-16 rounded-2xl flex items-center justify-center font-extrabold shadow-lg">
                <FiUser className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  {estudiante.nombres || 'Sin Completar Nombre'}
                </h1>
                <p className="text-gray-500 font-medium">
                  Matrícula activa en el sistema de prácticas preprofesionales
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold ${
                  inscripcion?.tipoPractica === 'comunitaria'
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                }`}
              >
                Prácticas {inscripcion?.tipoPractica === 'comunitaria' ? 'Comunales' : 'Laborales'}
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                {getEstadoProcesoTexto(estudiante.estadoProceso)}
              </span>
              <Link
                to={`/docente/estudiantes/${estudiante.id}/calificaciones`}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition duration-200"
              >
                <FiFileText className="h-4 w-4" />
                <span>Libro de Calificaciones</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-gray-100 text-sm">
            <div>
              <p className="text-gray-400 font-semibold mb-1">Código de Estudiante</p>
              <p className="font-bold text-gray-800">{estudiante.codigo || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 font-semibold mb-1">Correo Institucional</p>
              <p className="font-bold text-gray-800">{estudiante.usuario?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 font-semibold mb-1">Semestre</p>
              <p className="font-bold text-gray-800">{estudiante.semestre}° Semestre</p>
            </div>
            <div>
              <p className="text-gray-400 font-semibold mb-1">Empresa / Convenio</p>
              <p className="font-bold text-indigo-600 flex items-center space-x-1">
                <FiBriefcase className="h-4 w-4" />
                <span>{inscripcion?.convenio?.nombreEmpresa || 'No definido'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Panel de Entregables y Progreso en Formato Rejilla */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Columna Izquierda (Tareas y Entregables por Ciclo) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                  <span>📋 Tareas y Entregables por Ciclo</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Revisa y califica los archivos y tareas académicas subidas por el estudiante en cada uno de los 3 ciclos
                </p>
              </div>

              <div className="p-6 space-y-8">
                {calificaciones?.ciclos ? (
                  calificaciones.ciclos.map((ciclo) => (
                    <div key={ciclo.numeroCiclo} className="space-y-4">
                      <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest border-b pb-2 flex items-center justify-between">
                        <span>Ciclo {ciclo.numeroCiclo}</span>
                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-black">
                          Promedio: {ciclo.promedio !== null && ciclo.promedio !== undefined ? ciclo.promedio.toFixed(2) : '--'}
                        </span>
                      </h3>

                      <div className="grid grid-cols-1 gap-4">
                        {ciclo.tareas?.length === 0 ? (
                          <div className="text-center py-6 border border-dashed rounded-xl bg-gray-50/30">
                            <p className="text-xs text-gray-400 font-semibold">No hay tareas creadas para este ciclo.</p>
                          </div>
                        ) : (
                          ciclo.tareas.map((tarea) => {
                            const docSubido = tarea.entrega;

                            if (docSubido) {
                              const isPendiente = docSubido.estado === 'pendiente';
                              const isCalificada = docSubido.estado === 'calificada' || docSubido.estado === 'aprobado';
                              const isTarde = docSubido.estado === 'tarde' || docSubido.estado === 'rechazado';

                              return (
                                <div
                                  key={tarea.id}
                                  className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:border-gray-200 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in"
                                >
                                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                                    <div
                                      className={`p-2.5 rounded-xl flex-shrink-0 ${
                                        isCalificada
                                          ? 'bg-green-50 text-green-600 border border-green-200'
                                          : isTarde
                                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                          : 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                                      }`}
                                    >
                                      <FiFileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                        <span className="text-xs font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                                          {tarea.codigo}
                                        </span>
                                        <h4 className="font-bold text-gray-800 text-sm truncate">{tarea.titulo}</h4>
                                        <span className="text-xs text-gray-400 font-bold">
                                          ({tarea.puntajeMaximo} pts máx)
                                        </span>
                                      </div>
                                      
                                      <p className="text-xs text-gray-400 font-medium mt-1 truncate">
                                        Archivo: <span className="text-gray-600 font-semibold">{docSubido.nombreArchivo}</span>
                                      </p>
                                      
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                        <span
                                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                            isCalificada
                                              ? 'bg-green-50 text-green-700 border-green-200'
                                              : isTarde
                                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                          }`}
                                        >
                                          {isCalificada
                                            ? `Calificada: ${docSubido.nota} / ${tarea.puntajeMaximo}`
                                            : isTarde
                                            ? 'Entregada Tarde'
                                            : 'Pendiente de Calificar'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 flex items-center space-x-1 font-semibold">
                                          <FiClock className="h-3 w-3" />
                                          <span>Subido: {new Date(docSubido.fechaEntrega || docSubido.createdAt).toLocaleDateString()}</span>
                                        </span>
                                      </div>

                                      {docSubido.comentarioDocente && (
                                        <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] text-slate-700 max-w-xl flex items-start space-x-1.5 leading-relaxed">
                                          <FiMessageSquare className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-indigo-500" />
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
                                      className="bg-gray-50 hover:bg-gray-100 text-gray-700 p-2.5 rounded-xl transition flex items-center space-x-1 text-xs font-bold shadow-sm border border-gray-200"
                                      title="Descargar archivo"
                                    >
                                      <FiDownload className="h-3.5 w-3.5" />
                                      <span>Descargar</span>
                                    </button>

                                    <button
                                      onClick={() => abrirModalCalificar(tarea, docSubido)}
                                      className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1 text-xs shadow-md shadow-indigo-600/10 hover:shadow-lg"
                                    >
                                      <FiCheckCircle className="h-3.5 w-3.5" />
                                      <span>{docSubido.nota !== null ? 'Recalificar' : 'Calificar'}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            } else {
                              // Tarea pendiente de subir por el estudiante
                              return (
                                <div
                                  key={tarea.id}
                                  className="bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:bg-gray-50"
                                >
                                  <div className="flex items-start space-x-3">
                                    <div className="p-2.5 rounded-xl bg-gray-100 text-gray-400 border border-gray-200 flex-shrink-0">
                                      <FiFile className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                        <span className="text-xs font-bold text-gray-400 uppercase bg-gray-200/50 px-2 py-0.5 rounded">
                                          {tarea.codigo}
                                        </span>
                                        <h4 className="font-bold text-gray-500 text-sm">{tarea.titulo}</h4>
                                        <span className="text-xs text-gray-400 font-medium">
                                          ({tarea.puntajeMaximo} pts máx)
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-400 font-medium mt-1">
                                        El estudiante aún no ha cargado ningún archivo para esta tarea.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="self-end md:self-auto">
                                    <span className="inline-flex items-center space-x-1 bg-gray-100 border text-gray-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                                      <FiClock className="h-3 w-3" />
                                      <span>Sin Entregar</span>
                                    </span>
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
                  <div className="text-center py-12 border border-dashed rounded-2xl bg-gray-50/50">
                    <p className="text-sm text-gray-400 font-bold">No se encontraron ciclos ni tareas asignadas.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha (Resumen de Progreso Académico) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden p-6 relative">
              <div className="absolute top-0 right-0 h-16 w-16 bg-indigo-500/5 rounded-full blur-xl"></div>
              
              <h2 className="text-lg font-black text-gray-800 mb-1 flex items-center space-x-2">
                <FiActivity className="h-5 w-5 text-indigo-600" />
                <span>Progreso Académico</span>
              </h2>
              <p className="text-xs text-gray-400 mb-6">
                Avance del estudiante en las tareas académicas de ciclos
              </p>

              {/* Nota Final */}
              <div className="bg-gradient-to-tr from-slate-800 to-indigo-900 text-white rounded-xl p-5 mb-6 shadow-md relative overflow-hidden flex items-center justify-between">
                <div className="absolute -bottom-6 -right-6 h-20 w-20 bg-white/5 rounded-full blur-lg"></div>
                <div>
                  <p className="text-[10px] uppercase font-black text-indigo-200 tracking-wider">Nota Global Estimada</p>
                  <p className="text-3xl font-black mt-1">
                    {calificaciones?.notaFinal !== null && calificaciones?.notaFinal !== undefined
                      ? calificaciones.notaFinal.toFixed(2)
                      : '--'}
                  </p>
                </div>
                <div>
                  {calificaciones?.notaFinal !== null && calificaciones?.notaFinal !== undefined ? (
                    calificaciones.notaFinal >= 7 ? (
                      <span className="bg-green-500/20 text-green-300 border border-green-500/30 px-3 py-1 rounded-full text-xs font-bold">
                        Aprobado
                      </span>
                    ) : calificaciones.notaFinal >= 5 ? (
                      <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-bold">
                        En Progreso
                      </span>
                    ) : (
                      <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold">
                        Reprobado
                      </span>
                    )
                  ) : (
                    <span className="bg-white/10 text-white/70 px-3 py-1 rounded-full text-xs font-bold">
                      Sin Notas
                    </span>
                  )}
                </div>
              </div>

              {/* Ciclos */}
              <div className="space-y-4">
                {calificaciones?.ciclos ? (
                  calificaciones.ciclos.map((ciclo) => {
                    const promedio = ciclo.promedio;
                    const percent = promedio !== null && promedio !== undefined ? Math.min(100, Math.max(0, (promedio / 10) * 100)) : 0;
                    
                    const barColor =
                      promedio === null ? 'bg-gray-200' :
                      promedio >= 7 ? 'bg-emerald-500' :
                      promedio >= 5 ? 'bg-amber-500' : 'bg-rose-500';

                    const textColor =
                      promedio === null ? 'text-gray-500' :
                      promedio >= 7 ? 'text-emerald-600' :
                      promedio >= 5 ? 'text-amber-600' : 'text-rose-600';

                    return (
                      <div key={ciclo.numeroCiclo} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50/50 transition">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-black text-gray-800">Ciclo {ciclo.numeroCiclo}</p>
                          <p className={`text-xs font-bold ${textColor}`}>
                            Promedio: {promedio !== null && promedio !== undefined ? promedio.toFixed(2) : '--'}
                          </p>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] text-gray-400 font-semibold">
                            {ciclo.tareasCalificadas} / {ciclo.totalTareas} tareas calificadas
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${barColor} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 border border-dashed rounded-xl">
                    <p className="text-xs text-gray-400">No se encontraron ciclos de tareas asignados.</p>
                  </div>
                )}
              </div>

              {/* Botón de Acción Directa */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <Link
                  to={`/docente/estudiantes/${estudiante.id}/calificaciones`}
                  className="w-full inline-flex items-center justify-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-3 rounded-xl transition shadow-sm border border-indigo-100"
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-scale-up border border-gray-100">
              <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                <div>
                  <span className="tracking-widest text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase">
                    {activeEntrega.codigo}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    Calificar Tarea Académica
                  </h3>
                </div>
                <button
                  onClick={cerrarModalCalificar}
                  className="text-slate-400 hover:text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 h-8 w-8 rounded-full flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={guardarCalificacion}>
                <div className="p-6 space-y-5">
                  {error && (
                    <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-xl p-4 flex items-center space-x-2 text-xs font-semibold">
                      <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Tarea Académica</label>
                    <p className="font-extrabold text-slate-800 text-sm leading-tight truncate">{activeEntrega.titulo}</p>
                    <p className="text-xs text-indigo-600 font-semibold mt-1">
                      Archivo: <span className="underline cursor-pointer font-bold" onClick={() => descargarEntrega(activeEntrega.entregaId, activeEntrega.nombreArchivo)}>{activeEntrega.nombreArchivo}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
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
                          className="w-full p-4 pr-12 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 font-black text-sm focus:outline-none transition shadow-sm"
                          required
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                          / {activeEntrega.puntajeMaximo}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                      Retroalimentación / Comentarios
                    </label>
                    <textarea
                      rows="4"
                      value={formComentario}
                      onChange={(e) => setFormComentario(e.target.value)}
                      placeholder="Escribe observaciones, comentarios de mejora o felicitaciones para el estudiante..."
                      className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 placeholder-slate-400 text-xs focus:outline-none transition shadow-sm leading-relaxed"
                    ></textarea>
                  </div>
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={cerrarModalCalificar}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-100 font-extrabold text-slate-500 transition text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={cargandoRevision}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/10 hover:shadow-lg transition text-xs flex items-center disabled:opacity-50"
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
