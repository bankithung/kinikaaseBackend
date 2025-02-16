import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
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
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1877f2',
    fontWeight: 'bold',
  },
  
});
