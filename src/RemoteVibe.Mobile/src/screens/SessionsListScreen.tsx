import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SessionCard from '../components/SessionCard';
import GlowingFAB from '../components/GlowingFAB';
import { Session } from '../data/types';
import { useApp } from '../context/AppContext';
import * as apiClient from '../services/apiClient';
import { colors, borderRadius, spacing, typography } from '../theme/colors';

interface SessionsListScreenProps {
  navigation: any;
}

export default function SessionsListScreen({ navigation }: SessionsListScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const { subscribeSessionStatus } = useApp();

  const loadSessions = useCallback(async () => {
    try {
      setError(null);
      const data = await apiClient.getAllSessions();
      setSessions(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load sessions');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadSessions().finally(() => setLoading(false));
  }, [loadSessions]);

  useEffect(() => {
    const unsub = subscribeSessionStatus((updated) => {
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.sessionId === updated.sessionId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...updated };
          return next;
        }
        return [updated, ...prev];
      });
    });
    return unsub;
  }, [subscribeSessionStatus]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  }, [loadSessions]);

  const filteredSessions = searchQuery
    ? sessions.filter(
      (s) =>
        (s.repositoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (s.repositoryOwner?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (s.repositoryPath?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (s.taskDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (s.currentCommand?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    )
    : sessions;

  const handleSessionPress = useCallback(
    (session: Session) => {
      navigation.navigate('SessionDashboard', { sessionId: session.sessionId });
    },
    [navigation]
  );

  const handleNewSession = () => {
    navigation.navigate('NewSession');
  };

  const renderSessionItem = useCallback(
    ({ item, index }: { item: Session; index: number }) => (
      <View style={isTablet ? styles.gridItem : undefined}>
        <SessionCard session={item} onPress={handleSessionPress} index={index} />
      </View>
    ),
    [handleSessionPress, isTablet]
  );

  const activeCount = sessions.filter(
    (s) => s.status === 'Processing' || s.status === 'WaitingForInput'
  ).length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a1a', '#0f1530', '#0d0d25', '#0a0a1a']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md, paddingLeft: isTablet ? 80 + spacing.xl : spacing.xl }]}>
        <View>
          <Text style={styles.greeting}>RemoteVibe</Text>
          <Text style={styles.subtitle}>
            {activeCount > 0
              ? `${activeCount} active session${activeCount > 1 ? 's' : ''}`
              : 'No active sessions'}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{sessions.length}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { paddingLeft: isTablet ? 80 + spacing.xl : spacing.xl }]}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>{'~'}</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search sessions..."
            placeholderTextColor={colors.textTertiary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearButton}>x</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={[styles.emptyState, { paddingLeft: isTablet ? 80 : 0 }]}>
          <ActivityIndicator size="large" color={colors.electricBlue} />
          <Text style={[styles.emptySubtitle, { marginTop: spacing.lg }]}>
            Loading sessions...
          </Text>
        </View>
      ) : error && sessions.length === 0 ? (
        <View style={[styles.emptyState, { paddingLeft: isTablet ? 80 : 0 }]}>
          <Text style={styles.emptyIcon}>{'!'}</Text>
          <Text style={styles.emptyTitle}>Connection Error</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity
            onPress={() => { setLoading(true); loadSessions().finally(() => setLoading(false)); }}
            style={styles.retryButton}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredSessions.length === 0 ? (
        <View style={[styles.emptyState, { paddingLeft: isTablet ? 80 : 0 }]}>
          <Text style={styles.emptyIcon}>{'{ }'}</Text>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No matching sessions' : 'No sessions yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Tap the + button to start your first AI coding session'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.sessionId}
          contentContainerStyle={[
            styles.listContent,
            { paddingLeft: isTablet ? 80 + spacing.xl : spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          key={isTablet ? 'grid' : 'list'}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? styles.gridRow : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.electricBlue}
            />
          }
        />
      )}

      {/* FAB */}
      <GlowingFAB onPress={handleNewSession} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: spacing.xl,
    paddingBottom: spacing.lg,
  },
  greeting: {
    ...typography.header,
    fontSize: 32,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  headerBadge: {
    backgroundColor: colors.electricBlue + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.electricBlue + '30',
  },
  headerBadgeText: {
    color: colors.electricBlue,
    fontWeight: '700',
    fontSize: 14,
  },
  searchContainer: {
    paddingRight: spacing.xl,
    paddingBottom: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  searchIcon: {
    fontSize: 18,
    color: colors.textTertiary,
    fontFamily: 'monospace',
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
  },
  clearButton: {
    color: colors.textTertiary,
    fontSize: 16,
    fontWeight: '600',
    padding: spacing.xs,
  },
  listContent: {
    paddingRight: spacing.xl,
    paddingBottom: 160,
  },
  gridItem: {
    flex: 1,
    maxWidth: '50%',
  },
  gridRow: {
    gap: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.subheader,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textTertiary,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.electricBlue + '40',
    backgroundColor: colors.electricBlue + '10',
  },
  retryText: {
    color: colors.electricBlue,
    fontWeight: '600',
    fontSize: 14,
  },
});
