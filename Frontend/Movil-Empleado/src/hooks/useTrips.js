import { useState, useEffect } from 'react';

// Configuración de la API - ajusta esta URL a tu servidor
const API_BASE_URL = 'https://riveraproject-5.onrender.com/api'; // Cambia por tu URL real

export const useTrips = (motoristaId = null) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalTrips, setTotalTrips] = useState(0);
  const [proximosDestinos, setProximosDestinos] = useState([]);
  const [historialViajes, setHistorialViajes] = useState([]);
  const [viajesPorDia, setViajesPorDia] = useState([]);

  // Función para formatear fecha a formato legible
  const formatearFecha = (fecha) => {
    const fechaObj = new Date(fecha);
    const hoy = new Date();
    const manana = new Date();
    manana.setDate(hoy.getDate() + 1);

    if (fechaObj.toDateString() === hoy.toDateString()) {
      return 'Hoy';
    } else if (fechaObj.toDateString() === manana.toDateString()) {
      return 'Mañana';
    } else {
      return fechaObj.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }
  };

  // Función para formatear hora
  const formatearHora = (fecha) => {
    return new Date(fecha).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Función para obtener el ícono según el tipo de viaje
  const obtenerIconoViaje = (descripcion) => {
    const desc = descripcion.toLowerCase();
    if (desc.includes('alimento') || desc.includes('comida')) return '🍽️';
    if (desc.includes('mobiliario') || desc.includes('mueble')) return '🏠';
    if (desc.includes('construcción') || desc.includes('material')) return '🏗️';
    if (desc.includes('combustible') || desc.includes('gas')) return '⛽';
    if (desc.includes('medicina') || desc.includes('farmacia')) return '💊';
    return '📦'; // Por defecto
  };

  // Función para obtener color según estado del viaje
  const obtenerColorEstado = (estado) => {
    switch (estado.toLowerCase()) {
      case 'programado': return '#4CAF50';
      case 'pendiente': return '#FF9800';
      case 'confirmado': return '#2196F3';
      case 'en_transito': return '#9C27B0';
      case 'completado': return '#8BC34A';
      case 'cancelado': return '#F44336';
      default: return '#757575';
    }
  };

  // Función para transformar datos de la API al formato del frontend
  const transformarViajeAPI = (viaje, camion = null) => ({
    id: viaje._id,
    tipo: viaje.descripcion || 'Transporte de carga',
    subtitulo: `${viaje.origen} → ${viaje.destino}`,
    fecha: formatearFecha(viaje.fechaSalida),
    hora: formatearHora(viaje.fechaSalida),
    cotizacion: viaje.cliente || 'Cliente no especificado',
    camion: camion?.licensePlate || 'N/A',
    descripcion: viaje.descripcion,
    horaLlegada: viaje.fechaLlegada ? formatearHora(viaje.fechaLlegada) : 'No especificada',
    horaSalida: formatearHora(viaje.fechaSalida),
    asistente: 'Por asignar', // Si tienes este campo en tu modelo, úsalo
    icon: obtenerIconoViaje(viaje.descripcion || ''),
    color: obtenerColorEstado(viaje.estado),
    estado: viaje.estado,
    origen: viaje.origen,
    destino: viaje.destino,
    carga: viaje.carga
  });

  // Función para cargar viajes de un motorista específico
  const cargarViajesMotorista = async (id) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/motoristas/${id}/viajes-programados`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.viajesPorDia && data.viajesPorDia.length > 0) {
        // Procesar viajes por día
        const todosLosViajes = [];
        const proximosDestinos = [];

        data.viajesPorDia.forEach(dia => {
          dia.viajes.forEach(viaje => {
            const viajeTransformado = transformarViajeAPI(viaje, data.camionAsignado);
            todosLosViajes.push(viajeTransformado);

            // Los primeros 3 viajes se consideran próximos destinos
            if (proximosDestinos.length < 3) {
              proximosDestinos.push({
                id: viaje._id,
                tipo: `${viaje.origen} → ${viaje.destino}`,
                fecha: formatearFecha(viaje.fechaSalida),
                hora: formatearHora(viaje.fechaSalida)
              });
            }
          });
        });

        setTrips(todosLosViajes);
        setViajesPorDia(data.viajesPorDia);
        setProximosDestinos(proximosDestinos);
        setTotalTrips(data.totalViajes || todosLosViajes.length);
      } else {
        // No hay viajes programados
        setTrips([]);
        setViajesPorDia([]);
        setProximosDestinos([]);
        setTotalTrips(0);
      }

    } catch (error) {
      console.error('Error al cargar viajes del motorista:', error);
      setError(error.message);
      // Mantener datos mockeados en caso de error para desarrollo
      cargarDatosMock();
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar todos los viajes (vista administrativa)
  const cargarTodosLosViajes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/motoristas/viajes-programados/todos`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.viajesPorDia && data.viajesPorDia.length > 0) {
        const todosLosViajes = [];

        data.viajesPorDia.forEach(dia => {
          dia.motoristasConViajes.forEach(motoristaData => {
            motoristaData.viajes.forEach(viaje => {
              const viajeTransformado = transformarViajeAPI(viaje, motoristaData.camion);
              viajeTransformado.motorista = motoristaData.motorista;
              todosLosViajes.push(viajeTransformado);
            });
          });
        });

        setTrips(todosLosViajes);
        setViajesPorDia(data.viajesPorDia);
        setTotalTrips(data.totalViajes || todosLosViajes.length);
      }

    } catch (error) {
      console.error('Error al cargar todos los viajes:', error);
      setError(error.message);
      cargarDatosMock();
    } finally {
      setLoading(false);
    }
  };

  // Datos mock para desarrollo/fallback
  const cargarDatosMock = () => {
    const mockTrips = [
      {
        id: 1,
        tipo: 'Descarga de alimentos',
        subtitulo: 'Ayutuxtepeque, local 28',
        fecha: 'Hoy',
        hora: '7:30 AM',
        cotizacion: 'Empresas gremiales',
        camion: 'P-438-MLR',
        descripcion: 'Entrega de mercancías a Usulután',
        horaLlegada: '9:00 AM',
        horaSalida: '8:00 PM',
        asistente: 'Laura Sánchez',
        icon: '📦',
        color: '#4CAF50',
        estado: 'programado'
      },
      {
        id: 2,
        tipo: 'Transporte de mobiliario',
        subtitulo: 'Antiguo cuscatlán, ps3, casa 26',
        fecha: 'Mañana',
        hora: '1:30 PM',
        cotizacion: 'Muebles Express',
        camion: 'P-521-XYZ',
        descripcion: 'Transporte de muebles residenciales',
        horaLlegada: '1:00 PM',
        horaSalida: '6:00 PM',
        asistente: 'Carlos Mendoza',
        icon: '🚛',
        color: '#FF9800',
        estado: 'confirmado'
      }
    ];

    const proximosDestinos = [
      { id: 1, tipo: 'Ayutuxtepeque, local 28', fecha: 'Hoy', hora: '7:30 AM' },
      { id: 2, tipo: 'Antiguo Cuscatlán', fecha: 'Mañana', hora: '1:30 PM' },
      { id: 3, tipo: 'San Salvador Centro', fecha: 'Pasado mañana', hora: '9:00 AM' },
    ];

    setTrips(mockTrips);
    setProximosDestinos(proximosDestinos);
    setTotalTrips(23);
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    if (motoristaId) {
      cargarViajesMotorista(motoristaId);
    } else {
      // Si no hay motoristaId específico, usar datos mock o cargar todos
      cargarDatosMock();
    }
  }, [motoristaId]);

  // Función para obtener viaje por ID
  const getTripById = (id) => {
    return trips.find(trip => trip.id === id);
  };

  // Función para refrescar datos
  const refrescarViajes = () => {
    if (motoristaId) {
      cargarViajesMotorista(motoristaId);
    } else {
      cargarTodosLosViajes();
    }
  };

  // Función para obtener viajes de hoy
  const getViajesHoy = () => {
    return trips.filter(trip => trip.fecha === 'Hoy');
  };

  // Función para obtener estadísticas
  const getEstadisticas = () => {
    const viajesTotales = trips.length;
    const viajesHoy = getViajesHoy().length;
    const viajesPendientes = trips.filter(trip => 
      ['programado', 'pendiente'].includes(trip.estado)
    ).length;
    const viajesCompletados = trips.filter(trip => 
      trip.estado === 'completado'
    ).length;

    return {
      total: viajesTotales,
      hoy: viajesHoy,
      pendientes: viajesPendientes,
      completados: viajesCompletados
    };
  };

  return {
    trips,
    loading,
    error,
    totalTrips,
    proximosDestinos,
    historialViajes: trips.slice(-5), // Últimos 5 viajes como historial
    viajesPorDia,
    getTripById,
    setTrips,
    refrescarViajes,
    cargarViajesMotorista,
    cargarTodosLosViajes,
    getViajesHoy,
    getEstadisticas
  };
};