import React, { useEffect, useState } from "react";
import { View, Platform, PermissionsAndroid, TouchableOpacity, StyleSheet, Image, Alert } from "react-native";
import Map from "./map";
import WebView from "react-native-webview";
import Geolocation from "@react-native-community/geolocation";
import { ActivityIndicator, Text, TextInput, Button } from "react-native-paper";
import { MMKV } from 'react-native-mmkv';
import { launchImageLibrary } from 'react-native-image-picker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const storage = new MMKV();

const KariScreen = () => {
  const [position, setPosition] = useState({ lt: null, lo: null });
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

  const handleError = (message) => {
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
            title: "Location Permission",
            message: "This app needs access to your location",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Location permission denied');
        }
      }

      if (Platform.OS === 'ios') {
        await new Promise((resolve, reject) => {
          Geolocation.requestAuthorization(
            () => resolve(),
            (err) => reject(err)
          );
        });
      }

      Geolocation.getCurrentPosition(
        ({ coords }) => {
          setPosition({ lt: coords.latitude, lo: coords.longitude });
          setLoading(false);
        },
        (err) => handleError(err.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (err) {
      handleError(err.message);
    }
  };

  const handleRoleSelection = (role) => {
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

    launchImageLibrary(options, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        handleError('Image picker error: ' + response.errorMessage);
        return;
      }
      setRiderDetails({ ...riderDetails, carPlateImage: response.assets[0].uri });
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
    setRiderDetails({ aadhaar: '', carNumber: '', carPlateImage: null });
    setDestination(null);
  };

  const renderRoleSelection = () => (
    <View style={styles.roleSelectionContainer}>
      <Text variant="headlineMedium" style={styles.title}>
        Welcome to Kari!
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Please select your role
      </Text>
      <TouchableOpacity
        style={[styles.button, styles.riderButton]}
        onPress={() => handleRoleSelection('rider')}
      >
        <Text style={styles.buttonText}>I'm a Driver</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.passengerButton]}
        onPress={() => handleRoleSelection('passenger')}
      >
        <Text style={styles.buttonText}>I'm a Passenger</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRiderForm = () => (
    <View style={styles.formContainer}>
      <Text variant="headlineSmall" style={styles.formTitle}>
        Driver Registration
      </Text>
      <TextInput
        label="Aadhaar Number"
        value={riderDetails.aadhaar}
        onChangeText={(text) => setRiderDetails({ ...riderDetails, aadhaar: text })}
        keyboardType="numeric"
        maxLength={12}
        style={styles.input}
      />
      <TextInput
        label="Vehicle Registration Number"
        value={riderDetails.carNumber}
        onChangeText={(text) => setRiderDetails({ ...riderDetails, carNumber: text })}
        style={styles.input}
      />
      <Button
        mode="contained-tonal"
        onPress={handleImageUpload}
        style={styles.uploadButton}
        icon="camera"
      >
        Upload Vehicle Plate
      </Button>
      {riderDetails.carPlateImage && (
        <Image
          source={{ uri: riderDetails.carPlateImage }}
          style={styles.imagePreview}
          resizeMode="contain"
        />
      )}
      <Button
        mode="contained"
        onPress={handleRiderSubmit}
        style={styles.submitButton}
        loading={loading}
      >
        Complete Registration
      </Button>
    </View>
  );

  const renderPassengerForm = () => (
    <View style={styles.formContainer}>
      <Text variant="headlineSmall" style={styles.formTitle}>
        Where are you going?
      </Text>
      <GooglePlacesAutocomplete
        placeholder="Enter destination"
        onPress={handleDestinationSelect}
        query={{
          key: '',
          language: 'en',
          components: 'country:in',
        }}
        fetchDetails={true}
        enablePoweredByContainer={false}
        styles={googlePlacesStyles}
        textInputProps={{
          InputComp: TextInput,
          mode: 'outlined',
          label: 'Destination',
        }}
      />
    </View>
  );

  const renderMapScreen = () => (
    <View style={styles.mapContainer}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: Map({ ...position, destination }) }}
        style={styles.webview}
        onError={() => handleError('Failed to load map')}
      />
      <Button
        mode="outlined"
        onPress={handleChangeRole}
        style={styles.changeRoleButton}
      >
        Change Role
      </Button>
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
    return userRole === 'rider' ? renderRiderForm() : renderMapScreen();// renderPassengerForm()
  }

  return renderMapScreen();
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  roleSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 32,
    color: '#666',
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  riderButton: {
    backgroundColor: '#218c74',
  },
  passengerButton: {
    backgroundColor: '#2c2c54',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
    padding: 24,
  },
  formTitle: {
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  uploadButton: {
    marginVertical: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: 16,
  },
  submitButton: {
    marginTop: 24,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  changeRoleButton: {
    margin: 16,
  },
});

const googlePlacesStyles = {
  container: {
    flex: 0,
  },
  textInputContainer: {
    paddingHorizontal: 0,
  },
  textInput: {
    height: 56,
  },
};

export default KariScreen;