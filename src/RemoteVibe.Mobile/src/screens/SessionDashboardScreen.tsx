import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Modal,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatBubble from '../components/ChatBubble';
import CommandInput from '../components/CommandInput';
import QuestionCard from '../components/QuestionCard';
import StatusBadge from '../components/StatusBadge';
import {
  Session,
  ConversationMessage,
  PendingQuestion,
  getStatusColor,
  formatTimeAgo,
} from '../data/types';
import { useApp } from '../context/AppContext';
import * as apiClient from '../services/apiClient';
import { signalRService } from '../services/signalRService';
import { colors, borderRadius, spacing, typography } from '../theme/colors';

interface SessionDashboardScreenProps {
  route: any;
  navigation: any;
}

export default function SessionDashboardScreen({
  route,
  navigation,
}: SessionDashboardScreenProps) {
  const { sessionId } = route.params;
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [questions, setQuestions] = useState<PendingQuestion[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const flatListRef = useRef<FlatList>(null);
  const questionBadgeAnim = useRef(new Animated.Value(1)).current;
  const { subscribeSessionStatus, subscribeMessage, subscribeQuestion } = useApp();

  // Load initial data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [status, msgs, qs] = await Promise.all([
          apiClient.getSessionStatus(sessionId),
          apiClient.getMessages(sessionId),
          apiClient.getPendingQuestions(sessionId),
        ]);
        if (cancelled) return;
        setSession(status);
        setMessages(msgs);
        setQuestions(qs);
      } catch {
        // If fetch fails, set a minimal session so the screen still renders
        if (!cancelled) {
          setSession({
            sessionId,
            status: 'Error',
            startedAt: new Date().toISOString(),
            lastActivityAt: null,
            currentCommand: null,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  // Join SignalR session group
  useEffect(() => {
    signalRService.joinSession(sessionId);
    return () => { signalRService.leaveSession(sessionId); };
  }, [sessionId]);

  // Subscribe to SignalR events
  useEffect(() => {
    const unsubStatus = subscribeSessionStatus((updated) => {
      if (updated.sessionId === sessionId) {
        setSession((prev) => prev ? { ...prev, ...updated } : updated);
      }
    });
    const unsubMsg = subscribeMessage((msg) => {
      if (msg.sessionId === sessionId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });
    const unsubQ = subscribeQuestion((q) => {
      if (q.sessionId === sessionId) {
        setQuestions((prev) => {
          if (prev.some((existing) => existing.id === q.id)) return prev;
          return [...prev, q];
        });
      }
    });
    return () => { unsubStatus(); unsubMsg(); unsubQ(); };
  }, [sessionId, subscribeSessionStatus, subscribeMessage, subscribeQuestion]);

  useEffect(() => {
    if (questions.length > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(questionBadgeAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(questionBadgeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [questions.length, questionBadgeAnim]);

  const handleSendCommand = useCallback(async (text: string) => {
    try {
      await apiClient.sendCommand(sessionId, text);
    } catch {
      // Command failed - could show an error toast here
    }
  }, [sessionId]);

  const handleAnswerQuestion = useCallback(async (questionId: string, answer: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    if (questions.length <= 1) setShowQuestions(false);
    try {
      await apiClient.respondToQuestion(sessionId, questionId, answer);
    } catch {
      // Response failed - could show an error toast here
    }
  }, [sessionId, questions.length]);

  if (loading || !session) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LinearGradient
          colors={['#0a0a1a', '#0f1530', '#0d0d25', '#0a0a1a']}
          locations={[0, 0.3, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={colors.electricBlue} />
        <Text style={[typography.body, { marginTop: spacing.lg }]}>
          Loading session...
        </Text>
      </View>
    );
  }

  const statusColor = getStatusColor(session.status);
  const repoName = session.repositoryPath?.split('/').pop() || session.sessionId;

  const renderConversation = () => (
    <View style={styles.conversationContainer}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item, index }) => (
          <ChatBubble message={item} index={index} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />
    </View>
  );

  const renderQuestionsPanel = () => (
    <View style={styles.questionsPanel}>
      <View style={styles.questionsPanelHeader}>
        <Text style={styles.questionsPanelTitle}>Pending Questions</Text>
        <View style={styles.questionCountBadge}>
          <Text style={styles.questionCountText}>{questions.length}</Text>
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.questionsPanelContent}
      >
        {questions.length === 0 ? (
          <View style={styles.noQuestions}>
            <Text style={styles.noQuestionsIcon}>{'[ok]'}</Text>
            <Text style={styles.noQuestionsText}>
              No pending questions
            </Text>
          </View>
        ) : (
          questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              onAnswer={handleAnswerQuestion}
            />
          ))
        )}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a1a', '#0f1530', '#0d0d25', '#0a0a1a']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Status Banner */}
      <View
        style={[
          styles.statusBanner,
          {
            paddingTop: insets.top + spacing.sm,
            paddingLeft: isTablet ? 80 + spacing.xl : spacing.lg,
          },
        ]}
      >
        <LinearGradient
          colors={[statusColor + '15', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.bannerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>{'<'}</Text>
          </TouchableOpacity>
          <View style={styles.bannerInfo}>
            <View style={styles.bannerTitleRow}>
              <Text style={styles.bannerIcon}>{'</>'}</Text>
              <Text style={styles.bannerTitle} numberOfLines={1}>
                {repoName}
              </Text>
            </View>
            <Text style={styles.bannerPath}>{session.repositoryPath ?? session.sessionId}</Text>
          </View>
          <StatusBadge status={session.status} size="medium" />
        </View>

        {session.currentCommand && (
          <View style={styles.commandBanner}>
            <View style={[styles.commandBannerDot, { backgroundColor: statusColor }]} />
            <Text style={styles.commandBannerText} numberOfLines={1}>
              {session.currentCommand}
            </Text>
            {session.lastActivityAt && (
              <Text style={styles.commandBannerTime}>
                {formatTimeAgo(session.lastActivityAt)}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Main Content */}
      {isTablet ? (
        <View style={[styles.splitView, { paddingLeft: 80 }]}>
          <View style={styles.splitLeft}>
            {renderConversation()}
            <CommandInput onSend={handleSendCommand} />
          </View>
          <View style={styles.splitDivider} />
          <View style={styles.splitRight}>{renderQuestionsPanel()}</View>
        </View>
      ) : (
        <View style={styles.phoneLayout}>
          {renderConversation()}

          {/* Questions floating button */}
          {questions.length > 0 && (
            <Animated.View
              style={[
                styles.questionsFloating,
                { transform: [{ scale: questionBadgeAnim }] },
              ]}
            >
              <TouchableOpacity
                onPress={() => setShowQuestions(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.neonYellow, colors.hotPink]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.questionsFloatingButton}
                >
                  <Text style={styles.questionsFloatingText}>
                    ? {questions.length}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          <CommandInput onSend={handleSendCommand} />
        </View>
      )}

      {/* Questions Modal (phone only) */}
      {!isTablet && (
        <Modal
          visible={showQuestions}
          transparent
          animationType="slide"
          onRequestClose={() => setShowQuestions(false)}
        >
          <View style={styles.questionsModalOverlay}>
            <TouchableOpacity
              style={styles.questionsModalBackdrop}
              activeOpacity={1}
              onPress={() => setShowQuestions(false)}
            />
            <View
              style={[
                styles.questionsModalContent,
                { paddingBottom: insets.bottom + spacing.xl },
              ]}
            >
              <LinearGradient
                colors={[colors.neonYellow + '08', colors.hotPink + '05']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.modalHandle} />
              <View style={styles.questionsModalHeader}>
                <Text style={styles.questionsModalTitle}>
                  Pending Questions
                </Text>
                <TouchableOpacity
                  onPress={() => setShowQuestions(false)}
                  activeOpacity={0.7}
                >
                  <View style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>x</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.questionsModalList}
              >
                {questions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    onAnswer={handleAnswerQuestion}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Status Banner
  statusBanner: {
    paddingRight: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  backArrow: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bannerIcon: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neonPurple,
    fontFamily: 'monospace',
  },
  bannerTitle: {
    ...typography.subheader,
    flex: 1,
  },
  bannerPath: {
    ...typography.caption,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  commandBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },
  commandBannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  commandBannerText: {
    ...typography.body,
    fontSize: 13,
    flex: 1,
  },
  commandBannerTime: {
    ...typography.caption,
    fontSize: 10,
  },

  // Split view (tablet)
  splitView: {
    flex: 1,
    flexDirection: 'row',
  },
  splitLeft: {
    flex: 0.6,
  },
  splitDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  splitRight: {
    flex: 0.4,
  },

  // Phone layout
  phoneLayout: {
    flex: 1,
  },

  // Conversation
  conversationContainer: {
    flex: 1,
  },
  messagesList: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  // Questions panel (tablet sidebar)
  questionsPanel: {
    flex: 1,
    padding: spacing.lg,
  },
  questionsPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  questionsPanelTitle: {
    ...typography.subheader,
    fontSize: 16,
  },
  questionCountBadge: {
    backgroundColor: colors.neonYellow + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.neonYellow + '30',
  },
  questionCountText: {
    color: colors.neonYellow,
    fontSize: 12,
    fontWeight: '700',
  },
  questionsPanelContent: {
    paddingBottom: spacing.xl,
  },
  noQuestions: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  noQuestionsIcon: {
    fontSize: 28,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginBottom: spacing.md,
  },
  noQuestionsText: {
    ...typography.body,
    color: colors.textTertiary,
  },

  // Questions floating button (phone)
  questionsFloating: {
    position: 'absolute',
    bottom: 80,
    right: spacing.lg,
    zIndex: 10,
  },
  questionsFloatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    shadowColor: colors.neonYellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  questionsFloatingText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },

  // Questions modal (phone)
  questionsModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  questionsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  questionsModalContent: {
    backgroundColor: colors.backgroundLight,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    maxHeight: '70%',
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
    marginBottom: spacing.lg,
  },
  questionsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  questionsModalTitle: {
    ...typography.subheader,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  questionsModalList: {
    paddingBottom: spacing.xl,
  },
});
