import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function ChatbotScreen({ navigation }) {
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hello! I am your AI healthcare assistant. How can I help you today?', isBot: true }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef();

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now().toString(), text: input, isBot: false };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/chatbot/chat', { 
        message: userMessage.text 
      });

      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: response.data.reply || "I'm sorry, I couldn't process that.",
        isBot: true
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        text: 'Sorry, I am having trouble connecting to the service.', 
        isBot: true 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.messageBubble, item.isBot ? styles.botBubble : styles.userBubble]}>
      <Text style={[styles.messageText, item.isBot ? styles.botText : styles.userText]}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : null}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          onContentSizeChange={() => flatListRef.current.scrollToEnd()}
        />

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3b82f6" />
          </View>
        )}

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
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  messageText: { fontSize: 16 },
  botText: { color: '#1e293b' },
  userText: { color: '#fff' },
  loadingContainer: { padding: 8, alignItems: 'flex-start', marginLeft: 16 },
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
    maxHeight: 100,
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
