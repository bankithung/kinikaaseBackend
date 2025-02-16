import { PermissionsAndroid } from 'react-native';
import { check, request, RESULTS } from 'react-native-permissions';

export const requestAllPermissions = async () => {
  try {
    const permissions = {
      android: [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ],
      ios: [
        'android.permissions.CAMERA',
        'android.permissions.READ_CONTACTS',
      ]
    };

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple(permissions.android);
      return Object.values(granted).every(status => status === PermissionsAndroid.RESULTS.GRANTED);
    }

    // Handle iOS permissions
    const results = await Promise.all(permissions.ios.map(async p => {
      const status = await check(p);
      if (status !== RESULTS.GRANTED) {
        return await request(p);
      }
      return status;
    }));
    
    return results.every(status => status === RESULTS.GRANTED);
  } catch (err) {
    console.error('Permission error:', err);
    return false;
  }
};