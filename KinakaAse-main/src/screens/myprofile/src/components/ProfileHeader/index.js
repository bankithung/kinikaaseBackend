import React, {useState, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  Text,
  ImageBackground,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import ImageViewer from 'react-native-image-zoom-viewer';
import {launchImageLibrary} from 'react-native-image-picker';
import {check, PERMISSIONS, request} from 'react-native-permissions';
import Toast from 'react-native-toast-message';
import ImageResizer from 'react-native-image-resizer';
import styles from './styles';
import { ADDRESS } from '../../../../../core/api';
import useGlobal from '../../../../../core/global';

const testProfile =
  'https://www.slashfilm.com/img/gallery/one-piece-film-red-showcases-luffys-new-transformation-for-the-first-time/l-intro-1667316814.jpg';
const backgroundImage =
  'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8dHJlZXxlbnwwfHwwfHx8MA%3D%3D'; // Replace with your background image URL
const plusIcon = '../../assets/plus.png';
const editIcon = '../../assets/edit.png';
const closeView = '../../assets/closeView.png';
const uploadNew = '../../assets/newProfile.png';

const ProfileHeader = () => {
  
 
  const [viewerVisible, setViewerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [fullName, setFullName] = useState('New FUll Name');
  const [username, setUsername] = useState('New User Name');
  const [about, setAbout] = useState('Update Abouts');
  const [toggle,setToggleFollowUnfollow]=useState(true)
  const user = useGlobal(state => state.user)
  const [profileImage, setProfileImage] = useState({uri: 'https://'+ADDRESS+user.thumbnail});
  const [backgroundImageUri, setBackgroundImageUri] = useState({
    uri: 'https://'+ADDRESS+user.user_Bg_thumbnail,
  });



  const handleViewProfileImage = useCallback(() => setViewerVisible(true), []);

  const handleImageUpload = useCallback(async type => {
    try {
      const permission = Platform.select({
        android: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
        ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
      });

      const status = await check(permission);
      if (status !== 'granted') {
        const requestStatus = await request(permission);
        if (requestStatus !== 'granted') throw new Error('Permission required');
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel) return;

      setLoading(true);

      const resizedImage = await ImageResizer.createResizedImage(
        result.assets[0].uri,
        1024,
        1024,
        'JPEG',
        80,
      );

      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (type === 'profile') {
        setProfileImage({uri: resizedImage.uri});
      } else {
        setBackgroundImageUri({uri: resizedImage.uri});
      }

      Toast.show({
        type: 'success',
        text1: 'Image Updated',
        text2: `Your ${type} image has been updated successfully`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error.message || 'Failed to update image',
      });
    } finally {
      setLoading(false);
      setViewerVisible(false);
    }
  }, []);

  const handleEditProfile = () => {
    setEditModalVisible(true);
  };

  const handleSaveProfile = () => {
    // Simulate saving data
    Toast.show({
      type: 'success',
      text1: 'Profile Updated',
      text2: 'Your profile has been updated successfully',
    });
    setEditModalVisible(false);
  };

  return (
    <ImageBackground source={backgroundImageUri} style={styles.backgroundImage}>
      <View style={styles.overlay} />
      <View style={styles.header}>
        <View style={styles.profileContainer}>
          <TouchableOpacity
            onPress={handleViewProfileImage}
            activeOpacity={0.85}
            disabled={loading}>
            <FastImage
              source={profileImage}
              style={styles.profileImage}
              resizeMode={FastImage.resizeMode.cover}
            />

            <View style={styles.editIcon}>
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Image source={require(plusIcon)} style={styles.plusIcon} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        

        <View style={{left:190,bottom:150}}>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={handleEditProfile}>
            <Image source={require(editIcon)} style={styles.plusIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={viewerVisible} transparent>
        <View style={styles.modalContainer}>
          <ImageViewer
            imageUrls={[{url: profileImage.uri}]}
            enableSwipeDown
            swipeDownThreshold={50}
            onSwipeDown={() => setViewerVisible(false)}
            renderHeader={() => (
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setViewerVisible(false)}>
                  <Image source={require(closeView)} style={styles.plusIcon} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => handleImageUpload('profile')}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Image
                      source={require(uploadNew)}
                      style={styles.plusIcon}
                    />
                  )}
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalContainer}>
          <ScrollView
            style={styles.editModalScrollView}
            contentContainerStyle={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Image
                  source={require(closeView)}
                  style={[styles.plusIcon, {tintColor: 'black'}]}
                />
              </TouchableOpacity>
            </View>

            {/* Display Current Profile Picture */}
            <View style={styles.currentImageContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.uploadImageButton, {bottom: 0, width: '100%'}]}
                onPress={() => handleImageUpload('background')}>
                {/* <Text style={styles.uploadImageButtonText}>
                  Change Background Image
                </Text> */}
                <FastImage
                  source={backgroundImageUri}
                  style={styles.currentBackgroundImage}
                  resizeMode={FastImage.resizeMode.cover}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.uploadImageButton,
                  {position: 'absolute', top: 100, left: 20},
                ]}
                activeOpacity={0.8}
                onPress={() => handleImageUpload('profile')}>
                <FastImage
                  source={profileImage}
                  style={styles.currentProfileImage}
                  resizeMode={FastImage.resizeMode.cover}
                />
              </TouchableOpacity>

              {/* Display Current Background Image */}
              {/* <FastImage
                source={backgroundImageUri}
                style={styles.currentBackgroundImage}
                resizeMode={FastImage.resizeMode.cover}
              /> */}
            </View>
            <Text style={styles.textHead}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="New Full Name"
              value={fullName}
              onChangeText={setFullName}
            />
            <Text style={styles.textHead}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="New Username"
              value={username}
              onChangeText={setUsername}
            />
            <Text style={styles.textHead}>Bio</Text>
            <TextInput
              style={styles.input}
              placeholder="Update About"
              value={about}
              onChangeText={setAbout}
              multiline
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ImageBackground>
  );
};

export default ProfileHeader;
