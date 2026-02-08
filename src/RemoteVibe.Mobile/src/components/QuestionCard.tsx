import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from './GlassCard';
import { PendingQuestion } from '../data/types';
import { colors, borderRadius, spacing, typography } from '../theme/colors';

interface QuestionCardProps {
  question: PendingQuestion;
  onAnswer: (questionId: string, answer: string) => void;
}

export default function QuestionCard({ question, onAnswer }: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');

  const handleSubmit = () => {
    if (question.questionType === 'FreeText') {
      if (freeText.trim()) onAnswer(question.id, freeText);
    } else if (selectedOption) {
      onAnswer(question.id, selectedOption);
    }
  };

  return (
    <GlassCard
      gradientBorder={[colors.neonYellow + '60', colors.hotPink + '40']}
      style={styles.card}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.questionBadge}>
            <Text style={styles.questionBadgeText}>?</Text>
          </View>
          <Text style={styles.questionLabel}>AI needs your input</Text>
        </View>

        <Text style={styles.questionText}>{question.question}</Text>

        {question.questionType === 'MultipleChoice' && question.options && (
          <View style={styles.options}>
            {question.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedOption(option)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.option,
                    selectedOption === option && styles.optionSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.radio,
                      selectedOption === option && styles.radioSelected,
                    ]}
                  >
                    {selectedOption === option && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      selectedOption === option && styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {question.questionType === 'YesNo' && (
          <View style={styles.yesNoContainer}>
            <TouchableOpacity
              style={[
                styles.yesNoButton,
                selectedOption === 'Yes' && styles.yesButtonSelected,
              ]}
              onPress={() => setSelectedOption('Yes')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.yesNoText,
                  selectedOption === 'Yes' && styles.yesNoTextSelected,
                ]}
              >
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.yesNoButton,
                selectedOption === 'No' && styles.noButtonSelected,
              ]}
              onPress={() => setSelectedOption('No')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.yesNoText,
                  selectedOption === 'No' && styles.yesNoTextSelected,
                ]}
              >
                No
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {question.questionType === 'FreeText' && (
          <TextInput
            style={styles.freeTextInput}
            value={freeText}
            onChangeText={setFreeText}
            placeholder="Type your answer..."
            placeholderTextColor={colors.textTertiary}
            multiline
          />
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={!selectedOption && !freeText.trim()}
        >
          <LinearGradient
            colors={
              selectedOption || freeText.trim()
                ? [colors.electricBlue, colors.neonPurple]
                : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitButton}
          >
            <Text
              style={[
                styles.submitText,
                !(selectedOption || freeText.trim()) && styles.submitTextDisabled,
              ]}
            >
              Submit Answer
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  inner: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  questionBadge: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neonYellow + '25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neonYellow,
  },
  questionLabel: {
    ...typography.small,
    color: colors.neonYellow,
  },
  questionText: {
    ...typography.bodyBold,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  options: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: spacing.md,
  },
  optionSelected: {
    borderColor: colors.electricBlue + '50',
    backgroundColor: colors.electricBlue + '10',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.electricBlue,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.electricBlue,
  },
  optionText: {
    ...typography.body,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.textPrimary,
  },
  yesNoContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  yesNoButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  yesButtonSelected: {
    borderColor: colors.neonGreen + '50',
    backgroundColor: colors.neonGreen + '15',
  },
  noButtonSelected: {
    borderColor: colors.neonRed + '50',
    backgroundColor: colors.neonRed + '15',
  },
  yesNoText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  yesNoTextSelected: {
    color: colors.textPrimary,
  },
  freeTextInput: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  submitButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  submitTextDisabled: {
    color: colors.textTertiary,
  },
});
