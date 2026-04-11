import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import socketService from '../../services/socket';

export default function ChatScreen({ route, navigation }) {
  const { targetId, targetName } = route.params || { targetId: 'test', targetName: 'User' };
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const initChat = async () => {
      // 1. Fetch History
      try {
        const res = await api.get(`/messages/history/${targetId}`);
        const history = res.data?.data || res.data || [];
        setMessages([...history].reverse());
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }

      // 2. Connect Socket
      if (user) {
        const socket = await socketService.connect(
          user.id, 
          user.role, 
          `${user.firstName || ''} ${user.lastName || ''}`.trim()
        );

        if (socket) {
          socketService.on('receiveMessage', (message) => {
            // Only add if it's from the person we're talking to or from us
            if (message.senderId === targetId || message.senderId === user.id) {
              setMessages((prev) => [message, ...prev]);
            }
          });
        }
      }
    };

    initChat();

    return () => {
      socketService.off('receiveMessage');
    };
  }, [user, targetId]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const messageData = {
      content: input,
      receiverId: targetId,
      senderId: user?.id,
    };

    try {
      // Send via API (this will also trigger socket emission from backend)
      const res = await api.post('/messages/send', messageData);
      const sentMsg = res.data?.data || res.data;
      
      // Update UI optimistically if not already handled by socket
      setMessages((prev) => [sentMsg, ...prev]);
      setInput('');
    } catch (err) {
      console.error("Failed to send message:", err);
    }
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 90}
      >
        <FlatList
          data={messages}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          inverted={true}
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
