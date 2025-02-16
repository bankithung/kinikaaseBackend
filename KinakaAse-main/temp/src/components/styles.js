import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#f0f0f0', // Fallback background
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#008069',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});