import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FiDownload, 
  FiEye, 
  FiX, 
  FiArrowLeft, 
  FiFileText, 
  FiCheckCircle, 
  FiAlertCircle 
} from 'react-icons/fi';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

const DetalleTarea = () => {
  const { tareaId } = useParams();
  const [data, setData] = useState({ tarea: null, entregas: [], sinEntregar: [] });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // States for split-screen grading workspace
  const [activeEntrega, setActiveEntrega] = useState(null);
  const [formNota, setFormNota] = useState('');
  const [formComentario, setFormComentario] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewCargando, setPreviewCargando] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [cargandoGuardado, setCargandoGuardado] = useState(false);

  const cargar = async () => {
    try {
      setCargando(true);
      setError('');
      const response = await api.get(`/docente/tareas/${tareaId}/entregas`);
      setData(response.data.data);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo cargar el detalle de la tarea.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [tareaId]);

  // Clean up object URL when component unmounts or preview url changes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const cierre = useMemo(
    () => (data.tarea?.fechaCierre ? new Date(data.tarea.fechaCierre) : null),
    [data.tarea?.fechaCierre]
  );

  const descargarBlob = (blob, nombre) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const iniciarCalificacion = async (entrega) => {
    setActiveEntrega(entrega);
    setFormNota(entrega.nota !== null ? String(entrega.nota) : '');
    setFormComentario(entrega.comentarioDocente || '');
    setPreviewUrl('');
    setPreviewCargando(true);
    setPreviewError('');

    try {
      const response = await api.get(`/docente/entregas/${entrega.id}/preview`, {
        responseType: 'blob',
      });
      const contentType = response.headers['content-type'] || '';
      const blob = new Blob([response.data], { type: contentType });
      
      if (contentType.includes('pdf')) {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } else {
        setPreviewUrl('');
      }
    } catch (err) {
      setPreviewError('No se pudo cargar la vista previa del archivo.');
    } finally {
      setPreviewCargando(false);
    }
  };

  const cerrarWorkspace = () => {
    setActiveEntrega(null);
    setFormNota('');
    setFormComentario('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  const enviarCalificacion = async () => {
    if (!activeEntrega) return;
    try {
      setCargandoGuardado(true);
      setError('');
      
      const notaValor = parseFloat(formNota);
      if (isNaN(notaValor) || notaValor < 0 || notaValor > (data.tarea?.puntajeMaximo || 10)) {
        alert(`La nota debe ser un número válido entre 0 y ${data.tarea?.puntajeMaximo || 10}.`);
        setCargandoGuardado(false);
        return;
      }

      await api.put(`/docente/entregas/${activeEntrega.id}/calificar`, {
        nota: notaValor,
        comentario: formComentario,
      });

      cerrarWorkspace();
      await cargar();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo guardar la calificación.');
    } finally {
      setCargandoGuardado(false);
    }
  };

  const descargarEntrega = async (entrega) => {
    try {
      const response = await api.get(`/docente/entregas/${entrega.id}/descargar`, {
        responseType: 'blob',
      });
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      descargarBlob(blob, entrega.nombreArchivo || `entrega-${entrega.id}`);
    } catch (err) {
      alert('No se pudo descargar el archivo.');
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />
      
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Enlace de navegación trasera */}
        <div className="flex items-center justify-between">
          <Link
            to="/docente/ciclos"
            id="link-volver-ciclos"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Volver a Ciclos y Tareas</span>
          </Link>
        </div>

        {/* Tarjeta de Encabezado Premium */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 transition-all hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <span className="tracking-widest text-xs font-black text-indigo-600 bg-indigo-50/80 px-3 py-1.5 rounded-lg uppercase">
              {data.tarea?.codigo || 'TAREA'}
            </span>
            {data.tarea?.estadoVentana === 'Abierta' ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Abierta
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Cerrada
              </span>
            )}
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 leading-tight">
            {data.tarea?.titulo || 'Cargando tarea...'}
          </h1>
          {data.tarea?.descripcion && (
            <p className="text-slate-500 text-xs font-semibold mt-3 max-w-4xl leading-relaxed bg-slate-50/50 p-3 rounded-2xl border border-slate-100/80 whitespace-pre-wrap">
              <span className="font-bold text-slate-700 block mb-1">Instrucciones de la tarea:</span>
              {data.tarea.descripcion}
            </p>
          )}
          
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100 transition-all hover:bg-slate-50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Puntaje máximo</p>
              <p className="font-extrabold text-slate-900 text-lg mt-1">
                {data.tarea?.puntajeMaximo ? Number(data.tarea.puntajeMaximo).toFixed(2) : '10.00'} pts
              </p>
            </div>
            <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100 transition-all hover:bg-slate-50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Apertura</p>
              <p className="font-bold text-slate-700 text-xs mt-1.5">
                {data.tarea?.fechaApertura ? new Date(data.tarea.fechaApertura).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '--'}
              </p>
            </div>
            <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100 transition-all hover:bg-slate-50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cierre</p>
              <p className="font-bold text-slate-700 text-xs mt-1.5">
                {data.tarea?.fechaCierre ? new Date(data.tarea.fechaCierre).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '--'}
              </p>
            </div>
            <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100 transition-all hover:bg-slate-50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Entregas</p>
              <p className="font-extrabold text-indigo-600 text-lg mt-1">
                {data.entregas?.length || 0} <span className="text-[10px] font-bold text-slate-400 uppercase">recibidas</span>
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tabla de Entregas Recibidas */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900">Entregas recibidas</h2>
          </div>

          {cargando ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-3">
              <svg className="animate-spin h-7 w-7 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs font-bold uppercase tracking-wider">Cargando entregas...</p>
            </div>
          ) : !data.entregas || data.entregas.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <FiFileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">Aún no hay entregas para esta tarea.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4">Estudiante</th>
                    <th className="px-6 py-4">Archivo</th>
                    <th className="px-6 py-4">Fecha entrega</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Calificación</th>
                    <th className="px-6 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.entregas.map((e) => {
                    const fueraTiempo = cierre ? new Date(e.fechaEntrega) > cierre : false;
                    return (
                      <tr key={e.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-black text-xs flex items-center justify-center shadow-sm">
                              {getInitials(e.inscripcion?.estudiante?.nombres)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{e.inscripcion?.estudiante?.nombres || 'Sin nombre'}</p>
                              <p className="text-[10px] font-medium text-slate-400 mt-0.5">{e.inscripcion?.estudiante?.usuario?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 max-w-[200px] truncate text-slate-600">
                            <FiFileText className="text-slate-400 w-4 h-4 flex-shrink-0" />
                            <span className="truncate font-semibold text-xs" title={e.nombreArchivo}>
                              {e.nombreArchivo}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-500">
                          {new Date(e.fechaEntrega).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            fueraTiempo 
                              ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {fueraTiempo ? 'Tardía' : 'A tiempo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {e.nota !== null ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <FiCheckCircle className="w-3.5 h-3.5 text-indigo-500" />
                              {Number(e.nota).toFixed(2)} / {Number(data.tarea?.puntajeMaximo || 10).toFixed(2)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              <FiAlertCircle className="w-3.5 h-3.5 text-slate-400" />
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => iniciarCalificacion(e)}
                            id={`btn-calificar-${e.id}`}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm ${
                              e.nota !== null
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-100 hover:shadow'
                            }`}
                          >
                            {e.nota !== null ? 'Re-calificar' : 'Calificar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Estudiantes Sin Entregar */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <div className="flex items-center gap-2 mb-4">
            <FiAlertCircle className="text-slate-400 w-5 h-5" />
            <h3 className="text-base font-black text-slate-900">Estudiantes sin entrega registrada</h3>
          </div>
          
          {data.sinEntregar?.length ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {data.sinEntregar.map((i) => (
                <div key={i.id} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {getInitials(i.estudiante?.nombres)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-800 truncate" title={i.estudiante?.nombres}>
                      {i.estudiante?.nombres || 'Sin nombre'}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 truncate mt-0.5" title={i.estudiante?.usuario?.email}>
                      {i.estudiante?.usuario?.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              ¡Excelente! Todos los estudiantes asignados ya registraron su entrega.
            </p>
          )}
        </div>
      </div>

      {/* MODAL SPEEDGRADER SPLIT-SCREEN WORKSPACE */}
      {activeEntrega && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 md:p-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-[96vw] h-[92vh] flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* PANEL IZQUIERDO: VISOR DE DOCUMENTO (65%) */}
            <div className="flex-1 bg-slate-900 flex flex-col relative h-[50vh] md:h-full">
              {/* Header del Visor */}
              <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-white">
                <div className="flex items-center gap-3 min-w-0">
                  <FiFileText className="text-indigo-400 w-5 h-5 flex-shrink-0" />
                  <span className="font-bold text-sm truncate" title={activeEntrega.nombreArchivo}>
                    {activeEntrega.nombreArchivo}
                  </span>
                </div>
                <button
                  onClick={() => descargarEntrega(activeEntrega)}
                  id="btn-descargar-archivo"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
                >
                  <FiDownload className="w-3.5 h-3.5" />
                  Descargar
                </button>
              </div>

              {/* Contenido del Visor */}
              <div className="flex-1 w-full h-full relative flex items-center justify-center bg-slate-950">
                {previewCargando ? (
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-xs font-bold tracking-wider uppercase">Cargando vista previa...</p>
                  </div>
                ) : previewError ? (
                  <div className="text-center p-6 text-slate-400">
                    <FiAlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-300 mb-1">{previewError}</p>
                    <p className="text-xs text-slate-500 mb-4">Puedes descargar el archivo original para revisarlo localmente.</p>
                    <button
                      onClick={() => descargarEntrega(activeEntrega)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
                    >
                      <FiDownload /> Descargar archivo
                    </button>
                  </div>
                ) : previewUrl ? (
                  <iframe title="preview" src={previewUrl} className="w-full h-full border-0" />
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <FiFileText className="w-16 h-16 text-slate-700 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-300 mb-1">La vista previa no es compatible con este formato</p>
                    <p className="text-xs text-slate-500 mb-4">Usa el botón de abajo para descargar y revisar el archivo.</p>
                    <button
                      onClick={() => descargarEntrega(activeEntrega)}
                      className="px-4 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors inline-flex items-center gap-2"
                    >
                      <FiDownload /> Descargar archivo
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* PANEL DERECHO: PANEL DE EVALUACIÓN (35%) */}
            <div className="w-full md:w-[35%] bg-slate-50 flex flex-col justify-between h-[42vh] md:h-full border-t md:border-t-0 md:border-l border-slate-100">
              
              {/* Cabecera del Panel Lateral */}
              <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center shadow-sm flex-shrink-0">
                    {getInitials(activeEntrega.inscripcion?.estudiante?.nombres)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 truncate leading-snug">
                      {activeEntrega.inscripcion?.estudiante?.nombres || 'Sin nombre'}
                    </h4>
                    <p className="text-[10px] font-medium text-slate-400 truncate mt-0.5">
                      {activeEntrega.inscripcion?.estudiante?.usuario?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={cerrarWorkspace}
                  id="btn-cerrar-x"
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              {/* Cuerpo del Formulario */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Información de la Asignación */}
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-widest inline-block">
                    Ciclo {data.tarea?.numeroCiclo || '--'}
                  </span>
                  <div className="mt-2.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tarea</p>
                    <h5 className="font-extrabold text-slate-900 text-xs leading-snug mt-0.5">
                      {data.tarea?.titulo || '--'}
                    </h5>
                  </div>
                </div>

                {/* Plazos de la Tarea */}
                <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-sm">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plazos de la Tarea</h5>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Apertura</span>
                    <span className="font-bold text-slate-800 text-[11px]">
                      {data.tarea?.fechaApertura ? new Date(data.tarea.fechaApertura).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '--'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Cierre</span>
                    <span className="font-bold text-slate-800 text-[11px]">
                      {data.tarea?.fechaCierre ? new Date(data.tarea.fechaCierre).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '--'}
                    </span>
                  </div>
                </div>

                {/* Instrucciones de la Tarea */}
                {data.tarea?.descripcion && (
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2 shadow-sm">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instrucciones de la tarea</h5>
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {data.tarea.descripcion}
                    </p>
                  </div>
                )}

                {/* Metadata de la entrega */}
                <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-sm">
                  <h5 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Detalles del envío</h5>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Puntualidad</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                      (cierre ? new Date(activeEntrega.fechaEntrega) > cierre : false)
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {(cierre ? new Date(activeEntrega.fechaEntrega) > cierre : false) ? 'Tardía' : 'A tiempo'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Enviado el</span>
                    <span className="font-bold text-indigo-600 text-[11px] bg-indigo-50/80 px-2 py-0.5 rounded">
                      {new Date(activeEntrega.fechaEntrega).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'medium' })}
                    </span>
                  </div>
                </div>

                {/* Formulario principal */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Calificación
                    </label>
                    <div className="relative rounded-2xl shadow-sm">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max={data.tarea?.puntajeMaximo || 10}
                        id="input-calificacion-nota"
                        className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 font-extrabold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm placeholder-slate-400"
                        placeholder="0.00"
                        value={formNota}
                        onChange={(ev) => setFormNota(ev.target.value)}
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                        <span className="text-xs font-bold text-slate-400">
                          / {Number(data.tarea?.puntajeMaximo || 10).toFixed(2)} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Retroalimentación
                    </label>
                    <textarea
                      rows={5}
                      id="input-calificacion-comentario"
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 font-semibold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm placeholder-slate-400"
                      placeholder="Escribe la retroalimentación para el estudiante..."
                      value={formComentario}
                      onChange={(ev) => setFormComentario(ev.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Footer del Panel Lateral */}
              <div className="px-6 py-5 bg-white border-t border-slate-100 flex items-center gap-3">
                <button
                  onClick={cerrarWorkspace}
                  id="btn-cancelar-calificacion"
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors font-bold text-xs text-center"
                >
                  Cancelar
                </button>
                <button
                  onClick={enviarCalificacion}
                  disabled={cargandoGuardado}
                  id="btn-guardar-calificacion"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-colors shadow-md hover:shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cargandoGuardado ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar</span>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleTarea;

