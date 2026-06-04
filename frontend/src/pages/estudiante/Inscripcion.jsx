import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../services/api';
import {
  FiCheckCircle,
  FiAlertCircle,
  FiUsers,
  FiBriefcase,
  FiSearch,
  FiArrowLeft,
} from 'react-icons/fi';

const Inscripcion = () => {
  const navigate = useNavigate();
  const [convenios, setConvenios] = useState([]);
  const [conveniosFiltrados, setConveniosFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroModalidad, setFiltroModalidad] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const ITEMS_POR_PAGINA = 9;

  const [convenioSeleccionado, setConvenioSeleccionado] = useState(null);
  const [tipoPracticaSeleccionado, setTipoPracticaSeleccionado] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [estudiante, setEstudiante] = useState(null);
  const [tieneComunitariaAprobada, setTieneComunitariaAprobada] = useState(false);

  useEffect(() => {
    if (convenioSeleccionado) {
      const laboralDisponible = (convenioSeleccionado.cuposLaboralesTotales - convenioSeleccionado.cuposLaboralesOcupados) > 0 && tieneComunitariaAprobada;
      const comunitariaDisponible = (convenioSeleccionado.cuposComunitariosTotales - convenioSeleccionado.cuposComunitariosOcupados) > 0 && !tieneComunitariaAprobada;
      
      if (comunitariaDisponible) {
        setTipoPracticaSeleccionado('comunitaria');
      } else if (laboralDisponible) {
        setTipoPracticaSeleccionado('laboral');
      } else {
        setTipoPracticaSeleccionado('');
      }
    } else {
      setTipoPracticaSeleccionado('');
    }
  }, [convenioSeleccionado, tieneComunitariaAprobada]);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    filtrarConvenios();
  }, [busqueda, convenios, filtroArea, filtroModalidad]);

  const cargarDatosIniciales = async () => {
    try {
      // 1. Obtener dashboard / perfil del estudiante para validar semestre y comunitarias
      const dashboardRes = await api.get('/estudiante/dashboard');
      const studentData = dashboardRes.data.data.estudiante;
      setEstudiante(studentData);
      setTieneComunitariaAprobada(dashboardRes.data.data.tieneComunitariaAprobada);

      // Validar si completó sus datos de perfil (nombres, código, semestre)
      const datosCompletos = studentData.nombres && studentData.codigo && studentData.semestre;
      if (!datosCompletos) {
        setMensaje({
          tipo: 'error',
          texto: 'Bloqueado: Debes completar tus datos personales en el perfil antes de poder inscribirte a un convenio.',
        });
        setTimeout(() => {
          navigate('/estudiante/completar-datos');
        }, 3000);
        return;
      }

      // Redireccionar si el semestre es menor a 5
      if (studentData.semestre && studentData.semestre < 5) {
        setMensaje({
          tipo: 'error',
          texto: 'Bloqueado: Debes estar al menos en el 5to semestre para poder acceder a las prácticas preprofesionales.',
        });
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
        return;
      }

      // 2. Obtener convenios disponibles
      const response = await api.get('/convenios/disponibles');
      setConvenios(response.data.data);
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.message || 'Error al cargar los datos de inscripción',
      });
    } finally {
      setCargando(false);
    }
  };

  const filtrarConvenios = () => {
    let filtrados = convenios;

    // Filtro por búsqueda de texto
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      filtrados = filtrados.filter(
        (conv) =>
          conv.nombreEmpresa.toLowerCase().includes(busquedaLower) ||
          conv.area.toLowerCase().includes(busquedaLower)
      );
    }

    // Filtro por área dinámica
    if (filtroArea) {
      filtrados = filtrados.filter((conv) => conv.area === filtroArea);
    }

    // Filtro por modalidad de cupos
    if (filtroModalidad) {
      if (filtroModalidad === 'laboral') {
        filtrados = filtrados.filter(
          (conv) => (conv.cuposLaboralesTotales - conv.cuposLaboralesOcupados) > 0
        );
      } else if (filtroModalidad === 'comunitaria') {
        filtrados = filtrados.filter(
          (conv) => (conv.cuposComunitariosTotales - conv.cuposComunitariosOcupados) > 0
        );
      }
    }

    setPaginaActual(1);
    setConveniosFiltrados(filtrados);
  };

  const inscribirse = () => {
    if (!convenioSeleccionado) {
      setMensaje({
        tipo: 'error',
        texto: 'Por favor selecciona un convenio',
      });
      return;
    }

    if (!tipoPracticaSeleccionado) {
      setMensaje({
        tipo: 'error',
        texto: 'Por favor selecciona una modalidad de práctica (Laboral o Comunitaria)',
      });
      return;
    }

    setMostrarConfirmacion(true);
  };

  const inscribirseConfirmada = async () => {
    setProcesando(true);
    setMostrarConfirmacion(false);
    try {
      await api.post('/inscripciones', {
        convenioId: convenioSeleccionado.id,
        tipoPractica: tipoPracticaSeleccionado,
      });

      setMensaje({
        tipo: 'success',
        texto: '¡Inscripción aprobada automáticamente! Redirigiendo al dashboard...',
      });

      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.message || error.message || 'Error al enviar inscripción',
      });
      setProcesando(false);
    }
  };

  const cuposDisponibles = (convenio) => {
    return convenio.cuposTotales - convenio.cuposOcupados;
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-1">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 text-[10px] font-black text-slate-555 hover:text-[#ec3724] transition-colors uppercase tracking-widest bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200"
            >
              <FiArrowLeft className="h-3.5 w-3.5" /> Volver al Dashboard
            </button>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide pt-3">
              Inscripción a Prácticas Preprofesionales
            </h1>
            <p className="text-xs font-semibold text-slate-500">
              Selecciona el convenio o proyecto en el que deseas realizar tu progreso académico.
            </p>
          </div>
        </div>

        {/* Mensaje */}
        {mensaje.texto && (
          <div
            className={`alert ${
              mensaje.tipo === 'success' ? 'alert-success' : 'alert-error'
            } flex items-center gap-2 mb-6`}
          >
            {mensaje.tipo === 'success' ? (
              <FiCheckCircle className="h-4.5 w-4.5 flex-shrink-0" />
            ) : (
              <FiAlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
            )}
            <span className="uppercase text-[10px] font-black tracking-wider">{mensaje.texto}</span>
          </div>
        )}

        {/* Información importante */}
        <div className="bg-white border border-slate-200 border-l-4 border-l-[#ec3724] rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-rose-50 text-[#ec3724] rounded-lg">
              <FiAlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Requisitos y Normas de Inscripción
              </h3>
              <ul className="text-[11px] text-slate-500 font-semibold space-y-1.5 leading-relaxed">
                <li>
                  ✓ Asegúrate de haber completado tus datos personales y código de estudiante en tu perfil antes de inscribirte.
                </li>
                <li>
                  ✓ Solo puedes mantener una solicitud de inscripción activa a la vez por periodo académico.
                </li>
                <li>
                  ✓ Tu inscripción será evaluada formalmente por el tutor académico asignado.
                </li>
                <li>
                  ✓ Recibirás notificaciones en tiempo real cuando tu cupo sea aprobado y validado.
                </li>
                <li>
                  ✓ Lee atentamente las vacantes por modalidad (Laborales o Comunitarias) de cada convenio.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        {convenios.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Buscador de texto */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por empresa..."
                  className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
                />
              </div>

              {/* Filtro de Área dinámico */}
              <div>
                <select
                  value={filtroArea}
                  onChange={(e) => setFiltroArea(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
                >
                  <option value="">Todas las Áreas</option>
                  {[...new Set(convenios.map((c) => c.area))].map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de Modalidad */}
              <div>
                <select
                  value={filtroModalidad}
                  onChange={(e) => setFiltroModalidad(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
                >
                  <option value="">Todas las Modalidades</option>
                  <option value="laboral">💼 Con cupos Laborales</option>
                  <option value="comunitaria">🤝 Con cupos Comunales</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Lista de convenios */}
        {conveniosFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <FiBriefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1">
              {(busqueda || filtroArea || filtroModalidad) ? 'No se encontraron resultados' : 'No hay convenios cargados'}
            </h3>
            <p className="text-[11px] font-semibold text-slate-500">
              {(busqueda || filtroArea || filtroModalidad)
                ? 'Intenta refinando tus términos de búsqueda o filtros.'
                : 'Por favor, contacta con la coordinación de la carrera.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {conveniosFiltrados
                .slice((paginaActual - 1) * ITEMS_POR_PAGINA, paginaActual * ITEMS_POR_PAGINA)
                .map((convenio) => {
                  const isSelected = convenioSeleccionado?.id === convenio.id;
                  return (
                    <div
                      key={convenio.id}
                      onClick={() => setConvenioSeleccionado(convenio)}
                      className={`bg-white rounded-xl border p-5 transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#ec3724] ring-1 ring-[#ec3724]'
                          : 'border-slate-200 hover:border-slate-350 hover:shadow-md'
                      }`}
                    >
                      {/* Indicador lateral rojo si seleccionado */}
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ec3724]" />
                      )}

                      {/* Header */}
                      <div className="space-y-1 mb-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide line-clamp-2">
                            {convenio.nombreEmpresa}
                          </h3>
                          {isSelected && (
                            <FiCheckCircle className="h-4.5 w-4.5 text-[#ec3724] flex-shrink-0" />
                          )}
                        </div>
                        <span className="inline-block text-[9px] font-black text-[#ec3724] uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded border border-rose-100/50">
                          {convenio.area}
                        </span>
                      </div>

                      {/* Cupos */}
                      <div className="space-y-2 mb-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <span className="flex items-center uppercase tracking-wider">
                            <FiUsers className="h-3.5 w-3.5 mr-1" />
                            Cupos Disponibles:
                          </span>
                          <span className="font-black text-slate-800">
                            {cuposDisponibles(convenio)} / {convenio.cuposTotales}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[9px] pt-1">
                          <div className="bg-slate-50 border border-slate-200/60 p-2 rounded">
                            <span className="block text-slate-450 font-bold uppercase tracking-wider">💼 Laborales</span>
                            <strong className="text-slate-800 text-xs font-black">
                              {convenio.cuposLaboralesTotales - convenio.cuposLaboralesOcupados} / {convenio.cuposLaboralesTotales}
                            </strong>
                          </div>
                          <div className="bg-slate-50 border border-slate-200/60 p-2 rounded">
                            <span className="block text-slate-450 font-bold uppercase tracking-wider">🤝 Comunales</span>
                            <strong className="text-slate-800 text-xs font-black">
                              {convenio.cuposComunitariosTotales - convenio.cuposComunitariosOcupados} / {convenio.cuposComunitariosTotales}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Badge de Estado */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="inline-flex px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-[9px] font-black uppercase tracking-wider">
                          Activo y disponible
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Paginación */}
            {Math.ceil(conveniosFiltrados.length / ITEMS_POR_PAGINA) > 1 && (
              <div className="flex justify-center items-center gap-4 pt-4 pb-2">
                <button
                  type="button"
                  onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                  disabled={paginaActual === 1}
                  className="px-3.5 py-2 rounded-lg border border-slate-250 bg-white text-[10px] font-black text-slate-650 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 uppercase tracking-widest"
                >
                  Anterior
                </button>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Página {paginaActual} de {Math.ceil(conveniosFiltrados.length / ITEMS_POR_PAGINA)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPaginaActual((prev) =>
                      Math.min(prev + 1, Math.ceil(conveniosFiltrados.length / ITEMS_POR_PAGINA))
                    )
                  }
                  disabled={paginaActual === Math.ceil(conveniosFiltrados.length / ITEMS_POR_PAGINA)}
                  className="px-3.5 py-2 rounded-lg border border-slate-250 bg-white text-[10px] font-black text-slate-650 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 uppercase tracking-widest"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}

        {/* Botón de inscripción y Selección de Modalidad */}
        {convenioSeleccionado && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-[#ec3724] relative overflow-hidden transition-all duration-300">
            {/* Indicador superior rojo */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#ec3724]" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              {/* Información del convenio */}
              <div className="lg:col-span-1 space-y-2">
                <span className="inline-block text-[9px] font-black text-[#ec3724] bg-rose-50 px-2 py-0.5 rounded border border-rose-100/50 uppercase tracking-wider">
                  Convenio Seleccionado
                </span>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  {convenioSeleccionado.nombreEmpresa}
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  <strong>Área Académica:</strong> {convenioSeleccionado.area}
                </p>
                {convenioSeleccionado.contacto && (
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed border-t border-slate-100 pt-2">
                    <strong>Tutor/Contacto:</strong> {convenioSeleccionado.contacto}
                  </p>
                )}
              </div>

              {/* Selector de Modalidad */}
              <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l lg:border-r border-slate-100 lg:px-6 py-4 lg:py-0 space-y-3">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                  Selecciona la Modalidad de Práctica *
                </label>
                <div className="flex flex-col space-y-2">
                  {/* Práctica Laboral */}
                  <label
                    className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                      tipoPracticaSeleccionado === 'laboral'
                        ? 'border-[#ec3724] bg-rose-50/20 text-[#ec3724]'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    } ${
                      (convenioSeleccionado.cuposLaboralesTotales - convenioSeleccionado.cuposLaboralesOcupados <= 0) || !tieneComunitariaAprobada
                        ? 'opacity-50 cursor-not-allowed bg-slate-50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tipoPractica"
                          value="laboral"
                          checked={tipoPracticaSeleccionado === 'laboral'}
                          onChange={(e) => setTipoPracticaSeleccionado(e.target.value)}
                          disabled={(convenioSeleccionado.cuposLaboralesTotales - convenioSeleccionado.cuposLaboralesOcupados <= 0) || !tieneComunitariaAprobada}
                          className="h-3.5 w-3.5 text-[#ec3724] focus:ring-[#ec3724] border-slate-300"
                        />
                        <span className="text-xs font-bold uppercase tracking-wider">💼 Práctica Laboral</span>
                      </div>
                      <span className="text-[10px] font-black">
                        {convenioSeleccionado.cuposLaboralesTotales - convenioSeleccionado.cuposLaboralesOcupados} cupos disp.
                      </span>
                    </div>
                    {!tieneComunitariaAprobada && (
                      <span className="block text-[8px] text-[#ec3724] font-black uppercase tracking-wider mt-1.5 pl-5">
                        ⚠️ Requiere Prácticas Comunitarias aprobadas primero
                      </span>
                    )}
                  </label>

                  {/* Práctica Comunitaria */}
                  <label
                    className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                      tipoPracticaSeleccionado === 'comunitaria'
                        ? 'border-emerald-600 bg-emerald-50/20 text-emerald-800'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    } ${
                      (convenioSeleccionado.cuposComunitariosTotales - convenioSeleccionado.cuposComunitariosOcupados <= 0) || tieneComunitariaAprobada
                        ? 'opacity-50 cursor-not-allowed bg-slate-50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tipoPractica"
                          value="comunitaria"
                          checked={tipoPracticaSeleccionado === 'comunitaria'}
                          onChange={(e) => setTipoPracticaSeleccionado(e.target.value)}
                          disabled={(convenioSeleccionado.cuposComunitariosTotales - convenioSeleccionado.cuposComunitariosOcupados <= 0) || tieneComunitariaAprobada}
                          className="h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span className="text-xs font-bold uppercase tracking-wider">🤝 Práctica Comunitaria</span>
                      </div>
                      <span className="text-[10px] font-black">
                        {convenioSeleccionado.cuposComunitariosTotales - convenioSeleccionado.cuposComunitariosOcupados} cupos disp.
                      </span>
                    </div>
                    {tieneComunitariaAprobada && (
                      <span className="block text-[8px] text-emerald-600 font-black uppercase tracking-wider mt-1.5 pl-5">
                        ✓ Ya has aprobado tus Prácticas Comunitarias
                      </span>
                    )}
                  </label>
                </div>
              </div>

              {/* Botón de Confirmación */}
              <div className="lg:col-span-1 flex flex-col justify-center space-y-2">
                <button
                  onClick={inscribirse}
                  disabled={!tipoPracticaSeleccionado || procesando}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {procesando ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Inscribiendo...</span>
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="h-4.5 w-4.5" />
                      <span>Confirmar Inscripción</span>
                    </>
                  )}
                </button>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center">
                  * Sujeto a revisión y aprobación del tutor
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmación Personalizado (Reemplazo de confirm/alert nativos) */}
        {mostrarConfirmacion && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-scaleIn">
              <div className="flex items-center gap-3 mb-4 text-amber-600">
                <FiAlertCircle className="h-6 w-6 flex-shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider">Confirmar Inscripción</h3>
              </div>
              <p className="text-xs font-semibold text-slate-655 text-slate-500 leading-relaxed mb-6">
                ¿Estás seguro de inscribirte a la modalidad de práctica <strong className="text-slate-800 uppercase">{tipoPracticaSeleccionado}</strong> en el convenio <strong className="text-slate-800">{convenioSeleccionado?.nombreEmpresa}</strong>?
                <br /><br />
                Esta postulación iniciará de manera formal tu vinculación académica en el periodo vigente.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarConfirmacion(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 hover:bg-slate-50 uppercase tracking-widest transition duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={inscribirseConfirmada}
                  disabled={procesando}
                  className="px-4 py-2 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-lg text-[10px] font-black uppercase tracking-widest transition duration-200 shadow-sm active:scale-[0.98]"
                >
                  {procesando ? 'Procesando...' : 'Sí, Inscribirme'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inscripcion;