import { View, Text, StyleSheet } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';

export const toastConfig = {
  success: ({ text1, text2 }) => (
    <View style={styles.successToast}>
      {/* <Icon name="check-circle" size={24} color="white" /> */}
      <View style={styles.toastTextContainer}>
        <Text style={styles.toastHeader}>{text1}</Text>
        <Text style={styles.toastMessage}>{text2}</Text>
      </View>
    </View>
  ),
  error: ({ text1, text2 }) => (
    <View style={styles.errorToast}>
      {/* <Icon name="error" size={24} color="white" /> */}
      <View style={styles.toastTextContainer}>
        <Text style={styles.toastHeader}>{text1}</Text>
        <Text style={styles.toastMessage}>{text2}</Text>
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4BB543',
    padding: 16,
    borderRadius: 8,
    width: '90%',
  },
  errorToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4444',
    padding: 16,
    borderRadius: 8,
    width: '90%',
  },
  toastTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  toastHeader: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toastMessage: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
});