import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [estudiante, setEstudiante] = useState(null);
  const [docente, setDocente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);

  // Cargar usuario del localStorage al iniciar
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        const token = localStorage.getItem('token');
        const usuarioGuardado = localStorage.getItem('usuario');

        if (token && usuarioGuardado) {
          setUsuario(JSON.parse(usuarioGuardado));
          setAutenticado(true);

          // Obtener datos actualizados del servidor
          const response = await api.get('/auth/me');
          setUsuario(response.data.data);
          
          if (response.data.data.estudiante) {
            setEstudiante(response.data.data.estudiante);
          }
          if (response.data.data.docente) {
            setDocente(response.data.data.docente);
          }
        }
      } catch (error) {
        console.error('Error al cargar usuario:', error);
        logout();
      } finally {
        setCargando(false);
      }
    };

    cargarUsuario();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, usuario: usuarioData, estudiante: estudianteData, docente: docenteData } = response.data.data;

      // Guardar en localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuarioData));

      // Actualizar estado
      setUsuario(usuarioData);
      setEstudiante(estudianteData || null);
      setDocente(docenteData || null);
      setAutenticado(true);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al iniciar sesión',
      };
    }
  };

  const register = async (email, password, confirmPassword) => {
    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        confirmPassword,
      });

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al registrarse',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
    setEstudiante(null);
    setDocente(null);
    setAutenticado(false);
  };

  const actualizarEstudiante = (datosEstudiante) => {
    setEstudiante(datosEstudiante);
  };

  const esAdmin = () => {
    return usuario?.rol === 'admin';
  };

  const esEstudiante = () => {
    return usuario?.rol === 'estudiante';
  };

  const esDocente = () => {
    return usuario?.rol === 'docente';
  };

  const value = {
    usuario,
    estudiante,
    docente,
    cargando,
    autenticado,
    login,
    register,
    logout,
    actualizarEstudiante,
    esAdmin,
    esEstudiante,
    esDocente,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};