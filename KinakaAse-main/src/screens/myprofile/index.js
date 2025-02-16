
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import ProfileScreen from './src/components/profilescreen';
import { toastConfig } from './src/toastconfig';

const MyProfile = () => (
  <SafeAreaProvider>
    <ProfileScreen />
    <Toast config={toastConfig} ref={(ref) => Toast.setRef(ref)} />
  </SafeAreaProvider>
);

export default MyProfile;
