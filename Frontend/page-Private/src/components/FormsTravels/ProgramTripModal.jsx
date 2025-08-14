// FormsTravels/ProgramTripModal.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Truck, User, Package, Calendar, Clock, DollarSign } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);

  // Cargar datos al abrir el modal
  useEffect(() => {
    if (show) {
      cargarRecursos();
    }
  }, [show]);

  const cargarRecursos = async () => {
    setLoading(true);
    try {
      // Cargar camiones, conductores y cotizaciones
      const [camionesRes, conductoresRes, cotizacionesRes] = await Promise.all([
        fetch('/api/camiones'),
        fetch('/api/motoristas'),
        fetch('/api/cotizaciones') // Ajusta esta ruta según tu API
      ]);

      if (camionesRes.ok) {
        const camionesData = await camionesRes.json();
        setCamiones(camionesData.data || camionesData);
      }

      if (conductoresRes.ok) {
        const conductoresData = await conductoresRes.json();
        setConductores(conductoresData.data || conductoresData);
      }

      if (cotizacionesRes.ok) {
        const cotizacionesData = await cotizacionesRes.json();
        setCotizaciones(cotizacionesData.data || cotizacionesData);
      }
    } catch (error) {
      console.error('Error cargando recursos:', error);
    } finally {
      setLoading(false);
    }
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
    { value: 'general', label: 'Carga General' }
  ];

  const nivelesRiesgo = [
    { value: 'normal', label: 'Normal' },
    { value: 'fragil', label: 'Frágil' },
    { value: 'peligroso', label: 'Peligroso' },
    { value: 'especial', label: 'Manejo Especial' }
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

        {loading && (
          <div className="text-center text-gray-600 mb-4">
            Cargando recursos disponibles...
          </div>
        )}

        <form className="space-y-8">
          {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
          <div className="bg-gray-50 p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <Calendar className="mr-2" size={20} />
              Información Básica del Viaje
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Cotización */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cotización (Opcional)
                </label>
                <select
                  value={programForm.quoteId || ''}
                  onChange={(e) => onInputChange('quoteId', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar cotización</option>
                  {cotizaciones.map((cotizacion) => (
                    <option key={cotizacion._id} value={cotizacion._id}>
                      {cotizacion.quoteName || `Cotización ${cotizacion._id.slice(-6)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción del viaje */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción del viaje *
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
            </div>
          </div>

          {/* SECCIÓN 2: UBICACIONES */}
          <div className="bg-blue-50 p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <MapPin className="mr-2" size={20} />
              Ubicaciones de Origen y Destino
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
                    <option value="almacen">Almacén</option>
                    <option value="fabrica">Fábrica</option>
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
                    <option value="almacen">Almacén</option>
                    <option value="fabrica">Fábrica</option>
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
                  Fecha y hora de llegada estimada
                </label>
                <input
                  type="datetime-local"
                  value={programForm.arrivalTime || ''}
                  onChange={(e) => onInputChange('arrivalTime', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  Camión
                </label>
                <select
                  value={programForm.truckId || ''}
                  onChange={(e) => onInputChange('truckId', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar camión</option>
                  {camiones.map((camion) => (
                    <option key={camion._id} value={camion._id}>
                      {camion.brand} {camion.model} - {camion.licensePlate}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conductor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conductor
                </label>
                <select
                  value={programForm.conductorId || ''}
                  onChange={(e) => onInputChange('conductorId', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar conductor</option>
                  {conductores.map((conductor) => (
                    <option key={conductor._id} value={conductor._id}>
                      {conductor.name || conductor.nombre} - {conductor.phone || conductor.telefono}
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
                    peso: { valor: parseFloat(e.target.value), unidad: 'kg' }
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
                    valorDeclarado: { monto: parseFloat(e.target.value), moneda: 'USD' }
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
            </h2>
            
            <textarea
              value={programForm.observaciones || ''}
              onChange={(e) => onInputChange('observaciones', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notas adicionales, instrucciones especiales, etc."
            />
          </div>

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
                'Programar Viaje'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProgramTripModal;