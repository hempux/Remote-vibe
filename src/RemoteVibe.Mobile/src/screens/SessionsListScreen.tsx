import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
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
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newRepoPath, setNewRepoPath] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
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
        (s.repositoryPath?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (s.currentCommand?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    )
    : sessions;

  const handleSessionPress = useCallback(
    (session: Session) => {
      navigation.navigate('SessionDashboard', { sessionId: session.sessionId });
    },
    [navigation]
  );

  const handleNewSession = async () => {
    if (!newRepoPath.trim() || starting) return;
    setStarting(true);
    try {
      const newSession = await apiClient.startSession(newRepoPath.trim());
      setSessions((prev) => [newSession, ...prev]);
      setNewRepoPath('');
      setShowNewSessionModal(false);
    } catch (e: any) {
      setError(e.message || 'Failed to start session');
    } finally {
      setStarting(false);
    }
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
      <GlowingFAB onPress={() => setShowNewSessionModal(true)} />

      {/* New Session Modal */}
      <Modal
        visible={showNewSessionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewSessionModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowNewSessionModal(false)}
          />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.xl }]}>
            <LinearGradient
              colors={[colors.neonPurple + '15', colors.electricBlue + '08']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Session</Text>
            <Text style={styles.modalSubtitle}>
              Enter the repository path to start an AI coding session
            </Text>

            <View style={styles.modalInputWrapper}>
              <Text style={styles.modalInputLabel}>Repository Path</Text>
              <TextInput
                style={styles.modalInput}
                value={newRepoPath}
                onChangeText={setNewRepoPath}
                placeholder="/path/to/your/project"
                placeholderTextColor={colors.textTertiary}
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowNewSessionModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNewSession}
                activeOpacity={0.8}
                disabled={!newRepoPath.trim() || starting}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={
                    newRepoPath.trim() && !starting
                      ? [colors.electricBlue, colors.neonPurple]
                      : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.startButton}
                >
                  {starting ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : (
                    <Text
                      style={[
                        styles.startButtonText,
                        !newRepoPath.trim() && { color: colors.textTertiary },
                      ]}
                    >
                      Start Session
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.backgroundLight,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.glassBorderLight,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    ...typography.header,
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    ...typography.body,
    marginBottom: spacing.xl,
  },
  modalInputWrapper: {
    marginBottom: spacing.xl,
  },
  modalInputLabel: {
    ...typography.small,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    color: colors.textPrimary,
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    fontFamily: 'monospace',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 0.6,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  startButton: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  startButtonText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
});
