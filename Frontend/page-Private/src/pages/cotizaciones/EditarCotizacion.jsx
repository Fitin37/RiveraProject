import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, DollarSign } from 'lucide-react';
import { useCotizaciones } from '../../components/Cotizaciones/hook/useCotizaciones'; // Ajusta la ruta según tu estructura

export default function EditarCotizacionForm({ cotizacionId, cotizacion: cotizacionProp, onVolver }) {
  // Tu hook original
  const {
    cotizaciones,
    actualizarCotizacionAPI,
    actualizarEstadoCotizacion,
    loading: hookLoading,
    error,
    showSweetAlert,
    closeSweetAlert
  } = useCotizaciones();
  // Estado simple y directo
  const [precios, setPrecios] = useState({
    price: '',
    combustible: '',
    peajes: '',
    conductor: '',
    otros: '',
    impuestos: ''
  });

  const [datosOriginales, setDatosOriginales] = useState({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Cargar datos iniciales - integrado con tu hook
  useEffect(() => {
    console.log('🔍 useEffect ejecutado:', { 
      cotizacionId, 
      cotizacionProp: !!cotizacionProp,
      cantidadCotizaciones: cotizaciones.length,
      hookLoading
    });

    // Si ya tenemos la cotización como prop, usarla directamente
    if (cotizacionProp) {
      console.log('📋 Usando cotización proporcionada como prop');
      cargarPrecios(cotizacionProp);
      setDatosOriginales(cotizacionProp);
      setLoading(false);
      return;
    }

    // Si tenemos ID y cotizaciones están cargadas, buscar por ID
    if (cotizacionId && cotizaciones.length > 0 && !hookLoading) {
      console.log('🔍 Buscando cotización por ID:', cotizacionId);
      
      const cotizacion = cotizaciones.find(c => {
        const currentId = c.id || c._id;
        console.log('🔍 Comparando:', currentId, 'con', cotizacionId);
        return currentId === cotizacionId;
      });
      
      if (cotizacion) {
        console.log('✅ Cotización encontrada:', cotizacion);
        cargarPrecios(cotizacion);
        setDatosOriginales(cotizacion);
        setLoading(false);
      } else {
        console.error('❌ No se encontró cotización con ID:', cotizacionId);
        console.log('📋 IDs disponibles:', cotizaciones.map(c => c.id || c._id));
        setLoading(false);
      }
    }
  }, [cotizacionId, cotizacionProp, cotizaciones, hookLoading]);

  // Función para cargar precios desde una cotización
  const cargarPrecios = (cotizacion) => {
    console.log('📝 Cargando precios desde cotización:', cotizacion);
    
    const nuevosPrecios = {
      price: String(cotizacion.price || '0'),
      combustible: String(cotizacion.costos?.combustible || '0'),
      peajes: String(cotizacion.costos?.peajes || '0'),
      conductor: String(cotizacion.costos?.conductor || '0'),
      otros: String(cotizacion.costos?.otros || '0'),
      impuestos: String(cotizacion.costos?.impuestos || '0')
    };
    
    setPrecios(nuevosPrecios);
    console.log('✅ Precios cargados:', nuevosPrecios);
  };

  // Función para cambiar estado usando tu hook
  const cambiarEstado = (nuevoEstado) => {
    if (!datosOriginales) return;
    actualizarEstadoCotizacion(datosOriginales, nuevoEstado);
  };

  // Función súper simple para cambiar valores
  const cambiarPrecio = (campo, valor) => {
    console.log(`🔄 Cambiando ${campo} a: "${valor}"`);
    
    setPrecios(prev => {
      const nuevo = { ...prev, [campo]: valor };
      console.log('✅ Nuevo estado precios:', nuevo);
      return nuevo;
    });
  };

  // Calcular totales
  const calcularTotales = () => {
    const nums = {
      combustible: parseFloat(precios.combustible) || 0,
      peajes: parseFloat(precios.peajes) || 0,
      conductor: parseFloat(precios.conductor) || 0,
      otros: parseFloat(precios.otros) || 0,
      impuestos: parseFloat(precios.impuestos) || 0
    };
    
    const subtotal = nums.combustible + nums.peajes + nums.conductor + nums.otros;
    const total = subtotal + nums.impuestos;
    
    return { subtotal, total };
  };

  // Guardar cambios usando tu hook
  const guardarCambios = async () => {
    if (!datosOriginales || !datosOriginales.id && !datosOriginales._id) {
      showSweetAlert({
        title: 'Error',
        text: 'No se puede guardar: datos de cotización no válidos',
        type: 'error',
        onConfirm: closeSweetAlert
      });
      return;
    }

    setGuardando(true);
    setMensaje('Guardando cambios...');
    
    try {
      const { subtotal, total } = calcularTotales();
      
      const datosParaGuardar = {
        price: parseFloat(precios.price) || 0,
        costos: {
          combustible: parseFloat(precios.combustible) || 0,
          peajes: parseFloat(precios.peajes) || 0,
          conductor: parseFloat(precios.conductor) || 0,
          otros: parseFloat(precios.otros) || 0,
          impuestos: parseFloat(precios.impuestos) || 0,
          subtotal: subtotal,
          total: total,
          moneda: datosOriginales.costos?.moneda || 'USD'
        }
      };
      
      console.log('💾 Datos a guardar:', datosParaGuardar);
      console.log('🆔 ID de cotización:', datosOriginales.id || datosOriginales._id);
      
      // Usar tu función del hook
      const resultado = await actualizarCotizacionAPI(
        datosOriginales.id || datosOriginales._id, 
        datosParaGuardar
      );
      
      if (resultado.success) {
        setMensaje('¡Guardado exitosamente!');
        showSweetAlert({
          title: '¡Guardado!',
          text: 'Los costos han sido actualizados correctamente.',
          type: 'success',
          onConfirm: closeSweetAlert
        });
        
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setMensaje(''), 3000);
      } else {
        setMensaje('Error al guardar');
        showSweetAlert({
          title: 'Error',
          text: resultado.message || 'No se pudieron guardar los cambios',
          type: 'error',
          onConfirm: closeSweetAlert
        });
      }
      
    } catch (error) {
      console.error('Error guardando:', error);
      setMensaje('Error al guardar');
      showSweetAlert({
        title: 'Error',
        text: 'Ocurrió un error al guardar los cambios.',
        type: 'error',
        onConfirm: closeSweetAlert
      });
    } finally {
      setGuardando(false);
    }
  };

  if (loading || hookLoading) {
    return (
      <div className="min-h-screen bg-gray-800 p-6 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p>{hookLoading ? 'Cargando cotizaciones...' : 'Buscando cotización...'}</p>
          {cotizacionId && <p className="text-sm text-gray-400 mt-2">ID: {cotizacionId}</p>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-800 p-6 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-red-400 text-xl mb-4">⚠️ Error</div>
          <p className="mb-4">{error}</p>
          <button 
            onClick={onVolver}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!datosOriginales || Object.keys(datosOriginales).length === 0) {
    return (
      <div className="min-h-screen bg-gray-800 p-6 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-yellow-400 text-xl mb-4">⚠️</div>
          <p className="mb-4">No se encontraron datos de la cotización</p>
          <button 
            onClick={onVolver}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const { subtotal, total } = calcularTotales();

  return (
    <div className="min-h-screen bg-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 text-white"
          onClick={onVolver}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-lg font-medium">Editar Costos</span>
        </div>
        
        {mensaje && (
          <div className={`px-4 py-2 rounded text-white ${
            mensaje.includes('Error') ? 'bg-red-500' : 
            mensaje.includes('exitosamente') ? 'bg-green-500' : 'bg-blue-500'
          }`}>
            {mensaje}
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <DollarSign className="w-8 h-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Editar Precios y Costos
            </h1>
            <p className="text-gray-600">
              Cotización: {datosOriginales.numeroDetizacion || 'N/A'}
            </p>
          </div>
        </div>

        {/* Información del cliente (solo lectura) */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Información del Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Cliente:</span>
              <span className="ml-2">
                {datosOriginales.clienteFirstName} {datosOriginales.clienteLastName}
                {!datosOriginales.clienteFirstName && datosOriginales.cliente}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Email:</span>
              <span className="ml-2">{datosOriginales.email || 'No especificado'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Teléfono:</span>
              <span className="ml-2">{datosOriginales.telefono || 'No especificado'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Estado:</span>
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                {datosOriginales.status || 'pendiente'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Origen:</span>
              <span className="ml-2">{datosOriginales.origen || datosOriginales.lugarOrigen || 'No especificado'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Destino:</span>
              <span className="ml-2">{datosOriginales.destino || datosOriginales.lugarDestino || 'No especificado'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Tipo de camión:</span>
              <span className="ml-2">{datosOriginales.truckType || datosOriginales.tipoVehiculo || 'No especificado'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Método de pago:</span>
              <span className="ml-2">{datosOriginales.paymentMethod || datosOriginales.metodoPago || 'No especificado'}</span>
            </div>
          </div>
          
          {datosOriginales.quoteDescription && (
            <div className="mt-4">
              <span className="font-medium text-gray-600">Descripción:</span>
              <p className="mt-1 text-gray-700 bg-white p-3 rounded border">
                {datosOriginales.quoteDescription || datosOriginales.descripcion}
              </p>
            </div>
          )}
        </div>

        {/* Campos editables de precios */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-6 text-gray-800 flex items-center gap-2">
            <span className="text-green-600">💰</span>
            Precios y Costos (Editables)
          </h2>
          
          <div className="space-y-6">
            {/* Precio principal */}
            <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💲 Precio Principal
              </label>
              <input
                type="text"
                value={precios.price}
                onChange={(e) => cambiarPrecio('price', e.target.value)}
                placeholder="Ingresa el precio principal"
                className="w-full px-4 py-3 border border-gray-300 rounded-md text-lg font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Valor actual: ${parseFloat(precios.price) || 0}</p>
            </div>

            {/* Desglose de costos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ⛽ Combustible
                </label>
                <input
                  type="text"
                  value={precios.combustible}
                  onChange={(e) => cambiarPrecio('combustible', e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🛣️ Peajes
                </label>
                <input
                  type="text"
                  value={precios.peajes}
                  onChange={(e) => cambiarPrecio('peajes', e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👨‍💼 Conductor
                </label>
                <input
                  type="text"
                  value={precios.conductor}
                  onChange={(e) => cambiarPrecio('conductor', e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📋 Otros Gastos
                </label>
                <input
                  type="text"
                  value={precios.otros}
                  onChange={(e) => cambiarPrecio('otros', e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏛️ Impuestos
                </label>
                <input
                  type="text"
                  value={precios.impuestos}
                  onChange={(e) => cambiarPrecio('impuestos', e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Totales */}
        <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">📊 Resumen de Totales</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal (sin impuestos):</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold text-blue-600 border-t pt-2">
              <span>Total Final:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Cambio de estado */}
        <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">🔄 Cambiar Estado de la Cotización</h3>
          <div className="flex flex-wrap gap-3">
            {datosOriginales.status === 'pendiente' && (
              <button
                onClick={() => cambiarEstado('enviada')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Marcar como Enviada
              </button>
            )}
            
            {datosOriginales.status === 'enviada' && (
              <>
                <button
                  onClick={() => cambiarEstado('aceptada')}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  Marcar como Aceptada
                </button>
                <button
                  onClick={() => cambiarEstado('rechazada')}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                >
                  Marcar como Rechazada
                </button>
              </>
            )}
            
            {datosOriginales.status === 'aceptada' && (
              <button
                onClick={() => cambiarEstado('ejecutada')}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
              >
                Marcar como Ejecutada
              </button>
            )}
            
            {datosOriginales.status !== 'cancelada' && datosOriginales.status !== 'ejecutada' && (
              <button
                onClick={() => cambiarEstado('cancelada')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Botón guardar */}
        <div className="flex justify-end">
          <button
            onClick={guardarCambios}
            disabled={guardando}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Save className="w-4 h-4" />
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

        {/* Debug info */}
        <div className="mt-8 p-4 bg-gray-100 rounded border text-xs">
          <h4 className="font-medium mb-2">🐛 Estado actual (debug):</h4>
          <pre className="text-gray-600 overflow-x-auto">
{JSON.stringify(precios, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}