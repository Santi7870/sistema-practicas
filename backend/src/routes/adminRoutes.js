const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
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

// Dashboard
router.get('/dashboard', adminController.obtenerEstadisticas);

// Gestión de Docentes y asignaciones
router.post('/docentes', adminController.crearDocente);
router.get('/docentes', adminController.obtenerDocentes);
router.post('/docentes/auto-asignar', adminController.autoAsignarTutores);
router.put('/estudiantes/:estudianteId/asignar-tutor', adminController.asignarTutorManual);

module.exports = router;