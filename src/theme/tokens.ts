import { Platform } from "react-native";

export const palette = {
  sand50: "#F8F4EC",
  sand100: "#F2ECDE",
  sand200: "#E7DCC7",
  sand300: "#D8C5A1",
  ink950: "#14110E",
  ink900: "#1F1C18",
  ink700: "#3A332C",
  ink500: "#6D6459",
  jade500: "#2E7D6E",
  jade700: "#1E5E52",
  jade900: "#123D35",
  vermilion500: "#C4512D",
  gold400: "#CDAA5B",
  cream100: "#FFFDF8",
  shadow: "rgba(47, 39, 28, 0.12)"
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999
};

export const typography = {
  title: 30,
  subtitle: 20,
  body: 15,
  caption: 13
};

export const fonts = {
  display: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  body: Platform.select({ ios: "Avenir Next", android: "sans-serif", default: "sans-serif" }),
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" })
};
