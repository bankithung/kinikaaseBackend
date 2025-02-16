// import React from 'react';
// import {
//   View,
//   TouchableOpacity,
//   Image,
//   ActivityIndicator,
//   StyleSheet
// } from 'react-native';
// import ImageViewer from 'react-native-image-zoom-viewer';

// const ImageViewerComponent = ({
//   visible,
//   onClose,
//   selectedImage,
//   loading,
//  // onUpload,
//   closeIcon,
//   uploadIcon
// }) => {
//   if (!visible) return null;

//   return (
//     <View style={styles.container}>
//       <ImageViewer
//         imageUrls={[{ url: selectedImage?.uri }]}
//         enableSwipeDown
//         swipeDownThreshold={50}
//         onSwipeDown={onClose}
//         renderHeader={() => (
//           <View style={styles.header}>
//             <TouchableOpacity style={styles.closeButton} onPress={onClose}>
//               <Image source={closeIcon} style={styles.icon} />
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.uploadButton}
//             //   onPress={onUpload}
//               disabled={loading}>
//               {loading ? (
//                 <ActivityIndicator color="white" />
//               ) : (
//                 <Image source={uploadIcon} style={styles.icon} />
//               )}
//             </TouchableOpacity>
//           </View>
//         )}
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.9)',
//     position: 'absolute',
//     width: '100%',
//     height: '100%',
//     zIndex: 999,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 20,
//     paddingTop: 50,
//     width: '100%',
//     position: 'absolute',
//     top: 0,
//     zIndex: 1,
//   },
//   closeButton: {
//     padding: 10,
//   },
//   uploadButton: {
//     padding: 10,
//   },
//   icon: {
//     width: 24,
//     height: 24,
//     tintColor: 'white',
//   },
// });

// export default ImageViewerComponent;

import {View, TouchableOpacity, Text, StyleSheet, Image} from 'react-native';
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


const ImageViewerComponent = ({route, navigation}) => {
  const {image, connectionId} = route.params;
  const messageSend = useGlobal(state => state.messageSend);
  const [imageLink, setImageLink] = useState('');
  const [selectedImage, setSelectedImage] = useState(image);
    

  utils.log(selectedImage);

const selectImage = async () => {
    launchImageLibrary({ includeBase64: false }, async (response) => {
      if (response.didCancel || response.errorCode) return;
  
      try {
        const file = response.assets[0];
        
        // Compress the image
        const compressedImage = await ImageResizer.createResizedImage(
          file.uri,    // image URI
          1024,        // max width
          1024,        // max height
          'JPEG',      // compress format
          70,          // quality (0-100)
          0,           // rotation
          null,        // output path (null for default)
          false        // keep metadata
        );
  
        // Create a new object with the compressed image and original metadata
        const compressedFile = {
          uri: compressedImage.uri,
          type: file.type || 'image/jpeg', // Fallback to 'image/jpeg' if type is missing
          fileName: file.fileName || `image_${Date.now()}.jpg`, // Fallback filename
        };
  
        setSelectedImage(compressedFile);
  
        navigation.navigate('viewImage', { 
          image: compressedFile,
          connectionId: connectionId // Pass connectionId directly
        });
      } catch (error) {
        console.log('Image compression failed:', error);
        // Fallback to original image if compression fails
        setSelectedImage(file);
        navigation.navigate('viewImage', {
          image: file,
          connectionId: connectionId
        });
      }
    });
  };



  const onSendI = async () => {
    // const cleaned = imageLink
    const cleaned = await uploadImage();
    console.log('from<: ', cleaned);
    if (cleaned.length === 0) return;
    messageSend(connectionId, cleaned, 'image');
    setImageLink('');
  };

  const uploadImage = async () => {
    if (!selectedImage) {
      alert('Please select an image first');
      return;
    }

    const formData = new FormData();
    formData.append('image', {
      uri: selectedImage.uri,
      type: selectedImage.type,
      name: selectedImage.fileName,
    });

    try {
      const response = await axios.post(
        `https://${ADDRESS}/chat/upload/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      console.log('Image uploaded successfully:', response.data);
      setImageLink(response.data.image);
      console.log('message:::   ', imageLink);
      navigation.goBack();
      return response.data.image;
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

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

      <TouchableOpacity
        onPress={() => onSendI()}
        style={styles.send}
        activeOpacity={0.8}>
        <Image
          source={require(sendMessageIcon)}
          style={{
            height: 20,
            width: 20,
            margin: 5,
            tintColor: 'white',
          }}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => selectImage()}
        style={styles.NewImage}
        activeOpacity={0.8}>
        <Image
          source={require(uploadNew)}
          style={{
            height: 20,
            width: 20,
            margin: 5,
            tintColor: 'white',
          }}
        />
      </TouchableOpacity>

      {/* <Image source={{ uri: image.uri  }} style={styles.image} /> */}
      <ImageViewer
        imageUrls={[{url: selectedImage?.uri}]}
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

export default ImageViewerComponent;
