const express = require('express');
const router = express.Router();
const documentoController = require('../controllers/documentoController');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas de estudiante
router.post('/subir', upload.single('documento'), documentoController.subirDocumento);
router.get('/mis-documentos', documentoController.obtenerMisDocumentos);
router.get('/:documentoId/descargar', documentoController.descargarDocumento);
router.delete('/estudiante/:documentoId', documentoController.eliminarDocumentoEstudiante);

// Rutas de administrador
router.get('/inscripcion/:inscripcionId', esAdmin, documentoController.obtenerDocumentosPorInscripcion);
router.put('/:documentoId/aprobar', esAdmin, documentoController.aprobarDocumento);
router.put('/:documentoId/rechazar', esAdmin, documentoController.rechazarDocumento);
router.delete('/:documentoId', esAdmin, documentoController.eliminarDocumento);

module.exports = router;