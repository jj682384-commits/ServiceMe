import { useContext } from "react";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { AppContext } from "@/context/AppContext";

export function useTheme() {
  const appCtx = useContext(AppContext);
  const systemScheme = useColorScheme();
  const scheme = appCtx?.themeOverride ?? systemScheme ?? "dark";
  const isDark = scheme === "dark";
  const theme = Colors[scheme];

  return {
    theme,
    isDark,
  };
}
