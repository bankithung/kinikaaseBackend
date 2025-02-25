import React, { useState, useCallback } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { View, Text, Image, TouchableOpacity, Modal, TextInput, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { launchImageLibrary } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import useGlobal from "../core/global";
import utils from "../core/utils";
import Thumbnail from "../common/Thumbnail";

function ProfileImage() {
  const uploadThumbnail = useGlobal(state => state.uploadThumbnail);
  const user = useGlobal(state => state.user);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = useCallback(async () => {
    launchImageLibrary({ includeBase64: false, mediaType: 'photo' }, async (response) => {
      if (response.didCancel) return;
      const file = response.assets[0];
      if (!file) return;

      try {
        setUploading(true);
        const compressedImage = await ImageResizer.createResizedImage(
          file.uri,
          800,
          800,
          'JPEG',
          70,
          0,
          null
        );

        const formData = new FormData();
        formData.append('image', {
          uri: compressedImage.uri,
          name: file.fileName || `thumbnail_${Date.now()}.jpg`,
          type: file.type || 'image/jpeg',
        });

        await uploadThumbnail(formData);
        utils.toast('Thumbnail uploaded successfully');
      } catch (error) {
        utils.toast('Error uploading image');
        console.error('Image upload error:', error);
      } finally {
        setUploading(false);
      }
    });
  }, [uploadThumbnail]);

  return (
    <TouchableOpacity 
      style={styles.profileImageContainer}
      onPress={handleImageUpload}
      disabled={uploading}
    >
      <Thumbnail
        url={user.thumbnail}
        size={180}
        style={styles.profileImage}
      />
      {uploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      <View style={styles.editIconContainer}>
        <FontAwesomeIcon icon='pencil' size={15} color='black' />
      </View>
    </TouchableOpacity>
  );
}

function ProfileLogout() {
  const logout = useGlobal(state => state.logout);

  return (
    <TouchableOpacity
      onPress={logout}
      style={styles.logoutButton}
    >
      <FontAwesomeIcon
        icon='right-from-bracket'
        size={20}
        color='#333'
        style={{ marginRight: 12 }}
      />
      <Text style={styles.logoutText}>Logout</Text>
    </TouchableOpacity>
  );
}

function EditModal({ visible, initialValue, onClose, onSave, isBio = false }) {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      await onSave(value);
      onClose();
    } catch (error) {
      utils.toast('Error saving changes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TextInput
            style={styles.modalInput}
            value={value}
            onChangeText={setValue}
            multiline={isBio}
            placeholder={isBio ? 'Enter your bio' : 'Enter your name'}
            placeholderTextColor="#666"
            autoFocus={true}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#333" />
              ) : (
                <Text style={styles.modalButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProfileScreen() {
  const user = useGlobal(state => state.user);
  const updateProfile = useGlobal(state => state.updateProfile);
  const [editField, setEditField] = useState(null);
  const [currentValue, setCurrentValue] = useState('');

  const handleEditStart = (field, value) => {
    setEditField(field);
    setCurrentValue(value);
  };

  const handleSave = async (value) => {
    await updateProfile({ [editField]: value });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Daily Profile</Text>
      </View>
      <ProfileImage />
      <View style={styles.content}>
        <TouchableOpacity onPress={() => handleEditStart('name', user.name)}>
          <Text style={styles.name}>{user.name || 'Anonymous Citizen'}</Text>
        </TouchableOpacity>
        <Text style={styles.username}>@{user.username}</Text>

        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>TELEPHONE</Text>
          <Text style={styles.infoValue}>
            {user.phone?.replace(/(\d{2})(\d{5})(\d{5})/, '+$1 $2 $3') || 'Not Listed'}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.infoContainer}
          onPress={() => handleEditStart('bio', user.bio)}
        >
          <Text style={styles.infoLabel}>ABOUT THIS PERSON</Text>
          <Text style={styles.infoValue}>{user.bio || 'A mysterious figure from the newsroom'}</Text>
        </TouchableOpacity>

        <ProfileLogout />
      </View>

      <EditModal
        visible={!!editField}
        initialValue={currentValue}
        onClose={() => setEditField(null)}
        onSave={handleSave}
        isBio={editField === 'bio'}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E9', // Parchment-like beige
  },
  header: {
    backgroundColor: '#333',
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  headerTitle: {
    fontFamily: 'Times New Roman',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  profileImageContainer: {
    marginTop: 20,
    alignSelf: 'center',
    position: 'relative',
  },
  profileImage: {
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 90,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#D3C7A0', // Sepia tone
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  name: {
    fontFamily: 'Times New Roman',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 5,
  },
  username: {
    fontFamily: 'Times New Roman',
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  infoContainer: {
    width: '90%',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#999',
    marginVertical: 5,
  },
  infoLabel: {
    fontFamily: 'Times New Roman',
    fontSize: 14,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    fontFamily: 'Times New Roman',
    fontSize: 18,
    color: '#000',
    marginTop: 5,
  },
  logoutButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D3C7A0', // Sepia tone
    marginTop: 40,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#000',
  },
  logoutText: {
    fontFamily: 'Times New Roman',
    fontWeight: 'bold',
    color: '#333',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#F5F1E9',
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#000',
  },
  modalInput: {
    backgroundColor: '#FFF',
    color: '#000',
    borderRadius: 5,
    padding: 15,
    fontSize: 18,
    fontFamily: 'Times New Roman',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#999',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    backgroundColor: '#D3C7A0',
    padding: 15,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  saveButton: {
    backgroundColor: '#333',
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontFamily: 'Times New Roman',
  },
});

export default ProfileScreen;