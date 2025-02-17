import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  View, 
  FlatList, 
  TextInput, 
  Text, 
  TouchableOpacity, 
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  PermissionsAndroid
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMicrophone, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { Picker } from '@react-native-picker/picker';

const audioRecorderPlayer = new AudioRecorderPlayer();

const DoctoAi = ({navigation}) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-3.5');
  const flatListRef = useRef(null);

  const requestAudioPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'App needs access to your microphone for voice input',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const startVoiceRecognition = async () => {
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) return;

    try {
      setIsListening(true);
      const path = Platform.OS === 'android' ? 'sdcard/sound.mp4' : 'sound.m4a';
      await audioRecorderPlayer.startRecorder(path);
      audioRecorderPlayer.addRecordBackListener((e) => {
        // Optional: Handle recording progress
      });
    } catch (error) {
      console.error(error);
      setIsListening(false);
    }
  };

  const stopVoiceRecognition = async () => {
    try {
      const audioPath = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setIsListening(false);
      
      // Here you would process the audio file with your speech-to-text service
      // For demonstration, we'll simulate a transcript
      setInputText("Simulated voice input: " + Math.random().toString(36).substring(7));
    } catch (error) {
      console.error(error);
    }
  };

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    
    setIsLoading(true);
    try {
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const aiMessage = {
        id: Date.now().toString() + '-ai',
        text: "Welcome to Docto.Ai , we r currently in Development Stage Thank you",
        isUser: false,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('API Error:', error);
    }
    setIsLoading(false);
  }, [inputText]);

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.aiMessage
    ]}>
      <Text style={styles.messageText}>{item.text}</Text>
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={()=>navigation.navigate("Chats")}>
        <FontAwesomeIcon icon="fa-solid fa-arrow-left-long" size={22} color="white"  />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Docto.Ai</Text>
        <Picker
          selectedValue={selectedModel}
          style={styles.modelPicker}
          onValueChange={setSelectedModel}
          dropdownIconColor="white"
        >
          <Picker.Item label="Cardiology" value="Cardiology" />
          <Picker.Item label="Neurology" value="Neurology" />
          <Picker.Item label="Pediatrics" value="Pediatrics" />
        </Picker>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={isLoading ? <ActivityIndicator style={styles.loading} /> : null}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            onPressIn={startVoiceRecognition}
            onPressOut={stopVoiceRecognition}
            style={styles.voiceButton}
          >
            <FontAwesomeIcon
              icon={faMicrophone}
              size={22}
              color={isListening ? '#FF3B30' : '#666'}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="#666"
            multiline
            onSubmitEditing={handleSend}
          />

          <TouchableOpacity 
            onPress={handleSend} 
            disabled={!inputText}
            style={styles.sendButton}
          >
            <FontAwesomeIcon
              icon={faPaperPlane}
              size={22}
              color={inputText ? '#007AFF' : '#666'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    flex:1,
    left:10
  },
  modelPicker: {
    width: 120,
    height: 50,
    color: 'white',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#333',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#252525',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#333',
    color: 'white',
    borderRadius: 20,
    marginHorizontal: 8,
    fontSize: 16,
  },
  voiceButton: {
    padding: 8,
  },
  sendButton: {
    padding: 8,
  },
  loading: {
    marginVertical: 16,
  },
});

export default DoctoAi;