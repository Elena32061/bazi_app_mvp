import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { fonts, palette, radius, spacing, typography } from "../theme/tokens";

type Props = {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
};

export default function FormField({ label, value, placeholder, onChangeText }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={palette.ink500}
        style={styles.input}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md
  },
  label: {
    color: palette.ink700,
    fontSize: typography.caption,
    marginBottom: spacing.xs,
    fontWeight: "700",
    letterSpacing: 0.2,
    fontFamily: fonts.body
  },
  input: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.sand200,
    backgroundColor: palette.cream100,
    color: palette.ink900,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    fontFamily: fonts.body
  }
});
