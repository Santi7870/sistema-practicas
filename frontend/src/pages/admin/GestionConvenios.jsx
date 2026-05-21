import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiUsers,
  FiX,
  FiSave,
  FiAlertCircle,
  FiAlertTriangle,
  FiUser,
  FiPhone,
  FiClock,
  FiBookOpen,
  FiUpload,
  FiCheck,
  FiFileText,
} from 'react-icons/fi';

const GestionConvenios = () => {
  const [convenios, setConvenios] = useState([]);
  const [conveniosFiltrados, setConveniosFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [convenioEditando, setConvenioEditando] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Estados para Carga Masiva desde Excel
  const [modoPrevisualizacion, setModoPrevisualizacion] = useState(false);
  const [datosPrevisualizacion, setDatosPrevisualizacion] = useState([]);
  const [hojasCompatibles, setHojasCompatibles] = useState([]);
  const [sheetSeleccionada, setSheetSeleccionada] = useState('');
  const [sheetsDataReferencia, setSheetsDataReferencia] = useState({});
  const [guardandoMasivo, setGuardandoMasivo] = useState(false);

  useEffect(() => {
    cargarConvenios();
  }, []);

  useEffect(() => {
    filtrarConvenios();
  }, [busqueda, convenios]);

  // Auxiliares para procesamiento inteligente de Excel
  const determinarArea = (actividades) => {
    if (!actividades) return 'Desarrollo de Software';
    const text = actividades.toLowerCase();
    if (
      text.includes('software') || 
      text.includes('sistema') || 
      text.includes('página') || 
      text.includes('pagina') || 
      text.includes('web') || 
      text.includes('programación') || 
      text.includes('programacion') || 
      text.includes('desarrollo') ||
      text.includes('aplicación') ||
      text.includes('aplicacion') ||
      text.includes('código') ||
      text.includes('backend') ||
      text.includes('frontend')
    ) {
      return 'Desarrollo de Software';
    }
    if (
      text.includes('redes') || 
      text.includes('telecomunicaciones') || 
      text.includes('conectividad') || 
      text.includes('infraestructura') ||
      text.includes('enrutamiento') ||
      text.includes('switch') ||
      text.includes('router') ||
      text.includes('cableado') ||
      text.includes('red')
    ) {
      return 'Redes y Telecomunicaciones';
    }
    if (
      text.includes('seguridad') || 
      text.includes('ciberseguridad') || 
      text.includes('auditoría') ||
      text.includes('hacking') ||
      text.includes('vulnerabilidad') ||
      text.includes('firewall')
    ) {
      return 'Ciberseguridad';
    }
    if (
      text.includes('base de datos') || 
      text.includes('sql') || 
      text.includes('datos') || 
      text.includes('analítica') ||
      text.includes('analitica') ||
      text.includes('data') ||
      text.includes('mysql') ||
      text.includes('postgres') ||
      text.includes('oracle')
    ) {
      return 'Base de Datos';
    }
    return 'Desarrollo de Software'; // Default area
  };

  const cleanCellText = (val) => {
    if (val === undefined || val === null) return '';
    return String(val).trim().replace(/\r\n/g, '\n');
  };

  // Manejar cambio de archivo Excel
  const handleImportarExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Procesar hojas de forma inteligente
        const hojasCompatiblesArr = [];
        const sheetsDataObj = {};

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          
          // Buscar fila de cabecera en las primeras 15 filas
          let headerRowIndex = -1;
          for (let r = 0; r < Math.min(rows.length, 15); r++) {
            const row = rows[r];
            const hasEmpresa = row.some(cell => {
              const val = String(cell).toLowerCase();
              return val.includes('empresa') || val.includes('proyecto') || val.includes('institución') || val.includes('institucion') || val.includes('entidad');
            });
            const hasActividad = row.some(cell => {
              const val = String(cell).toLowerCase();
              return val.includes('actividad') || val.includes('actividades') || val.includes('funciones');
            });
            if (hasEmpresa && hasActividad) {
              headerRowIndex = r;
              break;
            }
          }

          if (headerRowIndex !== -1) {
            const headerRow = rows[headerRowIndex];
            const subHeaderRow = rows[headerRowIndex + 1] || [];
            
            // Mapear índices
            let colIndices = {
              nombreEmpresa: -1,
              contacto: -1,
              telefono: -1,
              actividades: -1,
              horario: -1,
              cuposLaboralesTotales: -1,
              cuposComunitariosTotales: -1
            };

            for (let c = 0; c < headerRow.length; c++) {
              const cellVal = String(headerRow[c] || '').toLowerCase().trim();
              
              if (cellVal.includes('empresa') || cellVal.includes('proyecto') || cellVal.includes('institución') || cellVal.includes('institucion') || cellVal.includes('entidad')) {
                colIndices.nombreEmpresa = c;
              } else if (cellVal.includes('contacto') || cellVal.includes('tutor') || cellVal.includes('responsable') || cellVal.includes('coordinador')) {
                colIndices.contacto = c;
              } else if (cellVal.includes('teléfono') || cellVal.includes('telefono') || cellVal.includes('celular') || cellVal.includes('tlf')) {
                colIndices.telefono = c;
              } else if (cellVal.includes('actividad') || cellVal.includes('actividades') || cellVal.includes('funciones') || cellVal.includes('tarea') || cellVal.includes('tareas') || cellVal.includes('perfil')) {
                colIndices.actividades = c;
              } else if (cellVal.includes('horario') || cellVal.includes('horarios') || cellVal.includes('jornada') || cellVal.includes('tiempo')) {
                colIndices.horario = c;
              }
            }

            // Buscar plazas laborales y comunitarias
            for (let c = 0; c < headerRow.length; c++) {
              const cellVal = String(headerRow[c] || '').toLowerCase().trim();
              const subCellVal = String(subHeaderRow[c] || '').toLowerCase().trim();

              if (cellVal.includes('laboral') || subCellVal.includes('laboral') || cellVal.includes('laborales') || subCellVal.includes('laborales')) {
                colIndices.cuposLaboralesTotales = c;
              }
              if (
                cellVal.includes('comunitaria') || subCellVal.includes('comunitaria') || 
                cellVal.includes('comunitarias') || subCellVal.includes('comunitarias') || 
                cellVal.includes('comunitario') || subCellVal.includes('comunitario') || 
                cellVal.includes('vincualción') || subCellVal.includes('vincualción') ||
                cellVal.includes('vinculación') || subCellVal.includes('vinculación') ||
                cellVal.includes('vinculacion') || subCellVal.includes('vinculacion')
              ) {
                colIndices.cuposComunitariosTotales = c;
              }
            }

            if (colIndices.nombreEmpresa !== -1 && colIndices.actividades !== -1) {
              // Calcular score
              let score = 10;
              if (colIndices.contacto !== -1) score += 10;
              if (colIndices.telefono !== -1) score += 10;
              if (colIndices.horario !== -1) score += 10;
              if (colIndices.cuposLaboralesTotales !== -1) score += 20;
              if (colIndices.cuposComunitariosTotales !== -1) score += 20;

              // Determinar si hay subHeader real
              const hasSubHeader = (colIndices.cuposLaboralesTotales !== -1 && String(subHeaderRow[colIndices.cuposLaboralesTotales] || '').toLowerCase().includes('laboral')) ||
                                   (colIndices.cuposComunitariosTotales !== -1 && (
                                     String(subHeaderRow[colIndices.cuposComunitariosTotales] || '').toLowerCase().includes('comunitaria') ||
                                     String(subHeaderRow[colIndices.cuposComunitariosTotales] || '').toLowerCase().includes('vinculación') ||
                                     String(subHeaderRow[colIndices.cuposComunitariosTotales] || '').toLowerCase().includes('vincualción')
                                   ));

              hojasCompatiblesArr.push({
                name: sheetName,
                score,
                headerRowIndex,
                colIndices,
                hasSubHeader
              });

              // Extraer datos
              const parsedRows = [];
              const startRow = headerRowIndex + (hasSubHeader ? 2 : 1);
              
              for (let r = startRow; r < rows.length; r++) {
                const row = rows[r];
                const rawNombre = String(row[colIndices.nombreEmpresa] || '').trim();
                
                // Ignorar filas no válidas
                if (!rawNombre || isNaN(Number(rawNombre)) === false || rawNombre.toLowerCase() === 'no.' || rawNombre.toLowerCase().includes('total') || rawNombre.toLowerCase().includes('resumen')) {
                  continue;
                }

                const actividadesText = colIndices.actividades !== -1 ? cleanCellText(row[colIndices.actividades]) : '';
                const cuposLaborales = colIndices.cuposLaboralesTotales !== -1 ? parseInt(row[colIndices.cuposLaboralesTotales]) || 0 : 0;
                const cuposComunitarios = colIndices.cuposComunitariosTotales !== -1 ? parseInt(row[colIndices.cuposComunitariosTotales]) || 0 : 0;

                // Ignorar firmas, nombres de coordinadores o ruido de pie de página
                // Si no tiene actividades y no tiene ninguna plaza asignada, es ruido o pie de página.
                if (!actividadesText && cuposLaborales === 0 && cuposComunitarios === 0) {
                  continue;
                }

                parsedRows.push({
                  id: `excel_${sheetName}_${r}_${Date.now()}`,
                  nombreEmpresa: cleanCellText(row[colIndices.nombreEmpresa]),
                  contacto: colIndices.contacto !== -1 ? cleanCellText(row[colIndices.contacto]) : '',
                  telefono: colIndices.telefono !== -1 ? cleanCellText(row[colIndices.telefono]) : '',
                  actividades: actividadesText,
                  horario: colIndices.horario !== -1 ? cleanCellText(row[colIndices.horario]) : '',
                  cuposLaboralesTotales: cuposLaborales,
                  cuposComunitariosTotales: cuposComunitarios,
                  area: determinarArea(actividadesText)
                });
              }

              sheetsDataObj[sheetName] = parsedRows;
            }
          }
        });

        if (hojasCompatiblesArr.length === 0) {
          setMensaje({
            tipo: 'error',
            texto: 'No se encontró ninguna pestaña compatible con columnas de empresa y actividades en el Excel.'
          });
          return;
        }

        // Ordenar por score
        hojasCompatiblesArr.sort((a, b) => b.score - a.score);

        setHojasCompatibles(hojasCompatiblesArr);
        setSheetsDataReferencia(sheetsDataObj);
        
        // Seleccionar la hoja de mayor score
        const defaultSheet = hojasCompatiblesArr[0].name;
        setSheetSeleccionada(defaultSheet);
        setDatosPrevisualizacion(sheetsDataObj[defaultSheet]);
        setModoPrevisualizacion(true);
        setMensaje({ tipo: 'success', texto: `Excel cargado exitosamente. Pestaña detectada: "${defaultSheet}"` });
      } catch (err) {
        console.error(err);
        setMensaje({ tipo: 'error', texto: `Error al procesar el archivo Excel: ${err.message}` });
      }
    };
    reader.readAsArrayBuffer(file);
    // Limpiar input
    e.target.value = null;
  };

  // Manejar cambio de pestaña desde la previsualización
  const handleCambiarPestaña = (sheetName) => {
    setSheetSeleccionada(sheetName);
    setDatosPrevisualizacion(sheetsDataReferencia[sheetName] || []);
  };

  // Editar celda en previsualización
  const handleCellChange = (id, field, value) => {
    setDatosPrevisualizacion(prev =>
      prev.map(row => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  // Eliminar fila de previsualización
  const handleEliminarFilaPrevisualizacion = (id) => {
    setDatosPrevisualizacion(prev => prev.filter(row => row.id !== id));
  };

  // Guardar Todo en la base de datos
  const handleGuardarMasivo = async () => {
    if (datosPrevisualizacion.length === 0) {
      setMensaje({ tipo: 'error', texto: 'No hay convenios en la lista para importar.' });
      return;
    }

    // Validar celdas requeridas
    const invalidos = datosPrevisualizacion.filter(d => !d.nombreEmpresa.trim() || !d.area.trim());
    if (invalidos.length > 0) {
      setMensaje({ tipo: 'error', texto: 'Existen celdas obligatorias vacías (Nombre de Empresa o Área).' });
      return;
    }

    setGuardandoMasivo(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const response = await api.post('/convenios/bulk', { convenios: datosPrevisualizacion });
      setMensaje({
        tipo: 'success',
        texto: `¡Carga masiva completada! ${response.data.data.cantidadCreados} convenios creados/actualizados con éxito.`
      });
      setModoPrevisualizacion(false);
      setDatosPrevisualizacion([]);
      setHojasCompatibles([]);
      setSheetsDataReferencia({});
      cargarConvenios();
    } catch (err) {
      console.error(err);
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || err.message || 'Error al guardar convenios masivamente.'
      });
    } finally {
      setGuardandoMasivo(false);
    }
  };

  const cargarConvenios = async () => {
    try {
      const response = await api.get('/convenios');
      setConvenios(response.data.data);
    } catch (error) {
      console.error('Error al cargar convenios:', error);
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

  const abrirModal = (convenio = null) => {
    setConvenioEditando(convenio);
    setModalAbierto(true);
    setMensaje({ tipo: '', texto: '' });
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setConvenioEditando(null);
    setMensaje({ tipo: '', texto: '' });
  };

  const eliminarConvenio = async (id, nombreEmpresa) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar el convenio con "${nombreEmpresa}"?`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/convenios/${id}`);
      cargarConvenios();
      setMensaje({
        tipo: 'success',
        texto: 'Convenio eliminado exitosamente',
      });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'Error al eliminar convenio',
      });
    }
  };

  const porcentajeOcupacion = (ocupados, totales) => {
    return Math.round((ocupados / totales) * 100);
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

  if (modoPrevisualizacion) {
    const totalLaborales = datosPrevisualizacion.reduce((acc, row) => acc + (parseInt(row.cuposLaboralesTotales) || 0), 0);
    const totalComunitarias = datosPrevisualizacion.reduce((acc, row) => acc + (parseInt(row.cuposComunitariosTotales) || 0), 0);

    // Contar duplicados y existentes en Base de Datos
    const repetidosEnBD = datosPrevisualizacion.filter(row => {
      const clean = row.nombreEmpresa.trim().toLowerCase();
      return clean && convenios.some(c => c.nombreEmpresa.trim().toLowerCase() === clean);
    }).length;

    const duplicadosEnExcel = datosPrevisualizacion.filter((row, idx) => {
      const clean = row.nombreEmpresa.trim().toLowerCase();
      if (!clean) return false;
      return datosPrevisualizacion.findIndex(r => r.nombreEmpresa.trim().toLowerCase() === clean) !== idx;
    }).length;

    return (
      <div className="min-h-screen bg-gray-50 animate-fadeIn">
        <Navbar />
        <div className="max-w-[95%] mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="badge badge-success flex items-center space-x-1 py-1.5 px-3">
                  <FiCheck className="h-4 w-4" />
                  <span>Modo Revisor Masivo</span>
                </span>
                {hojasCompatibles.length > 1 && (
                  <span className="badge badge-info py-1.5 px-3">
                    {hojasCompatibles.length} Pestañas Compatibles
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                Previsualización e Importación Masiva
              </h1>
              <p className="text-gray-600 text-sm max-w-2xl">
                Hemos extraído los convenios utilizando mapeo inteligente de columnas. Puedes editar cualquier celda directamente en la cuadrícula, cambiar de pestaña o eliminar filas antes de guardarlas. Los convenios con el mismo nombre se actualizarán automáticamente.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Selector de pestañas */}
              {hojasCompatibles.length > 1 && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Pestaña:</label>
                  <select
                    value={sheetSeleccionada}
                    onChange={(e) => handleCambiarPestaña(e.target.value)}
                    className="select bg-white border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500 font-medium"
                  >
                    {hojasCompatibles.map((sheet) => (
                      <option key={sheet.name} value={sheet.name}>
                        {sheet.name} (Score: {sheet.score})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => {
                  if (window.confirm('¿Estás seguro de cancelar? Se descartarán todos los datos cargados.')) {
                    setModoPrevisualizacion(false);
                    setDatosPrevisualizacion([]);
                    setHojasCompatibles([]);
                    setSheetsDataReferencia({});
                    setMensaje({ tipo: '', texto: '' });
                  }
                }}
                className="btn btn-secondary px-5 py-2.5"
                disabled={guardandoMasivo}
              >
                Cancelar
              </button>
              
              <button
                onClick={handleGuardarMasivo}
                className="btn bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2 px-6 py-2.5 shadow-sm hover:shadow focus:ring-2 focus:ring-green-500 transition-all font-semibold"
                disabled={guardandoMasivo || datosPrevisualizacion.length === 0}
              >
                {guardandoMasivo ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Guardando Masivamente...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="h-5 w-5" />
                    <span>Guardar {datosPrevisualizacion.length} Convenios</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <FiFileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Convenios en Cola</p>
                <p className="text-2xl font-bold text-gray-800">{datosPrevisualizacion.length}</p>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <FiBookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Plazas Laborales</p>
                <p className="text-2xl font-bold text-gray-800">{totalLaborales}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <FiUsers className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Plazas Comunitarias</p>
                <p className="text-2xl font-bold text-gray-800">{totalComunitarias}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${(repetidosEnBD > 0 || duplicadosEnExcel > 0) ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'}`}>
                <FiAlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Existentes / Duplicados</p>
                <p className="text-xl font-bold text-gray-805">
                  <span className={repetidosEnBD > 0 ? "text-amber-600 font-extrabold" : "text-gray-800"}>
                    {repetidosEnBD}
                  </span>
                  <span className="text-xs font-normal text-gray-400 ml-1">en BD</span>
                  {duplicadosEnExcel > 0 && (
                    <span className="text-xs font-semibold text-orange-600 ml-2">
                      ({duplicadosEnExcel} en Excel)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Mensaje de alerta interna */}
          {mensaje.texto && (
            <div className={`alert ${mensaje.tipo === 'success' ? 'alert-success' : 'alert-error'} flex items-center space-x-2 mb-6`}>
              <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{mensaje.texto}</span>
            </div>
          )}

          {/* Tabla Cuadrícula Editable Premium */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh] scrollbar-thin">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-4 px-4 sticky left-0 bg-gray-50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] z-10 w-[20%]">Empresa *</th>
                    <th className="py-4 px-4 w-[15%]">Área *</th>
                    <th className="py-4 px-4 text-center w-[8%]">Plazas Lab.</th>
                    <th className="py-4 px-4 text-center w-[8%]">Plazas Com.</th>
                    <th className="py-4 px-4 w-[15%]">Contacto / Tutor</th>
                    <th className="py-4 px-4 w-[10%]">Teléfono</th>
                    <th className="py-4 px-4 w-[12%]">Horario</th>
                    <th className="py-4 px-4 w-[25%]">Actividades</th>
                    <th className="py-4 px-4 text-center w-[5%] sticky right-0 bg-gray-50 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] z-10">Eliminar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {datosPrevisualizacion.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-12 text-gray-500 font-medium bg-gray-50">
                        No hay registros en esta pestaña. Prueba seleccionando otra pestaña arriba.
                      </td>
                    </tr>
                  ) : (
                    datosPrevisualizacion.map((row) => (
                      <tr key={row.id} className="hover:bg-indigo-50/20 transition-colors">
                        {/* Empresa */}
                        <td className="p-2 sticky left-0 bg-white hover:bg-indigo-50/20 shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-10">
                          <input
                            type="text"
                            value={row.nombreEmpresa}
                            onChange={(e) => handleCellChange(row.id, 'nombreEmpresa', e.target.value)}
                            className={`w-full bg-transparent border-0 focus:ring-2 focus:ring-primary-500 rounded px-2 py-1.5 text-xs text-gray-900 border-b border-dashed ${!row.nombreEmpresa.trim() ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                            placeholder="Nombre de la Empresa"
                          />
                          {(() => {
                            const cleanNombre = row.nombreEmpresa.trim().toLowerCase();
                            if (!cleanNombre) return null;
                            const yaExisteEnBD = convenios.some(c => c.nombreEmpresa.trim().toLowerCase() === cleanNombre);
                            const yaExisteEnExcel = datosPrevisualizacion.filter(r => r.nombreEmpresa.trim().toLowerCase() === cleanNombre).length > 1;
                            
                            return (
                              <div className="flex flex-wrap gap-1 mt-1 px-1">
                                {yaExisteEnBD && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200" title="Este convenio ya existe en el sistema. Se actualizarán sus cupos y datos de contacto.">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                    Actualizar
                                  </span>
                                )}
                                {yaExisteEnExcel && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200" title="Esta empresa se repite más de una vez en el archivo Excel cargado.">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                    Duplicado Excel
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        
                        {/* Area */}
                        <td className="p-2">
                          <select
                            value={row.area}
                            onChange={(e) => handleCellChange(row.id, 'area', e.target.value)}
                            className={`w-full bg-transparent border-0 focus:ring-2 focus:ring-primary-500 rounded px-2 py-1.5 text-xs font-semibold text-gray-800 border-b border-dashed ${!row.area.trim() ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                          >
                            <option value="Desarrollo de Software">💼 Desarrollo de Software</option>
                            <option value="Redes y Telecomunicaciones">📡 Redes y Telecomunicaciones</option>
                            <option value="Ciberseguridad">🛡️ Ciberseguridad</option>
                            <option value="Base de Datos">🗄️ Base de Datos</option>
                            <option value="Soporte Técnico">🛠️ Soporte Técnico</option>
                          </select>
                        </td>

                        {/* Plazas Laborales */}
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={row.cuposLaboralesTotales}
                            onChange={(e) => handleCellChange(row.id, 'cuposLaboralesTotales', parseInt(e.target.value) || 0)}
                            className="w-16 bg-transparent border-0 focus:ring-2 focus:ring-primary-500 rounded px-2 py-1.5 text-xs text-gray-900 text-center border-b border-dashed border-gray-200 font-bold"
                          />
                        </td>

                        {/* Plazas Comunitarias */}
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={row.cuposComunitariosTotales}
                            onChange={(e) => handleCellChange(row.id, 'cuposComunitariosTotales', parseInt(e.target.value) || 0)}
                            className="w-16 bg-transparent border-0 focus:ring-2 focus:ring-primary-500 rounded px-2 py-1.5 text-xs text-gray-900 text-center border-b border-dashed border-gray-200 font-bold"
                          />
                        </td>

                        {/* Contacto */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.contacto}
                            onChange={(e) => handleCellChange(row.id, 'contacto', e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary-500 rounded px-2 py-1.5 text-xs text-gray-900 border-b border-dashed border-gray-200"
                            placeholder="Nombre del Tutor/Contacto"
                          />
                        </td>

                        {/* Telefono */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.telefono}
                            onChange={(e) => handleCellChange(row.id, 'telefono', e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary-500 rounded px-2 py-1.5 text-xs text-gray-900 border-b border-dashed border-gray-200"
                            placeholder="Ej: 0992669635"
                          />
                        </td>

                        {/* Horario */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.horario}
                            onChange={(e) => handleCellChange(row.id, 'horario', e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary-500 rounded px-2 py-1.5 text-xs text-gray-900 border-b border-dashed border-gray-200"
                            placeholder="Ej: A convenir"
                          />
                        </td>

                        {/* Actividades */}
                        <td className="p-2">
                          <textarea
                            rows="2"
                            value={row.actividades}
                            onChange={(e) => handleCellChange(row.id, 'actividades', e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary-500 rounded px-2 py-1 text-xs text-gray-700 border-b border-dashed border-gray-200 resize-y min-h-[45px] leading-snug"
                            placeholder="Detalle de actividades..."
                          />
                        </td>

                        {/* Boton Eliminar */}
                        <td className="p-2 text-center sticky right-0 bg-white shadow-[-2px_0_5px_rgba(0,0,0,0.02)] z-10">
                          <button
                            onClick={() => handleEliminarFilaPrevisualizacion(row.id)}
                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>* Indica campos requeridos obligatorios.</span>
              <span>Total de filas en cuadrícula: {datosPrevisualizacion.length}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Gestión de Convenios
            </h1>
            <p className="text-gray-600">
              Administra los convenios disponibles para prácticas preprofesionales
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <label className="btn flex items-center space-x-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all">
              <FiUpload className="h-5 w-5" />
              <span>Importar Excel</span>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImportarExcel}
                className="hidden"
              />
            </label>
            <button
              onClick={() => abrirModal()}
              className="btn btn-primary flex items-center space-x-2 shadow-sm"
            >
              <FiPlus className="h-5 w-5" />
              <span>Nuevo Convenio</span>
            </button>
          </div>
        </div>

        {/* Mensaje */}
        {mensaje.texto && (
          <div
            className={`alert ${
              mensaje.tipo === 'success' ? 'alert-success' : 'alert-error'
            } flex items-center space-x-2 mb-6`}
          >
            <FiAlertCircle className="h-5 w-5" />
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Barra de búsqueda */}
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

        {/* Lista de convenios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conveniosFiltrados.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600">
                {busqueda
                  ? 'No se encontraron convenios con ese criterio'
                  : 'No hay convenios registrados'}
              </p>
            </div>
          ) : (
            conveniosFiltrados.map((convenio) => (
              <div
                key={convenio.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                {/* Header del card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {convenio.nombreEmpresa}
                    </h3>
                    <p className="text-sm text-gray-600">{convenio.area}</p>
                  </div>
                  <span
                    className={`badge ${
                      convenio.activo ? 'badge-success' : 'badge-gray'
                    }`}
                  >
                    {convenio.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Detalles del Convenio */}
                <div className="space-y-2 mb-4 text-sm text-gray-600 border-t pt-3">
                  {convenio.contacto && (
                    <div className="flex items-center space-x-2">
                      <FiUser className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate" title={convenio.contacto}>
                        <strong>Contacto:</strong> {convenio.contacto}
                      </span>
                    </div>
                  )}
                  {convenio.telefono && (
                    <div className="flex items-center space-x-2">
                      <FiPhone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span>
                        <strong>Teléfono:</strong> {convenio.telefono}
                      </span>
                    </div>
                  )}
                  {convenio.horario && (
                    <div className="flex items-center space-x-2">
                      <FiClock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate" title={convenio.horario}>
                        <strong>Horario:</strong> {convenio.horario}
                      </span>
                    </div>
                  )}
                  {convenio.actividades && (
                    <div className="flex items-start space-x-2 pt-1">
                      <FiBookOpen className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2 text-xs text-gray-500 bg-gray-50 p-1.5 rounded w-full" title={convenio.actividades}>
                        {convenio.actividades}
                      </span>
                    </div>
                  )}
                </div>

                {/* Desglose de Cupos */}
                <div className="space-y-3 border-t pt-3 mb-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                    <span>Desglose de Plazas:</span>
                    <span className="text-gray-500">
                      Total: {convenio.cuposOcupados} / {convenio.cuposTotales}
                    </span>
                  </div>

                  {/* Cupos Laborales */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600 font-medium">💼 Prácticas Laborales</span>
                      <span className="font-semibold text-gray-800">
                        {convenio.cuposLaboralesOcupados} / {convenio.cuposLaboralesTotales}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          porcentajeOcupacion(
                            convenio.cuposLaboralesOcupados,
                            convenio.cuposLaboralesTotales
                          ) >= 100
                            ? 'bg-red-500'
                            : porcentajeOcupacion(
                                convenio.cuposLaboralesOcupados,
                                convenio.cuposLaboralesTotales
                              ) >= 80
                            ? 'bg-yellow-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{
                          width: `${
                            convenio.cuposLaboralesTotales > 0
                              ? porcentajeOcupacion(
                                  convenio.cuposLaboralesOcupados,
                                  convenio.cuposLaboralesTotales
                                )
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Cupos Comunitarios */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600 font-medium">🤝 Prácticas Comunitarias</span>
                      <span className="font-semibold text-gray-800">
                        {convenio.cuposComunitariosOcupados} / {convenio.cuposComunitariosTotales}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          porcentajeOcupacion(
                            convenio.cuposComunitariosOcupados,
                            convenio.cuposComunitariosTotales
                          ) >= 100
                            ? 'bg-red-500'
                            : porcentajeOcupacion(
                                convenio.cuposComunitariosOcupados,
                                convenio.cuposComunitariosTotales
                              ) >= 80
                            ? 'bg-yellow-500'
                            : 'bg-emerald-600'
                        }`}
                        style={{
                          width: `${
                            convenio.cuposComunitariosTotales > 0
                              ? porcentajeOcupacion(
                                  convenio.cuposComunitariosOcupados,
                                  convenio.cuposComunitariosTotales
                                )
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center space-x-2 pt-4 border-t">
                  <button
                    onClick={() => abrirModal(convenio)}
                    className="flex-1 btn btn-secondary flex items-center justify-center space-x-2"
                  >
                    <FiEdit className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() =>
                      eliminarConvenio(convenio.id, convenio.nombreEmpresa)
                    }
                    className="btn btn-danger flex items-center space-x-2"
                    disabled={convenio.cuposOcupados > 0}
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>

                {convenio.cuposOcupados > 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    No se puede eliminar (tiene estudiantes asignados)
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {modalAbierto && (
          <ModalConvenio
            convenio={convenioEditando}
            cerrar={cerrarModal}
            actualizar={cargarConvenios}
            setMensaje={setMensaje}
          />
        )}
      </div>
    </div>
  );
};

// Modal para crear/editar convenio
const ModalConvenio = ({ convenio, cerrar, actualizar, setMensaje }) => {
  const [formData, setFormData] = useState({
    nombreEmpresa: convenio?.nombreEmpresa || '',
    area: convenio?.area || '',
    contacto: convenio?.contacto || '',
    telefono: convenio?.telefono || '',
    actividades: convenio?.actividades || '',
    horario: convenio?.horario || '',
    cuposLaboralesTotales: convenio?.cuposLaboralesTotales !== undefined ? convenio.cuposLaboralesTotales : 0,
    cuposComunitariosTotales: convenio?.cuposComunitariosTotales !== undefined ? convenio.cuposComunitariosTotales : 0,
    activo: convenio?.activo !== undefined ? convenio.activo : true,
  });

  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);

  const validar = () => {
    const nuevosErrores = {};

    if (!formData.nombreEmpresa.trim()) {
      nuevosErrores.nombreEmpresa = 'El nombre de la empresa es requerido';
    }

    if (!formData.area.trim()) {
      nuevosErrores.area = 'El área es requerida';
    }

    if (
      formData.cuposLaboralesTotales === undefined ||
      formData.cuposLaboralesTotales === null ||
      formData.cuposLaboralesTotales < 0
    ) {
      nuevosErrores.cuposLaboralesTotales = 'Los cupos no pueden ser negativos';
    }

    if (
      formData.cuposComunitariosTotales === undefined ||
      formData.cuposComunitariosTotales === null ||
      formData.cuposComunitariosTotales < 0
    ) {
      nuevosErrores.cuposComunitariosTotales = 'Los cupos no pueden ser negativos';
    }

    if (convenio) {
      if (formData.cuposLaboralesTotales < (convenio.cuposLaboralesOcupados || 0)) {
        nuevosErrores.cuposLaboralesTotales = `No puedes reducir los cupos a menos de ${convenio.cuposLaboralesOcupados} (cupos ocupados actuales)`;
      }
      if (formData.cuposComunitariosTotales < (convenio.cuposComunitariosOcupados || 0)) {
        nuevosErrores.cuposComunitariosTotales = `No puedes reducir los cupos a menos de ${convenio.cuposComunitariosOcupados} (cupos ocupados actuales)`;
      }
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validar()) return;

    setGuardando(true);

    try {
      if (convenio) {
        // Editar
        await api.put(`/convenios/${convenio.id}`, formData);
        setMensaje({
          tipo: 'success',
          texto: 'Convenio actualizado exitosamente',
        });
      } else {
        // Crear
        await api.post('/convenios', formData);
        setMensaje({
          tipo: 'success',
          texto: 'Convenio creado exitosamente',
        });
      }

      actualizar();
      cerrar();
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.message || error.message || 'Error al guardar convenio',
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b pb-3">
          <h2 className="text-2xl font-bold text-gray-900">
            {convenio ? 'Editar Convenio' : 'Nuevo Convenio'}
          </h2>
          <button
            onClick={cerrar}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre de la empresa */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la Empresa *
              </label>
              <input
                type="text"
                value={formData.nombreEmpresa}
                onChange={(e) =>
                  setFormData({ ...formData, nombreEmpresa: e.target.value })
                }
                className={`input ${errors.nombreEmpresa ? 'input-error' : ''}`}
                placeholder="Ej: Tech Solutions S.A."
              />
              {errors.nombreEmpresa && (
                <p className="text-sm text-red-600 mt-1">{errors.nombreEmpresa}</p>
              )}
            </div>

            {/* Área */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Área *
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className={`input ${errors.area ? 'input-error' : ''}`}
                placeholder="Ej: Desarrollo de Software"
              />
              {errors.area && (
                <p className="text-sm text-red-600 mt-1">{errors.area}</p>
              )}
            </div>

            {/* Horario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horario
              </label>
              <input
                type="text"
                value={formData.horario}
                onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                className="input"
                placeholder="Ej: A convenir / 08:00 - 12:00"
              />
            </div>

            {/* Contacto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contacto / Tutor
              </label>
              <input
                type="text"
                value={formData.contacto}
                onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                className="input"
                placeholder="Ej: Ing. Luis Miguel Santillán"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="input"
                placeholder="Ej: 099 266 9635"
              />
            </div>

            {/* Cupos Laborales */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plazas Laborales *
              </label>
              <input
                type="number"
                value={formData.cuposLaboralesTotales}
                onChange={(e) =>
                  setFormData({ ...formData, cuposLaboralesTotales: parseInt(e.target.value) || 0 })
                }
                min="0"
                className={`input ${errors.cuposLaboralesTotales ? 'input-error' : ''}`}
              />
              {errors.cuposLaboralesTotales && (
                <p className="text-sm text-red-600 mt-1">{errors.cuposLaboralesTotales}</p>
              )}
            </div>

            {/* Cupos Comunitarios */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plazas Comunitarias *
              </label>
              <input
                type="number"
                value={formData.cuposComunitariosTotales}
                onChange={(e) =>
                  setFormData({ ...formData, cuposComunitariosTotales: parseInt(e.target.value) || 0 })
                }
                min="0"
                className={`input ${errors.cuposComunitariosTotales ? 'input-error' : ''}`}
              />
              {errors.cuposComunitariosTotales && (
                <p className="text-sm text-red-600 mt-1">{errors.cuposComunitariosTotales}</p>
              )}
            </div>

            {/* Actividades */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actividades
              </label>
              <textarea
                value={formData.actividades}
                onChange={(e) => setFormData({ ...formData, actividades: e.target.value })}
                rows="3"
                className="input py-2"
                placeholder="Ej: Desarrollo de Software, Administración de bases de datos, Soporte técnico..."
              />
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center space-x-2 pt-2 border-t mt-4">
            <input
              type="checkbox"
              id="activo"
              checked={formData.activo}
              onChange={(e) =>
                setFormData({ ...formData, activo: e.target.checked })
              }
              className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <label htmlFor="activo" className="text-sm text-gray-700 font-semibold">
              Convenio activo
            </label>
          </div>

          {/* Botones */}
          <div className="flex items-center space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={cerrar}
              className="flex-1 btn btn-secondary"
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 btn btn-primary flex items-center justify-center space-x-2"
              disabled={guardando}
            >
              {guardando ? (
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
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <FiSave className="h-5 w-5" />
                  <span>Guardar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GestionConvenios;