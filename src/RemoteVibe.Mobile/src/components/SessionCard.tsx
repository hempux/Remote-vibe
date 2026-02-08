import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import StatusBadge from './StatusBadge';
import { Session, formatTimeAgo } from '../data/types';
import { colors, borderRadius, spacing, typography } from '../theme/colors';

interface SessionCardProps {
  session: Session;
  onPress: (session: Session) => void;
  index: number;
}

export default function SessionCard({ session, onPress, index }: SessionCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const repoName = session.repositoryPath?.split('/').pop() || session.sessionId;

  const getBorderColors = (): [string, string] => {
    switch (session.status) {
      case 'Processing':
        return [colors.electricBlue + '40', colors.neonPurple + '20'];
      case 'WaitingForInput':
        return [colors.neonYellow + '40', colors.hotPink + '20'];
      case 'Completed':
        return [colors.neonGreen + '30', colors.electricBlue + '15'];
      case 'Error':
        return [colors.neonRed + '40', colors.neonYellow + '15'];
      default:
        return ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)'];
    }
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        onPress={() => onPress(session)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={getBorderColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          <View style={styles.cardInner}>
            <View style={styles.topRow}>
              <View style={styles.pathContainer}>
                <Text style={styles.folderIcon}>{'</>'}</Text>
                <Text style={styles.repoName} numberOfLines={1}>
                  {repoName}
                </Text>
              </View>
              <StatusBadge status={session.status} />
            </View>

            <Text style={styles.fullPath} numberOfLines={1}>
              {session.repositoryPath ?? session.sessionId}
            </Text>

            {session.currentCommand && (
              <View style={styles.commandRow}>
                <View style={styles.commandDot} />
                <Text style={styles.commandText} numberOfLines={1}>
                  {session.currentCommand}
                </Text>
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.timeText}>
                Last activity {session.lastActivityAt ? formatTimeAgo(session.lastActivityAt) : 'N/A'}
              </Text>
              <View style={styles.chevron}>
                <Text style={styles.chevronText}>{'>'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gradientBorder: {
    borderRadius: borderRadius.lg,
    padding: 1,
    marginBottom: spacing.md,
  },
  cardInner: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg - 1,
    padding: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  folderIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neonPurple,
    fontFamily: 'monospace',
  },
  repoName: {
    ...typography.bodyBold,
    fontSize: 17,
    flex: 1,
  },
  fullPath: {
    ...typography.caption,
    fontFamily: 'monospace',
    marginBottom: spacing.md,
  },
  commandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  commandDot: {
    width: 5,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.electricBlue,
  },
  commandText: {
    ...typography.body,
    fontSize: 13,
    flex: 1,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    ...typography.caption,
  },
  chevron: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronText: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
});
