import React, { useState } from "react";
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import FormField from "../components/FormField";
import GlassCard from "../components/GlassCard";
import PrimaryButton from "../components/PrimaryButton";
import { loginAccount, registerAccount, SessionUser } from "../data/localStore";
import { fonts, palette, radius, spacing, typography } from "../theme/tokens";

type Props = {
  onAuthSuccess: (user: SessionUser) => void;
};

type AuthMode = "login" | "register";

const DAO_BG_AUTH =
  "https://images.unsplash.com/photo-1713118775679-cee8a04e0d73?auto=format&fit=crop&fm=jpg&q=70&w=1800";

export default function AuthScreen({ onAuthSuccess }: Props) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      if (loading) {
        return;
      }
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();
      if (!cleanUsername || !cleanPassword) {
        Alert.alert("信息不完整", "请输入用户名和密码。");
        return;
      }
      if (mode === "register" && cleanPassword !== confirmPassword.trim()) {
        Alert.alert("两次密码不一致", "请重新确认注册密码。");
        return;
      }

      setLoading(true);
      const user = mode === "register"
        ? await registerAccount(cleanUsername, cleanPassword)
        : await loginAccount(cleanUsername, cleanPassword);
      onAuthSuccess(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失败，请稍后重试";
      Alert.alert(mode === "register" ? "注册失败" : "登录失败", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ImageBackground source={{ uri: DAO_BG_AUTH }} style={styles.hero} imageStyle={styles.heroImage}>
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>云篆命理</Text>
            <Text style={styles.heroSub}>先登录，再保存每一次排盘与分析</Text>
          </View>
        </ImageBackground>

        <GlassCard>
          <View style={styles.switchRow}>
            <Pressable
              onPress={() => setMode("login")}
              style={[styles.switchBtn, mode === "login" ? styles.switchBtnActive : null]}
            >
              <Text style={[styles.switchText, mode === "login" ? styles.switchTextActive : null]}>登录</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("register")}
              style={[styles.switchBtn, mode === "register" ? styles.switchBtnActive : null]}
            >
              <Text style={[styles.switchText, mode === "register" ? styles.switchTextActive : null]}>注册</Text>
            </Pressable>
          </View>

          <Text style={styles.formTitle}>{mode === "login" ? "欢迎回来" : "创建新账户"}</Text>
          <Text style={styles.formSub}>
            {mode === "login" ? "登录后可查看你的历史排盘记录。" : "注册后每次排盘会自动保存到你的专属记录。"}
          </Text>

          <FormField
            label="用户名"
            value={username}
            placeholder="请输入用户名"
            onChangeText={setUsername}
          />
          <FormField
            label="密码"
            value={password}
            placeholder="请输入密码（至少4位）"
            onChangeText={setPassword}
          />
          {mode === "register" ? (
            <FormField
              label="确认密码"
              value={confirmPassword}
              placeholder="请再次输入密码"
              onChangeText={setConfirmPassword}
            />
          ) : null}

          <PrimaryButton
            title={mode === "login" ? "登录并进入" : "注册并进入"}
            onPress={onSubmit}
            loading={loading}
          />
          <Text style={styles.hint}>
            当前为本地离线账户，数据保存在本机设备中。
          </Text>
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md
  },
  hero: {
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(205,170,91,0.28)"
  },
  heroImage: {
    opacity: 0.26
  },
  heroOverlay: {
    padding: spacing.lg,
    backgroundColor: "rgba(255,252,245,0.75)"
  },
  heroTitle: {
    color: palette.ink900,
    fontFamily: fonts.display,
    fontSize: 34,
    fontWeight: "800"
  },
  heroSub: {
    marginTop: spacing.xs,
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: typography.body
  },
  switchRow: {
    marginBottom: spacing.sm,
    flexDirection: "row",
    gap: spacing.xs
  },
  switchBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(205,170,91,0.35)",
    backgroundColor: "rgba(255,253,248,0.65)"
  },
  switchBtnActive: {
    backgroundColor: "rgba(205,170,91,0.25)"
  },
  switchText: {
    color: palette.ink700,
    fontFamily: fonts.body,
    fontSize: typography.body,
    fontWeight: "700"
  },
  switchTextActive: {
    color: palette.ink900,
    fontWeight: "800"
  },
  formTitle: {
    color: palette.ink900,
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: "800"
  },
  formSub: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: typography.caption
  },
  hint: {
    marginTop: spacing.sm,
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: typography.caption
  }
});
