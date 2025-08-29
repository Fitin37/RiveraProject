import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { config } from "../config.js";
import EmpleadoModel from "../Models/Empleados.js";
import MotoristaModel from "../Models/Motorista.js";
import ClienteModel from "../Models/Clientes.js";

const LoginController = {};

// ===================== Intentos fallidos =====================
const failedAttempts = new Map();

const isBlocked = (email) => {
  const d = failedAttempts.get(email);
  if (!d) return false;
  if (d.blockedUntil && new Date() < d.blockedUntil) return true;
  if (d.blockedUntil && new Date() >= d.blockedUntil) {
    failedAttempts.delete(email);
    return false;
  }
  return false;
};

const recordFailedAttempt = (email) => {
  const d = failedAttempts.get(email) || { attempts: 0, blockedUntil: null };
  d.attempts += 1;
  if (d.attempts >= 4) {
    d.blockedUntil = new Date(Date.now() + 5 * 60 * 1000);
    console.log(`🔒 ${email} bloqueado hasta ${d.blockedUntil} (intentos: ${d.attempts})`);
  }
  failedAttempts.set(email, d);
  return d;
};

const clearFailedAttempts = (email) => failedAttempts.delete(email);

const getBlockTimeRemaining = (email) => {
  const d = failedAttempts.get(email);
  if (!d?.blockedUntil) return 0;
  return Math.max(0, Math.ceil((d.blockedUntil.getTime() - Date.now()) / 1000));
};

// ===================== Helper para Set-Cookie (Corregido) =====================
const setAuthCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";
  
  res.cookie("authToken", token, {
    path: "/",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    ...(isProd && { partitioned: true }) // CHIPS solo en producción
  });
  
  console.log("🍪 [LOGIN] Cookie configurada correctamente");
};

// ===================== 🆕 GOOGLE LOGIN =====================
LoginController.GoogleLogin = async (req, res) => {
  const { googleToken, googleUser } = req.body;
  
  console.log("🔍 [GOOGLE LOGIN] Iniciando login con Google");
  console.log("👤 Usuario de Google:", googleUser.email);

  try {
    // Validar datos de Google
    if (!googleToken || !googleUser || !googleUser.email) {
      return res.status(400).json({
        message: "Datos de Google incompletos"
      });
    }

    const email = googleUser.email.toLowerCase();
    let userFound;
    let userType = "Cliente"; // Por defecto será cliente
    let isNewUser = false;

    // Limpiar intentos fallidos si los hubiera (Google auth es confiable)
    clearFailedAttempts(email);

    // 1) Buscar en todas las colecciones por email
    // Primero buscar en Empleados
    userFound = await EmpleadoModel.findOne({ email });
    if (userFound) {
      userType = "Empleado";
      console.log("✅ Usuario encontrado como Empleado");
    } else {
      // Buscar en Motoristas
      userFound = await MotoristaModel.findOne({ email });
      if (userFound) {
        userType = "Motorista";
        console.log("✅ Usuario encontrado como Motorista");
      } else {
        // Buscar en Clientes
        userFound = await ClienteModel.findOne({ email });
        if (userFound) {
          userType = "Cliente";
          console.log("✅ Usuario encontrado como Cliente existente");
          
          // Actualizar información del cliente con datos de Google
          userFound.firstName = googleUser.given_name || userFound.firstName;
          userFound.lastName = googleUser.family_name || userFound.lastName;
          userFound.googleId = googleUser.id;
          userFound.profilePicture = googleUser.picture || userFound.profilePicture;
          
          await userFound.save();
          console.log("🔄 Información del cliente actualizada con datos de Google");
        } else {
          // Usuario no existe, crear nuevo cliente
          console.log("🆕 Creando nuevo cliente desde Google");
          isNewUser = true;
          
          const newClient = new ClienteModel({
            email: email,
            firstName: googleUser.given_name || 'Usuario',
            lastName: googleUser.family_name || 'Google',
            password: await bcryptjs.hash(googleUser.id + Date.now(), 10), // Password temporal
            googleId: googleUser.id,
            profilePicture: googleUser.picture || null,
            isGoogleUser: true,
            emailVerified: googleUser.verified_email || false,
            // Campos adicionales que puede tener tu modelo Cliente
            telefono: null,
            direccion: null,
            fechaNacimiento: null,
            createdAt: new Date(),
          });

          userFound = await newClient.save();
          userType = "Cliente";
          console.log("✅ Nuevo cliente creado:", userFound._id);
        }
      }
    }

    // 2) Generar JWT token
    if (!config.JWT.secret) {
      console.error("❌ Falta JWT secret en config.js");
      return res.status(500).json({ message: "Error del servidor: JWT" });
    }

    jwt.sign(
      { id: userFound._id, userType },
      config.JWT.secret,
      { expiresIn: config.JWT.expiresIn },
      (err, token) => {
        if (err) {
          console.error("❌ Error firmando JWT:", err);
          return res.status(500).json({ message: "Error al generar token" });
        }

        // Configurar cookie
        setAuthCookie(res, token);

        // Respuesta exitosa
        console.log("✅ Login con Google exitoso");
        return res.status(200).json({
          message: isNewUser ? "Cuenta creada y login completado" : "Inicio de sesión con Google completado",
          userType,
          user: {
            id: userFound._id,
            email: userFound.email,
            nombre: userFound.firstName || userFound.nombre || userFound.name || googleUser.name,
            apellido: userFound.lastName || null,
            profilePicture: userFound.profilePicture || googleUser.picture,
            userType,
            isGoogleUser: true,
            isNewUser
          },
          token,
        });
      }
    );

  } catch (error) {
    console.error("💥 [GOOGLE LOGIN] Error:", error);
    return res.status(500).json({ 
      message: "Error interno del servidor en login con Google",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===================== LOGIN =====================
LoginController.Login = async (req, res) => {
  const { email, password } = req.body;
  console.log("🔐 [LOGIN] email:", email);

  try {
    // Bloqueo por intentos
    if (isBlocked(email)) {
      const sec = getBlockTimeRemaining(email);
      return res.status(429).json({
        message: `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(sec / 60)} minuto(s).`,
        blocked: true,
        timeRemaining: sec,
      });
    }

    const currentAttempts = failedAttempts.get(email)?.attempts || 0;
    if (currentAttempts >= 4) {
      const d = failedAttempts.get(email);
      if (!d.blockedUntil) {
        d.blockedUntil = new Date(Date.now() + 5 * 60 * 1000);
        failedAttempts.set(email, d);
      }
      const sec = getBlockTimeRemaining(email);
      return res.status(429).json({
        message: `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(sec / 60)} minuto(s).`,
        blocked: true,
        timeRemaining: sec,
      });
    }

    let userFound;
    let userType;
    let valid = false;

    // 1) Admin
    if (email === config.ADMIN.emailAdmin) {
      if (password !== config.ADMIN.password) {
        const d = recordFailedAttempt(email);
        const remaining = Math.max(0, 4 - d.attempts);
        return res.status(400).json({
          message: `Contraseña incorrecta. Te quedan ${remaining} intento(s).`,
          attemptsRemaining: remaining,
        });
      }
      userType = "Administrador";
      userFound = { _id: "admin", email };
      valid = true;
    } else {
      // 2) Empleado
      userFound = await EmpleadoModel.findOne({ email });
      if (userFound) {
        valid = await bcryptjs.compare(password, userFound.password);
        if (!valid) {
          const d = recordFailedAttempt(email);
          const remaining = Math.max(0, 4 - d.attempts);
          return res.status(400).json({
            message: `Contraseña incorrecta. Te quedan ${remaining} intento(s).`,
            attemptsRemaining: remaining,
          });
        }
        userType = "Empleado";
      } else {
        // 3) Motorista
        userFound = await MotoristaModel.findOne({ email });
        if (userFound) {
          valid = await bcryptjs.compare(password, userFound.password);
          if (!valid) {
            const d = recordFailedAttempt(email);
            const remaining = Math.max(0, 4 - d.attempts);
            return res.status(400).json({
              message: `Contraseña incorrecta. Te quedan ${remaining} intento(s).`,
              attemptsRemaining: remaining,
            });
          }
          userType = "Motorista";
        } else {
          // 4) Cliente
          // En tu LoginController.js, en la sección de Cliente, agrega estos logs:

// 4) Cliente
userFound = await ClienteModel.findOne({ email });
if (!userFound) {
  console.log('❌ Cliente no encontrado para email:', email);
  const d = recordFailedAttempt(email);
  const remaining = Math.max(0, 4 - d.attempts);
  return res.status(400).json({
    message: `Usuario no encontrado. Te quedan ${remaining} intento(s).`,
    attemptsRemaining: remaining,
  });
}

// ✅ AGREGAR ESTOS LOGS DE DEBUG:
console.log('✅ Cliente encontrado:', userFound._id);
console.log('📧 Email en DB:', userFound.email);
console.log('👤 Nombre:', userFound.firstName, userFound.lastName);
console.log('🔍 Password hash en DB:', userFound.password);
console.log('🔍 Hash length:', userFound.password ? userFound.password.length : 'NULL');
console.log('🔍 Password recibido:', password);
console.log('🔍 Password length recibido:', password.length);

valid = await bcryptjs.compare(password, userFound.password);
console.log('🔑 bcrypt.compare result:', valid);

if (!valid) {
  console.log('❌ Contraseña incorrecta para cliente');
  
  // ✅ PROBAR ALGUNAS VARIACIONES PARA DEBUG:
  const trimmedPassword = password.trim();
  if (trimmedPassword !== password) {
    const trimmedValid = await bcryptjs.compare(trimmedPassword, userFound.password);
    console.log('🔍 Probando sin espacios:', trimmedValid);
  }
  
  const d = recordFailedAttempt(email);
  const remaining = Math.max(0, 4 - d.attempts);
  return res.status(400).json({
    message: `Contraseña incorrecta. Te quedan ${remaining} intento(s).`,
    attemptsRemaining: remaining,
  });
}

console.log('✅ Login de cliente exitoso');
userType = "Cliente";
        }
      }
    }

    // ✅ Login exitoso
    clearFailedAttempts(email);

    if (!config.JWT.secret) {
      console.error("❌ Falta JWT secret en config.js");
      return res.status(500).json({ message: "Error del servidor: JWT" });
    }

    jwt.sign(
      { id: userFound._id, userType },
      config.JWT.secret,
      { expiresIn: config.JWT.expiresIn },
      (err, token) => {
        if (err) {
          console.error("❌ Error firmando JWT:", err);
          return res.status(500).json({ message: "Error al generar token" });
        }

        // ✅ Configurar cookie correctamente
        setAuthCookie(res, token);

        return res.status(200).json({
          message: "Inicio de sesión completado",
          userType,
          user: {
            id: userFound._id,
            email: userFound.email || email,
            nombre: userFound.nombre || userFound.name || null,
            userType
          },
          token,
        });
      }
    );
  } catch (e) {
    console.error("💥 [LOGIN] Error:", e);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// ===================== CHECK AUTH (Corregido) =====================
LoginController.checkAuth = async (req, res) => {
  try {
    console.log("🔍 [checkAuth] Verificando autenticación");
    const token = req.cookies?.authToken;
    
    // ✅ Devolver 200 con user: null en lugar de 401
    if (!token) {
      return res.status(200).json({ 
        message: "No hay sesión activa", 
        user: null 
      });
    }

    jwt.verify(token, config.JWT.secret, async (err, decoded) => {
      if (err) {
        // ✅ También devolver 200 con user: null
        return res.status(200).json({ 
          message: "Token inválido", 
          user: null 
        });
      }

      const { id, userType } = decoded;
      
      if (userType === "Administrador") {
        return res.status(200).json({
          user: { 
            id, 
            email: config.ADMIN.emailAdmin, 
            userType: "Administrador" 
          },
        });
      }

      let Model = null;
      if (userType === "Empleado") Model = EmpleadoModel;
      else if (userType === "Motorista") Model = MotoristaModel;
      else if (userType === "Cliente") Model = ClienteModel;
      else {
        return res.status(200).json({ 
          message: "Tipo de usuario inválido", 
          user: null 
        });
      }

const userFound = await Model.findById(id).select("email nombre name firstName lastName profilePicture googleId");      if (!userFound) {
        return res.status(200).json({ 
          message: `${userType} no encontrado`, 
          user: null 
        });
      }

      return res.status(200).json({
  user: {
    id: userFound._id,
    email: userFound.email,
    userType,
    nombre: userFound.firstName || userFound.nombre || userFound.name || null,
    apellido: userFound.lastName || null,
    profilePicture: userFound.profilePicture || null,
    isGoogleUser: !!userFound.googleId,
  },
});
    });
  } catch (e) {
    console.error("💥 [checkAuth] Error:", e);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// ===================== LOGOUT =====================
LoginController.logout = async (req, res) => {
  try {
    // Limpiar cookie del servidor
    res.clearCookie("authToken", {
      path: "/",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production"
    });
    
    return res.status(200).json({ message: "Logout exitoso" });
  } catch (error) {
    console.error("❌ [LOGOUT] Error:", error);
    return res.status(500).json({ message: "Error en logout" });
  }
};

export default LoginController;