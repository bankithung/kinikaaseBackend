

import {View, TouchableOpacity, Text, StyleSheet, Image, Alert} from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import useGlobal from '../../core/global';
import {useState} from 'react';
import axios from 'axios';
import {ADDRESS} from '../../core/api';
import utils from '../../core/utils';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
const close = '../../assets/close.png';
const sendMessageIcon = '../../assets/send.png';
const uploadNew = '../../assets/newProfile.png';


const ViewAnyImage = ({route, navigation}) => {
  const {type} = route.params;
  const [selectedImage, setSelectedImage] = useState(type);
    

  //utils.log(selectedImage);
  // Alert.alert("type",type)

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        activeOpacity={0.8}>
        <Image
          source={require(close)}
          style={{
            height: 25,
            width: 25,
            margin: 5,
            tintColor: 'white',
          }}
        />
      </TouchableOpacity>

      {/* <Image source={{ uri: image.uri  }} style={styles.image} /> */}
      <ImageViewer
        imageUrls={[{url: type}]}
        enableSwipeDown
        swipeDownThreshold={50}
        style={styles.image}
        //onSwipeDown={onClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 7,
    backgroundColor: 'rgba(85, 81, 81, 0.5)',

    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
  },
  send: {
    position: 'absolute',
    bottom: 50,
    right: 25,
    zIndex: 1,
    padding: 10,
    backgroundColor: 'rgba(75, 196, 27, 0.5)',

    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  NewImage:{
    position: 'absolute',
    top: 50,
    right: 25,
    zIndex: 1,
    padding: 10,
    backgroundColor: 'rgba(75, 196, 27, 0.5)',

    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default ViewAnyImage;
