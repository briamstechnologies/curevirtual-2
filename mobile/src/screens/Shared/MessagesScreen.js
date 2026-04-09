import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../theme/designSystem';

const DUMMY_CHATS = [
  { id: '1', name: 'Dr. Sarah Wilson', lastMsg: 'Your lab results are ready.', time: '10:30 AM', unread: 2 },
  { id: '2', name: 'John Doe (Patient)', lastMsg: 'Can we reschedule for tomorrow?', time: 'Yesterday', unread: 0 },
  { id: '3', name: 'Support Team', lastMsg: 'Your ticket #1234 has been resolved.', time: 'Mon', unread: 0 },
];

export default function MessagesScreen({ navigation }) {
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatItem} 
      onPress={() => navigation.navigate('Chat', { chatId: item.id, name: item.name })}
    >
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>{item.name[0]}</Text>
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        <View style={styles.chatFooter}>
          <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMsg}</Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      <FlatList
        data={DUMMY_CHATS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMuted },
  header: { padding: SPACING.lg, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.slate100 },
  title: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.black, color: COLORS.textMain },
  listContent: { paddingVertical: SPACING.sm },
  chatItem: {
    flexDirection: 'row', padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.slate50,
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.slate100,
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.base,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: COLORS.brandGreen },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textMain },
  chatTime: { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, flex: 1, marginRight: 8 },
  unreadBadge: { backgroundColor: COLORS.brandGreen, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  unreadText: { color: COLORS.white, fontSize: 10, fontWeight: 'bold' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textPlaceholder, fontSize: TYPOGRAPHY.base },
});
