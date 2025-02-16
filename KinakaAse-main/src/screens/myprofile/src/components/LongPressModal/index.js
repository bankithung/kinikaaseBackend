import React from 'react';
import {Modal, View, Dimensions, TouchableOpacity, Image} from 'react-native';
import Video from 'react-native-video';
import styles from './styles';

const {width, height} = Dimensions.get('window');
const closeView = '../../assets/closeView.png';

const LongPressModal = ({visible, videoUrl, onClose}) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.modalContainer}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Image
          source={require(closeView)}
          style={{tintColor: 'white', height: 15, width: 15}}
        />
      </TouchableOpacity>
      <Video
        source={{uri: `https://www.youtube.com/watch?v=${videoUrl}`}}
        style={styles.video}
        paused={!visible}
        resizeMode="contain"
        repeat
        controls
      />
    </View>
  </Modal>
);

export default LongPressModal;
