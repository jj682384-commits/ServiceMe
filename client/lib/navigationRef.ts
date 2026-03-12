import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateTo(screen: keyof RootStackParamList) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(screen as any);
  }
}
