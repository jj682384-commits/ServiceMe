export function useStripe() {
  return {
    initPaymentSheet: async (_options: any) => ({ error: undefined }),
    presentPaymentSheet: async () => ({
      error: { code: "Failed", message: "Payments are only available on the mobile app." },
    }),
  };
}
