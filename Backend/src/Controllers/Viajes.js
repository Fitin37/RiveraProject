// Controllers/Viajes.js - PARTE 1: IMPORTS Y CONFIGURACIÓN INICIAL
import ViajesModel from "../Models/Viajes.js";
import mongoose from 'mongoose';
import autoUpdateService from "../services/autoUpdateService.js";

// 🔗 IMPORTS ADICIONALES PARA LOS MODELOS REFERENCIADOS
import CotizacionesModel from "../Models/Cotizaciones.js"; // ⚠️ CORREGIDO: .js en lugar de .model
import CamionesModel from "../Models/Camiones.js";
import MotoristaModel from "../Models/Motorista.js";

const ViajesController = {};

// =====================================================
// 🎯 FUNCIÓN PARA GENERAR VIAJES DE EJEMPLO
// =====================================================
function generarViajesEjemplo(fechaBase, dias) {
  const viajes = [];
  const estados = ['pendiente', 'en_curso', 'retrasado', 'completado', 'cancelado'];
  const origenes = ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana'];
  const destinos = ['Cancún', 'Mérida', 'Oaxaca', 'Veracruz', 'León'];
  const cargas = ['Electrónicos', 'Alimentos', 'Maquinaria', 'Textiles', 'Productos químicos'];
  const conductores = ['Juan Pérez', 'María González', 'Carlos Rodríguez', 'Ana López', 'Luis Martínez'];
  const camiones = ['Freightliner Cascadia', 'Volvo VNL', 'Kenworth T680', 'Peterbilt 579', 'Mack Anthem'];
 
  for (let dia = 0; dia < dias; dia++) {
    const fecha = new Date(fechaBase);
    fecha.setDate(fechaBase.getDate() + dia);
 
    // Generar 2-5 viajes por día
    const viajesPorDia = Math.floor(Math.random() * 4) + 2;
 
    for (let i = 0; i < viajesPorDia; i++) {
      const hora = Math.floor(Math.random() * 12) + 6; // 6AM - 6PM
      const minuto = Math.floor(Math.random() * 60);
     
      const fechaSalida = new Date(fecha);
      fechaSalida.setHours(hora, minuto, 0, 0);
 
      const fechaLlegada = new Date(fechaSalida);
      fechaLlegada.setHours(fechaSalida.getHours() + Math.floor(Math.random() * 8) + 2); // +2 a +10 horas
 
      // Distribuir estados de manera realista
      let estado;
      if (dia === 0) { // Hoy - más variedad
        estado = estados[Math.floor(Math.random() * estados.length)];
      } else if (dia === 1) { // Mañana - mayormente pendientes
        estado = Math.random() < 0.8 ? 'pendiente' : estados[Math.floor(Math.random() * estados.length)];
      } else { // Días futuros - solo pendientes
        estado = 'pendiente';
      }
 
      const viaje = {
        id: `ejemplo_${dia}_${i}`,
        departureTime: fechaSalida,
        arrivalTime: fechaLlegada,
        origen: origenes[Math.floor(Math.random() * origenes.length)],
        destino: destinos[Math.floor(Math.random() * destinos.length)],
        description: cargas[Math.floor(Math.random() * cargas.length)] +
                    ` - ${Math.floor(Math.random() * 25) + 5} toneladas`,
        estado: estado,
        driver: conductores[Math.floor(Math.random() * conductores.length)],
        truck: camiones[Math.floor(Math.random() * camiones.length)],
        driverPhone: `+52 ${Math.floor(Math.random() * 900000000) + 100000000}`,
        distancia: Math.floor(Math.random() * 800) + 100, // 100-900 km
        progreso: estado === 'en_curso' ? Math.floor(Math.random() * 60) + 20 : 0,
        alertas: Math.random() < 0.3 ? { // 30% de probabilidad de alertas
          count: Math.floor(Math.random() * 3) + 1,
          prioridad: Math.floor(Math.random() * 3) + 1
        } : null
      };
 
      viajes.push(viaje);
    }
  }
 
  return viajes;
}

// Controllers/Viajes.js - PARTE 2: GETMAPDATA

// =====================================================
// GET: Datos optimizados para el mapa
// =====================================================
ViajesController.getMapData = async (req, res) => {
  try {
    console.log("🗺️ Obteniendo datos del mapa con esquema real...");
 
    // 🚛 OBTENER VIAJES CON POPULATE CORRECTO
    const viajes = await ViajesModel.find({
      'estado.actual': { $in: ['pendiente', 'en_curso', 'retrasado', 'completado'] }
    })
    .populate('truckId', 'brand model licensePlate name marca modelo placa nombre')
    .populate('conductorId', 'name phone nombre telefono')
    .populate({
      path: 'quoteId',
      select: 'clientId quoteName quoteDescription travelLocations truckType deliveryDate paymentMethod status price ruta carga horarios costos observaciones notasInternas',
      populate: {
        path: 'clientId',
        select: 'nombre name email telefono phone direccion address empresa'
      }
    })
    .select('-tracking.checkpoints')
    .sort({ departureTime: 1 })
    .lean();
 
    console.log(`🚛 Encontrados ${viajes.length} viajes totales`);
   
    const viajesConCotizacion = viajes.filter(v => v.quoteId);
    const viajesSinCotizacion = viajes.filter(v => !v.quoteId);
    console.log(`🧾 Con cotización: ${viajesConCotizacion.length}`);
    console.log(`📋 Sin cotización: ${viajesSinCotizacion.length}`);
 
    // 🗺️ CREAR MAPA DE UBICACIONES
    const locationMap = new Map();
   
    // 🏢 TERMINAL PRINCIPAL
    locationMap.set("Terminal Principal", {
      name: "Terminal Principal",
      coords: [13.8833, -89.1000],
      type: "red",
      number: "HQ",
      description: "Centro de operaciones principal",
      tripCount: 0,
      isTerminal: true,
      details: "Base principal de Rivera Transport"
    });
 
    // 🛣️ PROCESAR RUTAS CON TU ESQUEMA
    const routes = viajes.map((viaje, index) => {
      try {
        const cotizacion = viaje.quoteId;
       
        // 📍 OBTENER COORDENADAS DE RUTA
        let origen, destino, distanciaTotal, tiempoEstimado;
       
        if (cotizacion && cotizacion.ruta) {
          origen = cotizacion.ruta.origen;
          destino = cotizacion.ruta.destino;
          distanciaTotal = cotizacion.ruta.distanciaTotal;
          tiempoEstimado = cotizacion.ruta.tiempoEstimado;
        } else {
          origen = {
            nombre: "Terminal Rivera",
            coordenadas: { lat: 13.8833, lng: -89.1000 },
            tipo: "terminal"
          };
          destino = {
            nombre: "Destino General",
            coordenadas: { lat: 13.6929, lng: -89.2182 },
            tipo: "ciudad"
          };
          distanciaTotal = 50;
          tiempoEstimado = 2;
        }
 
        // ⚠️ VALIDAR COORDENADAS OBLIGATORIO
        if (!origen?.coordenadas?.lat || !destino?.coordenadas?.lat) {
          return null;
        }
 
        // 📍 COORDENADAS FINALES
        const coordinates = [
          [origen.coordenadas.lat, origen.coordenadas.lng],
          [destino.coordenadas.lat, destino.coordenadas.lng]
        ];
 
        // 📊 ESTADO DEL VIAJE
        let status = "scheduled";
        let statusText = "Programado";
       
        switch (viaje.estado.actual) {
          case "en_curso":
            status = "in_progress";
            statusText = "En tránsito";
            break;
          case "completado":
            status = "completed";
            statusText = "Completado";
            break;
          case "cancelado":
            status = "cancelled";
            statusText = "Cancelado";
            break;
          case "retrasado":
            status = "delayed";
            statusText = "Retrasado";
            break;
          default:
            status = "scheduled";
            statusText = "Programado";
        }
 
        // 🚛 INFORMACIÓN DEL CAMIÓN
        const getTruckInfo = () => {
          const truck = viaje.truckId;
          if (!truck) return "Camión por asignar";
         
          const brand = truck.brand || truck.marca || "";
          const model = truck.model || truck.modelo || "";
          const plate = truck.licensePlate || truck.placa || "";
          const name = truck.name || truck.nombre || "";
         
          if (brand && model) {
            return `${brand} ${model}${plate ? ` (${plate})` : ''}`;
          }
          if (name) {
            return `${name}${plate ? ` (${plate})` : ''}`;
          }
          if (plate) {
            return `Camión ${plate}`;
          }
          return "Camión disponible";
        };
 
        // 👤 INFORMACIÓN DEL CONDUCTOR
        const getDriverInfo = () => {
          const conductor = viaje.conductorId;
          if (conductor?.name || conductor?.nombre) {
            return conductor.name || conductor.nombre;
          }
          return "Conductor por asignar";
        };
 
        // ⏰ CALCULAR PROGRESO
        let progreso = viaje.tracking?.progreso?.porcentaje || 0;
        let ubicacionActual = "Terminal";
        
        if (viaje.estado.actual === 'en_curso' || viaje.estado.actual === 'retrasado') {
          if (progreso === 0) {
            const ahora = new Date();
            const salidaProgramada = new Date(viaje.departureTime);
            const llegadaProgramada = new Date(viaje.arrivalTime);
            const tiempoTotal = llegadaProgramada - salidaProgramada;
            const tiempoTranscurrido = ahora - salidaProgramada;
            progreso = Math.min(95, Math.max(0, (tiempoTranscurrido / tiempoTotal) * 100));
          }
         
          if (viaje.tracking?.ubicacionActual) {
            ubicacionActual = `${Math.round(progreso)}% - GPS activo`;
          } else {
            ubicacionActual = `${Math.round(progreso)}% completado`;
          }
        } else if (viaje.estado.actual === 'completado') {
          progreso = 100;
          ubicacionActual = destino.nombre;
        } else if (viaje.estado.actual === 'pendiente') {
          ubicacionActual = origen.nombre;
        }
 
        // 📦 INFORMACIÓN DE CARGA
        const cargaInfo = cotizacion?.carga;
        const carga = cargaInfo?.descripcion || 'Carga general';
        const peso = cargaInfo?.peso?.valor ?
          ` - ${cargaInfo.peso.valor} ${cargaInfo.peso.unidad || 'kg'}` : '';
 
        // 🎯 CREAR OBJETO DE RUTA
        const routeObj = {
          id: viaje._id.toString(),
          coordinates,
          status,
          statusText,
          frequency: viaje.estado.actual === "en_curso" ? "high" :
                    viaje.estado.actual === "retrasado" ? "high" : "medium",
         
          distance: distanciaTotal ? `${distanciaTotal} km` : "N/A",
          estimatedTime: tiempoEstimado ?
            `${Math.floor(tiempoEstimado)}h ${Math.round((tiempoEstimado % 1) * 60)}min` :
            "N/A",
         
          tripInfo: {
            driver: getDriverInfo(),
            driverPhone: viaje.conductorId?.phone || viaje.conductorId?.telefono || "No disponible",
            truck: getTruckInfo(),
            cargo: carga + peso,
           
            departure: new Date(viaje.departureTime).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit"
            }),
            arrival: new Date(viaje.arrivalTime).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit"
            }),
            estimatedArrival: viaje.arrivalTime ? new Date(viaje.arrivalTime).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit"
            }) : "N/A",
           
            progress: Math.round(progreso),
            currentLocation: ubicacionActual,
           
            realDeparture: viaje.tiemposReales?.salidaReal ?
              new Date(viaje.tiemposReales.salidaReal).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit"
              }) : null,
            realArrival: viaje.tiemposReales?.llegadaReal ?
              new Date(viaje.tiemposReales.llegadaReal).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit"
              }) : null
          },
         
          description: viaje.tripDescription || 'Sin descripción',
         
          route: {
            from: origen.nombre,
            to: destino.nombre,
            fromType: origen.tipo || 'ciudad',
            toType: destino.tipo || 'ciudad',
            totalPoints: 2,
            currentPoint: 0,
            quoteId: cotizacion?._id
          },
         
          alerts: viaje.alertas?.filter(alert => !alert.resuelta).map(alert => ({
            type: alert.tipo,
            message: alert.mensaje,
            priority: alert.prioridad || 'media',
            date: alert.fecha
          })) || [],
         
          costs: viaje.costosReales || cotizacion?.costos ? {
            fuel: viaje.costosReales?.combustible || cotizacion?.costos?.combustible || 0,
            tolls: viaje.costosReales?.peajes || cotizacion?.costos?.peajes || 0,
            driver: viaje.costosReales?.conductor || cotizacion?.costos?.conductor || 0,
            others: viaje.costosReales?.otros || cotizacion?.costos?.otros || 0,
            total: viaje.costosReales?.total || cotizacion?.costos?.total || 0
          } : null,
         
          conditions: viaje.condiciones ? {
            weather: viaje.condiciones.clima,
            traffic: viaje.condiciones.trafico,
            road: viaje.condiciones.carretera
          } : null,
         
          quotation: cotizacion ? {
            _id: cotizacion._id,
            quoteName: cotizacion.quoteName || 'Cotización sin nombre',
            quoteDescription: cotizacion.quoteDescription || '',
            travelLocations: cotizacion.travelLocations || '',
           
            clientId: cotizacion.clientId ? {
              _id: cotizacion.clientId._id || cotizacion.clientId,
              nombre: cotizacion.clientId.nombre || cotizacion.clientId.name || 'Cliente no especificado',
              email: cotizacion.clientId.email || '',
              telefono: cotizacion.clientId.telefono || cotizacion.clientId.phone || '',
              empresa: cotizacion.clientId.empresa || ''
            } : null,
           
            truckType: cotizacion.truckType || 'otros',
            deliveryDate: cotizacion.deliveryDate,
            paymentMethod: cotizacion.paymentMethod,
            status: cotizacion.status || 'pendiente',
            price: cotizacion.price || 0,
           
            ruta: cotizacion.ruta ? {
              origen: cotizacion.ruta.origen,
              destino: cotizacion.ruta.destino,
              distanciaTotal: cotizacion.ruta.distanciaTotal,
              tiempoEstimado: cotizacion.ruta.tiempoEstimado
            } : null,
           
            carga: cotizacion.carga ? {
              categoria: cotizacion.carga.categoria,
              subcategoria: cotizacion.carga.subcategoria,
              descripcion: cotizacion.carga.descripcion,
              peso: cotizacion.carga.peso,
              volumen: cotizacion.carga.volumen,
              clasificacionRiesgo: cotizacion.carga.clasificacionRiesgo,
              condicionesEspeciales: cotizacion.carga.condicionesEspeciales,
              valorDeclarado: cotizacion.carga.valorDeclarado
            } : null,
           
            horarios: cotizacion.horarios ? {
              fechaSalida: cotizacion.horarios.fechaSalida,
              fechaLlegadaEstimada: cotizacion.horarios.fechaLlegadaEstimada,
              tiempoEstimadoViaje: cotizacion.horarios.tiempoEstimadoViaje,
              flexibilidadHoraria: cotizacion.horarios.flexibilidadHoraria,
              horarioPreferido: cotizacion.horarios.horarioPreferido
            } : null,
           
            costos: cotizacion.costos || null,
            observaciones: cotizacion.observaciones || '',
            notasInternas: cotizacion.notasInternas || ''
           
          } : null,
         
          integration: {
            hasCotizacion: !!cotizacion,
            hasRuta: !!(cotizacion?.ruta),
            hasHorarios: !!(cotizacion?.horarios),
            hasCliente: !!(cotizacion?.clientId),
            hasCarga: !!(cotizacion?.carga),
            autoUpdateEnabled: viaje.estado?.autoActualizar !== false,
            progressMethod: viaje.tracking?.ubicacionActual ? 'gps' : 'time_based'
          }
        };
        
        // 📍 AGREGAR UBICACIONES AL MAPA
        [origen, destino].forEach(ubicacion => {
          if (ubicacion && ubicacion.nombre && ubicacion.coordenadas) {
            const key = ubicacion.nombre;
            if (!locationMap.has(key)) {
              locationMap.set(key, {
                name: ubicacion.nombre,
                coords: [ubicacion.coordenadas.lat, ubicacion.coordenadas.lng],
                type: ubicacion.tipo === 'terminal' ? 'red' :
                      ubicacion.tipo === 'puerto' ? 'blue' : 'green',
                number: "1",
                description: `${ubicacion.tipo || 'Ubicación'} - 1 viaje`,
                tripCount: 1,
                isTerminal: ubicacion.tipo === 'terminal',
                details: `${ubicacion.tipo || 'Ubicación'} en ${ubicacion.nombre}`,
                quotationInfo: {
                  hasQuotation: !!cotizacion,
                  quotationId: cotizacion?._id
                }
              });
            } else {
              const location = locationMap.get(key);
              location.tripCount++;
              location.number = location.tripCount.toString();
              location.description = `${location.tripCount} viajes programados`;
            }
          }
        });
 
        return routeObj;
 
      } catch (error) {
        console.error(`❌ Error procesando viaje ${index + 1}:`, error.message);
        return null;
      }
    }).filter(route => route !== null);
 
    // 🏙️ CIUDADES DE REFERENCIA
    const cities = [
      { name: "San Salvador", coords: [13.6929, -89.2182] },
      { name: "Soyapango", coords: [13.7167, -89.1389] },
      { name: "Mejicanos", coords: [13.7408, -89.2075] },
      { name: "Santa Ana", coords: [13.9942, -89.5592] },
      { name: "San Miguel", coords: [13.4833, -88.1833] }
    ];
 
    // 📊 ESTADÍSTICAS DETALLADAS
    const completedTrips = viajes.filter(v => v.estado.actual === "completado");
    const onTimeTrips = completedTrips.filter(v =>
      !v.tiemposReales?.llegadaReal ||
      v.tiemposReales.llegadaReal <= v.arrivalTime
    );
 
    const statistics = {
      total_routes: viajes.length,
      active_routes: viajes.filter(v => v.estado.actual === "en_curso").length,
      completed_routes: completedTrips.length,
      pending_routes: viajes.filter(v => v.estado.actual === "pendiente").length,
      delayed_routes: viajes.filter(v => v.estado.actual === "retrasado").length,
      cancelled_routes: viajes.filter(v => v.estado.actual === "cancelado").length,
     
      completion_rate: viajes.length > 0 ?
        Math.round((completedTrips.length / viajes.length) * 100) : 0,
      on_time_rate: completedTrips.length > 0 ?
        Math.round((onTimeTrips.length / completedTrips.length) * 100) : 0,
      average_progress: routes.length > 0 ?
        Math.round(routes.reduce((acc, route) => acc + route.tripInfo.progress, 0) / routes.length) : 0,
     
      total_drivers: new Set(viajes.map(v => v.conductorId?._id).filter(Boolean)).size,
      total_trucks: new Set(viajes.map(v => v.truckId?._id).filter(Boolean)).size,
     
      today_trips: viajes.filter(v => {
        const today = new Date();
        const tripDate = new Date(v.departureTime);
        return tripDate.toDateString() === today.toDateString();
      }).length,
     
      active_alerts: viajes.reduce((acc, v) =>
        acc + (v.alertas?.filter(alert => !alert.resuelta).length || 0), 0),
     
      total_revenue: viajes.reduce((acc, v) => acc + (v.quoteId?.price || v.costosReales?.total || 0), 0),
     
      viajes_con_cotizacion: viajesConCotizacion.length,
      viajes_con_ruta: viajes.filter(v => v.quoteId?.ruta).length,
      viajes_con_horarios: viajes.filter(v => v.quoteId?.horarios).length,
      viajes_con_cliente: viajes.filter(v => v.quoteId?.clientId).length,
      viajes_con_carga: viajes.filter(v => v.quoteId?.carga).length,
      auto_update_enabled: viajes.filter(v => v.estado?.autoActualizar !== false).length,
     
      cotizaciones_aceptadas: viajes.filter(v => v.quoteId?.status === 'aceptada').length,
      cotizaciones_ejecutadas: viajes.filter(v => v.quoteId?.status === 'ejecutada').length,
      cotizaciones_pendientes: viajes.filter(v => v.quoteId?.status === 'pendiente').length,
      growth_percentage: 35
    };
 
    // 🎯 RESPUESTA FINAL
    const mapData = {
      locations: Array.from(locationMap.values()),
      routes,
      cities,
      statistics,
     
      lastUpdate: new Date().toISOString(),
      autoUpdateEnabled: true,
      refreshInterval: 60000,
      dataSource: "real_schema_model",
      integrationInfo: {
        cotizacionesUsed: viajesConCotizacion.length,
        viajesSinCotizacion: viajesSinCotizacion.length,
        rutasUsed: viajes.filter(v => v.quoteId?.ruta).length,
        horariosUsed: viajes.filter(v => v.quoteId?.horarios).length,
        clientesUsed: viajes.filter(v => v.quoteId?.clientId).length,
        cargasUsed: viajes.filter(v => v.quoteId?.carga).length,
        autoUpdateService: !!autoUpdateService,
        schemaVersion: "real_v1",
        fieldsUsed: [
          'quoteId', 'truckId', 'conductorId', 'estado.actual',
          'tracking.progreso', 'tiemposReales', 'costosReales', 'alertas'
        ]
      }
    };
 
    res.status(200).json({
      success: true,
      data: mapData,
      message: "Datos del mapa obtenidos exitosamente con esquema real"
    });
 
  } catch (error) {
    console.error("❌ Error obteniendo datos del mapa:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener datos del mapa",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

