import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FiDownload, 
  FiEye, 
  FiX, 
  FiArrowLeft, 
  FiFileText, 
  FiCheckCircle, 
  FiAlertCircle,
  FiUpload
} from 'react-icons/fi';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

const DetalleTarea = () => {
  const { tareaId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
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
  const [mensajeExito, setMensajeExito] = useState('');

  // States for Anexo B sub-tasks
  const [formNotaInterno, setFormNotaInterno] = useState('');
  const [formComentarioInterno, setFormComentarioInterno] = useState('');
  const [formNotaExterno, setFormNotaExterno] = useState('');
  const [formComentarioExterno, setFormComentarioExterno] = useState('');
  const [subTareaPreview, setSubTareaPreview] = useState('interno');

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

  const cargarPreviewSubtarea = async (entrega, subTarea) => {
    setPreviewUrl('');
    setPreviewCargando(true);
    setPreviewError('');

    try {
      const response = await api.get(`/docente/entregas/${entrega.id}/preview?subTarea=${subTarea}`, {
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
      setPreviewError('No se pudo cargar la vista previa de esta evaluación.');
    } finally {
      setPreviewCargando(false);
    }
  };

  const iniciarCalificacion = async (entrega) => {
    setActiveEntrega(entrega);
    setFormNota(entrega.nota !== null && entrega.nota !== undefined ? String(entrega.nota) : '');
    setFormComentario(entrega.comentarioDocente || '');
    
    const isAnexoB = data.tarea?.titulo?.toLowerCase().includes('anexo b');
    if (isAnexoB) {
      setFormNotaInterno(entrega.notaInterno !== null && entrega.notaInterno !== undefined ? String(entrega.notaInterno) : '');
      setFormComentarioInterno(entrega.comentarioInterno || '');
      setFormNotaExterno(entrega.notaExterno !== null && entrega.notaExterno !== undefined ? String(entrega.notaExterno) : '');
      setFormComentarioExterno(entrega.comentarioExterno || '');
      setSubTareaPreview('interno');
    }

    if (String(entrega.id).startsWith('temp-')) {
      setPreviewUrl('');
      setPreviewCargando(false);
      setPreviewError('El estudiante no ha registrado ninguna entrega para esta tarea.');
      return;
    }
    
    if (isAnexoB) {
      const defaultSub = entrega.nombreArchivoInterno ? 'interno' : 'externo';
      setSubTareaPreview(defaultSub);
      await cargarPreviewSubtarea(entrega, defaultSub);
    } else {
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
    }
  };

  const cerrarWorkspace = () => {
    setActiveEntrega(null);
    setFormNota('');
    setFormComentario('');
    setFormNotaInterno('');
    setFormComentarioInterno('');
    setFormNotaExterno('');
    setFormComentarioExterno('');
    setMensajeExito('');
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
      setMensajeExito('');
      
      const cleanNota = String(formNota).replace(',', '.');
      const notaValor = parseFloat(cleanNota);
      if (isNaN(notaValor) || notaValor < 0 || notaValor > (data.tarea?.puntajeMaximo || 10)) {
        setError(`La nota debe ser un número válido entre 0 y ${data.tarea?.puntajeMaximo || 10}.`);
        setCargandoGuardado(false);
        return;
      }

      const activeId = activeEntrega.id;

      if (String(activeEntrega.id).startsWith('temp-')) {
        await api.post(`/docente/tareas/${tareaId}/estudiantes/${activeEntrega.inscripcionId}/calificar-sin-entrega`, {
          nota: notaValor,
          comentario: formComentario,
        });
      } else {
        await api.put(`/docente/entregas/${activeEntrega.id}/calificar`, {
          nota: notaValor,
          comentario: formComentario,
        });
      }

      // Recargar listados generales
      const response = await api.get(`/docente/tareas/${tareaId}/entregas`);
      setData(response.data.data);
      
      // Buscar entrega actualizada para refrescar datos y promedios en pantalla
      let updatedEntrega = null;
      if (String(activeId).startsWith('temp-')) {
        updatedEntrega = response.data.data.entregas.find(e => e.inscripcionId === activeEntrega.inscripcionId);
      } else {
        updatedEntrega = response.data.data.entregas.find(e => e.id === activeId);
      }

      if (updatedEntrega) {
        setActiveEntrega(updatedEntrega);
        setFormNota(updatedEntrega.nota !== null ? String(updatedEntrega.nota) : '');
        setFormComentario(updatedEntrega.comentarioDocente || '');
      } else {
        cerrarWorkspace();
      }

      setMensajeExito('Calificación asignada con éxito ✓');
      setTimeout(() => {
        setMensajeExito('');
      }, 4000);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo guardar la calificación.');
    } finally {
      setCargandoGuardado(false);
    }
  };

  const enviarCalificacionSubTarea = async (subTarea) => {
    if (!activeEntrega) return;
    try {
      setCargandoGuardado(true);
      setError('');
      setMensajeExito('');
      
      const notaStr = subTarea === 'interno' ? formNotaInterno : formNotaExterno;
      const comentarioStr = subTarea === 'interno' ? formComentarioInterno : formComentarioExterno;

      const cleanNota = String(notaStr).replace(',', '.');
      const notaValor = parseFloat(cleanNota);
      if (isNaN(notaValor) || notaValor < 0 || notaValor > (data.tarea?.puntajeMaximo || 10)) {
        setError(`La nota debe ser un número válido entre 0 y ${data.tarea?.puntajeMaximo || 10}.`);
        setCargandoGuardado(false);
        return;
      }

      if (String(activeEntrega.id).startsWith('temp-')) {
        await api.post(`/docente/tareas/${tareaId}/estudiantes/${activeEntrega.inscripcionId}/calificar-sin-entrega`, {
          nota: notaValor,
          comentario: comentarioStr,
          subTarea,
        });
        
        // Recargar para que ahora exista la entrega real en la BD
        const response = await api.get(`/docente/tareas/${tareaId}/entregas`);
        setData(response.data.data);
        
        const updatedEntrega = response.data.data.entregas.find(e => e.inscripcionId === activeEntrega.inscripcionId);
        if (updatedEntrega) {
          setActiveEntrega(updatedEntrega);
          setFormNota(updatedEntrega.nota !== null ? String(updatedEntrega.nota) : '');
          setFormComentario(updatedEntrega.comentarioDocente || '');
          setFormNotaInterno(updatedEntrega.notaInterno !== null ? String(updatedEntrega.notaInterno) : '');
          setFormComentarioInterno(updatedEntrega.comentarioInterno || '');
          setFormNotaExterno(updatedEntrega.notaExterno !== null ? String(updatedEntrega.notaExterno) : '');
          setFormComentarioExterno(updatedEntrega.comentarioExterno || '');
        } else {
          cerrarWorkspace();
        }
      } else {
        await api.put(`/docente/entregas/${activeEntrega.id}/calificar`, {
          nota: notaValor,
          comentario: comentarioStr,
          subTarea,
        });

        const activeId = activeEntrega.id;
        const response = await api.get(`/docente/tareas/${tareaId}/entregas`);
        setData(response.data.data);
        
        const updatedEntrega = response.data.data.entregas.find(e => e.id === activeId);
        if (updatedEntrega) {
          setActiveEntrega(updatedEntrega);
          setFormNota(updatedEntrega.nota !== null ? String(updatedEntrega.nota) : '');
          setFormComentario(updatedEntrega.comentarioDocente || '');
          setFormNotaInterno(updatedEntrega.notaInterno !== null ? String(updatedEntrega.notaInterno) : '');
          setFormComentarioInterno(updatedEntrega.comentarioInterno || '');
          setFormNotaExterno(updatedEntrega.notaExterno !== null ? String(updatedEntrega.notaExterno) : '');
          setFormComentarioExterno(updatedEntrega.comentarioExterno || '');
        } else {
          cerrarWorkspace();
        }
      }
      setMensajeExito(`Calificación de Tutor ${subTarea === 'interno' ? 'Interno' : 'Externo'} guardada con éxito ✓`);
      setTimeout(() => {
        setMensajeExito('');
      }, 4000);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo guardar la calificación.');
    } finally {
      setCargandoGuardado(false);
    }
  };

  const descargarEntrega = async (entrega, subTarea = null) => {
    try {
      let url = `/docente/entregas/${entrega.id}/descargar`;
      if (subTarea) {
        url += `?subTarea=${subTarea}`;
      }
      const response = await api.get(url, {
        responseType: 'blob',
      });
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const nombre = subTarea 
        ? (subTarea === 'interno' ? entrega.nombreArchivoInterno : entrega.nombreArchivoExterno)
        : entrega.nombreArchivo;
      descargarBlob(blob, nombre || `entrega-${entrega.id}`);
    } catch (err) {
      setError('No se pudo descargar el archivo.');
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Enlace de navegación trasera */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (location.state?.from) {
                navigate(location.state.from);
              } else {
                navigate('/docente/ciclos');
              }
            }}
            id="link-volver-ciclos"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <FiArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Volver</span>
          </button>
        </div>

        {/* Tarjeta de Encabezado Premium */}
        <div className="bg-white rounded-xl border-l-4 border-l-[#ec3724] border-t border-r border-b border-slate-200 shadow-sm p-6 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <span className="tracking-widest text-xs font-bold text-[#ec3724] bg-red-50 px-2.5 py-1 rounded uppercase">
              {data.tarea?.codigo || 'TAREA'}
            </span>
            {data.tarea?.estadoVentana === 'Abierta' ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded uppercase tracking-wider border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Abierta
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded uppercase tracking-wider border border-slate-200">
                Cerrada
              </span>
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            {data.tarea?.titulo || 'Cargando tarea...'}
          </h1>
          {data.tarea?.descripcion && (
            <div className="text-slate-600 text-xs mt-3 max-w-4xl leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
              <span className="font-bold text-slate-800 block mb-1">Instrucciones de la tarea:</span>
              {data.tarea.descripcion}
            </div>
          )}
          
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 transition-all">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Puntaje máximo</p>
              <p className="font-extrabold text-slate-900 text-base mt-1">
                {data.tarea?.puntajeMaximo ? Number(data.tarea.puntajeMaximo).toFixed(2) : '10.00'} pts
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 transition-all">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Apertura</p>
              <p className="font-bold text-slate-700 text-xs mt-1.5">
                {data.tarea?.fechaApertura ? new Date(data.tarea.fechaApertura).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '--'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 transition-all">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cierre</p>
              <p className="font-bold text-slate-700 text-xs mt-1.5">
                {data.tarea?.fechaCierre ? new Date(data.tarea.fechaCierre).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '--'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 transition-all">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entregas</p>
              <p className="font-extrabold text-[#ec3724] text-base mt-1">
                {data.entregas?.length || 0} <span className="text-[10px] font-bold text-slate-500 uppercase">recibidas</span>
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tabla de Entregas Recibidas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Entregas recibidas</h2>
          </div>

          {cargando ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-3">
              <svg className="animate-spin h-7 w-7 text-[#ec3724]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Cargando entregas...</p>
            </div>
          ) : !data.entregas || data.entregas.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <FiFileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Aún no hay entregas para esta tarea.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3">Estudiante</th>
                    <th className="px-4 py-3">Archivo</th>
                    <th className="px-4 py-3">Fecha entrega</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Calificación</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.entregas.map((e) => {
                    const fueraTiempo = cierre ? new Date(e.fechaEntrega) > cierre : false;
                    return (
                      <tr key={e.id} className="hover:bg-slate-50/55 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-300 shadow-sm">
                              {getInitials(e.inscripcion?.estudiante?.nombres)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-xs">{e.inscripcion?.estudiante?.nombres || 'Sin nombre'}</p>
                              <p className="text-[10px] font-medium text-slate-400">{e.inscripcion?.estudiante?.usuario?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2 max-w-[200px] truncate text-slate-600">
                            <FiFileText className="text-slate-400 w-4 h-4 flex-shrink-0" />
                            <span className="truncate font-semibold text-xs" title={e.nombreArchivo}>
                              {e.nombreArchivo}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-500">
                          {new Date(e.fechaEntrega).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            fueraTiempo 
                              ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {fueraTiempo ? 'Tardía' : 'A tiempo'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {e.nota !== null ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <FiCheckCircle className="w-3.5 h-3.5 text-[#ec3724]" />
                              {Number(e.nota).toFixed(2)} / {Number(data.tarea?.puntajeMaximo || 10).toFixed(2)}
                            </span>
                          ) : data.tarea?.titulo?.toLowerCase().includes('anexo f') && e.estado === 'calificada' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
                              <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              Cumplido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-slate-50 text-slate-500 border border-slate-200">
                              <FiAlertCircle className="w-3.5 h-3.5 text-slate-400" />
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <div className="flex gap-2 justify-end items-center">
                            {data.tarea?.titulo?.toLowerCase().includes('anexo f') && (
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all border border-emerald-200 shadow-sm">
                                <FiUpload className="w-3.5 h-3.5" /> Re-subir
                                <input
                                  type="file"
                                  accept=".xls,.xlsx"
                                  className="hidden"
                                  onChange={async (opt) => {
                                    const file = opt.target.files?.[0];
                                    if (!file) return;
                                    
                                    const formData = new FormData();
                                    formData.append('archivo', file);
                                    
                                    try {
                                      setCargando(true);
                                      await api.post(`/docente/tareas/${tareaId}/estudiantes/${e.inscripcionId}/entregar`, formData, {
                                        headers: { 'Content-Type': 'multipart/form-data' }
                                      });
                                      setMensajeExito('Anexo F actualizado con éxito ✓');
                                      await cargar();
                                    } catch (err) {
                                      setError(err?.response?.data?.message || err?.message || 'Error al actualizar Anexo F');
                                    } finally {
                                      setCargando(false);
                                    }
                                  }}
                                />
                              </label>
                            )}
                            {!data.tarea?.titulo?.toLowerCase().includes('anexo f') && (
                              <button
                                onClick={() => iniciarCalificacion(e)}
                                id={`btn-calificar-${e.id}`}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold transition-all shadow-sm ${
                                  e.nota !== null
                                    ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                                    : 'bg-[#ec3724] text-white hover:bg-[#d12a1a]'
                                }`}
                              >
                                {e.nota !== null ? 'Re-calificar' : 'Calificar'}
                              </button>
                            )}
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

        {/* Estudiantes Sin Entregar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiAlertCircle className="text-slate-400 w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900">Estudiantes sin entrega registrada</h3>
          </div>
          
          {data.sinEntregar?.length ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {data.sinEntregar.map((i) => (
                <div key={i.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-slate-300">
                      {getInitials(i.estudiante?.nombres)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-800 truncate" title={i.estudiante?.nombres}>
                        {i.estudiante?.nombres || 'Sin nombre'}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 truncate" title={i.estudiante?.usuario?.email}>
                        {i.estudiante?.usuario?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!data.tarea?.titulo?.toLowerCase().includes('anexo f') && (
                      <button
                        onClick={() => {
                          const dummyEntrega = {
                            id: `temp-${i.id}`,
                            inscripcionId: i.id,
                            tareaId: tareaId,
                            nota: null,
                            comentarioDocente: '',
                            estado: 'sin_entrega',
                            estudiante: i.estudiante || { nombres: i.estudiante?.nombres || 'Sin nombre' },
                            inscripcion: i,
                          };
                          iniciarCalificacion(dummyEntrega);
                        }}
                        className="px-2.5 py-1.5 bg-[#ec3724] hover:bg-[#d12a1a] text-white font-bold rounded text-[10px] transition-all shadow-sm"
                      >
                        Calificar
                      </button>
                    )}

                    {data.tarea?.titulo?.toLowerCase().includes('anexo f') && (
                      <label className="cursor-pointer p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded transition flex items-center justify-center flex-shrink-0 border border-slate-300 shadow-sm" title="Subir Anexo F">
                        <FiUpload className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept=".xls,.xlsx"
                          className="hidden"
                          onChange={async (opt) => {
                            const file = opt.target.files?.[0];
                            if (!file) return;
                            
                            const formData = new FormData();
                            formData.append('archivo', file);
                            
                            try {
                              setCargando(true);
                              await api.post(`/docente/tareas/${tareaId}/estudiantes/${i.id}/entregar`, formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                              });
                              setMensajeExito('Anexo F subido con éxito ✓');
                              await cargar();
                            } catch (err) {
                              setError(err?.response?.data?.message || err?.message || 'Error al subir Anexo F');
                            } finally {
                              setCargando(false);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Todos los estudiantes asignados ya registraron su entrega.
            </p>
          )}
        </div>
      </div>

      {/* MODAL SPEEDGRADER SPLIT-SCREEN WORKSPACE */}
      {activeEntrega && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-[96vw] h-[92vh] flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* PANEL IZQUIERDO: VISOR DE DOCUMENTO (65%) */}
            <div className="flex-1 bg-slate-900 flex flex-col relative h-[50vh] md:h-full">
              {/* Header del Visor */}
              <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
                {data.tarea?.titulo?.toLowerCase().includes('anexo b') ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        setSubTareaPreview('interno');
                        await cargarPreviewSubtarea(activeEntrega, 'interno');
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${
                        subTareaPreview === 'interno' ? 'bg-[#ec3724] text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      Tutor Interno
                    </button>
                    <button
                      onClick={async () => {
                        setSubTareaPreview('externo');
                        await cargarPreviewSubtarea(activeEntrega, 'externo');
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${
                        subTareaPreview === 'externo' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      Tutor Externo
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 min-w-0">
                    <FiFileText className="text-slate-400 w-4 h-4 flex-shrink-0" />
                    <span className="font-bold text-xs truncate" title={activeEntrega.nombreArchivo}>
                      {activeEntrega.nombreArchivo}
                    </span>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    const isB = data.tarea?.titulo?.toLowerCase().includes('anexo b');
                    descargarEntrega(activeEntrega, isB ? subTareaPreview : null);
                  }}
                  id="btn-descargar-archivo"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
                >
                  <FiDownload className="w-3.5 h-3.5" />
                  Descargar
                </button>
              </div>

              {/* Contenido del Visor */}
              <div className="flex-1 w-full h-full relative flex items-center justify-center bg-slate-950">
                {previewCargando ? (
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <svg className="animate-spin h-8 w-8 text-[#ec3724]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-xs font-bold tracking-wider uppercase text-slate-400">Cargando vista previa...</p>
                  </div>
                ) : previewError ? (
                  <div className="text-center p-6 text-slate-400">
                    <FiAlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-300 mb-1">{previewError}</p>
                    <p className="text-xs text-slate-500 mb-4">Puedes descargar el archivo original para revisarlo localmente.</p>
                    <button
                      onClick={() => descargarEntrega(activeEntrega, data.tarea?.titulo?.toLowerCase().includes('anexo b') ? subTareaPreview : null)}
                      className="px-4 py-2 bg-[#ec3724] text-white rounded text-xs font-bold hover:bg-[#d12a1a] transition-colors inline-flex items-center gap-2"
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
                      onClick={() => descargarEntrega(activeEntrega, data.tarea?.titulo?.toLowerCase().includes('anexo b') ? subTareaPreview : null)}
                      className="px-4 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded text-xs font-bold hover:bg-slate-700 transition-colors inline-flex items-center gap-2"
                    >
                      <FiDownload /> Descargar archivo
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* PANEL DERECHO: PANEL DE EVALUACIÓN (35%) */}
            <div className="w-full md:w-[35%] bg-slate-50 flex flex-col justify-between h-[42vh] md:h-full border-t md:border-t-0 md:border-l border-slate-200">
              
              {/* Cabecera del Panel Lateral */}
              <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center border border-slate-300 flex-shrink-0 shadow-sm">
                    {getInitials(activeEntrega.inscripcion?.estudiante?.nombres)}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                      Detalle de Entrega y Calificación Completa
                    </span>
                    <h4 className="font-bold text-slate-850 truncate text-xs leading-snug">
                      {activeEntrega.inscripcion?.estudiante?.nombres || 'Sin nombre'}
                    </h4>
                    <p className="text-[10px] font-medium text-slate-400 truncate">
                      {activeEntrega.inscripcion?.estudiante?.usuario?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={cerrarWorkspace}
                  id="btn-cerrar-x"
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              {/* Cuerpo del Formulario */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {error && (
                  <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
                    <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {/* Información de la Asignación */}
                <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-sm">
                  <span className="text-[9px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded uppercase tracking-widest inline-block">
                    Ciclo {data.tarea?.numeroCiclo || '--'}
                  </span>
                  <div className="mt-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tarea</p>
                    <h5 className="font-bold text-slate-800 text-xs leading-snug mt-0.5">
                      {data.tarea?.titulo || '--'}
                    </h5>
                  </div>
                </div>

                {/* Plazos de la Tarea */}
                <div className="bg-white rounded-lg border border-slate-200 p-3.5 space-y-2 shadow-sm">
                  <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Plazos de la Tarea</h5>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Apertura</span>
                    <span className="font-bold text-slate-700 text-[11px]">
                      {data.tarea?.fechaApertura ? new Date(data.tarea.fechaApertura).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '--'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Cierre</span>
                    <span className="font-bold text-slate-700 text-[11px]">
                      {data.tarea?.fechaCierre ? new Date(data.tarea.fechaCierre).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '--'}
                    </span>
                  </div>
                </div>

                {/* Instrucciones de la Tarea */}
                {data.tarea?.descripcion && (
                  <div className="bg-white rounded-lg border border-slate-200 p-3.5 space-y-1 shadow-sm">
                    <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Instrucciones de la tarea</h5>
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto">
                      {data.tarea.descripcion}
                    </p>
                  </div>
                )}

                {/* Metadata de la entrega */}
                <div className="bg-white rounded-lg border border-slate-200 p-3.5 space-y-2 shadow-sm">
                  <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Detalles del envío</h5>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Puntualidad</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider ${
                      (cierre ? new Date(activeEntrega.fechaEntrega) > cierre : false)
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {(cierre ? new Date(activeEntrega.fechaEntrega) > cierre : false) ? 'Tardía' : 'A tiempo'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Enviado el</span>
                    <span className="font-bold text-slate-700 text-[10px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {new Date(activeEntrega.fechaEntrega).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'medium' })}
                    </span>
                  </div>
                </div>

                {activeEntrega.promedios && (
                  <div className="bg-white rounded-lg border border-slate-200 p-3.5 space-y-2 shadow-sm">
                    <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      Rendimiento Académico del Estudiante
                    </h5>
                    
                    {Number(data.tarea?.numeroCiclo) === 1 && (
                      <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="block text-[9px] font-bold text-slate-700 uppercase tracking-wider">Promedio Ciclo 1</span>
                          <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                            Promedio acumulado de tareas en este ciclo.
                          </p>
                        </div>
                        <span className="text-base font-black text-slate-800">
                          {activeEntrega.promedios.c1 !== null ? Number(activeEntrega.promedios.c1).toFixed(2) : '--'}
                        </span>
                      </div>
                    )}

                    {Number(data.tarea?.numeroCiclo) === 2 && (
                      <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="block text-[9px] font-bold text-slate-700 uppercase tracking-wider">Promedio Ciclo 2</span>
                          <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                            Promedio acumulado de tareas en este ciclo.
                          </p>
                        </div>
                        <span className="text-base font-black text-slate-800">
                          {activeEntrega.promedios.c2 !== null ? Number(activeEntrega.promedios.c2).toFixed(2) : '--'}
                        </span>
                      </div>
                    )}

                    {Number(data.tarea?.numeroCiclo) === 3 && (
                      <div className="bg-amber-50/50 rounded-lg p-2.5 border border-amber-200 flex items-center justify-between">
                        <div>
                          <span className="block text-[9px] font-bold text-amber-700 uppercase tracking-wider">Nota de Supletorio</span>
                          <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                            Calificación registrada en el examen supletorio.
                          </p>
                        </div>
                        <span className="text-base font-black text-amber-800">
                          {activeEntrega.promedios.c3 !== null ? Number(activeEntrega.promedios.c3).toFixed(2) : '--'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Historial de Envíos y Evaluaciones */}
                {activeEntrega.historial && (
                  <div className="bg-white rounded-lg border border-slate-200 p-3.5 space-y-2 shadow-sm">
                    <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      Historial de Envíos y Cambios
                    </h5>
                    <div className="max-h-36 overflow-y-auto space-y-2 pt-1">
                      {(() => {
                        try {
                          const history = JSON.parse(activeEntrega.historial);
                          if (!Array.isArray(history) || history.length === 0) {
                            return <p className="text-[10px] text-slate-400 italic">No hay historial previo registrado.</p>;
                          }
                          return history.slice().reverse().map((entry, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-lg p-2 border border-slate-200 space-y-1 text-[10px] leading-relaxed">
                              <div className="flex items-center justify-between font-bold text-[9px] text-[#ec3724] uppercase tracking-wider">
                                <span>{entry.accion || 'Acción'}</span>
                                <span className="text-slate-400 font-semibold">{new Date(entry.fecha).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</span>
                              </div>
                              {entry.nombreArchivo && (
                                <p className="text-slate-650 truncate">
                                  Archivo: <span className="font-semibold text-slate-700">{entry.nombreArchivo}</span>
                                </p>
                              )}
                              {(entry.nota !== undefined || entry.notaPrevia !== undefined) && (
                                <p className="text-slate-500 font-bold">
                                  Nota: <span className="text-slate-800 font-bold">{Number(entry.nota !== undefined ? entry.nota : entry.notaPrevia).toFixed(2)}</span>
                                </p>
                              )}
                              {(entry.comentario || entry.comentarioPrevio) && (
                                <p className="text-slate-500 italic mt-0.5 border-t border-slate-200/50 pt-0.5">
                                  "{entry.comentario || entry.comentarioPrevio}"
                                </p>
                              )}
                            </div>
                          ));
                        } catch (e) {
                          return <p className="text-[10px] text-slate-400 italic">No se pudo cargar el historial.</p>;
                        }
                      })()}
                    </div>
                  </div>
                )}

                {/* Banner de Mensaje de Éxito */}
                {mensajeExito && (
                  <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 px-3.5 py-2.5 rounded-lg flex items-center gap-2 animate-in fade-in duration-200">
                    <FiCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs font-bold">{mensajeExito}</span>
                  </div>
                )}

                {/* Formulario principal */}
                {data.tarea?.titulo?.toLowerCase().includes('anexo b') ? (
                  <div className="space-y-4">
                    {/* Summary of Promedio */}
                    <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-1.5 bg-gradient-to-br from-red-50/10 to-slate-50/35">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nota Final Promediada</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black ${
                          activeEntrega.nota !== null ? 'text-[#ec3724]' : 'text-slate-400'
                        }`}>
                          {activeEntrega.nota !== null ? Number(activeEntrega.nota).toFixed(2) : '--'}
                        </span>
                        <span className="text-xs font-bold text-slate-400">/ 10.00 pts</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        {activeEntrega.nota !== null 
                          ? `Promedio de Interno (${activeEntrega.notaInterno}) y Externo (${activeEntrega.notaExterno}).`
                          : 'Se calculará automáticamente al guardar ambas evaluaciones.'}
                      </p>
                    </div>

                    {/* Section 1: Tutor Interno */}
                    <div className="bg-white rounded-lg border p-3.5 space-y-3 border-slate-200">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ec3724]"></span>
                          1. Tutor Interno
                        </h5>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          activeEntrega.nombreArchivoInterno ? 'bg-red-50 text-[#ec3724]' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {activeEntrega.nombreArchivoInterno ? 'Subido' : 'Sin Archivo'}
                        </span>
                      </div>

                      {activeEntrega.nombreArchivoInterno && (
                        <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded border border-slate-200">
                          <FiFileText className="text-slate-400 w-4 h-4 flex-shrink-0" />
                          <span className="text-xs font-semibold truncate block max-w-[180px]" title={activeEntrega.nombreArchivoInterno}>
                            {activeEntrega.nombreArchivoInterno}
                          </span>
                        </div>
                      )}

                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nota Interno</label>
                          <div className="relative rounded shadow-sm">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="10"
                              className={`block w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#ec3724] text-xs ${
                                subTareaPreview !== 'interno' ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
                              }`}
                              placeholder="0.00"
                              value={formNotaInterno}
                              onChange={(ev) => setFormNotaInterno(ev.target.value)}
                              disabled={subTareaPreview !== 'interno'}
                            />
                            <span className="absolute inset-y-0 right-3 flex items-center text-[10px] text-slate-400 font-bold">/ 10 pts</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Retroalimentación Interno</label>
                            <span className="text-[9px] font-bold text-slate-400">{formComentarioInterno.length} / 1000</span>
                          </div>
                          <textarea
                            rows={2}
                            maxLength={1000}
                            className={`block w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#ec3724] text-xs ${
                              subTareaPreview !== 'interno' ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
                            }`}
                            placeholder="Escribe observaciones para el Tutor Interno..."
                            value={formComentarioInterno}
                            onChange={(ev) => setFormComentarioInterno(ev.target.value)}
                            disabled={subTareaPreview !== 'interno'}
                          />
                        </div>

                        <button
                          onClick={() => enviarCalificacionSubTarea('interno')}
                          disabled={cargandoGuardado || subTareaPreview !== 'interno'}
                          className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs transition disabled:opacity-50 ${
                            subTareaPreview !== 'interno' ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          Guardar Calificación Interno
                        </button>
                      </div>
                    </div>

                    {/* Section 2: Tutor Externo */}
                    <div className="bg-white rounded-lg border p-3.5 space-y-3 border-slate-200">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          2. Tutor Externo
                        </h5>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          activeEntrega.nombreArchivoExterno ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {activeEntrega.nombreArchivoExterno ? 'Subido' : 'Sin Archivo'}
                        </span>
                      </div>

                      {activeEntrega.nombreArchivoExterno && (
                        <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded border border-slate-200">
                          <FiFileText className="text-slate-400 w-4 h-4 flex-shrink-0" />
                          <span className="text-xs font-semibold truncate block max-w-[180px]" title={activeEntrega.nombreArchivoExterno}>
                            {activeEntrega.nombreArchivoExterno}
                          </span>
                        </div>
                      )}

                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nota Externo</label>
                          <div className="relative rounded shadow-sm">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="10"
                              className={`block w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs ${
                                subTareaPreview !== 'externo' ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
                              }`}
                              placeholder="0.00"
                              value={formNotaExterno}
                              onChange={(ev) => setFormNotaExterno(ev.target.value)}
                              disabled={subTareaPreview !== 'externo'}
                            />
                            <span className="absolute inset-y-0 right-3 flex items-center text-[10px] text-slate-400 font-bold">/ 10 pts</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Retroalimentación Externo</label>
                            <span className="text-[9px] font-bold text-slate-400">{formComentarioExterno.length} / 1000</span>
                          </div>
                          <textarea
                            rows={2}
                            maxLength={1000}
                            className={`block w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs ${
                              subTareaPreview !== 'externo' ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
                            }`}
                            placeholder="Escribe observaciones para el Tutor Externo..."
                            value={formComentarioExterno}
                            onChange={(ev) => setFormComentarioExterno(ev.target.value)}
                            disabled={subTareaPreview !== 'externo'}
                          />
                        </div>

                        <button
                          onClick={() => enviarCalificacionSubTarea('externo')}
                          disabled={cargandoGuardado || subTareaPreview !== 'externo'}
                          className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs transition disabled:opacity-50 ${
                            subTareaPreview !== 'externo' ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          Guardar Calificación Externo
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                        Calificación
                      </label>
                      <div className="relative rounded shadow-sm">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={data.tarea?.puntajeMaximo || 10}
                          id="input-calificacion-nota"
                          className="block w-full rounded border border-slate-355 bg-white px-3 py-2.5 text-slate-900 font-extrabold focus:border-[#ec3724] focus:outline-none focus:ring-1 focus:ring-[#ec3724] text-xs placeholder-slate-400"
                          placeholder="0.00"
                          value={formNota}
                          onChange={(ev) => setFormNota(ev.target.value)}
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-xs font-bold text-slate-400">
                            / {Number(data.tarea?.puntajeMaximo || 10).toFixed(2)} pts
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          Retroalimentación
                        </label>
                        <span className="text-[9px] font-bold text-slate-400">{formComentario.length} / 1000</span>
                      </div>
                      <textarea
                        rows={4}
                        maxLength={1000}
                        id="input-calificacion-comentario"
                        className="block w-full rounded border border-slate-350 bg-white px-3 py-2.5 text-slate-800 font-semibold focus:border-[#ec3724] focus:outline-none focus:ring-1 focus:ring-[#ec3724] text-xs placeholder-slate-400"
                        placeholder="Escribe la retroalimentación para el estudiante..."
                        value={formComentario}
                        onChange={(ev) => setFormComentario(ev.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer del Panel Lateral */}
              <div className="px-5 py-4 bg-white border-t border-slate-200 flex items-center gap-3">
                <button
                  onClick={cerrarWorkspace}
                  id="btn-cancelar-calificacion"
                  className="flex-1 px-4 py-2.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors font-bold text-xs text-center"
                >
                  Cerrar
                </button>
                {!data.tarea?.titulo?.toLowerCase().includes('anexo b') && (
                  <button
                    onClick={enviarCalificacion}
                    disabled={cargandoGuardado}
                    id="btn-guardar-calificacion"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-[#ec3724] hover:bg-[#d12a1a] text-white font-bold text-xs transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleTarea;

