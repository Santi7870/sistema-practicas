const express = require('express');
const router = express.Router();
const inscripcionController = require('../controllers/inscripcionController');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

const upload = require('../middlewares/uploadMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas de estudiante
router.post('/', inscripcionController.crearInscripcion);
router.get('/mi-inscripcion', inscripcionController.obtenerMiInscripcion);
router.post('/requisitos', upload.fields([{ name: 'requisito1', maxCount: 1 }, { name: 'requisito2', maxCount: 1 }]), inscripcionController.subirRequisitos);
router.delete('/cancelar-postulacion', inscripcionController.cancelarPostulacion);

// Rutas de administrador
router.get('/:inscripcionId', esAdmin, inscripcionController.obtenerInscripcionPorId);
router.put('/:inscripcionId/aprobar', esAdmin, inscripcionController.aprobarInscripcion);
router.put('/:inscripcionId/rechazar', esAdmin, inscripcionController.rechazarInscripcion);

module.exports = router;