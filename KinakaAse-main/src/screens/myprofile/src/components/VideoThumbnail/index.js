import React, { memo, useState } from 'react';
import { TouchableOpacity, View, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
// import Icon from 'react-native-vector-icons/FontAwesome';
import styles from './styles';
import LongPressModal from '../LongPressModal';

const { width } = Dimensions.get('window');

const VideoThumbnail = memo(({ videoUrl, index, onPress, onLongPress }) => {
  const [isLongPressActive, setIsLongPressActive] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.8}
        onPress={() => onPress(index)}
        onLongPress={() => {
          setIsLongPressActive(true);
          onLongPress?.(index);
        }}
        delayLongPress={300}
      >
        <FastImage
          source={{ uri: `https://img.youtube.com/vi/${videoUrl}/0.jpg` }}
          style={styles.thumbnail}
          resizeMode={FastImage.resizeMode.cover}
        />
        <View style={styles.playButton}>
          {/* <Icon name="play" size={20} color="rgba(255,255,255,0.9)" /> */}
        </View>
      </TouchableOpacity>

      <LongPressModal
        visible={isLongPressActive}
        videoUrl={videoUrl}
        onClose={() => setIsLongPressActive(false)}
      />
    </>
  );
});

export default VideoThumbnail;