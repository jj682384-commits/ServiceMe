import { Platform, ScrollView, ScrollViewProps } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";

type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

/**
 * KeyboardAwareScrollView that falls back to ScrollView on web.
 * Use this for any screen containing text inputs.
 * keyboardDismissMode="on-drag" lets users swipe down to dismiss any keyboard type.
 */
export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  keyboardDismissMode = "on-drag",
  bottomOffset = 80,
  ...props
}: Props) {
  if (Platform.OS === "web") {
    return (
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
      bottomOffset={bottomOffset}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
