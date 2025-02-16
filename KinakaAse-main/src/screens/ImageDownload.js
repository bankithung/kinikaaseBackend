import React from 'react';
import { View, Image, Button, Alert, TouchableOpacity } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';
const download="../../assets/download.png"
const ImageViewer = ({ route }) => {
  const { imageUri } = route.params.type; // Get the imageUri from navigation params
  console.log(route.params.type)
  
  const downloadImage = async () => {
    const { fs } = RNBlobUtil;
    const PictureDir = fs.dirs.PictureDir; // Android Pictures directory
    const filePath = `${PictureDir}/image_${Date.now()}.jpg`;

    

    RNBlobUtil.config({
      fileCache: true,
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        path: filePath,
        description: 'Downloading image.',
      },
    })
      .fetch('GET', route.params.type)
      .then((res) => {
        Alert.alert('Success', `Image downloaded to: ${res.path()}`);
      })
      .catch((error) => {
        console.error(error);
        Alert.alert('Error', 'Failed to download image.');
      });
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' ,backgroundColor:'#2D2C33'}}>
      
      <Image
        source={{ uri: route.params.type }}
        style={{ flex: 1, width: '100%', height: '100%', marginBottom: 20 }}
      />
   
      <TouchableOpacity onPress={downloadImage}>
        <Image source={require(download)} style={{ height: 40, width: 40,bottom:10 ,tintColor:'white'}} />
        
      </TouchableOpacity>
    </View>
  );
};

export default ImageViewer;
