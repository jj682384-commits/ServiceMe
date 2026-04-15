import React from "react";
import { StripeProvider } from "@stripe/stripe-react-native";

interface Props {
  publishableKey: string;
  children: React.ReactNode;
}

export default function StripeWrapper({ publishableKey, children }: Props) {
  return (
    <StripeProvider publishableKey={publishableKey} urlScheme="resqride">
      {children}
    </StripeProvider>
  );
}
