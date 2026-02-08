import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius } from '../theme/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  noBorder?: boolean;
  gradientBorder?: readonly [string, string] | string[];
}

export default function GlassCard({
  children,
  style,
  intensity = 40,
  noBorder = false,
  gradientBorder,
}: GlassCardProps) {
  if (gradientBorder) {
    return (
      <LinearGradient
        colors={gradientBorder as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientWrapper, style]}
      >
        <View style={styles.gradientInner}>
          <BlurView intensity={intensity} tint="dark" style={styles.blur}>
            <View style={styles.content}>{children}</View>
          </BlurView>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.container,
        !noBorder && styles.border,
        style,
      ]}
    >
      <BlurView intensity={intensity} tint="dark" style={styles.blur}>
        <View style={styles.content}>{children}</View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundCard,
  },
  border: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  blur: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  gradientWrapper: {
    borderRadius: borderRadius.lg,
    padding: 1,
  },
  gradientInner: {
    borderRadius: borderRadius.lg - 1,
    overflow: 'hidden',
    backgroundColor: colors.backgroundCard,
    flex: 1,
  },
});
