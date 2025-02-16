import React, { useState } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet } from 'react-native';

const FollowSection = ({ data, tab }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <TextInput
        placeholder={`Search ${tab}...`}
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No {tab} found</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  username: {
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
  },
});

export default FollowSection;