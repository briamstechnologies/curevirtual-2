import React, { useEffect, useState, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/designSystem';

export default function MessagesScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInbox = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Use unified messaging endpoint
      const res = await api.get('/messages/inbox');
      
      const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
      console.log('[MessagesScreen] First Item Raw:', JSON.stringify(items[0], null, 2));
      
      // Transform backend data to match UI expectations if necessary
      const formatted = items.map(chat => {
        // Handle both unified and legacy backend structures
        const otherUser = (String(chat.senderId) === String(user.id)) ? chat.receiver : chat.sender;
        const derivedName = otherUser 
          ? (otherUser.name || `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim()) 
          : null;
        
        const finalName = chat.contactName || derivedName || 'User';
        const nameParts = finalName.split(' ');

        return {
          id: chat.id,
          senderId: chat.contactId || (String(chat.senderId) === String(user.id) ? chat.receiverId : chat.senderId),
          sender: {
            firstName: nameParts[0] || '',
            lastName: nameParts[1] || '',
            name: finalName
          },
          content: chat.content,
          createdAt: chat.createdAt,
          readAt: chat.readAt
        };
      });

      setMessages(formatted);
    } catch (err) {
      console.error('[MessagesScreen] Failed to load inbox:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInbox();
  };

  const markAsReadOptimistic = async (msg) => {
    const senderName = msg.sender?.firstName 
      ? `${msg.sender.firstName} ${msg.sender.lastName || ''}` 
      : msg.sender?.name || 'User';

    navigation.navigate('Chat', { 
      targetId: msg.senderId, 
      targetName: senderName,
      message: msg 
    });

    if (!msg.readAt) {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, readAt: new Date().toISOString() } : m));
      try {
        await api.patch(`/messages/${msg.id}/read`);
      } catch (err) {
        console.warn('Mark read failed:', err);
      }
    }
  };

  const renderItem = ({ item }) => {
    const senderName = item.sender?.firstName 
      ? `${item.sender.firstName} ${item.sender.lastName || ''}` 
      : item.sender?.name || 'Unknown';
    const isUnread = !item.readAt;
    
    return (
      <TouchableOpacity 
        style={styles.chatItem} 
        onPress={() => markAsReadOptimistic(item)}
      >
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{senderName[0]}</Text>
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, isUnread && { fontWeight: 'bold', color: COLORS.brandGreen }]}>{senderName}</Text>
            <Text style={styles.chatTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={styles.chatFooter}>
            <Text style={[styles.lastMsg, isUnread && { color: COLORS.textMain, fontWeight: '600' }]} numberOfLines={1}>
              {item.content}
            </Text>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>1</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
      </View>
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brandGreen} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.brandGreen]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  header: { padding: SPACING.lg, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.slate100 },
  title: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingVertical: SPACING.sm, paddingBottom: 40 },
  chatItem: {
    flexDirection: 'row', padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.slate50,
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.base,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: COLORS.brandGreen },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.semiBold, color: COLORS.textMain },
  chatTime: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, flex: 1, marginRight: 8 },
  unreadBadge: { backgroundColor: COLORS.brandGreen, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  unreadText: { color: COLORS.white, fontSize: 10, fontWeight: 'bold' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: TYPOGRAPHY.base },
});
