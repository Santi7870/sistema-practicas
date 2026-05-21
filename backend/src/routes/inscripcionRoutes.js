const express = require('express');
const router = express.Router();
const inscripcionController = require('../controllers/inscripcionController');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas de estudiante
router.post('/', inscripcionController.crearInscripcion);
router.get('/mi-inscripcion', inscripcionController.obtenerMiInscripcion);

// Rutas de administrador
router.get('/:inscripcionId', esAdmin, inscripcionController.obtenerInscripcionPorId);
router.put('/:inscripcionId/aprobar', esAdmin, inscripcionController.aprobarInscripcion);
router.put('/:inscripcionId/rechazar', esAdmin, inscripcionController.rechazarInscripcion);

module.exports = router;