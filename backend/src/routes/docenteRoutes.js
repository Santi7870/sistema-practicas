const express = require('express');
const router = express.Router();
const docenteController = require('../controllers/docenteController');
const tareaController = require('../controllers/tareaController');
const { verificarToken, esDocente } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación y rol de docente
router.use(verificarToken);
router.use(esDocente);

// Listado y detalle de estudiantes bajo tutoría
router.get('/estudiantes', docenteController.obtenerEstudiantesAsignados);
router.get('/estudiantes/:estudianteId', docenteController.obtenerDetalleEstudiante);

// Revisión de entregables
router.put('/documentos/:documentoId/revisar', docenteController.revisarDocumento);

// Módulo académico por ciclos/tareas
router.post('/tareas', tareaController.crearTarea);
router.get('/tareas', tareaController.listarTareas);
router.put('/tareas/:tareaId', tareaController.editarTarea);
router.delete('/tareas/:tareaId', tareaController.eliminarTarea);
router.get('/tareas/:tareaId/entregas', tareaController.verEntregasDeTarea);
router.put('/entregas/:entregaId/calificar', tareaController.calificarEntrega);
router.get('/entregas/pendientes', tareaController.entregasPendientesRecientes);
router.get('/entregas/:entregaId/preview', tareaController.previewEntrega);
router.get('/entregas/:entregaId/descargar', tareaController.descargarEntrega);
router.get('/estudiantes/:estudianteId/calificaciones', tareaController.libroCalificaciones);

module.exports = router;
