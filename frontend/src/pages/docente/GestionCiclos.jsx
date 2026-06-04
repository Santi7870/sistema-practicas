import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBookOpen, FiCalendar, FiClock, FiPlus, FiUsers, FiEdit, FiTrash2 } from 'react-icons/fi';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

const initialForm = {
  titulo: '',
  descripcion: '',
  puntajeMaximo: 10,
  fechaApertura: '',
  fechaCierre: '',
  plantilla: null,
};

const estadoConfig = {
  abierta: 'bg-emerald-100 text-emerald-800',
  cerrada: 'bg-rose-100 text-rose-800',
  proxima: 'bg-amber-100 text-amber-800',
};

const estadoLabel = {
  abierta: 'Abierta',
  cerrada: 'Cerrada',
  proxima: 'Proximamente',
};

const GestionCiclos = () => {
  const [tipo, setTipo] = useState('laboral');
  const [cicloActivo, setCicloActivo] = useState(1);
  const [tareas, setTareas] = useState([]);
  const [resumenCiclos, setResumenCiclos] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editingTareaId, setEditingTareaId] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [eliminarPlantilla, setEliminarPlantilla] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const cargar = async () => {
    try {
      setCargando(true);
      setError('');
      
      // 1. Obtener estudiantes y paralelo del docente
      const estudiantesRes = await api.get('/docente/estudiantes');
      const insts = estudiantesRes.data.data || [];
      setInscripciones(insts);

      const par = estudiantesRes.data.paraleloAsignado;
      const tipoTutor = estudiantesRes.data.tipoTutor;
      let activeTipo = 'laboral';
      if (par) {
        activeTipo = par.tipoPractica;
      } else if (tipoTutor) {
        activeTipo = tipoTutor === 'comunales' ? 'comunitaria' : 'laboral';
      }
      setTipo(activeTipo);

      // 2. Obtener tareas usando la modalidad bloqueada
      const tareasRes = await api.get(`/docente/tareas?tipo=${activeTipo}`);
      setTareas(tareasRes.data.data || []);
      setResumenCiclos(tareasRes.data.resumenCiclos || []);
    } catch (err) {
      setError(err?.message || 'No se pudo cargar la informacion.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const tareasCiclo = useMemo(
    () => tareas.filter((t) => Number(t.numeroCiclo) === Number(cicloActivo)),
    [tareas, cicloActivo]
  );

  const resumenActual = useMemo(
    () => resumenCiclos.find((c) => Number(c.numeroCiclo) === Number(cicloActivo)),
    [resumenCiclos, cicloActivo]
  );

  const estudiantesModalidad = useMemo(
    () => inscripciones.filter((i) => i.tipoPractica === tipo),
    [inscripciones, tipo]
  );

  const formatFechaInput = (fechaStr) => {
    if (!fechaStr) return '';
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return '';
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Guayaquil',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(d);
      const partObj = {};
      parts.forEach(p => { partObj[p.type] = p.value; });
      return `${partObj.year}-${partObj.month}-${partObj.day}T${partObj.hour}:${partObj.minute}`;
    } catch (e) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('El archivo no debe exceder los 20MB.');
      e.target.value = '';
      return;
    }

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    const fileName = file.name.toLowerCase();
    const matches = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!matches) {
      setError('Extensión de archivo no permitida. Solo se permiten: .pdf, .doc, .docx, .xls, .xlsx');
      e.target.value = '';
      return;
    }

    setError('');
    setForm({ ...form, plantilla: file });
    setEliminarPlantilla(false);
  };

  const descargarPlantilla = async (tareaId, nombreArchivo) => {
    try {
      const response = await api.get(`/docente/tareas/${tareaId}/descargar-plantilla`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nombreArchivo || 'plantilla.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('No se pudo descargar la plantilla.');
    }
  };

  const guardarTarea = async (e) => {
    e.preventDefault();
    try {
      setGuardando(true);
      setError('');

      const apertura = new Date(form.fechaApertura);
      const cierre = new Date(form.fechaCierre);
      if (cierre <= apertura) {
        setError('La fecha de cierre debe ser posterior a la de apertura.');
        setGuardando(false);
        return;
      }

      const offsetSuffix = '-05:00';
      const fechaAperturaVal = form.fechaApertura.includes('-05:00') || form.fechaApertura.includes('Z')
        ? form.fechaApertura 
        : `${form.fechaApertura}:00${offsetSuffix}`;
      const fechaCierreVal = form.fechaCierre.includes('-05:00') || form.fechaCierre.includes('Z')
        ? form.fechaCierre 
        : `${form.fechaCierre}:00${offsetSuffix}`;

      const formData = new FormData();
      formData.append('titulo', form.titulo);
      formData.append('descripcion', form.descripcion);
      formData.append('puntajeMaximo', Number(form.puntajeMaximo));
      formData.append('fechaApertura', fechaAperturaVal);
      formData.append('fechaCierre', fechaCierreVal);

      if (form.plantilla) {
        formData.append('plantilla', form.plantilla);
      }

      if (modoEdicion) {
        formData.append('eliminarPlantilla', eliminarPlantilla ? 'true' : 'false');
        await api.put(`/docente/tareas/${editingTareaId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        formData.append('tipoPractica', tipo);
        formData.append('numeroCiclo', cicloActivo);
        await api.post('/docente/tareas', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setForm(initialForm);
      setModoEdicion(false);
      setEditingTareaId(null);
      setTemplateName('');
      setEliminarPlantilla(false);
      setShowModal(false);
      await cargar();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo guardar la tarea.');
    } finally {
      setGuardando(false);
    }
  };

  const abrirEditarTarea = (tarea) => {
    setForm({
      titulo: tarea.titulo || '',
      descripcion: tarea.descripcion || '',
      puntajeMaximo: tarea.puntajeMaximo || 10,
      fechaApertura: formatFechaInput(tarea.fechaApertura),
      fechaCierre: formatFechaInput(tarea.fechaCierre),
      plantilla: null,
    });
    setTemplateName(tarea.templateName || '');
    setEliminarPlantilla(false);
    setEditingTareaId(tarea.id);
    setModoEdicion(true);
    setShowModal(true);
  };

  const abrirNuevaTarea = () => {
    setForm({ ...initialForm, plantilla: null });
    setTemplateName('');
    setEliminarPlantilla(false);
    setEditingTareaId(null);
    setModoEdicion(false);
    setShowModal(true);
  };

  const eliminarTarea = (id) => {
    setDeleteTargetId(id);
  };

  return (
    <div className="min-h-screen bg-slate-50 animate-fadeIn">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
          <div className="pl-2">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
              Gestión de Ciclos y Tareas
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Administra, crea y supervisa las tareas académicas por ciclo en tu paralelo asignado.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black border uppercase tracking-wider select-none ${
              tipo === 'laboral'
                ? 'bg-rose-50 border-rose-100 text-[#ec3724]'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              <span>{tipo === 'laboral' ? 'Prácticas Laborales' : 'Prácticas Comunitarias'}</span>
            </span>
            <button
              onClick={abrirNuevaTarea}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98]"
            >
              <FiPlus className="h-4 w-4" />
              <span>Nueva Tarea</span>
            </button>
          </div>
        </div>

        {/* Estudiantes asignados */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3.5">
            <FiUsers className="text-[#ec3724] h-4.5 w-4.5" />
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Estudiantes Tutelados ({estudiantesModalidad.length})
            </h2>
          </div>
          {estudiantesModalidad.length === 0 ? (
            <p className="text-[11px] font-semibold text-slate-500 italic">No hay estudiantes activos asignados a tu paralelo.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {estudiantesModalidad.map((i) => (
                <span key={i.id} className="px-2.5 py-1 bg-slate-100 rounded text-[10px] font-black text-slate-700 uppercase border border-slate-200 tracking-wide">
                  {i.estudiante?.nombres || i.estudiante?.usuario?.email}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Ciclos académicos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((ciclo) => {
            const resumen = resumenCiclos.find((c) => Number(c.numeroCiclo) === ciclo);
            const activo = cicloActivo === ciclo;
            return (
              <button
                key={ciclo}
                onClick={() => setCicloActivo(ciclo)}
                className={`p-5 rounded-xl border text-left transition relative overflow-hidden ${
                  activo
                    ? 'bg-[#6c757d] text-white border-[#6c757d] shadow-md'
                    : 'bg-white border-slate-200 hover:border-[#ec3724]'
                }`}
              >
                {activo && <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-[#ec3724]"></div>}
                <p className={`text-[10px] font-black uppercase tracking-wider ${activo ? 'text-white/80' : 'text-slate-450'}`}>
                  {ciclo === 3 ? 'Examen Supletorio' : `Ciclo Académico ${ciclo}`}
                </p>
                <p className={`text-2xl font-black mt-1 ${activo ? 'text-white' : 'text-slate-900'}`}>{resumen?.promedio ?? '--'}</p>
                <p className={`text-[10px] font-black uppercase tracking-wider mt-1.5 ${activo ? 'text-white/80' : 'text-slate-500'}`}>
                  {ciclo === 3 ? 'Nota Promedio' : 'Promedio de Calificaciones'}
                </p>
              </button>
            );
          })}
        </div>

        {/* Tabla de tareas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Tareas del {cicloActivo === 3 ? 'Examen Supletorio' : `Ciclo ${cicloActivo}`}
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Calificación Promedio: {resumenActual?.promedio ?? '--'}</p>
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider border border-slate-250 bg-slate-100 px-2 py-0.5 rounded">{tareasCiclo.length} Registros</span>
          </div>

          {cargando ? (
            <div className="p-8 text-center text-xs font-bold text-slate-550 uppercase tracking-wider">Cargando tareas académicas...</div>
          ) : error && !showModal ? (
            <div className="p-8 text-center text-xs font-bold text-[#ec3724] uppercase tracking-wider">{error}</div>
          ) : tareasCiclo.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400 uppercase italic">No se han registrado tareas en este ciclo académico.</div>
          ) : (
            <div className="overflow-x-auto animate-fadeIn">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[9px] font-black text-slate-550 uppercase tracking-wider divide-x divide-slate-200">
                    <th className="px-3.5 py-3 text-left w-[120px]">Código</th>
                    <th className="px-3.5 py-3 text-left w-[240px]">Título de Tarea</th>
                    <th className="px-3.5 py-3 text-center w-[100px]">Puntaje Máx</th>
                    <th className="px-3.5 py-3 text-left w-[180px]">Fecha Apertura</th>
                    <th className="px-3.5 py-3 text-left w-[180px]">Fecha Cierre</th>
                    <th className="px-3.5 py-3 text-center w-[100px]">Estado</th>
                    <th className="px-3.5 py-3 text-center w-[100px]">Entregas</th>
                    <th className="px-3.5 py-3 text-center w-[120px]">Faltan Calificar</th>
                    <th className="px-3.5 py-3 text-center w-[100px]">Promedio</th>
                    <th className="px-3.5 py-3 text-center w-[200px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white font-semibold text-slate-750">
                  {tareasCiclo.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors divide-x divide-slate-100 text-[11px]">
                      <td className="px-3.5 py-2.5 font-bold text-slate-900 font-mono tracking-wider">{t.codigo}</td>
                      <td className="px-3.5 py-2.5 font-black text-slate-900 uppercase truncate max-w-[200px]" title={t.titulo}>{t.titulo}</td>
                      <td className="px-3.5 py-2.5 text-center font-bold text-slate-800">{t.puntajeMaximo}</td>
                      <td className="px-3.5 py-2.5 text-slate-500 font-bold">{new Date(t.fechaApertura).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="px-3.5 py-2.5 text-slate-500 font-bold">{new Date(t.fechaCierre).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-wider ${estadoConfig[t.estadoVentana] || 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                          {estadoLabel[t.estadoVentana] || t.estadoVentana}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-black text-slate-800">{t.totalEntregas || 0}</td>
                      <td className="px-3.5 py-2.5 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className={`font-black text-xs ${
                            Math.max(0, estudiantesModalidad.length - (t.entregasCalificadas || 0)) > 0 
                              ? 'text-[#ec3724]' 
                              : 'text-emerald-600'
                          }`}>
                            {Math.max(0, estudiantesModalidad.length - (t.entregasCalificadas || 0))}
                          </span>
                          {t.entregasPendientes > 0 && (
                            <span className="inline-flex items-center gap-1 text-[8px] font-black text-amber-700 bg-amber-50 px-1 py-0.5 rounded uppercase tracking-wider border border-amber-150 mt-0.5">
                              {t.entregasPendientes} por revisar
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-black text-slate-800">{t.promedioGeneral ?? '--'}</td>
                      <td className="px-3.5 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/docente/tareas/${t.id}`}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-white text-[#ec3724] hover:bg-rose-50 border border-slate-250 hover:border-rose-200 rounded font-black text-[9px] uppercase tracking-wider shadow-sm transition"
                            title="Ver calificaciones y entregas"
                          >
                            <FiBookOpen className="h-3.5 w-3.5" /> 
                            <span>Ver entregas</span>
                          </Link>
                          <button
                            onClick={() => abrirEditarTarea(t)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg border border-slate-200 shadow-sm transition"
                            title="Editar tarea"
                          >
                            <FiEdit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => eliminarTarea(t.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-[#ec3724] hover:text-[#d32010] rounded-lg border border-rose-200 shadow-sm transition"
                            title="Eliminar tarea"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-slate-200 animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center relative">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider pl-2">
                {modoEdicion ? 'Editar Tarea Académica' : 'Nueva Tarea Académica'} - Ciclo {cicloActivo}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setError('');
                }}
                className="text-slate-400 hover:text-slate-650 font-bold"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={guardarTarea}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {modoEdicion && (
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    Código de Registro: <strong className="text-slate-700 font-mono tracking-widest">{tareas.find(t => t.id === editingTareaId)?.codigo || ''}</strong>
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Título de la Tarea *</label>
                    <input
                      className="w-full border border-slate-350 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
                      placeholder="Ej. Anexo A - Plan de Prácticas"
                      value={form.titulo}
                      onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Puntaje Máximo *</label>
                    <input
                      className="w-full border border-slate-350 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-bold text-slate-800"
                      type="number"
                      min="1"
                      max="10"
                      step="0.01"
                      value={form.puntajeMaximo}
                      onChange={(e) => setForm({ ...form, puntajeMaximo: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Fecha y Hora de Apertura *</label>
                    <div className="relative">
                      <FiCalendar className="absolute top-2.5 left-3 text-slate-400 h-4 w-4" />
                      <input
                        className="w-full border border-slate-350 rounded-lg pl-9 pr-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-700 cursor-pointer"
                        type="datetime-local"
                        value={form.fechaApertura}
                        onChange={(e) => setForm({ ...form, fechaApertura: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Fecha y Hora de Cierre *</label>
                    <div className="relative">
                      <FiClock className="absolute top-2.5 left-3 text-slate-400 h-4 w-4" />
                      <input
                        className="w-full border border-slate-350 rounded-lg pl-9 pr-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-700 cursor-pointer"
                        type="datetime-local"
                        value={form.fechaCierre}
                        onChange={(e) => setForm({ ...form, fechaCierre: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Instrucciones / Descripción</label>
                    <textarea
                      className="w-full border border-slate-350 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
                      rows={4}
                      placeholder="Favor detallar las instrucciones para el envío del archivo en formato PDF..."
                      value={form.descripcion}
                      onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 border-t border-slate-200 pt-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                      Plantilla / Archivo de Apoyo (Opcional, máx 20MB)
                    </label>
                    
                    {templateName && !eliminarPlantilla ? (
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-250 mb-3 animate-fadeIn">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-slate-700 truncate max-w-[250px]" title={templateName}>
                            📄 {templateName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => descargarPlantilla(editingTareaId, templateName)}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[9px] font-bold text-slate-700 transition"
                          >
                            Descargar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEliminarPlantilla(true)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded text-[9px] font-bold text-rose-700 transition"
                          >
                            Eliminar plantilla
                          </button>
                        </div>
                      </div>
                    ) : templateName && eliminarPlantilla ? (
                      <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-[11px] font-semibold text-amber-800 mb-3 flex items-center justify-between">
                        <span>La plantilla actual será eliminada al guardar.</span>
                        <button
                          type="button"
                          onClick={() => setEliminarPlantilla(false)}
                          className="text-[9px] font-black uppercase text-[#ec3724] underline"
                        >
                          Deshacer
                        </button>
                      </div>
                    ) : null}

                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="w-full border border-slate-350 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-755"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Formatos permitidos: PDF, Word (doc, docx), Excel (xls, xlsx).
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="text-xs font-bold text-[#ec3724] bg-rose-50 p-3 rounded-lg border border-rose-150 leading-relaxed">
                    {error}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError('');
                  }}
                  className="inline-flex items-center justify-center px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98]"
                >
                  {guardando ? 'Procesando...' : modoEdicion ? 'Guardar Cambios' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-slate-200 animate-scale-up">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center relative">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider pl-2">
                Confirmar Eliminación
              </h3>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-650 font-semibold leading-relaxed animate-fadeIn">
                ¿Está seguro de que desea eliminar esta tarea académica? Esta acción borrará permanentemente la tarea, sus entregas asociadas y las plantillas. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteTargetId;
                  setDeleteTargetId(null);
                  try {
                    setCargando(true);
                    setError('');
                    await api.delete(`/docente/tareas/${id}`);
                    await cargar();
                  } catch (err) {
                    setError(err?.response?.data?.message || err?.message || 'No se pudo eliminar la tarea.');
                  } finally {
                    setCargando(false);
                  }
                }}
                className="px-4 py-2 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all"
              >
                Eliminar Tarea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionCiclos;


