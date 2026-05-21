-- ============================================
-- SEED: Usuario Administrador Inicial
-- ============================================
-- IMPORTANTE: Cambiar la contraseña después del primer login

-- Insertar usuario administrador
-- Email: admin@espoch.edu.ec
-- Password: Admin123! (debe ser cambiada)
-- Hash generado con bcrypt (10 rounds)

INSERT INTO usuarios (email, password, rol, estado_cuenta, created_at, updated_at)
VALUES (
    'admin@espoch.edu.ec',
    '$2a$10$YourHashedPasswordHere', -- Este hash debe ser generado con bcrypt
    'admin',
    'activo',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Usuario administrador creado';
    RAISE NOTICE '📧 Email: admin@espoch.edu.ec';
    RAISE NOTICE '🔑 Password: Admin123! (CAMBIAR INMEDIATAMENTE)';
    RAISE NOTICE '⚠️  IMPORTANTE: Cambiar la contraseña en el primer login';
END $$;

-- ============================================
-- NOTA IMPORTANTE:
-- El hash de la contraseña debe ser generado
-- usando bcrypt. Puedes generarlo usando Node.js:
--
-- const bcrypt = require('bcryptjs');
-- const hash = await bcrypt.hash('Admin123!', 10);
-- console.log(hash);
-- ============================================