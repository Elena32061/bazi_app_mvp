import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import FormField from "../components/FormField";
import GlassCard from "../components/GlassCard";
import PrimaryButton from "../components/PrimaryButton";
import { findLocationProfile, getDefaultLocationProfile } from "../data/locationProfiles";
import { BirthInput } from "../types";
import { fonts, palette, radius, spacing, typography } from "../theme/tokens";

type Props = {
  onGenerate: (input: BirthInput) => void;
  currentUsername: string;
  onOpenHistory: () => void;
  onLogout: () => void;
};

const defaultLoc = getDefaultLocationProfile();

const EMPTY_FORM: BirthInput = {
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthCity: "",
  timezone: defaultLoc.timezone,
  longitude: String(defaultLoc.longitude)
};

const MASTER_CARDS = [
  {
    name: "玄岳道人",
    tags: ["道观解盘", "趋吉避凶"],
    image:
      "https://images.unsplash.com/photo-1759108571853-543182094187?auto=format&fit=crop&fm=jpg&q=70&w=1600"
  },
  {
    name: "青松居士",
    tags: ["山水命理", "节律调运"],
    image:
      "https://images.unsplash.com/photo-1754623291028-423b4455b53b?auto=format&fit=crop&fm=jpg&q=70&w=1600"
  }
];

const QUICK_ENTRIES = [
  { key: "peach", title: "桃花速测", sub: "关系机缘" },
  { key: "wealth", title: "财运提醒", sub: "收支节奏" },
  { key: "career", title: "事业窗口", sub: "推进策略" },
  { key: "year", title: "年度详批", sub: "主线规划" }
];

const GENDER_OPTIONS = ["女", "男", "其他"];

const DAO_BG_DAILY =
  "https://images.unsplash.com/photo-1699003789426-e128fdc51f5a?auto=format&fit=crop&fm=jpg&q=70&w=1800";
const DAO_BG_BANNER =
  "https://images.unsplash.com/photo-1713118775679-cee8a04e0d73?auto=format&fit=crop&fm=jpg&q=70&w=1800";

function revealStyle(opacity: Animated.Value, y = 20) {
  return {
    opacity,
    transform: [
      {
        translateY: opacity.interpolate({
          inputRange: [0, 1],
          outputRange: [y, 0]
        })
      }
    ]
  };
}

export default function HomeScreen({ onGenerate, currentUsername, onOpenHistory, onLogout }: Props) {
  const [form, setForm] = useState<BirthInput>(EMPTY_FORM);
  const [manualTimezone, setManualTimezone] = useState(false);
  const [manualLongitude, setManualLongitude] = useState(false);
  const [showPanForm, setShowPanForm] = useState(false);
  const [quickQuestion, setQuickQuestion] = useState("");

  const topAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const quickAnim = useRef(new Animated.Value(0)).current;
  const masterAnim = useRef(MASTER_CARDS.map(() => new Animated.Value(0))).current;
  const scrollRef = useRef<ScrollView | null>(null);
  const formYRef = useRef<number>(0);

  useEffect(() => {
    Animated.stagger(110, [
      Animated.timing(topAnim, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(listAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(quickAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();

    Animated.stagger(
      90,
      masterAnim.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })
      )
    ).start();
  }, [formAnim, listAnim, masterAnim, quickAnim, topAnim]);

  useEffect(() => {
    const profile = findLocationProfile(form.birthCity);
    if (!profile) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      timezone: manualTimezone ? prev.timezone : profile.timezone,
      longitude: manualLongitude ? prev.longitude : String(profile.longitude)
    }));
  }, [form.birthCity, manualLongitude, manualTimezone]);

  const isValid = useMemo(() => {
    if (!form.name || !form.gender || !form.birthDate || !form.birthTime || !form.birthCity) {
      return false;
    }
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(form.birthDate);
    const timeOk = /^\d{2}:\d{2}$/.test(form.birthTime);
    const timezoneOk = /^[A-Za-z_+-]+\/[A-Za-z_+-]+(?:\/[A-Za-z_+-]+)?$/.test(form.timezone);
    const longitudeVal = Number(form.longitude);
    const longitudeOk = !Number.isNaN(longitudeVal) && longitudeVal >= -180 && longitudeVal <= 180;
    return dateOk && timeOk && timezoneOk && longitudeOk;
  }, [form]);

  const update = (key: keyof BirthInput, value: string) => {
    const next = value.trim();
    if (key === "timezone") {
      setManualTimezone(true);
    }
    if (key === "longitude") {
      setManualLongitude(true);
    }
    setForm((prev) => ({ ...prev, [key]: next }));
  };

  const jumpToPanForm = () => {
    setShowPanForm(true);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, formYRef.current - 12), animated: true });
    }, 80);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={revealStyle(topAnim, 14)}>
          <View style={styles.topRow}>
            <View style={styles.userRow}>
              <View style={styles.avatarSeal}>
                <Text style={styles.avatarGlyph}>道</Text>
              </View>
              <View>
                <Text style={styles.hello}>你好！{currentUsername || "访客"}</Text>
                <Text style={styles.subHello}>愿你今日顺势而为</Text>
              </View>
            </View>
            <View style={styles.topActions}>
              <Pressable style={styles.panBtn} onPress={jumpToPanForm}>
                <Text style={styles.panBtnText}>✦ 排盘</Text>
              </Pressable>
              <Pressable style={styles.topActionBtn} onPress={onOpenHistory}>
                <Text style={styles.topActionText}>历史</Text>
              </Pressable>
              <Pressable style={styles.topActionGhostBtn} onPress={onLogout}>
                <Text style={styles.topActionGhostText}>退出</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={revealStyle(listAnim, 18)}>
          <Text style={styles.sectionTitle}>每日指引</Text>
          <View style={styles.dailyCard}>
            <ImageBackground source={{ uri: DAO_BG_DAILY }} style={styles.dailyBg} imageStyle={styles.dailyBgImage}>
              <View style={styles.dailyOverlay}>
                <Text style={styles.dailyTitle}>高山之木，积蓄力量</Text>
                <Text style={styles.dailySub}>- 玄岳道人</Text>
                <View style={styles.questionRow}>
                  <TextInput
                    value={quickQuestion}
                    onChangeText={setQuickQuestion}
                    placeholder="请输入您的困惑"
                    placeholderTextColor={palette.ink500}
                    style={styles.questionInput}
                  />
                  <Pressable style={styles.sendBtn} onPress={jumpToPanForm}>
                    <Text style={styles.sendText}>➤</Text>
                  </Pressable>
                </View>
              </View>
            </ImageBackground>
          </View>

          <Animated.View style={[styles.quickGrid, revealStyle(quickAnim, 12)]}>
            {QUICK_ENTRIES.map((entry) => (
              <Pressable key={entry.key} style={styles.quickCard} onPress={jumpToPanForm}>
                <Text style={styles.quickTitle}>{entry.title}</Text>
                <Text style={styles.quickSub}>{entry.sub}</Text>
              </Pressable>
            ))}
          </Animated.View>

          <View style={styles.recommendHeader}>
            <Text style={styles.sectionTitle}>为你推荐</Text>
            <Text style={styles.moreText}>更多 ›</Text>
          </View>

          <View style={styles.masterGrid}>
            {MASTER_CARDS.map((card, idx) => (
              <Animated.View
                key={card.name}
                style={[
                  styles.masterCardWrap,
                  {
                    opacity: masterAnim[idx],
                    transform: [
                      {
                        translateY: masterAnim[idx].interpolate({
                          inputRange: [0, 1],
                          outputRange: [14, 0]
                        })
                      },
                      {
                        scale: masterAnim[idx].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.98, 1]
                        })
                      }
                    ]
                  }
                ]}
              >
                <View style={styles.masterCard}>
                <Image source={{ uri: card.image }} style={styles.masterImage} />
                <Text style={styles.masterName}>{card.name}</Text>
                <View style={styles.tagRow}>
                  {card.tags.map((tag) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
                </View>
              </Animated.View>
            ))}
          </View>

          <View style={styles.bannerCard}>
            <ImageBackground source={{ uri: DAO_BG_BANNER }} style={styles.bannerBg} imageStyle={styles.bannerBgImage}>
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerTitle}>2026 新年运势</Text>
                <Text style={styles.bannerSub}>道家视角 · 年度节律详批</Text>
                <Pressable style={styles.bannerBtn} onPress={jumpToPanForm}>
                  <Text style={styles.bannerBtnText}>立即查看 ›</Text>
                </Pressable>
              </View>
            </ImageBackground>
          </View>
        </Animated.View>

        {showPanForm ? (
          <Animated.View
            style={revealStyle(formAnim, 16)}
            onLayout={(event) => {
              formYRef.current = event.nativeEvent.layout.y;
            }}
          >
            <GlassCard>
              <Text style={styles.formTitle}>生辰录入 · 立即排盘</Text>
              <FormField
                label="姓名"
                value={form.name}
                placeholder="请输入姓名"
                onChangeText={(text) => update("name", text)}
              />
              <View style={styles.genderWrap}>
                <Text style={styles.genderLabel}>性别</Text>
                <View style={styles.genderRow}>
                  {GENDER_OPTIONS.map((option) => {
                    const active = form.gender === option;
                    return (
                      <Pressable
                        key={option}
                        style={[styles.genderOption, active ? styles.genderOptionActive : null]}
                        onPress={() => update("gender", option)}
                      >
                        <Text style={[styles.genderOptionText, active ? styles.genderOptionTextActive : null]}>{option}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <FormField
                label="出生日期"
                value={form.birthDate}
                placeholder="YYYY-MM-DD"
                onChangeText={(text) => update("birthDate", text)}
              />
              <FormField
                label="出生时间"
                value={form.birthTime}
                placeholder="HH:MM（24小时）"
                onChangeText={(text) => update("birthTime", text)}
              />
              <FormField
                label="出生地点"
                value={form.birthCity}
                placeholder="请输入出生地点"
                onChangeText={(text) => update("birthCity", text)}
              />
              <FormField
                label="时区（IANA）"
                value={form.timezone}
                placeholder="请输入时区"
                onChangeText={(text) => update("timezone", text)}
              />
              <FormField
                label="经度"
                value={form.longitude}
                placeholder="请输入经度"
                onChangeText={(text) => update("longitude", text)}
              />
              <PrimaryButton title="生成排盘报告" onPress={() => onGenerate(form)} disabled={!isValid} />
              <Text style={styles.formHint}>支持真太阳时修正、时区/DST 自动校正。</Text>
            </GlassCard>
          </Animated.View>
        ) : null}
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  avatarSeal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(196,81,45,0.35)",
    backgroundColor: "rgba(196,81,45,0.14)",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarGlyph: {
    color: palette.vermilion500,
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: "800"
  },
  hello: {
    color: palette.ink900,
    fontFamily: fonts.body,
    fontSize: 17,
    fontWeight: "800"
  },
  subHello: {
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: 12
  },
  panBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: "rgba(205,170,91,0.18)",
    borderWidth: 1,
    borderColor: "rgba(205,170,91,0.45)"
  },
  panBtnText: {
    color: palette.ink700,
    fontFamily: fonts.body,
    fontWeight: "700",
    fontSize: 12
  },
  topActionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(46,125,110,0.4)",
    backgroundColor: "rgba(46,125,110,0.14)"
  },
  topActionText: {
    color: palette.jade900,
    fontFamily: fonts.body,
    fontWeight: "700",
    fontSize: 12
  },
  topActionGhostBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(196,81,45,0.35)",
    backgroundColor: "rgba(196,81,45,0.1)"
  },
  topActionGhostText: {
    color: palette.vermilion500,
    fontFamily: fonts.body,
    fontWeight: "700",
    fontSize: 12
  },
  sectionTitle: {
    color: palette.ink700,
    fontFamily: fonts.body,
    fontWeight: "800",
    fontSize: 26,
    marginBottom: spacing.xs
  },
  dailyCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(205,170,91,0.3)",
    backgroundColor: "rgba(255,253,248,0.88)",
    overflow: "hidden"
  },
  dailyBg: {
    width: "100%"
  },
  dailyBgImage: {
    opacity: 0.22
  },
  dailyOverlay: {
    padding: spacing.md,
    backgroundColor: "rgba(255,253,248,0.76)"
  },
  dailyTitle: {
    color: palette.ink900,
    fontFamily: fonts.display,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 40
  },
  dailySub: {
    marginTop: spacing.xs,
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: "right"
  },
  questionRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(205,170,91,0.35)",
    backgroundColor: "rgba(255,253,248,0.9)",
    paddingLeft: spacing.md
  },
  questionInput: {
    flex: 1,
    color: palette.ink900,
    fontFamily: fonts.body,
    fontSize: typography.body,
    paddingVertical: spacing.sm
  },
  sendBtn: {
    margin: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(205,170,91,0.78)"
  },
  sendText: {
    color: palette.cream100,
    fontSize: 17,
    fontWeight: "800"
  },
  recommendHeader: {
    marginTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  moreText: {
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: "700"
  },
  quickGrid: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  quickCard: {
    width: "48.5%",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(46,125,110,0.20)",
    backgroundColor: "rgba(46,125,110,0.08)",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm
  },
  quickTitle: {
    color: palette.ink900,
    fontFamily: fonts.body,
    fontWeight: "800",
    fontSize: 14
  },
  quickSub: {
    marginTop: 2,
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: 12
  },
  masterGrid: {
    marginTop: spacing.xs,
    flexDirection: "row",
    gap: spacing.sm
  },
  masterCardWrap: {
    flex: 1
  },
  masterCard: {
    flex: 1,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,253,248,0.92)",
    borderWidth: 1,
    borderColor: "rgba(205,170,91,0.28)",
    overflow: "hidden"
  },
  masterImage: {
    width: "100%",
    height: 180
  },
  masterName: {
    marginTop: spacing.xs,
    marginHorizontal: spacing.sm,
    color: palette.ink900,
    fontFamily: fonts.body,
    fontWeight: "800",
    fontSize: 17
  },
  tagRow: {
    marginTop: spacing.xs,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(31,28,24,0.08)"
  },
  tagText: {
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: "700"
  },
  bannerCard: {
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(196,81,45,0.28)",
    backgroundColor: "rgba(196,81,45,0.08)",
    overflow: "hidden"
  },
  bannerBg: {
    width: "100%"
  },
  bannerBgImage: {
    opacity: 0.2
  },
  bannerOverlay: {
    padding: spacing.md,
    backgroundColor: "rgba(255,250,242,0.72)"
  },
  bannerTitle: {
    color: palette.ink900,
    fontFamily: fonts.display,
    fontSize: 34,
    fontWeight: "800"
  },
  bannerSub: {
    marginTop: 2,
    color: palette.ink500,
    fontFamily: fonts.body,
    fontSize: 13
  },
  bannerBtn: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: "rgba(205,170,91,0.85)"
  },
  bannerBtnText: {
    color: palette.cream100,
    fontFamily: fonts.body,
    fontWeight: "800",
    fontSize: 13
  },
  formTitle: {
    color: palette.ink900,
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: spacing.sm
  },
  genderWrap: {
    marginBottom: spacing.md
  },
  genderLabel: {
    color: palette.ink700,
    fontSize: typography.caption,
    marginBottom: spacing.xs,
    fontWeight: "700",
    letterSpacing: 0.2,
    fontFamily: fonts.body
  },
  genderRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  genderOption: {
    flex: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.sand200,
    backgroundColor: palette.cream100,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  genderOptionActive: {
    borderColor: "rgba(46,125,110,0.55)",
    backgroundColor: "rgba(46,125,110,0.12)"
  },
  genderOptionText: {
    color: palette.ink700,
    fontFamily: fonts.body,
    fontSize: typography.body,
    fontWeight: "700"
  },
  genderOptionTextActive: {
    color: palette.jade900
  },
  formHint: {
    marginTop: spacing.sm,
    color: palette.ink500,
    fontSize: typography.caption,
    fontFamily: fonts.body
  }
});
