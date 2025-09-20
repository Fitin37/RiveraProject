import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/authContext';
import FocusAwareStatusBar from '../components/FocusAwareStatusBar';
import LottieView from 'lottie-react-native';

// Importaciones de Expo
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

// Importa tus animaciones Lottie
import EditAnimation from "../assets/lottie/Portfolio Writer.json";
import SaveAnimation from "../assets/lottie/Blue successful login.json";
import ProfileAnimation from "../assets/lottie/Profile Avatar of Young Boy.json";
import LogoutAnimation from "../assets/lottie/Login.json";
import LoadingAnimation from "../assets/lottie/Sandy Loading.json";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GREEN = '#10AC84';
const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const ACCENT = '#3B82F6';

const ProfileScreen = () => {
  // Estados existentes...
  const [userInfo, setUserInfo] = useState(null);
  const [editingUserInfo, setEditingUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeField, setActiveField] = useState(null);
  const [successVisible, setSuccessVisible] = useState(false);
  
  // Estados específicos para imagen de perfil
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const editButtonScale = useRef(new Animated.Value(1)).current;

  // Hooks de navegación y autenticación
  const navigation = useNavigation();
  const { user, logout, token } = useAuth();

  // Inicializar animaciones
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Función principal: Obtener información del perfil
  const fetchUserProfile = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setImageLoadError(false);

      if (!user?.id && !user?._id) {
        console.log('No hay user ID, usando datos dummy para debug');
        const dummyUserInfo = createDummyUserInfo();
        setUserInfo(dummyUserInfo);
        setEditingUserInfo({ ...dummyUserInfo });
        return;
      }

      const userId = user.id || user._id;
      const apiUrl = `https://riveraproject-production.up.railway.app/api/clientes/${userId}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Servidor devolvió ${contentType || 'HTML'} en lugar de JSON. Status: ${response.status}`);
      }

      const data = await response.json();

      if (response.ok && data.success) {
        const clienteData = data.data.cliente;
        const actividadData = data.data.actividad;

        const formattedUserInfo = {
          name: String(clienteData?.nombreCompleto || `${clienteData?.firstName || ''} ${clienteData?.lastName || ''}`.trim() || 'Usuario sin nombre'),
          firstName: String(clienteData?.firstName || ''),
          lastName: String(clienteData?.lastName || ''),
          role: 'Cliente',
          email: String(clienteData?.email || 'No disponible'),
          dni: String(clienteData?.idNumber || 'No registrado'),
          birthDate: clienteData?.birthDate ? formatDate(clienteData.birthDate) : 'No registrada',
          phone: String(clienteData?.phone || 'No registrado'),
          address: String(clienteData?.address || 'No registrada'),
          estadoActividad: String(actividadData?.estadoActividad || 'activo'),
          fechaRegistro: String(actividadData?.fechaRegistro || 'No disponible'),
          diasDesdeRegistro: actividadData?.diasDesdeRegistro ? Number(actividadData.diasDesdeRegistro) : null,
          ultimoAcceso: String(actividadData?.ultimoAcceso || 'No registrado'),
          edad: String(clienteData?.edad || 'No disponible'),
          profileImage: clienteData?.profileImage || null,
        };

        console.log('Profile image URL:', formattedUserInfo.profileImage);

        setUserInfo(formattedUserInfo);
        setEditingUserInfo({ ...formattedUserInfo });
      } else {
        throw new Error(data.message || 'Error al obtener información del perfil');
      }
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      handleProfileError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Función auxiliar: Crear datos dummy para debug
  const createDummyUserInfo = () => {
    return {
      name: 'Juan Carlos Rivera',
      firstName: 'Juan Carlos',
      lastName: 'Rivera',
      role: 'Cliente Premium',
      email: 'juan.rivera@email.com',
      dni: '12345678-9',
      birthDate: '15/03/1985',
      phone: '+503 7512-3456',
      address: 'Col. Escalón, San Salvador',
      estadoActividad: 'activo',
      fechaRegistro: '15 de enero de 2024',
      diasDesdeRegistro: 245,
      ultimoAcceso: 'Hace 2 horas',
      edad: '39 años',
      profileImage: null,
    };
  };

  // Función auxiliar: Manejar errores del perfil
  const handleProfileError = (error) => {
    let errorMessage = 'Error de conexión';
    if (error.message.includes('Network')) {
      errorMessage = 'Sin conexión a internet';
    } else if (error.message.includes('ID de usuario')) {
      errorMessage = 'Sesión inválida. Por favor inicia sesión nuevamente.';
    } else {
      errorMessage = error.message || 'Error al cargar el perfil';
    }
    setError(errorMessage);
  };

  // Función auxiliar: Formatear fecha
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'No registrada';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  // Funciones para manejo de imagen de perfil
  const handleImageLoadStart = () => {
    setImageLoading(true);
    setImageLoadError(false);
  };

  const handleImageLoadEnd = () => {
    setImageLoading(false);
  };

  const handleImageError = (error) => {
    console.log('Error cargando imagen de perfil:', error.nativeEvent?.error);
    setImageLoadError(true);
    setImageLoading(false);
  };

  // Función auxiliar: Verificar si debe mostrar imagen o Lottie
  const shouldShowImage = () => {
    return userInfo?.profileImage && 
           !imageLoadError && 
           userInfo.profileImage.trim() !== '';
  };

  // Funciones para el selector de imagen
  const showImagePicker = () => {
    setImagePickerVisible(true);
  };

  const hideImagePicker = () => {
    setImagePickerVisible(false);
  };

  // Función para redimensionar imagen con Expo
  const resizeImage = async (imageUri) => {
    try {
      const resizedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 800, height: 800 } }
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return resizedImage;
    } catch (error) {
      console.log('Error resizing image:', error);
      return { uri: imageUri };
    }
  };

  // Función para seleccionar imagen de la galería con Expo
  const pickImageFromGallery = async () => {
    try {
      hideImagePicker();

      // Verificar permisos
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(
          'Permiso denegado',
          'Se necesita permiso para acceder a la galería de fotos.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Lanzar selector de imagen
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const resizedImage = await resizeImage(asset.uri);
        await uploadProfileImage(resizedImage.uri, 'profile_image.jpg');
      }
    } catch (error) {
      console.error('Error picking image from gallery:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen de la galería');
    }
  };

  // Función para tomar foto con cámara usando Expo
  const takePhotoWithCamera = async () => {
    try {
      hideImagePicker();

      // Verificar permisos de cámara
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(
          'Permiso denegado',
          'Se necesita permiso para acceder a la cámara.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Lanzar cámara
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const resizedImage = await resizeImage(asset.uri);
        await uploadProfileImage(resizedImage.uri, 'profile_image.jpg');
      }
    } catch (error) {
      console.error('Error taking photo with camera:', error);
      Alert.alert('Error', 'No se pudo tomar la foto con la cámara');
    }
  };

  // Función principal: Subir imagen de perfil
  const uploadProfileImage = async (imageUri, fileName) => {
    try {
      setUploadingImage(true);
      
      if (!user?.id && !user?._id) {
        throw new Error('No se encontró el ID del usuario');
      }

      const userId = user.id || user._id;
      const apiUrl = `https://riveraproject-production.up.railway.app/api/clientes/${userId}`;
      
      // Crear FormData
      const formData = new FormData();
      
      // Agregar la imagen
      const imageObject = {
        uri: imageUri,
        type: 'image/jpeg',
        name: fileName || 'profile_image.jpg',
      };

      formData.append('profileImage', imageObject);

      console.log('Subiendo imagen:', fileName);
      console.log('URI de imagen:', imageUri);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          // NO enviar Content-Type, fetch lo configura automáticamente para FormData
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Error en la respuesta del servidor');
      }

      console.log('Respuesta del servidor:', data);

      if (response.ok && data.success) {
        // Actualizar la imagen en el estado local inmediatamente
        const newImageUrl = data.data.cliente.profileImage;
        
        setUserInfo(prev => ({ 
          ...prev, 
          profileImage: newImageUrl 
        }));
        
        setEditingUserInfo(prev => ({ 
          ...prev, 
          profileImage: newImageUrl 
        }));

        // Mostrar mensaje de éxito
        setSuccessVisible(true);
        setTimeout(() => {
          setSuccessVisible(false);
        }, 3000);

        // Recargar perfil después de un momento
        setTimeout(() => {
          fetchUserProfile(true);
        }, 1000);
        
      } else {
        throw new Error(data?.message || 'Error al subir la imagen');
      }
      
    } catch (error) {
      console.error('Error al subir imagen:', error);
      
      let errorMessage = 'No se pudo subir la imagen';
      if (error.message.includes('Network')) {
        errorMessage = 'Sin conexión a internet';
      } else if (error.message.includes('401')) {
        errorMessage = 'Sesión expirada. Inicia sesión nuevamente';
      } else if (error.message.includes('Archivo demasiado grande')) {
        errorMessage = 'La imagen es demasiado grande. Máximo 5MB';
      } else if (error.message.includes('Tipo de archivo inválido')) {
        errorMessage = 'Solo se permiten imágenes (JPG, PNG, GIF)';
      } else {
        errorMessage = error.message || 'Error desconocido';
      }
      
      Alert.alert('Error al subir imagen', errorMessage, [
        {
          text: 'OK',
          onPress: () => {
            if (error.message.includes('401')) {
              logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          }
        }
      ]);
    } finally {
      setUploadingImage(false);
    }
  };

  // Componente para el Avatar con manejo mejorado
  const ProfileAvatar = () => {
    if (shouldShowImage()) {
      return (
        <View style={styles.avatar}>
          {(imageLoading || uploadingImage) && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator size="small" color={ACCENT} />
              {uploadingImage && (
                <Text style={styles.uploadingText}>Subiendo...</Text>
              )}
            </View>
          )}
          
          <Image 
            source={{ uri: userInfo.profileImage }}
            style={[
              styles.profileImageStyle,
              (imageLoading || uploadingImage) && styles.profileImageLoading
            ]}
            resizeMode="cover"
            onLoadStart={handleImageLoadStart}
            onLoadEnd={handleImageLoadEnd}
            onError={handleImageError}
          />
        </View>
      );
    }
    
    return (
      <View style={styles.avatar}>
        {uploadingImage && (
          <View style={styles.imageLoadingOverlay}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.uploadingText}>Subiendo...</Text>
          </View>
        )}
        <LottieView
          source={ProfileAnimation}
          autoPlay
          loop
          style={[styles.avatarLottie, uploadingImage && styles.profileImageLoading]}
        />
      </View>
    );
  };

  // Función: Guardar cambios (código existente permanece igual)
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      if (!user?.id && !user?._id) {
        throw new Error('No se encontró el ID del usuario');
      }

      const userId = user.id || user._id;
      const apiUrl = `https://riveraproject-production.up.railway.app/api/clientes/${userId}`;
      
      const formatDateForAPI = (dateString) => {
        if (!dateString || dateString === 'No registrada' || dateString === 'Fecha inválida') {
          return null;
        }
        
        if (dateString.includes('/')) {
          const parts = dateString.split('/');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
          }
        }
        
        return dateString;
      };
      
      const updateData = {};
      
      if (editingUserInfo.firstName && editingUserInfo.firstName.trim()) {
        updateData.firstName = editingUserInfo.firstName.trim();
      }
      
      if (editingUserInfo.lastName && editingUserInfo.lastName.trim()) {
        updateData.lastName = editingUserInfo.lastName.trim();
      }
      
      if (editingUserInfo.email && editingUserInfo.email.trim()) {
        updateData.email = editingUserInfo.email.trim();
      }
      
      if (editingUserInfo.phone && editingUserInfo.phone.trim()) {
        updateData.phone = editingUserInfo.phone.trim();
      }
      
      if (editingUserInfo.dni && editingUserInfo.dni.trim()) {
        updateData.idNumber = editingUserInfo.dni.trim();
      }
      
      if (editingUserInfo.address && editingUserInfo.address.trim()) {
        updateData.address = editingUserInfo.address.trim();
      }
      
      const formattedBirthDate = formatDateForAPI(editingUserInfo.birthDate);
      if (formattedBirthDate) {
        updateData.birthDate = formattedBirthDate;
      }

      console.log('Enviando datos de actualización:', updateData);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(updateData),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Servidor devolvió ${contentType || 'HTML'} en lugar de JSON. Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Respuesta del servidor:', data);

      if (response.ok && data.success) {
        setUserInfo({ ...editingUserInfo });
        setEditMode(false);
        setActiveField(null);
        setSaving(false);
        
        setSuccessVisible(true);
        setTimeout(() => {
          setSuccessVisible(false);
        }, 3000);

        setTimeout(() => {
          fetchUserProfile(true);
        }, 1000);
        
      } else {
        throw new Error(data.message || 'Error al actualizar el perfil');
      }
      
    } catch (error) {
      setSaving(false);
      console.error('Error al actualizar perfil:', error);
      
      let errorMessage = 'No se pudieron guardar los cambios';
      if (error.message.includes('Network')) {
        errorMessage = 'Sin conexión a internet';
      } else if (error.message.includes('401')) {
        errorMessage = 'Sesión expirada. Inicia sesión nuevamente';
      } else if (error.message.includes('Fecha de nacimiento')) {
        errorMessage = 'Formato de fecha inválido. Usa DD/MM/YYYY';
      } else {
        errorMessage = error.message || 'Error desconocido';
      }
      
      Alert.alert('Error al guardar', errorMessage, [
        {
          text: 'OK',
          onPress: () => {
            if (error.message.includes('401')) {
              logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          }
        }
      ]);
    }
  };

  // Resto de las funciones existentes...
  const handleCancelEdit = () => {
    setEditingUserInfo({ ...userInfo });
    setEditMode(false);
    setActiveField(null);
  };

  const handleStartEdit = () => {
    setEditMode(true);
    Animated.sequence([
      Animated.timing(editButtonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(editButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onRefresh = () => {
    fetchUserProfile(true);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchUserProfile();
    }, [user])
  );

  const openConfirm = () => setConfirmVisible(true);
  const closeConfirm = () => setConfirmVisible(false);
  
  const handleConfirmLogout = async () => {
    try {
      setConfirmVisible(false);
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert('Error', 'Hubo un problema al cerrar sesión');
    }
  };

  // Renderizado condicional: Loading
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <FocusAwareStatusBar barStyle="light-content" backgroundColor={GREEN} />
        <View style={styles.loadingContainer}>
          <LottieView
            source={LoadingAnimation}
            autoPlay
            loop
            style={styles.loadingLottie}
          />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Renderizado condicional: Error
  if (error && !userInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <FocusAwareStatusBar barStyle="light-content" backgroundColor={GREEN} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error al cargar perfil</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => fetchUserProfile()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Renderizado principal
  return (
    <SafeAreaView style={styles.container}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor={GREEN} />
      
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[GREEN]}
              tintColor={GREEN}
            />
          }
        >
          {/* Header moderno */}
          <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerTitle}>Mi Perfil</Text>
                <Text style={styles.headerSubtitle}>Gestiona tu información personal</Text>
              </View>
              
              <View style={styles.headerActions}>
                {userInfo?.estadoActividad && (
                  <View style={[
                    styles.activityBadge, 
                    { backgroundColor: getActivityColor(userInfo.estadoActividad) }
                  ]}>
                    <Text style={styles.activityText}>
                      {getActivityLabel(userInfo.estadoActividad)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Profile Card con imagen mejorada */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <ProfileAvatar />
              
              <View style={styles.avatarOverlay}>
                <TouchableOpacity 
                  style={[
                    styles.avatarEditButton,
                    uploadingImage && styles.avatarEditButtonDisabled
                  ]}
                  onPress={showImagePicker}
                  disabled={uploadingImage}
                >
                  <LottieView
                    source={EditAnimation}
                    autoPlay
                    loop={false}
                    style={styles.editIconLottie}
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{userInfo?.name || 'Usuario'}</Text>
              <Text style={styles.userRole}>{userInfo?.role || 'Cliente'}</Text>
              {userInfo?.edad && (
                <Text style={styles.userAge}>{userInfo.edad}</Text>
              )}
            </View>
          </View>

          {/* Botones de acción */}
          <View style={styles.actionButtons}>
            {!editMode ? (
              <Animated.View style={{ transform: [{ scale: editButtonScale }] }}>
                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={handleStartEdit}
                  activeOpacity={0.8}
                >
                  <LottieView
                    source={EditAnimation}
                    autoPlay
                    loop={false}
                    style={styles.buttonLottie}
                  />
                  <Text style={styles.editButtonText}>Editar Perfil</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={handleCancelEdit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                  onPress={handleSaveChanges}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonIcon}>💾</Text>
                  )}
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Información personal editable */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>📋 Información Personal</Text>

            {[
              { key: 'email', label: 'Email', icon: '📧', type: 'email' },
              { key: 'phone', label: 'Teléfono', icon: '📱', type: 'phone' },
              { key: 'dni', label: 'DUI', icon: '🆔', type: 'default' },
              { key: 'address', label: 'Dirección', icon: '🏠', type: 'default' },
              { key: 'birthDate', label: 'Fecha de Nacimiento', icon: '🎂', type: 'default' },
            ].map(({ key, label, icon, type }) => (
              <EditableField
                key={key}
                label={label}
                icon={icon}
                value={editMode ? editingUserInfo?.[key] : userInfo?.[key]}
                onChangeText={(text) => {
                  if (editMode) {
                    setEditingUserInfo(prev => ({ ...prev, [key]: text }));
                  }
                }}
                editable={editMode}
                keyboardType={type === 'email' ? 'email-address' : type === 'phone' ? 'phone-pad' : 'default'}
                isActive={activeField === key}
                onFocus={() => setActiveField(key)}
                onBlur={() => setActiveField(null)}
              />
            ))}
          </View>

          {/* Información de cuenta */}
          {userInfo?.fechaRegistro && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>👤 Información de Cuenta</Text>
              
              <InfoItem
                icon="📅"
                label="Miembro desde"
                value={userInfo.fechaRegistro}
              />
              
              {userInfo.diasDesdeRegistro !== null && (
                <InfoItem
                  icon="⏱️"
                  label="Días registrado"
                  value={`${userInfo.diasDesdeRegistro} días`}
                />
              )}
              
              {userInfo.ultimoAcceso && (
                <InfoItem
                  icon="🕐"
                  label="Último acceso"
                  value={userInfo.ultimoAcceso}
                />
              )}
            </View>
          )}

          {/* Botón Cerrar sesión */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={openConfirm} 
              activeOpacity={0.8}
            >
              <LottieView
                source={LogoutAnimation}
                autoPlay
                loop={false}
                style={styles.buttonLottie}
              />
              <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Modal selector de imagen */}
      <Modal transparent visible={imagePickerVisible} animationType="fade" onRequestClose={hideImagePicker}>
        <Pressable style={styles.backdrop} onPress={hideImagePicker}>
          <Pressable style={styles.imagePickerModal}>
            <Text style={styles.imagePickerTitle}>Cambiar foto de perfil</Text>
            
            <TouchableOpacity 
              style={styles.imagePickerOption}
              onPress={takePhotoWithCamera}
              activeOpacity={0.8}
            >
              <Text style={styles.imagePickerIcon}>📷</Text>
              <Text style={styles.imagePickerText}>Tomar foto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.imagePickerOption}
              onPress={pickImageFromGallery}
              activeOpacity={0.8}
            >
              <Text style={styles.imagePickerIcon}>🖼️</Text>
              <Text style={styles.imagePickerText}>Elegir de galería</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.imagePickerCancel}
              onPress={hideImagePicker}
              activeOpacity={0.8}
            >
              <Text style={styles.imagePickerCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de confirmación moderno */}
      <Modal transparent visible={confirmVisible} animationType="fade" onRequestClose={closeConfirm}>
        <Pressable style={styles.backdrop} onPress={closeConfirm}>
          <Pressable style={styles.modalCard}>
            <View style={styles.iconWrap}>
              <View style={styles.iconCircle}>
                <LottieView
                  source={LogoutAnimation}
                  autoPlay
                  loop
                  style={styles.modalLottie}
                />
              </View>
            </View>

            <Text style={styles.modalTitle}>¿Cerrar Sesión?</Text>
            <Text style={styles.modalSubtitle}>
              Se cerrará tu sesión en este dispositivo. Podrás volver a iniciar cuando quieras.
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.btnLight} onPress={closeConfirm} activeOpacity={0.8}>
                <Text style={styles.btnLightText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnDanger} onPress={handleConfirmLogout} activeOpacity={0.8}>
                <Text style={styles.btnDangerText}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* SweetAlert Modal de Éxito */}
      <Modal transparent visible={successVisible} animationType="fade" onRequestClose={() => setSuccessVisible(false)}>
        <View style={styles.sweetAlertBackdrop}>
          <Animated.View style={styles.sweetAlertCard}>
            <View style={styles.sweetAlertIconContainer}>
              <LottieView
                source={SaveAnimation}
                autoPlay
                loop={false}
                style={styles.sweetAlertLottie}
              />
            </View>
            
            <Text style={styles.sweetAlertTitle}>¡Perfil Actualizado!</Text>
            <Text style={styles.sweetAlertMessage}>
              Los cambios han sido guardados exitosamente
            </Text>
            
            <TouchableOpacity 
              style={styles.sweetAlertButton} 
              onPress={() => setSuccessVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.sweetAlertButtonText}>Genial</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Componente EditableField
const EditableField = ({ 
  label, 
  icon, 
  value, 
  onChangeText, 
  editable, 
  keyboardType = 'default',
  isActive,
  onFocus,
  onBlur
}) => (
  <View style={[styles.editableField, isActive && styles.editableFieldActive]}>
    <View style={styles.fieldHeader}>
      <Text style={styles.fieldIcon}>{icon}</Text>
      <Text style={styles.fieldLabel}>{label}</Text>
    </View>
    
    {editable ? (
      <TextInput
        style={[styles.fieldInput, isActive && styles.fieldInputActive]}
        value={value || ''}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={`Ingresa tu ${label.toLowerCase()}`}
        placeholderTextColor={TEXT_SECONDARY}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    ) : (
      <Text style={styles.fieldValue}>{value || 'No disponible'}</Text>
    )}
  </View>
);

// Componente InfoItem
const InfoItem = ({ icon, label, value }) => (
  <View style={styles.infoItem}>
    <View style={styles.infoHeader}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

// Funciones auxiliares
const getActivityColor = (activity) => {
  switch (String(activity).toLowerCase()) {
    case 'online': return '#10D876';
    case 'activo': return '#F59E0B';
    case 'poco_activo': return '#EF4444';
    default: return '#6B7280';
  }
};

const getActivityLabel = (activity) => {
  switch (String(activity).toLowerCase()) {
    case 'online': return '🟢 En línea';
    case 'activo': return '🟡 Activo';
    case 'poco_activo': return '🟠 Poco activo';
    default: return '⚪ Inactivo';
  }
};

// Estilos
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: BG 
  },
  content: {
    flex: 1,
  },
  
  // Nuevos estilos para image picker
  imagePickerModal: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 24,
    margin: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  imagePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 20,
  },
  imagePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 12,
  },
  imagePickerIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  imagePickerCancel: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 8,
  },
  imagePickerCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  avatarEditButtonDisabled: {
    opacity: 0.5,
  },
  uploadingText: {
    fontSize: 12,
    color: ACCENT,
    marginTop: 4,
    fontWeight: '600',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  loadingLottie: {
    width: 120,
    height: 120,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: GREEN,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: GREEN,
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  headerActions: {
    alignItems: 'flex-end',
  },
  activityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileCard: {
    backgroundColor: CARD_BG,
    marginHorizontal: 24,
    marginTop: -20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarLottie: {
    width: 80,
    height: 80,
  },
  profileImageStyle: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  profileImageLoading: {
    opacity: 0.7,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 50,
    zIndex: 1,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: -5,
    right: -5,
  },
  avatarEditButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  editIconLottie: {
    width: 20,
    height: 20,
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: TEXT_PRIMARY, 
    marginBottom: 4 
  },
  userRole: { 
    fontSize: 16, 
    color: TEXT_SECONDARY, 
    fontWeight: '500' 
  },
  userAge: { 
    fontSize: 14, 
    color: TEXT_SECONDARY, 
    marginTop: 4 
  },
  actionButtons: {
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 20,
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  editButtonText: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  saveButtonIcon: {
    fontSize: 18,
    marginRight: 4,
  },
  buttonLottie: {
    width: 20,
    height: 20,
  },
  sweetAlertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sweetAlertCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
  },
  sweetAlertIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  sweetAlertLottie: {
    width: 80,
    height: 80,
  },
  sweetAlertTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 12,
  },
  sweetAlertMessage: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  sweetAlertButton: {
    backgroundColor: GREEN,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    minWidth: 120,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sweetAlertButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: CARD_BG,
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: TEXT_PRIMARY, 
    marginBottom: 20 
  },
  editableField: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  editableFieldActive: {
    borderColor: ACCENT,
    backgroundColor: '#EFF6FF',
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  fieldInput: {
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontWeight: '500',
    padding: 0,
    borderWidth: 0,
  },
  fieldInputActive: {
    color: ACCENT,
  },
  fieldValue: {
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  infoItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  infoValue: {
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  buttonContainer: { 
    paddingHorizontal: 24, 
    paddingBottom: 30 
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonText: { 
    color: '#EF4444', 
    fontSize: 16, 
    fontWeight: '700',
    marginLeft: 8,
  },
  backdrop: {
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%', 
    maxWidth: 400, 
    backgroundColor: CARD_BG, 
    borderRadius: 24,
    padding: 24, 
    shadowColor: '#000', 
    shadowOpacity: 0.2, 
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, 
    elevation: 10,
  },
  iconWrap: { 
    alignItems: 'center', 
    marginBottom: 16 
  },
  iconCircle: {
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center', 
    justifyContent: 'center',
  },
  modalLottie: {
    width: 50,
    height: 50,
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: TEXT_PRIMARY, 
    textAlign: 'center', 
    marginBottom: 8,
  },
  modalSubtitle: { 
    fontSize: 16, 
    color: TEXT_SECONDARY, 
    textAlign: 'center', 
    lineHeight: 24,
    marginBottom: 24,
  },
  actionsRow: { 
    flexDirection: 'row', 
    gap: 12,
  },
  btnLight: {
    flex: 1, 
    backgroundColor: '#F1F5F9', 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center',
  },
  btnLightText: { 
    color: TEXT_SECONDARY, 
    fontWeight: '700', 
    fontSize: 16,
  },
  btnDanger: {
    flex: 1, 
    backgroundColor: '#EF4444', 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center',
  },
  btnDangerText: {
    color: '#FFFFFF', 
    fontWeight: '800', 
    fontSize: 16,
  },
});

export default ProfileScreen;