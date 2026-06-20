import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import {
  FiFileText,
  FiDownload,
  FiTrash2,
  FiPlus,
  FiUploadCloud,
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
  FiInfo,
  FiX
} from 'react-icons/fi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const FormatosOficiales = () => {
  const { esAdmin, esDocente, esEstudiante } = useAuth();
  const [formatos, setFormatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [descargandoId, setDescargandoId] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  // Estados para formulario de subida
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    cargarFormatos();
  }, []);

  const cargarFormatos = async () => {
    try {
      setCargando(true);
      const response = await api.get('/formatos');
      setFormatos(response.data.data);
    } catch (error) {
      console.error('Error al cargar formatos:', error);
      mostrarMensaje('error', 'No se pudieron cargar los formatos oficiales.');
    } finally {
      setCargando(false);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setArchivo(e.dataTransfer.files[0]);
    }
  };

  const handleSubirFormato = async (e) => {
    e.preventDefault();
    if (!archivo) {
      mostrarMensaje('error', 'Por favor selecciona un archivo.');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', nombre.trim());
    formData.append('descripcion', descripcion.trim());
    formData.append('archivo', archivo);

    setProcesando(true);
    try {
      await api.post('/formatos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      mostrarMensaje('success', 'Formato oficial de documento publicado exitosamente.');
      setNombre('');
      setDescripcion('');
      setArchivo(null);
      setModalAbierto(false);
      cargarFormatos();
    } catch (error) {
      console.error('Error al subir formato:', error);
      mostrarMensaje('error', error.response?.data?.message || 'Error al publicar el formato.');
    } finally {
      setProcesando(false);
    }
  };

  const handleDescargar = async (formatoId, nombreArchivo) => {
    setDescargandoId(formatoId);
    try {
      const response = await api.get(`/formatos/${formatoId}/descargar`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nombreArchivo);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar formato:', error);
      mostrarMensaje('error', 'No se pudo descargar el archivo.');
    } finally {
      setDescargandoId(null);
    }
  };

  const handleEliminar = async (formatoId, nombreFormato) => {
    if (!window.confirm(`¿Estás seguro de eliminar el formato "${nombreFormato}"? Esta acción borrará el archivo físico del servidor.`)) {
      return;
    }

    try {
      await api.delete(`/formatos/${formatoId}`);
      mostrarMensaje('success', 'Formato oficial eliminado exitosamente.');
      cargarFormatos();
    } catch (error) {
      console.error('Error al eliminar formato:', error);
      mostrarMensaje('error', error.response?.data?.message || 'Error al eliminar el formato.');
    }
  };

  const getExtensionLabel = (filename) => {
    if (!filename) return 'DOCX';
    const ext = filename.split('.').pop().toUpperCase();
    return ext;
  };

  const getExtensionColor = (filename) => {
    const ext = getExtensionLabel(filename);
    switch (ext) {
      case 'PDF':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'XLS':
      case 'XLSX':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'DOC':
      case 'DOCX':
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-5 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Formatos y Documentos Oficiales
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Descarga los anexos, oficios y plantillas oficiales requeridos para cada fase de tus prácticas.
            </p>
          </div>
          {esDocente() && (
            <button
              onClick={() => setModalAbierto(true)}
              className="mt-4 sm:mt-0 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#ec3724] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#c92a1b] transition-all"
            >
              <FiPlus className="h-4 w-4" />
              Publicar Plantilla
            </button>
          )}
        </div>

        {/* Notificaciones */}
        {mensaje.texto && (
          <div
            className={`p-4 rounded-xl border mb-6 flex items-start gap-3 transition-all ${
              mensaje.tipo === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {mensaje.tipo === 'success' ? (
              <FiCheckCircle className="h-5 w-5 mt-0.5 text-emerald-600 flex-shrink-0" />
            ) : (
              <FiAlertCircle className="h-5 w-5 mt-0.5 text-red-600 flex-shrink-0" />
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">{mensaje.tipo === 'success' ? 'Éxito' : 'Error'}</p>
              <p className="text-sm font-semibold mt-0.5">{mensaje.texto}</p>
            </div>
          </div>
        )}

        {/* Contenedor Principal */}
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FiLoader className="h-10 w-10 text-[#ec3724] animate-spin" />
            <p className="text-sm font-bold text-slate-500 mt-4">Cargando repositorio de plantillas...</p>
          </div>
        ) : formatos.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <div className="inline-flex items-center justify-center p-4 bg-slate-100 rounded-full text-slate-400 mb-4">
              <FiFileText className="h-10 w-10" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No hay formatos publicados</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
              Aún no se han subido plantillas de documentos oficiales al sistema. {esDocente() ? 'Comienza publicando la primera plantilla.' : 'Tu tutor académico o docente no ha subido ningún formato oficial aún.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {formatos.map((formato) => (
              <div
                key={formato.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-350 transition-all p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-red-50 text-[#ec3724] rounded-xl border border-red-100/50 flex items-center justify-center">
                      <FiFileText className="h-6 w-6" />
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[9px] font-black tracking-wider border rounded-md uppercase ${getExtensionColor(
                        formato.nombreArchivo
                      )}`}
                    >
                      {getExtensionLabel(formato.nombreArchivo)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug tracking-tight">
                    {formato.nombre}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed line-clamp-3">
                    {formato.descripcion || 'Sin descripción detallada.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Publicado: {format(new Date(formato.createdAt), 'dd MMM yyyy', { locale: es })}
                  </span>

                  <div className="flex items-center gap-2">
                    {esDocente() && (
                      <button
                        onClick={() => handleEliminar(formato.id, formato.nombre)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Eliminar plantilla"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDescargar(formato.id, formato.nombreArchivo)}
                      disabled={descargandoId !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                    >
                      {descargandoId === formato.id ? (
                        <FiLoader className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FiDownload className="h-3.5 w-3.5" />
                      )}
                      Descargar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Subida para Admin */}
        {modalAbierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-fadeIn">
              {/* Encabezado Modal */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">
                  Publicar Nuevo Formato Oficial
                </h2>
                <button
                  onClick={() => setModalAbierto(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSubirFormato}>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Nombre del Formato <span className="text-[#ec3724]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Anexo A - Solicitud de Prácticas"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full text-sm font-semibold px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#ec3724] focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Descripción de uso
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Indica cuándo y cómo deben usar los estudiantes esta plantilla..."
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      className="w-full text-sm font-semibold px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#ec3724] focus:bg-white transition-colors"
                    />
                  </div>

                  {/* Drag and drop zone */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Archivo de Plantilla <span className="text-[#ec3724]">*</span>
                    </label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                        dragOver
                          ? 'border-[#ec3724] bg-red-50/20'
                          : archivo
                          ? 'border-emerald-300 bg-emerald-50/10'
                          : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                      }`}
                    >
                      <input
                        type="file"
                        id="archivo-plantilla"
                        className="hidden"
                        required={!archivo}
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                      />
                      
                      {archivo ? (
                        <div className="flex flex-col items-center">
                          <FiFileText className="h-10 w-10 text-emerald-600 mb-2" />
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">{archivo.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">
                            ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                          <button
                            type="button"
                            onClick={() => setArchivo(null)}
                            className="mt-3 text-xs text-red-600 hover:underline font-bold"
                          >
                            Quitar archivo
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="archivo-plantilla" className="cursor-pointer flex flex-col items-center">
                          <FiUploadCloud className="h-10 w-10 text-slate-400 mb-2" />
                          <p className="text-xs font-bold text-slate-700">Arrastra tu archivo aquí o busca uno local</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">
                            Soporta PDF, Word o Excel (máx. 20MB)
                          </p>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 p-3 bg-slate-50 border border-slate-150 rounded-xl">
                    <FiInfo className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-500 leading-normal font-semibold">
                      Los archivos subidos se guardarán en el almacenamiento seguro de uploads y estarán disponibles para descarga directa para todos los usuarios matriculados.
                    </p>
                  </div>
                </div>

                {/* Pie Modal */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={procesando || !archivo}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#ec3724] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#c92a1b] transition-colors disabled:opacity-55"
                  >
                    {procesando && <FiLoader className="h-3.5 w-3.5 animate-spin" />}
                    Publicar Formato
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormatosOficiales;
