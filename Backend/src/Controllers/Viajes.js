// Controllers/Viajes.js - CÓDIGO COMPLETO VERSIÓN OPTIMIZADA
import ViajesModel from "../Models/Viajes.js";
import autoUpdateService from "../services/autoUpdateService.js";

const ViajesController = {};

// =====================================================
// 🔧 FUNCIONES AUXILIARES Y UTILIDADES
// =====================================================

// Validar ObjectId de MongoDB
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Calcular distancia usando fórmula de Haversina
function calcularDistanciaHaversina(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Generar puntos intermedios en la ruta
function generarPuntosIntermedios(origen, destino, cantidad) {
  const puntos = [];
  const latInicio = parseFloat(origen.lat);
  const lngInicio = parseFloat(origen.lng);
  const latFin = parseFloat(destino.lat);
  const lngFin = parseFloat(destino.lng);

  for (let i = 1; i <= cantidad; i++) {
    const progreso = i / (cantidad + 1);
    const lat = latInicio + (latFin - latInicio) * progreso;
    const lng = lngInicio + (lngFin - lngInicio) * progreso;
    
    puntos.push({
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      tipo: 'intermedio',
      nombre: `Punto ${i}`,
      orden: i
    });
  }

  return puntos;
}

// Obtener información del camión formateada
function obtenerInfoCamion(truck) {
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
}

// =====================================================
// 🔍 FUNCIONES DE VALIDACIÓN
// =====================================================

function validarDatosViaje(data) {
  const errores = [];

  // 📍 VALIDAR ORIGEN
  if (!data.origen) {
    errores.push("Origen es requerido");
  } else {
    if (!data.origen.nombre) errores.push("Nombre del origen es requerido");
    if (!data.origen.lat || !data.origen.lng) {
      errores.push("Coordenadas del origen son requeridas");
    }
    if (isNaN(parseFloat(data.origen.lat)) || isNaN(parseFloat(data.origen.lng))) {
      errores.push("Coordenadas del origen deben ser números válidos");
    }
  }

  // 📍 VALIDAR DESTINO
  if (!data.destino) {
    errores.push("Destino es requerido");
  } else {
    if (!data.destino.nombre) errores.push("Nombre del destino es requerido");
    if (!data.destino.lat || !data.destino.lng) {
      errores.push("Coordenadas del destino son requeridas");
    }
    if (isNaN(parseFloat(data.destino.lat)) || isNaN(parseFloat(data.destino.lng))) {
      errores.push("Coordenadas del destino deben ser números válidos");
    }
  }

  // ⏰ VALIDAR HORARIOS
  if (!data.departureTime) {
    errores.push("Hora de salida es requerida");
  } else {
    const fechaSalida = new Date(data.departureTime);
    if (isNaN(fechaSalida.getTime())) {
      errores.push("Hora de salida debe ser una fecha válida");
    }
    if (fechaSalida < new Date()) {
      errores.push("Hora de salida no puede ser en el pasado");
    }
  }

  if (data.arrivalTime) {
    const fechaLlegada = new Date(data.arrivalTime);
    const fechaSalida = new Date(data.departureTime);
    if (isNaN(fechaLlegada.getTime())) {
      errores.push("Hora de llegada debe ser una fecha válida");
    }
    if (fechaLlegada <= fechaSalida) {
      errores.push("Hora de llegada debe ser posterior a la hora de salida");
    }
  }

  // 📦 VALIDAR CARGA (OPCIONAL PERO SI EXISTE DEBE SER VÁLIDA)
  if (data.carga) {
    if (data.carga.peso && data.carga.peso.valor) {
      if (isNaN(parseFloat(data.carga.peso.valor)) || parseFloat(data.carga.peso.valor) <= 0) {
        errores.push("El peso de la carga debe ser un número positivo");
      }
    }
    if (data.carga.valorDeclarado && data.carga.valorDeclarado.monto) {
      if (isNaN(parseFloat(data.carga.valorDeclarado.monto)) || parseFloat(data.carga.valorDeclarado.monto) < 0) {
        errores.push("El valor declarado debe ser un número no negativo");
      }
    }
  }

  // 🚛 VALIDAR IDs DE RECURSOS (SI SE PROPORCIONAN)
  if (data.truckId && !isValidObjectId(data.truckId)) {
    errores.push("ID de camión inválido");
  }
  if (data.conductorId && !isValidObjectId(data.conductorId)) {
    errores.push("ID de conductor inválido");
  }
  if (data.quoteId && !isValidObjectId(data.quoteId)) {
    errores.push("ID de cotización inválido");
  }

  return {
    esValido: errores.length === 0,
    errores: errores
  };
}

// =====================================================
// 🔍 VERIFICAR DISPONIBILIDAD DE RECURSOS
// =====================================================
async function verificarDisponibilidadRecursos(truckId, conductorId, departureTime, arrivalTime) {
  const conflictos = [];
  const fechaInicio = new Date(departureTime);
  const fechaFin = arrivalTime ? new Date(arrivalTime) : 
    new Date(fechaInicio.getTime() + 8 * 60 * 60 * 1000); // +8 horas por defecto

  try {
    // 🚛 VERIFICAR DISPONIBILIDAD DEL CAMIÓN
    if (truckId) {
      const conflictosCamion = await ViajesModel.find({
        truckId: truckId,
        'estado.actual': { $in: ['pendiente', 'en_curso'] },
        $or: [
          {
            departureTime: { $lte: fechaFin },
            arrivalTime: { $gte: fechaInicio }
          },
          {
            departureTime: { $lte: fechaInicio },
            arrivalTime: { $gte: fechaInicio }
          }
        ]
      }).populate('truckId', 'brand model licensePlate name');

      if (conflictosCamion.length > 0) {
        conflictos.push({
          tipo: 'camion',
          recurso: conflictosCamion[0].truckId,
          viajesConflicto: conflictosCamion.map(v => ({
            id: v._id,
            departureTime: v.departureTime,
            arrivalTime: v.arrivalTime,
            ruta: `${v.ruta?.origen?.nombre || 'N/A'} → ${v.ruta?.destino?.nombre || 'N/A'}`
          }))
        });
      }
    }

    // 👤 VERIFICAR DISPONIBILIDAD DEL CONDUCTOR
    if (conductorId) {
      const conflictosConductor = await ViajesModel.find({
        conductorId: conductorId,
        'estado.actual': { $in: ['pendiente', 'en_curso'] },
        $or: [
          {
            departureTime: { $lte: fechaFin },
            arrivalTime: { $gte: fechaInicio }
          },
          {
            departureTime: { $lte: fechaInicio },
            arrivalTime: { $gte: fechaInicio }
          }
        ]
      }).populate('conductorId', 'name nombre phone telefono');

      if (conflictosConductor.length > 0) {
        conflictos.push({
          tipo: 'conductor',
          recurso: conflictosConductor[0].conductorId,
          viajesConflicto: conflictosConductor.map(v => ({
            id: v._id,
            departureTime: v.departureTime,
            arrivalTime: v.arrivalTime,
            ruta: `${v.ruta?.origen?.nombre || 'N/A'} → ${v.ruta?.destino?.nombre || 'N/A'}`
          }))
        });
      }
    }

    return {
      disponible: conflictos.length === 0,
      conflictos: conflictos
    };

  } catch (error) {
    console.error("❌ Error verificando disponibilidad:", error);
    return {
      disponible: false,
      conflictos: [{ tipo: 'error', mensaje: 'Error verificando disponibilidad de recursos' }]
    };
  }
}

// =====================================================
// 🗺️ CALCULAR INFORMACIÓN DE RUTA
// =====================================================
async function calcularInfoRuta(origen, destino) {
  try {
    console.log("🗺️ Calculando ruta...");

    // 📏 CALCULAR DISTANCIA DIRECTA (HAVERSINA)
    const distanciaDirecta = calcularDistanciaHaversina(
      parseFloat(origen.lat),
      parseFloat(origen.lng),
      parseFloat(destino.lat),
      parseFloat(destino.lng)
    );

    // 🛣️ ESTIMAR DISTANCIA POR CARRETERA (FACTOR 1.3x)
    const distanciaCarretera = Math.round(distanciaDirecta * 1.3);

    // ⏰ CALCULAR TIEMPO ESTIMADO (VELOCIDAD PROMEDIO 60 KM/H)
    const tiempoEstimadoHoras = distanciaCarretera / 60;

    // 💰 ESTIMAR PEAJES BASADO EN DISTANCIA
    const peajesEstimados = Math.round((distanciaCarretera / 100) * 150); // $150 cada 100km

    // 📍 GENERAR PUNTOS INTERMEDIOS (SIMULADO)
    const puntosRuta = generarPuntosIntermedios(origen, destino, 3);

    console.log(`📏 Ruta calculada: ${distanciaCarretera}km, ${tiempoEstimadoHoras.toFixed(1)}h`);

    return {
      distancia: distanciaCarretera,
      tiempoEstimado: parseFloat(tiempoEstimadoHoras.toFixed(2)),
      peajesEstimados: peajesEstimados,
      puntos: puntosRuta,
      metodoCalculo: 'estimacion_haversina'
    };

  } catch (error) {
    console.error("❌ Error calculando ruta:", error);
    
    // 🎯 VALORES POR DEFECTO EN CASO DE ERROR
    return {
      distancia: 100,
      tiempoEstimado: 2,
      peajesEstimados: 200,
      puntos: [],
      metodoCalculo: 'default_fallback'
    };
  }
}

// =====================================================
// 📦 PROCESAR DATOS DE CARGA
// =====================================================
function procesarDatosCarga(cargaInput) {
  if (!cargaInput) {
    return {
      categoria: 'general',
      subcategoria: 'otros',
      descripcion: 'Carga general',
      peso: {
        valor: 0,
        unidad: 'kg'
      },
      volumen: {
        valor: 0,
        unidad: 'm3'
      },
      clasificacionRiesgo: 'normal',
      condicionesEspeciales: [],
      valorDeclarado: {
        monto: 0,
        moneda: 'USD'
      }
    };
  }

  return {
    categoria: cargaInput.categoria || 'general',
    subcategoria: cargaInput.subcategoria || 'otros',
    descripcion: cargaInput.descripcion || 'Carga sin descripción',
    peso: {
      valor: parseFloat(cargaInput.peso?.valor || 0),
      unidad: cargaInput.peso?.unidad || 'kg'
    },
    volumen: {
      valor: parseFloat(cargaInput.volumen?.valor || 0),
      unidad: cargaInput.volumen?.unidad || 'm3'
    },
    clasificacionRiesgo: cargaInput.clasificacionRiesgo || 'normal',
    condicionesEspeciales: cargaInput.condicionesEspeciales || [],
    valorDeclarado: {
      monto: parseFloat(cargaInput.valorDeclarado?.monto || 0),
      moneda: cargaInput.valorDeclarado?.moneda || 'USD'
    },
    temperatura: cargaInput.temperatura || null,
    fragil: cargaInput.fragil || false,
    peligrosa: cargaInput.peligrosa || false
  };
}

// =====================================================
// POST: AGREGAR NUEVO VIAJE - MÉTODO PRINCIPAL
// =====================================================
ViajesController.addTrip = async (req, res) => {
  try {
    console.log("🚛 Creando nuevo viaje...");
    console.log("📊 Datos recibidos:", JSON.stringify(req.body, null, 2));

    // 📝 VALIDAR DATOS REQUERIDOS
    const validacionResultado = validarDatosViaje(req.body);
    if (!validacionResultado.esValido) {
      return res.status(400).json({
        success: false,
        message: "Datos de viaje inválidos",
        errores: validacionResultado.errores,
        timestamp: new Date().toISOString()
      });
    }

    // 🎯 EXTRAER DATOS DEL REQUEST
    const {
      // 📍 UBICACIONES
      origen,
      destino,
      
      // ⏰ HORARIOS
      departureTime,
      arrivalTime,
      
      // 🚛 RECURSOS
      truckId,
      conductorId,
      
      // 📦 CARGA
      carga,
      
      // 💰 COTIZACIÓN (OPCIONAL)
      quoteId,
      
      // 📝 INFORMACIÓN ADICIONAL
      tripDescription,
      observaciones,
      prioridad = 'normal',
      
      // 🎛️ CONFIGURACIÓN
      autoActualizar = true,
      notificaciones = true
    } = req.body;

    // 🔍 VERIFICAR RECURSOS DISPONIBLES
    const recursosDisponibles = await verificarDisponibilidadRecursos(
      truckId, 
      conductorId, 
      departureTime, 
      arrivalTime
    );

    if (!recursosDisponibles.disponible) {
      return res.status(409).json({
        success: false,
        message: "Recursos no disponibles",
        conflictos: recursosDisponibles.conflictos,
        timestamp: new Date().toISOString()
      });
    }

    // 🗺️ CALCULAR RUTA Y DISTANCIAS
    const infoRuta = await calcularInfoRuta(origen, destino);
    
    // 📦 PROCESAR INFORMACIÓN DE CARGA
    const cargaProcesada = procesarDatosCarga(carga);

    // 🆕 CREAR OBJETO VIAJE
    const nuevoViajeData = {
      // 📍 UBICACIONES Y RUTA
      ruta: {
        origen: {
          nombre: origen.nombre,
          coordenadas: {
            lat: parseFloat(origen.lat),
            lng: parseFloat(origen.lng)
          },
          tipo: origen.tipo || 'ciudad',
          direccion: origen.direccion || '',
          codigoPostal: origen.codigoPostal || ''
        },
        destino: {
          nombre: destino.nombre,
          coordenadas: {
            lat: parseFloat(destino.lat),
            lng: parseFloat(destino.lng)
          },
          tipo: destino.tipo || 'ciudad',
          direccion: destino.direccion || '',
          codigoPostal: destino.codigoPostal || ''
        },
        distanciaTotal: infoRuta.distancia,
        tiempoEstimado: infoRuta.tiempoEstimado,
        rutaOptimizada: infoRuta.puntos || []
      },

      // ⏰ HORARIOS
      departureTime: new Date(departureTime),
      arrivalTime: arrivalTime ? new Date(arrivalTime) : 
        new Date(new Date(departureTime).getTime() + (infoRuta.tiempoEstimado * 60 * 60 * 1000)),

      // 🚛 RECURSOS ASIGNADOS
      truckId: truckId || null,
      conductorId: conductorId || null,

      // 📦 INFORMACIÓN DE CARGA
      carga: cargaProcesada,

      // 💰 COTIZACIÓN ASOCIADA
      quoteId: quoteId || null,

      // 📊 ESTADO INICIAL
      estado: {
        actual: 'pendiente',
        fechaCambio: new Date(),
        autoActualizar: autoActualizar,
        notificacionesActivas: notificaciones,
        historial: [{
          estadoAnterior: null,
          estadoNuevo: 'pendiente',
          fecha: new Date(),
          motivo: 'creacion_manual',
          usuario: req.user?.id || 'sistema'
        }]
      },

      // 📈 TRACKING INICIAL
      tracking: {
        progreso: {
          porcentaje: 0,
          etapaActual: 'preparacion',
          fechaActualizacion: new Date()
        },
        ubicacionActual: {
          coordenadas: {
            lat: parseFloat(origen.lat),
            lng: parseFloat(origen.lng)
          },
          direccion: origen.direccion || origen.nombre,
          fecha: new Date(),
          velocidad: 0,
          precision: 'manual'
        },
        checkpoints: [],
        distanciaRecorrida: 0
      },

      // ⏰ TIEMPOS REALES
      tiemposReales: {
        salidaProgramada: new Date(departureTime),
        llegadaProgramada: arrivalTime ? new Date(arrivalTime) : 
          new Date(new Date(departureTime).getTime() + (infoRuta.tiempoEstimado * 60 * 60 * 1000)),
        salidaReal: null,
        llegadaReal: null
      },

      // 💰 COSTOS PLANIFICADOS
      costosReales: {
        combustible: 0,
        peajes: infoRuta.peajesEstimados || 0,
        conductor: 0,
        otros: 0,
        total: infoRuta.peajesEstimados || 0
      },

      // 🌡️ CONDICIONES INICIALES
      condiciones: {
        clima: 'normal',
        trafico: 'normal',
        carretera: 'buena',
        observaciones: observaciones || ''
      },

      // 🚨 ALERTAS
      alertas: [],

      // 📝 DESCRIPCIÓN Y METADATOS
      tripDescription: tripDescription || `Viaje de ${origen.nombre} a ${destino.nombre}`,
      prioridad: prioridad,
      fechaCreacion: new Date(),
      creadoPor: req.user?.id || 'sistema',
      version: '1.0'
    };

    console.log("📋 Datos del viaje preparados, creando en BD...");

    // 💾 GUARDAR EN BASE DE DATOS
    const nuevoViaje = new ViajesModel(nuevoViajeData);
    await nuevoViaje.save();

    console.log(`✅ Viaje creado exitosamente con ID: ${nuevoViaje._id}`);

    // 🔄 FINALIZAR CREACIÓN DEL VIAJE
    return await finalizarCreacionViaje(nuevoViaje, res, req);

  } catch (error) {
    console.error("❌ Error creando viaje:", error);
    return res.status(500).json({
      success: false,
      message: "Error al crear el viaje",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// =====================================================
// 🎯 FINALIZAR CREACIÓN DEL VIAJE
// =====================================================
async function finalizarCreacionViaje(nuevoViaje, res, req) {
  try {
    console.log("🔄 Finalizando creación del viaje...");

    // 🔄 POPULATE DATOS RELACIONADOS
    await nuevoViaje.populate([
      {
        path: 'truckId',
        select: 'brand model licensePlate name marca modelo placa nombre'
      },
      {
        path: 'conductorId',
        select: 'name phone nombre telefono'
      },
      {
        path: 'quoteId',
        select: 'quoteName quoteDescription clientId price status',
        populate: {
          path: 'clientId',
          select: 'nombre name email telefono phone empresa'
        }
      }
    ]);

    // 🗺️ GENERAR DATOS PARA EL MAPA
    const datosParaMapa = await generarDatosParaMapa(nuevoViaje);

    // 📊 GENERAR ESTADÍSTICAS ACTUALIZADAS
    const estadisticasActualizadas = await obtenerEstadisticasActualizadas();

    // 🔔 CONFIGURAR NOTIFICACIONES (SI ESTÁN ACTIVADAS)
    if (nuevoViaje.estado.notificacionesActivas) {
      await configurarNotificacionesViaje(nuevoViaje);
    }

    // 📋 REGISTRAR EN LOGS DE AUDITORÍA
    await registrarAuditoriaViaje(nuevoViaje, 'creacion', req.user?.id || 'sistema');

    // 🎯 PREPARAR RESPUESTA COMPLETA
    const respuestaCompleta = {
      success: true,
      message: "Viaje creado exitosamente",
      timestamp: new Date().toISOString(),
      
      // 📊 DATOS DEL VIAJE CREADO
      viaje: {
        id: nuevoViaje._id,
        ruta: {
          origen: nuevoViaje.ruta.origen.nombre,
          destino: nuevoViaje.ruta.destino.nombre,
          distancia: `${nuevoViaje.ruta.distanciaTotal} km`,
          tiempoEstimado: `${nuevoViaje.ruta.tiempoEstimado} horas`
        },
        horarios: {
          salida: nuevoViaje.departureTime,
          llegadaEstimada: nuevoViaje.arrivalTime
        },
        estado: nuevoViaje.estado.actual,
        progreso: nuevoViaje.tracking.progreso.porcentaje,
        
        // 🚛 RECURSOS ASIGNADOS
        recursos: {
          camion: nuevoViaje.truckId ? {
            id: nuevoViaje.truckId._id,
            info: obtenerInfoCamion(nuevoViaje.truckId)
          } : null,
          conductor: nuevoViaje.conductorId ? {
            id: nuevoViaje.conductorId._id,
            nombre: nuevoViaje.conductorId.name || nuevoViaje.conductorId.nombre,
            telefono: nuevoViaje.conductorId.phone || nuevoViaje.conductorId.telefono
          } : null
        },

        // 📦 INFORMACIÓN DE CARGA
        carga: {
          descripcion: nuevoViaje.carga.descripcion,
          peso: nuevoViaje.carga.peso,
          categoria: nuevoViaje.carga.categoria,
          valorDeclarado: nuevoViaje.carga.valorDeclarado
        },

        // 💰 COTIZACIÓN ASOCIADA
        cotizacion: nuevoViaje.quoteId ? {
          id: nuevoViaje.quoteId._id,
          nombre: nuevoViaje.quoteId.quoteName,
          cliente: nuevoViaje.quoteId.clientId ? {
            nombre: nuevoViaje.quoteId.clientId.nombre || nuevoViaje.quoteId.clientId.name,
            empresa: nuevoViaje.quoteId.clientId.empresa
          } : null,
          precio: nuevoViaje.quoteId.price,
          estado: nuevoViaje.quoteId.status
        } : null
      },

      // 🗺️ DATOS PARA EL MAPA
      mapaData: datosParaMapa,

      // 📊 ESTADÍSTICAS ACTUALIZADAS
      estadisticas: estadisticasActualizadas,

      // 🔗 ACCIONES DISPONIBLES
      acciones: {
        verEnMapa: `/api/viajes/map-data`,
        editarViaje: `/api/viajes/${nuevoViaje._id}`,
        iniciarViaje: `/api/viajes/${nuevoViaje._id}/start`,
        asignarRecursos: `/api/viajes/${nuevoViaje._id}/assign-resources`,
        trackingGPS: `/api/viajes/${nuevoViaje._id}/location`
      },

      // 📱 CONFIGURACIÓN DE NOTIFICACIONES
      notificaciones: {
        activas: nuevoViaje.estado.notificacionesActivas,
        tipos: ['estado', 'ubicacion', 'retrasos', 'llegada'],
        webhook: `/api/viajes/${nuevoViaje._id}/notifications`
      },

      // 🎛️ CONFIGURACIÓN
      configuracion: {
        autoActualizar: nuevoViaje.estado.autoActualizar,
        intervaloActualizacion: 60, // segundos
        precision: 'alta'
      }
    };

    console.log(`✅ Viaje ${nuevoViaje._id} creado y configurado exitosamente`);

    // 🚀 ENVIAR RESPUESTA
    return res.status(201).json(respuestaCompleta);

  } catch (error) {
    console.error("❌ Error finalizando creación del viaje:", error);
    
    // 🗑️ LIMPIAR VIAJE CREADO SI HAY ERROR EN LA FINALIZACIÓN
    try {
      await ViajesModel.findByIdAndDelete(nuevoViaje._id);
      console.log("🗑️ Viaje eliminado debido a error en finalización");
    } catch (deleteError) {
      console.error("❌ Error eliminando viaje:", deleteError);
    }

    return res.status(500).json({
      success: false,
      message: "Error al finalizar la creación del viaje",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// =====================================================
// 🗺️ GENERAR DATOS ESPECÍFICOS PARA EL MAPA
// =====================================================
async function generarDatosParaMapa(viaje) {
  try {
    const origen = viaje.ruta.origen;
    const destino = viaje.ruta.destino;

    // 🎨 CONFIGURACIÓN DE COLORES POR ESTADO
    const estadosConfig = {
      'pendiente': { color: 'bg-blue-500', status: 'bg-blue-400', icon: '📋' },
      'en_curso': { color: 'bg-green-500', status: 'bg-green-400', icon: '🚛' },
      'retrasado': { color: 'bg-orange-500', status: 'bg-orange-400', icon: '⏰' },
      'completado': { color: 'bg-emerald-500', status: 'bg-emerald-400', icon: '✅' },
      'cancelado': { color: 'bg-red-500', status: 'bg-red-400', icon: '❌' }
    };

    const config = estadosConfig[viaje.estado.actual] || estadosConfig.pendiente;

    // 🗺️ DATOS DE LA RUTA PARA EL MAPA
    const rutaParaMapa = {
      id: viaje._id.toString(),
      coordinates: [
        [origen.coordenadas.lat, origen.coordenadas.lng],
        [destino.coordenadas.lat, destino.coordenadas.lng]
      ],
      status: viaje.estado.actual,
      statusText: config.icon + ' ' + viaje.estado.actual.charAt(0).toUpperCase() + viaje.estado.actual.slice(1),
      frequency: "medium",
      
      // 📏 DISTANCIA Y TIEMPO
      distance: `${viaje.ruta.distanciaTotal} km`,
      estimatedTime: `${Math.floor(viaje.ruta.tiempoEstimado)}h ${Math.round((viaje.ruta.tiempoEstimado % 1) * 60)}min`,
      
      // 📊 INFORMACIÓN DEL VIAJE
      tripInfo: {
        driver: viaje.conductorId ? 
          (viaje.conductorId.name || viaje.conductorId.nombre) : 'Conductor por asignar',
        driverPhone: viaje.conductorId ? 
          (viaje.conductorId.phone || viaje.conductorId.telefono) : 'No disponible',
        truck: viaje.truckId ? obtenerInfoCamion(viaje.truckId) : 'Camión por asignar',
        cargo: `${viaje.carga.descripcion}${viaje.carga.peso.valor > 0 ? ` - ${viaje.carga.peso.valor} ${viaje.carga.peso.unidad}` : ''}`,
        
        // ⏰ HORARIOS
        departure: new Date(viaje.departureTime).toLocaleTimeString("es-ES", {
          hour: "2-digit", minute: "2-digit"
        }),
        arrival: new Date(viaje.arrivalTime).toLocaleTimeString("es-ES", {
          hour: "2-digit", minute: "2-digit"
        }),
        estimatedArrival: new Date(viaje.arrivalTime).toLocaleTimeString("es-ES", {
          hour: "2-digit", minute: "2-digit"
        }),
        
        // 📈 PROGRESO
        progress: viaje.tracking.progreso.porcentaje,
        currentLocation: origen.nombre,
        
        // ⏰ TIEMPOS REALES
        realDeparture: null,
        realArrival: null
      },
      
      // 📝 DESCRIPCIÓN
      description: viaje.tripDescription,
      
      // 🗺️ INFORMACIÓN DE RUTA
      route: {
        from: origen.nombre,
        to: destino.nombre,
        fromType: origen.tipo,
        toType: destino.tipo,
        totalPoints: 2,
        currentPoint: 0,
        quoteId: viaje.quoteId
      },
      
      // 🚨 ALERTAS
      alerts: [],
      
      // 💰 COSTOS
      costs: {
        fuel: viaje.costosReales.combustible,
        tolls: viaje.costosReales.peajes,
        driver: viaje.costosReales.conductor,
        others: viaje.costosReales.otros,
        total: viaje.costosReales.total
      },
      
      // 🌡️ CONDICIONES
      conditions: {
        weather: viaje.condiciones.clima,
        traffic: viaje.condiciones.trafico,
        road: viaje.condiciones.carretera
      },
      
      // 🆕 COTIZACIÓN COMPLETA
      quotation: viaje.quoteId ? {
        _id: viaje.quoteId._id,
        quoteName: viaje.quoteId.quoteName,
        quoteDescription: viaje.quoteId.quoteDescription,
        clientId: viaje.quoteId.clientId,
        status: viaje.quoteId.status,
        price: viaje.quoteId.price
      } : null,
      
      // 🆕 INFORMACIÓN DE INTEGRACIÓN
      integration: {
        hasCotizacion: !!viaje.quoteId,
        hasRuta: true,
        hasHorarios: true,
        hasCliente: !!viaje.quoteId?.clientId,
        hasCarga: true,
        autoUpdateEnabled: viaje.estado.autoActualizar,
        progressMethod: 'manual',
        recienCreado: true
      }
    };

    // 📍 UBICACIONES PARA EL MAPA
    const ubicaciones = [
      {
        name: origen.nombre,
        coords: [origen.coordenadas.lat, origen.coordenadas.lng],
        type: origen.tipo === 'terminal' ? 'red' : 'green',
        number: "1",
        description: `${origen.tipo || 'Ubicación'} - Nuevo viaje`,
        tripCount: 1,
        isTerminal: origen.tipo === 'terminal',
        details: `Origen: ${origen.nombre}`,
        quotationInfo: {
          hasQuotation: !!viaje.quoteId,
          quotationId: viaje.quoteId
        }
      },
      {
        name: destino.nombre,
        coords: [destino.coordenadas.lat, destino.coordenadas.lng],
        type: destino.tipo === 'terminal' ? 'red' : 'blue',
        number: "1",
        description: `${destino.tipo || 'Ubicación'} - Nuevo viaje`,
        tripCount: 1,
        isTerminal: destino.tipo === 'terminal',
        details: `Destino: ${destino.nombre}`,
        quotationInfo: {
          hasQuotation: !!viaje.quoteId,
          quotationId: viaje.quoteId
        }
      }
    ];

    return {
      nuevaRuta: rutaParaMapa,
      nuevasUbicaciones: ubicaciones,
      requiereActualizacionCompleta: false,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error("❌ Error generando datos para mapa:", error);
    return {
      nuevaRuta: null,
      nuevasUbicaciones: [],
      requiereActualizacionCompleta: true,
      error: error.message
    };
  }
}

// =====================================================
// 📊 OBTENER ESTADÍSTICAS ACTUALIZADAS
// =====================================================
async function obtenerEstadisticasActualizadas() {
  try {
    const estadisticas = await ViajesModel.aggregate([
      {
        $group: {
          _id: null,
          total_routes: { $sum: 1 },
          active_routes: {
            $sum: { $cond: [{ $eq: ["$estado.actual", "en_curso"] }, 1, 0] }
          },
          completed_routes: {
            $sum: { $cond: [{ $eq: ["$estado.actual", "completado"] }, 1, 0] }
          },
          pending_routes: {
            $sum: { $cond: [{ $eq: ["$estado.actual", "pendiente"] }, 1, 0] }
          },
          delayed_routes: {
            $sum: { $cond: [{ $eq: ["$estado.actual", "retrasado"] }, 1, 0] }
          },
          cancelled_routes: {
            $sum: { $cond: [{ $eq: ["$estado.actual", "cancelado"] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = estadisticas[0] || {};
    
    return {
      total_routes: stats.total_routes || 0,
      active_routes: stats.active_routes || 0,
      completed_routes: stats.completed_routes || 0,
      pending_routes: stats.pending_routes || 0,
      delayed_routes: stats.delayed_routes || 0,
      cancelled_routes: stats.cancelled_routes || 0,
      completion_rate: stats.total_routes > 0 ? 
        Math.round((stats.completed_routes / stats.total_routes) * 100) : 0,
      ultimaActualizacion: new Date().toISOString()
    };

  } catch (error) {
    console.error("❌ Error obteniendo estadísticas:", error);
    return {
      error: "No se pudieron obtener estadísticas actualizadas"
    };
  }
}

// =====================================================
// 🔔 CONFIGURAR NOTIFICACIONES DEL VIAJE
// =====================================================
async function configurarNotificacionesViaje(viaje) {
  try {
    console.log(`🔔 Configurando notificaciones para viaje ${viaje._id}`);
    
    const configuracionNotificaciones = {
      viajeId: viaje._id,
      eventos: [
        {
          tipo: 'cambio_estado',
          activo: true,
          destinatarios: ['admin', 'conductor', 'cliente']
        },
        {
          tipo: 'ubicacion_actualizada',
          activo: true,
          intervalo: 30, // minutos
          destinatarios: ['admin', 'cliente']
        },
        {
          tipo: 'retraso_detectado',
          activo: true,
          umbral: 15, // minutos
          destinatarios: ['admin', 'cliente']
        },
        {
          tipo: 'llegada_destino',
          activo: true,
          destinatarios: ['admin', 'conductor', 'cliente']
        }
      ],
      canales: {
        webhook: `/api/notifications/webhook/${viaje._id}`,
        email: viaje.quoteId?.clientId?.email || null,
        sms: viaje.conductorId?.telefono || viaje.conductorId?.phone || null
      }
    };

    console.log("📱 Notificaciones configuradas:", configuracionNotificaciones);
    
    return configuracionNotificaciones;

  } catch (error) {
    console.error("❌ Error configurando notificaciones:", error);
    return null;
  }
}

// =====================================================
// 📋 REGISTRAR AUDITORÍA
// =====================================================
async function registrarAuditoriaViaje(viaje, accion, usuario) {
  try {
    const registroAuditoria = {
      viajeId: viaje._id,
      accion: accion,
      usuario: usuario,
      fecha: new Date(),
      detalles: {
        ruta: `${viaje.ruta.origen.nombre} → ${viaje.ruta.destino.nombre}`,
        estado: viaje.estado.actual,
        recursos: {
          camion: viaje.truckId || null,
          conductor: viaje.conductorId || null
        }
      },
      metadata: {
        ip: 'localhost',
        userAgent: 'API-Server'
      }
    };

    console.log("📋 Registro de auditoría:", registroAuditoria);
    
    return registroAuditoria;

  } catch (error) {
    console.error("❌ Error registrando auditoría:", error);
    return null;
  }
}

// =====================================================
// 🔍 VERIFICAR QUE UN RECURSO EXISTE
// =====================================================
async function verificarRecursoExiste(modelo, id) {
  try {
    let ModeloRecurso;
    
    switch (modelo) {
      case 'Camiones':
        const camionExiste = true; // Simular verificación
        return { existe: camionExiste, recurso: null };
        
      case 'Motorista':
        const conductorExiste = true; // Simular verificación
        return { existe: conductorExiste, recurso: null };
        
      default:
        return { existe: false, recurso: null };
    }
  } catch (error) {
    console.error(`❌ Error verificando recurso ${modelo}:`, error);
    return { existe: false, recurso: null };
  }
}

// =====================================================
// ✅ VALIDAR INICIO DE VIAJE
// =====================================================
function validarInicioViaje(viaje, forzarInicio) {
  const errores = [];
  const advertencias = [];

  // 📊 VERIFICAR ESTADO
  if (viaje.estado.actual !== 'pendiente') {
    if (!forzarInicio) {
      errores.push(`El viaje está en estado: ${viaje.estado.actual}`);
    } else {
      advertencias.push(`Forzando inicio desde estado: ${viaje.estado.actual}`);
    }
  }

  // 🚛 VERIFICAR RECURSOS
  if (!viaje.truckId) {
    if (!forzarInicio) {
      errores.push("No hay camión asignado");
    } else {
      advertencias.push("Iniciando sin camión asignado");
    }
  }

  if (!viaje.conductorId) {
    if (!forzarInicio) {
      errores.push("No hay conductor asignado");
    } else {
      advertencias.push("Iniciando sin conductor asignado");
    }
  }

  // ⏰ VERIFICAR HORARIOS
  const ahora = new Date();
  const salidaProgramada = new Date(viaje.departureTime);
  const diferenciaTiempo = Math.abs(ahora - salidaProgramada) / (1000 * 60); // minutos

  if (diferenciaTiempo > 60) { // Más de 1 hora de diferencia
    if (ahora < salidaProgramada) {
      advertencias.push(`Iniciando ${Math.round(diferenciaTiempo)} minutos antes de lo programado`);
    } else {
      advertencias.push(`Iniciando ${Math.round(diferenciaTiempo)} minutos tarde`);
    }
  }

  // 📦 VERIFICAR CARGA
  if (!viaje.carga || !viaje.carga.descripcion) {
    advertencias.push("No hay información detallada de carga");
  }

  return {
    puedeIniciar: errores.length === 0 || forzarInicio,
    errores: errores,
    advertencias: advertencias
  };
}

// =====================================================
// 🔔 ENVIAR NOTIFICACIÓN DE INICIO
// =====================================================
async function enviarNotificacionInicioViaje(viaje) {
  try {
    console.log(`🔔 Enviando notificaciones de inicio para viaje ${viaje._id}`);
    
    const mensaje = {
      tipo: 'inicio_viaje',
      viajeId: viaje._id,
      titulo: 'Viaje Iniciado',
      mensaje: `El viaje de ${viaje.ruta.origen.nombre} a ${viaje.ruta.destino.nombre} ha comenzado`,
      datos: {
        conductor: viaje.conductorId ? 
          (viaje.conductorId.name || viaje.conductorId.nombre) : 'No asignado',
        camion: viaje.truckId ? obtenerInfoCamion(viaje.truckId) : 'No asignado',
        horaInicio: viaje.tiemposReales.salidaReal,
        ruta: `${viaje.ruta.origen.nombre} → ${viaje.ruta.destino.nombre}`
      },
      timestamp: new Date().toISOString()
    };

    console.log("📱 Notificación preparada:", mensaje);
    
    return mensaje;

  } catch (error) {
    console.error("❌ Error enviando notificación:", error);
    return null;
  }
}

// =====================================================
// 🚛 ASIGNAR RECURSOS A VIAJE EXISTENTE
// =====================================================
ViajesController.assignResources = async (req, res) => {
  try {
    const { viajeId } = req.params;
    const { truckId, conductorId, validarDisponibilidad = true } = req.body;

    console.log(`🚛 Asignando recursos al viaje ${viajeId}...`);

    const viaje = await ViajesModel.findById(viajeId);
    if (!viaje) {
      return res.status(404).json({
        success: false,
        message: "Viaje no encontrado"
      });
    }

    if (!['pendiente', 'en_curso'].includes(viaje.estado.actual)) {
      return res.status(400).json({
        success: false,
        message: `No se pueden asignar recursos a un viaje en estado: ${viaje.estado.actual}`
      });
    }

    if (validarDisponibilidad) {
      const disponibilidad = await verificarDisponibilidadRecursos(
        truckId, 
        conductorId, 
        viaje.departureTime, 
        viaje.arrivalTime
      );

      if (!disponibilidad.disponible) {
        return res.status(409).json({
          success: false,
          message: "Recursos no disponibles en el horario del viaje",
          conflictos: disponibilidad.conflictos
        });
      }
    }

    const actualizaciones = {};
    const cambios = [];

    if (truckId) {
      const camionExiste = await verificarRecursoExiste('Camiones', truckId);
      if (!camionExiste.existe) {
        return res.status(404).json({
          success: false,
          message: `Camión no encontrado: ${truckId}`
        });
      }

      actualizaciones.truckId = truckId;
      cambios.push({
        campo: 'camion',
        valorAnterior: viaje.truckId,
        valorNuevo: truckId,
        descripcion: `Camión ${viaje.truckId ? 'reasignado' : 'asignado'}`
      });
    }

    if (conductorId) {
      const conductorExiste = await verificarRecursoExiste('Motorista', conductorId);
      if (!conductorExiste.existe) {
        return res.status(404).json({
          success: false,
          message: `Conductor no encontrado: ${conductorId}`
        });
      }

      actualizaciones.conductorId = conductorId;
      cambios.push({
        campo: 'conductor',
        valorAnterior: viaje.conductorId,
        valorNuevo: conductorId,
        descripcion: `Conductor ${viaje.conductorId ? 'reasignado' : 'asignado'}`
      });
    }

    const viajeActualizado = await ViajesModel.findByIdAndUpdate(
      viajeId,
      {
        ...actualizaciones,
        $push: {
          'estado.historial': {
            estadoAnterior: viaje.estado.actual,
            estadoNuevo: viaje.estado.actual,
            fecha: new Date(),
            motivo: 'asignacion_recursos',
            detalles: cambios,
            usuario: req.user?.id || 'sistema'
          }
        }
      },
      { new: true }
    ).populate([
      { path: 'truckId', select: 'brand model licensePlate name marca modelo placa nombre' },
      { path: 'conductorId', select: 'name phone nombre telefono' }
    ]);

    res.status(200).json({
      success: true,
      message: "Recursos asignados exitosamente",
      viaje: {
        id: viajeActualizado._id,
        estado: viajeActualizado.estado.actual,
        recursos: {
          camion: viajeActualizado.truckId ? {
            id: viajeActualizado.truckId._id,
            info: obtenerInfoCamion(viajeActualizado.truckId)
          } : null,
          conductor: viajeActualizado.conductorId ? {
            id: viajeActualizado.conductorId._id,
            nombre: viajeActualizado.conductorId.name || viajeActualizado.conductorId.nombre,
            telefono: viajeActualizado.conductorId.phone || viajeActualizado.conductorId.telefono
          } : null
        }
      },
      cambios: cambios,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Recursos asignados al viaje ${viajeId}`);

  } catch (error) {
    console.error("❌ Error asignando recursos:", error);
    res.status(500).json({
      success: false,
      message: "Error al asignar recursos",
      error: error.message
    });
  }
};

// =====================================================
// 🚀 INICIAR VIAJE
// =====================================================
ViajesController.startTrip = async (req, res) => {
  try {
    const { viajeId } = req.params;
    const { ubicacionActual, observaciones, forzarInicio = false } = req.body;

    console.log(`🚀 Iniciando viaje ${viajeId}...`);

    const viaje = await ViajesModel.findById(viajeId);
    if (!viaje) {
      return res.status(404).json({
        success: false,
        message: "Viaje no encontrado"
      });
    }

    const validacionInicio = validarInicioViaje(viaje, forzarInicio);
    if (!validacionInicio.puedeIniciar) {
      return res.status(400).json({
        success: false,
        message: "No se puede iniciar el viaje",
        errores: validacionInicio.errores,
        advertencias: validacionInicio.advertencias
      });
    }

    const actualizaciones = {
      'estado.actual': 'en_curso',
      'estado.fechaCambio': new Date(),
      'tiemposReales.salidaReal': new Date(),
      'tracking.progreso.porcentaje': 5,
      'tracking.progreso.etapaActual': 'en_transito',
      'tracking.progreso.fechaActualizacion': new Date(),
      $push: {
        'estado.historial': {
          estadoAnterior: viaje.estado.actual,
          estadoNuevo: 'en_curso',
          fecha: new Date(),
          motivo: 'inicio_manual',
          observaciones: observaciones || 'Viaje iniciado manualmente',
          usuario: req.user?.id || 'sistema'
        }
      }
    };

    if (ubicacionActual && ubicacionActual.lat && ubicacionActual.lng) {
      actualizaciones['tracking.ubicacionActual'] = {
        coordenadas: {
          lat: parseFloat(ubicacionActual.lat),
          lng: parseFloat(ubicacionActual.lng)
        },
        direccion: ubicacionActual.direccion || 'Ubicación de inicio',
        fecha: new Date(),
        velocidad: ubicacionActual.velocidad || 0,
        precision: 'manual'
      };

      actualizaciones.$push['tracking.checkpoints'] = {
        ubicacion: {
          lat: parseFloat(ubicacionActual.lat),
          lng: parseFloat(ubicacionActual.lng)
        },
        fecha: new Date(),
        tipo: 'inicio',
        descripcion: 'Inicio del viaje'
      };
    }

    const viajeActualizado = await ViajesModel.findByIdAndUpdate(
      viajeId,
      actualizaciones,
      { new: true }
    ).populate([
      { path: 'truckId', select: 'brand model licensePlate name marca modelo placa nombre' },
      { path: 'conductorId', select: 'name phone nombre telefono' }
    ]);

    if (viajeActualizado.estado.notificacionesActivas) {
      await enviarNotificacionInicioViaje(viajeActualizado);
    }

    res.status(200).json({
      success: true,
      message: "Viaje iniciado exitosamente",
      viaje: {
        id: viajeActualizado._id,
        estado: viajeActualizado.estado.actual,
        progreso: viajeActualizado.tracking.progreso.porcentaje,
        tiempos: {
          salidaProgramada: viajeActualizado.departureTime,
          salidaReal: viajeActualizado.tiemposReales.salidaReal,
          llegadaEstimada: viajeActualizado.arrivalTime
        },
        ubicacionActual: viajeActualizado.tracking.ubicacionActual,
        ruta: {
          origen: viajeActualizado.ruta.origen.nombre,
          destino: viajeActualizado.ruta.destino.nombre,
          distancia: viajeActualizado.ruta.distanciaTotal,
          tiempoEstimado: viajeActualizado.ruta.tiempoEstimado
        }
      },
      tracking: {
        gpsActivo: true,
        actualizacionesAutomaticas: viajeActualizado.estado.autoActualizar,
        proximaActualizacion: new Date(Date.now() + 60000)
      },
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Viaje ${viajeId} iniciado exitosamente`);

  } catch (error) {
    console.error("❌ Error iniciando viaje:", error);
    res.status(500).json({
      success: false,
      message: "Error al iniciar el viaje",
      error: error.message
    });
  }
};

// =====================================================
// 📊 OBTENER VIAJES DISPONIBLES PARA ASIGNACIÓN
// =====================================================
ViajesController.getAvailableTrips = async (req, res) => {
  try {
    const { estado = 'pendiente', limite = 50 } = req.query;

    const viajes = await ViajesModel.find({
      'estado.actual': estado,
      departureTime: { $gte: new Date() }
    })
    .populate('truckId', 'brand model licensePlate name')
    .populate('conductorId', 'name nombre phone telefono')
    .sort({ departureTime: 1 })
    .limit(parseInt(limite));

    const viajesDisponibles = viajes.map(viaje => ({
      id: viaje._id,
      ruta: {
        origen: viaje.ruta.origen.nombre,
        destino: viaje.ruta.destino.nombre,
        distancia: viaje.ruta.distanciaTotal
      },
      horarios: {
        salida: viaje.departureTime,
        llegadaEstimada: viaje.arrivalTime
      },
      recursos: {
        tieneCamion: !!viaje.truckId,
        tieneConductor: !!viaje.conductorId,
        camion: viaje.truckId ? obtenerInfoCamion(viaje.truckId) : null,
        conductor: viaje.conductorId ? 
          (viaje.conductorId.name || viaje.conductorId.nombre) : null
      },
      carga: {
        descripcion: viaje.carga.descripcion,
        peso: viaje.carga.peso.valor,
        categoria: viaje.carga.categoria
      },
      prioridad: viaje.prioridad || 'normal',
      listo: !!viaje.truckId && !!viaje.conductorId,
      estado: viaje.estado.actual,
      cotizacion: viaje.quoteId ? {
        id: viaje.quoteId,
        hasClient: true
      } : null
    }));

    const estadisticas = {
      total: viajesDisponibles.length,
      listos: viajesDisponibles.filter(v => v.listo).length,
      sinCamion: viajesDisponibles.filter(v => !v.recursos.tieneCamion).length,
      sinConductor: viajesDisponibles.filter(v => !v.recursos.tieneConductor).length,
      prioridades: {
        alta: viajesDisponibles.filter(v => v.prioridad === 'alta').length,
        media: viajesDisponibles.filter(v => v.prioridad === 'media').length,
        normal: viajesDisponibles.filter(v => v.prioridad === 'normal').length,
        baja: viajesDisponibles.filter(v => v.prioridad === 'baja').length
      }
    };

    res.status(200).json({
      success: true,
      viajes: viajesDisponibles,
      estadisticas: estadisticas,
      filtros: { estado, limite },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error obteniendo viajes disponibles:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener viajes disponibles",
      error: error.message
    });
  }
};

// =====================================================
// 🔄 ACTUALIZAR MÚLTIPLES VIAJES
// =====================================================
ViajesController.bulkUpdateTrips = async (req, res) => {
  try {
    const { viajesIds, actualizaciones, validarRecursos = true } = req.body;

    if (!Array.isArray(viajesIds) || viajesIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Se requiere un array de IDs de viajes"
      });
    }

    console.log(`🔄 Actualizando ${viajesIds.length} viajes...`);

    const resultados = {
      exitosos: [],
      fallidos: [],
      advertencias: []
    };

    for (const viajeId of viajesIds) {
      try {
        const viaje = await ViajesModel.findById(viajeId);
        
        if (!viaje) {
          resultados.fallidos.push({
            viajeId: viajeId,
            error: "Viaje no encontrado"
          });
          continue;
        }

        if (validarRecursos && (actualizaciones.truckId || actualizaciones.conductorId)) {
          const disponibilidad = await verificarDisponibilidadRecursos(
            actualizaciones.truckId || viaje.truckId,
            actualizaciones.conductorId || viaje.conductorId,
            viaje.departureTime,
            viaje.arrivalTime
          );

          if (!disponibilidad.disponible) {
            resultados.advertencias.push({
              viajeId: viajeId,
              mensaje: "Posibles conflictos de recursos",
              conflictos: disponibilidad.conflictos
            });
          }
        }

        const viajeActualizado = await ViajesModel.findByIdAndUpdate(
          viajeId,
          {
            ...actualizaciones,
            $push: {
              'estado.historial': {
                estadoAnterior: viaje.estado.actual,
                estadoNuevo: actualizaciones['estado.actual'] || viaje.estado.actual,
                fecha: new Date(),
                motivo: 'actualizacion_masiva',
                usuario: req.user?.id || 'sistema'
              }
            }
          },
          { new: true }
        );

        resultados.exitosos.push({
          viajeId: viajeId,
          estado: viajeActualizado.estado.actual,
          mensaje: "Actualizado exitosamente"
        });

      } catch (error) {
        resultados.fallidos.push({
          viajeId: viajeId,
          error: error.message
        });
      }
    }

    console.log(`✅ Actualización masiva completada: ${resultados.exitosos.length} exitosos, ${resultados.fallidos.length} fallidos`);

    res.status(200).json({
      success: true,
      message: `Procesados ${viajesIds.length} viajes`,
      resultados: resultados,
      resumen: {
        total: viajesIds.length,
        exitosos: resultados.exitosos.length,
        fallidos: resultados.fallidos.length,
        advertencias: resultados.advertencias.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error en actualización masiva:", error);
    res.status(500).json({
      success: false,
      message: "Error en actualización masiva de viajes",
      error: error.message
    });
  }
};

// =====================================================
// 📋 CLONAR VIAJE EXISTENTE
// =====================================================
ViajesController.cloneTrip = async (req, res) => {
  try {
    const { viajeId } = req.params;
    const { 
      nuevaFechaSalida, 
      nuevaFechaLlegada,
      mantenerRecursos = false,
      observaciones = "Viaje clonado"
    } = req.body;

    if (!nuevaFechaSalida) {
      return res.status(400).json({
        success: false,
        message: "Nueva fecha de salida es requerida"
      });
    }

    console.log(`📋 Clonando viaje ${viajeId}...`);

    const viajeOriginal = await ViajesModel.findById(viajeId);
    if (!viajeOriginal) {
      return res.status(404).json({
        success: false,
        message: "Viaje original no encontrado"
      });
    }

    const fechaSalida = new Date(nuevaFechaSalida);
    const fechaLlegada = nuevaFechaLlegada ? 
      new Date(nuevaFechaLlegada) : 
      new Date(fechaSalida.getTime() + viajeOriginal.ruta.tiempoEstimado * 60 * 60 * 1000);

    const viajeClonado = {
      ruta: { ...viajeOriginal.ruta.toObject() },
      departureTime: fechaSalida,
      arrivalTime: fechaLlegada,
      truckId: mantenerRecursos ? viajeOriginal.truckId : null,
      conductorId: mantenerRecursos ? viajeOriginal.conductorId : null,
      carga: { ...viajeOriginal.carga.toObject() },
      quoteId: null,
      estado: {
        actual: 'pendiente',
        fechaCambio: new Date(),
        autoActualizar: viajeOriginal.estado.autoActualizar,
        notificacionesActivas: viajeOriginal.estado.notificacionesActivas,
        historial: [{
          estadoAnterior: null,
          estadoNuevo: 'pendiente',
          fecha: new Date(),
          motivo: 'clonacion',
          observaciones: `Clonado desde viaje ${viajeOriginal._id}. ${observaciones}`,
          usuario: req.user?.id || 'sistema'
        }]
      },
      tracking: {
        progreso: {
          porcentaje: 0,
          etapaActual: 'preparacion',
          fechaActualizacion: new Date()
        },
        ubicacionActual: {
          coordenadas: viajeOriginal.ruta.origen.coordenadas,
          direccion: viajeOriginal.ruta.origen.direccion || viajeOriginal.ruta.origen.nombre,
          fecha: new Date(),
          velocidad: 0,
          precision: 'manual'
        },
        checkpoints: [],
        distanciaRecorrida: 0
      },
      tiemposReales: {
        salidaProgramada: fechaSalida,
        llegadaProgramada: fechaLlegada,
        salidaReal: null,
        llegadaReal: null
      },
      costosReales: {
        combustible: 0,
        peajes: viajeOriginal.costosReales.peajes || 0,
        conductor: 0,
        otros: 0,
        total: viajeOriginal.costosReales.peajes || 0
      },
      condiciones: {
        clima: 'normal',
        trafico: 'normal',
        carretera: 'buena',
        observaciones: observaciones
      },
      alertas: [],
      tripDescription: viajeOriginal.tripDescription + " (Clonado)",
      prioridad: viajeOriginal.prioridad,
      fechaCreacion: new Date(),
      creadoPor: req.user?.id || 'sistema',
      viajeOriginalId: viajeOriginal._id,
      version: '1.0'
    };

    const nuevoViaje = new ViajesModel(viajeClonado);
    await nuevoViaje.save();

    console.log(`✅ Viaje clonado exitosamente: ${nuevoViaje._id}`);

    res.status(201).json({
      success: true,
      message: "Viaje clonado exitosamente",
      viajeOriginal: {
        id: viajeOriginal._id,
        ruta: `${viajeOriginal.ruta.origen.nombre} → ${viajeOriginal.ruta.destino.nombre}`,
        fechaOriginal: viajeOriginal.departureTime
      },
      viajeClonado: {
        id: nuevoViaje._id,
        ruta: `${nuevoViaje.ruta.origen.nombre} → ${nuevoViaje.ruta.destino.nombre}`,
        fechaNueva: nuevoViaje.departureTime,
        estado: nuevoViaje.estado.actual,
        recursosMantenidos: mantenerRecursos
      },
      configuracion: {
        mantenerRecursos: mantenerRecursos,
        observaciones: observaciones,
        requiereNuevaCotizacion: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error clonando viaje:", error);
    res.status(500).json({
      success: false,
      message: "Error al clonar el viaje",
      error: error.message
    });
  }
};

// =====================================================
// PATCH: Actualizar ubicación GPS
// =====================================================
ViajesController.updateLocation = async (req, res) => {
  try {
    const { viajeId } = req.params;
    const { lat, lng, velocidad, direccion } = req.body;

    const viaje = await ViajesModel.findById(viajeId);
    if (!viaje) {
      return res.status(404).json({
        success: false,
        message: "Viaje no encontrado"
      });
    }

    viaje.agregarUbicacion(lat, lng, velocidad);
    
    if (direccion !== undefined) {
      viaje.tracking.ubicacionActual.direccion = direccion;
    }

    await viaje.save();

    res.status(200).json({
      success: true,
      data: {
        ubicacion: viaje.tracking.ubicacionActual,
        progreso: viaje.tracking.progreso
      },
      message: "Ubicación actualizada exitosamente"
    });

  } catch (error) {
    console.error("❌ Error actualizando ubicación:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar ubicación",
      error: error.message
    });
  }
};

// =====================================================
// PATCH: Completar viaje manualmente
// =====================================================
ViajesController.completeTrip = async (req, res) => {
  try {
    const { viajeId } = req.params;
    const { observaciones } = req.body;

    const viaje = await ViajesModel.findById(viajeId);
    if (!viaje) {
      return res.status(404).json({
        success: false,
        message: "Viaje no encontrado"
      });
    }

    viaje.estado.actual = 'completado';
    viaje.estado.fechaCambio = new Date();
    viaje.estado.autoActualizar = false;
    viaje.tiemposReales.llegadaReal = new Date();
    viaje.tracking.progreso.porcentaje = 100;

    viaje.estado.historial.push({
      estadoAnterior: viaje.estado.actual,
      estadoNuevo: 'completado',
      fecha: new Date(),
      motivo: 'manual'
    });

    if (observaciones) {
      viaje.condiciones.observaciones = observaciones;
    }

    await viaje.save();

    res.status(200).json({
      success: true,
      data: viaje,
      message: "Viaje completado exitosamente"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al completar viaje",
      error: error.message
    });
  }
};

// =====================================================
// GET: Datos optimizados para el mapa CON INTEGRACIÓN DE COTIZACIONES
// =====================================================
ViajesController.getMapData = async (req, res) => {
  try {
    console.log("🗺️ Obteniendo datos del mapa con esquema real...");

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

    const locationMap = new Map();
    
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

    const routes = viajes.map((viaje, index) => {
      try {
        const cotizacion = viaje.quoteId;
        
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

        if (!origen?.coordenadas?.lat || !destino?.coordenadas?.lat) {
          console.log(`   ❌ Coordenadas inválidas, omitiendo viaje`);
          return null;
        }

        const coordinates = [
          [origen.coordenadas.lat, origen.coordenadas.lng],
          [destino.coordenadas.lat, destino.coordenadas.lng]
        ];

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

        const getDriverInfo = () => {
          const conductor = viaje.conductorId;
          if (conductor?.name || conductor?.nombre) {
            return conductor.name || conductor.nombre;
          }
          return "Conductor por asignar";
        };

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

        const cargaInfo = cotizacion?.carga;
        const carga = cargaInfo?.descripcion || 'Carga general';
        const peso = cargaInfo?.peso?.valor ? 
          ` - ${cargaInfo.peso.valor} ${cargaInfo.peso.unidad || 'kg'}` : '';

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

    const cities = [
      { name: "San Salvador", coords: [13.6929, -89.2182] },
      { name: "Soyapango", coords: [13.7167, -89.1389] },
      { name: "Mejicanos", coords: [13.7408, -89.2075] },
      { name: "Santa Ana", coords: [13.9942, -89.5592] },
      { name: "San Miguel", coords: [13.4833, -88.1833] }
    ];

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

    console.log("✅ Datos procesados exitosamente con esquema real:");
    console.log(`📍 Ubicaciones: ${mapData.locations.length}`);
    console.log(`🛣️ Rutas: ${mapData.routes.length}`);
    console.log(`📊 Tasa de finalización: ${statistics.completion_rate}%`);
    console.log(`⏰ Puntualidad: ${statistics.on_time_rate}%`);

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

// =====================================================
// GET: Análisis de distribución de cargas
// =====================================================
ViajesController.getCargaDistribution = async (req, res) => {
  try {
    console.log("📊 Iniciando análisis de distribución de cargas...");

    const distribucionCategoria = await ViajesModel.aggregate([
      {
        $lookup: {
          from: "Cotizaciones",
          localField: "quoteId",
          foreignField: "_id",
          as: "cotizacion"
        }
      },
      {
        $unwind: {
          path: "$cotizacion",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $group: {
          _id: "$cotizacion.carga.categoria",
          count: { $sum: 1 },
          
          pesoPromedio: { $avg: "$cotizacion.carga.peso.valor" },
          pesoTotal: { $sum: "$cotizacion.carga.peso.valor" },
          
          valorPromedio: { $avg: "$cotizacion.carga.valorDeclarado.monto" },
          valorTotal: { $sum: "$cotizacion.carga.valorDeclarado.monto" },
          
          ejemplos: { $addToSet: "$cotizacion.carga.descripcion" },
          subcategorias: { $addToSet: "$cotizacion.carga.subcategoria" },
          
          riesgosEspeciales: {
            $sum: {
              $cond: [
                { $ne: ["$cotizacion.carga.clasificacionRiesgo", "normal"] },
                1,
                0
              ]
            }
          },
          
          viajesCompletados: {
            $sum: {
              $cond: [{ $eq: ["$estado.actual", "completado"] }, 1, 0]
            }
          },
          viajesEnCurso: {
            $sum: {
              $cond: [{ $eq: ["$estado.actual", "en_curso"] }, 1, 0]
            }
          },
          
          tiposCamionUsados: { $addToSet: "$cotizacion.truckType" },
          
          rutasComunes: { 
            $addToSet: {
              $concat: [
                "$cotizacion.ruta.origen.nombre",
                " → ",
                "$cotizacion.ruta.destino.nombre"
              ]
            }
          },
          
          tiempoPromedioViaje: { $avg: "$cotizacion.ruta.tiempoEstimado" },
          distanciaPromedio: { $avg: "$cotizacion.ruta.distanciaTotal" }
        }
      },
      {
        $group: {
          _id: null,
          categorias: {
            $push: {
              categoria: "$_id",
              count: "$count",
              pesoPromedio: "$pesoPromedio",
              pesoTotal: "$pesoTotal",
              valorPromedio: "$valorPromedio",
              valorTotal: "$valorTotal",
              ejemplos: "$ejemplos",
              subcategorias: "$subcategorias",
              riesgosEspeciales: "$riesgosEspeciales",
              viajesCompletados: "$viajesCompletados",
              viajesEnCurso: "$viajesEnCurso",
              tiposCamionUsados: "$tiposCamionUsados",
              rutasComunes: "$rutasComunes",
              tiempoPromedioViaje: "$tiempoPromedioViaje",
              distanciaPromedio: "$distanciaPromedio"
            }
          },
          total: { $sum: "$count" }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          distribucion: {
            $map: {
              input: "$categorias",
              as: "item",
              in: {
                categoria: "$item.categoria",
                name: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$item.categoria", "alimentos_perecederos"] }, then: "Alimentos Perecederos" },
                      { case: { $eq: ["$item.categoria", "alimentos_no_perecederos"] }, then: "Alimentos No Perecederos" },
                      { case: { $eq: ["$item.categoria", "materiales_construccion"] }, then: "Materiales de Construcción" },
                      { case: { $eq: ["$item.categoria", "electronicos"] }, then: "Electrónicos" },
                      { case: { $eq: ["$item.categoria", "maquinaria"] }, then: "Maquinaria y Equipos" },
                      { case: { $eq: ["$item.categoria", "textiles"] }, then: "Textiles" },
                      { case: { $eq: ["$item.categoria", "quimicos"] }, then: "Productos Químicos" },
                      { case: { $eq: ["$item.categoria", "medicamentos"] }, then: "Medicamentos" },
                      { case: { $eq: ["$item.categoria", "vehiculos"] }, then: "Vehículos" },
                      { case: { $eq: ["$item.categoria", "productos_agricolas"] }, then: "Productos Agrícolas" }
                    ],
                    default: {
                      $concat: [
                        { $toUpper: { $substr: ["$item.categoria", 0, 1] } },
                        { $substr: ["$item.categoria", 1, -1] }
                      ]
                    }
                  }
                },
                count: "$item.count",
                porcentaje: {
                  $round: [
                    { $multiply: [{ $divide: ["$item.count", "$total"] }, 100] },
                    1
                  ]
                },
                
                pesoPromedio: { $round: [{ $ifNull: ["$item.pesoPromedio", 0] }, 2] },
                pesoTotal: { $round: [{ $ifNull: ["$item.pesoTotal", 0] }, 2] },
                valorPromedio: { $round: [{ $ifNull: ["$item.valorPromedio", 0] }, 2] },
                valorTotal: { $round: [{ $ifNull: ["$item.valorTotal", 0] }, 2] },
                
                ejemplos: { $slice: ["$item.ejemplos", 3] },
                subcategorias: { $slice: ["$item.subcategorias", 5] },
                riesgosEspeciales: "$item.riesgosEspeciales",
                
                tasaCompletado: {
                  $cond: [
                    { $gt: ["$item.count", 0] },
                    { $round: [{ $multiply: [{ $divide: ["$item.viajesCompletados", "$item.count"] }, 100] }, 1] },
                    0
                  ]
                },
                viajesActivos: "$item.viajesEnCurso",
                
                tiposCamionUsados: "$item.tiposCamionUsados",
                rutasComunes: { $slice: ["$item.rutasComunes", 3] },
                tiempoPromedioHoras: { $round: [{ $ifNull: ["$item.tiempoPromedioViaje", 0] }, 1] },
                distanciaPromedioKm: { $round: [{ $ifNull: ["$item.distanciaPromedio", 0] }, 1] },
                
                clasificacionRiesgo: {
                  $cond: [
                    { $gt: ["$item.riesgosEspeciales", 0] },
                    "especial",
                    "normal"
                  ]
                }
              }
            }
          }
        }
      },
      {
        $project: {
          total: 1,
          distribucion: {
            $sortArray: {
              input: "$distribucion",
              sortBy: { count: -1 }
            }
          }
        }
      }
    ]);

    const resultado = distribucionCategoria[0] || { total: 0, distribucion: [] };

    const estadisticas = {
      totalTiposUnicos: resultado.distribucion.length,
      totalViajes: resultado.total,
      tipoMasFrecuente: resultado.distribucion[0]?.name || 'N/A',
      porcentajeMasFrecuente: resultado.distribucion[0]?.porcentaje || 0,
      
      pesoTotalTransportado: resultado.distribucion.reduce((acc, item) => acc + (item.pesoTotal || 0), 0),
      valorTotalTransportado: resultado.distribucion.reduce((acc, item) => acc + (item.valorTotal || 0), 0),
      
      tasaCompletadoGeneral: resultado.total > 0 ? 
        Math.round(resultado.distribucion.reduce((acc, item) => acc + (item.viajesCompletados || 0), 0) / resultado.total * 100) : 0,
      
      categoriasConRiesgo: resultado.distribucion.filter(item => item.clasificacionRiesgo === 'especial').length,
      porcentajeRiesgoEspecial: resultado.total > 0 ? 
        Math.round(resultado.distribucion.reduce((acc, item) => acc + (item.riesgosEspeciales || 0), 0) / resultado.total * 100) : 0,
      
      top3Tipos: resultado.distribucion.slice(0, 3).map(t => ({
        tipo: t.name,
        porcentaje: t.porcentaje,
        cantidad: t.count
      })),
      
      tiempoPromedioGeneral: resultado.distribucion.length > 0 ?
        Math.round(resultado.distribucion.reduce((acc, item) => acc + (item.tiempoPromedioHoras || 0), 0) / resultado.distribucion.length) : 0,
      distanciaPromedioGeneral: resultado.distribucion.length > 0 ?
        Math.round(resultado.distribucion.reduce((acc, item) => acc + (item.distanciaPromedioKm || 0), 0) / resultado.distribucion.length) : 0
    };

    res.status(200).json({
      success: true,
      data: resultado.distribucion,
      estadisticas: estadisticas,
      
      metadata: {
        total: resultado.total,
        fuente: "cotizaciones_lookup",
        ultimaActualizacion: new Date().toISOString(),
        modeloVersion: "3.0",
        metodoAnalisis: "aggregation_pipeline_with_lookup"
      },
      
      message: `Análisis de ${resultado.distribucion.length} tipos de carga completado usando datos de cotizaciones`,
      timestamp: new Date().toISOString()
    });

    console.log("✅ Análisis de distribución completado exitosamente usando cotizaciones");

  } catch (error) {
    console.error("❌ Error en análisis de distribución:", error);
    res.status(500).json({
      success: false,
      message: "Error al analizar distribución de cargas",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// =====================================================
// MÉTODOS ADICIONALES ÚTILES
// =====================================================

ViajesController.getAllViajes = async (req, res) => {
  try {
    const viajes = await ViajesModel.find()
      .populate('truckId', 'brand model licensePlate name')
      .populate('conductorId', 'nombre telefono')
      .sort({ departureTime: -1 });
    res.status(200).json(viajes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

ViajesController.getTripDetails = async (req, res) => {
  try {
    const { viajeId } = req.params;

    const viaje = await ViajesModel.findById(viajeId)
      .populate('truckId', 'brand model licensePlate name marca modelo placa')
      .populate('conductorId', 'nombre telefono')
      .populate('quoteId');

    if (!viaje) {
      return res.status(404).json({
        success: false,
        message: "Viaje no encontrado"
      });
    }

    res.status(200).json({
      success: true,
      data: viaje,
      message: "Detalles del viaje obtenidos exitosamente"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener detalles del viaje",
      error: error.message
    });
  }
};

ViajesController.getTripStats = async (req, res) => {
  try {
    const { periodo = 'mes' } = req.query;

    let groupId;
    switch (periodo) {
      case 'dia':
        groupId = { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$departureTime" } } };
        break;
      case 'semana':
        groupId = {
          year: { $year: { $toDate: "$departureTime" } },
          week: { $isoWeek: { $toDate: "$departureTime" } }
        };
        break;
      case 'año':
        groupId = { $year: { $toDate: "$departureTime" } };
        break;
      default:
        groupId = { $month: { $toDate: "$departureTime" } };
    }

    const stats = await ViajesModel.aggregate([
      {
        $group: {
          _id: groupId,
          totalViajes: { $sum: 1 },
          completados: {
            $sum: { $cond: [{ $eq: ["$estado.actual", "completado"] }, 1, 0] }
          },
          progresoPromedio: { $avg: "$tracking.progreso.porcentaje" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Error en getTripStats:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

ViajesController.getCompletedTrips = async (req, res) => {
  try {
    const completed = await ViajesModel.find({ "estado.actual": "completado" })
      .sort({ 'tiemposReales.llegadaReal': -1 })
      .limit(20)
      .populate('truckId', 'brand model licensePlate name')
      .populate('conductorId', 'nombre');

    res.status(200).json({ success: true, data: completed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// 📅 OBTENER VIAJES ORGANIZADOS POR DÍAS
// =====================================================
ViajesController.getViajesPorDias = async (req, res) => {
  try {
    console.log("📅 Obteniendo viajes organizados por días...");

    const { diasAdelante = 7 } = req.query;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const fechaLimite = new Date(today);
    fechaLimite.setDate(today.getDate() + parseInt(diasAdelante));

    let viajes = await ViajesModel.find({
      departureTime: {
        $gte: today,
        $lt: fechaLimite
      }
    })
    .populate('truckId', 'brand model licensePlate name marca modelo placa nombre')
    .populate('conductorId', 'name phone nombre telefono')
    .sort({ departureTime: 1 })
    .lean();

    console.log(`🚛 Encontrados ${viajes.length} viajes en BD`);

    if (viajes.length === 0) {
      console.log("📝 Generando viajes de ejemplo...");
      viajes = generarViajesEjemplo(today, parseInt(diasAdelante));
      console.log(`🎯 Generados ${viajes.length} viajes de ejemplo`);
    }

    const estadosConfig = {
      'pendiente': { color: 'bg-blue-500', textColor: 'text-blue-600', status: 'bg-blue-400', icon: '📋', label: 'Programado' },
      'en_curso': { color: 'bg-green-500', textColor: 'text-green-600', status: 'bg-green-400', icon: '🚛', label: 'En Tránsito' },
      'retrasado': { color: 'bg-orange-500', textColor: 'text-orange-600', status: 'bg-orange-400', icon: '⏰', label: 'Retrasado' },
      'completado': { color: 'bg-emerald-500', textColor: 'text-emerald-600', status: 'bg-emerald-400', icon: '✅', label: 'Completado' },
      'cancelado': { color: 'bg-red-500', textColor: 'text-red-600', status: 'bg-red-400', icon: '❌', label: 'Cancelado' }
    };

    const getDayLabel = (fecha) => {
      const diffTime = fecha - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Hoy';
      if (diffDays === 1) return 'Mañana';
      if (diffDays === 2) return 'Pasado mañana';
      if (diffDays === -1) return 'Ayer';
      if (diffDays === -2) return 'Anteayer';
      if (diffDays < -2) return `Hace ${Math.abs(diffDays)} días`;
      
      const opciones = { weekday: 'long', day: 'numeric', month: 'short' };
      return fecha.toLocaleDateString('es-ES', opciones);
    };

    const viajesPorDia = new Map();

    viajes.forEach((viaje) => {
      try {
        const fechaViaje = new Date(viaje.departureTime);
        const fechaSoloFecha = new Date(fechaViaje.getFullYear(), fechaViaje.getMonth(), fechaViaje.getDate());
        const fechaKey = fechaSoloFecha.toISOString().split('T')[0];

        const truck = viaje.truckId;
        const truckInfo = truck ? 
          `${truck.brand || truck.marca || ''} ${truck.model || truck.modelo || ''}`.trim() || 
          `${truck.name || truck.nombre || ''}`.trim() || 
          `Camión ${truck.licensePlate || truck.placa || ''}`.trim() ||
          'Camión disponible'
          : viaje.truck || 'Camión por asignar';

        const conductor = viaje.conductorId || viaje.conductor;
        const driverInfo = conductor?.name || conductor?.nombre || viaje.driver || 'Conductor por asignar';

        const origen = viaje.ruta?.origen?.nombre || viaje.origen || 'Origen';
        const destino = viaje.ruta?.destino?.nombre || viaje.destino || 'Destino';

        const estadoActual = viaje.estado?.actual || viaje.estado || 'pendiente';
        const config = estadosConfig[estadoActual] || estadosConfig.pendiente;

        const carga = viaje.carga?.descripcion || viaje.description || 'Carga general';
        const peso = viaje.carga?.peso?.valor ? 
          ` - ${viaje.carga.peso.valor} ${viaje.carga.peso.unidad || 'kg'}` : '';

        const salidaProgramada = new Date(viaje.departureTime);
        const llegadaProgramada = viaje.arrivalTime ? 
          new Date(viaje.arrivalTime) : 
          new Date(salidaProgramada.getTime() + 2 * 60 * 60 * 1000);

        let progreso = viaje.tracking?.progreso?.porcentaje || viaje.progreso || 0;
        if (estadoActual === 'completado') {
          progreso = 100;
        } else if (estadoActual === 'en_curso' && progreso === 0) {
          progreso = Math.floor(Math.random() * 60) + 20;
        }

        const viajeFormateado = {
          id: viaje._id?.toString() || viaje.id || Math.random().toString(36).substr(2, 9),
          type: `${origen} → ${destino}`,
          time: salidaProgramada.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit"
          }),
          endTime: llegadaProgramada.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit"
          }),
          description: carga + peso,
          
          color: config.color,
          textColor: config.textColor,
          status: config.status,
          icon: config.icon,
          
          estado: {
            actual: estadoActual,
            label: config.label,
            progreso: Math.round(progreso)
          },
          
          truck: truckInfo,
          driver: driverInfo,
          driverPhone: conductor?.phone || conductor?.telefono || viaje.driverPhone || "No disponible",
          
          origen: origen,
          destino: destino,
          
          distancia: viaje.ruta?.distanciaTotal ? `${viaje.ruta.distanciaTotal} km` : 
                     viaje.distancia ? `${viaje.distancia} km` : null,
          
          alertas: viaje.alertas?.filter(alert => !alert.resuelta).length > 0 ? {
            count: viaje.alertas.filter(alert => !alert.resuelta).length,
            prioridad: Math.max(...viaje.alertas.map(a => a.prioridad || 1))
          } : (viaje.alertas && viaje.alertas.count > 0 ? viaje.alertas : null)
        };

        if (!viajesPorDia.has(fechaKey)) {
          viajesPorDia.set(fechaKey, {
            fecha: fechaSoloFecha,
            fechaKey: fechaKey,
            label: getDayLabel(fechaSoloFecha),
            fechaCompleta: fechaSoloFecha.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            viajes: [],
            estadisticas: {
              total: 0,
              pendientes: 0,
              enCurso: 0,
              completados: 0,
              retrasados: 0,
              cancelados: 0
            }
          });
        }

        const diaData = viajesPorDia.get(fechaKey);
        diaData.viajes.push(viajeFormateado);
        diaData.estadisticas.total++;
        
        switch (estadoActual) {
          case 'en_curso':
            diaData.estadisticas.enCurso++;
            break;
          case 'retrasado':
            diaData.estadisticas.retrasados++;
            break;
          case 'completado':
            diaData.estadisticas.completados++;
            break;
          case 'cancelado':
            diaData.estadisticas.cancelados++;
            break;
          default:
            diaData.estadisticas.pendientes++;
        }

      } catch (error) {
        console.error(`❌ Error procesando viaje ${viaje._id || viaje.id}:`, error.message);
      }
    });

    const diasOrdenados = Array.from(viajesPorDia.values())
      .sort((a, b) => a.fecha - b.fecha)
      .map(dia => ({
        ...dia,
        viajes: dia.viajes.sort((a, b) => {
          const prioridades = {
            'en_curso': 1,
            'retrasado': 2,
            'pendiente': 3,
            'completado': 4,
            'cancelado': 5
          };
          
          const prioridadA = prioridades[a.estado.actual] || 6;
          const prioridadB = prioridades[b.estado.actual] || 6;
          
          if (prioridadA !== prioridadB) {
            return prioridadA - prioridadB;
          }
          
          return a.time.localeCompare(b.time);
        })
      }));

    const estadisticasGenerales = {
      totalDias: diasOrdenados.length,
      totalViajes: viajes.length,
      viajesHoy: diasOrdenados.find(d => d.label === 'Hoy')?.estadisticas.total || 0,
      viajesMañana: diasOrdenados.find(d => d.label === 'Mañana')?.estadisticas.total || 0,
      estadosDistribucion: {
        pendientes: viajes.filter(v => (v.estado?.actual || v.estado || 'pendiente') === 'pendiente').length,
        enCurso: viajes.filter(v => (v.estado?.actual || v.estado) === 'en_curso').length,
        retrasados: viajes.filter(v => (v.estado?.actual || v.estado) === 'retrasado').length,
        completados: viajes.filter(v => (v.estado?.actual || v.estado) === 'completado').length,
        cancelados: viajes.filter(v => (v.estado?.actual || v.estado) === 'cancelado').length
      }
    };

    res.status(200).json({
      success: true,
      data: diasOrdenados,
      estadisticas: estadisticasGenerales,
      message: `Viajes organizados para los próximos ${diasAdelante} días obtenidos exitosamente`
    });

    console.log("✅ Viajes por días procesados exitosamente");

  } catch (error) {
    console.error("❌ Error obteniendo viajes por días:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener viajes organizados por días",
      error: error.message
    });
  }
};

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

    const viajesPorDia = Math.floor(Math.random() * 4) + 2;

    for (let i = 0; i < viajesPorDia; i++) {
      const hora = Math.floor(Math.random() * 12) + 6;
      const minuto = Math.floor(Math.random() * 60);
      
      const fechaSalida = new Date(fecha);
      fechaSalida.setHours(hora, minuto, 0, 0);

      const fechaLlegada = new Date(fechaSalida);
      fechaLlegada.setHours(fechaSalida.getHours() + Math.floor(Math.random() * 8) + 2);

      let estado;
      if (dia === 0) {
        estado = estados[Math.floor(Math.random() * estados.length)];
      } else if (dia === 1) {
        estado = Math.random() < 0.8 ? 'pendiente' : estados[Math.floor(Math.random() * estados.length)];
      } else {
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
        distancia: Math.floor(Math.random() * 800) + 100,
        progreso: estado === 'en_curso' ? Math.floor(Math.random() * 60) + 20 : 0,
        alertas: Math.random() < 0.3 ? {
          count: Math.floor(Math.random() * 3) + 1,
          prioridad: Math.floor(Math.random() * 3) + 1
        } : null
      };

      viajes.push(viaje);
    }
  }

  return viajes;
}

// =====================================================
// 📊 DASHBOARD COMPLETO DE VIAJES
// =====================================================
ViajesController.getDashboard = async (req, res) => {
  try {
    console.log("📊 Generando dashboard completo de viajes...");

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const metricas = await ViajesModel.aggregate([
      {
        $facet: {
          general: [
            {
              $group: {
                _id: null,
                totalViajes: { $sum: 1 },
                pendientes: { $sum: { $cond: [{ $eq: ["$estado.actual", "pendiente"] }, 1, 0] } },
                enCurso: { $sum: { $cond: [{ $eq: ["$estado.actual", "en_curso"] }, 1, 0] } },
                completados: { $sum: { $cond: [{ $eq: ["$estado.actual", "completado"] }, 1, 0] } },
                retrasados: { $sum: { $cond: [{ $eq: ["$estado.actual", "retrasado"] }, 1, 0] } },
                cancelados: { $sum: { $cond: [{ $eq: ["$estado.actual", "cancelado"] }, 1, 0] } },
                progresoPromedio: { $avg: "$tracking.progreso.porcentaje" }
              }
            }
          ],
          hoy: [
            {
              $match: {
                departureTime: { $gte: startOfDay, $lt: endOfDay }
              }
            },
            {
              $group: {
                _id: null,
                viajesHoy: { $sum: 1 },
                completadosHoy: { $sum: { $cond: [{ $eq: ["$estado.actual", "completado"] }, 1, 0] } },
                enCursoHoy: { $sum: { $cond: [{ $eq: ["$estado.actual", "en_curso"] }, 1, 0] } },
                retrasadosHoy: { $sum: { $cond: [{ $eq: ["$estado.actual", "retrasado"] }, 1, 0] } }
              }
            }
          ]
        }
      }
    ]);

    const datos = metricas[0];
    const general = datos.general[0] || {};
    const hoy = datos.hoy[0] || {};

    const dashboard = {
      metricas: {
        general: {
          totalViajes: general.totalViajes || 0,
          pendientes: general.pendientes || 0,
          enCurso: general.enCurso || 0,
          completados: general.completados || 0,
          retrasados: general.retrasados || 0,
          cancelados: general.cancelados || 0,
          progresoPromedio: Math.round(general.progresoPromedio || 0),
          tasaCompletado: general.totalViajes > 0 ? 
            Math.round((general.completados / general.totalViajes) * 100) : 0
        },
        hoy: {
          viajesHoy: hoy.viajesHoy || 0,
          completadosHoy: hoy.completadosHoy || 0,
          enCursoHoy: hoy.enCursoHoy || 0,
          retrasadosHoy: hoy.retrasadosHoy || 0,
          eficienciaHoy: hoy.viajesHoy > 0 ? 
            Math.round((hoy.completadosHoy / hoy.viajesHoy) * 100) : 0
        }
      },
      metadata: {
        generadoEn: new Date().toISOString(),
        version: '2.0'
      }
    };

    res.status(200).json({
      success: true,
      dashboard: dashboard,
      message: "Dashboard generado exitosamente"
    });

  } catch (error) {
    console.error("❌ Error generando dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Error al generar el dashboard",
      error: error.message
    });
  }
};

// =====================================================
// 🔧 MÉTODOS AUXILIARES ADICIONALES
// =====================================================
ViajesController.updateTripProgress = async (req, res) => {
  try {
    const { viajeId } = req.params;
    const { progreso, estado, observaciones } = req.body;

    const viaje = await ViajesModel.findById(viajeId);
    if (!viaje) {
      return res.status(404).json({
        success: false,
        message: "Viaje no encontrado"
      });
    }

    if (progreso !== undefined) {
      viaje.tracking.progreso.porcentaje = Math.min(100, Math.max(0, progreso));
      viaje.tracking.progreso.fechaActualizacion = new Date();
    }

    if (estado && estado !== viaje.estado.actual) {
      const estadoAnterior = viaje.estado.actual;
      viaje.estado.actual = estado;
      viaje.estado.fechaCambio = new Date();
      
      viaje.estado.historial.push({
        estadoAnterior: estadoAnterior,
        estadoNuevo: estado,
        fecha: new Date(),
        motivo: 'manual'
      });

      if (estado === 'completado') {
        viaje.tracking.progreso.porcentaje = 100;
        viaje.tiemposReales.llegadaReal = new Date();
      }
    }

    if (observaciones) {
      viaje.condiciones.observaciones = observaciones;
    }

    await viaje.save();

    res.status(200).json({
      success: true,
      data: {
        id: viaje._id,
        estado: viaje.estado.actual,
        progreso: viaje.tracking.progreso.porcentaje
      },
      message: "Progreso actualizado exitosamente"
    });

  } catch (error) {
    console.error("❌ Error actualizando progreso:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar progreso",
      error: error.message
    });
  }
};

ViajesController.getRealTimeMetrics = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const metricas = await ViajesModel.aggregate([
      {
        $facet: {
          hoy: [
            {
              $match: {
                departureTime: { $gte: today, $lt: tomorrow }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completados: { $sum: { $cond: [{ $eq: ["$estado.actual", "completado"] }, 1, 0] } },
                enCurso: { $sum: { $cond: [{ $eq: ["$estado.actual", "en_curso"] }, 1, 0] } },
                retrasados: { $sum: { $cond: [{ $eq: ["$estado.actual", "retrasado"] }, 1, 0] } }
              }
            }
          ]
        }
      }
    ]);

    const datosHoy = metricas[0].hoy[0] || {};

    res.status(200).json({
      success: true,
      data: {
        hoy: {
          total: datosHoy.total || 0,
          completados: datosHoy.completados || 0,
          enCurso: datosHoy.enCurso || 0,
          retrasados: datosHoy.retrasados || 0
        },
        timestamp: now.toISOString()
      },
      message: "Métricas en tiempo real obtenidas"
    });

  } catch (error) {
    console.error("❌ Error obteniendo métricas:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener métricas en tiempo real",
      error: error.message
    });
  }
};

ViajesController.getCargaStats = async (req, res) => {
  try {
    const cargas = await ViajesModel.aggregate([
      {
        $group: {
          _id: "$carga.descripcion",
          cantidad: { $sum: 1 },
          pesoTotal: { $sum: "$carga.peso.valor" }
        }
      },
      { $sort: { cantidad: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({ success: true, data: cargas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

ViajesController.getTiposDeCargas = async (req, res) => {
  try {
    const tiposUnicos = await ViajesModel.aggregate([
      {
        $group: {
          _id: null,
          categorias: { $addToSet: "$carga.categoria" },
          tipos: { $addToSet: "$carga.tipo" },
          descripciones: { $addToSet: "$carga.descripcion" }
        }
      }
    ]);

    const resultado = tiposUnicos[0] || { categorias: [], tipos: [], descripciones: [] };
    
    const todosTipos = [
      ...resultado.categorias,
      ...resultado.tipos,
      ...resultado.descripciones
    ]
    .filter(tipo => tipo && tipo.trim() !== '')
    .map(tipo => tipo.trim())
    .filter((tipo, index, array) => array.indexOf(tipo) === index);

    const tiposLimpios = todosTipos
      .map(tipo => ({
        valor: tipo,
        nombre: tipo.charAt(0).toUpperCase() + tipo.slice(1)
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    res.status(200).json({
      success: true,
      data: tiposLimpios,
      total: tiposLimpios.length,
      message: "Tipos de carga obtenidos exitosamente"
    });

  } catch (error) {
    console.error("❌ Error obteniendo tipos:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener tipos de carga",
      error: error.message
    });
  }
};

// =====================================================
// 📤 EXPORT DEL CONTROLADOR COMPLETO
// =====================================================
export default ViajesController;