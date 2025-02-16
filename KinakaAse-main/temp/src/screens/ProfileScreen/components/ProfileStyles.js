import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    padding: 16,
  },
  profileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '600',
  },
  navContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 16,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  navText: {
    color: '#666',
    fontWeight: '600',
  },
  navTextActive: {
    color: '#000',
    fontWeight: '600',
    borderBottomWidth: 2,
    borderBottomColor: '#008069',
    paddingBottom: 4,
  },
  gridContainer: {
    padding: 1,
  },
  gridItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 1,
  },
  gridImage: {
    flex: 1,
    borderRadius: 1,
  },
  headerName:{
    fontSize:17,
    fontWeight:'bold',
    textAlign:'center',
    marginBottom:10
  },navContainer: {
    flex: 1,
    marginTop: 10,
  },
  navButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  navButton: {
    paddingVertical: 10,
  },
  navText: {
    fontSize: 16,
    color: '#666',
  },
  navTextActive: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    padding: 4,
  },
  mediaItem: {
    width: '30%', 
    height: 170,
    marginBottom: 2,
    backgroundColor: '#eee',
  },
});