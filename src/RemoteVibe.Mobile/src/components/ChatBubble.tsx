import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ConversationMessage, formatTime } from '../data/types';
import { colors, borderRadius, spacing, typography } from '../theme/colors';

interface ChatBubbleProps {
  message: ConversationMessage;
  index: number;
}

export default function ChatBubble({ message, index }: ChatBubbleProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const isUser = message.role === 'User';
  const isSystem = message.role === 'System';

  // Check if message is a Q&A format response
  const isQAFormat = isUser && /^Q:\s*[\s\S]*\n\nA:\s/m.test(message.content);
  
  // Parse Q&A content if applicable
  const renderContent = () => {
    if (isQAFormat) {
      // Split only on the first occurrence of '\n\nA: '
      const match = message.content.match(/^Q:\s*([\s\S]*?)\n\nA:\s([\s\S]*)$/m);
      if (match) {
        const question = match[1];
        const answer = match[2];
        return (
          <>
            <Text style={styles.questionLabel}>ANSWERING:</Text>
            <Text style={styles.questionText}>{question}</Text>
            <View style={styles.answerDivider} />
            <Text style={styles.content}>{answer}</Text>
          </>
        );
      }
    }
    return <Text style={styles.content}>{message.content}</Text>;
  };

  if (isSystem) {
    return (
      <Animated.View
        style={[
          styles.systemContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.systemLine} />
        <Text style={styles.systemText}>{message.content}</Text>
        <View style={styles.systemLine} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        isUser ? styles.containerUser : styles.containerAssistant,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {!isUser && (
        <LinearGradient
          colors={[colors.neonPurple + '30', colors.hotPink + '10']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarGradient}
        >
          <Text style={styles.avatarText}>AI</Text>
        </LinearGradient>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <View style={styles.bubbleHeader}>
          <Text
            style={[
              styles.roleName,
              { color: isUser ? colors.electricBlue : colors.neonPurple },
            ]}
          >
            {isUser ? 'You' : 'AI Assistant'}
          </Text>
          <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
        </View>
        {renderContent()}
        {message.metadata?.filesChanged && (
          <View style={styles.filesContainer}>
            <Text style={styles.filesLabel}>Files changed:</Text>
            {message.metadata.filesChanged.map((file, i) => (
              <View key={i} style={styles.filePill}>
                <Text style={styles.fileText}>{file}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {isUser && (
        <LinearGradient
          colors={[colors.electricBlue + '30', colors.neonPurple + '10']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarGradient}
        >
          <Text style={styles.avatarText}>U</Text>
        </LinearGradient>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  containerUser: {
    justifyContent: 'flex-end',
  },
  containerAssistant: {
    justifyContent: 'flex-start',
  },
  avatarGradient: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  bubbleUser: {
    backgroundColor: colors.electricBlue + '12',
    borderColor: colors.electricBlue + '25',
    borderTopRightRadius: spacing.xs,
  },
  bubbleAssistant: {
    backgroundColor: colors.neonPurple + '10',
    borderColor: colors.neonPurple + '20',
    borderTopLeftRadius: spacing.xs,
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  roleName: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timestamp: {
    ...typography.caption,
    fontSize: 10,
    marginLeft: spacing.sm,
  },
  content: {
    ...typography.body,
    lineHeight: 20,
  },
  questionLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  questionText: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  answerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.sm,
  },
  filesContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filesLabel: {
    ...typography.caption,
    fontSize: 10,
    marginRight: spacing.xs,
  },
  filePill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  fileText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  systemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  systemLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  systemText: {
    ...typography.caption,
    fontSize: 11,
    textAlign: 'center',
    color: colors.neonGreen,
    fontWeight: '500',
  },
});
