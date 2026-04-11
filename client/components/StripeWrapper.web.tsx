import React from "react";

interface Props {
  publishableKey: string;
  children: React.ReactNode;
}

export default function StripeWrapper({ children }: Props) {
  return <>{children}</>;
}
