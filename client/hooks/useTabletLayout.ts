import { useWindowDimensions } from "react-native";
import type { ViewStyle } from "react-native";

const TABLET_BREAKPOINT = 768;
const MAX_CONTENT_WIDTH = 680;

export function useTabletLayout() {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  const sceneStyle: ViewStyle | undefined = isTablet
    ? { maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", width: "100%" }
    : undefined;

  // For tab bar: center it on wide screens with symmetric left/right margins
  const tabBarSideInset = isTablet
    ? Math.max(0, (width - MAX_CONTENT_WIDTH) / 2)
    : 0;

  return { isTablet, sceneStyle, tabBarSideInset, screenWidth: width };
}
