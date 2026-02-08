import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, borderRadius, spacing } from '../theme/colors';

const TAB_ICONS: Record<string, { label: string; icon: string }> = {
  Sessions: { label: 'Sessions', icon: '\u25A6' },
  Settings: { label: 'Settings', icon: '\u2699' },
};

export default function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  if (isTablet) {
    return (
      <View style={[styles.sideRail, { paddingTop: insets.top + spacing.lg }]}>
        <BlurView intensity={60} tint="dark" style={styles.sideRailBlur}>
          <View style={styles.sideRailContent}>
            <Text style={styles.sideRailLogo}>RV</Text>
            <View style={styles.sideRailDivider} />
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;
              const tabInfo = TAB_ICONS[route.name] || {
                label: route.name,
                icon: '?',
              };

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  activeOpacity={0.7}
                  style={[
                    styles.sideRailTab,
                    isFocused && styles.sideRailTabActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                >
                  {isFocused && (
                    <LinearGradient
                      colors={[colors.electricBlue + '20', colors.neonPurple + '10']}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.sideRailIcon,
                      isFocused && styles.sideRailIconActive,
                    ]}
                  >
                    {tabInfo.icon}
                  </Text>
                  <Text
                    style={[
                      styles.sideRailLabel,
                      isFocused && styles.sideRailLabelActive,
                    ]}
                  >
                    {tabInfo.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </View>
    );
  }

  return (
    <View style={[styles.floatingContainer, { paddingBottom: insets.bottom }]}>
      <View style={styles.floatingBar}>
        <BlurView intensity={80} tint="dark" style={styles.barBlur}>
          <View style={styles.tabRow}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;
              const tabInfo = TAB_ICONS[route.name] || {
                label: route.name,
                icon: '?',
              };

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  activeOpacity={0.7}
                  style={styles.tab}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                >
                  {isFocused && (
                    <LinearGradient
                      colors={[colors.electricBlue + '25', colors.neonPurple + '15']}
                      style={styles.activeIndicator}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.tabIcon,
                      isFocused && styles.tabIconActive,
                    ]}
                  >
                    {tabInfo.icon}
                  </Text>
                  <Text
                    style={[
                      styles.tabLabel,
                      isFocused && styles.tabLabelActive,
                    ]}
                  >
                    {tabInfo.label}
                  </Text>
                  {isFocused && (
                    <View style={styles.activeDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Floating bottom tab bar (phone)
  floatingContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  floatingBar: {
    width: '100%',
    maxWidth: 300,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.tabBarBorder,
    marginBottom: spacing.sm,
    backgroundColor: colors.tabBarBackground,
  },
  barBlur: {
    flex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  activeIndicator: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.lg,
  },
  tabIcon: {
    fontSize: 20,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  tabIconActive: {
    color: colors.electricBlue,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: colors.electricBlue,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.electricBlue,
    marginTop: 3,
    shadowColor: colors.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  // Side rail (tablet)
  sideRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: colors.tabBarBackground,
    borderRightWidth: 1,
    borderRightColor: colors.tabBarBorder,
  },
  sideRailBlur: {
    flex: 1,
  },
  sideRailContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  sideRailLogo: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.electricBlue,
    letterSpacing: -1,
  },
  sideRailDivider: {
    width: 32,
    height: 1,
    backgroundColor: colors.glassBorder,
    marginVertical: spacing.sm,
  },
  sideRailTab: {
    width: 60,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sideRailTabActive: {
    borderWidth: 1,
    borderColor: colors.electricBlue + '20',
  },
  sideRailIcon: {
    fontSize: 22,
    color: colors.textTertiary,
  },
  sideRailIconActive: {
    color: colors.electricBlue,
  },
  sideRailLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textTertiary,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  sideRailLabelActive: {
    color: colors.electricBlue,
  },
});
