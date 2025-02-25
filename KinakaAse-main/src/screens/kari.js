import React, {useEffect, useState} from 'react';
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
} from 'react-native';
import Map from './map';
import WebView from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';
import {
  ActivityIndicator,
  Text,
  TextInput,
  Button,
  useTheme,
} from 'react-native-paper';
import {MMKV} from 'react-native-mmkv';
import {launchImageLibrary} from 'react-native-image-picker';
import {GooglePlacesAutocomplete} from 'react-native-google-places-autocomplete';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {SafeAreaView} from 'react-native-safe-area-context';

const carHead = '../assets/taxi.png';
const steering="../assets/steering.png";
const passenger="../assets/tourist.png";
const photo="../assets/photo.png";
const carDetail="../assets/carDetail.png";
const id="../assets/id.png";
const switchAcc="../assets/switchs.png";


const storage = new MMKV();

const KariScreen = () => {
  const theme = useTheme();
  const [position, setPosition] = useState({lt: null, lo: null});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [registrationCompleted, setRegistrationCompleted] = useState(false);
  const [riderDetails, setRiderDetails] = useState({
    aadhaar: '',
    carNumber: '',
    carPlateImage: null,
  });
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    try {
      const savedRole = storage.getString('userRole');
      const savedRegistration = storage.getString('registrationCompleted');

      if (savedRole) {
        setUserRole(savedRole);
        setRegistrationCompleted(savedRegistration === 'true');
      }
      setLoading(false);
    } catch (e) {
      handleError('Failed to load user data');
    }
  }, []);

  useEffect(() => {
    if (registrationCompleted) {
      requestLocationPermission();
    }
  }, [registrationCompleted]);

  const handleError = message => {
    setError(message);
    setLoading(false);
    Alert.alert('Error', message);
  };

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Location permission denied');
        }
      }

      if (Platform.OS === 'ios') {
        await new Promise((resolve, reject) => {
          Geolocation.requestAuthorization(
            () => resolve(),
            err => reject(err),
          );
        });
      }

      Geolocation.getCurrentPosition(
        ({coords}) => {
          setPosition({lt: coords.latitude, lo: coords.longitude});
          setLoading(false);
        },
        err => handleError(err.message),
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    } catch (err) {
      handleError(err.message);
    }
  };

  const handleRoleSelection = role => {
    try {
      storage.set('userRole', role);
      setUserRole(role);
      setRegistrationCompleted(false); // Reset registration when changing roles
    } catch (e) {
      handleError('Failed to save user role');
    }
  };

  const validateRiderDetails = () => {
    if (!/^\d{12}$/.test(riderDetails.aadhaar)) {
      handleError('Invalid Aadhaar number');
      return false;
    }
    if (!riderDetails.carNumber.trim()) {
      handleError('Car number is required');
      return false;
    }
    if (!riderDetails.carPlateImage) {
      handleError('Car plate image is required');
      return false;
    }
    return true;
  };

  const handleRiderSubmit = () => {
    if (!validateRiderDetails()) return;

    setLoading(true);
    try {
      storage.set('registrationCompleted', 'true');
      setRegistrationCompleted(true);
    } catch (e) {
      handleError('Failed to submit rider details');
    }
  };

  const handleImageUpload = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) return;
      if (response.errorCode) {
        handleError('Image picker error: ' + response.errorMessage);
        return;
      }
      setRiderDetails({...riderDetails, carPlateImage: response.assets[0].uri});
    });
  };

  const handleDestinationSelect = (data, details) => {
    try {
      const location = details.geometry.location;
      setDestination(location);
      storage.set('registrationCompleted', 'true');
      setRegistrationCompleted(true);
    } catch (e) {
      handleError('Failed to process destination');
    }
  };

  const handleChangeRole = () => {
    storage.delete('userRole');
    storage.delete('registrationCompleted');
    setUserRole(null);
    setRegistrationCompleted(false);
    setRiderDetails({aadhaar: '', carNumber: '', carPlateImage: null});
    setDestination(null);
  };

  const renderRoleSelection = () => (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Image
            source={require(carHead)}
            style={{
              height: 100,
              width: 100,
              flex:1,
              justifyContent:'center',
              alignItems:'center',
              left:20
            }}
          />
          <Text variant="headlineMedium" style={styles.title}>
            Welcome to Kari
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Choose your travel role
          </Text>
        </View>

        <View style={styles.roleCardsContainer}>
          <TouchableOpacity
            style={[
              styles.roleCard,
              {backgroundColor: theme.colors.elevation.level2},
            ]}
            onPress={() => handleRoleSelection('rider')}>
            <Image
            source={require(steering)}
            style={{
              height: 40,
              width: 40, 
              flex:1,
              justifyContent:'center',
              alignItems:'center',
              
            }}
          />
            <Text variant="titleLarge" style={styles.roleTitle}>
              Driver
            </Text>
            <Text variant="bodyMedium" style={styles.roleDescription}>
              Register your vehicle and start earning
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              {backgroundColor: theme.colors.elevation.level2},
            ]}
            onPress={() => handleRoleSelection('passenger')}>
             <Image
            source={require(passenger)}
            style={{
              height: 40,
              width: 40, 
              flex:1,
              justifyContent:'center',
              alignItems:'center',
              
            }}
          />
            <Text variant="titleLarge" style={styles.roleTitle}>
              Passenger
            </Text>
            <Text variant="bodyMedium" style={styles.roleDescription}>
              Find rides and travel comfortably
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const renderRiderForm = () => (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.formScrollContainer}>
        <View style={styles.formHeader}>
          <Text variant="headlineSmall" style={styles.formTitle}>
            Driver Registration
          </Text>
          <Text variant="bodyMedium" style={styles.formSubtitle}>
            Complete your profile to start accepting rides
          </Text>
        </View>

        <TextInput
          label="Aadhaar Number"
          value={riderDetails.aadhaar}
          onChangeText={text =>
            setRiderDetails({...riderDetails, aadhaar: text})
          }
          mode="outlined"
          keyboardType="numeric"
          maxLength={12}
          left={<TextInput.Icon icon={require(id)} />}
          style={styles.input}
          error={!!error && error.includes('Aadhaar')}
          theme={{
            colors: {
              primary: '#6200EE',    // Label and border color when focused
              placeholder: '#FF0000' // Label color when not focused
            }
          }}
        />

        <TextInput
          label="Vehicle Registration Number"
          value={riderDetails.carNumber}
          onChangeText={text =>
            setRiderDetails({...riderDetails, carNumber: text})
          }
          mode="outlined"
          left={<TextInput.Icon icon={require(carDetail)} />}
          style={styles.input}
          error={!!error && error.includes('Car number')}
          theme={{
            colors: {
              primary: '#6200EE',    // Label and border color when focused
              placeholder: '#FF0000' // Label color when not focused
            }
          }}
        />

        <View style={styles.uploadSection}>
          <Text variant="bodyMedium" style={styles.uploadLabel}>
            Vehicle Plate Photo
          </Text>
          <Button
            mode="outlined"
            onPress={handleImageUpload}
            style={styles.uploadButton}
            icon={require(photo)} 
            contentStyle={styles.uploadButtonContent}>
            {riderDetails.carPlateImage ? 'Change Photo' : 'Upload Photo'}
          </Button>
          {riderDetails.carPlateImage && (
            <Image
              source={{uri: riderDetails.carPlateImage}}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          )}
        </View>

        <Button
          mode="contained"
          onPress={handleRiderSubmit}
          style={styles.submitButton}
          loading={loading}
          labelStyle={styles.buttonLabel}>
          Complete Registration
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderPassengerForm = () => (
    <View style={styles.container}>
      <View style={styles.searchHeader}>
        <Text variant="headlineSmall" style={styles.formTitle}>
          Where to?
        </Text>
        <Text variant="bodyMedium" style={styles.formSubtitle}>
          Enter your destination to find rides
        </Text>
      </View>

      <GooglePlacesAutocomplete
        placeholder="Search destination..."
        onPress={handleDestinationSelect}
        query={{
          key: 'YOUR_GOOGLE_API_KEY',
          language: 'en',
          components: 'country:in',
        }}
        fetchDetails={true}
        enablePoweredByContainer={false}
        styles={googlePlacesStyles(theme)}
        textInputProps={{
          mode: 'outlined',
          left: <TextInput.Icon icon="map-marker" />,
          style: {backgroundColor: theme.colors.background},
        }}
        renderLeftButton={() => (
          <View style={styles.searchIconContainer}>
            <Icon name="magnify" size={24} color={theme.colors.onSurface} />
          </View>
        )}
      />
    </View>
  );

  const renderMapScreen = () => (
    <View style={styles.mapContainer}>
      <WebView
        originWhitelist={['*']}
        source={{html: Map({...position, destination})}}
        style={styles.webview}
        onError={() => handleError('Failed to load map')}
      />

      <View style={styles.mapOverlay}>
        <Button
          mode="contained-tonal"
          onPress={handleChangeRole}
          style={styles.changeRoleButton}
          icon={require(switchAcc)}
          contentStyle={styles.changeRoleContent}>
          Switch Role
        </Button>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button onPress={() => setError(null)}>Try Again</Button>
      </View>
    );
  }

  if (!userRole) return renderRoleSelection();
  if (!registrationCompleted) {
    return userRole === 'rider' ? renderRiderForm() : renderMapScreen(); // renderPassengerForm()
  }

  return renderMapScreen();
};
const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  title: {
    marginTop: 16,
    color: '#6200EE',
    fontWeight: '600',
  },
  subtitle: {
    color: '#666666',
    marginTop: 8,
  },
  roleCardsContainer: {
    marginTop: 24,
    gap: 16,
  },
  roleCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
  },
  roleTitle: {
    marginTop: 16,
    color: '#6200EE',
    fontWeight: '600',
  },
  roleDescription: {
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
  formScrollContainer: {
    padding: 24,
  },
  formHeader: {
    marginBottom: 32,
    alignItems: 'center',
  },
  formTitle: {
    color: '#6200EE',
    fontWeight: '600',
  },
  formSubtitle: {
    color: '#666666',
    marginTop: 8,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
  },
  uploadSection: {
    marginVertical: 24,
  },
  uploadLabel: {
    color: '#666666',
    marginBottom: 8,
  },
  uploadButton: {
    borderRadius: 8,
    borderColor: '#CCCCCC',
  },
  uploadButtonContent: {
    height: 48,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 16,
    backgroundColor: '#F5F5F5',
  },
  submitButton: {
    marginTop: 32,
    borderRadius: 8,
    paddingVertical: 6,
    backgroundColor: '#6200EE',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  changeRoleButton: {
    borderRadius: 8,
  },
  changeRoleContent: {
    flexDirection: 'row-reverse',
  },
  searchHeader: {
    padding: 24,
    paddingBottom: 16,
  },
  searchIconContainer: {
    justifyContent: 'center',
    paddingLeft: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF0000',
    marginBottom: 16,
    textAlign: 'center',
  },
});

const googlePlacesStyles = () =>
  StyleSheet.create({
    container: {
      flex: 0,
      paddingHorizontal: 24,
    },
    textInputContainer: {
      paddingHorizontal: 0,
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      borderBottomWidth: 0,
    },
    textInput: {
      height: 56,
      backgroundColor: '#F5F5F5',
      borderRadius: 8,
      paddingLeft: 48,
      fontSize: 16,
      color: '#000000',
    },
    listView: {
      backgroundColor: '#F5F5F5',
      borderRadius: 8,
      marginTop: 8,
      elevation: 2,
    },
    description: {
      color: '#000000',
    },
    predefinedPlacesDescription: {
      color: '#666666',
    },
  });

export default KariScreen;
