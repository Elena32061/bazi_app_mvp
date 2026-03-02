import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Alert,
  Easing,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import GlassCard from "../components/GlassCard";
import PrimaryButton from "../components/PrimaryButton";
import RadarChart from "../components/RadarChart";
import TimelineChart from "../components/TimelineChart";
import LiuYueChart from "../components/LiuYueChart";
import LiuZhouChart from "../components/LiuZhouChart";
import { answerClientQuestion, QaResponse } from "../data/qaEngine";
import { DEFAULT_QA_CONFIG, QaToneId } from "../data/qaConfig";
import { buildReportHtml } from "../utils/reportHtml";
import { BaziResult, BirthInput } from "../types";
import { fonts, palette, radius, spacing, typography } from "../theme/tokens";

type Props = {
  input: BirthInput;
  result: BaziResult;
  onBack: () => void;
};

type TabId = "chart" | "dayun" | "free" | "annual";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "chart", label: "基本排盘" },
  { id: "dayun", label: "大运流年" },
  { id: "free", label: "免费分析" },
  { id: "annual", label: "年度报告¥20" }
];

const TAB_TONES: Record<TabId, string> = {
  chart: "盘",
  dayun: "运",
  free: "析",
  annual: "年"
};

const DAO_BG_ANNUAL =
  "https://images.unsplash.com/photo-1699003789426-e128fdc51f5a?auto=format&fit=crop&fm=jpg&q=70&w=1800";

function parsePillar(pillar: string): { stem: string; branch: string } {
  return {
    stem: pillar?.slice(0, 1) || "-",
    branch: pillar?.slice(1, 2) || "-"
  };
}

function scoreColor(score: number): string {
  if (score >= 80) {
    return palette.jade700;
  }
  if (score >= 65) {
    return palette.gold400;
  }
  return palette.vermilion500;
}

function scoreTag(score: number): string {
  if (score >= 80) {
    return "势能偏强";
  }
  if (score >= 65) {
    return "势能平稳";
  }
  return "以稳为主";
}

function trendLine(result: BaziResult): string {
  const sorted = [...result.liuYue].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const low = [...result.liuYue].sort((a, b) => a.score - b.score)[0];
  if (!best || !low) {
    return "流月数据不足，建议先完成完整排盘。";
  }
  return `顺势窗口在${best.monthLabel}（${best.ganZhi}），沉淀窗口在${low.monthLabel}（${low.ganZhi}）。`;
}

function buildAnnualBullets(result: BaziResult): string[] {
  const topMonths = [...result.liuYue]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((m) => `${m.monthLabel}(${m.ganZhi})`);
  const lowMonths = [...result.liuYue]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((m) => `${m.monthLabel}(${m.ganZhi})`);
  const topWeeks = [...result.liuZhou]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((w) => w.weekLabel);

  return [
    `年度主线：${result.monthlyFocus}。建议把今年关键成果集中到一个主项目。`,
    `强势月份：${topMonths.join("、")}。适合推进签约、发布、谈判与转岗。`,
    `谨慎月份：${lowMonths.join("、")}。建议先修流程、稳节奏，避免高杠杆决策。`,
    `强势周窗口：${topWeeks.join("、")}。把关键会议、答辩、上线排在这些周。`,
    `关系协同：${result.topicReports.relationship.summary}`,
    `财务策略：${result.topicReports.wealth.summary}`
  ];
}

function toParagraphs(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return [];
  }
  const parts = cleaned
    .split(/[。！？]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.map((item) => `${item}。`);
}

type NarrativeBlock = { kind: "heading" | "paragraph"; text: string };

function toNarrativeBlocks(text: string): NarrativeBlock[] {
  const lines = text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  return lines.map((line) => {
    if (/^【.+】$/.test(line)) {
      return { kind: "heading", text: line.slice(1, -1) };
    }
    return { kind: "paragraph", text: line };
  });
}

export default function ResultScreen({ input, result, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("chart");
  const [annualUnlocked, setAnnualUnlocked] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [quickQuestion, setQuickQuestion] = useState("");
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaTone, setQaTone] = useState<QaToneId>(DEFAULT_QA_CONFIG.defaultTone);
  const [qaResponse, setQaResponse] = useState<QaResponse | null>(null);
  const tabOpacity = useRef(new Animated.Value(1)).current;
  const tabShift = useRef(new Animated.Value(0)).current;

  const annualBullets = useMemo(() => buildAnnualBullets(result), [result]);
  const tagPreview = useMemo(() => result.profileTags.slice(0, 4), [result.profileTags]);
  const personalityBlocks = useMemo(() => toNarrativeBlocks(result.masterNarrative.overall), [result.masterNarrative.overall]);
  const topicQuickRows = useMemo(
    () => [
      { key: "peach", title: "桃花", report: result.topicReports.peachBlossom },
      { key: "wealth", title: "财运", report: result.topicReports.wealth },
      { key: "relation", title: "人际", report: result.topicReports.relationship }
    ],
    [result]
  );

  const pillars = {
    year: parsePillar(result.pillars.year),
    month: parsePillar(result.pillars.month),
    day: parsePillar(result.pillars.day),
    hour: parsePillar(result.pillars.hour)
  };

  useEffect(() => {
    tabOpacity.setValue(0);
    tabShift.setValue(12);
    Animated.parallel([
      Animated.timing(tabOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(tabShift, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [activeTab, tabOpacity, tabShift]);

  const onAskQuickQuestion = () => {
    const text = quickQuestion.trim();
    if (!text) {
      Alert.alert("请输入问题", "你可以输入：我会发财吗？ / 我今年适合换工作吗？");
      return;
    }
    const response = answerClientQuestion(text, result, DEFAULT_QA_CONFIG, { tone: qaTone });
    setQaQuestion(text);
    setQaResponse(response);
    setActiveTab("free");
  };

  const onAskQuestion = () => {
    const text = qaQuestion.trim();
    if (!text) {
      Alert.alert("请输入问题", "请先输入客户问题，再生成问答结果。");
      return;
    }
    const response = answerClientQuestion(text, result, DEFAULT_QA_CONFIG, { tone: qaTone });
    setQaResponse(response);
  };

  const onExportPdf = async () => {
    if (exporting) {
      return;
    }

    try {
      setExporting(true);
      const html = buildReportHtml(input, result);

      if (Platform.OS === "web") {
        await Print.printAsync({ html });
        return;
      }

      try {
        const file = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, {
            mimeType: "application/pdf",
            dialogTitle: "导出命盘报告"
          });
        } else {
          Alert.alert("导出完成", `PDF 已生成：${file.uri}`);
        }
      } catch {
        await Print.printAsync({ html });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "导出失败，请稍后重试";
      Alert.alert("导出失败", message);
    } finally {
      setExporting(false);
    }
  };

  const onUnlockAnnual = () => {
    Alert.alert("解锁年度报告", "将发起 ¥20.00 支付（演示版为模拟支付）", [
      { text: "取消", style: "cancel" },
      {
        text: "确认支付",
        onPress: () => {
          setAnnualUnlocked(true);
          Alert.alert("支付成功", "年度报告已解锁。正式版可接入微信支付/Apple IAP。");
        }
      }
    ]);
  };

  const renderChartTab = () => (
    <View style={styles.tabBody}>
      <GlassCard>
        <Text style={styles.cardTitle}>基础档案</Text>
        <Text style={styles.cardSub}>用于真太阳时校正与四柱排盘，请确认信息准确。</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>姓名</Text>
            <Text style={styles.infoValue}>{input.name || "未填写"}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>性别</Text>
            <Text style={styles.infoValue}>{input.gender || "未填写"}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>出生地点</Text>
            <Text style={styles.infoValue}>{input.birthCity || "未填写"}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>公历时间</Text>
            <Text style={styles.infoValue}>{input.birthDate} {input.birthTime}</Text>
          </View>
        </View>
        <Text style={styles.infoLine}>真太阳时（公历）：{result.timeCalibration.correctedSolarTime}</Text>
        <View style={styles.keyStatsRow}>
          <View style={styles.keyStatCard}>
            <Text style={styles.keyStatLabel}>年度势能</Text>
            <Text style={[styles.keyStatValue, { color: scoreColor(result.yearlyScore) }]}>{scoreTag(result.yearlyScore)}</Text>
          </View>
          <View style={styles.keyStatCard}>
            <Text style={styles.keyStatLabel}>年度关键词</Text>
            <Text style={styles.keyStatValue}>{result.monthlyFocus}</Text>
          </View>
        </View>
        {tagPreview.length ? (
          <View style={styles.tagPreviewWrap}>
            {tagPreview.map((tag) => (
              <Text key={tag} style={styles.tagPreviewChip}>{tag}</Text>
            ))}
          </View>
        ) : null}
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardTitle}>四柱排盘</Text>
        <Text style={styles.cardSub}>先看天干地支结构，再看十神与藏干辅助判断。</Text>
        <View style={styles.panTable}>
          <View style={styles.tableHeadRow}>
            <Text style={styles.tableHeadCell}>-</Text>
            <Text style={styles.tableHeadCell}>年柱</Text>
            <Text style={styles.tableHeadCell}>月柱</Text>
            <Text style={styles.tableHeadCell}>日柱</Text>
            <Text style={styles.tableHeadCell}>时柱</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.rowLabel}>天干</Text>
            <Text style={styles.rowCell}>{pillars.year.stem}</Text>
            <Text style={styles.rowCell}>{pillars.month.stem}</Text>
            <Text style={styles.rowCell}>{pillars.day.stem}</Text>
            <Text style={styles.rowCell}>{pillars.hour.stem}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.rowLabel}>十神</Text>
            <Text style={styles.rowCellSmall}>{result.tenGods.yearGan}</Text>
            <Text style={styles.rowCellSmall}>{result.tenGods.monthGan}</Text>
            <Text style={styles.rowCellSmall}>{result.tenGods.dayGan}</Text>
            <Text style={styles.rowCellSmall}>{result.tenGods.timeGan}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.rowLabel}>地支</Text>
            <Text style={styles.rowCell}>{pillars.year.branch}</Text>
            <Text style={styles.rowCell}>{pillars.month.branch}</Text>
            <Text style={styles.rowCell}>{pillars.day.branch}</Text>
            <Text style={styles.rowCell}>{pillars.hour.branch}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.rowLabel}>藏干十神</Text>
            <Text style={styles.rowCellSmall}>{result.tenGods.yearZhi[0] || "-"}</Text>
            <Text style={styles.rowCellSmall}>{result.tenGods.monthZhi[0] || "-"}</Text>
            <Text style={styles.rowCellSmall}>{result.tenGods.dayZhi[0] || "-"}</Text>
            <Text style={styles.rowCellSmall}>{result.tenGods.timeZhi[0] || "-"}</Text>
          </View>
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardTitle}>即时提问</Text>
        <Text style={styles.cardSub}>输入一个具体问题，将自动跳转到「免费分析」页生成命理答复。</Text>
        <View style={styles.askRow}>
          <TextInput
            value={quickQuestion}
            onChangeText={setQuickQuestion}
            placeholder="我会发财吗？"
            placeholderTextColor={palette.ink500}
            style={styles.askInput}
          />
          <Pressable style={styles.askBtn} onPress={onAskQuickQuestion}>
            <Text style={styles.askBtnText}>➤</Text>
          </Pressable>
        </View>
      </GlassCard>
    </View>
  );

  const renderDayunTab = () => (
    <View style={styles.tabBody}>
      <GlassCard>
        <Text style={styles.cardTitle}>大运总览</Text>
        <Text style={styles.cardSub}>先看十年大运，再结合流年流月判断关键节奏。</Text>
        <Text style={styles.infoLine}>起运：{result.daYun.startSolar} ｜ 方向：{result.daYun.isForward ? "顺行" : "逆行"}</Text>
        <Text style={styles.infoLine}>
          当前大运：
          {result.daYun.current
            ? `${result.daYun.current.ganZhi} (${result.daYun.current.startYear}-${result.daYun.current.endYear})`
            : "起运前后"}
        </Text>
        <View style={styles.chipsWrap}>
          {result.daYun.list.slice(0, 6).map((item) => (
            <View key={`dy-${item.index}`} style={styles.dyChip}>
              <Text style={styles.dyChipMain}>{item.ganZhi}</Text>
              <Text style={styles.dyChipSub}>{item.startYear}-{item.endYear}</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardTitle}>未来6年流年时间轴</Text>
        <TimelineChart points={result.timeline} />
        <View style={styles.lnList}>
          {result.liuNian.map((item) => (
            <View key={`ln-${item.year}`} style={styles.lnItem}>
              <View style={styles.lnTopRow}>
                <Text style={styles.lnMain}>{item.year}年（{item.ganZhi}）</Text>
                <Text style={[styles.lnTag, { color: scoreColor(item.score) }]}>{scoreTag(item.score)}</Text>
              </View>
              <Text style={styles.lnSub}>大运 {item.daYun} · 主题 {item.theme}</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardTitle}>流月流周节奏</Text>
        <Text style={styles.cardSub}>顺势窗口主攻输出，沉淀窗口重在复盘与修正。</Text>
        <LiuYueChart items={result.liuYue} />
        <Text style={styles.noteText}>{trendLine(result)}</Text>
        <View style={styles.weekWrap}>
          <LiuZhouChart items={result.liuZhou} />
        </View>
      </GlassCard>
    </View>
  );

  const renderFreeTab = () => (
    <View style={styles.tabBody}>
      <GlassCard>
        <Text style={styles.cardTitle}>专题速览</Text>
        <View style={styles.topicGrid}>
          {topicQuickRows.map((item) => (
            <View key={item.key} style={styles.topicCard}>
              <Text style={styles.topicTitle}>{item.title}</Text>
              <Text style={[styles.topicTag, { color: scoreColor(item.report.score) }]}>{scoreTag(item.report.score)}</Text>
              <Text style={styles.topicLevel}>{item.report.level}级建议</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardTitle}>免费个性报告</Text>
        <Text style={styles.cardSub}>以下内容基于命盘结构与十神分布自动生成，风格为命理师详批。</Text>
        {personalityBlocks.map((block, idx) =>
          block.kind === "heading" ? (
            <View key={`overall-h-${idx}`} style={styles.narrativeSectionBar}>
              <Text style={styles.narrativeSectionBarText}>{block.text}</Text>
            </View>
          ) : (
            <Text key={`overall-p-${idx}`} style={styles.narrativeParagraph}>{block.text}</Text>
          )
        )}
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardTitle}>运势补充解读</Text>
        <Text style={styles.narrativeHead}>大运变化</Text>
        {toParagraphs(result.masterNarrative.dayun).map((line, idx) => (
          <Text key={`dayun-${idx}`} style={styles.narrativeParagraph}>{line}</Text>
        ))}
        <Text style={styles.narrativeHead}>桃花与关系</Text>
        {toParagraphs(result.masterNarrative.peach).map((line, idx) => (
          <Text key={`peach-${idx}`} style={styles.narrativeParagraph}>{line}</Text>
        ))}
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardTitle}>能力雷达</Text>
        <View style={styles.radarWrap}>
          <RadarChart metrics={result.radarMetrics} />
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardTitle}>咨询问答</Text>
        <View style={styles.toneRow}>
          {DEFAULT_QA_CONFIG.tones.map((tone) => {
            const active = tone.id === qaTone;
            return (
              <Pressable key={tone.id} onPress={() => setQaTone(tone.id)} style={[styles.toneChip, active ? styles.toneChipActive : null]}>
                <Text style={[styles.toneText, active ? styles.toneTextActive : null]}>{tone.id}</Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={qaQuestion}
          onChangeText={setQaQuestion}
          placeholder="输入客户问题，例如：我今年适合跳槽吗？"
          placeholderTextColor={palette.ink500}
          style={styles.qaInput}
          multiline
          textAlignVertical="top"
        />
        <PrimaryButton title="生成命理问答" onPress={onAskQuestion} disabled={!qaQuestion.trim()} />

        {qaResponse ? (
          <View style={styles.qaBox}>
            <Text style={styles.qaMeta}>意图：{qaResponse.intentTitle} · 话术：{qaResponse.tone}</Text>
            <Text style={styles.qaAnswer}>{qaResponse.answer}</Text>
            <View style={styles.qaTagWrap}>
              {qaResponse.references.map((item) => (
                <Text key={`ref-${item}`} style={styles.qaTag}>{item}</Text>
              ))}
            </View>
            <View style={styles.qaTagWrap}>
              {qaResponse.psychFrameworks.map((item) => (
                <Text key={`psy-${item}`} style={[styles.qaTag, styles.qaTagPsy]}>{item}</Text>
              ))}
            </View>
          </View>
        ) : null}
      </GlassCard>

      <PrimaryButton
        title="导出免费报告 PDF"
        onPress={onExportPdf}
        variant="secondary"
        loading={exporting}
        disabled={exporting}
      />
    </View>
  );

  const renderAnnualTab = () => (
    <View style={styles.tabBody}>
      {!annualUnlocked ? (
        <GlassCard>
          <ImageBackground source={{ uri: DAO_BG_ANNUAL }} style={styles.annualHero} imageStyle={styles.annualHeroImage}>
            <View style={styles.annualHeroOverlay}>
              <View style={styles.lockHead}>
                <Text style={styles.cardTitle}>解锁您的专属年度报告</Text>
                <Text style={styles.priceTag}>¥20</Text>
              </View>
              <Text style={styles.annualLead}>
                融合东方命理与趋势模型，快速看清这一年的关键走势与行动窗口。
              </Text>
            </View>
          </ImageBackground>
          <View style={styles.previewChips}>
            <Text style={styles.previewChip}>年度总势能</Text>
            <Text style={styles.previewChip}>月度窗口</Text>
            <Text style={styles.previewChip}>财运策略</Text>
            <Text style={styles.previewChip}>关系协同</Text>
          </View>
          <Text style={styles.bullet}>1. 洞悉年度主线：识别你的核心发力方向与主任务。</Text>
          <Text style={styles.bullet}>2. 解密财务节奏：给出收支、投资与风险控制建议。</Text>
          <Text style={styles.bullet}>3. 拆解关系走势：明确合作、人际与情感互动策略。</Text>
          <Text style={styles.bullet}>4. 锁定关键窗口：定位顺势月份与关键周的执行节奏。</Text>
          <View style={styles.payBtnWrap}>
            <PrimaryButton title="立即解锁（限时 ¥20）" onPress={onUnlockAnnual} />
          </View>
          <Text style={styles.payHint}>演示版为模拟支付；正式版可接入 Apple IAP / 微信支付。</Text>
        </GlassCard>
      ) : (
        <>
          <GlassCard>
            <View style={styles.unlockHead}>
              <Text style={styles.cardTitle}>2026 年度深度报告已解锁</Text>
              <Text style={styles.unlockedTag}>已解锁</Text>
            </View>
            <Text style={styles.infoLine}>年度势能：<Text style={[styles.keyStatValue, { color: scoreColor(result.yearlyScore) }]}>{scoreTag(result.yearlyScore)}</Text></Text>
            <Text style={styles.infoLine}>年度关键词：{result.monthlyFocus}</Text>
            <Text style={styles.narrativeHead}>财务专题</Text>
            {toParagraphs(result.masterNarrative.wealth).map((line, idx) => (
              <Text key={`wealth-${idx}`} style={styles.narrativeParagraph}>{line}</Text>
            ))}
            <Text style={styles.narrativeHead}>关系专题</Text>
            {toParagraphs(result.masterNarrative.relationship).map((line, idx) => (
              <Text key={`relation-${idx}`} style={styles.narrativeParagraph}>{line}</Text>
            ))}
            <Text style={styles.narrativeHead}>收尾建议</Text>
            {toParagraphs(result.masterNarrative.closing).map((line, idx) => (
              <Text key={`close-${idx}`} style={styles.narrativeParagraph}>{line}</Text>
            ))}
          </GlassCard>

          <GlassCard>
            <Text style={styles.cardTitle}>年度执行清单</Text>
            {annualBullets.map((line) => (
              <Text key={line} style={styles.bullet}>{line}</Text>
            ))}
          </GlassCard>

          <PrimaryButton title="导出年度报告 PDF" onPress={onExportPdf} variant="secondary" loading={exporting} disabled={exporting} />
        </>
      )}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{input.name || "用户"}的报告</Text>
        <View style={styles.backBtn}>
          <Text style={styles.backText}>☰</Text>
        </View>
      </View>

      <View style={styles.tabsWrap}>
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tabBtn, active ? styles.tabBtnActive : null]}
              onPress={() => setActiveTab(tab.id)}
            >
              <View style={[styles.tabTone, active ? styles.tabToneActive : null]}>
                <Text style={[styles.tabToneText, active ? styles.tabToneTextActive : null]}>{TAB_TONES[tab.id]}</Text>
              </View>
              <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.View
        style={{
          opacity: tabOpacity,
          transform: [{ translateY: tabShift }]
        }}
      >
        {activeTab === "chart" ? renderChartTab() : null}
        {activeTab === "dayun" ? renderDayunTab() : null}
        {activeTab === "free" ? renderFreeTab() : null}
        {activeTab === "annual" ? renderAnnualTab() : null}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md + 2
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center"
  },
  backText: {
    color: palette.ink700,
    fontFamily: fonts.body,
    fontSize: 20,
    fontWeight: "700"
  },
  headerTitle: {
    color: palette.ink900,
    fontFamily: fonts.display,
    fontSize: 23,
    fontWeight: "800"
  },
  tabsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,253,248,0.76)",
    borderWidth: 1,
    borderColor: "rgba(205,170,91,0.24)",
    padding: spacing.xs
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill
  },
  tabBtnActive: {
    backgroundColor: "rgba(196,81,45,0.14)"
  },
  tabText: {
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: "700"
  },
  tabTextActive: {
    color: palette.vermilion500
  },
  tabTone: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(31,28,24,0.08)"
  },
  tabToneActive: {
    backgroundColor: "rgba(196,81,45,0.15)"
  },
  tabToneText: {
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: "800"
  },
  tabToneTextActive: {
    color: palette.vermilion500
  },
  tabBody: {
    gap: spacing.md + 2
  },
  cardTitle: {
    color: palette.ink900,
    fontFamily: fonts.display,
    fontWeight: "800",
    fontSize: 20,
    marginBottom: 4
  },
  cardSub: {
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.sm
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.xs
  },
  infoCell: {
    width: "48.8%",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(31,28,24,0.08)",
    backgroundColor: "rgba(255,253,248,0.78)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 8
  },
  infoLabel: {
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: 11,
    marginBottom: 2
  },
  infoValue: {
    color: palette.ink900,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: "700"
  },
  keyStatsRow: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    flexDirection: "row",
    gap: spacing.xs
  },
  keyStatCard: {
    flex: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(205,170,91,0.12)",
    borderWidth: 1,
    borderColor: "rgba(205,170,91,0.28)"
  },
  keyStatLabel: {
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: 11
  },
  keyStatValue: {
    marginTop: 3,
    color: palette.ink900,
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: "800"
  },
  tagPreviewWrap: {
    marginTop: spacing.xs,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  tagPreviewChip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontFamily: fonts.body,
    fontSize: 11,
    color: palette.jade900,
    backgroundColor: "rgba(46,125,110,0.12)",
    fontWeight: "700"
  },
  infoLine: {
    color: palette.ink700,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 2
  },
  panTable: {
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(31,28,24,0.1)",
    overflow: "hidden"
  },
  tableHeadRow: {
    flexDirection: "row",
    backgroundColor: "rgba(31,28,24,0.08)",
    paddingVertical: 8
  },
  tableHeadCell: {
    flex: 1,
    textAlign: "center",
    color: palette.ink700,
    fontSize: 12,
    fontFamily: fonts.body,
    fontWeight: "700"
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(31,28,24,0.08)",
    paddingVertical: 9
  },
  rowLabel: {
    flex: 1,
    textAlign: "center",
    color: palette.ink500,
    fontSize: 12,
    fontFamily: fonts.body,
    fontWeight: "700"
  },
  rowCell: {
    flex: 1,
    textAlign: "center",
    color: palette.ink900,
    fontFamily: fonts.display,
    fontWeight: "800",
    fontSize: 23
  },
  rowCellSmall: {
    flex: 1,
    textAlign: "center",
    color: palette.ink700,
    fontFamily: fonts.body,
    fontWeight: "700",
    fontSize: 12
  },
  askRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(205,170,91,0.35)",
    backgroundColor: "rgba(255,253,248,0.9)",
    paddingLeft: spacing.md
  },
  askInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    color: palette.ink900,
    fontFamily: fonts.body,
    fontSize: typography.body
  },
  askBtn: {
    margin: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(205,170,91,0.8)"
  },
  askBtnText: {
    color: palette.cream100,
    fontSize: 16,
    fontWeight: "800"
  },
  chipsWrap: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  dyChip: {
    borderRadius: radius.pill,
    backgroundColor: "rgba(46,125,110,0.12)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  dyChipMain: {
    color: palette.jade900,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: "800"
  },
  dyChipSub: {
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: 10
  },
  lnList: {
    marginTop: spacing.sm,
    gap: spacing.xs
  },
  lnItem: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(31,28,24,0.08)",
    backgroundColor: "rgba(255,253,248,0.76)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 8
  },
  lnTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  lnMain: {
    color: palette.ink900,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: "700"
  },
  lnTag: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "800"
  },
  lnSub: {
    marginTop: 3,
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18
  },
  noteText: {
    marginTop: spacing.xs,
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: typography.caption,
    lineHeight: 18
  },
  weekWrap: {
    marginTop: spacing.sm
  },
  longText: {
    color: palette.ink700,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 24,
    marginBottom: spacing.sm
  },
  narrativeHead: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    color: palette.ink900,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: "800"
  },
  narrativeSectionBar: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "rgba(205,170,91,0.65)",
    backgroundColor: "rgba(205,170,91,0.14)",
    paddingVertical: 7,
    paddingHorizontal: spacing.sm
  },
  narrativeSectionBarText: {
    color: palette.ink900,
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: "800"
  },
  narrativeParagraph: {
    color: palette.ink700,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 26,
    marginBottom: 10
  },
  radarWrap: {
    alignItems: "center"
  },
  topicGrid: {
    marginTop: spacing.xs,
    flexDirection: "row",
    gap: spacing.sm
  },
  topicCard: {
    flex: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(31,28,24,0.1)",
    backgroundColor: "rgba(255,253,248,0.86)",
    padding: spacing.sm,
    alignItems: "center"
  },
  topicTitle: {
    color: palette.ink700,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: "700"
  },
  topicTag: {
    marginTop: 4,
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: "800"
  },
  topicLevel: {
    marginTop: 2,
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: 11
  },
  toneRow: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  toneChip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(31,28,24,0.14)",
    backgroundColor: "rgba(255,253,248,0.86)"
  },
  toneChipActive: {
    backgroundColor: "rgba(46,125,110,0.14)",
    borderColor: "rgba(46,125,110,0.56)"
  },
  toneText: {
    color: palette.ink700,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: "700"
  },
  toneTextActive: {
    color: palette.jade900
  },
  qaInput: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    minHeight: 88,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.sand200,
    backgroundColor: palette.cream100,
    color: palette.ink900,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.body
  },
  qaBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: "rgba(205,170,91,0.12)",
    borderWidth: 1,
    borderColor: "rgba(205,170,91,0.38)"
  },
  qaMeta: {
    color: palette.jade900,
    fontFamily: fonts.body,
    fontWeight: "700",
    fontSize: typography.caption
  },
  qaAnswer: {
    marginTop: spacing.xs,
    color: palette.ink700,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 26
  },
  qaTagWrap: {
    marginTop: spacing.xs,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  qaTag: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontSize: 11,
    fontFamily: fonts.body,
    fontWeight: "700",
    color: palette.jade900,
    backgroundColor: "rgba(46,125,110,0.12)"
  },
  qaTagPsy: {
    color: palette.vermilion500,
    backgroundColor: "rgba(196,81,45,0.12)"
  },
  lockHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  priceTag: {
    color: palette.cream100,
    backgroundColor: palette.vermilion500,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontFamily: fonts.mono,
    fontWeight: "800",
    fontSize: 12
  },
  bullet: {
    color: palette.ink700,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 4
  },
  payBtnWrap: {
    marginTop: spacing.md
  },
  previewChips: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  previewChip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontFamily: fonts.body,
    fontSize: 11,
    color: palette.jade900,
    backgroundColor: "rgba(46,125,110,0.12)",
    fontWeight: "700"
  },
  payHint: {
    marginTop: spacing.sm,
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: typography.caption
  },
  annualLead: {
    marginTop: spacing.xs,
    color: palette.ink700,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 22
  },
  annualHero: {
    borderRadius: radius.sm,
    overflow: "hidden",
    marginBottom: spacing.xs
  },
  annualHeroImage: {
    opacity: 0.24
  },
  annualHeroOverlay: {
    backgroundColor: "rgba(255,253,248,0.78)",
    padding: spacing.sm
  },
  unlockHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  unlockedTag: {
    color: palette.jade900,
    backgroundColor: "rgba(46,125,110,0.12)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: "700"
  },
});
