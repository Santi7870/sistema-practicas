import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBookOpen, FiCalendar, FiClock, FiPlus, FiUsers, FiEdit } from 'react-icons/fi';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

const initialForm = {
  titulo: '',
  descripcion: '',
  puntajeMaximo: 10,
  fechaApertura: '',
  fechaCierre: '',
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

  const cargar = async () => {
    try {
      setCargando(true);
      setError('');
      const [tareasRes, estudiantesRes] = await Promise.all([
        api.get(`/docente/tareas?tipo=${tipo}`),
        api.get('/docente/estudiantes'),
      ]);

      setTareas(tareasRes.data.data || []);
      setResumenCiclos(tareasRes.data.resumenCiclos || []);
      setInscripciones(estudiantesRes.data.data || []);
    } catch (err) {
      setError(err?.message || 'No se pudo cargar la informacion.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [tipo]);

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
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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

      const payload = {
        titulo: form.titulo,
        descripcion: form.descripcion,
        puntajeMaximo: Number(form.puntajeMaximo),
        fechaApertura: form.fechaApertura,
        fechaCierre: form.fechaCierre,
      };

      if (modoEdicion) {
        await api.put(`/docente/tareas/${editingTareaId}`, payload);
      } else {
        await api.post('/docente/tareas', {
          ...payload,
          tipoPractica: tipo,
          numeroCiclo: cicloActivo,
        });
      }

      setForm(initialForm);
      setModoEdicion(false);
      setEditingTareaId(null);
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
    });
    setEditingTareaId(tarea.id);
    setModoEdicion(true);
    setShowModal(true);
  };

  const abrirNuevaTarea = () => {
    setForm(initialForm);
    setEditingTareaId(null);
    setModoEdicion(false);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Gestion de Ciclos y Tareas</h1>
            <p className="text-gray-500 mt-1">
              Crea tareas por ciclo. El codigo se genera automaticamente por el sistema.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="border rounded-xl px-3 py-2 font-semibold bg-white cursor-pointer"
            >
              <option value="laboral">Laboral</option>
              <option value="comunitaria">Comunitaria</option>
            </select>
            <button
              onClick={abrirNuevaTarea}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl transition"
            >
              <FiPlus /> Nueva tarea
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FiUsers className="text-indigo-600" />
            <h2 className="font-bold text-gray-900">
              Estudiantes en modalidad {tipo} ({estudiantesModalidad.length})
            </h2>
          </div>
          {estudiantesModalidad.length === 0 ? (
            <p className="text-sm text-gray-500">No hay estudiantes activos asignados en esta modalidad.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {estudiantesModalidad.map((i) => (
                <span key={i.id} className="px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                  {i.estudiante?.nombres || i.estudiante?.usuario?.email}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((ciclo) => {
            const resumen = resumenCiclos.find((c) => Number(c.numeroCiclo) === ciclo);
            const activo = cicloActivo === ciclo;
            return (
              <button
                key={ciclo}
                onClick={() => setCicloActivo(ciclo)}
                className={`p-4 rounded-2xl border text-left transition ${
                  activo ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white border-gray-200 hover:border-indigo-300'
                }`}
              >
                <p className={`text-sm ${activo ? 'text-indigo-100' : 'text-gray-500'}`}>Ciclo {ciclo}</p>
                <p className="text-2xl font-black mt-1">{resumen?.promedio ?? '--'}</p>
                <p className={`text-xs mt-1 ${activo ? 'text-indigo-100' : 'text-gray-400'}`}>Promedio del ciclo</p>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Tareas del Ciclo {cicloActivo}</h2>
              <p className="text-sm text-gray-500">Promedio: {resumenActual?.promedio ?? '--'}</p>
            </div>
            <span className="text-sm text-gray-500">{tareasCiclo.length} tareas</span>
          </div>

          {cargando ? (
            <div className="p-8 text-center text-gray-500">Cargando tareas...</div>
          ) : error && !showModal ? (
            <div className="p-8 text-center text-rose-600">{error}</div>
          ) : tareasCiclo.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No hay tareas en este ciclo.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="text-left px-4 py-3">Codigo</th>
                    <th className="text-left px-4 py-3">Titulo</th>
                    <th className="text-left px-4 py-3">Puntaje Max</th>
                    <th className="text-left px-4 py-3">Apertura</th>
                    <th className="text-left px-4 py-3">Cierre</th>
                    <th className="text-left px-4 py-3">Estado</th>
                    <th className="text-left px-4 py-3">Entregas</th>
                    <th className="text-left px-4 py-3">Promedio</th>
                    <th className="text-left px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tareasCiclo.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">{t.codigo}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{t.titulo}</p>
                      </td>
                      <td className="px-4 py-3">{t.puntajeMaximo}</td>
                      <td className="px-4 py-3">{new Date(t.fechaApertura).toLocaleString()}</td>
                      <td className="px-4 py-3">{new Date(t.fechaCierre).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${estadoConfig[t.estadoVentana] || 'bg-gray-100 text-gray-700'}`}>
                          {estadoLabel[t.estadoVentana] || t.estadoVentana}
                        </span>
                      </td>
                      <td className="px-4 py-3">{t.totalEntregas || 0}</td>
                      <td className="px-4 py-3">{t.promedioGeneral ?? '--'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/docente/tareas/${t.id}`}
                            className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold hover:text-indigo-800 transition"
                            title="Ver entregas de esta tarea"
                          >
                            <FiBookOpen className="text-base" /> Ver entregas
                          </Link>
                          <button
                            onClick={() => abrirEditarTarea(t)}
                            className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                            title="Editar tarea"
                          >
                            <FiEdit className="text-lg" />
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-black text-gray-900">
              {modoEdicion ? 'Editar Tarea' : 'Nueva Tarea'} - Ciclo {cicloActivo}
            </h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              {modoEdicion
                ? `Editando los detalles de la tarea. Código: ${tareas.find(t => t.id === editingTareaId)?.codigo || ''}`
                : `Modalidad: ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}. El codigo se generara automaticamente.`}
            </p>

            <form onSubmit={guardarTarea} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título de la Tarea</label>
                <input
                  className="border rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej. Anexo 2"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Puntaje Máximo</label>
                <input
                  className="border rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  value={form.puntajeMaximo}
                  onChange={(e) => setForm({ ...form, puntajeMaximo: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha y Hora de Apertura</label>
                <div className="relative">
                  <FiCalendar className="absolute top-3 left-3 text-gray-400" />
                  <input
                    className="border rounded-xl pl-10 pr-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    type="datetime-local"
                    value={form.fechaApertura}
                    onChange={(e) => setForm({ ...form, fechaApertura: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha y Hora de Cierre</label>
                <div className="relative">
                  <FiClock className="absolute top-3 left-3 text-gray-400" />
                  <input
                    className="border rounded-xl pl-10 pr-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    type="datetime-local"
                    value={form.fechaCierre}
                    onChange={(e) => setForm({ ...form, fechaCierre: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Instrucciones / Descripción</label>
                <textarea
                  className="border rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  placeholder="Instrucciones para el envío del archivo..."
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>

              {error && (
                <div className="md:col-span-2 text-sm text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                  {error}
                </div>
              )}

              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError('');
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 transition"
                >
                  {guardando ? 'Guardando...' : modoEdicion ? 'Guardar Cambios' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionCiclos;

