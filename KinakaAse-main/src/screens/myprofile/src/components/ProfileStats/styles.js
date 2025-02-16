import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  statsContainer: {
    paddingHorizontal: 9,
    marginBottom: 7,
    flexDirection: 'row',
  },
  username: {
    fontWeight: '220',
    fontSize: 15,
    marginBottom: 2,
    marginTop: 0,
    left:5,
    color:'white'
  },fullName:{
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 0,
    marginTop: -1,
    left:5,
    color:'white'
  },
  followers: {
    // fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 8,
    color:'white'
  },
  about: {
    fontSize: 15,
    marginBottom: 4,
    left:5,
    marginTop:10,
    marginBottom:10,
    fontWeight:'200'
  },
  bio: {
    color: '#669',
    left:5,
  
  },
  values: {
    fontSize: 15,
    fontWeight: 'bold',
    color:'white'
  },
  stats: {

    left: 0,
    flexDirection: 'row',
    marginTop:5
   
  },
  modalView: {
    flex: 1,
    padding: 20,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  tab: {
    padding: 10,
  },
  selectedTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    color:'white'
  },
  followButton: {
    padding: 10,
    backgroundColor: '#1DA1F2',
    borderRadius: 20,
  },
  unfollowButton: {
    backgroundColor: '#E1E8ED',
  },
  followButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  searchBar: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  verifiedIcon:{
    width:30,
    height:30,
    top:53,
    left:5
  }, readMore: {
    color: "blue",
    fontSize: 13,
    left:13
  },
  message:{
    height:20,
    width:20,
    tintColor:'white',
  }
});