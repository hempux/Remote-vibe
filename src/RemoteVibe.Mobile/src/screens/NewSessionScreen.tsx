import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../components/GlassCard';
import { GitHubRepository } from '../data/types';
import * as apiClient from '../services/apiClient';
import { colors, borderRadius, spacing, typography } from '../theme/colors';

interface NewSessionScreenProps {
  navigation: any;
}

type Step = 'select-repo' | 'describe-task';

export default function NewSessionScreen({ navigation }: NewSessionScreenProps) {
  const [step, setStep] = useState<Step>('select-repo');
  const [repos, setRepos] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
  const [taskDescription, setTaskDescription] = useState('');
  const [starting, setStarting] = useState(false);
  const insets = useSafeAreaInsets();

  const loadRepos = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await apiClient.getRepositories();
      setRepos(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  const filteredRepos = searchQuery
    ? repos.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    : repos;

  const handleSelectRepo = (repo: GitHubRepository) => {
    setSelectedRepo(repo);
    setStep('describe-task');
  };

  const handleStartSession = async () => {
    if (!selectedRepo || starting) return;
    setStarting(true);
    try {
      const session = await apiClient.startSession(
        selectedRepo.owner,
        selectedRepo.name,
        taskDescription.trim() || undefined
      );

      // If there's a task description, send it as the first command
      if (taskDescription.trim()) {
        try {
          await apiClient.sendCommand(session.sessionId, taskDescription.trim());
        } catch {
          // Session started but command failed - still navigate
        }
      }

      navigation.replace('SessionDashboard', { sessionId: session.sessionId });
    } catch (e: any) {
      setError(e.message || 'Failed to start session');
      setStarting(false);
    }
  };

  const handleBack = () => {
    if (step === 'describe-task') {
      setStep('select-repo');
    } else {
      navigation.goBack();
    }
  };

  const getLanguageColor = (lang: string | null): string => {
    const languageColors: Record<string, string> = {
      TypeScript: colors.electricBlue,
      JavaScript: '#f7df1e',
      Python: '#3776AB',
      Java: '#b07219',
      'C#': '#178600',
      Go: '#00ADD8',
      Rust: '#dea584',
      Ruby: '#CC342D',
      Swift: '#FA7343',
      Kotlin: '#A97BFF',
    };
    return lang ? languageColors[lang] ?? colors.textTertiary : colors.textTertiary;
  };

  const renderRepoItem = ({ item }: { item: GitHubRepository }) => (
    <TouchableOpacity
      onPress={() => handleSelectRepo(item)}
      activeOpacity={0.7}
      style={styles.repoItem}
    >
      <View style={styles.repoCard}>
        <View style={styles.repoHeader}>
          <View style={styles.repoNameRow}>
            <Text style={styles.repoIcon}>{item.isPrivate ? '\u{1F512}' : '\u{1F4C2}'}</Text>
            <Text style={styles.repoName} numberOfLines={1}>{item.name}</Text>
          </View>
          <Text style={styles.repoOwner}>{item.owner}</Text>
        </View>
        {item.description && (
          <Text style={styles.repoDescription} numberOfLines={2}>{item.description}</Text>
        )}
        <View style={styles.repoMeta}>
          {item.language && (
            <View style={styles.repoLanguage}>
              <View style={[styles.langDot, { backgroundColor: getLanguageColor(item.language) }]} />
              <Text style={styles.langText}>{item.language}</Text>
            </View>
          )}
          <Text style={styles.repoBranch}>{item.defaultBranch}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a1a', '#0f1530', '#0d0d25', '#0a0a1a']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {step === 'select-repo' ? 'Select Repository' : 'Describe Your Task'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {step === 'select-repo'
              ? 'Choose a repository to start a new session'
              : `${selectedRepo?.fullName}`}
          </Text>
        </View>
        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={[styles.stepLine, step === 'describe-task' && styles.stepLineActive]} />
          <View style={[styles.stepDot, step === 'describe-task' && styles.stepDotActive]} />
        </View>
      </View>

      {step === 'select-repo' ? (
        <>
          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>{'~'}</Text>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search repositories..."
                placeholderTextColor={colors.textTertiary}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearButton}>x</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Repo List */}
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.electricBlue} />
              <Text style={[styles.stateText, { marginTop: spacing.lg }]}>
                Loading repositories...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.centerState}>
              <Text style={styles.stateIcon}>{'!'}</Text>
              <Text style={styles.stateTitle}>
                {error.includes('401') || error.includes('Unauthorized')
                  ? 'GitHub Token Required'
                  : 'Connection Error'}
              </Text>
              <Text style={styles.stateText}>
                {error.includes('401') || error.includes('Unauthorized')
                  ? 'Please configure your GitHub token in Settings to fetch repositories.'
                  : error}
              </Text>
              <TouchableOpacity onPress={loadRepos} style={styles.retryButton} activeOpacity={0.7}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredRepos.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.stateIcon}>{'{ }'}</Text>
              <Text style={styles.stateTitle}>
                {searchQuery ? 'No matching repositories' : 'No repositories found'}
              </Text>
              <Text style={styles.stateText}>
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Make sure your GitHub token has access to your repositories.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredRepos}
              renderItem={renderRepoItem}
              keyExtractor={(item) => item.fullName}
              contentContainerStyle={styles.repoList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      ) : (
        /* Step 2: Describe Task */
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.taskContainer}
        >
          <View style={styles.taskContent}>
            {/* Selected repo info */}
            <GlassCard
              gradientBorder={[colors.electricBlue + '40', colors.neonPurple + '20']}
              style={styles.selectedRepoCard}
            >
              <View style={styles.selectedRepoInner}>
                <Text style={styles.selectedRepoIcon}>{selectedRepo?.isPrivate ? '\u{1F512}' : '\u{1F4C2}'}</Text>
                <View style={styles.selectedRepoInfo}>
                  <Text style={styles.selectedRepoName}>{selectedRepo?.name}</Text>
                  <Text style={styles.selectedRepoOwner}>{selectedRepo?.owner}</Text>
                </View>
                {selectedRepo?.language && (
                  <View style={styles.selectedRepoLang}>
                    <View style={[styles.langDot, { backgroundColor: getLanguageColor(selectedRepo.language) }]} />
                    <Text style={styles.langText}>{selectedRepo.language}</Text>
                  </View>
                )}
              </View>
            </GlassCard>

            {/* Task description input */}
            <View style={styles.taskInputSection}>
              <Text style={styles.taskInputLabel}>What would you like to build?</Text>
              <Text style={styles.taskInputHint}>
                Describe the feature, bug fix, or changes you want the AI to work on. Be specific about requirements and expected behavior.
              </Text>
              <TextInput
                style={styles.taskInput}
                value={taskDescription}
                onChangeText={setTaskDescription}
                placeholder="e.g., Add a dark mode toggle to the settings page with persistence..."
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
                autoFocus
              />
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={() => {
                  setTaskDescription('');
                  handleStartSession();
                }}
                activeOpacity={0.7}
                disabled={starting}
                style={styles.skipButton}
              >
                <Text style={styles.skipButtonText}>Skip & Start</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleStartSession}
                activeOpacity={0.8}
                disabled={!taskDescription.trim() || starting}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={
                    taskDescription.trim() && !starting
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
                        !taskDescription.trim() && { color: colors.textTertiary },
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
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
    marginBottom: spacing.md,
  },
  backArrow: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerInfo: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.header,
    fontSize: 24,
  },
  headerSubtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepDotActive: {
    backgroundColor: colors.electricBlue,
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
  },
  stepLineActive: {
    backgroundColor: colors.electricBlue,
  },

  // Search
  searchContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
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

  // Center states
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  stateIcon: {
    fontSize: 48,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginBottom: spacing.lg,
  },
  stateTitle: {
    ...typography.subheader,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  stateText: {
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

  // Repo list
  repoList: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  repoItem: {
    marginBottom: spacing.md,
  },
  repoCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  repoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  repoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  repoIcon: {
    fontSize: 16,
  },
  repoName: {
    ...typography.bodyBold,
    fontSize: 16,
    flex: 1,
  },
  repoOwner: {
    ...typography.caption,
    fontFamily: 'monospace',
  },
  repoDescription: {
    ...typography.body,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  repoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  repoLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  langDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  langText: {
    ...typography.caption,
    fontSize: 12,
  },
  repoBranch: {
    ...typography.caption,
    fontSize: 11,
    fontFamily: 'monospace',
  },

  // Task description
  taskContainer: {
    flex: 1,
  },
  taskContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  selectedRepoCard: {
    marginBottom: spacing.xl,
  },
  selectedRepoInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  selectedRepoIcon: {
    fontSize: 20,
  },
  selectedRepoInfo: {
    flex: 1,
  },
  selectedRepoName: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  selectedRepoOwner: {
    ...typography.caption,
    fontFamily: 'monospace',
  },
  selectedRepoLang: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  taskInputSection: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  taskInputLabel: {
    ...typography.subheader,
    fontSize: 18,
    marginBottom: spacing.sm,
  },
  taskInputHint: {
    ...typography.body,
    fontSize: 13,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },
  taskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: 'rgba(255,255,255,0.04)',
    maxHeight: 300,
  },
  errorText: {
    color: colors.neonRed,
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  skipButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    fontSize: 14,
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
