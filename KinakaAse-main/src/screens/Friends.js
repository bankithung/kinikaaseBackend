import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import Cell from "../common/Cell"
import Empty from "../common/Empty"
import useGlobal from "../core/global"
import Thumbnail from "../common/Thumbnail"
import utils from "../core/utils"
import { useState } from "react"

const nameColor = "white"

function FriendRow({ navigation, item }) {
  return (
    <Pressable
      onPress={() => {
        navigation.navigate('Messages', item)
      }}
      style={({ pressed }) => [
        style.button,
        pressed && style.buttonPressed,
      ]}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
    >
      <Cell>
        <Thumbnail
          url={item.friend.thumbnail}
          size={50}
        />
        <View style={{ flex: 1, paddingHorizontal: 0 }}>
          <View style={{ flexDirection: 'row', left: 10 }}>
            <Text style={{
              fontWeight: 'bold',
              color: nameColor,
              marginBottom: 4,
            }}>
              {item.friend.name}
            </Text>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end', left: 6 }}>
              <Text style={{color:nameColor}}>{utils.formatTimeDays(item.updated)}</Text>
            </View>
          </View>
          <Text style={{ color: '#606060', left: 15 }}>
            {item.preview.length >= 30 ? `${item.preview.slice(0, 20)}...` : item.preview}
          </Text>
        </View>
      </Cell>
    </Pressable>
  )
}

function FriendsScreen({ navigation }) {
  const friendList = useGlobal(state => state.friendList)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter friends based on search query
  const filteredList = friendList?.filter(item => 
    item.friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  // Show loading indicator
  if (friendList === null) {
    return <ActivityIndicator style={{ flex: 1 }} />
  }

  // Show empty state
  if (filteredList.length === 0) {
    return (
      <Empty 
        icon='message' 
        message={searchQuery ? 'No matches found' : 'No messages yet'} 
      />
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={style.searchContainer}>
        <TextInput
          placeholder="Search Contacts..."
          placeholderTextColor="#fff"
          style={style.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <FlatList
        data={filteredList}
        renderItem={({ item }) => (
          <FriendRow navigation={navigation} item={item} />
        )}
        keyExtractor={item => item.id}
      />
    </View>
  )
}

const style = StyleSheet.create({
  input: {
    height: 46,
    width: "95%",
    backgroundColor: '#525151',
    borderRadius: 25,
    paddingLeft: 40,
    color: 'white'
  },
  searchContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10
  },
  button: {
    backgroundColor: 'transparent',
  },
  buttonPressed: {
    backgroundColor: '#444',
  }
})

export default FriendsScreen