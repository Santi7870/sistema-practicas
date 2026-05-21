import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertCircle,
  FiArrowRight,
  FiBookOpen,
  FiCheckCircle,
  FiClipboard,
  FiUsers,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

const DocenteDashboard = () => {
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [entregasPendientes, setEntregasPendientes] = useState([]);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError('');
      const [rEst, rTareas, rPend] = await Promise.all([
        api.get('/docente/estudiantes'),
        api.get('/docente/tareas'),
        api.get('/docente/entregas/pendientes?limit=8'),
      ]);
      setEstudiantes(rEst.data.data || []);
      setTareas(rTareas.data.data || []);
      setEntregasPendientes(rPend.data.data || []);
    } catch (err) {
      setError(err?.message || 'No se pudo cargar el panel docente.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const resumen = useMemo(() => {
    let enProceso = 0;
    let finalizados = 0;

    for (const inscripcion of estudiantes) {
      const estado = inscripcion?.estudiante?.estadoProceso;
      if (estado === 'en_proceso') enProceso += 1;
      if (estado === 'finalizado') finalizados += 1;
    }

    return {
      estudiantes: estudiantes.length,
      tareasCreadas: tareas.length,
      entregasPorCalificar: entregasPendientes.length,
      enProceso,
      finalizados,
    };
  }, [estudiantes, tareas, entregasPendientes]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="h-[calc(100vh-64px)] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Panel Docente</h1>
            <p className="text-gray-500 mt-1">
              Bienvenido, <strong>{usuario?.email}</strong>. Gestiona tareas por ciclos y calificaciones.
            </p>
            {error && <p className="text-rose-600 mt-2">{error}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/docente/ciclos"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl"
            >
              <FiClipboard /> Gestion de Ciclos y Tareas
            </Link>
            <Link
              to="/docente/estudiantes"
              className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-xl"
            >
              <FiUsers /> Ver estudiantes
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <p className="text-sm text-gray-500">Estudiantes tutelados</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{resumen.estudiantes}</p>
          </div>
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <p className="text-sm text-gray-500">Tareas creadas</p>
            <p className="text-3xl font-black text-indigo-700 mt-1">{resumen.tareasCreadas}</p>
          </div>
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <p className="text-sm text-gray-500">Entregas por calificar</p>
            <p className="text-3xl font-black text-rose-700 mt-1">{resumen.entregasPorCalificar}</p>
          </div>
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <p className="text-sm text-gray-500">En proceso</p>
            <p className="text-3xl font-black text-amber-700 mt-1">{resumen.enProceso}</p>
          </div>
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <p className="text-sm text-gray-500">Finalizados</p>
            <p className="text-3xl font-black text-emerald-700 mt-1">{resumen.finalizados}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Entregas recientes pendientes de calificacion</h2>
            <Link to="/docente/ciclos" className="text-indigo-600 font-semibold inline-flex items-center gap-1">
              Ir a ciclos <FiArrowRight />
            </Link>
          </div>

          {entregasPendientes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No hay entregas pendientes por calificar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="text-left px-4 py-3">Estudiante</th>
                    <th className="text-left px-4 py-3">Tarea</th>
                    <th className="text-left px-4 py-3">Archivo</th>
                    <th className="text-left px-4 py-3">Fecha entrega</th>
                    <th className="text-left px-4 py-3">Estado</th>
                    <th className="text-left px-4 py-3">Accion</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entregasPendientes.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{e.inscripcion?.estudiante?.nombres || 'Sin nombre'}</p>
                        <p className="text-xs text-gray-500">{e.inscripcion?.estudiante?.usuario?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{e.tarea?.codigo}</p>
                        <p className="text-xs text-gray-500">{e.tarea?.titulo}</p>
                      </td>
                      <td className="px-4 py-3">{e.nombreArchivo}</td>
                      <td className="px-4 py-3">{new Date(e.fechaEntrega).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${e.estado === 'tarde' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
                          {e.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/docente/tareas/${e.tarea?.id}`}
                          className="inline-flex items-center gap-1 text-indigo-600 font-semibold"
                        >
                          <FiBookOpen /> Calificar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <FiAlertCircle /> Recordatorio
            </p>
            <p className="text-gray-800 mt-2">
              Las entregas fuera de la ventana ya no se aceptan. Valida fechas de apertura/cierre al crear cada tarea.
            </p>
          </div>
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <FiCheckCircle /> Estado del modulo
            </p>
            <p className="text-gray-800 mt-2">
              Sistema de ciclos activo con calificacion sobre 10 y promedio automatico por ciclo/nota final.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocenteDashboard;
