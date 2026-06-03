import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiChevronDown, FiChevronUp, FiArrowLeft } from 'react-icons/fi';
import Navbar from '../../components/Navbar';
import api from '../../services/api';

const colorNota = (nota) => {
  if (nota === null || nota === undefined) return 'text-slate-500';
  if (nota >= 7) return 'text-emerald-700';
  if (nota >= 5) return 'text-amber-700';
  return 'text-rose-700';
};

const bgNota = (nota) => {
  if (nota === null || nota === undefined) return 'bg-slate-200';
  if (nota >= 7) return 'bg-emerald-500';
  if (nota >= 5) return 'bg-amber-500';
  return 'bg-[#ec3724]';
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Enlace atrás */}
        <div>
          <Link
            to={`/docente/estudiantes/${id}`}
            className="inline-flex items-center space-x-2 text-slate-600 hover:text-[#ec3724] font-bold text-xs transition"
          >
            <FiArrowLeft className="h-4 w-4" />
            <span>Volver al detalle del estudiante</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl border-l-4 border-l-[#ec3724] border-t border-r border-b border-slate-200 shadow-sm p-6">
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Libro de Calificaciones</h1>
          {data && (
            <>
              <p className="text-slate-600 mt-2 text-xs font-semibold">
                Estudiante: <strong className="text-slate-800 font-bold">{data.estudiante?.nombres || data.estudiante?.usuario?.email}</strong>
              </p>
              <p className="text-slate-600 text-xs font-semibold">
                Modalidad: <strong className="capitalize text-slate-800 font-bold">{data.tipoPractica}</strong>
              </p>
              <p className={`text-xl font-black mt-3 ${colorNota(data.notaFinal)}`}>
                Nota final: {data.notaFinal ?? '--'}
              </p>
            </>
          )}
          {error && <p className="text-rose-600 text-xs font-semibold mt-3">{error}</p>}
        </div>

        {data?.ciclos?.map((ciclo) => {
          const open = openCycle[ciclo.numeroCiclo];
          const promedio = ciclo.promedio;
          const percent = promedio !== null && promedio !== undefined ? Math.min(100, Math.max(0, (promedio / 10) * 100)) : 0;

          return (
            <div key={ciclo.numeroCiclo} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-200"
                onClick={() => setOpenCycle((prev) => ({ ...prev, [ciclo.numeroCiclo]: !prev[ciclo.numeroCiclo] }))}
              >
                <div className="text-left">
                  <p className="font-bold text-slate-900 text-xs">Ciclo {ciclo.numeroCiclo}</p>
                  <p className={`text-xs font-bold ${colorNota(promedio)}`}>Promedio: {promedio ?? '--'}</p>
                </div>
                {open ? <FiChevronUp /> : <FiChevronDown />}
              </button>

              <div className="px-5 py-2.5 border-b border-slate-100">
                <div className="w-full bg-slate-100 rounded-full h-1">
                  <div className={`h-1 rounded-full ${bgNota(promedio)}`} style={{ width: `${percent}%` }} />
                </div>
              </div>

              {open && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-55 bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Tarea</th>
                        <th className="px-4 py-3">Puntos</th>
                        <th className="px-4 py-3">Nota</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Comentario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ciclo.tareas.length === 0 ? (
                        <tr>
                          <td className="px-4 py-4 text-slate-400 font-bold uppercase tracking-wider text-center" colSpan={5}>No hay tareas registradas.</td>
                        </tr>
                      ) : (
                        ciclo.tareas.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <p className="font-bold text-slate-800">{t.codigo} - {t.titulo}</p>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-600">
                              {t.entrega?.nota ?? '--'} / {t.puntajeMaximo}
                            </td>
                            <td className={`px-4 py-3.5 whitespace-nowrap font-bold ${colorNota(t.entrega?.nota ?? null)}`}>
                              {t.entrega?.nota ?? '--'}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.entrega?.estado === 'calificada' || t.entrega?.estado === 'aprobado'
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : t.entrega?.estado === 'sin_entrega' || !t.entrega
                                  ? 'bg-slate-50 text-slate-400 border border-slate-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-250'
                              }`}>
                                {t.entrega?.estado || 'sin_entrega'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 font-medium">{t.entrega?.comentarioDocente || '--'}</td>
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
