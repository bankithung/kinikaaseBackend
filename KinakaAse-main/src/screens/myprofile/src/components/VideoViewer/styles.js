import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    position: 'relative',
  },
  videoContainer: {
    width,
    height,
    justifyContent: 'center',
  },
  fullscreenVideo: {
    width,
    height: height * 0.8,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    zIndex: 1,
  },
});