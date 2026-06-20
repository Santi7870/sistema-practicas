const express = require('express');
const router = express.Router();
const formatoController = require('../controllers/formatoController');
const { verificarToken, esDocente } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Todas las rutas requieren autenticación básica
router.use(verificarToken);

// Obtener todos los formatos oficiales de documentos y descargarlos
router.get('/', formatoController.obtenerFormatos);
router.get('/:id/descargar', formatoController.descargarFormato);

// Rutas de administración para subir y eliminar formatos (sólo Docente)
router.post('/', esDocente, upload.single('archivo'), formatoController.subirFormato);
router.delete('/:id', esDocente, formatoController.eliminarFormato);

module.exports = router;
