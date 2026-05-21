import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({
  children,
  adminOnly = false,
  docenteOnly = false,
  estudianteOnly = false,
  allowPasswordChangePending = false,
}) => {
  const { autenticado, cargando, esAdmin, esDocente, esEstudiante, usuario } = useAuth();

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  // Si debe cambiar password y no estamos en la página permitida, forzar redirección
  if (usuario?.debeCambiarPassword && !allowPasswordChangePending) {
    return <Navigate to="/cambiar-password-obligatorio" replace />;
  }

  if (adminOnly && !esAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (docenteOnly && !esDocente()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (estudianteOnly && !esEstudiante()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PrivateRoute;
