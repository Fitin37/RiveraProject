// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// 🧠 Contexto
const AuthContext = createContext();

// ⏰ Configuración de expiración (20 minutos)
const SESSION_TIMEOUT = 20 * 60 * 1000;

// 🔤 Utilidades
const norm = (v) => (v ?? '').toString().trim().toLowerCase();
const ALLOWED_USER_TYPES = new Set(['cliente']); // agrega alias si aplica: 'customer', 'client'

// 🧩 Provider
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState(null);
  const [user, setUser] = useState(null);
  const [sessionTimer, setSessionTimer] = useState(null);

  useEffect(() => {
    checkAuthStatus();

    return () => {
      if (sessionTimer) {
        clearTimeout(sessionTimer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔍 Verificar si hay una sesión guardada
  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Verificando sesión de cliente guardada...');

      const [
        token,
        loginTime,
        onboardingCompleted,
        userData,
        savedUserType,
        clientId,
      ] = await AsyncStorage.multiGet([
        'clientToken',
        'clientLoginTime',
        'onboardingCompleted',
        'clientData',
        'clientUserType',
        'clientId',
      ]).then((pairs) => pairs.map(([, v]) => v));

      if (token && loginTime) {
        const currentTime = Date.now();
        const timeSinceLogin = currentTime - parseInt(loginTime, 10);
        console.log(`⏰ Tiempo desde login: ${Math.round(timeSinceLogin / 60000)} min`);

        if (timeSinceLogin < SESSION_TIMEOUT) {
          const remainingTime = SESSION_TIMEOUT - timeSinceLogin;

          // Validar tipo de usuario
          if (!ALLOWED_USER_TYPES.has(norm(savedUserType))) {
            console.log('🚫 Usuario no permitido - cerrando sesión', { savedUserType });
            await clearAuthData();
            setIsLoading(false);
            return;
          }

          // Restaurar estado
          setIsAuthenticated(true);
          setHasCompletedOnboarding(onboardingCompleted === 'true');
          setUser(userData ? JSON.parse(userData) : null);
          setUserType('Cliente'); // forzamos etiqueta estándar en memoria
          console.log(`✅ Sesión válida. Expira en: ${Math.round(remainingTime / 60000)} min`);
          console.log(`📋 Cliente ID guardado: ${clientId}`);

          // Programar auto-logout
          startSessionTimer(remainingTime);
        } else {
          console.log('❌ Sesión expirada - limpiando datos');
          await clearAuthData();
          Alert.alert(
            '⏰ Sesión Expirada',
            'Tu sesión ha expirado por seguridad. Por favor, inicia sesión nuevamente.',
            [{ text: 'OK' }]
          );
        }
      } else {
        console.log('📭 No hay sesión de cliente guardada');
      }

      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error verificando sesión:', error);
      await clearAuthData();
      setIsLoading(false);
    }
  };

  // ⏲️ Iniciar timer de sesión
  const startSessionTimer = (timeoutDuration = SESSION_TIMEOUT) => {
    if (sessionTimer) {
      clearTimeout(sessionTimer);
    }

    const timer = setTimeout(async () => {
      console.log('⏰ Sesión de cliente expirada automáticamente');
      await autoLogout();
    }, timeoutDuration);

    setSessionTimer(timer);
    console.log(`⏰ Timer de cliente iniciado: ${Math.round(timeoutDuration / 60000)} min`);
  };

  // 🚪 Auto-logout por expiración
  const autoLogout = async () => {
    try {
      console.log('🔒 Cerrando sesión automáticamente por expiración');
      await clearAuthData();
      Alert.alert(
        '⏰ Sesión Expirada',
        'Tu sesión ha expirado por seguridad. Por favor, inicia sesión nuevamente.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Error en auto-logout:', error);
    }
  };

  // 🧹 Limpiar todos los datos de autenticación
  const clearAuthData = async () => {
    try {
      await AsyncStorage.multiRemove([
        'clientToken',
        'clientLoginTime',
        'onboardingCompleted',
        'clientData',
        'clientUserType',
        'clientId',
        'authToken', // compatibilidad
      ]);

      setIsAuthenticated(false);
      setHasCompletedOnboarding(false);
      setUserType(null);
      setUser(null);

      if (sessionTimer) {
        clearTimeout(sessionTimer);
        setSessionTimer(null);
      }

      console.log('🧹 Datos de cliente limpiados');
    } catch (error) {
      console.error('❌ Error limpiando datos:', error);
    }
  };

  // 🔐 Login con persistencia (solo clientes)
  const login = async (loginData) => {
    try {
      console.log('🔐 Procesando login de cliente:', loginData);

      // Validar tipo
      if (!ALLOWED_USER_TYPES.has(norm(loginData?.userType))) {
        return {
          success: false,
          error: `Acceso denegado. Esta app es solo para clientes. Tu tipo: ${loginData?.userType}`,
        };
      }

      // Exigir token real (recomendado)
      if (!loginData?.token) {
        return { success: false, error: 'No se recibió token del backend' };
      }

      const currentTime = Date.now();
      const userId = loginData?.user?._id || loginData?.user?.id;
      if (!userId) {
        throw new Error('ID de cliente no disponible');
      }

      await AsyncStorage.multiSet([
        ['clientToken', loginData.token],
        ['authToken', loginData.token], // compatibilidad
        ['clientLoginTime', String(currentTime)],
        ['clientData', JSON.stringify(loginData.user)],
        ['clientUserType', 'Cliente'], // estándar interno
        ['clientId', String(userId)],
        ['onboardingCompleted', 'true'], // ⇦ si quieres forzar onboarding cambia a 'false'
      ]);

      setUser(loginData.user);
      setUserType('Cliente');
      setIsAuthenticated(true);
      setHasCompletedOnboarding(true); // ⇦ si quieres onboarding: false
      startSessionTimer();

      console.log('✅ Login de cliente completado y guardado');
      return { success: true };
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: error?.message ?? String(error) };
    }
  };

  // 📝 Registro (usuarios nuevos - solo clientes)
  const register = async (registrationData) => {
    try {
      console.log('📝 Registrando nuevo cliente:', registrationData);

      const incomingType = norm(registrationData?.userType ?? 'cliente');
      if (!ALLOWED_USER_TYPES.has(incomingType)) {
        return { success: false, error: 'Solo se pueden registrar clientes en esta aplicación' };
      }

      const currentTime = Date.now();
      const userId = registrationData?.user?._id || registrationData?.user?.id;
      const realToken = registrationData?.token;

      if (!userId) throw new Error('ID de cliente no disponible');
      if (!realToken) throw new Error('No se recibió token del backend');

      await AsyncStorage.multiSet([
        ['clientToken', realToken],
        ['authToken', realToken],
        ['clientLoginTime', String(currentTime)],
        ['clientData', JSON.stringify(registrationData.user)],
        ['clientUserType', 'Cliente'],
        ['clientId', String(userId)],
        ['onboardingCompleted', 'false'], // ⇦ si quieres saltar onboarding cámbialo a 'true'
      ]);

      setUser(registrationData.user);
      setUserType('Cliente');
      setIsAuthenticated(true);
      setHasCompletedOnboarding(false); // ⇦ o true si saltas onboarding
      startSessionTimer();

      console.log('📊 Registro de cliente completado');
      return { success: true };
    } catch (error) {
      console.error('❌ Register error:', error);
      return { success: false, error: error?.message ?? String(error) };
    }
  };

  // 🎉 Completar onboarding
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      setHasCompletedOnboarding(true);
      console.log('🎉 Onboarding de cliente completado');
      return { success: true };
    } catch (error) {
      console.error('❌ Complete onboarding error:', error);
      return { success: false, error: error?.message ?? String(error) };
    }
  };

  // 🚪 Logout manual
  const logout = async () => {
    try {
      console.log('👋 Logout manual de cliente');
      await clearAuthData();
      return { success: true };
    } catch (error) {
      console.error('❌ Logout error:', error);
      return { success: false, error: error?.message ?? String(error) };
    }
  };

  // 🔄 Renovar sesión (extender tiempo)
  const refreshSession = async () => {
    try {
      const currentTime = Date.now();
      await AsyncStorage.setItem('clientLoginTime', String(currentTime));
      startSessionTimer(); // reiniciar timer
      console.log('🔄 Sesión de cliente renovada por 20 minutos más');
      return { success: true };
    } catch (error) {
      console.error('❌ Error renovando sesión:', error);
      return { success: false, error: error?.message ?? String(error) };
    }
  };

  // ⏰ Obtener tiempo restante de sesión (minutos)
  const getRemainingTime = async () => {
    try {
      const loginTime = await AsyncStorage.getItem('clientLoginTime');
      if (loginTime) {
        const currentTime = Date.now();
        const timeSinceLogin = currentTime - parseInt(loginTime, 10);
        const remainingTime = Math.max(0, SESSION_TIMEOUT - timeSinceLogin);
        return Math.round(remainingTime / 60000);
      }
      return 0;
    } catch (error) {
      console.error('❌ Error obteniendo tiempo restante:', error);
      return 0;
    }
  };

  const value = {
    isAuthenticated,
    hasCompletedOnboarding,
    isLoading,
    userType,
    user,
    login,
    register,
    completeOnboarding,
    logout,
    refreshSession,
    getRemainingTime,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 🔗 Hook para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export default AuthContext;
