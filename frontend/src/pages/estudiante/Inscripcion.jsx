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
  }, [busqueda, convenios]);

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
    if (!busqueda.trim()) {
      setConveniosFiltrados(convenios);
      return;
    }

    const busquedaLower = busqueda.toLowerCase();
    const filtrados = convenios.filter(
      (conv) =>
        conv.nombreEmpresa.toLowerCase().includes(busquedaLower) ||
        conv.area.toLowerCase().includes(busquedaLower)
    );
    setConveniosFiltrados(filtrados);
  };

  const inscribirse = async () => {
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

    if (
      !window.confirm(
        `¿Estás seguro de inscribirte a la práctica ${tipoPracticaSeleccionado} en este convenio? Se aprobará automáticamente si hay cupos disponibles.`
      )
    ) {
      return;
    }

    setProcesando(true);
    try {
      await api.post('/inscripciones', {
        convenioId: convenioSeleccionado.id,
        tipoPractica: tipoPracticaSeleccionado,
      });

      setMensaje({
        tipo: 'success',
        texto:
          '¡Inscripción aprobada automáticamente! Redirigiendo al dashboard...',
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-gray-500 hover:text-indigo-600 font-medium mb-4 transition-colors group cursor-pointer"
          >
            <FiArrowLeft className="h-5 w-5 transform group-hover:-translate-x-1 transition-transform duration-200" />
            <span>Volver al Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Inscripción a Prácticas Preprofesionales
          </h1>
          <p className="text-gray-600">
            Selecciona el convenio en el que deseas realizar tus prácticas
          </p>
        </div>

        {/* Mensaje */}
        {mensaje.texto && (
          <div
            className={`alert ${
              mensaje.tipo === 'success' ? 'alert-success' : 'alert-error'
            } flex items-center space-x-2 mb-6`}
          >
            {mensaje.tipo === 'success' ? (
              <FiCheckCircle className="h-5 w-5" />
            ) : (
              <FiAlertCircle className="h-5 w-5" />
            )}
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Información importante */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-3">
            <FiAlertCircle className="h-6 w-6 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-blue-900 mb-2">
                Información Importante
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>
                  ✓ Asegúrate de haber completado tus datos personales antes de
                  inscribirte
                </li>
                <li>
                  ✓ Solo puedes inscribirte a un convenio a la vez
                </li>
                <li>
                  ✓ Tu inscripción será revisada por el administrador
                </li>
                <li>
                  ✓ Recibirás una notificación cuando tu inscripción sea aprobada
                </li>
                <li>
                  ✓ Lee atentamente el área de cada convenio antes de seleccionar
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Barra de búsqueda */}
        {convenios.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por empresa o área..."
                className="input pl-10"
              />
            </div>
          </div>
        )}

        {/* Lista de convenios */}
        {conveniosFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FiBriefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {busqueda
                ? 'No se encontraron convenios'
                : 'No hay convenios disponibles'}
            </h3>
            <p className="text-gray-600">
              {busqueda
                ? 'Intenta con otros términos de búsqueda'
                : 'Por favor contacta al administrador'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {conveniosFiltrados.map((convenio) => (
              <div
                key={convenio.id}
                onClick={() => setConvenioSeleccionado(convenio)}
                className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer p-6 ${
                  convenioSeleccionado?.id === convenio.id
                    ? 'ring-2 ring-primary-500 border-primary-500'
                    : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {convenio.nombreEmpresa}
                    </h3>
                    <p className="text-sm text-gray-600">{convenio.area}</p>
                  </div>
                  {convenioSeleccionado?.id === convenio.id && (
                    <FiCheckCircle className="h-6 w-6 text-primary-600" />
                  )}
                </div>

                {/* Cupos */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center">
                      <FiUsers className="h-4 w-4 mr-1" />
                      Total de Cupos
                    </span>
                    <span className="font-semibold text-gray-700">
                      {cuposDisponibles(convenio)} / {convenio.cuposTotales}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 mt-2">
                    <div className="bg-indigo-50 p-2 rounded">
                      <span className="block text-gray-500 font-medium">💼 Laborales</span>
                      <strong className="text-indigo-800">
                        {convenio.cuposLaboralesTotales - convenio.cuposLaboralesOcupados} / {convenio.cuposLaboralesTotales}
                      </strong>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded">
                      <span className="block text-gray-500 font-medium">🤝 Comunitarias</span>
                      <strong className="text-emerald-800">
                        {convenio.cuposComunitariosTotales - convenio.cuposComunitariosOcupados} / {convenio.cuposComunitariosTotales}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Badge */}
                <div className="pt-3 border-t">
                  <span className="badge badge-success text-xs">
                    Activo y disponible
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botón de inscripción y Selección de Modalidad */}
        {convenioSeleccionado && (
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-primary-500 transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              {/* Información del convenio */}
              <div className="lg:col-span-1">
                <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Convenio Seleccionado
                </span>
                <h3 className="text-xl font-bold text-gray-900 mt-2 mb-1">
                  {convenioSeleccionado.nombreEmpresa}
                </h3>
                <p className="text-sm text-gray-600">
                  <strong>Área:</strong> {convenioSeleccionado.area}
                </p>
                {convenioSeleccionado.contacto && (
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Tutor/Contacto:</strong> {convenioSeleccionado.contacto}
                  </p>
                )}
              </div>

              {/* Selector de Modalidad */}
              <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l lg:border-r border-gray-100 lg:px-6 py-4 lg:py-0">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Selecciona la Modalidad de Práctica *
                </label>
                <div className="flex flex-col space-y-2">
                  {/* Práctica Laboral */}
                  <label
                    className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      tipoPracticaSeleccionado === 'laboral'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    } ${
                      (convenioSeleccionado.cuposLaboralesTotales - convenioSeleccionado.cuposLaboralesOcupados <= 0) || !tieneComunitariaAprobada
                        ? 'opacity-60 cursor-not-allowed bg-gray-50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="tipoPractica"
                          value="laboral"
                          checked={tipoPracticaSeleccionado === 'laboral'}
                          onChange={(e) => setTipoPracticaSeleccionado(e.target.value)}
                          disabled={(convenioSeleccionado.cuposLaboralesTotales - convenioSeleccionado.cuposLaboralesOcupados <= 0) || !tieneComunitariaAprobada}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span>💼 Práctica Laboral</span>
                      </div>
                      <span className="text-xs">
                        {convenioSeleccionado.cuposLaboralesTotales - convenioSeleccionado.cuposLaboralesOcupados} cupos disp.
                      </span>
                    </div>
                    {!tieneComunitariaAprobada && (
                      <span className="block text-[10px] text-red-600 font-semibold mt-1.5 pl-7">
                        ⚠️ Requiere Prácticas Comunitarias aprobadas primero
                      </span>
                    )}
                  </label>

                  {/* Práctica Comunitaria */}
                  <label
                    className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      tipoPracticaSeleccionado === 'comunitaria'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    } ${
                      (convenioSeleccionado.cuposComunitariosTotales - convenioSeleccionado.cuposComunitariosOcupados <= 0) || tieneComunitariaAprobada
                        ? 'opacity-60 cursor-not-allowed bg-gray-50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="tipoPractica"
                          value="comunitaria"
                          checked={tipoPracticaSeleccionado === 'comunitaria'}
                          onChange={(e) => setTipoPracticaSeleccionado(e.target.value)}
                          disabled={(convenioSeleccionado.cuposComunitariosTotales - convenioSeleccionado.cuposComunitariosOcupados <= 0) || tieneComunitariaAprobada}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                        />
                        <span>🤝 Práctica Comunitaria</span>
                      </div>
                      <span className="text-xs">
                        {convenioSeleccionado.cuposComunitariosTotales - convenioSeleccionado.cuposComunitariosOcupados} cupos disp.
                      </span>
                    </div>
                    {tieneComunitariaAprobada && (
                      <span className="block text-[10px] text-emerald-600 font-semibold mt-1.5 pl-7">
                        ✓ Ya has aprobado tus Prácticas Comunitarias
                      </span>
                    )}
                  </label>
                </div>
              </div>

              {/* Botón de Confirmación */}
              <div className="lg:col-span-1 flex flex-col justify-center">
                <button
                  onClick={inscribirse}
                  disabled={!tipoPracticaSeleccionado || procesando}
                  className="btn btn-primary w-full py-4 text-base font-bold shadow-lg hover:shadow-xl hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center justify-center space-x-2"
                >
                  {procesando ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Inscribiendo...</span>
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="h-5 w-5" />
                      <span>Confirmar Inscripción</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  * Sujeto a revisión y aprobación del tutor
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inscripcion;