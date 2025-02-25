import React, { useState, useCallback } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome"
import { View, Text, Image, TouchableOpacity, Modal, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native"
import { launchImageLibrary } from 'react-native-image-picker'
import ImageResizer from 'react-native-image-resizer';
import useGlobal from "../core/global"
import utils from "../core/utils"
import Thumbnail from "../common/Thumbnail"

function ProfileImage({friend,navigation}) {
  const uploadThumbnail = useGlobal(state => state.uploadThumbnail);
  const [uploading, setUploading] = useState(false);
  console.log(utils.thumbnail(friend.thumbnail))
  const uri=utils.thumbnail(friend.thumbnail)
 
  // Alert.alert("uri",uri.uri)
  return (
    <TouchableOpacity onPress={()=>{ 
      navigation.navigate('ViewAnyImage', {
      type: uri.uri,
    })}}>

    <View style={styles.profile}>

      <Thumbnail
        url={friend.thumbnail}
        size={180}
      />
      
     
      </View>
      </TouchableOpacity>
  );
}


function OtherProfile({route,navigation}) {
  const { friend } = route.params; // Extract friend from route.params
  const user = useGlobal(state => state.user);
  const updateProfile = useGlobal(state => state.updateProfile);
  const [editField, setEditField] = useState(null);
  const [currentValue, setCurrentValue] = useState('');

  utils.log("FROM OTHER PROFILE", friend);

  const handleEditStart = (field, value) => {
    setEditField(field);
    setCurrentValue(value);
  };

  const handleSave = async (value) => {
    await updateProfile({ [editField]: value });
  };

  return (
    <View style={styles.container}>
      <ProfileImage friend={friend} navigation={navigation}/>

      
        <Text style={styles.name}>{friend.name || 'Enter your name'}</Text>
     

	  <View style={styles.infoContainer}>
		
        <Text style={styles.infoLabel}>Name</Text>
        <Text style={styles.infoValue}>
		<Text style={styles.username}>{friend.username}</Text>        </Text>
		
      </View>

      

      <View style={styles.infoContainer}>
        <Text style={styles.infoLabel}>Phone</Text>
        <Text style={styles.infoValue}>
          {user.phone?.replace(/(\d{2})(\d{5})(\d{5})/, '+$1 $2 $3')}
        </Text>
      </View>

      <View 
        style={styles.infoContainer}
        
      >
        <Text style={styles.infoLabel}>About</Text>
        <Text style={styles.infoValue}>{user.bio || 'Live a little'}</Text>
      </View>

 

      
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
	left:2
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
    color: 'white',
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
    color: 'white',
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
    color: 'white',
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
    borderColor: 'white'
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profile:{
    marginBottom:20
  }
});

// ProfileLogout component remains the same as in original code

export default OtherProfile;