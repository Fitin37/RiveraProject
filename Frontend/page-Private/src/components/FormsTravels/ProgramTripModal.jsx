// FormsTravels/ProgramTripModal.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Truck, User, Package, Calendar, Clock, DollarSign, AlertCircle } from 'lucide-react';

const ProgramTripModal = ({ 
  show, 
  isClosing, 
  onClose, 
  onProgram, 
  programForm, 
  onInputChange 
}) => {
  const [camiones, setCamiones] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar datos al abrir el modal
  useEffect(() => {
    if (show) {
      cargarRecursos();
    }
  }, [show]);

  // 🔄 EFECTO PARA CARGAR COTIZACIÓN SELECCIONADA
  useEffect(() => {
    if (programForm.quoteId && cotizaciones.length > 0) {
      const cotizacion = cotizaciones.find(c => c._id === programForm.quoteId);
      if (cotizacion) {
        setCotizacionSeleccionada(cotizacion);
        llenarDatosDesdeCotizacion(cotizacion);
      }
    }
  }, [programForm.quoteId, cotizaciones]);

  const cargarRecursos = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Iniciando carga de recursos...');

      // 🚛 CARGAR CAMIONES
      try {
        console.log('📦 Cargando camiones...');
        const camionesRes = await fetch('/api/camiones');
        console.log('📦 Respuesta camiones:', camionesRes.status);
        
        if (camionesRes.ok) {
          const camionesText = await camionesRes.text();
          console.log('📦 Texto respuesta camiones:', camionesText.substring(0, 200));
          
          const camionesData = JSON.parse(camionesText);
          const camionesArray = camionesData.data || camionesData || [];
          setCamiones(Array.isArray(camionesArray) ? camionesArray : []);
          console.log('✅ Camiones cargados:', camionesArray.length);
        } else {
          console.warn('⚠️ Error cargando camiones:', camionesRes.status);
        }
      } catch (camionesError) {
        console.error('❌ Error específico con camiones:', camionesError);
      }

      // 👤 CARGAR CONDUCTORES  
      try {
        console.log('👤 Cargando conductores...');
        const conductoresRes = await fetch('/api/motoristas');
        console.log('👤 Respuesta conductores:', conductoresRes.status);
        
        if (conductoresRes.ok) {
          const conductoresText = await conductoresRes.text();
          console.log('👤 Texto respuesta conductores:', conductoresText.substring(0, 200));
          
          const conductoresData = JSON.parse(conductoresText);
          const conductoresArray = conductoresData.data || conductoresData || [];
          setConductores(Array.isArray(conductoresArray) ? conductoresArray : []);
          console.log('✅ Conductores cargados:', conductoresArray.length);
        } else {
          console.warn('⚠️ Error cargando conductores:', conductoresRes.status);
        }
      } catch (conductoresError) {
        console.error('❌ Error específico con conductores:', conductoresError);
      }

      // 📋 CARGAR COTIZACIONES
      try {
        console.log('📋 Cargando cotizaciones...');
        
        // Intentar diferentes rutas posibles
        const rutasPosibles = [
          '/api/cotizaciones',
          '/api/quotes', 
          '/api/quotations',
          '/api/viajes/cotizaciones'
        ];

        let cotizacionesData = null;
        let rutaExitosa = null;

        for (const ruta of rutasPosibles) {
          try {
            console.log(`📋 Intentando ruta: ${ruta}`);
            const cotizacionesRes = await fetch(ruta);
            console.log(`📋 Respuesta ${ruta}:`, cotizacionesRes.status);
            
            if (cotizacionesRes.ok) {
              const cotizacionesText = await cotizacionesRes.text();
              console.log(`📋 Texto respuesta ${ruta}:`, cotizacionesText.substring(0, 200));
              
              cotizacionesData = JSON.parse(cotizacionesText);
              rutaExitosa = ruta;
              break;
            }
          } catch (err) {
            console.log(`❌ Falló ruta ${ruta}:`, err.message);
          }
        }

        if (cotizacionesData && rutaExitosa) {
          const cotizacionesArray = cotizacionesData.data || cotizacionesData || [];
          // Filtrar solo cotizaciones aceptadas que no estén ejecutadas
          const cotizacionesDisponibles = Array.isArray(cotizacionesArray) 
            ? cotizacionesArray.filter(c => 
                c.status === 'aceptada' || 
                c.status === 'pendiente' || 
                c.status === 'enviada'
              )
            : [];
          
          setCotizaciones(cotizacionesDisponibles);
          console.log('✅ Cotizaciones cargadas desde:', rutaExitosa, 'Total:', cotizacionesDisponibles.length);
        } else {
          console.warn('⚠️ No se pudieron cargar cotizaciones desde ninguna ruta');
          setCotizaciones([]);
        }
      } catch (cotizacionesError) {
        console.error('❌ Error específico con cotizaciones:', cotizacionesError);
        setCotizaciones([]);
      }

    } catch (error) {
      console.error('❌ Error general cargando recursos:', error);
      setError('Error cargando recursos. Verifique la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // 🎯 FUNCIÓN PARA LLENAR DATOS DESDE COTIZACIÓN
  const llenarDatosDesdeCotizacion = (cotizacion) => {
    console.log('🔄 Llenando datos desde cotización:', cotizacion);

    try {
      // 📝 Descripción del viaje
      if (cotizacion.quoteDescription) {
        onInputChange('tripDescription', cotizacion.quoteDescription);
      }

      // 📍 ORIGEN - desde cotizacion.ruta.origen
      if (cotizacion.ruta?.origen) {
        const origen = {
          nombre: cotizacion.ruta.origen.nombre || '',
          lat: cotizacion.ruta.origen.coordenadas?.lat || '',
          lng: cotizacion.ruta.origen.coordenadas?.lng || '',
          tipo: cotizacion.ruta.origen.tipo || 'ciudad'
        };
        onInputChange('origen', origen);
      }

      // 🎯 DESTINO - desde cotizacion.ruta.destino
      if (cotizacion.ruta?.destino) {
        const destino = {
          nombre: cotizacion.ruta.destino.nombre || '',
          lat: cotizacion.ruta.destino.coordenadas?.lat || '',
          lng: cotizacion.ruta.destino.coordenadas?.lng || '',
          tipo: cotizacion.ruta.destino.tipo || 'ciudad'
        };
        onInputChange('destino', destino);
      }

      // ⏰ HORARIOS - desde cotización.horarios
      if (cotizacion.horarios?.fechaSalida) {
        const fechaSalida = new Date(cotizacion.horarios.fechaSalida);
        onInputChange('departureTime', fechaSalida.toISOString().slice(0, 16));
      }

      if (cotizacion.horarios?.fechaLlegadaEstimada) {
        const fechaLlegada = new Date(cotizacion.horarios.fechaLlegadaEstimada);
        onInputChange('arrivalTime', fechaLlegada.toISOString().slice(0, 16));
      }

      // 📦 CARGA - desde cotización.carga
      if (cotizacion.carga) {
        const carga = {
          descripcion: cotizacion.carga.descripcion || '',
          categoria: cotizacion.carga.categoria || 'general',
          peso: {
            valor: cotizacion.carga.peso?.valor || '',
            unidad: cotizacion.carga.peso?.unidad || 'kg'
          },
          clasificacionRiesgo: cotizacion.carga.clasificacionRiesgo || 'normal',
          valorDeclarado: {
            monto: cotizacion.carga.valorDeclarado?.monto || '',
            moneda: cotizacion.carga.valorDeclarado?.moneda || 'USD'
          }
        };
        onInputChange('carga', carga);
      }

      // 📝 OBSERVACIONES - desde cotización.observaciones
      if (cotizacion.observaciones) {
        onInputChange('observaciones', cotizacion.observaciones);
      }

      console.log('✅ Datos llenados desde cotización exitosamente');
    } catch (error) {
      console.error('❌ Error llenando datos desde cotización:', error);
    }
  };

  // 🔄 MANEJAR CAMBIO DE COTIZACIÓN
  const handleCotizacionChange = (cotizacionId) => {
    onInputChange('quoteId', cotizacionId);
    
    if (cotizacionId) {
      const cotizacion = cotizaciones.find(c => c._id === cotizacionId);
      if (cotizacion) {
        setCotizacionSeleccionada(cotizacion);
        llenarDatosDesdeCotizacion(cotizacion);
      }
    } else {
      setCotizacionSeleccionada(null);
      // Limpiar formulario si se deselecciona la cotización
      limpiarFormulario();
    }
  };

  // 🧹 FUNCIÓN PARA LIMPIAR FORMULARIO
  const limpiarFormulario = () => {
    onInputChange('tripDescription', '');
    onInputChange('origen', {});
    onInputChange('destino', {});
    onInputChange('departureTime', '');
    onInputChange('arrivalTime', '');
    onInputChange('carga', {});
    onInputChange('observaciones', '');
  };

  const categoriasCarga = [
    { value: 'alimentos_perecederos', label: 'Alimentos Perecederos' },
    { value: 'alimentos_no_perecederos', label: 'Alimentos No Perecederos' },
    { value: 'materiales_construccion', label: 'Materiales de Construcción' },
    { value: 'electronicos', label: 'Electrónicos' },
    { value: 'maquinaria', label: 'Maquinaria y Equipos' },
    { value: 'textiles', label: 'Textiles' },
    { value: 'quimicos', label: 'Productos Químicos' },
    { value: 'medicamentos', label: 'Medicamentos' },
    { value: 'vehiculos', label: 'Vehículos' },
    { value: 'productos_agricolas', label: 'Productos Agrícolas' },
    { value: 'general', label: 'Carga General' },
    { value: 'otros', label: 'Otros' }
  ];

  const nivelesRiesgo = [
    { value: 'normal', label: 'Normal' },
    { value: 'fragil', label: 'Frágil' },
    { value: 'peligroso', label: 'Peligroso' },
    { value: 'perecedero', label: 'Perecedero' },
    { value: 'biologico', label: 'Biológico' }
  ];

  const prioridades = [
    { value: 'baja', label: 'Baja' },
    { value: 'normal', label: 'Normal' },
    { value: 'media', label: 'Media' },
    { value: 'alta', label: 'Alta' },
    { value: 'urgente', label: 'Urgente' }
  ];

  if (!show) return null;

  return (
    <div 
      className={`fixed inset-0 bg-gray-800 z-50 transition-all duration-300 ease-out overflow-y-auto ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Header oscuro */}
      <div className="bg-gray-800 text-white p-4 flex items-center sticky top-0 z-10">
        <button 
          onClick={onClose}
          className="flex items-center text-white hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          <span className="text-sm font-medium">Volver al menú principal</span>
        </button>
      </div>

      {/* Contenido del modal */}
      <div className="bg-white rounded-t-3xl mt-4 mx-4 mb-4 p-8 min-h-[calc(100vh-6rem)] relative">
        {/* Header del formulario */}
        <div className="flex items-center mb-8">
          <h1 className="text-3xl font-normal text-black mr-6">Programar viaje</h1>
          <div className="relative">
            <div className="w-16 h-16 border-4 border-black rounded-lg flex flex-col justify-center items-center bg-white">
              <div className="grid grid-cols-3 gap-1.5 mb-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-black rounded-full"></div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-full relative">
                <div className="absolute top-0.5 left-1/2 w-0.5 h-1.5 bg-white transform -translate-x-1/2"></div>
                <div className="absolute top-1/2 left-0.5 w-1 h-0.5 bg-white transform -translate-y-1/2"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Mensaje de carga */}
        {loading && (
          <div className="text-center text-blue-600 mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Cargando recursos disponibles...
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="text-center text-red-600 mb-4 p-4 bg-red-50 rounded-lg border border-red-200 flex items-center">
            <AlertCircle className="mr-2" size={20} />
            {error}
            <button 
              onClick={cargarRecursos}
              className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Información de debug */}
        <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-50 rounded">
          📊 Estado: Camiones: {camiones.length} | Conductores: {conductores.length} | Cotizaciones: {cotizaciones.length}
        </div>

        <form className="space-y-8">
          {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <Calendar className="mr-2" size={20} />
              Información Básica del Viaje
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Cotización */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cotización (Auto-llena el formulario) 
                  <span className="text-blue-600 text-xs ml-1">✨ Recomendado</span>
                </label>
                <select
                  value={programForm.quoteId || ''}
                  onChange={(e) => handleCotizacionChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="">🔄 Seleccionar cotización para auto-llenar</option>
                  {cotizaciones.length === 0 && !loading && (
                    <option value="" disabled>No hay cotizaciones disponibles</option>
                  )}
                  {cotizaciones.map((cotizacion) => (
                    <option key={cotizacion._id} value={cotizacion._id}>
                      📋 {cotizacion.quoteName || `Cotización ${cotizacion._id.slice(-6)}`} 
                      {cotizacion.ruta && ` - ${cotizacion.ruta.origen?.nombre} → ${cotizacion.ruta.destino?.nombre}`}
                      {cotizacion.price && ` ($${cotizacion.price})`}
                    </option>
                  ))}
                </select>
                
                {/* Información de la cotización seleccionada */}
                {cotizacionSeleccionada && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-800">
                      <p><strong>Cliente:</strong> {cotizacionSeleccionada.clientId?.nombre || 'No especificado'}</p>
                      <p><strong>Ruta:</strong> {cotizacionSeleccionada.ruta?.origen?.nombre} → {cotizacionSeleccionada.ruta?.destino?.nombre}</p>
                      <p><strong>Carga:</strong> {cotizacionSeleccionada.carga?.descripcion}</p>
                      <p><strong>Precio:</strong> ${cotizacionSeleccionada.price} {cotizacionSeleccionada.costos?.moneda || 'USD'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridad
                </label>
                <select
                  value={programForm.prioridad || 'normal'}
                  onChange={(e) => onInputChange('prioridad', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {prioridades.map((prioridad) => (
                    <option key={prioridad.value} value={prioridad.value}>
                      {prioridad.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción del viaje */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción del viaje *
                  {cotizacionSeleccionada && <span className="text-green-600 text-xs ml-1">✅ Auto-llenado</span>}
                </label>
                <input
                  type="text"
                  value={programForm.tripDescription || ''}
                  onChange={(e) => onInputChange('tripDescription', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Entrega de productos electrónicos"
                  required
                />
              </div>
            </div>
          </div>

          {/* Resto de las secciones permanecen igual... */}
          {/* SECCIÓN 2: UBICACIONES */}
          <div className="bg-blue-50 p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <MapPin className="mr-2" size={20} />
              Ubicaciones de Origen y Destino
              {cotizacionSeleccionada && <span className="text-green-600 text-sm ml-2">✅ Auto-llenado desde cotización</span>}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* ORIGEN */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700">📍 Origen</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="text"
                    value={programForm.origen?.nombre || ''}
                    onChange={(e) => onInputChange('origen', { ...programForm.origen, nombre: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del lugar de origen *"
                    required
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      step="any"
                      value={programForm.origen?.lat || ''}
                      onChange={(e) => onInputChange('origen', { ...programForm.origen, lat: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Latitud *"
                      required
                    />
                    <input
                      type="number"
                      step="any"
                      value={programForm.origen?.lng || ''}
                      onChange={(e) => onInputChange('origen', { ...programForm.origen, lng: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Longitud *"
                      required
                    />
                  </div>
                  
                  <select
                    value={programForm.origen?.tipo || 'ciudad'}
                    onChange={(e) => onInputChange('origen', { ...programForm.origen, tipo: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ciudad">Ciudad</option>
                    <option value="terminal">Terminal</option>
                    <option value="puerto">Puerto</option>
                    <option value="bodega">Bodega</option>
                    <option value="cliente">Cliente</option>
                  </select>
                </div>
              </div>

              {/* DESTINO */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700">🎯 Destino</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="text"
                    value={programForm.destino?.nombre || ''}
                    onChange={(e) => onInputChange('destino', { ...programForm.destino, nombre: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del lugar de destino *"
                    required
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      step="any"
                      value={programForm.destino?.lat || ''}
                      onChange={(e) => onInputChange('destino', { ...programForm.destino, lat: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Latitud *"
                      required
                    />
                    <input
                      type="number"
                      step="any"
                      value={programForm.destino?.lng || ''}
                      onChange={(e) => onInputChange('destino', { ...programForm.destino, lng: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Longitud *"
                      required
                    />
                  </div>
                  
                  <select
                    value={programForm.destino?.tipo || 'ciudad'}
                    onChange={(e) => onInputChange('destino', { ...programForm.destino, tipo: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ciudad">Ciudad</option>
                    <option value="terminal">Terminal</option>
                    <option value="puerto">Puerto</option>
                    <option value="bodega">Bodega</option>
                    <option value="cliente">Cliente</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: HORARIOS */}
          <div className="bg-green-50 p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <Clock className="mr-2" size={20} />
              Programación de Horarios
              {cotizacionSeleccionada && <span className="text-green-600 text-sm ml-2">✅ Auto-llenado desde cotización</span>}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fecha y hora de salida */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha y hora de salida *
                </label>
                <input
                  type="datetime-local"
                  value={programForm.departureTime || ''}
                  onChange={(e) => onInputChange('departureTime', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Fecha y hora de llegada estimada */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha y hora de llegada estimada *
                </label>
                <input
                  type="datetime-local"
                  value={programForm.arrivalTime || ''}
                  onChange={(e) => onInputChange('arrivalTime', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: RECURSOS */}
          <div className="bg-purple-50 p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <Truck className="mr-2" size={20} />
              Asignación de Recursos
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Camión */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Camión *
                </label>
                <select
                  value={programForm.truckId || ''}
                  onChange={(e) => onInputChange('truckId', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                >
                  <option value="">Seleccionar camión</option>
                  {camiones.length === 0 && !loading && (
                    <option value="" disabled>No hay camiones disponibles</option>
                  )}
                  {camiones.map((camion) => (
                    <option key={camion._id} value={camion._id}>
                      🚛 {camion.brand} {camion.model} - {camion.licensePlate}
                      {camion.state && ` (${camion.state})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conductor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conductor *
                </label>
                <select
                  value={programForm.conductorId || ''}
                  onChange={(e) => onInputChange('conductorId', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                >
                  <option value="">Seleccionar conductor</option>
                  {conductores.length === 0 && !loading && (
                    <option value="" disabled>No hay conductores disponibles</option>
                  )}
                  {conductores.map((conductor) => (
                    <option key={conductor._id} value={conductor._id}>
                      👤 {conductor.name || conductor.nombre} - {conductor.phone || conductor.telefono}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 5: INFORMACIÓN DE CARGA */}
          <div className="bg-yellow-50 p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <Package className="mr-2" size={20} />
              Información de la Carga
              {cotizacionSeleccionada && <span className="text-green-600 text-sm ml-2">✅ Auto-llenado desde cotización</span>}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Descripción de carga */}
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción de la carga *
                </label>
                <textarea
                  value={programForm.carga?.descripcion || ''}
                  onChange={(e) => onInputChange('carga', { 
                    ...programForm.carga, 
                    descripcion: e.target.value 
                  })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe la carga a transportar"
                  required
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría de carga
                </label>
                <select
                  value={programForm.carga?.categoria || 'general'}
                  onChange={(e) => onInputChange('carga', { 
                    ...programForm.carga, 
                    categoria: e.target.value 
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categoriasCarga.map((categoria) => (
                    <option key={categoria.value} value={categoria.value}>
                      {categoria.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Peso */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  value={programForm.carga?.peso?.valor || ''}
                  onChange={(e) => onInputChange('carga', { 
                    ...programForm.carga, 
                    peso: { valor: parseFloat(e.target.value) || '', unidad: 'kg' }
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Peso en kilogramos"
                />
              </div>

              {/* Clasificación de riesgo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel de riesgo
                </label>
                <select
                  value={programForm.carga?.clasificacionRiesgo || 'normal'}
                  onChange={(e) => onInputChange('carga', { 
                    ...programForm.carga, 
                    clasificacionRiesgo: e.target.value 
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {nivelesRiesgo.map((riesgo) => (
                    <option key={riesgo.value} value={riesgo.value}>
                      {riesgo.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor declarado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor declarado (USD)
                </label>
                <input
                  type="number"
                  value={programForm.carga?.valorDeclarado?.monto || ''}
                  onChange={(e) => onInputChange('carga', { 
                    ...programForm.carga, 
                    valorDeclarado: { monto: parseFloat(e.target.value) || '', moneda: 'USD' }
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Valor en dólares"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 6: OBSERVACIONES */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              📝 Observaciones Adicionales
              {cotizacionSeleccionada && <span className="text-green-600 text-sm ml-2">✅ Auto-llenado desde cotización</span>}
            </h2>
            
            <textarea
              value={programForm.observaciones || ''}
              onChange={(e) => onInputChange('observaciones', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notas adicionales, instrucciones especiales, etc."
            />
          </div>

          {/* SECCIÓN 7: RESUMEN DE COTIZACIÓN (Solo si hay cotización seleccionada) */}
          {cotizacionSeleccionada && (
            <div className="bg-green-100 border-2 border-green-300 p-6 rounded-xl">
              <h2 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                <DollarSign className="mr-2" size={20} />
                📋 Resumen de Cotización Seleccionada
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-700">Cliente:</p>
                  <p className="text-gray-700">{cotizacionSeleccionada.clientId?.nombre || 'No especificado'}</p>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-700">Precio Total:</p>
                  <p className="text-gray-700 text-lg font-bold">
                    ${cotizacionSeleccionada.price} {cotizacionSeleccionada.costos?.moneda || 'USD'}
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-700">Distancia:</p>
                  <p className="text-gray-700">
                    {cotizacionSeleccionada.ruta?.distanciaTotal ? `${cotizacionSeleccionada.ruta.distanciaTotal} km` : 'No especificado'}
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-700">Tiempo Estimado:</p>
                  <p className="text-gray-700">
                    {cotizacionSeleccionada.ruta?.tiempoEstimado ? `${cotizacionSeleccionada.ruta.tiempoEstimado} horas` : 'No especificado'}
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-700">Tipo de Carga:</p>
                  <p className="text-gray-700">{cotizacionSeleccionada.truckType || 'No especificado'}</p>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-700">Estado:</p>
                  <p className="text-gray-700 capitalize">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      cotizacionSeleccionada.status === 'aceptada' ? 'bg-green-200 text-green-800' :
                      cotizacionSeleccionada.status === 'pendiente' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {cotizacionSeleccionada.status}
                    </span>
                  </p>
                </div>
              </div>
              
              {/* Desglose de costos si está disponible */}
              {cotizacionSeleccionada.costos && (
                <div className="mt-4">
                  <h3 className="font-semibold text-green-700 mb-2">💰 Desglose de Costos:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2 rounded border border-green-200">
                      <p className="font-medium">Combustible:</p>
                      <p>${cotizacionSeleccionada.costos.combustible || 0}</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-green-200">
                      <p className="font-medium">Peajes:</p>
                      <p>${cotizacionSeleccionada.costos.peajes || 0}</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-green-200">
                      <p className="font-medium">Conductor:</p>
                      <p>${cotizacionSeleccionada.costos.conductor || 0}</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-green-200">
                      <p className="font-medium">Otros:</p>
                      <p>${cotizacionSeleccionada.costos.otros || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-center space-x-4 pt-6">
            <button 
              type="button"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white py-3 px-8 rounded-lg font-medium transition-all duration-200"
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={onProgram}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-8 rounded-lg font-medium transition-all duration-200 hover:scale-105 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  🚛 Programar Viaje
                  {cotizacionSeleccionada && <span className="ml-2 text-xs">(Desde Cotización)</span>}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProgramTripModal;