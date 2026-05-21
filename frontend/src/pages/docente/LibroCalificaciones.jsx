import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiChevronDown, FiChevronUp, FiArrowLeft } from 'react-icons/fi';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

const colorNota = (nota) => {
  if (nota === null || nota === undefined) return 'text-gray-500';
  if (nota >= 7) return 'text-emerald-700';
  if (nota >= 5) return 'text-amber-700';
  return 'text-rose-700';
};

const bgNota = (nota) => {
  if (nota === null || nota === undefined) return 'bg-gray-200';
  if (nota >= 7) return 'bg-emerald-500';
  if (nota >= 5) return 'bg-amber-500';
  return 'bg-rose-500';
};

const LibroCalificaciones = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [openCycle, setOpenCycle] = useState({ 1: true, 2: true, 3: true });

  useEffect(() => {
    const cargar = async () => {
      try {
        setError('');
        const response = await api.get(`/docente/estudiantes/${id}/calificaciones`);
        setData(response.data.data);
      } catch (err) {
        setError(err?.message || 'No se pudo cargar el libro de calificaciones.');
      }
    };
    cargar();
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Enlace atrás */}
        <div>
          <Link
            to={`/docente/estudiantes/${id}`}
            className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 font-bold transition"
          >
            <FiArrowLeft className="h-5 w-5" />
            <span>Volver al detalle del estudiante</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 border shadow-sm">
          <h1 className="text-3xl font-black text-gray-900">Libro de Calificaciones</h1>
          {data && (
            <>
              <p className="text-gray-600 mt-1">
                Estudiante: <strong>{data.estudiante?.nombres || data.estudiante?.usuario?.email}</strong>
              </p>
              <p className="text-gray-600">
                Modalidad: <strong className="capitalize">{data.tipoPractica}</strong>
              </p>
              <p className={`text-2xl font-black mt-3 ${colorNota(data.notaFinal)}`}>
                Nota final: {data.notaFinal ?? '--'}
              </p>
            </>
          )}
          {error && <p className="text-rose-600 mt-3">{error}</p>}
        </div>

        {data?.ciclos?.map((ciclo) => {
          const open = openCycle[ciclo.numeroCiclo];
          const promedio = ciclo.promedio;
          const percent = promedio !== null && promedio !== undefined ? Math.min(100, Math.max(0, (promedio / 10) * 100)) : 0;

          return (
            <div key={ciclo.numeroCiclo} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <button
                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50"
                onClick={() => setOpenCycle((prev) => ({ ...prev, [ciclo.numeroCiclo]: !prev[ciclo.numeroCiclo] }))}
              >
                <div className="text-left">
                  <p className="font-black text-gray-900">Ciclo {ciclo.numeroCiclo}</p>
                  <p className={`text-sm font-semibold ${colorNota(promedio)}`}>Promedio: {promedio ?? '--'}</p>
                </div>
                {open ? <FiChevronUp /> : <FiChevronDown />}
              </button>

              <div className="px-6 py-3 border-b">
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full ${bgNota(promedio)}`} style={{ width: `${percent}%` }} />
                </div>
              </div>

              {open && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                      <tr>
                        <th className="text-left px-4 py-3">Tarea</th>
                        <th className="text-left px-4 py-3">Puntos</th>
                        <th className="text-left px-4 py-3">Nota</th>
                        <th className="text-left px-4 py-3">Estado</th>
                        <th className="text-left px-4 py-3">Comentario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ciclo.tareas.length === 0 ? (
                        <tr>
                          <td className="px-4 py-4 text-gray-500" colSpan={5}>No hay tareas registradas.</td>
                        </tr>
                      ) : (
                        ciclo.tareas.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-900">{t.codigo} - {t.titulo}</p>
                            </td>
                            <td className="px-4 py-3">
                              {t.entrega?.nota ?? '--'} / {t.puntajeMaximo}
                            </td>
                            <td className={`px-4 py-3 font-bold ${colorNota(t.entrega?.nota ?? null)}`}>
                              {t.entrega?.nota ?? '--'}
                            </td>
                            <td className="px-4 py-3">{t.entrega?.estado || 'sin_entrega'}</td>
                            <td className="px-4 py-3 text-gray-600">{t.entrega?.comentarioDocente || '--'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LibroCalificaciones;
