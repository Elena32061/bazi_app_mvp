import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Easing, SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import GradientBackground from "./src/components/GradientBackground";
import HomeScreen from "./src/screens/HomeScreen";
import ResultScreen from "./src/screens/ResultScreen";
import AuthScreen from "./src/screens/AuthScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import { generateBaziResult } from "./src/data/baziEngine";
import { generateMockResult } from "./src/data/mockEngine";
import { BaziResult, BirthInput } from "./src/types";
import {
  deleteReportForUser,
  hydrateSession,
  listReportsForUser,
  logoutAccount,
  saveReportForUser,
  SavedReport,
  SessionUser
} from "./src/data/localStore";
import { fonts, palette } from "./src/theme/tokens";

type ScreenState = {
  input: BirthInput | null;
  result: BaziResult | null;
};

type MainView = "home" | "history" | "result";
type ResultReturnView = "home" | "history";

export default function App() {
  const [booting, setBooting] = useState(true);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [mainView, setMainView] = useState<MainView>("home");
  const [returnView, setReturnView] = useState<ResultReturnView>("home");
  const [reportList, setReportList] = useState<SavedReport[]>([]);
  const [state, setState] = useState<ScreenState>({ input: null, result: null });
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;

    const bootstrap = async () => {
      try {
        const session = await hydrateSession();
        if (!alive || !session) {
          return;
        }
        setCurrentUser(session);
        const reports = await listReportsForUser(session.id);
        if (!alive) {
          return;
        }
        setReportList(reports);
      } catch {
        if (alive) {
          Alert.alert("提示", "读取本地账户数据失败，将使用空白状态启动。");
        }
      } finally {
        if (alive) {
          setBooting(false);
        }
      }
    };

    bootstrap();

    return () => {
      alive = false;
    };
  }, []);

  const runEnter = () => {
    opacity.setValue(0);
    translateY.setValue(18);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  };

  const switchWithAnimation = (action: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: -8,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true
      })
    ]).start(() => {
      action();
      runEnter();
    });
  };

  const refreshReports = async (userId: string) => {
    const reports = await listReportsForUser(userId);
    setReportList(reports);
  };

  const handleAuthSuccess = async (user: SessionUser) => {
    setCurrentUser(user);
    setMainView("home");
    setState({ input: null, result: null });
    setReturnView("home");
    await refreshReports(user.id);
    runEnter();
  };

  const handleGenerate = async (input: BirthInput) => {
    let result: BaziResult;
    try {
      result = generateBaziResult(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "排盘异常";
      Alert.alert("排盘失败", `${message}\n将切换为演示模式结果。`);
      result = generateMockResult(input);
    }

    switchWithAnimation(() => {
      setState({ input, result });
      setMainView("result");
      setReturnView("home");
    });

    if (currentUser) {
      try {
        await saveReportForUser(currentUser.id, input, result);
        await refreshReports(currentUser.id);
      } catch {
        Alert.alert("提示", "报告生成成功，但自动保存失败。");
      }
    }
  };

  const backFromResult = () => {
    switchWithAnimation(() => {
      if (returnView === "home") {
        setState({ input: null, result: null });
      }
      setMainView(returnView);
    });
  };

  const openHistory = () => {
    switchWithAnimation(() => {
      setMainView("history");
    });
  };

  const openReportFromHistory = (report: SavedReport) => {
    switchWithAnimation(() => {
      setState({ input: report.input, result: report.result });
      setMainView("result");
      setReturnView("history");
    });
  };

  const removeReport = async (report: SavedReport) => {
    if (!currentUser) {
      return;
    }
    await deleteReportForUser(currentUser.id, report.id);
    await refreshReports(currentUser.id);
  };

  const handleLogout = () => {
    Alert.alert("退出登录", "确认退出当前账号吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "退出",
        style: "destructive",
        onPress: async () => {
          await logoutAccount();
          setCurrentUser(null);
          setReportList([]);
          setMainView("home");
          setReturnView("home");
          setState({ input: null, result: null });
        }
      }
    ]);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <Animated.View style={[styles.body, { opacity, transform: [{ translateY }] }]}>
          {booting ? (
            <View style={styles.bootWrap}>
              <ActivityIndicator color={palette.ink700} />
              <Text style={styles.bootText}>正在加载本地账户与历史记录...</Text>
            </View>
          ) : !currentUser ? (
            <AuthScreen onAuthSuccess={handleAuthSuccess} />
          ) : mainView === "history" ? (
            <HistoryScreen
              user={currentUser}
              reports={reportList}
              onBack={() => switchWithAnimation(() => setMainView("home"))}
              onOpenReport={openReportFromHistory}
              onDeleteReport={removeReport}
              onLogout={handleLogout}
            />
          ) : state.input && state.result && mainView === "result" ? (
            <ResultScreen input={state.input} result={state.result} onBack={backFromResult} />
          ) : (
            <HomeScreen
              onGenerate={handleGenerate}
              currentUsername={currentUser.username}
              onOpenHistory={openHistory}
              onLogout={handleLogout}
            />
          )}
        </Animated.View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  body: {
    flex: 1
  },
  bootWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  bootText: {
    color: palette.ink700,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: "700"
  }
});
