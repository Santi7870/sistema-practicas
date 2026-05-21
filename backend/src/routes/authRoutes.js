const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Rutas públicas (no requieren autenticación)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/cambiar-password-obligatorio', authController.cambiarPasswordObligatorio);

// Rutas protegidas (requieren autenticación)
router.get('/me', verificarToken, authController.getMe);

module.exports = router;