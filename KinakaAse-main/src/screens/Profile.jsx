// import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome"
// import { View, Text, Image, TouchableOpacity } from "react-native"
// import { launchImageLibrary } from 'react-native-image-picker'
// import useGlobal from "../core/global"
// import utils from "../core/utils"
// import Thumbnail from "../common/Thumbnail"




// function ProfileImage() {
// 	const uploadThumbnail = useGlobal(state => state.uploadThumbnail)
// 	const user = useGlobal(state => state.user)

// 	return (
// 		<TouchableOpacity 
// 			style={{ marginBottom: 20 }}
// 			onPress={() => {
// 				launchImageLibrary({ includeBase64: true }, (response) => {
// 					//utils.log('launchImageLibrary', response)
// 					if (response.didCancel) return
// 					const file = response.assets[0]
// 					uploadThumbnail(file)
// 				})
// 			}}
// 		>
// 			<Thumbnail
// 				url={user.thumbnail}
// 				size={180}
// 			/>
// 		{console.log("thumbnail===>>> ",user.thumbnail)}
// 			<View
// 				style={{
// 					position: 'absolute',
// 					bottom: 0,
// 					right: 0,
// 					backgroundColor: '#202020',
// 					width: 40,
// 					height: 40,
// 					borderRadius: 20,
// 					alignItems: 'center',
// 					justifyContent: 'center',
// 					borderWidth: 3,
// 					borderColor: 'white'
// 				}}
// 			>
// 				<FontAwesomeIcon
// 					icon='pencil'
// 					size={15}
// 					color='#d0d0d0'
// 				/>
// 			</View>
// 		</TouchableOpacity>
// 	)
// }


function ProfileLogout() {
	const logout = useGlobal(state => state.logout)

	return (
		<TouchableOpacity
			onPress={logout}
			style={{
				flexDirection: 'row',
				height: 52,
				borderRadius: 26,
				alignItems: 'center',
				justifyContent: 'center',
				paddingHorizontal: 26,
				backgroundColor: '#202020',
				marginTop: 40
			}}
		>
			<FontAwesomeIcon
				icon='right-from-bracket'
				size={20}
				color='#d0d0d0'
				style={{ marginRight: 12}}
			/>
			<Text
				style={{
					fontWeight: 'bold',
					color: '#d0d0d0'
				}}
			>
				Logout
			</Text>
		</TouchableOpacity>
	)
}



// function ProfileScreen() {
// 	const user = useGlobal(state => state.user)
// 	return (
// 		<View
// 			style={{
// 				flex: 1,
// 				alignItems: 'center',
// 				paddingTop: 100
// 			}}
// 		>
// 			<ProfileImage />

// 			<Text 
// 				style={{
// 					textAlign: 'center',
// 					color: 'white',
// 					fontSize: 20,
// 					fontWeight: 'bold',
// 					marginBottom: 6
// 				}}
// 			>
// 				{user.name}
// 			</Text>
// 			<Text
// 				style={{
// 					textAlign: 'center',
// 					color: 'white',
// 					fontSize: 14
// 				}}
// 			>
// 				@{user.username}
// 			</Text>

// 			<ProfileLogout />

// 		</View>
// 	)
// }

// export default ProfileScreen

import React, { useState, useCallback } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome"
import { View, Text, Image, TouchableOpacity, Modal, TextInput, StyleSheet, ActivityIndicator } from "react-native"
import { launchImageLibrary } from 'react-native-image-picker'
import ImageResizer from 'react-native-image-resizer';
import useGlobal from "../core/global"
import utils from "../core/utils"
import Thumbnail from "../common/Thumbnail"

const KEYBOARD_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['d', 'y', 'x', 'c', 'v', 'b', 'n', 'm', '☒']
];

function ProfileImage() {
  const uploadThumbnail = useGlobal(state => state.uploadThumbnail);
  const user = useGlobal(state => state.user);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = useCallback(async (file) => {
    try {
      setUploading(true);
      const compressedImage = await ImageResizer.createResizedImage(
        file.uri,
        800,  // maxWidth
        800,  // maxHeight
        'JPEG',  // compressFormat
        70,     // quality
        0,      // rotation
        null,   // outputPath
        false   // keepMeta
      );
      await uploadThumbnail({
        ...file,
        uri: compressedImage.uri,
        base64: `data:image/jpeg;base64,${compressedImage.base64}`
      });
    } catch (error) {
      utils.toast('Error compressing or uploading image');
      console.error('Image upload error:', error);
    } finally {
      setUploading(false);
    }
  }, [uploadThumbnail]);

  return (
    <TouchableOpacity 
      style={{ marginBottom: 20 }}
      onPress={() => {
        launchImageLibrary({ includeBase64: true }, (response) => {
          if (response.didCancel) return;
          const file = response.assets[0];
          
		  uploadThumbnail(file)
        });
      }}
      disabled={uploading}
    >
      <Thumbnail
        url={user.thumbnail}
        size={180}
      />
      {uploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      <View style={styles.editIconContainer}>
        <FontAwesomeIcon icon='pencil' size={15} color='white' />
      </View>
    </TouchableOpacity>
  );
}

function EditModal({ visible, initialValue, onClose, onSave, isBio = false }) {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const handleKeyPress = (key) => {
    if (key === '☒') {
      setValue(prev => prev.slice(0, -1));
    } else {
      setValue(prev => prev + key);
    }
  };

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
            style={styles.input}
            value={value}
            onChangeText={setValue}
            multiline={isBio}
            placeholder={isBio ? 'Enter your bio' : 'Enter your name'}
            placeholderTextColor="#888"
            autoFocus={true}
          />
          
         

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
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
    <View style={styles.container}>
      <ProfileImage />

      
        <Text style={styles.name}>{user.name || 'Enter your name'}</Text>
     

	  <View style={styles.infoContainer}>
		<TouchableOpacity onPress={() => handleEditStart('name', user.name)}>
        <Text style={styles.infoLabel}>Name</Text>
        <Text style={styles.infoValue}>
		<Text style={styles.username}>{user.username}</Text>        </Text>
		</TouchableOpacity>
      </View>

      

      <View style={styles.infoContainer}>
        <Text style={styles.infoLabel}>Phone</Text>
        <Text style={styles.infoValue}>
          {user.phone?.replace(/(\d{2})(\d{5})(\d{5})/, '+$1 $2 $3')}
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.infoContainer}
        onPress={() => handleEditStart('bio', user.bio)}
      >
        <Text style={styles.infoLabel}>About</Text>
        <Text style={styles.infoValue}>{user.bio || 'Live a little'}</Text>
      </TouchableOpacity>

      <ProfileLogout />

      <EditModal
        visible={!!editField}
        initialValue={currentValue}
        onClose={() => setEditField(null)}
        onSave={handleSave}
        isBio={editField === 'bio'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    // backgroundColor: '#1a1a1a',
  },
  name: {
    color: 'black',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 8,
    padding: 8,
  },
  username: {
    color: 'black',
    fontSize: 16,
    marginBottom: 20,
  },
  infoContainer: {
    width: '80%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    color: 'black',
    fontSize: 16,
	left:5
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  input: {
    backgroundColor: '#333',
    color: 'black',
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    marginBottom: 20,
    minHeight: 60,
  },
  keyboardContainer: {
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 10,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 2,
  },
  keyButton: {
    backgroundColor: '#444',
    borderRadius: 5,
    margin: 2,
    padding: 12,
    minWidth: 30,
    alignItems: 'center',
  },
  keyText: {
    color: 'black',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#444',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'green',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'black'
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


export default ProfileScreen;