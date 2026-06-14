import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";

import { useTheme } from "@/hooks/useTheme";
import { useTabletLayout } from "@/hooks/useTabletLayout";

interface UseScreenOptionsParams {
  transparent?: boolean;
}

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  const { theme, isDark } = useTheme();
  const { sceneStyle } = useTabletLayout();

  return {
    headerTitleAlign: "center",
    headerTransparent: transparent,
    headerBlurEffect: isDark ? "dark" : "light",
    headerTintColor: theme.text,
    headerStyle: {
      backgroundColor: Platform.select({
        ios: undefined,
        android: theme.backgroundRoot,
        web: theme.backgroundRoot,
      }),
    },
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
      ...sceneStyle,
    },
  };
}
