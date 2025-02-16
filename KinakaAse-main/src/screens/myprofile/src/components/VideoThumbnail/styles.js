import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const THUMBNAIL_SIZE = width / 3.06;

export default StyleSheet.create({
  container: {
    margin: 1,
    position: 'relative',
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 1.5,
    backgroundColor: '#000',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -10 }],
  },
});