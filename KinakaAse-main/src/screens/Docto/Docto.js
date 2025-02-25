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
  PermissionsAndroid,
  Alert,
  Pressable,
  Keyboard
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
  faMicrophone, 
  faPaperPlane, 
  faArrowLeft,
  faCircleNotch
} from '@fortawesome/free-solid-svg-icons';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const audioRecorderPlayer = new AudioRecorderPlayer();

const DoctoAi = () => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedModel, setSelectedModel] = useState('cardiology');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  // Color Scheme
  const colors = {
    primary: '#2A7FFA',
    background: '#0F172A',
    surface: '#1E293B',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    error: '#EF4444',
    success: '#22C55E',
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

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
      handleError('Microphone permission error');
      return false;
    }
  };

  const handleError = (message) => {
    Alert.alert('Error', message, [{ text: 'OK' }]);
    setIsLoading(false);
    setIsListening(false);
  };

  const startVoiceRecognition = async () => {
    try {
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) return;

      setIsListening(true);
      const path = Platform.OS === 'android' ? 'sdcard/sound.mp4' : 'sound.m4a';
      await audioRecorderPlayer.startRecorder(path);
      audioRecorderPlayer.addRecordBackListener(() => {});
    } catch (error) {
      handleError('Failed to start recording');
    }
  };

  const stopVoiceRecognition = async () => {
    try {
      const audioPath = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setIsListening(false);
      
      // Simulated STT conversion
      setInputText("Simulated voice input: " + Math.random().toString(36).substring(7));
    } catch (error) {
      handleError('Failed to process voice input');
    }
  };

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const tempId = Date.now().toString();
    const newMessage = {
      id: tempId,
      text: inputText,
      isUser: true,
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    inputRef.current?.blur();
    
    try {
      setIsLoading(true);
      
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const aiMessage = {
        id: Date.now().toString() + '-ai',
        text: "Thank you for your message. This is a simulated response from the AI model.",
        isUser: false,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [
        ...prev.filter(msg => msg.id !== tempId),
        { ...newMessage, status: 'sent' },
        aiMessage
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev.filter(msg => msg.id !== tempId),
        { ...newMessage, status: 'error' }
      ]);
      handleError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading]);

  const MessageBubble = React.memo(({ item }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.aiMessage,
      item.status === 'error' && styles.errorMessage
    ]}>
      <Text style={styles.messageText}>{item.text}</Text>
      <View style={styles.messageFooter}>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
        {item.isUser && (
          <FontAwesomeIcon
            icon={item.status === 'sending' ? faCircleNotch : 
                  item.status === 'error' ? faTriangleExclamation : "plus"}
            size={12}
            color={item.status === 'error' ? colors.error : colors.textSecondary}
            style={styles.statusIcon}
            spin={item.status === 'sending'}
          />
        )}
      </View>
    </View>
  ));

  return (
    <LinearGradient
      colors={[colors.background, colors.surface]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            android_ripple={{ color: colors.textSecondary, borderless: true }}
          >
            <FontAwesomeIcon icon={faArrowLeft} size={22} color={colors.textPrimary} />
          </Pressable>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Docto.AI</Text>
            <Text style={styles.headerSubtitle}>{selectedModel.toUpperCase()}</Text>
          </View>

          <Picker
            selectedValue={selectedModel}
            style={styles.modelPicker}
            onValueChange={setSelectedModel}
            dropdownIconColor={colors.textPrimary}
            mode="dropdown"
          >
            <Picker.Item label="Cardiology" value="cardiology" />
            <Picker.Item label="Neurology" value="neurology" />
            <Picker.Item label="Pediatrics" value="pediatrics" />
          </Picker>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <MessageBubble item={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Start chatting with Docto.AI - Your AI Medical Assistant
              </Text>
            </View>
          }
          keyboardDismissMode="interactive"
        />

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.select({ ios: 90, android: 0 })}
        >
          <LinearGradient
            colors={[colors.surface, colors.background]}
            style={styles.inputWrapper}
          >
            <View style={styles.inputContainer}>
              <Pressable
                onPressIn={startVoiceRecognition}
                onPressOut={stopVoiceRecognition}
                style={({ pressed }) => [
                  styles.voiceButton,
                  pressed && styles.buttonPressed
                ]}
                android_ripple={{ color: colors.textSecondary, borderless: true }}
              >
                <FontAwesomeIcon
                  icon={faMicrophone}
                  size={22}
                  color={isListening ? colors.error : colors.textSecondary}
                />
              </Pressable>

              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                placeholderTextColor={colors.textSecondary}
                multiline
                onSubmitEditing={handleSend}
                editable={!isLoading}
                accessibilityLabel="Message input"
                cursorColor={colors.primary}
                selectionColor={`${colors.primary}40`}
              />

              <Pressable
                onPress={handleSend}
                disabled={!inputText || isLoading}
                style={({ pressed }) => [
                  styles.sendButton,
                  pressed && styles.buttonPressed
                ]}
                android_ripple={{ color: colors.textSecondary, borderless: true }}
              >
                <FontAwesomeIcon
                  icon={isLoading ? faCircleNotch : faPaperPlane}
                  size={22}
                  color={inputText ? colors.primary : colors.textSecondary}
                  spin={isLoading}
                />
              </Pressable>
            </View>
          </LinearGradient>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'System',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 2,
  },
  modelPicker: {
    width: 120,
    color: '#F8FAFC',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2A7FFA',
    borderBottomEndRadius: 4,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    borderBottomStartRadius: 4,
  },
  errorMessage: {
    backgroundColor: '#EF444433',
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  messageText: {
    color: '#F8FAFC',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  timestamp: {
    color: '#94A3B8',
    fontSize: 12,
    marginRight: 4,
  },
  statusIcon: {
    marginLeft: 4,
  },
  inputWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: Platform.select({ ios: 0, android: 8 }),
  },
  textInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    borderRadius: 24,
    marginHorizontal: 8,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  voiceButton: {
    padding: 12,
    borderRadius: 24,
  },
  sendButton: {
    padding: 12,
    borderRadius: 24,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  loading: {
    marginVertical: 16,
  },
});

export default DoctoAi;