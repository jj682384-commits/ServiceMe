import { useEffect } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

interface UseGoogleAuthOptions {
  onSuccess: (user: GoogleUser) => void;
  onError?: (error: string) => void;
}

export function useGoogleAuth({ onSuccess, onError }: UseGoogleAuthOptions) {
  const redirectUri = makeRedirectUri();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === "success" && response.authentication?.accessToken) {
      fetchGoogleUser(response.authentication.accessToken)
        .then(onSuccess)
        .catch((err) => onError?.(err.message ?? "Google sign-in failed"));
    } else if (response?.type === "error") {
      onError?.(response.error?.message ?? "Google sign-in was cancelled");
    }
  }, [response]);

  return {
    request,
    signInWithGoogle: () => promptAsync(),
    isConfigured: !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  };
}

async function fetchGoogleUser(accessToken: string): Promise<GoogleUser> {
  const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Google user info");
  const data = await res.json();
  return {
    id: data.id,
    name: data.name ?? data.given_name ?? "Google User",
    email: data.email,
    picture: data.picture,
  };
}
