import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Calendar, ChevronLeft, ChevronRight, ChevronDown, Upload, X } from 'lucide-react';
import Swal from 'sweetalert2';

const AddMotoristaForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '', // Solo para mostrar, no se envía al backend
    id: '', // Campo DUI según el modelo
    birthDate: '',
    password: '',
    phone: '',
    address: '',
    circulationCard: '', // Tarjeta de circulación según el modelo
    img: null // Campo para la imagen
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showYearSelector, setShowYearSelector] = useState(false);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Configuración personalizada de SweetAlert2
  const showSuccessAlert = () => {
    Swal.fire({
      title: '¡Motorista agregado con éxito!',
      text: 'Motorista agregado correctamente',
      icon: 'success',
      confirmButtonText: 'Continuar',
      confirmButtonColor: '#22c55e',
      allowOutsideClick: false,
      customClass: {
        popup: 'animated bounceIn'
      }
    }).then((result) => {
      // Cuando el usuario hace clic en "Continuar"
      if (result.isConfirmed) {
        handleBackToMenu(); // Volver a la pantalla anterior
      }
    });
  };

  const showErrorAlert = (message) => {
    Swal.fire({
      title: 'Error al agregar motorista',
      text: message || 'Hubo un error al procesar la solicitud',
      icon: 'error',
      confirmButtonText: 'Intentar de nuevo',
      confirmButtonColor: '#ef4444',
      allowOutsideClick: false,
      customClass: {
        popup: 'animated shakeX'
      }
    });
  };

  const showLoadingAlert = () => {
    Swal.fire({
      title: 'Agregando motorista...',
      text: 'Por favor espera mientras procesamos la información',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  };

  // Generar email automáticamente cuando cambien nombre o apellido
  useEffect(() => {
    if (formData.name && formData.lastName) {
      const emailGenerated = `${formData.name.toLowerCase()}.${formData.lastName.toLowerCase()}@rivera.com`;
      setFormData(prev => ({
        ...prev,
        email: emailGenerated
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        email: ''
      }));
    }
  }, [formData.name, formData.lastName]);

  // Manejar la selección de imagen
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        Swal.fire({
          title: 'Formato no válido',
          text: 'Por favor selecciona una imagen en formato JPG, PNG o GIF',
          icon: 'warning',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#f59e0b'
        });
        return;
      }

      // Validar tamaño (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        Swal.fire({
          title: 'Archivo muy grande',
          text: 'La imagen debe ser menor a 5MB',
          icon: 'warning',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#f59e0b'
        });
        return;
      }

      setFormData(prev => ({
        ...prev,
        img: file
      }));

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remover imagen
  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      img: null
    }));
    setImagePreview(null);
    // Limpiar el input
    const fileInput = document.getElementById('image-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setFormData(prev => ({
      ...prev,
      birthDate: formatDate(date)
    }));
    setShowCalendar(false);
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const navigateYear = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(newDate.getFullYear() + direction);
      return newDate;
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // No permitir editar el email ya que se genera automáticamente
    if (name === 'email') {
      return;
    }

    // Validación y formateo de teléfono
    if (name === 'phone') {
      const numbers = value.replace(/\D/g, '');
      if (numbers.length > 4) {
        formattedValue = numbers.slice(0, 4) + '-' + numbers.slice(4, 8);
      } else {
        formattedValue = numbers;
      }
    }

    // Validación y formateo de DUI
    if (name === 'id') {
      const numbers = value.replace(/\D/g, '');
      if (numbers.length > 8) {
        formattedValue = numbers.slice(0, 8) + '-' + numbers.slice(8, 9);
      } else {
        formattedValue = numbers;
      }
    }

    // Validación y formateo de tarjeta de circulación
    if (name === 'circulationCard') {
      // Permitir letras, números y guiones, eliminar caracteres especiales
      formattedValue = value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "El nombre es obligatorio";
    if (!formData.lastName) newErrors.lastName = "El apellido es obligatorio";
    if (!formData.id) newErrors.id = "El DUI es obligatorio";
    if (formData.id && formData.id.replace(/\D/g, '').length !== 9) {
      newErrors.id = "El DUI debe tener exactamente 9 dígitos";
    }
    if (!formData.birthDate) newErrors.birthDate = "La fecha de nacimiento es obligatoria";
    if (!formData.password) newErrors.password = "La contraseña es obligatoria";
    if (!formData.phone) newErrors.phone = "El teléfono es obligatorio";
    if (formData.phone && formData.phone.replace(/\D/g, '').length !== 8) {
      newErrors.phone = "El teléfono debe tener exactamente 8 dígitos";
    }
    if (!formData.address) newErrors.address = "La dirección es obligatoria";
    if (!formData.circulationCard) newErrors.circulationCard = "La tarjeta de circulación es obligatoria";
    if (formData.circulationCard && formData.circulationCard.length < 3) {
      newErrors.circulationCard = "La tarjeta de circulación debe tener al menos 3 caracteres";
    }
    // La imagen no es obligatoria, pero si se sube debe ser válida
    if (!formData.img) newErrors.img = "La imagen es obligatoria";

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('=== INICIO DEL SUBMIT ===');
    
    const formErrors = validateForm();
    console.log('Errores de validación:', formErrors);
    setErrors(formErrors);

    // Si hay errores de validación, mostrar alerta específica
    if (Object.keys(formErrors).length > 0) {
      console.log('Formulario tiene errores, no se envía');
      
      // Crear lista de campos faltantes
      const camposFaltantes = Object.keys(formErrors).map(field => {
        const fieldNames = {
          name: 'Nombre',
          lastName: 'Apellido', 
          id: 'DUI',
          birthDate: 'Fecha de nacimiento',
          password: 'Contraseña',
          phone: 'Teléfono',
          address: 'Dirección',
          circulationCard: 'Tarjeta de circulación',
          img: 'Imagen'
        };
        return fieldNames[field] || field;
      });

      Swal.fire({
        title: '⚠️ Formulario incompleto',
        html: `
          <p style="margin-bottom: 15px;">Los siguientes campos son obligatorios:</p>
          <ul style="text-align: left; color: #dc2626; font-weight: 500;">
            ${camposFaltantes.map(campo => `<li>• ${campo}</li>`).join('')}
          </ul>
        `,
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f59e0b',
        allowOutsideClick: false,
        customClass: {
          popup: 'animated pulse'
        }
      });
      return;
    }

    // Si no hay errores de validación, proceder con el envío
    try {
      // Mostrar loading
      showLoadingAlert();
      setLoading(true);
      console.log('Estado de loading activado');
      
      // Crear FormData para enviar archivos
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('lastName', formData.lastName.trim());
      formDataToSend.append('id', formData.id.trim());
      formDataToSend.append('birthDate', formData.birthDate);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('phone', formData.phone.trim());
      formDataToSend.append('address', formData.address.trim());
      formDataToSend.append('circulationCard', formData.circulationCard.trim());
      
      // Agregar la imagen si existe
      if (formData.img) {
        formDataToSend.append('img', formData.img);
      }

      console.log('=== DATOS A ENVIAR ===');
      console.log('Datos con imagen:', {
        name: formData.name.trim(),
        lastName: formData.lastName.trim(),
        id: formData.id.trim(),
        birthDate: formData.birthDate,
        password: formData.password,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        circulationCard: formData.circulationCard.trim(),
        hasImage: !!formData.img,
        imageSize: formData.img ? `${(formData.img.size / 1024).toFixed(2)} KB` : 'No image'
      });
      
      console.log('=== ENVIANDO PETICIÓN ===');
      console.log('URL:', 'http://localhost:4000/api/motoristas');
      
      // Llamada a la API con fetch usando FormData
      const response = await fetch('http://localhost:4000/api/motoristas', {
        method: 'POST',
        body: formDataToSend, // No agregar Content-Type header, fetch lo hace automáticamente con FormData
      });
      
      console.log('=== RESPUESTA RECIBIDA ===');
      console.log('Status:', response.status);
      
      // Si la respuesta es exitosa
      if (response.ok) {
        const responseData = await response.json();
        console.log('Respuesta del servidor:', responseData);
        console.log('¡Motorista creado exitosamente!');
        
        // Cerrar loading y mostrar éxito
        Swal.close();
        showSuccessAlert();
        
        // Limpiar formulario
        setFormData({
          name: '',
          lastName: '',
          email: '',
          id: '',
          birthDate: '',
          password: '',
          phone: '',
          address: '',
          circulationCard: '',
          img: null
        });
        setImagePreview(null);
        setSelectedDate(null);
        setErrors({});
        
        // Limpiar input de archivo
        const fileInput = document.getElementById('image-upload');
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('=== ERROR CAPTURADO ===');
      console.error('Error completo:', error);
      
      // Cerrar loading
      Swal.close();
      
      let errorMsg = 'Error desconocido';
      let errorTitle = '❌ Error al agregar motorista';
      
      // Manejo de diferentes tipos de errores
      if (error.message.includes('HTTP error!')) {
        const statusCode = error.message.match(/\d+/);
        if (statusCode) {
          switch (parseInt(statusCode[0])) {
            case 400:
              errorTitle = '❌ Error de validación';
              errorMsg = 'Los datos enviados no son válidos. Verifica la información.';
              break;
            case 401:
              errorTitle = '🔒 No autorizado';
              errorMsg = 'No tienes permisos para realizar esta acción. Verifica tus credenciales.';
              break;
            case 403:
              errorTitle = '⛔ Acceso denegado';
              errorMsg = 'No tienes permisos suficientes para agregar motoristas.';
              break;
            case 404:
              errorTitle = '🔍 Servicio no encontrado';
              errorMsg = 'El servicio no está disponible. Contacta al administrador.';
              break;
            case 409:
              errorTitle = '⚠️ Conflicto de datos';
              errorMsg = 'Ya existe un motorista con estos datos. Verifica el DUI o tarjeta de circulación.';
              break;
            case 413:
              errorTitle = '📁 Archivo muy grande';
              errorMsg = 'La imagen es muy grande. Reduce el tamaño e intenta de nuevo.';
              break;
            case 500:
              errorTitle = '🔥 Error del servidor';
              errorMsg = 'Error interno del servidor. Inténtalo más tarde.';
              break;
            default:
              errorTitle = '❌ Error inesperado';
              errorMsg = `Error del servidor (${statusCode[0]}). Contacta al administrador.`;
          }
        } else {
          errorMsg = error.message;
        }
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorTitle = '🌐 Sin conexión';
        errorMsg = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
      } else {
        errorTitle = '⚙️ Error de configuración';
        errorMsg = 'Error al configurar la petición. Contacta al administrador.';
      }
      
      // Mostrar error específico
      Swal.fire({
        title: errorTitle,
        text: errorMsg,
        icon: 'error',
        confirmButtonText: 'Intentar de nuevo',
        confirmButtonColor: '#ef4444',
        allowOutsideClick: false,
        customClass: {
          popup: 'animated shakeX'
        }
      });
      
    } finally {
      console.log('=== FINALIZANDO ===');
      setLoading(false);
    }
  };

  const handleBackToMenu = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      console.log('Navegar a la página anterior');
    }
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = '#375E27';
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = '#d1d5db';
  };

  // Generar años para el selector
  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear - 100; year <= currentYear; year++) {
      years.push(year);
    }
    return years.reverse();
  };

  return (
    <div className="fixed inset-0 min-h-screen" style={{ backgroundColor: '#34353A' }}>
      {/* Header */}
      <div className="text-white px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 py-4 lg:py-6" style={{ backgroundColor: '#34353A' }}>
        <button
          onClick={handleBackToMenu}
          className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm lg:text-base">Volver al menú principal</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 pb-8" style={{ height: 'calc(100vh - 80px)', overflowY: 'auto' }}>
        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 min-h-full max-w-full mx-auto">
          {/* Title Section */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 lg:mb-8 xl:mb-10 space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-3 lg:space-x-4">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900">Agregar Motorista</h1>
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-18 xl:h-18 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#34353A' }}
              >
                <User className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 text-white" />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              className="w-full lg:w-auto text-white px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-2 sm:py-3 md:py-3 lg:py-4 rounded-lg text-sm md:text-base lg:text-lg font-medium transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#375E27' }}
              disabled={loading}
            >
              {loading ? 'Cargando...' : 'Agregar'}
            </button>
          </div>

          {/* Form */}
          <div className="overflow-x-auto">
            <div className="space-y-6 lg:space-y-8 xl:space-y-10 min-w-[320px] md:min-w-[768px] lg:min-w-[1024px] xl:min-w-[1280px] 2xl:min-w-[1536px]">
              {/* Image Upload Section */}
              <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto lg:mx-0">
                <label className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-2 lg:mb-3">Imagen del Motorista</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 lg:p-8">
                  {!imagePreview ? (
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 xl:h-16 xl:w-16 text-gray-400" />
                      <div className="mt-2 sm:mt-3 md:mt-4">
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer bg-white rounded-md font-medium text-gray-600 hover:text-gray-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                        >
                          <span className="block text-xs sm:text-sm md:text-base lg:text-lg">Haz clic para subir una imagen</span>
                          <input
                            id="image-upload"
                            name="img"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleImageChange}
                          />
                        </label>
                        <p className="text-xs sm:text-sm lg:text-base text-gray-500 mt-1 sm:mt-2">PNG, JPG, GIF hasta 5MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative inline-block mx-auto w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img src={imagePreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <p className="text-center text-xs sm:text-sm text-gray-600 mt-2 max-w-36 truncate">{formData.img?.name}</p>
                    </div>
                  )}
                </div>
                {errors.img && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.img}</p>}
              </div>

              {/* First Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8 xl:gap-10">
                {/* Nombre */}
                <div>
                  <label htmlFor="name" className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-1 lg:mb-2">
                    Nombre
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder="Nombre"
                    className={`w-full rounded-md border px-3 py-2 lg:px-4 lg:py-3 xl:px-5 xl:py-4 text-sm md:text-base lg:text-lg text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.name}</p>}
                </div>

                {/* Apellido */}
                <div>
                  <label htmlFor="lastName" className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-1 lg:mb-2">
                    Apellido
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder="Apellido"
                    className={`w-full rounded-md border px-3 py-2 lg:px-4 lg:py-3 xl:px-5 xl:py-4 text-sm md:text-base lg:text-lg text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.lastName && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.lastName}</p>}
                </div>

                {/* Email (Solo lectura) */}
                <div className="md:col-span-2 lg:col-span-1">
                  <label htmlFor="email" className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-1 lg:mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    readOnly
                    placeholder="Correo electrónico generado automáticamente"
                    className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 lg:px-4 lg:py-3 xl:px-5 xl:py-4 text-sm md:text-base lg:text-lg text-gray-700 shadow-sm cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8 xl:gap-10">
                {/* DUI */}
                <div>
                  <label htmlFor="id" className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-1 lg:mb-2">
                    DUI
                  </label>
                  <input
                    id="id"
                    name="id"
                    type="text"
                    value={formData.id}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder="00000000-0"
                    maxLength={10}
                    className={`w-full rounded-md border px-3 py-2 lg:px-4 lg:py-3 xl:px-5 xl:py-4 text-sm md:text-base lg:text-lg text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 ${
                      errors.id ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.id && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.id}</p>}
                </div>

                {/* Fecha de nacimiento con calendario personalizado */}
                <div className="relative">
                  <label htmlFor="birthDate" className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-1 lg:mb-2">
                    Fecha de nacimiento
                  </label>
                  <input
                    id="birthDate"
                    name="birthDate"
                    type="text"
                    value={formData.birthDate}
                    readOnly
                    onClick={() => setShowCalendar(!showCalendar)}
                    placeholder="YYYY-MM-DD"
                    className={`w-full rounded-md border px-3 py-2 lg:px-4 lg:py-3 xl:px-5 xl:py-4 text-sm md:text-base lg:text-lg text-gray-700 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-600 ${
                      errors.birthDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    className="absolute right-3 lg:right-4 xl:right-5 top-8 sm:top-9 md:top-10 lg:top-11 xl:top-12 text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={() => setShowCalendar(!showCalendar)}
                    aria-label="Abrir calendario"
                  >
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                  </button>

                  {showCalendar && (
                    <div className="absolute z-10 bg-white border border-gray-300 rounded-md shadow-lg mt-1 p-3 sm:p-4 w-56 sm:w-64 md:w-72 lg:w-80 max-w-full">
                      {/* Selector año */}
                      <div className="flex justify-between items-center mb-2">
                        <button
                          type="button"
                          onClick={() => navigateYear(-1)}
                          className="text-gray-600 hover:text-gray-800 focus:outline-none"
                          aria-label="Año anterior"
                        >
                          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <span className="font-semibold text-sm md:text-base lg:text-lg">{currentDate.getFullYear()}</span>
                        <button
                          type="button"
                          onClick={() => navigateYear(1)}
                          className="text-gray-600 hover:text-gray-800 focus:outline-none"
                          aria-label="Año siguiente"
                        >
                          <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>

                      {/* Selector mes */}
                      <div className="flex justify-between items-center mb-2">
                        <button
                          type="button"
                          onClick={() => navigateMonth(-1)}
                          className="text-gray-600 hover:text-gray-800 focus:outline-none"
                          aria-label="Mes anterior"
                        >
                          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <span className="font-semibold text-sm md:text-base lg:text-lg">{months[currentDate.getMonth()]}</span>
                        <button
                          type="button"
                          onClick={() => navigateMonth(1)}
                          className="text-gray-600 hover:text-gray-800 focus:outline-none"
                          aria-label="Mes siguiente"
                        >
                          <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>

                      {/* Días de la semana */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {daysOfWeek.map((day) => (
                          <div
                            key={day}
                            className="text-center text-xs sm:text-sm font-semibold text-gray-500 select-none"
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Días del mes */}
                      <div className="grid grid-cols-7 gap-1">
                        {getDaysInMonth(currentDate).map((date, index) => {
                          const isDisabled = date.getMonth() !== currentDate.getMonth();
                          const isSelectedDate = isSelected(date);
                          const isTodayDate = isToday(date);
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleDateSelect(date)}
                              disabled={isDisabled}
                              className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex items-center justify-center text-xs sm:text-sm rounded-full focus:outline-none
                                ${isSelectedDate ? 'bg-green-600 text-white' : ''}
                                ${isTodayDate && !isSelectedDate ? 'border border-green-600 text-green-600' : ''}
                                ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-green-100'}
                              `}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {errors.birthDate && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.birthDate}</p>}
                </div>

                {/* Contraseña */}
                <div className="md:col-span-2 lg:col-span-1">
                  <label htmlFor="password" className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-1 lg:mb-2">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder="Contraseña"
                    className={`w-full rounded-md border px-3 py-2 lg:px-4 lg:py-3 xl:px-5 xl:py-4 text-sm md:text-base lg:text-lg text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.password && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.password}</p>}
                </div>
              </div>

              {/* Third Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8 xl:gap-10">
                {/* Teléfono */}
                <div>
                  <label htmlFor="phone" className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-1 lg:mb-2">
                    Teléfono
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    value={formData.phone}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder="0000-0000"
                    maxLength={9}
                    className={`w-full rounded-md border px-3 py-2 lg:px-4 lg:py-3 xl:px-5 xl:py-4 text-sm md:text-base lg:text-lg text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.phone && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.phone}</p>}
                </div>

                {/* Dirección */}
                <div>
                  <label htmlFor="address" className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-1 lg:mb-2">
                    Dirección
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder="Dirección"
                    className={`w-full rounded-md border px-3 py-2 lg:px-4 lg:py-3 xl:px-5 xl:py-4 text-sm md:text-base lg:text-lg text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.address && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.address}</p>}
                </div>

                {/* Tarjeta de circulación */}
                <div className="md:col-span-2 lg:col-span-1">
                  <label htmlFor="circulationCard" className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-1 lg:mb-2">
                    Tarjeta de circulación
                  </label>
                  <input
                    id="circulationCard"
                    name="circulationCard"
                    type="text"
                    value={formData.circulationCard}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder="Ejemplo: ABC-123"
                    className={`w-full rounded-md border px-3 py-2 lg:px-4 lg:py-3 xl:px-5 xl:py-4 text-sm md:text-base lg:text-lg text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 ${
                      errors.circulationCard ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.circulationCard && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.circulationCard}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMotoristaForm;