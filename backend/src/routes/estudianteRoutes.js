const express = require('express');
const router = express.Router();
const estudianteController = require('../controllers/estudianteController');
const upload = require('../middlewares/uploadMiddleware');
const { verificarToken } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas de estudiante
router.get('/perfil', estudianteController.obtenerPerfil);
router.put('/completar-datos', estudianteController.completarDatos);
router.get('/mis-practicas', estudianteController.obtenerMisPracticas);
router.get('/dashboard', estudianteController.obtenerDashboard);
router.put('/iniciar-laborales', estudianteController.iniciarLaborales);
router.get('/tareas', estudianteController.obtenerTareas);
router.get('/tareas/:tareaId/descargar-plantilla', estudianteController.descargarPlantillaTareaEstudiante);
router.post('/tareas/:tareaId/entregar', upload.single('archivo'), estudianteController.entregarTarea);
router.get('/calificaciones', estudianteController.obtenerMisCalificaciones);
router.get('/entregas/:entregaId/preview', estudianteController.previewMiEntrega);
router.get('/entregas/:entregaId/descargar', estudianteController.descargarMiEntrega);

module.exports = router;
