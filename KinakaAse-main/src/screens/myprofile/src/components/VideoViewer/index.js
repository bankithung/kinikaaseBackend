import React, {useRef} from 'react';
import {
  Modal,
  FlatList,
  View,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import Video from 'react-native-video';
// import Icon from 'react-native-vector-icons/FontAwesome';
import styles from './styles';

const {width, height} = Dimensions.get('window');
const closeView = '../../assets/closeView.png';

const VideoViewer = ({visible, videos, initialIndex, onClose}) => {
  const flatListRef = useRef(null);

  const handleScrollEnd = e => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    flatListRef.current?.scrollToIndex({index: newIndex});
  };

  return (
    <Modal visible={visible} transparent={false}>
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={videos}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          renderItem={({item}) => (
            <View style={styles.videoContainer}>
              <Video
                source={{uri: `https://www.youtube.com/watch?v=${item}`}}
                style={styles.fullscreenVideo}
                resizeMode="contain"
                controls
                repeat
              />
            </View>
          )}
          onMomentumScrollEnd={handleScrollEnd}
        />

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Image
            source={require(closeView)}
            style={{tintColor: 'white', height: 15, width: 15}}
          />{' '}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default VideoViewer;
