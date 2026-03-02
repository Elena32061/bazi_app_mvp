import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { fonts, palette, radius, spacing } from "../theme/tokens";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary";
};

export default function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary"
}: Props) {
  const blocked = Boolean(disabled || loading);

  return (
    <Pressable
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" ? styles.secondaryButton : null,
        pressed && !blocked ? styles.pressed : null,
        blocked ? styles.disabled : null
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? palette.ink900 : palette.cream100} />
      ) : (
        <Text style={[styles.text, variant === "secondary" ? styles.secondaryText : null]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    backgroundColor: palette.ink950,
    paddingVertical: spacing.sm + 3,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2
  },
  secondaryButton: {
    backgroundColor: "rgba(205,170,91,0.18)",
    borderWidth: 1,
    borderColor: "rgba(205,170,91,0.52)"
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.94
  },
  disabled: {
    backgroundColor: palette.ink500,
    shadowOpacity: 0
  },
  text: {
    color: palette.cream100,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.35,
    fontFamily: fonts.body
  },
  secondaryText: {
    color: palette.ink900
  }
});
