import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { AuthContext } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatScreen({ route, navigation }) {
  // Pass the target user ID and Name in params
  const { targetId, targetName } = route.params || { targetId: 'test', targetName: 'Dr. Smith' };
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    let newSocket;
    const initSocket = async () => {
      const token = await AsyncStorage.getItem('userToken');
      // Connect to the backend socket
      const backendUrl = process.env.EXPO_PUBLIC_API_BASE_URL.replace('/api', '');
      newSocket = io(backendUrl, {
        auth: { token }
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        // Join room logic typically goes here
      });

      newSocket.on('receiveMessage', (message) => {
        setMessages((prev) => [...prev, message]);
      });

      setSocket(newSocket);
    };

    initSocket();

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;

    const messageData = {
      content: input,
      receiverId: targetId,
      senderId: user?.id,
      timestamp: new Date().toISOString()
    };

    // Emit to backend
    socket.emit('sendMessage', messageData);

    // Optimistic UI update
    setMessages((prev) => [...prev, messageData]);
    setInput('');
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderId === user?.id;
    return (
      <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
        <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{targetName}</Text>
        <TouchableOpacity>
          <Ionicons name="videocam" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : null}
      >
        <FlatList
          data={messages}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  chatContainer: { flex: 1 },
  listContainer: { padding: 16 },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 16 },
  myText: { color: '#fff' },
  theirText: { color: '#1e293b' },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  }
});
