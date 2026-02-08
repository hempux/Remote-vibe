import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Animated,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../components/GlassCard';
import { useApp } from '../context/AppContext';
import { GitHubAuthStatus, CopilotAuthStatus, UsageQuota } from '../data/types';
import * as apiClient from '../services/apiClient';
import * as storage from '../services/storage';
import { colors, borderRadius, spacing, typography } from '../theme/colors';

export default function SettingsScreen() {
  const { backendUrl, setBackendUrl, isConnected, isConnecting, connect, disconnect } = useApp();
  const [urlInput, setUrlInput] = useState(backendUrl);
  const [urlSaved, setUrlSaved] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  // GitHub auth state
  const [githubToken, setGithubToken] = useState('');
  const [githubAuthStatus, setGithubAuthStatus] = useState<GitHubAuthStatus | null>(null);
  const [githubAuthLoading, setGithubAuthLoading] = useState(false);
  const [githubTokenVisible, setGithubTokenVisible] = useState(false);

  // Copilot auth state
  const [copilotAuthStatus, setCopilotAuthStatus] = useState<CopilotAuthStatus | null>(null);
  const [copilotAuthLoading, setCopilotAuthLoading] = useState(false);

  // Usage quota state
  const [usageQuota, setUsageQuota] = useState<UsageQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setUrlInput(backendUrl);
  }, [backendUrl]);

  // Load saved GitHub token
  useEffect(() => {
    storage.getGitHubToken().then((token) => {
      if (token) setGithubToken(token);
    });
  }, []);

  // Fetch auth statuses when connected
  useEffect(() => {
    if (isConnected) {
      loadGitHubAuthStatus();
      loadCopilotAuthStatus();
      loadUsageQuota();
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isConnected, pulseAnim]);

  const loadGitHubAuthStatus = async () => {
    try {
      const status = await apiClient.getGitHubAuthStatus();
      setGithubAuthStatus(status);
    } catch {
      // Silently fail - will show as disconnected
    }
  };

  const loadCopilotAuthStatus = async () => {
    try {
      const status = await apiClient.getCopilotAuthStatus();
      setCopilotAuthStatus(status);
    } catch {
      // Silently fail
    }
  };

  const loadUsageQuota = async () => {
    setQuotaLoading(true);
    try {
      const quota = await apiClient.getUsageQuota();
      setUsageQuota(quota);
    } catch {
      // Silently fail
    } finally {
      setQuotaLoading(false);
    }
  };

  const handleSaveUrl = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed || trimmed === backendUrl) return;
    await setBackendUrl(trimmed);
    setUrlSaved(true);
    setTimeout(() => setUrlSaved(false), 2000);
  }, [urlInput, backendUrl, setBackendUrl]);

  const handleToggleConnection = useCallback(async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  }, [isConnected, connect, disconnect]);

  const handleSaveGitHubToken = async () => {
    const trimmed = githubToken.trim();
    if (!trimmed) return;
    setGithubAuthLoading(true);
    try {
      await storage.setGitHubToken(trimmed);
      const status = await apiClient.setGitHubToken(trimmed);
      setGithubAuthStatus(status);
    } catch {
      setGithubAuthStatus({ isAuthenticated: false, username: null, avatarUrl: null });
    } finally {
      setGithubAuthLoading(false);
    }
  };

  const handleClearGitHubToken = async () => {
    setGithubToken('');
    await storage.clearGitHubToken();
    setGithubAuthStatus(null);
  };

  const handleCopilotAuth = async () => {
    const trimmed = githubToken.trim();
    if (!trimmed) return;
    setCopilotAuthLoading(true);
    try {
      const status = await apiClient.setCopilotAuth(trimmed);
      setCopilotAuthStatus(status);
    } catch {
      setCopilotAuthStatus({ isAuthenticated: false, username: null, requiresAdditionalAuth: true, authUrl: null });
    } finally {
      setCopilotAuthLoading(false);
    }
  };

  const connectionLabel = isConnecting
    ? 'Connecting...'
    : isConnected
      ? 'Connected'
      : 'Disconnected';

  const connectionColor = isConnecting
    ? colors.neonYellow
    : isConnected
      ? colors.neonGreen
      : colors.neonRed;

  const quotaPercentage = usageQuota && usageQuota.premiumRequestsLimit > 0
    ? Math.round((usageQuota.premiumRequestsUsed / usageQuota.premiumRequestsLimit) * 100)
    : 0;

  const quotaColor = quotaPercentage > 80
    ? colors.neonRed
    : quotaPercentage > 50
      ? colors.neonYellow
      : colors.neonGreen;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a1a', '#0f1530', '#0d0d25', '#0a0a1a']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={[styles.scrollView, { paddingLeft: isTablet ? 80 : 0 }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Configure your RemoteVibe experience</Text>
        </View>

        {/* Connection Status */}
        <GlassCard
          gradientBorder={
            isConnected
              ? [colors.neonGreen + '50', colors.electricBlue + '25']
              : [colors.neonRed + '50', colors.neonYellow + '25']
          }
          style={styles.card}
        >
          <View style={styles.cardInner}>
            <View style={styles.connectionHeader}>
              <View style={styles.connectionInfo}>
                <Text style={styles.cardTitle}>Connection Status</Text>
                <View style={styles.connectionStatusRow}>
                  {isConnecting ? (
                    <ActivityIndicator size="small" color={colors.neonYellow} />
                  ) : (
                    <Animated.View
                      style={[
                        styles.connectionDot,
                        {
                          backgroundColor: connectionColor,
                          opacity: isConnected ? pulseAnim : 1,
                          shadowColor: connectionColor,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.8,
                          shadowRadius: 6,
                        },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.connectionStatus,
                      { color: connectionColor },
                    ]}
                  >
                    {connectionLabel}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleToggleConnection}
                activeOpacity={0.7}
                disabled={isConnecting}
              >
                <LinearGradient
                  colors={
                    isConnected
                      ? [colors.neonRed + '20', colors.neonRed + '10']
                      : [colors.neonGreen + '20', colors.neonGreen + '10']
                  }
                  style={styles.reconnectButton}
                >
                  <Text
                    style={[
                      styles.reconnectText,
                      {
                        color: isConnected
                          ? colors.neonRed
                          : colors.neonGreen,
                      },
                    ]}
                  >
                    {isConnected ? 'Disconnect' : 'Connect'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {isConnected ? 'SignalR' : '--'}
                </Text>
                <Text style={styles.statLabel}>Protocol</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {isConnected ? 'Live' : 'Off'}
                </Text>
                <Text style={styles.statLabel}>Status</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>v1.0</Text>
                <Text style={styles.statLabel}>API</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Backend Configuration */}
        <GlassCard style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Backend Configuration</Text>
            <Text style={styles.fieldLabel}>API Endpoint</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="https://localhost:5002"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
                onBlur={handleSaveUrl}
                onSubmitEditing={handleSaveUrl}
              />
            </View>
            <View style={styles.inputHintRow}>
              <Text style={styles.inputHint}>
                The URL of your RemoteVibe backend server
              </Text>
              {urlSaved && (
                <Text style={styles.savedLabel}>Saved</Text>
              )}
            </View>
            {urlInput.trim() !== backendUrl && urlInput.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleSaveUrl}
                activeOpacity={0.7}
                style={styles.saveButton}
              >
                <LinearGradient
                  colors={[colors.electricBlue, colors.neonPurple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>Save URL</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>

        {/* GitHub Authentication */}
        <GlassCard
          gradientBorder={
            githubAuthStatus?.isAuthenticated
              ? [colors.neonGreen + '40', colors.electricBlue + '20']
              : undefined
          }
          style={styles.card}
        >
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>GitHub Authentication</Text>
            {githubAuthStatus?.isAuthenticated ? (
              <View style={styles.authStatusRow}>
                <View style={styles.authStatusInfo}>
                  <View style={[styles.connectionDot, { backgroundColor: colors.neonGreen }]} />
                  <Text style={[styles.connectionStatus, { color: colors.neonGreen }]}>
                    Authenticated as {githubAuthStatus.username}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleClearGitHubToken} activeOpacity={0.7}>
                  <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Personal Access Token</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={githubToken}
                    onChangeText={setGithubToken}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!githubTokenVisible}
                  />
                  <TouchableOpacity
                    onPress={() => setGithubTokenVisible(!githubTokenVisible)}
                    style={styles.toggleVisibility}
                  >
                    <Text style={styles.toggleVisibilityText}>
                      {githubTokenVisible ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.inputHint}>
                  Token needs repo scope to list your repositories
                </Text>
                {githubToken.trim().length > 0 && (
                  <TouchableOpacity
                    onPress={handleSaveGitHubToken}
                    activeOpacity={0.7}
                    style={styles.saveButton}
                    disabled={githubAuthLoading}
                  >
                    <LinearGradient
                      colors={[colors.electricBlue, colors.neonPurple]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.saveButtonGradient}
                    >
                      {githubAuthLoading ? (
                        <ActivityIndicator size="small" color={colors.textPrimary} />
                      ) : (
                        <Text style={styles.saveButtonText}>Authenticate</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </GlassCard>

        {/* Copilot Authentication */}
        <GlassCard
          gradientBorder={
            copilotAuthStatus?.isAuthenticated
              ? [colors.neonGreen + '40', colors.neonPurple + '20']
              : undefined
          }
          style={styles.card}
        >
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Copilot Authentication</Text>
            <View style={styles.authStatusRow}>
              <View style={styles.authStatusInfo}>
                <View
                  style={[
                    styles.connectionDot,
                    {
                      backgroundColor: copilotAuthStatus?.isAuthenticated
                        ? colors.neonGreen
                        : colors.neonRed,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.connectionStatus,
                    {
                      color: copilotAuthStatus?.isAuthenticated
                        ? colors.neonGreen
                        : colors.textTertiary,
                    },
                  ]}
                >
                  {copilotAuthStatus?.isAuthenticated
                    ? `Connected${copilotAuthStatus.username ? ` as ${copilotAuthStatus.username}` : ''}`
                    : 'Not connected'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCopilotAuth}
                activeOpacity={0.7}
                disabled={copilotAuthLoading || !githubToken.trim()}
              >
                <LinearGradient
                  colors={[colors.neonPurple + '20', colors.electricBlue + '10']}
                  style={styles.reconnectButton}
                >
                  {copilotAuthLoading ? (
                    <ActivityIndicator size="small" color={colors.neonPurple} />
                  ) : (
                    <Text style={[styles.reconnectText, { color: colors.neonPurple }]}>
                      {copilotAuthStatus?.isAuthenticated ? 'Refresh' : 'Authenticate'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
            {copilotAuthStatus?.requiresAdditionalAuth && (
              <Text style={styles.authWarning}>
                Additional authentication may be required. Ensure GitHub Copilot is active on your account.
              </Text>
            )}
            {!githubToken.trim() && (
              <Text style={styles.authWarning}>
                Set your GitHub token above first to authenticate with Copilot.
              </Text>
            )}
          </View>
        </GlassCard>

        {/* Usage Quota */}
        <GlassCard style={styles.card}>
          <View style={styles.cardInner}>
            <View style={styles.quotaHeader}>
              <Text style={styles.cardTitle}>Premium Usage</Text>
              <TouchableOpacity onPress={loadUsageQuota} activeOpacity={0.7} disabled={quotaLoading}>
                {quotaLoading ? (
                  <ActivityIndicator size="small" color={colors.electricBlue} />
                ) : (
                  <Text style={styles.refreshText}>Refresh</Text>
                )}
              </TouchableOpacity>
            </View>
            {usageQuota && usageQuota.premiumRequestsLimit > 0 ? (
              <>
                <View style={styles.quotaBarContainer}>
                  <View style={styles.quotaBarBackground}>
                    <LinearGradient
                      colors={[quotaColor, quotaColor + '80']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.quotaBarFill, { width: `${Math.min(quotaPercentage, 100)}%` }]}
                    />
                  </View>
                </View>
                <View style={styles.quotaStats}>
                  <Text style={styles.quotaText}>
                    <Text style={[styles.quotaValue, { color: quotaColor }]}>
                      {usageQuota.premiumRequestsUsed}
                    </Text>
                    {' / '}
                    {usageQuota.premiumRequestsLimit} requests
                  </Text>
                  <Text style={styles.quotaPercent}>{quotaPercentage}% used</Text>
                </View>
                <Text style={styles.quotaReset}>
                  Resets {new Date(usageQuota.resetDate).toLocaleDateString()}
                </Text>
              </>
            ) : (
              <Text style={styles.quotaUnavailable}>
                Usage data not available. The VS Code server may not support quota reporting yet.
              </Text>
            )}
          </View>
        </GlassCard>

        {/* Preferences */}
        <GlassCard style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Preferences</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Get notified when AI needs your input
                </Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{
                  false: 'rgba(255,255,255,0.1)',
                  true: colors.electricBlue + '40',
                }}
                thumbColor={notifications ? colors.electricBlue : '#666'}
                ios_backgroundColor="rgba(255,255,255,0.1)"
              />
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto-scroll Chat</Text>
                <Text style={styles.settingDescription}>
                  Automatically scroll to new messages
                </Text>
              </View>
              <Switch
                value={autoScroll}
                onValueChange={setAutoScroll}
                trackColor={{
                  false: 'rgba(255,255,255,0.1)',
                  true: colors.electricBlue + '40',
                }}
                thumbColor={autoScroll ? colors.electricBlue : '#666'}
                ios_backgroundColor="rgba(255,255,255,0.1)"
              />
            </View>
          </View>
        </GlassCard>

        {/* App Info */}
        <GlassCard style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>About</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Expo SDK</Text>
              <Text style={styles.infoValue}>52.0.0</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Theme</Text>
              <LinearGradient
                colors={[colors.electricBlue, colors.neonPurple, colors.hotPink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.themeBadge}
              >
                <Text style={styles.themeBadgeText}>Neon Glass</Text>
              </LinearGradient>
            </View>
          </View>
        </GlassCard>

        {/* Logo */}
        <View style={styles.logoSection}>
          <LinearGradient
            colors={[colors.electricBlue, colors.neonPurple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoGradientText}
          >
            <Text style={styles.logoText}>RemoteVibe</Text>
          </LinearGradient>
          <Text style={styles.logoSubtext}>AI Coding Sessions, Anywhere</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.header,
    fontSize: 32,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardInner: {
    padding: spacing.xl,
  },
  cardTitle: {
    ...typography.subheader,
    fontSize: 16,
    marginBottom: spacing.lg,
  },

  // Connection status
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectionStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  reconnectButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  reconnectText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.electricBlue,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Input
  fieldLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  inputHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  inputHint: {
    ...typography.caption,
    fontSize: 11,
  },
  savedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neonGreen,
  },
  saveButton: {
    marginTop: spacing.md,
  },
  saveButtonGradient: {
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
  },

  // Settings rows
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.lg,
  },
  settingLabel: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  settingDescription: {
    ...typography.caption,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: spacing.sm,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    ...typography.body,
    fontSize: 14,
  },
  infoValue: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  themeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  themeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  logoGradientText: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  logoSubtext: {
    ...typography.body,
    marginTop: spacing.sm,
    color: colors.textTertiary,
  },

  // GitHub Auth
  authStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  authStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neonRed,
  },
  toggleVisibility: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  toggleVisibilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.electricBlue,
  },
  authWarning: {
    ...typography.caption,
    color: colors.neonYellow,
    marginTop: spacing.sm,
  },

  // Quota
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.electricBlue,
  },
  quotaBarContainer: {
    marginBottom: spacing.md,
  },
  quotaBarBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  quotaBarFill: {
    height: 8,
    borderRadius: 4,
  },
  quotaStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quotaText: {
    ...typography.body,
    fontSize: 13,
  },
  quotaValue: {
    fontWeight: '700',
  },
  quotaPercent: {
    ...typography.caption,
    fontWeight: '600',
  },
  quotaReset: {
    ...typography.caption,
    fontSize: 11,
  },
  quotaUnavailable: {
    ...typography.body,
    fontSize: 13,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
});
