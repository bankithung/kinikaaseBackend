import React, { useEffect, useState, useRef } from 'react';
import {
  View, Platform, PermissionsAndroid, StyleSheet, Image, Alert, KeyboardAvoidingView,
  ScrollView, TouchableOpacity, FlatList, Modal, Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';
import NetInfo from '@react-native-community/netinfo';
import { MMKV } from 'react-native-mmkv';
import { ActivityIndicator, Text, TextInput, Button, useTheme, IconButton } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import api from './src/api'; // Adjust path as needed
import { ADDRESS } from '../../core/api'; // Adjust path as needed

// Initialize MMKV storage
const storage = new MMKV();

// Environment variables
const MAPPLS_ACCESS_TOKEN = 'ce4ba26e-40bc-4439-a4e5-c47255994494'; // Replace with your Mappls access token
const WEBSOCKET_URL = Platform.OS === 'android' ? `wss://${ADDRESS}/ws/rides/` : `wss://${ADDRESS}/ws/rides/`;
const API_URL = Platform.OS === 'android' ? `https://${ADDRESS}/api/` : `https://${ADDRESS}/api/`;

// Polyline decoding function
const decodePolyline = (encoded) => {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

// Map component with enhanced functionality
const Map = ({ lt, lo, route = [], riderLocations = [], destination }) => {
  const markers = [
    { lat: lt, lng: lo, icon: 'https://apis.mapmyindia.com/map_v3/1.png' }, // User
    ...(riderLocations.map(loc => ({
      lat: loc.latitude,
      lng: loc.longitude,
      icon: 'https://apis.mapmyindia.com/map_v3/2.png', // Driver icon
    }))),
    ...(destination ? [{ lat: destination.latitude, lng: destination.longitude, icon: 'https://apis.mapmyindia.com/map_v3/3.png' }] : []),
  ];
  const polyline = route.length ? JSON.stringify(route.map(p => [p.latitude, p.longitude])) : '[]';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="initial-scale=1.0">
      <meta charset="utf-8">
      <style>html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }</style>
      <script src="https://apis.mappls.com/advancedmaps/api/${MAPPLS_ACCESS_TOKEN}/map_sdk?layer=vector&v=3.0&callback=initMap" defer async></script>
    </head>
    <body>
      <div id="map"></div>
      <script>
        let map, markers = [], polyline;
        function initMap() {
          map = new mappls.Map('map', { center: [${lt}, ${lo}], zoom: 14 });
          ${markers.map((m, i) => `
            markers[${i}] = new mappls.Marker({
              map: map,
              position: { lat: ${m.lat}, lng: ${m.lng} },
              icon_url: '${m.icon}',
            });
          `).join('')}
          polyline = new mappls.Polyline({
            map: map,
            path: ${polyline},
            strokeColor: '#4A00E0',
            strokeWidth: 4,
          });
          map.fitBounds([${lt},${lo},${destination ? `${destination.latitude},${destination.longitude}` : `${lt},${lo}`}]);
        }
      </script>
    </body>
    </html>
  `;
};

// Main Component
const KariScreen = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user, trip, riderLocations } = useSelector(state => state);
  const [position, setPosition] = useState({ latitude: null, longitude: null });
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState(null);
  const [riderDetails, setRiderDetails] = useState({ aadhaar: '', carNumber: '', carPlateImage: null });
  const [destinationQuery, setDestinationQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [price, setPrice] = useState(null);
  const [rideType, setRideType] = useState('Standard');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [tripHistory, setTripHistory] = useState([]);
  const [showSplash, setShowSplash] = useState(true);
  const socketRef = useRef(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [isAuthScreen, setIsAuthScreen] = useState(!storage.getString('jwt_token'));
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhoneNumber, setAuthPhoneNumber] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTripHistory, setShowTripHistory] = useState(false);

  // Splash screen timeout
  useEffect(() => {
    if (showSplash) setTimeout(() => setShowSplash(false), 2000);
  }, [showSplash]);

  // Initial setup and network monitoring
  useEffect(() => {
    const loadUserData = () => {
      const token = storage.getString('jwt_token');
      const userId = storage.getString('userId');
      const role = storage.getString('userRole');
      const registrationCompleted = storage.getString('registrationCompleted') === 'true';
      if (token && token.split('.').length === 3) {
        dispatch({ type: 'SET_USER', payload: { token, userId, role, registrationCompleted } });
        setIsAuthScreen(false);
      } else {
        storage.clearAll();
        dispatch({ type: 'LOGOUT' });
        setIsAuthScreen(true);
      }
    };
    loadUserData();
    const unsubscribeNet = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      if (!state.isConnected && socketRef.current) socketRef.current.close();
    });
    return () => unsubscribeNet();
  }, []);

  // Initialize location and WebSocket
  useEffect(() => {
    if (user.token && !isAuthScreen) {
      requestLocationPermission();
      setupWebSocket();
      if (user.role === 'passenger') fetchTripHistory();
    }
  }, [user.token, isAuthScreen]);

  // Fetch destination suggestions
  useEffect(() => {
    if (destinationQuery.length > 2) fetchSuggestions();
    else setSuggestions([]);
  }, [destinationQuery]);

  // Fetch trip details
  useEffect(() => {
    if (trip?.id) fetchTripDetails(trip.id);
  }, [trip?.id]);

  // WebSocket setup
  const setupWebSocket = () => {
    if (!user.token || socketRef.current?.readyState === WebSocket.OPEN) return;
    const connect = async (attempt = 0) => {
      const ws = new WebSocket(`${WEBSOCKET_URL}?token=${user.token}`);
      socketRef.current = ws;
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = e => {
        const data = JSON.parse(e.data);
        if (data.error) return handleError(data.error);
        switch (data.type) {
          case 'trip_request':
            if (user.role === 'rider') {
              Alert.alert('New Ride Request', `Trip ID: ${data.trip_id}`, [
                { text: 'Decline', style: 'cancel' },
                { text: 'Accept', onPress: () => acceptTrip(data.trip_id) },
              ]);
            }
            break;
          case 'trip_accepted':
            if (user.role === 'passenger') {
              dispatch({ type: 'SET_TRIP', payload: { ...trip, status: 'accepted', rider_id: data.rider_id, otp: data.otp } });
            }
            break;
          case 'rider_location':
            if (user.role === 'passenger') {
              dispatch({ type: 'SET_RIDER_LOCATIONS', payload: [{ latitude: data.latitude, longitude: data.longitude }] });
            }
            break;
          case 'trip_started':
            dispatch({ type: 'SET_TRIP', payload: { ...trip, status: 'ongoing' } });
            setShowOtpModal(false);
            break;
          case 'trip_completed':
            if (user.role === 'passenger') setShowFeedbackModal(true);
            dispatch({ type: 'SET_TRIP', payload: null });
            dispatch({ type: 'SET_RIDER_LOCATIONS', payload: [] });
            break;
          case 'trip_cancelled':
            dispatch({ type: 'SET_TRIP', payload: null });
            dispatch({ type: 'SET_RIDER_LOCATIONS', payload: [] });
            break;
        }
      };
      ws.onclose = async event => {
        setWsConnected(false);
        if (event.code === 1006 || event.reason === 'User not authenticated') {
          try {
            const newToken = await refreshToken(user.token);
            dispatch({ type: 'SET_USER', payload: { ...user, token: newToken } });
            setTimeout(() => connect(0), 1000);
          } catch (refreshError) {
            handleLogout();
          }
        } else if (user.token && isOnline && attempt < 5) {
          setTimeout(() => connect(attempt + 1), Math.min(1000 * 2 ** attempt, 30000));
        }
      };
      ws.onerror = () => setWsConnected(false);
    };
    connect();
    return () => socketRef.current?.close();
  };

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      setLocationLoading(true);
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          { title: 'Location Permission', message: 'Kari needs access to your location.', buttonPositive: 'OK' }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Location permission denied');
      }
      if (user.role === 'rider' && user.registrationCompleted) {
        const watchId = Geolocation.watchPosition(
          ({ coords }) => {
            setPosition({ latitude: coords.latitude, longitude: coords.longitude });
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({
                type: 'location_update',
                latitude: coords.latitude,
                longitude: coords.longitude,
              }));
            }
          },
          err => handleError(`Location update failed: ${err.message}`),
          { enableHighAccuracy: true, distanceFilter: 10 }
        );
        return () => Geolocation.clearWatch(watchId);
      } else {
        Geolocation.getCurrentPosition(
          ({ coords }) => {
            setPosition({ latitude: coords.latitude, longitude: coords.longitude });
            setLocationLoading(false);
          },
          err => handleError(`Failed to fetch location: ${err.message}`),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      }
    } catch (err) {
      handleError(err.message);
    }
  };

  // Error handling
  const handleError = message => {
    setError(message);
    setLocationLoading(false);
    Alert.alert('Error', message);
  };

  // Authentication handler
  const handleAuth = async () => {
    if (!isOnline) return Alert.alert('Error', 'No internet connection');
    if (!authUsername || !authPassword) return Alert.alert('Error', 'Username and password required');
    if (!isLogin && (!authEmail || !authPhoneNumber)) return Alert.alert('Error', 'Email and phone required');
    setAuthLoading(true);
    try {
      const response = isLogin
        ? await api.post('/login/', { username: authUsername, password: authPassword })
        : await api.post('/register/', {
            username: authUsername,
            email: authEmail,
            password: authPassword,
            phone_number: authPhoneNumber,
          });
      const token = response.data.token;
      if (token.split('.').length !== 3) throw new Error('Invalid JWT format');
      storage.set('jwt_token', token);
      storage.set('userId', response.data.user_id);
      dispatch({ type: 'SET_USER', payload: { token, userId: response.data.user_id } });
      setIsAuthScreen(false);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || (isLogin ? 'Login failed' : 'Registration failed'));
    } finally {
      setAuthLoading(false);
    }
  };

  // Role selection
  const handleRoleSelection = role => {
    storage.set('userRole', role);
    const registrationCompleted = role === 'passenger';
    dispatch({ type: 'SET_USER', payload: { ...user, role, registrationCompleted } });
    storage.set('registrationCompleted', registrationCompleted.toString());
    if (role === 'rider') {
      Alert.alert('Location Sharing', 'Share your location 24/7?', [
        { text: 'No', onPress: () => handleChangeRole() },
        { text: 'Yes', onPress: () => checkRiderProfile() },
      ]);
    }
  };

  // Check rider profile
  const checkRiderProfile = async () => {
    try {
      const response = await api.get('/rider-profile/', { headers: { Authorization: `Bearer ${user.token}` } });
      if (response.status === 200) {
        storage.set('registrationCompleted', 'true');
        dispatch({ type: 'SET_USER', payload: { ...user, registrationCompleted: true } });
      }
    } catch (e) {
      console.log('Rider profile not found');
    }
  };

  // Rider details submission
  const handleRiderSubmit = async () => {
    if (!isOnline || !/^\d{12}$/.test(riderDetails.aadhaar) || !riderDetails.carNumber.trim() || !riderDetails.carPlateImage) {
      return handleError('Invalid rider details');
    }
    setLocationLoading(true);
    try {
      const formData = new FormData();
      formData.append('aadhaar_number', riderDetails.aadhaar);
      formData.append('vehicle_number', riderDetails.carNumber);
      formData.append('vehicle_plate_image', {
        uri: riderDetails.carPlateImage,
        name: riderDetails.carPlateImage.split('/').pop(),
        type: 'image/jpeg',
      });
      const response = await api.post('/rider-profile/create/', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${user.token}` },
      });
      if (response.status === 201) {
        storage.set('registrationCompleted', 'true');
        dispatch({ type: 'SET_USER', payload: { ...user, registrationCompleted: true } });
      }
    } catch (e) {
      handleError('Failed to submit rider details');
    } finally {
      setLocationLoading(false);
    }
  };

  // Fetch suggestions
  const fetchSuggestions = async () => {
    if (!isOnline) return;
    try {
      const response = await api.get('/places/search/', {
        params: { query: destinationQuery },
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setSuggestions((response.data.suggestedLocations || []).map(item => ({
        ...item,
        latitude: item.latitude || null,
        longitude: item.longitude || null,
      })));
    } catch (e) {
      handleError('Failed to fetch suggestions');
    }
  };

  // Handle destination selection
  const handleDestinationSelect = async item => {
    if (!isOnline || !position.latitude) return handleError('No internet or location');
    let dest = item.latitude && item.longitude
      ? { latitude: parseFloat(item.latitude), longitude: parseFloat(item.longitude) }
      : await fetchCoordinatesFromELoc(item.eLoc);
    if (!dest) return;
    setDestination(dest);
    setDestinationQuery(item.placeName);
    setSuggestions([]);
    try {
      const response = await api.post('/route/', {
        origin_lat: position.latitude,
        origin_lon: position.longitude,
        dest_lat: dest.latitude,
        dest_lon: dest.longitude,
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      setRoute(decodePolyline(response.data.route));
      setPrice(response.data.price);
    } catch (e) {
      handleError('Failed to fetch route');
    }
  };

  // Book ride
  const handleBookRide = async () => {
    if (!isOnline || !destination || !price) return handleError('Cannot book ride');
    try {
      const response = await api.post('/trips/', {
        pickup_latitude: position.latitude,
        pickup_longitude: position.longitude,
        destination_latitude: destination.latitude,
        destination_longitude: destination.longitude,
        price,
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      dispatch({
        type: 'SET_TRIP',
        payload: {
          id: response.data.id,
          status: 'requested',
          price,
          pickup: { latitude: position.latitude, longitude: position.longitude },
          destination: { latitude: destination.latitude, longitude: destination.longitude },
          rideType,
        },
      });
      setDestinationQuery('');
      setSuggestions([]);
    } catch (e) {
      handleError('Failed to book ride');
    }
  };

  // Accept trip
  const acceptTrip = async tripId => {
    if (!isOnline) return;
    try {
      await api.put(`/trips/${tripId}/accept/`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
      dispatch({
        type: 'SET_TRIP',
        payload: { id: tripId, status: 'accepted', pickup: { latitude: position.latitude, longitude: position.longitude } },
      });
    } catch (e) {
      handleError('Failed to accept trip');
    }
  };

  // Start trip
  const handleStartTrip = async () => {
    if (!isOnline || !otpInput || !trip?.id) return handleError('Cannot start trip');
    try {
      await api.put(`/trips/${trip.id}/start/`, { otp: otpInput }, { headers: { Authorization: `Bearer ${user.token}` } });
      dispatch({ type: 'SET_TRIP', payload: { ...trip, status: 'ongoing', route: route || trip.route } });
      setShowOtpModal(false);
      setOtpInput('');
    } catch (e) {
      handleError('Invalid OTP or failed to start trip');
    }
  };

  // Complete trip
  const handleCompleteTrip = async () => {
    if (!isOnline || !trip?.id) return;
    try {
      await api.put(`/trips/${trip.id}/complete/`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
      dispatch({ type: 'SET_TRIP', payload: null });
      dispatch({ type: 'SET_RIDER_LOCATIONS', payload: [] });
    } catch (e) {
      handleError('Failed to complete trip');
    }
  };

  // Cancel trip
  const handleCancelTrip = async () => {
    if (!isOnline || !trip?.id) return;
    try {
      await api.put(`/trips/${trip.id}/cancel/`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
      dispatch({ type: 'SET_TRIP', payload: null });
      dispatch({ type: 'SET_RIDER_LOCATIONS', payload: [] });
      setDestination(null);
      setRoute(null);
      setPrice(null);
    } catch (e) {
      handleError('Failed to cancel trip');
    }
  };

  // Fetch trip details
  const fetchTripDetails = async tripId => {
    if (!isOnline) return;
    try {
      const response = await api.get(`/trips/${tripId}/`, { headers: { Authorization: `Bearer ${user.token}` } });
      const tripData = response.data;
      const routeData = trip.route || (await fetchRoute(tripData));
      dispatch({
        type: 'SET_TRIP',
        payload: {
          id: tripData.id,
          status: tripData.status,
          pickup: { latitude: tripData.pickup_latitude, longitude: tripData.pickup_longitude },
          destination: { latitude: tripData.destination_latitude, longitude: tripData.destination_longitude },
          price: tripData.price,
          rider_id: tripData.rider,
          otp: tripData.otp,
          route: routeData,
        },
      });
    } catch (e) {
      handleError('Failed to fetch trip details');
    }
  };

  // Fetch route
  const fetchRoute = async tripData => {
    try {
      const response = await api.post('/route/', {
        origin_lat: tripData.pickup_latitude,
        origin_lon: tripData.pickup_longitude,
        dest_lat: tripData.destination_latitude,
        dest_lon: tripData.destination_longitude,
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      return decodePolyline(response.data.route);
    } catch (e) {
      console.error('Failed to fetch route');
      return null;
    }
  };

  // Fetch trip history
  const fetchTripHistory = async () => {
    try {
      const response = await api.get('/trips/', { headers: { Authorization: `Bearer ${user.token}` } });
      setTripHistory(response.data);
    } catch (e) {
      console.error('Failed to fetch trip history');
    }
  };

  // Submit feedback
  const handleFeedbackSubmit = async () => {
    if (!isOnline || !trip?.id) return;
    try {
      await api.post(`/trips/${trip.id}/feedback/`, { rating, feedback }, { headers: { Authorization: `Bearer ${user.token}` } });
      setShowFeedbackModal(false);
      setRating(0);
      setFeedback('');
    } catch (e) {
      handleError('Failed to submit feedback');
    }
  };

  // Render splash screen
  const renderSplashScreen = () => (
    <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Image source={require('../../assets/taxi.png')} style={styles.logo} />
        <Text variant="headlineLarge" style={styles.title}>Welcome to Kari</Text>
      </SafeAreaView>
    </LinearGradient>
  );

  // Render auth screen
  const renderAuthScreen = () => (
    <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Text variant="headlineLarge" style={styles.authTitle}>{isLogin ? 'Login to Kari' : 'Join Kari'}</Text>
        <TextInput label="Username" value={authUsername} onChangeText={setAuthUsername} mode="outlined" style={styles.input} />
        {!isLogin && <TextInput label="Email" value={authEmail} onChangeText={setAuthEmail} mode="outlined" style={styles.input} keyboardType="email-address" />}
        <TextInput label="Password" value={authPassword} onChangeText={setAuthPassword} mode="outlined" secureTextEntry style={styles.input} />
        {!isLogin && <TextInput label="Phone Number" value={authPhoneNumber} onChangeText={setAuthPhoneNumber} mode="outlined" keyboardType="phone-pad" style={styles.input} />}
        <Button mode="contained" onPress={handleAuth} loading={authLoading} style={styles.submitButton}>{isLogin ? 'Login' : 'Register'}</Button>
        <Button mode="text" onPress={() => setIsLogin(!isLogin)} style={styles.toggleButton} textColor="#FFFFFF">
          {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
        </Button>
        {!isOnline && <Text style={styles.offlineText}>Offline - Connect to internet</Text>}
      </SafeAreaView>
    </LinearGradient>
  );

  // Render role selection
  const renderRoleSelection = () => (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Image source={require('../../assets/taxi.png')} style={styles.logo} />
          <Text variant="headlineLarge" style={styles.title}>Welcome to Kari</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>Choose Your Role</Text>
          <View style={styles.roleCardsContainer}>
            <TouchableOpacity style={styles.roleCard} onPress={() => handleRoleSelection('rider')}>
              <Image source={require('../../assets/steering.png')} style={styles.roleIcon} />
              <Text variant="titleLarge" style={styles.roleTitle}>Driver</Text>
              <Text variant="bodyMedium" style={styles.roleDescription}>Earn by driving passengers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roleCard} onPress={() => handleRoleSelection('passenger')}>
              <Image source={require('../../assets/tourist.png')} style={styles.roleIcon} />
              <Text variant="titleLarge" style={styles.roleTitle}>Passenger</Text>
              <Text variant="bodyMedium" style={styles.roleDescription}>Travel with ease</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );

  // Render rider form
  const renderRiderForm = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.formScrollContainer}>
          <Text variant="headlineMedium" style={styles.formTitle}>Driver Registration</Text>
          <TextInput label="Aadhaar Number" value={riderDetails.aadhaar} onChangeText={text => setRiderDetails({ ...riderDetails, aadhaar: text })} mode="outlined" keyboardType="numeric" maxLength={12} style={styles.input} />
          <TextInput label="Vehicle Registration" value={riderDetails.carNumber} onChangeText={text => setRiderDetails({ ...riderDetails, carNumber: text })} mode="outlined" style={styles.input} />
          <Button mode="outlined" onPress={() => launchImageLibrary({ mediaType: 'photo' }, res => res.assets && setRiderDetails({ ...riderDetails, carPlateImage: res.assets[0].uri }))} style={styles.uploadButton} textColor="#FFFFFF">
            {riderDetails.carPlateImage ? 'Change Vehicle Photo' : 'Upload Vehicle Photo'}
          </Button>
          {riderDetails.carPlateImage && <Image source={{ uri: riderDetails.carPlateImage }} style={styles.imagePreview} />}
          <Button mode="contained" onPress={handleRiderSubmit} loading={locationLoading} style={styles.submitButton}>Complete Registration</Button>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );

  // Render passenger booking
  const renderPassengerBooking = () => (
    <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.gradient}>
      {locationLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.subtitle}>Fetching Location...</Text>
        </View>
      ) : position.latitude ? (
        <View style={styles.passengerContainer}>
          <Text variant="headlineMedium" style={styles.formTitle}>Where To?</Text>
          <TextInput label="Search Destination" value={destinationQuery} onChangeText={setDestinationQuery} mode="outlined" style={styles.input} />
          <FlatList
            data={suggestions}
            keyExtractor={item => item.eLoc || item.placeName}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleDestinationSelect(item)} style={styles.suggestionItem}>
                <Text style={styles.suggestionText}>{item.placeName}</Text>
              </TouchableOpacity>
            )}
            style={styles.suggestionList}
          />
          {price && route && (
            <View style={styles.routeInfo}>
              <Text style={styles.routeText}>Distance: {calculateDistance(position, destination)} km</Text>
              <Text style={styles.routeText}>Price: ₹{price}</Text>
              <View style={styles.rideOptions}>
                {['Standard', 'Premium', 'Shared'].map(type => (
                  <TouchableOpacity key={type} onPress={() => setRideType(type)} style={[styles.rideOption, rideType === type && styles.rideOptionSelected]}>
                    <Text style={styles.rideOptionText}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Button mode="contained" onPress={handleBookRide} style={styles.submitButton}>Book Ride</Button>
            </View>
          )}
          <IconButton icon="cog" color="#FFFFFF" size={30} style={styles.settingsIcon} onPress={() => setShowSettings(true)} />
        </View>
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.subtitle}>Enable location services</Text>
          <Button mode="contained" onPress={requestLocationPermission} style={styles.submitButton}>Retry Location</Button>
        </View>
      )}
    </LinearGradient>
  );

  // Render map screen
  const renderMapScreen = () => (
    <View style={styles.mapContainer}>
      {position.latitude ? (
        <WebView
          source={{ html: Map({ lt: position.latitude, lo: position.longitude, route, riderLocations, destination: trip?.destination }) }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
        />
      ) : (
        <View style={styles.centerContainer}><Text style={styles.subtitle}>Location unavailable</Text></View>
      )}
      <LinearGradient colors={['rgba(74, 0, 224, 0.9)', 'rgba(142, 45, 226, 0.9)']} style={styles.mapOverlay}>
        <Button mode="outlined" onPress={handleChangeRole} style={styles.actionButton} textColor="#FFFFFF">Switch Role</Button>
        <Button mode="outlined" onPress={handleLogout} style={styles.actionButton} textColor="#FFFFFF">Logout</Button>
        {user.role === 'rider' && trip?.status === 'accepted' && (
          <Button mode="contained" onPress={() => setShowOtpModal(true)} style={styles.submitButton}>Enter OTP</Button>
        )}
        {user.role === 'rider' && trip?.status === 'ongoing' && (
          <Button mode="contained" onPress={handleCompleteTrip} style={styles.submitButton}>Complete Trip</Button>
        )}
        {(user.role === 'rider' || user.role === 'passenger') && trip?.status === 'requested' && (
          <Button mode="contained" onPress={handleCancelTrip} style={styles.submitButton}>Cancel Trip</Button>
        )}
        {user.role === 'passenger' && trip?.status === 'accepted' && (
          <View>
            <Text style={styles.tripText}>OTP: {trip.otp} - Share with Rider</Text>
            <Button mode="contained" onPress={() => Linking.openURL(`tel:${trip.riderPhone}`)} style={styles.submitButton}>Call Rider</Button>
          </View>
        )}
        {trip && (
          <View>
            <Text style={styles.tripText}>Price: ₹{trip.price}</Text>
            <Text style={styles.tripText}>Status: {trip.status}</Text>
            <Button mode="contained" onPress={() => Linking.openURL('sms:?body=Check out my trip!')} style={styles.submitButton}>Share Trip</Button>
            <Button mode="contained" onPress={() => Linking.openURL('tel:911')} style={styles.emergencyButton}>Emergency</Button>
          </View>
        )}
        <IconButton icon="history" color="#FFFFFF" size={30} onPress={() => setShowTripHistory(true)} />
        {!isOnline && <Text style={styles.offlineText}>Offline</Text>}
        {!wsConnected && <Text style={styles.offlineText}>Real-time updates unavailable</Text>}
      </LinearGradient>
      <Modal visible={showOtpModal} transparent animationType="slide">
        <View style={styles.modal}>
          <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.modalContent}>
            <TextInput label="Enter OTP" value={otpInput} onChangeText={setOtpInput} mode="outlined" keyboardType="numeric" maxLength={6} style={styles.input} />
            <Button mode="contained" onPress={handleStartTrip} style={styles.submitButton}>Submit OTP</Button>
            <Button mode="text" onPress={() => setShowOtpModal(false)} style={styles.cancelButton} textColor="#FFFFFF">Cancel</Button>
          </LinearGradient>
        </View>
      </Modal>
      <Modal visible={showFeedbackModal} transparent animationType="slide">
        <View style={styles.modal}>
          <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.modalContent}>
            <Text style={styles.formTitle}>Rate Your Ride</Text>
            <FlatList
              data={[1, 2, 3, 4, 5]}
              horizontal
              renderItem={({ item }) => (
                <IconButton icon="star" color={item <= rating ? '#FFD700' : '#FFFFFF'} size={30} onPress={() => setRating(item)} />
              )}
              keyExtractor={item => item.toString()}
            />
            <TextInput label="Feedback" value={feedback} onChangeText={setFeedback} mode="outlined" multiline style={styles.input} />
            <Button mode="contained" onPress={handleFeedbackSubmit} style={styles.submitButton}>Submit</Button>
            <Button mode="text" onPress={() => setShowFeedbackModal(false)} style={styles.cancelButton} textColor="#FFFFFF">Skip</Button>
          </LinearGradient>
        </View>
      </Modal>
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.modal}>
          <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.modalContent}>
            <Text style={styles.formTitle}>Settings</Text>
            <Text style={styles.tripText}>Payment Method</Text>
            <FlatList
              data={['Cash', 'Card', 'Wallet']}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => setPaymentMethod(item)} style={styles.suggestionItem}>
                  <Text style={styles.suggestionText}>{item} {paymentMethod === item && '(Selected)'}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={item => item}
            />
            <Button mode="contained" onPress={() => setShowSettings(false)} style={styles.submitButton}>Save</Button>
          </LinearGradient>
        </View>
      </Modal>
      <Modal visible={showTripHistory} transparent animationType="slide">
        <View style={styles.modal}>
          <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.modalContent}>
            <Text style={styles.formTitle}>Trip History</Text>
            <FlatList
              data={tripHistory}
              renderItem={({ item }) => (
                <View style={styles.tripHistoryItem}>
                  <Text style={styles.tripText}>Trip ID: {item.id}</Text>
                  <Text style={styles.tripText}>Status: {item.status}</Text>
                  <Text style={styles.tripText}>Price: ₹{item.price}</Text>
                </View>
              )}
              keyExtractor={item => item.id.toString()}
            />
            <Button mode="contained" onPress={() => setShowTripHistory(false)} style={styles.submitButton}>Close</Button>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );

  // Main render logic
  if (showSplash) return renderSplashScreen();
  if (isAuthScreen) return renderAuthScreen();
  if (error) return (
    <View style={styles.centerContainer}>
      <Text style={styles.subtitle}>{error}</Text>
      <Button onPress={() => { setError(null); requestLocationPermission(); setupWebSocket(); }} mode="contained" style={styles.submitButton}>Retry</Button>
    </View>
  );
  if (!user.role) return renderRoleSelection();
  if (user.role === 'rider' && !user.registrationCompleted) return renderRiderForm();
  if (user.role === 'passenger' && !trip) return renderPassengerBooking();
  return renderMapScreen();
};

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  gradient: { flex: 1 },
  scrollContainer: { flexGrow: 1, alignItems: 'center', paddingVertical: 40 },
  logo: { width: 120, height: 120, marginBottom: 20 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', marginVertical: 10 },
  subtitle: { color: '#E0E0E0', fontSize: 18, marginBottom: 20 },
  roleCardsContainer: { width: '100%', marginTop: 20 },
  roleCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 25, alignItems: 'center', marginVertical: 15, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  roleIcon: { width: 60, height: 60 },
  roleTitle: { color: '#4A00E0', fontSize: 22, fontWeight: 'bold', marginTop: 15 },
  roleDescription: { color: '#666', fontSize: 16, textAlign: 'center', marginTop: 5 },
  formScrollContainer: { padding: 20, alignItems: 'center' },
  formTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginTop: 30 },
  input: { width: '100%', marginVertical: 10, backgroundColor: '#FFFFFF', borderRadius: 10 },
  uploadButton: { marginVertical: 15, borderColor: '#FFFFFF', borderWidth: 1, borderRadius: 10 },
  imagePreview: { width: 220, height: 160, borderRadius: 15, marginVertical: 15 },
  submitButton: { marginVertical: 5, borderRadius: 10, backgroundColor: '#FF4081' },
  passengerContainer: { padding: 25, alignItems: 'center', flex: 1 },
  suggestionList: { width: '100%', maxHeight: 220, backgroundColor: '#FFFFFF', borderRadius: 15, marginTop: 10 },
  suggestionItem: { padding: 18, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  suggestionText: { color: '#4A00E0', fontSize: 16 },
  routeInfo: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 20, marginTop: 25, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  routeText: { color: '#4A00E0', fontSize: 18, marginVertical: 8 },
  rideOptions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginVertical: 10 },
  rideOption: { padding: 10, borderRadius: 5, borderWidth: 1, borderColor: '#4A00E0' },
  rideOptionSelected: { backgroundColor: '#4A00E0' },
  rideOptionText: { color: '#4A00E0' },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapOverlay: { position: 'absolute', top: 10, right: 5, padding: 20, borderRadius: 20, width: 220 },
  actionButton: { marginVertical: 2, borderColor: '#FFFFFF', borderWidth: 1, borderRadius: 10 },
  tripText: { color: '#FFFFFF', fontSize: 16, marginVertical: 5 },
  modal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { padding: 25, borderRadius: 20, width: '85%' },
  cancelButton: { marginTop: 10 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offlineText: { color: '#FF5252', fontSize: 14, marginTop: 10 },
  authTitle: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  toggleButton: { marginTop: 15 },
  emergencyButton: { backgroundColor: '#FF0000', marginVertical: 5 },
  settingsIcon: { position: 'absolute', top: 10, right: 10 },
  tripHistoryItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#FFFFFF' },
});

export default KariScreen;