const express = require('express');
const router = express.Router();
const convenioController = require('../controllers/convenioController');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

// Rutas públicas (autenticadas)
router.get('/', verificarToken, convenioController.obtenerConvenios);
router.get('/disponibles', verificarToken, convenioController.obtenerConveniosDisponibles);
router.get('/:id', verificarToken, convenioController.obtenerConvenioPorId);

// Rutas de administrador
router.post('/bulk', verificarToken, esAdmin, convenioController.crearConveniosMasivo);
router.post('/', verificarToken, esAdmin, convenioController.crearConvenio);
router.put('/:id', verificarToken, esAdmin, convenioController.actualizarConvenio);
router.delete('/:id', verificarToken, esAdmin, convenioController.eliminarConvenio);

module.exports = router;