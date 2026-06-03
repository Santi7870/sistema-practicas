const express = require('express');
const router = express.Router();
const paraleloController = require('../controllers/paraleloController');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

// Proteger todas las rutas de paralelos con autenticación y rol de admin
router.use(verificarToken);
router.use(esAdmin);

router.get('/', paraleloController.obtenerParalelos);
router.post('/distribuir-estudiantes', paraleloController.distribuirEstudiantes);
router.post('/distribuir-docentes', paraleloController.distribuirDocentes);
router.put('/:id/docente', paraleloController.asignarDocenteAParalelo);
router.put('/mover-estudiante', paraleloController.moverEstudiante);

module.exports = router;
