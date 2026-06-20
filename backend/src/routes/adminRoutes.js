const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const configuracionController = require('../controllers/configuracionController');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación y rol de admin
router.use(verificarToken);
router.use(esAdmin);

// Gestión de registros pendientes
router.get('/registros-pendientes', adminController.obtenerRegistrosPendientes);
router.put('/aprobar-registro/:usuarioId', adminController.aprobarRegistro);
router.put('/rechazar-registro/:usuarioId', adminController.rechazarRegistro);

// Gestión de estudiantes
router.get('/estudiantes', adminController.obtenerEstudiantes);
router.get('/estudiantes/:estudianteId', adminController.obtenerDetalleEstudiante);
router.get('/estudiantes/:estudianteId/calificaciones', adminController.obtenerCalificacionesEstudiante);
router.get('/entregas/:entregaId/descargar', adminController.descargarEntregaEstudiante);
router.put('/estudiantes/:estudianteId/cambiar-convenio', adminController.cambiarConvenio);
router.put('/estudiantes/:estudianteId/resetear', adminController.resetearEstudiante);
router.put('/inscripciones/:inscripcionId/revisar', adminController.revisarInscripcion);
router.put('/inscripciones/:inscripcionId/reabrir-plazo', adminController.reabrirPlazoRequisitos);

// Dashboard
router.get('/dashboard', adminController.obtenerEstadisticas);

// Gestión de Docentes y asignaciones
router.post('/docentes', adminController.crearDocente);
router.get('/docentes', adminController.obtenerDocentes);
router.put('/docentes/:docenteId', adminController.actualizarDocente);
router.post('/docentes/auto-asignar', adminController.autoAsignarTutores);
router.put('/estudiantes/:estudianteId/asignar-tutor', adminController.asignarTutorManual);

// Gestión de configuraciones globales
router.get('/configuraciones', configuracionController.obtenerConfiguraciones);
router.put('/configuraciones/:clave', configuracionController.actualizarConfiguracion);

module.exports = router;