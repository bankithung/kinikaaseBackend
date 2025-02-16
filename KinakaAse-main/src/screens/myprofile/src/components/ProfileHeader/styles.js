import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  backgroundImage: {
    width: '100%',
    height: 170,
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    top: 90,
  },
  profileContainer: {
    marginRight: 6,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#fff',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1877f2',
    borderRadius: 15,
    padding: 5,
  },
  editProfileButton: {
    backgroundColor: '#1877f2',
    paddingVertical: 7,
    paddingHorizontal: 7,
    borderRadius: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  modalHeader: {
    position: 'absolute',
    top: 40,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    gap: 8,
  },
  plusIcon: { height: 15, width: 15, tintColor: 'white' },
  
  
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  currentImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  currentProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth:2,
    borderColor:'white'
  },
  currentBackgroundImage: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    marginBottom: 10,
  },
  uploadImageButton: {
    //backgroundColor: '#1877f2',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  uploadImageButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  editModalContainer: {
    flex: 1,
  },
  editModalScrollView: {
    flex: 1,
    backgroundColor: 'white',
  },
  editModalContent: {
    flexGrow: 1,
    padding: 20,
  },
  currentBackgroundImage: {
    width: "100%",
    height: 170,
    borderRadius: 10,
    marginBottom: 10,
  },
  editModalContent: {
    backgroundColor: 'white',
    borderRadius: 0, 
    flexGrow: 1,
    padding: 20,
  },
  textHead:{
    left:10,
    fontSize:13,
    fontWeight:'100',
    top:7
  }
  
});