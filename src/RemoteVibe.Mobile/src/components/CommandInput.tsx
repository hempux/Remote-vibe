import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  TouchableOpacity,
  Animated,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing } from '../theme/colors';

interface CommandInputProps {
  onSend: (text: string) => void;
}

export default function CommandInput({ onSend }: CommandInputProps) {
  const [text, setText] = useState('');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleSend = () => {
    if (!text.trim()) return;
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    onSend(text.trim());
    setText('');
    Keyboard.dismiss();
  };

  const hasText = text.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Send a command to AI..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={handleSend}
          />
        </View>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            onPress={handleSend}
            activeOpacity={0.7}
            disabled={!hasText}
          >
            <LinearGradient
              colors={
                hasText
                  ? [colors.electricBlue, colors.neonPurple]
                  : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.sendButton,
                hasText && styles.sendButtonActive,
              ]}
            >
              <View style={styles.sendArrow}>
                <View style={[styles.arrowLine, !hasText && styles.arrowDisabled]} />
                <View style={[styles.arrowHead, !hasText && styles.arrowDisabled]} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(10,10,26,0.95)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    shadowColor: colors.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  sendArrow: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowLine: {
    width: 2,
    height: 14,
    backgroundColor: colors.textPrimary,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }, { translateX: -2 }, { translateY: 2 }],
  },
  arrowHead: {
    width: 2,
    height: 8,
    backgroundColor: colors.textPrimary,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }, { translateX: 2 }, { translateY: -4 }],
    position: 'absolute',
  },
  arrowDisabled: {
    backgroundColor: colors.textTertiary,
  },
});
