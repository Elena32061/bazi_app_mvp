import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import GlassCard from "../components/GlassCard";
import PrimaryButton from "../components/PrimaryButton";
import { SavedReport, SessionUser } from "../data/localStore";
import { fonts, palette, radius, spacing, typography } from "../theme/tokens";

type Props = {
  user: SessionUser;
  reports: SavedReport[];
  onBack: () => void;
  onOpenReport: (report: SavedReport) => void;
  onDeleteReport: (report: SavedReport) => void;
  onLogout: () => void;
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export default function HistoryScreen({
  user,
  reports,
  onBack,
  onOpenReport,
  onDeleteReport,
  onLogout
}: Props) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} style={styles.smallBtn}>
          <Text style={styles.smallBtnText}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>历史记录</Text>
        <Pressable onPress={onLogout} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>退出</Text>
        </Pressable>
      </View>

      <GlassCard>
        <Text style={styles.title}>账号：{user.username}</Text>
        <Text style={styles.sub}>本账号下已保存 {reports.length} 条排盘记录，可随时回看。</Text>
      </GlassCard>

      {reports.length === 0 ? (
        <GlassCard>
          <Text style={styles.emptyTitle}>暂无记录</Text>
          <Text style={styles.emptySub}>先去首页完成一次排盘，系统会自动保存到这里。</Text>
          <PrimaryButton title="去排盘" onPress={onBack} />
        </GlassCard>
      ) : (
        reports.map((item, idx) => (
          <GlassCard key={item.id}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>#{idx + 1} · {item.input.name || "未命名用户"}</Text>
              <Text style={styles.timeText}>{formatDateTime(item.createdAt)}</Text>
            </View>
            <Text style={styles.meta}>
              {item.input.gender || "未填性别"} · {item.input.birthDate || "-"} {item.input.birthTime || "-"}
            </Text>
            <Text style={styles.meta}>地点：{item.input.birthCity || "未填"}</Text>
            <Text style={styles.meta}>年度关键词：{item.result.monthlyFocus}</Text>
            <View style={styles.actionRow}>
              <Pressable style={styles.openBtn} onPress={() => onOpenReport(item)}>
                <Text style={styles.openBtnText}>查看报告</Text>
              </Pressable>
              <Pressable
                style={styles.deleteBtn}
                onPress={() =>
                  Alert.alert("删除记录", "确认删除这条报告记录吗？", [
                    { text: "取消", style: "cancel" },
                    { text: "删除", style: "destructive", onPress: () => onDeleteReport(item) }
                  ])
                }
              >
                <Text style={styles.deleteBtnText}>删除</Text>
              </Pressable>
            </View>
          </GlassCard>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerTitle: {
    color: palette.ink900,
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: "800"
  },
  smallBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(205,170,91,0.55)",
    backgroundColor: "rgba(205,170,91,0.16)"
  },
  smallBtnText: {
    color: palette.ink700,
    fontFamily: fonts.body,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  ghostBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(196,81,45,0.35)",
    backgroundColor: "rgba(196,81,45,0.1)"
  },
  ghostBtnText: {
    color: palette.vermilion500,
    fontFamily: fonts.body,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  title: {
    color: palette.ink900,
    fontFamily: fonts.body,
    fontSize: typography.subtitle,
    fontWeight: "800"
  },
  sub: {
    marginTop: spacing.xs,
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: typography.caption
  },
  emptyTitle: {
    color: palette.ink900,
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: "800"
  },
  emptySub: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: typography.caption
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs
  },
  cardTitle: {
    flex: 1,
    color: palette.ink900,
    fontFamily: fonts.body,
    fontSize: typography.body,
    fontWeight: "800"
  },
  timeText: {
    color: palette.ink500,
    fontFamily: fonts.mono,
    fontSize: 11
  },
  meta: {
    marginTop: spacing.xs,
    color: palette.ink700,
    fontFamily: fonts.body,
    fontSize: typography.caption
  },
  actionRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    gap: spacing.xs
  },
  openBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: palette.ink950,
    paddingVertical: spacing.xs + 3
  },
  openBtnText: {
    color: palette.cream100,
    fontFamily: fonts.body,
    fontSize: typography.caption,
    fontWeight: "800"
  },
  deleteBtn: {
    width: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(196,81,45,0.55)",
    backgroundColor: "rgba(196,81,45,0.12)",
    paddingVertical: spacing.xs + 3
  },
  deleteBtnText: {
    color: palette.vermilion500,
    fontFamily: fonts.body,
    fontSize: typography.caption,
    fontWeight: "800"
  }
});
