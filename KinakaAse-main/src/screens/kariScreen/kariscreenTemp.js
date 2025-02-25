import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Platform,
  PermissionsAndroid,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import NetInfo from '@react-native-community/netinfo';
import { MMKV } from 'react-native-mmkv';
import { ActivityIndicator, Text, TextInput, Button, useTheme } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import api from './src/api'; // Adjust path as needed
import { ADDRESS } from '../../core/api'; // Adjust path as needed

// Initialize MMKV storage
const storage = new MMKV();

// Environment variables
const MAPMYINDIA_ACCESS_TOKEN = 'ce4ba26e-40bc-4439-a4e5-c47255994494'; // Replace with your token
const WEBSOCKET_URL = Platform.OS === 'android' ? `wss://${ADDRESS}/ws/rides/` : `wss://${ADDRESS}/ws/rides/`;
const API_URL = Platform.OS === 'android' ? `https://${ADDRESS}/api/` : `https://${ADDRESS}/api/`;

// Polyline decoding function
const decodePolyline = (encoded) => {
  let points = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
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

// Redux setup
const initialState = { user: {}, trip: null, riderLocations: [] };
const reducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_TRIP':
      return { ...state, trip: action.payload };
    case 'SET_RIDER_LOCATIONS':
      return { ...state, riderLocations: action.payload };
    case 'LOGOUT':
      return initialState;
    default:
      return state;
  }
};

// Token Refresh Logic
const refreshToken = async (oldToken) => {
  try {
    const response = await api.post('/refresh-token/', { token: oldToken });
    const newToken = response.data.token;
    if (newToken && newToken.split('.').length === 3) {
      storage.set('jwt_token', newToken);
      return newToken;
    }
    throw new Error('Invalid refreshed token');
  } catch (e) {
    throw new Error('Token refresh failed: ' + (e.response?.data?.detail || e.message));
  }
};

// API Interceptor for Token Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const oldToken = storage.getString('jwt_token');
      try {
        const newToken = await refreshToken(oldToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        storage.clearAll();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Main Component
const KariScreen = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state);
  const [position, setPosition] = useState({ latitude: null, longitude: null });
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState(null);
  const [riderDetails, setRiderDetails] = useState({ aadhaar: '', carNumber: '', carPlateImage: null });
  const [destinationQuery, setDestinationQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [price, setPrice] = useState(null);
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
  const { trip, riderLocations } = useSelector((state) => state);

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

    const unsubscribeNet = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected);
      if (!state.isConnected && socketRef.current) socketRef.current.close();
    });
    return () => unsubscribeNet();
  }, []);

  // Initialize location and WebSocket when authenticated
  useEffect(() => {
    if (user.token && !isAuthScreen) {
      requestLocationPermission();
      setupWebSocket();
    }
  }, [user.token, isAuthScreen]);

  // Fetch destination suggestions
  useEffect(() => {
    if (destinationQuery.length > 2) fetchSuggestions();
    else setSuggestions([]);
  }, [destinationQuery]);

  // Fetch trip details when trip ID changes
  useEffect(() => {
    if (trip?.id) fetchTripDetails(trip.id);
  }, [trip?.id]);

  // WebSocket setup with reconnection logic
  const setupWebSocket = () => {
    if (!user.token || socketRef.current?.readyState === WebSocket.OPEN) return;

    const connect = async (attempt = 0) => {
      const ws = new WebSocket(`${WEBSOCKET_URL}?token=${user.token}`);
      socketRef.current = ws;

      ws.onopen = () => setWsConnected(true);

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.error) return handleError(data.error);
        switch (data.type) {
          case 'trip_request':
            if (user.role === 'rider') {
              Alert.alert('New Ride Request', `Trip ID: ${data.trip_id}`, [
                { text: 'No', style: 'cancel' },
                { text: 'Yes', onPress: () => acceptTrip(data.trip_id) },
              ]);
            }
            break;
          case 'trip_accepted':
            if (user.role === 'passenger') {
              dispatch({
                type: 'SET_TRIP',
                payload: { ...trip, status: 'accepted', rider_id: data.rider_id, otp: data.otp },
              });
            }
            break;
          case 'rider_location':
            if (user.role === 'passenger') {
              dispatch({
                type: 'SET_RIDER_LOCATIONS',
                payload: [{ latitude: data.latitude, longitude: data.longitude }],
              });
            }
            break;
          case 'trip_started':
            dispatch({ type: 'SET_TRIP', payload: { ...trip, status: 'ongoing' } });
            setShowOtpModal(false);
            break;
          case 'trip_completed':
          case 'trip_cancelled':
            dispatch({ type: 'SET_TRIP', payload: null });
            dispatch({ type: 'SET_RIDER_LOCATIONS', payload: [] });
            break;
        }
      };

      ws.onclose = async (event) => {
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

  // Request location permission and set position
  const requestLocationPermission = async () => {
    try {
      setLocationLoading(true);
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Kari needs access to your location.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Location permission denied');
      }

      if (user.role === 'rider' && user.registrationCompleted) {
        const watchId = Geolocation.watchPosition(
          ({ coords }) => {
            setPosition({ latitude: coords.latitude, longitude: coords.longitude });
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(
                JSON.stringify({
                  type: 'location_update',
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                })
              );
            }
          },
          (err) => handleError(`Location update failed: ${err.message}`),
          { enableHighAccuracy: true, distanceFilter: 10 }
        );
        return () => Geolocation.clearWatch(watchId);
      } else {
        Geolocation.getCurrentPosition(
          ({ coords }) => {
            setPosition({ latitude: coords.latitude, longitude: coords.longitude });
            setLocationLoading(false);
          },
          (err) => handleError(`Failed to fetch location: ${err.message}`),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      }
    } catch (err) {
      handleError(err.message);
    }
  };

  // Error handling function
  const handleError = (message) => {
    setError(message);
    setLocationLoading(false);
    Alert.alert('Error', message);
  };

  // Role selection handler
  const handleRoleSelection = (role) => {
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

  // Check rider profile completion
  const checkRiderProfile = async () => {
    try {
      const response = await api.get('/rider-profile/', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (response.status === 200) {
        storage.set('registrationCompleted', 'true');
        dispatch({ type: 'SET_USER', payload: { ...user, registrationCompleted: true } });
      }
    } catch (e) {
      console.log('Rider profile not found');
    }
  };

  // Validate rider details
  const validateRiderDetails = () => {
    if (!/^\d{12}$/.test(riderDetails.aadhaar)) return handleError('Invalid Aadhaar number'), false;
    if (!riderDetails.carNumber.trim()) return handleError('Vehicle registration required'), false;
    if (!riderDetails.carPlateImage) return handleError('Vehicle plate image required'), false;
    return true;
  };

  // Submit rider details
  const handleRiderSubmit = async () => {
    if (!isOnline || !validateRiderDetails()) return;
    setLocationLoading(true);
    try {
      const formData = new FormData();
      formData.append('aadhaar_number', riderDetails.aadhaar);
      formData.append('vehicle_number', riderDetails.carNumber);
      if (riderDetails.carPlateImage) {
        const uri = riderDetails.carPlateImage;
        formData.append('vehicle_plate_image', { uri, name: uri.split('/').pop(), type: 'image/jpeg' });
      }
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

  // Handle image upload for rider registration
  const handleImageUpload = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel || response.errorCode) return;
      setRiderDetails({ ...riderDetails, carPlateImage: response.assets[0].uri });
    });
  };

  // Fetch destination suggestions
  const fetchSuggestions = async () => {
    if (!isOnline) return;
    try {
      const response = await api.get('/places/search/', {
        params: { query: destinationQuery },
        headers: { Authorization: `Bearer ${user.token}` },
      });
      console.log('Search response:', response.data); // Log the full response
      const suggestionsData = response.data.suggestedLocations || [];
      setSuggestions(suggestionsData.map(item => ({
        ...item,
        latitude: item.latitude || null, // Check if coordinates are included
        longitude: item.longitude || null,
      })));
    } catch (e) {
      handleError('Failed to fetch suggestions: ' + (e.response?.data?.detail || e.message));
    }
  };

  // Fetch coordinates using MapMyIndia Place Details API (updated)
  const fetchCoordinatesFromELoc = async (eLoc) => {
    try {
      const url = `https://explore.mapmyindia.com/apis/O2O/entity/${eLoc}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${MAPMYINDIA_ACCESS_TOKEN}` },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`Failed to fetch coordinates for eLoc ${eLoc}: Status ${response.status}, Response: ${errorText}`);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Place Details response:', data); // Log for debugging
      if (!data.latitude || !data.longitude || data.latitude === 'RESTRICTED' || data.longitude === 'RESTRICTED') {
        console.log('Coordinates missing or restricted in response:', data);
        throw new Error('Coordinates not found or restricted in response');
      }
      return { latitude: parseFloat(data.latitude), longitude: parseFloat(data.longitude) };
    } catch (e) {
      handleError('Failed to fetch coordinates: ' + e.message);
      return null;
    }
  };

  // Handle destination selection with eLoc resolution
  const handleDestinationSelect = async (item) => {
    if (!isOnline || !position.latitude || !position.longitude) {
      handleError('No internet or location unavailable');
      return;
    }

    if (!item) {
      console.log('Invalid destination item:', item);
      handleError('Invalid destination selected');
      return;
    }

    let dest;
    if (item.latitude && item.longitude) {
      // Use coordinates from search response if available
      dest = { latitude: parseFloat(item.latitude), longitude: parseFloat(item.longitude) };
    } else if (item.eLoc) {
      // Fallback to fetching coordinates from eLoc using Place Details API
      const coordinates = await fetchCoordinatesFromELoc(item.eLoc);
      if (!coordinates) return; // Error already handled
      dest = coordinates;
    } else {
      console.log('Invalid destination item, missing coordinates or eLoc:', item);
      handleError('Invalid destination selected - missing coordinates or eLoc');
      return;
    }

    setDestination(dest);
    setDestinationQuery(item.placeName);
    setSuggestions([]);

    try {
      const response = await api.post(
        '/route/',
        {
          origin_lat: position.latitude,
          origin_lon: position.longitude,
          dest_lat: dest.latitude,
          dest_lon: dest.longitude,
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setRoute(decodePolyline(response.data.route));
      setPrice(response.data.price);
    } catch (e) {
      handleError('Failed to fetch route: ' + (e.response?.data?.detail || e.message));
    }
  };

  // Book a ride
  const handleBookRide = async () => {
    if (!isOnline || !destination || !price) {
      handleError('Cannot book ride: No internet or missing details');
      return;
    }
    try {
      const response = await api.post(
        '/trips/',
        {
          pickup_latitude: position.latitude,
          pickup_longitude: position.longitude,
          destination_latitude: destination.latitude,
          destination_longitude: destination.longitude,
          price,
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      dispatch({
        type: 'SET_TRIP',
        payload: {
          id: response.data.id,
          status: 'requested',
          price,
          pickup: { latitude: position.latitude, longitude: position.longitude },
          destination: { latitude: destination.latitude, longitude: destination.longitude },
        },
      });
      setDestinationQuery('');
      setSuggestions([]);
    } catch (e) {
      handleError('Failed to book ride: ' + (e.response?.data?.detail || e.message));
    }
  };

  // Accept a trip as a rider
  const acceptTrip = async (tripId) => {
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

  // Start a trip with OTP verification
  const handleStartTrip = async () => {
    if (!isOnline || !otpInput || !trip?.id) {
      handleError('Cannot start trip: Missing OTP or offline');
      return;
    }
    try {
      await api.put(
        `/trips/${trip.id}/start/`,
        { otp: otpInput },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      dispatch({ type: 'SET_TRIP', payload: { ...trip, status: 'ongoing', route: route || trip.route } });
      setShowOtpModal(false);
      setOtpInput('');
    } catch (e) {
      handleError('Invalid OTP or failed to start trip');
    }
  };

  // Complete a trip
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

  // Cancel a trip
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
  const fetchTripDetails = async (tripId) => {
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

  // Fetch route for trip
  const fetchRoute = async (tripData) => {
    try {
      const response = await api.post(
        '/route/',
        {
          origin_lat: tripData.pickup_latitude,
          origin_lon: tripData.pickup_longitude,
          dest_lat: tripData.destination_latitude,
          dest_lon: tripData.destination_longitude,
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      return decodePolyline(response.data.route);
    } catch (e) {
      console.error('Failed to fetch route');
      return null;
    }
  };

  // Change user role
  const handleChangeRole = () => {
    storage.delete('userRole');
    storage.delete('registrationCompleted');
    dispatch({ type: 'SET_USER', payload: { ...user, role: null, registrationCompleted: false } });
    setDestination(null);
    dispatch({ type: 'SET_TRIP', payload: null });
    dispatch({ type: 'SET_RIDER_LOCATIONS', payload: [] });
    socketRef.current?.close();
    setWsConnected(false);
  };

  // Logout handler
  const handleLogout = () => {
    storage.clearAll();
    dispatch({ type: 'LOGOUT' });
    socketRef.current?.close();
    setWsConnected(false);
    setIsAuthScreen(true);
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

  // Render authentication screen
  const renderAuthScreen = () => (
    <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Text variant="headlineLarge" style={styles.authTitle}>
          {isLogin ? 'Login to Kari' : 'Join Kari'}
        </Text>
        <TextInput
          label="Username"
          value={authUsername}
          onChangeText={setAuthUsername}
          mode="outlined"
          style={styles.input}
          disabled={!isOnline}
          theme={{ colors: { primary: '#4A00E0' } }}
        />
        {!isLogin && (
          <TextInput
            label="Email"
            value={authEmail}
            onChangeText={setAuthEmail}
            mode="outlined"
            style={styles.input}
            disabled={!isOnline}
            keyboardType="email-address"
            theme={{ colors: { primary: '#4A00E0' } }}
          />
        )}
        <TextInput
          label="Password"
          value={authPassword}
          onChangeText={setAuthPassword}
          mode="outlined"
          secureTextEntry
          style={styles.input}
          disabled={!isOnline}
          theme={{ colors: { primary: '#4A00E0' } }}
        />
        {!isLogin && (
          <TextInput
            label="Phone Number"
            value={authPhoneNumber}
            onChangeText={setAuthPhoneNumber}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
            disabled={!isOnline}
            theme={{ colors: { primary: '#4A00E0' } }}
          />
        )}
        <Button
          mode="contained"
          onPress={handleAuth}
          loading={authLoading}
          disabled={!isOnline}
          style={styles.submitButton}
          contentStyle={styles.buttonContent}
        >
          {isLogin ? 'Login' : 'Register'}
        </Button>
        <Button
          mode="text"
          onPress={() => setIsLogin(!isLogin)}
          style={styles.toggleButton}
          textColor="#FFFFFF"
        >
          {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
        </Button>
        {!isOnline && <Text style={styles.offlineText}>Offline - Connect to internet</Text>}
      </SafeAreaView>
    </LinearGradient>
  );

  // Render role selection screen
  const renderRoleSelection = () => (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Image source={require('../../assets/taxi.png')} style={styles.logo} />
          <Text variant="headlineLarge" style={styles.title}>
            Welcome to Kari
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Choose Your Role
          </Text>
          <View style={styles.roleCardsContainer}>
            <TouchableOpacity style={styles.roleCard} onPress={() => handleRoleSelection('rider')}>
              <Image source={require('../../assets/steering.png')} style={styles.roleIcon} />
              <Text variant="titleLarge" style={styles.roleTitle}>
                Driver
              </Text>
              <Text variant="bodyMedium" style={styles.roleDescription}>
                Earn by driving passengers
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleRoleSelection('passenger')}
            >
              <Image source={require('../../assets/tourist.png')} style={styles.roleIcon} />
              <Text variant="titleLarge" style={styles.roleTitle}>
                Passenger
              </Text>
              <Text variant="bodyMedium" style={styles.roleDescription}>
                Travel with ease
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );

  // Render rider registration form
  const renderRiderForm = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.formScrollContainer}>
          <Text variant="headlineMedium" style={styles.formTitle}>
            Driver Registration
          </Text>
          <Text variant="bodyLarge" style={styles.formSubtitle}>
            Complete your profile to start driving
          </Text>
          <TextInput
            label="Aadhaar Number"
            value={riderDetails.aadhaar}
            onChangeText={(text) => setRiderDetails({ ...riderDetails, aadhaar: text })}
            mode="outlined"
            keyboardType="numeric"
            maxLength={12}
            style={styles.input}
            theme={{ colors: { primary: '#4A00E0' } }}
          />
          <TextInput
            label="Vehicle Registration"
            value={riderDetails.carNumber}
            onChangeText={(text) => setRiderDetails({ ...riderDetails, carNumber: text })}
            mode="outlined"
            style={styles.input}
            theme={{ colors: { primary: '#4A00E0' } }}
          />
          <Button
            mode="outlined"
            onPress={handleImageUpload}
            style={styles.uploadButton}
            textColor="#FFFFFF"
            contentStyle={styles.buttonContent}
          >
            {riderDetails.carPlateImage ? 'Change Vehicle Photo' : 'Upload Vehicle Photo'}
          </Button>
          {riderDetails.carPlateImage && (
            <Image source={{ uri: riderDetails.carPlateImage }} style={styles.imagePreview} />
          )}
          <Button
            mode="contained"
            onPress={handleRiderSubmit}
            style={styles.submitButton}
            loading={locationLoading}
            contentStyle={styles.buttonContent}
          >
            Complete Registration
          </Button>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );

  // Render passenger booking form
  const renderPassengerForm = () => (
    <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.gradient}>
      {locationLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.subtitle}>Fetching Location...</Text>
        </View>
      ) : position.latitude && position.longitude ? (
        <View style={styles.passengerContainer}>
          <Text variant="headlineMedium" style={styles.formTitle}>
            Where To?
          </Text>
          <TextInput
            label="Search Destination"
            value={destinationQuery}
            onChangeText={setDestinationQuery}
            mode="outlined"
            style={styles.input}
            theme={{ colors: { primary: '#4A00E0' } }}
          />
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => (item.eLoc ? item.eLoc : index.toString())}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleDestinationSelect(item)} style={styles.suggestionItem}>
                <Text style={styles.suggestionText}>{item.placeName}</Text>
              </TouchableOpacity>
            )}
            style={styles.suggestionList}
          />
          {price && route && (
            <View style={styles.routeInfo}>
              <Text style={styles.routeText}>
                Distance: {calculateDistance(position, destination)} km
              </Text>
              <Text style={styles.routeText}>Price: ₹{price}</Text>
              <Button
                mode="contained"
                onPress={handleBookRide}
                style={styles.submitButton}
                contentStyle={styles.buttonContent}
              >
                Book Ride
              </Button>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.subtitle}>Enable location services</Text>
          <Button
            mode="contained"
            onPress={requestLocationPermission}
            style={styles.submitButton}
            contentStyle={styles.buttonContent}
          >
            Retry Location
          </Button>
        </View>
      )}
    </LinearGradient>
  );

  // Render map screen with trip controls
  const renderMapScreen = () => (
    <View style={styles.mapContainer}>
      {position.latitude && position.longitude ? (
        <MapView
          style={styles.map}
          region={{
            latitude: position.latitude,
            longitude: position.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          <UrlTile
            urlTemplate={`https://tiles.mapmyindia.com/tile/{z}/{x}/{y}.png?access_token=${MAPMYINDIA_ACCESS_TOKEN}`}
          />
          <Marker
            coordinate={{ latitude: position.latitude, longitude: position.longitude }}
            title="You"
            pinColor="blue"
          />
          {destination && (
            <Marker
              coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
              title="Destination"
              pinColor="red"
            />
          )}
          {route && <Polyline coordinates={route} strokeColor="#FF4081" strokeWidth={4} />}
          {riderLocations.map((loc, idx) => (
            <Marker
              key={idx}
              coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
              title="Rider"
              pinColor="green"
            />
          ))}
          {trip?.pickup && (
            <Marker
              coordinate={{ latitude: trip.pickup.latitude, longitude: trip.pickup.longitude }}
              title="Pickup"
              pinColor="purple"
            />
          )}
          {trip?.destination && (
            <Marker
              coordinate={{
                latitude: trip.destination.latitude,
                longitude: trip.destination.longitude,
              }}
              title="Destination"
              pinColor="red"
            />
          )}
          {trip?.route && <Polyline coordinates={trip.route} strokeColor="#FF4081" strokeWidth={4} />}
        </MapView>
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.subtitle}>Location unavailable</Text>
        </View>
      )}
      <LinearGradient colors={['rgba(74, 0, 224, 0.9)', 'rgba(142, 45, 226, 0.9)']} style={styles.mapOverlay}>
        <Button
          mode="outlined"
          onPress={handleChangeRole}
          style={styles.actionButton}
          textColor="#FFFFFF"
          contentStyle={styles.buttonContent}
        >
          Switch Role
        </Button>
        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.actionButton}
          textColor="#FFFFFF"
          contentStyle={styles.buttonContent}
        >
          Logout
        </Button>
        {user.role === 'rider' && trip?.status === 'accepted' && (
          <Button
            mode="contained"
            onPress={() => setShowOtpModal(true)}
            style={styles.submitButton}
            contentStyle={styles.buttonContent}
          >
            Enter OTP
          </Button>
        )}
        {user.role === 'rider' && trip?.status === 'ongoing' && (
          <Button
            mode="contained"
            onPress={handleCompleteTrip}
            style={styles.submitButton}
            contentStyle={styles.buttonContent}
          >
            Complete Trip
          </Button>
        )}
        {(user.role === 'rider' || user.role === 'passenger') && trip?.status === 'requested' && (
          <Button
            mode="contained"
            onPress={handleCancelTrip}
            style={styles.submitButton}
            contentStyle={styles.buttonContent}
          >
            Cancel Trip
          </Button>
        )}
        {user.role === 'passenger' && trip?.status === 'accepted' && (
          <Text style={styles.tripText}>OTP: {trip.otp} - Share with Rider</Text>
        )}
        {trip && (
          <View>
            <Text style={styles.tripText}>Price: ₹{trip.price}</Text>
            <Text style={styles.tripText}>Status: {trip.status}</Text>
          </View>
        )}
        {!isOnline && <Text style={styles.offlineText}>Offline</Text>}
        {!wsConnected && <Text style={styles.offlineText}>Real-time updates unavailable</Text>}
      </LinearGradient>
      <Modal visible={showOtpModal} transparent animationType="slide">
        <View style={styles.modal}>
          <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.modalContent}>
            <TextInput
              label="Enter OTP"
              value={otpInput}
              onChangeText={setOtpInput}
              mode="outlined"
              keyboardType="numeric"
              maxLength={6}
              style={styles.input}
              theme={{ colors: { primary: '#4A00E0' } }}
            />
            <Button
              mode="contained"
              onPress={handleStartTrip}
              style={styles.submitButton}
              contentStyle={styles.buttonContent}
            >
              Submit OTP
            </Button>
            <Button
              mode="text"
              onPress={() => setShowOtpModal(false)}
              style={styles.cancelButton}
              textColor="#FFFFFF"
            >
              Cancel
            </Button>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );

  // Calculate distance between two points
  const calculateDistance = (origin, dest) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((dest.latitude - origin.latitude) * Math.PI) / 180;
    const dLon = ((dest.longitude - origin.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((origin.latitude * Math.PI) / 180) *
        Math.cos((dest.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
  };

  // Main render logic
  if (isAuthScreen) return renderAuthScreen();
  if (error)
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.subtitle}>{error}</Text>
        <Button
          onPress={() => {
            setError(null);
            requestLocationPermission();
            setupWebSocket();
          }}
          mode="contained"
          style={styles.submitButton}
          contentStyle={styles.buttonContent}
        >
          Retry
        </Button>
      </View>
    );
  if (!user.role) return renderRoleSelection();
  if (user.role === 'rider' && !user.registrationCompleted) return renderRiderForm();
  if (user.role === 'passenger' && !trip) return renderPassengerForm();
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
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginVertical: 15,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  roleIcon: { width: 60, height: 60 },
  roleTitle: { color: '#4A00E0', fontSize: 22, fontWeight: 'bold', marginTop: 15 },
  roleDescription: { color: '#666', fontSize: 16, textAlign: 'center', marginTop: 5 },
  formScrollContainer: { padding: 20, alignItems: 'center' },
  formTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginTop: 30 },
  formSubtitle: { color: '#E0E0E0', fontSize: 16, marginBottom: 20 },
  input: {
    width: '100%',
    marginVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  uploadButton: {
    marginVertical: 15,
    borderColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 10,
  },
  imagePreview: { width: 220, height: 160, borderRadius: 15, marginVertical: 15 },
  submitButton: {
    marginVertical: 20,
    borderRadius: 10,
    backgroundColor: '#FF4081',
  },
  buttonContent: { paddingVertical: 8 },
  passengerContainer: { padding: 25, alignItems: 'center' },
  suggestionList: {
    width: '100%',
    maxHeight: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginTop: 10,
  },
  suggestionItem: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  suggestionText: { color: '#4A00E0', fontSize: 16 },
  routeInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginTop: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  routeText: { color: '#4A00E0', fontSize: 18, marginVertical: 8 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapOverlay: {
    position: 'absolute',
    top: 60,
    right: 25,
    padding: 20,
    borderRadius: 20,
    width: 220,
    backgroundColor: 'rgba(74, 0, 224, 0.9)',
  },
  actionButton: {
    marginVertical: 10,
    borderColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 10,
  },
  tripText: { color: '#FFFFFF', fontSize: 16, marginVertical: 5 },
  modal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { padding: 25, borderRadius: 20, width: '85%' },
  cancelButton: { marginTop: 10 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offlineText: { color: '#FF5252', fontSize: 14, marginTop: 10 },
  authTitle: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  toggleButton: { marginTop: 15 },
});

export default KariScreen;