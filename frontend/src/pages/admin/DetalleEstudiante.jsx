import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../services/api';
import {
  FiUser,
  FiMail,
  FiHash,
  FiBookOpen,
  FiCalendar,
  FiBriefcase,
  FiFileText,
  FiDownload,
  FiCheck,
  FiX,
  FiClock,
  FiAlertCircle,
  FiArrowLeft,
  FiRefreshCw,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ExcelJS from 'exceljs';

const DetalleEstudiante = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [estudiante, setEstudiante] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [modalRechazo, setModalRechazo] = useState({ 
    abierto: false, 
    documentoId: null,
    tipo: 'documento' // 'documento' o 'inscripcion'
  });
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // Estados para tutor
  const [docentes, setDocentes] = useState([]);
  const [tutorSeleccionado, setTutorSeleccionado] = useState(null);
  const [guardandoTutor, setGuardandoTutor] = useState(false);
  const [calificaciones, setCalificaciones] = useState(null);
  const [cargandoCalificaciones, setCargandoCalificaciones] = useState(false);

  useEffect(() => {
    cargarDatos();
    cargarDocentes();
  }, [id]);

  const cargarDocentes = async () => {
    try {
      const response = await api.get('/admin/docentes');
      setDocentes(response.data.data);
    } catch (error) {
      console.error('Error al cargar docentes:', error);
    }
  };

  const cargarDatos = async () => {
    try {
      const response = await api.get(`/admin/estudiantes/${id}`);
      const studentData = response.data.data;
      setEstudiante(studentData);
      
      // Si tiene inscripción, cargar documentos y calificaciones
      if (studentData.inscripcion) {
        setTutorSeleccionado(studentData.inscripcion.tutorId);
        
        setCargandoCalificaciones(true);
        const [docsResponse, califsResponse] = await Promise.all([
          api.get(`/documentos/inscripcion/${studentData.inscripcion.id}`),
          api.get(`/admin/estudiantes/${id}/calificaciones`).catch(err => {
            console.warn('Error al cargar calificaciones del estudiante:', err);
            return { data: { success: false } };
          })
        ]);
        
        setDocumentos(docsResponse.data.data);
        if (califsResponse.data?.success) {
          setCalificaciones(califsResponse.data.data);
        }
      }
    } catch (error) {
      console.error('Error al cargar estudiante:', error);
      setMensaje({
        tipo: 'error',
        texto: 'Error al cargar información del estudiante',
      });
    } finally {
      setCargando(false);
      setCargandoCalificaciones(false);
    }
  };

  // ============ APROBACIÓN DE INSCRIPCIÓN ============
  const aprobarInscripcion = async (inscripcionId) => {
    if (!window.confirm('¿Aprobar la inscripción de este estudiante?')) {
      return;
    }

    setProcesando('inscripcion');
    try {
      await api.put(`/inscripciones/${inscripcionId}/aprobar`);
      setMensaje({
        tipo: 'success',
        texto: 'Inscripción aprobada. El estudiante puede comenzar a subir documentos.',
      });
      cargarDatos();
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'Error al aprobar inscripción',
      });
    } finally {
      setProcesando(null);
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
    }
  };

  const abrirModalRechazoInscripcion = (inscripcionId) => {
    setModalRechazo({ 
      abierto: true, 
      documentoId: inscripcionId,
      tipo: 'inscripcion'
    });
    setMotivoRechazo('');
  };

  const rechazarInscripcion = async () => {
    if (!motivoRechazo.trim()) {
      alert('Por favor proporciona un motivo de rechazo');
      return;
    }

    setProcesando('inscripcion');
    try {
      await api.put(`/inscripciones/${modalRechazo.documentoId}/rechazar`, {
        comentario: motivoRechazo,
      });
      setMensaje({
        tipo: 'success',
        texto: 'Inscripción rechazada. Se notificó al estudiante.',
      });
      cargarDatos();
      setModalRechazo({ abierto: false, documentoId: null, tipo: 'documento' });
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'Error al rechazar inscripción',
      });
    } finally {
      setProcesando(null);
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
    }
  };

  // ============ APROBACIÓN DE DOCUMENTOS ============
  const aprobarDocumento = async (documentoId, tipoDocumento) => {
    if (!window.confirm(`¿Aprobar el documento "${tipoDocumento}"?`)) {
      return;
    }

    setProcesando(documentoId);
    try {
      await api.put(`/documentos/${documentoId}/aprobar`);
      setMensaje({
        tipo: 'success',
        texto: 'Documento aprobado exitosamente',
      });
      cargarDatos();
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'Error al aprobar documento',
      });
    } finally {
      setProcesando(null);
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    }
  };

  const abrirModalRechazoDocumento = (documentoId, tipoDocumento) => {
    setModalRechazo({ 
      abierto: true, 
      documentoId, 
      tipoDocumento,
      tipo: 'documento'
    });
    setMotivoRechazo('');
  };

  const rechazarDocumento = async () => {
    if (!motivoRechazo.trim()) {
      alert('Por favor proporciona un motivo de rechazo');
      return;
    }

    setProcesando(modalRechazo.documentoId);
    try {
      await api.put(`/documentos/${modalRechazo.documentoId}/rechazar`, {
        comentario: motivoRechazo,
      });
      setMensaje({
        tipo: 'success',
        texto: 'Documento rechazado',
      });
      cargarDatos();
      setModalRechazo({ abierto: false, documentoId: null, tipo: 'documento' });
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'Error al rechazar documento',
      });
    } finally {
      setProcesando(null);
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      sin_asignar: { color: 'badge-gray', texto: 'Sin Asignar' },
      asignado: { color: 'badge-warning', texto: 'Asignado' },
      pendiente_inicio: { color: 'badge-info', texto: 'Pendiente Inicio' },
      en_proceso: { color: 'badge-info', texto: 'En Proceso' },
      finalizado: { color: 'badge-success', texto: 'Finalizado' },
    };
    return badges[estado] || badges.sin_asignar;
  };

  const getEstadoDocBadge = (estado) => {
    const badges = {
      pendiente: { color: 'badge-warning', icon: FiClock, texto: 'Pendiente Revisión' },
      aprobado: { color: 'badge-success', icon: FiCheck, texto: 'Aprobado' },
      rechazado: { color: 'badge-danger', icon: FiX, texto: 'Rechazado' },
    };
    return badges[estado] || badges.pendiente;
  };

  const descargarDocumento = async (documentoId, nombreArchivo) => {
    try {
      const response = await api.get(`/documentos/${documentoId}/descargar`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nombreArchivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: 'Error al descargar documento',
      });
    }
  };

  const resetearEstudiante = async () => {
    if (
      !window.confirm(
        '¿Estás seguro de resetear este estudiante? Esta acción eliminará su inscripción y documentos.'
      )
    ) {
      return;
    }

    try {
      await api.put(`/admin/estudiantes/${id}/resetear`);
      setMensaje({
        tipo: 'success',
        texto: 'Estudiante reseteado exitosamente',
      });
      setTimeout(() => {
        navigate('/admin/estudiantes');
      }, 2000);
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'Error al resetear estudiante',
      });
    }
  };

  const guardarTutorManual = async () => {
    setGuardandoTutor(true);
    try {
      const response = await api.put(
        `/admin/estudiantes/${estudiante.id}/asignar-tutor`,
        { tutorId: tutorSeleccionado ? parseInt(tutorSeleccionado) : null }
      );
      if (response.data.success) {
        setMensaje({
          tipo: 'success',
          texto: 'Tutor académico actualizado de manera manual exitosamente.',
        });
        cargarDatos();
      }
    } catch (error) {
      console.error('Error al asignar tutor manualmente:', error);
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.message || 'Error al actualizar el tutor.',
      });
    } finally {
      setGuardandoTutor(false);
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000);
    }
  };

  // Agrupar documentos por fase
  const documentosPorFase = (fase) => {
    return documentos.filter((doc) => doc.fase === fase);
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '--';
    try {
      return format(new Date(fechaStr), "dd/MM/yyyy", { locale: es });
    } catch (e) {
      return '--';
    }
  };

  const generarReporteExcel = async () => {
    if (!estudiante || !estudiante.inscripcion) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte Prácticas');

      // Configurar cuadrícula visible
      worksheet.views = [{ showGridLines: true }];

      // Configurar anchos de columnas
      worksheet.columns = [
        { key: 'A', width: 25 },
        { key: 'B', width: 20 },
        { key: 'C', width: 35 },
        { key: 'D', width: 15 },
        { key: 'E', width: 15 },
        { key: 'F', width: 22 },
        { key: 'G', width: 55 },
      ];

      // Configurar alturas de filas para cabecera institucional
      worksheet.getRow(1).height = 20;
      worksheet.getRow(2).height = 20;
      worksheet.getRow(3).height = 20;
      worksheet.getRow(4).height = 20;

      // Intentar cargar e insertar el logo de la ESPOCH
      try {
        const response = await fetch('/espoch.png');
        const arrayBuffer = await response.arrayBuffer();
        const imageId = workbook.addImage({
          buffer: arrayBuffer,
          extension: 'png',
        });
        // Combinar A1:A4 para el logo
        worksheet.mergeCells('A1:A4');
        worksheet.addImage(imageId, {
          tl: { col: 0.08, row: 0.7 },
          ext: { width: 159, height: 68 },
          editAs: 'oneCell'
        });
      } catch (imgError) {
        console.error('Error al insertar el logo de la ESPOCH:', imgError);
        worksheet.mergeCells('A1:A4');
        const logoCell = worksheet.getCell('A1');
        logoCell.value = 'ESPOCH LOGO';
        logoCell.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF9E1B1B' } };
        logoCell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Títulos oficiales (B1:G4) - 100% Centrados
      const titulos = [
        { ref: 'B1:G1', text: 'ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO', size: 13, bold: true, color: 'FF0F2042' },
        { ref: 'B2:G2', text: 'FACULTAD DE INFORMÁTICA Y ELECTRÓNICA', size: 11, bold: true, color: 'FF0F2042' },
        { ref: 'B3:G3', text: 'CARRERA DE INGENIERÍA EN SOFTWARE', size: 10, bold: true, color: 'FF0F2042' },
        { ref: 'B4:G4', text: 'REPORTE OFICIAL DE PRÁCTICAS PREPROFESIONALES', size: 10, bold: true, color: 'FF9E1B1B' },
      ];

      titulos.forEach((t) => {
        worksheet.mergeCells(t.ref);
        const cell = worksheet.getCell(t.ref.split(':')[0]);
        cell.value = t.text;
        cell.font = { name: 'Segoe UI', size: t.size, bold: t.bold, color: { argb: t.color } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Bordes y fondo para el bloque de cabecera completo (filas 1 a 4)
      for (let r = 1; r <= 4; r++) {
        for (let c = 1; c <= 7; c++) {
          const cell = worksheet.getCell(r, c);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          cell.border = {
            top: r === 1 ? { style: 'medium', color: { argb: 'FF0F2042' } } : null,
            bottom: r === 4 ? { style: 'medium', color: { argb: 'FF0F2042' } } : null,
            left: c === 1 ? { style: 'medium', color: { argb: 'FF0F2042' } } : null,
            right: c === 7 ? { style: 'medium', color: { argb: 'FF0F2042' } } : null,
          };
        }
      }

      // Espaciador (Fila 5)
      worksheet.getRow(5).height = 15;

      // Helper para agregar títulos de secciones
      let currentRow = 6;
      const addSectionHeader = (title) => {
        worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
        const cell = worksheet.getCell(`A${currentRow}`);
        cell.value = title;
        cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Azul Real
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        worksheet.getRow(currentRow).height = 24;
        currentRow++;
      };

      // Helper para agregar campos clave/valor (Data Rows)
      const addDataRow = (data) => {
        const row = worksheet.getRow(currentRow);
        row.height = 20;

        let col = 1;
        data.forEach(([label, value, colSpan = 1, valSpan = 1]) => {
          // Etiqueta
          const lblCell = worksheet.getCell(currentRow, col);
          lblCell.value = label;
          lblCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF1E293B' } };
          lblCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          lblCell.alignment = { horizontal: 'right', vertical: 'middle' };
          
          if (colSpan > 1) {
            worksheet.mergeCells(currentRow, col, currentRow, col + colSpan - 1);
          }
          
          col += colSpan;

          // Valor
          const valCell = worksheet.getCell(currentRow, col);
          valCell.value = value;
          valCell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF334155' } };
          valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
          valCell.alignment = { horizontal: 'left', vertical: 'middle' };
          
          if (valSpan > 1) {
            worksheet.mergeCells(currentRow, col, currentRow, col + valSpan - 1);
          }

          col += valSpan;
        });

        // Aplicar bordes delgados a todas las celdas en el rango A:G de esta fila
        for (let c = 1; c <= 7; c++) {
          const cell = worksheet.getCell(currentRow, c);
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
        }

        currentRow++;
      };

      // I. DATOS GENERALES DEL ESTUDIANTE
      addSectionHeader('I. DATOS GENERALES DEL ESTUDIANTE');
      addDataRow([
        ['Nombres Completos:', estudiante.nombres || "No completado", 1, 2],
        ['Código Estudiante:', estudiante.codigo || "No completado", 1, 3]
      ]);
      addDataRow([
        ['Correo Institucional:', estudiante.usuario?.email || "--", 1, 2],
        ['Semestre Curricular:', estudiante.semestre ? `${estudiante.semestre}° Semestre` : "No completado", 1, 3]
      ]);
      addDataRow([
        ['Fecha de Registro:', formatearFecha(estudiante.createdAt), 1, 2],
        ['Estado del Proceso:', (estudiante.estadoProceso || "").toUpperCase(), 1, 3]
      ]);

      // Espaciador
      worksheet.getRow(currentRow).height = 15;
      currentRow++;

      // II. INFORMACIÓN DE LA INSCRIPCIÓN Y CONVENIO
      addSectionHeader('II. INFORMACIÓN DE LA INSCRIPCIÓN Y CONVENIO');
      addDataRow([
        ['Empresa / Convenio:', estudiante.inscripcion.convenio?.nombreEmpresa || "No asignado", 1, 2],
        ['Área de Práctica:', estudiante.inscripcion.convenio?.area || "No asignada", 1, 3]
      ]);
      addDataRow([
        ['Modalidad:', estudiante.inscripcion.tipoPractica === "comunitaria" ? "🤝 Práctica Comunitaria" : "💼 Práctica Laboral", 1, 2],
        ['Tutor Académico:', calificaciones?.tutor?.nombres || "Sin tutor asignado", 1, 3]
      ]);
      addDataRow([
        ['Fecha Inscripción:', formatearFecha(estudiante.inscripcion.fechaInscripcion), 1, 2],
        ['Estado Inscripción:', (estudiante.inscripcion.estadoInscripcion || "").toUpperCase(), 1, 3]
      ]);

      // Espaciador
      worksheet.getRow(currentRow).height = 15;
      currentRow++;

      // III. CONTROL DE HORAS CERTIFICADAS (190 HORAS)
      addSectionHeader('III. CONTROL DE HORAS CERTIFICADAS');
      addDataRow([
        ['Horas Requeridas:', 190, 1, 2],
        ['Horas Validadas:', 190, 1, 3]
      ]);
      
      // Descripción oficial larga
      const descRow = worksheet.getRow(currentRow);
      descRow.height = 45;
      const lblCell = worksheet.getCell(currentRow, 1);
      lblCell.value = 'Descripción Oficial:';
      lblCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF1E293B' } };
      lblCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      lblCell.alignment = { horizontal: 'right', vertical: 'middle' };

      worksheet.mergeCells(currentRow, 2, currentRow, 7);
      const valCell = worksheet.getCell(currentRow, 2);
      valCell.value = `Se certifica oficialmente que el estudiante ha cumplido satisfactoriamente con el total curricular obligatorio de 190 horas de actividades prácticas preprofesionales en la modalidad ${estudiante.inscripcion.tipoPractica === "comunitaria" ? "Comunitaria" : "Laboral"}, de conformidad con el reglamento de régimen académico de la ESPOCH, habiendo completado y aprobado todas las evaluaciones parciales y el expediente de entregables del proceso académico.`;
      valCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF475569' } };
      valCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      for (let c = 1; c <= 7; c++) {
        worksheet.getCell(currentRow, c).border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        };
      }
      currentRow++;

      // Espaciador
      worksheet.getRow(currentRow).height = 15;
      currentRow++;

      // IV. DETALLE DE CALIFICACIONES ACADÉMICAS POR CICLO
      addSectionHeader('IV. DETALLE DE CALIFICACIONES ACADÉMICAS');
      
      // Cabecera de la tabla
      const tblHeader = worksheet.getRow(currentRow);
      tblHeader.height = 22;
      const headers = [
        'Ciclo', 'Código Tarea', 'Título de la Tarea', 'Nota Obtenida', 'Puntaje Máximo', 'Estado Entrega', 'Comentario del Tutor'
      ];
      headers.forEach((h, idx) => {
        const c = tblHeader.getCell(idx + 1);
        c.value = h;
        c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF1E293B' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // Slate 200
        c.alignment = { horizontal: idx === 2 || idx === 6 ? 'left' : idx === 3 || idx === 4 ? 'right' : 'center', vertical: 'middle' };
        c.border = {
          top: { style: 'medium', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        };
      });
      currentRow++;

      // Datos de las calificaciones
      if (calificaciones?.ciclos && calificaciones.ciclos.length > 0) {
        calificaciones.ciclos.forEach((ciclo) => {
          if (ciclo.tareas && ciclo.tareas.length > 0) {
            ciclo.tareas.forEach((tarea) => {
              const r = worksheet.getRow(currentRow);
              r.height = 20;

              const c1 = r.getCell(1); c1.value = `Ciclo ${ciclo.numeroCiclo}`; c1.alignment = { horizontal: 'center', vertical: 'middle' };
              const c2 = r.getCell(2); c2.value = tarea.codigo || "--"; c2.alignment = { horizontal: 'center', vertical: 'middle' };
              const c3 = r.getCell(3); c3.value = tarea.titulo || "--"; c3.alignment = { horizontal: 'left', vertical: 'middle' };
              
              const notaVal = tarea.entrega ? (tarea.entrega.nota !== null ? parseFloat(tarea.entrega.nota) : null) : null;
              const c4 = r.getCell(4); c4.value = notaVal !== null ? notaVal : "--"; c4.alignment = { horizontal: 'right', vertical: 'middle' }; c4.font = { bold: true };
              
              const c5 = r.getCell(5); c5.value = tarea.puntajeMaximo || 10; c5.alignment = { horizontal: 'right', vertical: 'middle' };
              
              const estadoText = tarea.entrega ? (tarea.entrega.estado === "calificada" ? "Calificada" : "Entregada (Pendiente)") : "Sin entregar";
              const c6 = r.getCell(6); c6.value = estadoText; c6.alignment = { horizontal: 'center', vertical: 'middle' };
              
              // Badge de color para el estado de la entrega
              if (estadoText === "Calificada") {
                c6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Light Green
                c6.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF065F46' } };
              } else if (estadoText === "Entregada (Pendiente)") {
                c6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Light Amber
                c6.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF92400E' } };
              } else {
                c6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // Slate 100
                c6.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF64748B' } };
              }

              const c7 = r.getCell(7); c7.value = tarea.entrega?.comentarioDocente || "Sin comentario"; c7.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

              // Bordes finos
              for (let colIdx = 1; colIdx <= 7; colIdx++) {
                const cell = r.getCell(colIdx);
                if (colIdx !== 6) { // No sobreescribir el badge de estado
                  cell.font = { name: 'Segoe UI', size: 9, bold: colIdx === 4, color: { argb: 'FF334155' } };
                }
                cell.border = {
                  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                };
              }
              currentRow++;
            });

            // Fila de Promedio del Ciclo
            const rProm = worksheet.getRow(currentRow);
            rProm.height = 22;
            
            worksheet.mergeCells(currentRow, 1, currentRow, 3);
            const promLbl = rProm.getCell(1);
            promLbl.value = `Promedio Ciclo ${ciclo.numeroCiclo}:`;
            promLbl.alignment = { horizontal: 'right', vertical: 'middle' };

            const promVal = rProm.getCell(4);
            promVal.value = ciclo.promedio !== null ? parseFloat(ciclo.promedio) : "--";
            promVal.alignment = { horizontal: 'right', vertical: 'middle' };

            worksheet.mergeCells(currentRow, 5, currentRow, 6);
            const promBadge = rProm.getCell(5);
            promBadge.value = "Promedio Parcial Aprobado";
            promBadge.alignment = { horizontal: 'center', vertical: 'middle' };

            const promObs = rProm.getCell(7);
            promObs.value = `Evaluación del Ciclo Académico ${ciclo.numeroCiclo}`;
            promObs.alignment = { horizontal: 'left', vertical: 'middle' };

            // Estilo para toda la fila de promedio (verde esmeralda suave)
            for (let colIdx = 1; colIdx <= 7; colIdx++) {
              const cell = rProm.getCell(colIdx);
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } }; // Emerald 50
              cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF065F46' } };
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFD1FAE5' } },
                bottom: { style: 'medium', color: { argb: 'FF10B981' } }, // Subrayado verde
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              };
            }
            currentRow++;

          } else {
            const rEmpty = worksheet.getRow(currentRow);
            rEmpty.height = 20;
            worksheet.mergeCells(currentRow, 1, currentRow, 7);
            const cell = rEmpty.getCell(1);
            cell.value = `Ciclo ${ciclo.numeroCiclo}: Sin tareas creadas en este ciclo.`;
            cell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            
            for (let c = 1; c <= 7; c++) {
              rEmpty.getCell(c).border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              };
            }
            currentRow++;
          }
        });
      } else {
        const rEmpty = worksheet.getRow(currentRow);
        rEmpty.height = 20;
        worksheet.mergeCells(currentRow, 1, currentRow, 7);
        const cell = rEmpty.getCell(1);
        cell.value = "No se registran datos académicos en la plataforma.";
        cell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        for (let c = 1; c <= 7; c++) {
          rEmpty.getCell(c).border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        }
        currentRow++;
      }

      // Espaciador
      worksheet.getRow(currentRow).height = 15;
      currentRow++;

      // V. RESUMEN FINAL DE APROBACIÓN
      addSectionHeader('V. RESUMEN FINAL DE APROBACIÓN ACADÉMICA');
      
      const promedioFinal = calificaciones?.notaFinal !== null && calificaciones?.notaFinal !== undefined ? parseFloat(calificaciones.notaFinal) : null;
      const aprobado = promedioFinal >= 7.0 || estudiante.estadoProceso === "finalizado";

      const rRes = worksheet.getRow(currentRow);
      rRes.height = 24;

      const lblNota = rRes.getCell(1);
      lblNota.value = 'Nota Final Promedio:';
      lblNota.alignment = { horizontal: 'right', vertical: 'middle' };

      worksheet.mergeCells(currentRow, 2, currentRow, 3);
      const valNota = rRes.getCell(2);
      valNota.value = promedioFinal !== null ? promedioFinal : "--";
      valNota.alignment = { horizontal: 'left', vertical: 'middle' };

      const lblAprob = rRes.getCell(4);
      lblAprob.value = 'Estado de Aprobación:';
      lblAprob.alignment = { horizontal: 'right', vertical: 'middle' };

      worksheet.mergeCells(currentRow, 5, currentRow, 7);
      const valAprob = rRes.getCell(5);
      valAprob.value = aprobado ? "APROBADO ACADÉMICAMENTE" : "PENDIENTE DE CALIFICACIÓN";
      valAprob.alignment = { horizontal: 'center', vertical: 'middle' };

      // Estilo de tarjeta de aprobación
      const cardBgColor = aprobado ? 'FFDCFCE7' : 'FFFEF3C7'; // Fondo verde o amarillo
      const cardTxtColor = aprobado ? 'FF15803D' : 'FFB45309';

      for (let c = 1; c <= 7; c++) {
        const cell = rRes.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cardBgColor } };
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: cardTxtColor } };
        cell.border = {
          top: { style: 'medium', color: { argb: cardTxtColor } },
          bottom: { style: 'medium', color: { argb: cardTxtColor } },
          left: c === 1 ? { style: 'medium', color: { argb: cardTxtColor } } : c === 4 || c === 5 ? { style: 'thin', color: { argb: 'FFCBD5E1' } } : null,
          right: c === 7 ? { style: 'medium', color: { argb: cardTxtColor } } : null,
        };
      }
      currentRow++;



      // Escribir a buffer y descargar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      
      const modalidad = estudiante.inscripcion.tipoPractica === "comunitaria" ? "Comunitaria" : "Laboral";
      const codigoEstudiante = estudiante.codigo || "SIN_CODIGO";
      const nombresLimpios = (estudiante.nombres || "Estudiante").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      const nombreArchivo = `Reporte_Practicas_ESPOCH_${modalidad}_${codigoEstudiante}_${nombresLimpios}.xlsx`;

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nombreArchivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (excelError) {
      console.error('Error al generar el archivo Excel con ExcelJS:', excelError);
      alert('Ocurrió un error inesperado al generar el archivo Excel con formato enriquecido.');
    }
  };


  const habilitarDescarga = 
    estudiante?.estadoProceso === 'finalizado' || 
    (calificaciones?.notaFinal !== null && calificaciones?.notaFinal !== undefined && parseFloat(calificaciones.notaFinal) >= 7.0);

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

  if (!estudiante) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FiAlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Estudiante no encontrado
            </h3>
            <Link to="/admin/estudiantes" className="btn btn-primary mt-4">
              Volver a la lista
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const badge = getEstadoBadge(estudiante.estadoProceso);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header con botón volver */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/estudiantes')}
              className="btn btn-outline flex items-center space-x-2"
            >
              <FiArrowLeft className="h-5 w-5" />
              <span>Volver</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Detalle de Estudiante
              </h1>
              <p className="text-gray-600 mt-1">{estudiante.usuario.email}</p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center space-x-3">
            {habilitarDescarga ? (
              <button
                onClick={generarReporteExcel}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-700/30 transform hover:-translate-y-0.5 transition-all flex items-center space-x-2"
                title="Descargar Reporte Oficial de Prácticas ESPOCH en Excel"
              >
                <FiDownload className="h-5 w-5 animate-bounce" style={{ animationDuration: '2s' }} />
                <span>Descargar Reporte Oficial (Excel)</span>
              </button>
            ) : (
              <div 
                className="px-5 py-2.5 bg-gray-200 text-gray-400 font-semibold text-sm rounded-xl flex items-center space-x-2 cursor-not-allowed"
                title="El reporte se habilitará cuando el estudiante tenga un promedio académico de ciclos aprobado (>= 7.0) o complete todo el proceso."
              >
                <FiDownload className="h-5 w-5" />
                <span>Reporte Excel Bloqueado</span>
              </div>
            )}
            <button
              onClick={resetearEstudiante}
              className="btn btn-danger flex items-center space-x-2"
            >
              <FiRefreshCw className="h-5 w-5" />
              <span>Resetear</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda - Información personal */}
          <div className="lg:col-span-1 space-y-6">
            {/* Datos personales */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FiUser className="h-5 w-5 mr-2" />
                Datos Personales
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 flex items-center mb-1">
                    <FiUser className="h-4 w-4 mr-1" />
                    Nombres Completos
                  </label>
                  <p className="font-medium text-gray-900">
                    {estudiante.nombres || (
                      <span className="text-gray-400">No completado</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-600 flex items-center mb-1">
                    <FiMail className="h-4 w-4 mr-1" />
                    Email
                  </label>
                  <p className="font-medium text-gray-900">
                    {estudiante.usuario.email}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-600 flex items-center mb-1">
                    <FiHash className="h-4 w-4 mr-1" />
                    Código
                  </label>
                  <p className="font-medium text-gray-900">
                    {estudiante.codigo || (
                      <span className="text-gray-400">No completado</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-600 flex items-center mb-1">
                    <FiBookOpen className="h-4 w-4 mr-1" />
                    Semestre
                  </label>
                  <p className="font-medium text-gray-900">
                    {estudiante.semestre ? (
                      `${estudiante.semestre}°`
                    ) : (
                      <span className="text-gray-400">No completado</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-600 flex items-center mb-1">
                    <FiCalendar className="h-4 w-4 mr-1" />
                    Fecha de Registro
                  </label>
                  <p className="text-sm text-gray-900">
                    {format(
                      new Date(estudiante.createdAt),
                      "d 'de' MMMM, yyyy",
                      { locale: es }
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Estado del proceso */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Estado del Proceso
              </h2>

              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-700">Estado Actual:</span>
                <span className={`badge ${badge.color}`}>{badge.texto}</span>
              </div>

              <div className="text-sm text-gray-600">
                <p>
                  {estudiante.estadoProceso === 'sin_asignar' &&
                    'El estudiante aún no se ha inscrito a ningún convenio.'}
                  {estudiante.estadoProceso === 'asignado' &&
                    'Esperando aprobación de inscripción.'}
                  {estudiante.estadoProceso === 'pendiente_inicio' &&
                    'Debe subir documentos de Fase 2.'}
                  {estudiante.estadoProceso === 'en_proceso' &&
                    'En proceso de prácticas.'}
                  {estudiante.estadoProceso === 'finalizado' &&
                    'Ha completado todas las fases.'}
                </p>
              </div>
            </div>
          </div>

          {/* Columna derecha - Inscripción y documentos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información de inscripción */}
            {estudiante.inscripcion ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <FiBriefcase className="h-5 w-5 mr-2" />
                  Inscripción a Convenio
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">
                      Empresa
                    </label>
                    <p className="font-medium text-gray-900">
                      {estudiante.inscripcion.convenio.nombreEmpresa}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">
                      Área
                    </label>
                    <p className="font-medium text-gray-900">
                      {estudiante.inscripcion.convenio.area}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">
                      Modalidad
                    </label>
                    <span
                      className={`badge font-semibold ${
                        estudiante.inscripcion.tipoPractica === 'comunitaria'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {estudiante.inscripcion.tipoPractica === 'comunitaria'
                        ? '🤝 Comunitaria'
                        : '💼 Laboral'}
                    </span>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">
                      Estado de Inscripción
                    </label>
                    <span
                      className={`badge ${
                        estudiante.inscripcion.estadoInscripcion === 'aprobada'
                          ? 'badge-success'
                          : estudiante.inscripcion.estadoInscripcion ===
                            'pendiente'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                    >
                      {estudiante.inscripcion.estadoInscripcion === 'aprobada'
                        ? 'Aprobada'
                        : estudiante.inscripcion.estadoInscripcion ===
                          'pendiente'
                        ? 'Pendiente'
                        : 'Rechazada'}
                    </span>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">
                      Fecha de Inscripción
                    </label>
                    <p className="text-sm text-gray-900">
                      {format(
                        new Date(estudiante.inscripcion.fechaInscripcion),
                        "d 'de' MMMM, yyyy",
                        { locale: es }
                      )}
                    </p>
                  </div>
                </div>

                {/* TUTOR ACADÉMICO - ASIGNACIÓN MANUAL */}
                {estudiante.inscripcion.estadoInscripcion === 'aprobada' && (
                  <div className="mt-6 pt-5 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center mb-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mr-2"></span>
                      👨‍🏫 Tutor Académico Asignado
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <select
                        value={tutorSeleccionado || ''}
                        onChange={(e) => setTutorSeleccionado(e.target.value || null)}
                        className="flex-1 input bg-gray-50 border-gray-200 focus:bg-white text-sm"
                      >
                        <option value="">-- Sin Tutor Asignado --</option>
                        {docentes.map((docente) => (
                          <option key={docente.id} value={docente.id}>
                            {docente.nombres} ({docente.tipoTutor === 'ambas' ? 'Ambas Especialidades' : docente.tipoTutor === 'comunales' ? 'Comunales' : 'Laborales'})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={guardarTutorManual}
                        disabled={guardandoTutor || estudiante.inscripcion.tutorId === (tutorSeleccionado ? parseInt(tutorSeleccionado) : null)}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-all flex items-center justify-center space-x-2"
                      >
                        {guardandoTutor ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <FiCheck className="h-4 w-4" />
                            <span>Actualizar Tutor</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Puedes modificar el tutor en cualquier momento. La auto-asignación balanceada distribuirá equitativamente los alumnos restantes sin tutor.
                    </p>
                  </div>
                )}

                {/* BOTONES DE APROBACIÓN/RECHAZO DE INSCRIPCIÓN */}
                {estudiante.inscripcion.estadoInscripcion === 'pendiente' && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-800 mb-1">
                          ⏳ Inscripción pendiente de aprobación
                        </p>
                        <p className="text-sm text-yellow-700">
                          Revisa los datos del estudiante y aprueba o rechaza su inscripción.
                        </p>
                      </div>
                      <div className="flex items-center space-x-3 ml-4">
                        <button
                          onClick={() => aprobarInscripcion(estudiante.inscripcion.id)}
                          disabled={procesando === 'inscripcion'}
                          className="btn btn-success flex items-center space-x-2 whitespace-nowrap"
                        >
                          <FiCheck className="h-5 w-5" />
                          <span>{procesando === 'inscripcion' ? 'Aprobando...' : 'Aprobar'}</span>
                        </button>
                        <button
                          onClick={() => abrirModalRechazoInscripcion(estudiante.inscripcion.id)}
                          disabled={procesando === 'inscripcion'}
                          className="btn btn-danger flex items-center space-x-2 whitespace-nowrap"
                        >
                          <FiX className="h-5 w-5" />
                          <span>Rechazar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {estudiante.inscripcion.comentarioAdmin && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm font-medium text-red-800 mb-1">
                      Comentario del Administrador:
                    </p>
                    <p className="text-sm text-red-900">
                      {estudiante.inscripcion.comentarioAdmin}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <FiAlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Sin Inscripción
                </h3>
                <p className="text-gray-600">
                  El estudiante aún no se ha inscrito a ningún convenio.
                </p>
              </div>
            )}

            {/* Documentos por Fase - SOLO SI LA INSCRIPCIÓN ESTÁ APROBADA */}
            {documentos.length > 0 && estudiante.inscripcion?.estadoInscripcion === 'aprobada' && (
              <div className="space-y-4">
                {/* Fase 2 */}
                {documentosPorFase(2).length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      📄 Fase 2: Documentos Iniciales
                    </h3>
                    <div className="space-y-3">
                      {documentosPorFase(2).map((doc) => (
                        <DocumentoItem
                          key={doc.id}
                          documento={doc}
                          procesando={procesando}
                          onAprobar={aprobarDocumento}
                          onRechazar={abrirModalRechazoDocumento}
                          onDescargar={descargarDocumento}
                          getEstadoDocBadge={getEstadoDocBadge}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Fase 3 */}
                {documentosPorFase(3).length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      📄 Fase 3: Respuesta de la Empresa
                    </h3>
                    <div className="space-y-3">
                      {documentosPorFase(3).map((doc) => (
                        <DocumentoItem
                          key={doc.id}
                          documento={doc}
                          procesando={procesando}
                          onAprobar={aprobarDocumento}
                          onRechazar={abrirModalRechazoDocumento}
                          onDescargar={descargarDocumento}
                          getEstadoDocBadge={getEstadoDocBadge}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Fase 4 */}
                {documentosPorFase(4).length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      📄 Fase 4: Certificado Final
                    </h3>
                    <div className="space-y-3">
                      {documentosPorFase(4).map((doc) => (
                        <DocumentoItem
                          key={doc.id}
                          documento={doc}
                          procesando={procesando}
                          onAprobar={aprobarDocumento}
                          onRechazar={abrirModalRechazoDocumento}
                          onDescargar={descargarDocumento}
                          getEstadoDocBadge={getEstadoDocBadge}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal de rechazo (para documentos e inscripción) */}
        {modalRechazo.abierto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {modalRechazo.tipo === 'inscripcion' ? 'Rechazar Inscripción' : 'Rechazar Documento'}
                </h2>
                <button
                  onClick={() =>
                    setModalRechazo({ abierto: false, documentoId: null, tipo: 'documento' })
                  }
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              {modalRechazo.tipo === 'documento' && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Documento: <strong>{modalRechazo.tipoDocumento}</strong>
                  </p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo del rechazo *
                </label>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows="4"
                  className="input"
                  placeholder={
                    modalRechazo.tipo === 'inscripcion'
                      ? 'Explica por qué se rechaza la inscripción (será enviado al estudiante)'
                      : 'Explica el motivo del rechazo (será enviado al estudiante)'
                  }
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() =>
                    setModalRechazo({ abierto: false, documentoId: null, tipo: 'documento' })
                  }
                  className="flex-1 btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={modalRechazo.tipo === 'inscripcion' ? rechazarInscripcion : rechazarDocumento}
                  className="flex-1 btn btn-danger"
                  disabled={!motivoRechazo.trim() || procesando}
                >
                  {procesando ? 'Procesando...' : 'Rechazar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente para cada documento
const DocumentoItem = ({
  documento,
  procesando,
  onAprobar,
  onRechazar,
  onDescargar,
  getEstadoDocBadge,
}) => {
  const badge = getEstadoDocBadge(documento.estado);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-1 pr-2 sm:pr-6">
          <FiFileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {documento.tipoDocumento}
            </p>
            <p className="text-xs text-gray-500 whitespace-nowrap">
              Subido el{' '}
              {format(new Date(documento.fechaSubida), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                locale: es,
              })}
            </p>
            {documento.estado === 'rechazado' && documento.comentarioAdmin && (
              <p className="text-sm text-red-600 mt-1">
                <strong>Motivo de rechazo:</strong> {documento.comentarioAdmin}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-wrap sm:flex-nowrap justify-start sm:justify-end">
          <span className={`badge ${badge.color} flex-shrink-0`}>
            <badge.icon className="h-4 w-4 mr-1" />
            {badge.texto}
          </span>

          <button
            onClick={() => onDescargar(documento.id, documento.nombreArchivo)}
            className="btn btn-secondary btn-sm flex items-center space-x-1"
            title="Descargar documento"
          >
            <FiDownload className="h-4 w-4" />
          </button>

          {documento.estado === 'pendiente' && (
            <>
              <button
                onClick={() => onAprobar(documento.id, documento.tipoDocumento)}
                disabled={procesando === documento.id}
                className="btn btn-success btn-sm flex items-center space-x-1"
                title="Aprobar documento"
              >
                <FiCheck className="h-4 w-4" />
                <span>{procesando === documento.id ? 'Aprobando...' : 'Aprobar'}</span>
              </button>
              <button
                onClick={() => onRechazar(documento.id, documento.tipoDocumento)}
                disabled={procesando === documento.id}
                className="btn btn-danger btn-sm flex items-center space-x-1"
                title="Rechazar documento"
              >
                <FiX className="h-4 w-4" />
                <span>Rechazar</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetalleEstudiante;