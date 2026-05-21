const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacionController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas de notificaciones
router.get('/', notificacionController.obtenerNotificaciones);
router.get('/no-leidas', notificacionController.obtenerNoLeidas);
router.put('/:notificacionId/marcar-leida', notificacionController.marcarComoLeida);
router.put('/marcar-todas-leidas', notificacionController.marcarTodasLeidas);
router.delete('/:notificacionId', notificacionController.eliminarNotificacion);

module.exports = router;