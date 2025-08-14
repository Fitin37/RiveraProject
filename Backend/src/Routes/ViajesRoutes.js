// Routes/ViajesRoutes.js - RUTAS OPTIMIZADAS Y FUNCIONALES
import express from "express";
import ViajesController from "../Controllers/Viajes.js";

const router = express.Router();

// =====================================================
// 🆕 RUTAS PRINCIPALES DE GESTIÓN DE VIAJES
// =====================================================

// 🚛 CREAR NUEVO VIAJE
router.post("/", ViajesController.addTrip);

// 🚛 GESTIÓN DE RECURSOS
router.put("/:viajeId/assign-resources", ViajesController.assignResources);
router.put("/:viajeId/start", ViajesController.startTrip);

// 🚛 GESTIÓN MASIVA Y CLONACIÓN
router.put("/bulk-update", ViajesController.bulkUpdateTrips);
router.post("/:viajeId/clone", ViajesController.cloneTrip);

// 🚛 VIAJES DISPONIBLES
router.get("/available", ViajesController.getAvailableTrips);

// =====================================================
// 📊 RUTAS DE DASHBOARD Y MÉTRICAS
// =====================================================

// 📊 DASHBOARD COMPLETO
router.get("/dashboard", ViajesController.getDashboard);

// 📊 MÉTRICAS EN TIEMPO REAL
router.get("/real-time-metrics", ViajesController.getRealTimeMetrics);

// =====================================================
// 📍 RUTAS DEL MAPA Y DATOS EN TIEMPO REAL
// =====================================================

// 🗺️ DATOS DEL MAPA
router.get("/map-data", ViajesController.getMapData);

// =====================================================
// 📊 RUTAS DE ANÁLISIS Y ESTADÍSTICAS
// =====================================================

// 📦 ANÁLISIS DE CARGAS
router.get("/carga-distribution", ViajesController.getCargaDistribution);
router.get("/tipos-cargas", ViajesController.getTiposDeCargas);
router.get("/carga-stats", ViajesController.getCargaStats);

// 📈 ESTADÍSTICAS DE VIAJES
router.get("/trip-stats", ViajesController.getTripStats);

// =====================================================
// 📅 RUTAS DE ORGANIZACIÓN TEMPORAL
// =====================================================

// 📅 VIAJES ORGANIZADOS POR DÍAS
router.get("/por-dias", ViajesController.getViajesPorDias);

// 📅 VIAJES COMPLETADOS
router.get("/completed", ViajesController.getCompletedTrips);


// En tu archivo routes/viajes.js
router.get('/tiempo-promedio', ViajesController.getTiempoPromedioViaje);
router.get('/capacidad-carga', ViajesController.getCapacidadCarga);
 // Opcional: todas las métricas en una sola llamada

// =====================================================
// 🚛 RUTAS DE GESTIÓN DE VIAJES INDIVIDUALES
// =====================================================

// 📋 OBTENER TODOS LOS VIAJES
router.get("/all", ViajesController.getAllViajes);

// 📋 DETALLES DE VIAJE ESPECÍFICO
router.get("/:viajeId", ViajesController.getTripDetails);

// 📍 ACTUALIZACIÓN DE UBICACIÓN GPS
router.patch("/:viajeId/location", ViajesController.updateLocation);

// 📊 ACTUALIZACIÓN DE PROGRESO
router.patch("/:viajeId/progress", ViajesController.updateTripProgress);

// ✅ COMPLETAR VIAJE MANUALMENTE
router.patch("/:viajeId/complete", ViajesController.completeTrip);

// =====================================================
// 🔧 MIDDLEWARE DE VALIDACIÓN (OPCIONAL)
// =====================================================

// Middleware para validar ObjectId en parámetros
router.param('viajeId', (req, res, next, viajeId) => {
  if (!/^[0-9a-fA-F]{24}$/.test(viajeId)) {
    return res.status(400).json({
      success: false,
      message: "ID de viaje inválido",
      error: "El ID debe ser un ObjectId válido de MongoDB"
    });
  }
  next();
});



export default router;