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
      <div className="min-h-screen bg-slate-50 animate-fadeIn">
        <Navbar />
        <div className="max-w-[95%] mx-auto px-4 py-6 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
            <div className="pl-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 tracking-wider">
                  <FiCheck className="h-3 w-3" />
                  <span>Modo Revisor Masivo</span>
                </span>
                {hojasCompatibles.length > 1 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-50 text-blue-800 border border-blue-200 tracking-wider">
                    {hojasCompatibles.length} Pestañas Detectadas
                  </span>
                )}
              </div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
                Previsualización e Importación Masiva
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-1 max-w-2xl leading-normal">
                Extracción de convenios mediante mapeo inteligente de columnas. Puedes editar cualquier celda directamente en la cuadrícula, cambiar de pestaña o descartar filas. Los registros homónimos se actualizarán de forma automática.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              {hojasCompatibles.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Pestaña:</label>
                  <select
                    value={sheetSeleccionada}
                    onChange={(e) => handleCambiarPestaña(e.target.value)}
                    className="border border-slate-350 rounded-lg py-1.5 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-bold text-slate-800 cursor-pointer"
                  >
                    {hojasCompatibles.map((sheet) => (
                      <option key={sheet.name} value={sheet.name}>
                        {sheet.name} (Calidad: {sheet.score})
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
                className="inline-flex items-center justify-center px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all"
                disabled={guardandoMasivo}
              >
                Cancelar
              </button>
              
              <button
                onClick={handleGuardarMasivo}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98]"
                disabled={guardandoMasivo || datosPrevisualizacion.length === 0}
              >
                {guardandoMasivo ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Guardando Registros...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="h-3.5 w-3.5" />
                    <span>Guardar {datosPrevisualizacion.length} Convenios</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
              <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
                <FiFileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Convenios en Cola</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{datosPrevisualizacion.length}</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
              <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
                <FiFileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Plazas Laborales</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{totalLaborales}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
              <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
                <FiUsers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Plazas Comunitarias</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{totalComunitarias}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
              <div className={`p-2.5 rounded-lg border ${(repetidosEnBD > 0 || duplicadosEnExcel > 0) ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                <FiAlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Existentes / Duplicados</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  <span className={repetidosEnBD > 0 ? "text-amber-600 font-black" : "text-slate-900"}>
                    {repetidosEnBD}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 ml-1">en BD</span>
                  {duplicadosEnExcel > 0 && (
                    <span className="text-[10px] font-black text-orange-600 ml-2">
                      ({duplicadosEnExcel} en Excel)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Mensajes de Alerta */}
          {mensaje.texto && (
            <div className={`border rounded-lg p-4 flex items-center gap-2 text-xs font-bold leading-relaxed ${mensaje.tipo === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-150 text-[#ec3724]'}`}>
              <FiAlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{mensaje.texto}</span>
            </div>
          )}

          {/* Tabla Cuadrícula Editable Premium */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[9px] font-black text-slate-550 uppercase tracking-wider divide-x divide-slate-200">
                    <th className="py-3 px-3.5 sticky left-0 bg-slate-100 z-10 w-[240px]">Empresa *</th>
                    <th className="py-3 px-3.5 w-[180px]">Área de Especialidad *</th>
                    <th className="py-3 px-3.5 text-center w-[90px]">Plazas Lab.</th>
                    <th className="py-3 px-3.5 text-center w-[90px]">Plazas Com.</th>
                    <th className="py-3 px-3.5 w-[180px]">Contacto / Tutor</th>
                    <th className="py-3 px-3.5 w-[120px]">Teléfono</th>
                    <th className="py-3 px-3.5 w-[120px]">Horario</th>
                    <th className="py-3 px-3.5 w-[280px]">Actividades del Convenio</th>
                    <th className="py-3 px-3.5 text-center w-[70px] sticky right-0 bg-slate-100 z-10">Eliminar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px] font-semibold text-slate-700">
                  {datosPrevisualizacion.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-12 text-slate-500 font-bold bg-slate-50/50">
                        No hay registros en esta pestaña. Selecciona otra pestaña en el menú superior.
                      </td>
                    </tr>
                  ) : (
                    datosPrevisualizacion.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors divide-x divide-slate-100">
                        {/* Empresa */}
                        <td className="p-2.5 sticky left-0 bg-white hover:bg-slate-50 z-10">
                          <input
                            type="text"
                            value={row.nombreEmpresa}
                            onChange={(e) => handleCellChange(row.id, 'nombreEmpresa', e.target.value)}
                            className={`w-full bg-transparent border-b border-dashed focus:outline-none focus:border-[#ec3724] px-1 py-1 text-[11px] font-black text-slate-900 uppercase ${!row.nombreEmpresa.trim() ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                            placeholder="Nombre de la Empresa"
                          />
                          {(() => {
                            const cleanNombre = row.nombreEmpresa.trim().toLowerCase();
                            if (!cleanNombre) return null;
                            const yaExisteEnBD = convenios.some(c => c.nombreEmpresa.trim().toLowerCase() === cleanNombre);
                            const yaExisteEnExcel = datosPrevisualizacion.filter(r => r.nombreEmpresa.trim().toLowerCase() === cleanNombre).length > 1;
                            
                            return (
                              <div className="flex flex-wrap gap-1.5 mt-1 px-1">
                                {yaExisteEnBD && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider" title="Este convenio ya existe en el sistema. Se actualizarán sus cupos y datos de contacto.">
                                    Actualizar
                                  </span>
                                )}
                                {yaExisteEnExcel && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-orange-50 text-orange-700 border border-orange-200 uppercase tracking-wider" title="Esta empresa se repite más de una vez en el archivo Excel cargado.">
                                    Duplicado Excel
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        
                        {/* Area */}
                        <td className="p-2.5">
                          <select
                            value={row.area}
                            onChange={(e) => handleCellChange(row.id, 'area', e.target.value)}
                            className={`w-full bg-transparent border-b border-dashed focus:outline-none focus:border-[#ec3724] px-1 py-1 text-[11px] font-bold text-slate-800 cursor-pointer ${!row.area.trim() ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                          >
                            <option value="Desarrollo de Software">Desarrollo de Software</option>
                            <option value="Redes y Telecomunicaciones">Redes y Telecomunicaciones</option>
                            <option value="Ciberseguridad">Ciberseguridad</option>
                            <option value="Base de Datos">Base de Datos</option>
                            <option value="Soporte Técnico">Soporte Técnico</option>
                          </select>
                        </td>

                        {/* Plazas Laborales */}
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="0"
                            value={row.cuposLaboralesTotales}
                            onChange={(e) => handleCellChange(row.id, 'cuposLaboralesTotales', parseInt(e.target.value) || 0)}
                            className="w-14 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-[#ec3724] py-1 text-[11px] text-center font-black text-slate-900"
                          />
                        </td>

                        {/* Plazas Comunitarias */}
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="0"
                            value={row.cuposComunitariosTotales}
                            onChange={(e) => handleCellChange(row.id, 'cuposComunitariosTotales', parseInt(e.target.value) || 0)}
                            className="w-14 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-[#ec3724] py-1 text-[11px] text-center font-black text-slate-900"
                          />
                        </td>

                        {/* Contacto */}
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={row.contacto}
                            onChange={(e) => handleCellChange(row.id, 'contacto', e.target.value)}
                            className="w-full bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-[#ec3724] px-1 py-1 text-[11px] text-slate-900"
                            placeholder="Tutor/Representante"
                          />
                        </td>

                        {/* Telefono */}
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={row.telefono}
                            onChange={(e) => handleCellChange(row.id, 'telefono', e.target.value)}
                            className="w-full bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-[#ec3724] px-1 py-1 text-[11px] text-slate-900"
                            placeholder="Celular/Convencional"
                          />
                        </td>

                        {/* Horario */}
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={row.horario}
                            onChange={(e) => handleCellChange(row.id, 'horario', e.target.value)}
                            className="w-full bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-[#ec3724] px-1 py-1 text-[11px] text-slate-900"
                            placeholder="Ej. A convenir"
                          />
                        </td>

                        {/* Actividades */}
                        <td className="p-2.5">
                          <textarea
                            rows="2"
                            value={row.actividades}
                            onChange={(e) => handleCellChange(row.id, 'actividades', e.target.value)}
                            className="w-full bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-[#ec3724] px-1 py-1 text-[10px] text-slate-650 resize-y min-h-[45px] leading-snug"
                            placeholder="Actividades académicas asignadas..."
                          />
                        </td>

                        {/* Boton Eliminar */}
                        <td className="p-2.5 text-center sticky right-0 bg-white hover:bg-slate-50 z-10">
                          <button
                            onClick={() => handleEliminarFilaPrevisualizacion(row.id)}
                            className="text-[#ec3724] hover:text-[#d32010] p-1.5 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center border border-transparent hover:border-rose-200"
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
            
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span>* Indica campos requeridos obligatorios.</span>
              <span>Registros en esta pestaña: {datosPrevisualizacion.length}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-50 animate-fadeIn">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
          <div className="pl-2">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
              Gestión de Convenios
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Administra y controla los convenios de la institución para prácticas preprofesionales.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer">
              <FiUpload className="h-4 w-4" />
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
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98]"
            >
              <FiPlus className="h-4 w-4" />
              <span>Nuevo Convenio</span>
            </button>
          </div>
        </div>

        {/* Mensaje */}
        {mensaje.texto && (
          <div className={`border rounded-lg p-4 flex items-center gap-2 text-xs font-bold leading-relaxed ${mensaje.tipo === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-150 text-[#ec3724]'}`}>
            <FiAlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Barra de búsqueda */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="relative w-full">
            <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-455" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar convenio por nombre de empresa o área..."
              className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
            />
          </div>
        </div>

        {/* Lista de convenios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conveniosFiltrados.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
              <FiFileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">No se encontraron convenios</h3>
              <p className="text-[11px] font-semibold text-slate-500">
                {busqueda
                  ? 'Intenta ajustar los criterios de búsqueda en el filtro.'
                  : 'No hay convenios registrados en la plataforma.'}
              </p>
            </div>
          ) : (
            conveniosFiltrados.map((convenio) => (
              <div
                key={convenio.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
              >
                {/* Header del card */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide truncate max-w-[200px]" title={convenio.nombreEmpresa}>
                        {convenio.nombreEmpresa}
                      </h3>
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-655 border border-slate-200 mt-1">
                        {convenio.area}
                      </span>
                    </div>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border flex-shrink-0 ${
                        convenio.activo
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-450'
                      }`}
                    >
                      {convenio.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* Detalles del Convenio */}
                  <div className="space-y-2 mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-600">
                    {convenio.contacto && (
                      <div className="flex items-center gap-2">
                        <FiUser className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate" title={convenio.contacto}>
                          <strong className="text-slate-500 font-bold uppercase text-[9px] mr-1">Contacto:</strong> {convenio.contacto}
                        </span>
                      </div>
                    )}
                    {convenio.telefono && (
                      <div className="flex items-center gap-2">
                        <FiPhone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span>
                          <strong className="text-slate-500 font-bold uppercase text-[9px] mr-1">Teléfono:</strong> {convenio.telefono}
                        </span>
                      </div>
                    )}
                    {convenio.horario && (
                      <div className="flex items-center gap-2">
                        <FiClock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate" title={convenio.horario}>
                          <strong className="text-slate-500 font-bold uppercase text-[9px] mr-1">Horario:</strong> {convenio.horario}
                        </span>
                      </div>
                    )}
                    {convenio.actividades && (
                      <div className="flex items-start gap-2 pt-1.5">
                        <FiBookOpen className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-150 leading-relaxed font-medium w-full line-clamp-3" title={convenio.actividades}>
                          {convenio.actividades}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Desglose de Cupos */}
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <span>Distribución de Plazas</span>
                    <span className="text-slate-800">
                      Total: {convenio.cuposOcupados} / {convenio.cuposTotales}
                    </span>
                  </div>

                  {/* Cupos Laborales */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1 font-semibold">
                      <span className="text-slate-500 uppercase tracking-wider text-[9px]">Prácticas Laborales</span>
                      <span className="font-bold text-slate-800">
                        {convenio.cuposLaboralesOcupados} / {convenio.cuposLaboralesTotales}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 border border-slate-200 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          porcentajeOcupacion(
                            convenio.cuposLaboralesOcupados,
                            convenio.cuposLaboralesTotales
                          ) >= 100
                            ? 'bg-[#ec3724]'
                            : porcentajeOcupacion(
                                convenio.cuposLaboralesOcupados,
                                convenio.cuposLaboralesTotales
                              ) >= 80
                            ? 'bg-amber-500'
                            : 'bg-slate-655'
                        }`}
                        style={{
                          width: `${
                            convenio.cuposLaboralesTotales > 0
                              ? Math.min(porcentajeOcupacion(
                                  convenio.cuposLaboralesOcupados,
                                  convenio.cuposLaboralesTotales
                                ), 100)
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Cupos Comunitarios */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1 font-semibold">
                      <span className="text-slate-500 uppercase tracking-wider text-[9px]">Prácticas Comunitarias</span>
                      <span className="font-bold text-slate-800">
                        {convenio.cuposComunitariosOcupados} / {convenio.cuposComunitariosTotales}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 border border-slate-200 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          porcentajeOcupacion(
                            convenio.cuposComunitariosOcupados,
                            convenio.cuposComunitariosTotales
                          ) >= 100
                            ? 'bg-[#ec3724]'
                            : porcentajeOcupacion(
                                convenio.cuposComunitariosOcupados,
                                convenio.cuposComunitariosTotales
                              ) >= 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                        }`}
                        style={{
                          width: `${
                            convenio.cuposComunitariosTotales > 0
                              ? Math.min(porcentajeOcupacion(
                                  convenio.cuposComunitariosOcupados,
                                  convenio.cuposComunitariosTotales
                                ), 100)
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => abrirModal(convenio)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-250 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all"
                    >
                      <FiEdit className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() =>
                        eliminarConvenio(convenio.id, convenio.nombreEmpresa)
                      }
                      className="inline-flex items-center justify-center p-1.5 bg-white text-[#ec3724] hover:bg-rose-50 border border-slate-250 hover:border-rose-200 rounded-lg transition-all"
                      disabled={convenio.cuposOcupados > 0}
                      title={convenio.cuposOcupados > 0 ? 'No se puede eliminar (tiene estudiantes asignados)' : 'Eliminar Convenio'}
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {convenio.cuposOcupados > 0 && (
                    <p className="text-[9px] font-black uppercase text-slate-400 text-center tracking-wider bg-slate-50 py-1 rounded border border-slate-200">
                      No se puede eliminar (estudiantes asignados)
                    </p>
                  )}
                </div>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center relative">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ec3724]"></div>
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider pl-2">
            {convenio ? 'Editar Convenio Institucional' : 'Nuevo Convenio Institucional'}
          </h2>
          <button
            onClick={cerrar}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            Cerrar
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Nombre de la empresa */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  value={formData.nombreEmpresa}
                  onChange={(e) =>
                    setFormData({ ...formData, nombreEmpresa: e.target.value })
                  }
                  className={`w-full border rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800 ${errors.nombreEmpresa ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                  placeholder="Ej. Tech Solutions S.A."
                />
                {errors.nombreEmpresa && (
                  <p className="text-[10px] text-[#ec3724] font-bold mt-1.5">{errors.nombreEmpresa}</p>
                )}
              </div>

              {/* Área */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Área de Especialidad *
                </label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className={`w-full border rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800 ${errors.area ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                  placeholder="Ej. Desarrollo de Software"
                />
                {errors.area && (
                  <p className="text-[10px] text-[#ec3724] font-bold mt-1.5">{errors.area}</p>
                )}
              </div>

              {/* Horario */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Horario
                </label>
                <input
                  type="text"
                  value={formData.horario}
                  onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
                  placeholder="Ej. A convenir / 08:00 - 12:00"
                />
              </div>

              {/* Contacto */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Contacto / Tutor
                </label>
                <input
                  type="text"
                  value={formData.contacto}
                  onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
                  placeholder="Ej. Ing. Luis Miguel Santillán"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
                  placeholder="Ej. 099 266 9635"
                />
              </div>

              {/* Cupos Laborales */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Plazas Laborales *
                </label>
                <input
                  type="number"
                  value={formData.cuposLaboralesTotales}
                  onChange={(e) =>
                    setFormData({ ...formData, cuposLaboralesTotales: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  className={`w-full border rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-bold text-slate-800 ${errors.cuposLaboralesTotales ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                />
                {errors.cuposLaboralesTotales && (
                  <p className="text-[10px] text-[#ec3724] font-bold mt-1.5">{errors.cuposLaboralesTotales}</p>
                )}
              </div>

              {/* Cupos Comunitarios */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Plazas Comunitarias *
                </label>
                <input
                  type="number"
                  value={formData.cuposComunitariosTotales}
                  onChange={(e) =>
                    setFormData({ ...formData, cuposComunitariosTotales: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  className={`w-full border rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-bold text-slate-800 ${errors.cuposComunitariosTotales ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                />
                {errors.cuposComunitariosTotales && (
                  <p className="text-[10px] text-[#ec3724] font-bold mt-1.5">{errors.cuposComunitariosTotales}</p>
                )}
              </div>

              {/* Actividades */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Actividades
                </label>
                <textarea
                  value={formData.actividades}
                  onChange={(e) => setFormData({ ...formData, actividades: e.target.value })}
                  rows="3"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#ec3724] font-semibold text-slate-800"
                  placeholder="Ej. Desarrollo de software, Administración de bases de datos, Soporte técnico..."
                />
              </div>
            </div>

            {/* Estado */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) =>
                  setFormData({ ...formData, activo: e.target.checked })
                }
                className="h-4 w-4 text-[#ec3724] border-slate-350 focus:ring-[#ec3724] rounded"
              />
              <label htmlFor="activo" className="text-xs text-slate-850 font-black uppercase tracking-wider cursor-pointer">
                Convenio activo y visible
              </label>
            </div>
          </div>

          {/* Botones */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={cerrar}
              className="inline-flex items-center justify-center px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all"
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[#ec3724] text-white hover:bg-[#d32010] rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98]"
              disabled={guardando}
            >
              {guardando ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-3.5 w-3.5 mr-2 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Guardando...
                </span>
              ) : (
                <>
                  <FiSave className="h-3.5 w-3.5 mr-1.5" />
                  <span>Guardar Convenio</span>
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