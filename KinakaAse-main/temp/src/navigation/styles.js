import { Dimensions, StyleSheet } from "react-native";
const {width} = Dimensions.get('window');
const SCREENS = ['Chats', 'Reels', 'Docto', 'Travel', 'Profile'];

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  screenContainer: {
    flex: 1,
    position: 'relative',
    width: '100%',
  },
  page: {
    position: 'absolute',
    width: width,
    height: '100%',
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 70,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: '#008069',
    width: width / SCREENS.length,
  },
  icon: {
    width: 30,
    height: 30,
  },
});