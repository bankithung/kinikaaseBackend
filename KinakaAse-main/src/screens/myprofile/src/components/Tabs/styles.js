import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    
    backgroundColor:'rgba(14, 4, 4, 0.9)'
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,

  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1877f2',
  },
  tabText: {
    color: 'white',
    fontWeight: '700',
    left:10
  },
  activeTabText: {
    color: '#1877f2',
    fontWeight: 'bold',
  },
});