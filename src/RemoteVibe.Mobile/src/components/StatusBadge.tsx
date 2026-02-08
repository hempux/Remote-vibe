import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { SessionStatus, getStatusColor, getStatusLabel } from '../data/types';
import { borderRadius, spacing } from '../theme/colors';

interface StatusBadgeProps {
  status: SessionStatus;
  size?: 'small' | 'medium';
}

export default function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'Processing' || status === 'WaitingForInput') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.container,
        isSmall ? styles.containerSmall : styles.containerMedium,
        { backgroundColor: `${color}18` },
      ]}
    >
      <Animated.View
        style={[
          styles.dot,
          isSmall ? styles.dotSmall : styles.dotMedium,
          {
            backgroundColor: color,
            opacity: pulseAnim,
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
          },
        ]}
      />
      <Text
        style={[
          styles.label,
          isSmall ? styles.labelSmall : styles.labelMedium,
          { color },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  containerSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 5,
  },
  containerMedium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  dot: {
    borderRadius: borderRadius.full,
  },
  dotSmall: {
    width: 6,
    height: 6,
  },
  dotMedium: {
    width: 8,
    height: 8,
  },
  label: {
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  labelMedium: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
