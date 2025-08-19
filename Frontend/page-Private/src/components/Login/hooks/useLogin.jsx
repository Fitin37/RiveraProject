import { useState } from "react";
import { useAuth } from "../../../Context/AuthContext";
import { useNavigate } from "react-router-dom";

const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (email, password) => {
    setLoading(true);
    
    try {
      // 🔄 Llamar directamente al API
      const response = await fetch('https://riveraproject-5.onrender.com/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Para incluir cookies
      });

      const data = await response.json();
      
      // ✅ LOGIN EXITOSO (200)
      if (response.ok && response.status === 200) {
        // Actualizar el contexto de autenticación
        await login(email, password);
        navigate("/dashboard");
        
        return {
          success: true,
          message: data.message,
          user: data.user,
          userType: data.userType
        };
      }

      // 🔒 USUARIO BLOQUEADO (429 - Too Many Requests)
      if (response.status === 429) {
        console.log('🔒 Usuario bloqueado:', data);
        return {
          success: false,
          blocked: true,
          message: data.message || 'Demasiados intentos fallidos',
          timeRemaining: data.timeRemaining || 300,
          minutesRemaining: Math.ceil((data.timeRemaining || 300) / 60)
        };
      }

      // ❌ CREDENCIALES INCORRECTAS CON INTENTOS RESTANTES (400)
      if (response.status === 400) {
        console.log('❌ Intento fallido:', data);
        return {
          success: false,
          blocked: false,
          message: data.message || 'Credenciales incorrectas',
          attemptsRemaining: data.attemptsRemaining || 0
        };
      }

      // 🚨 OTROS ERRORES DEL SERVIDOR
      console.log('🚨 Error del servidor:', response.status, data);
      return {
        success: false,
        blocked: false,
        message: data.message || `Error del servidor (${response.status})`
      };

    } catch (error) {
      console.error('🌐 Error de red:', error);
      
      // ⚠️ IMPORTANTE: fetch() no rechaza automáticamente para códigos 4xx/5xx
      // Solo rechaza para errores de red reales
      return {
        success: false,
        blocked: false,
        message: "Error de conexión con el servidor. Verifica tu conexión a internet."
      };
    } finally {
      // ✅ SIEMPRE establecer loading en false
      setLoading(false);
    }
  };

  return { handleLogin, loading };
};

export default useLogin;