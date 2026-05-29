import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, StyleSheet, ScrollView, Switch, RefreshControl, Animated, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceRequest } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useProviderLocation, useProviderHeartbeat, updateProviderAvailability, registerProviderOnServer } from "@/hooks/useProviderLocation";
import { getApiUrl } from "@/lib/query-client";

const PLATFORM_FEE_STANDARD = 0.15;
const PLATFORM_FEE_PRIORITY = 0.10;

function netEarnings(r: ServiceRequest, acceptsPriorityJobs?: boolean): number {
  const gross = r.estimatedCost || 0;
  const tip = typeof r.tip === "number" ? r.tip : 0;
  const feeRate = (r.isExpress && acceptsPriorityJobs) ? PLATFORM_FEE_PRIORITY : PLATFORM_FEE_STANDARD;
  return gross * (1 - feeRate) + tip;
}

function StatCard({
  icon, label, value, color, cardBg,
}: {
  icon: keyof typeof Feather.glyphMap; label: string; value: string; color: string; cardBg: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: cardBg }]}>
      <View style={[styles.statIconBox, { backgroundColor: color + "22" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <ThemedText style={[styles.statValue, { color: color }]}>{value}</ThemedText>
      <ThemedText type="small" style={{ color: "rgba(148,163,184,0.8)", marginTop: 2 }}>{label}</ThemedText>
    </View>
  );
}

function WeekRow({ label, value, valueColor, icon, iconColor, isLast }: {
  label: string; value: string; valueColor?: string;
  icon?: keyof typeof Feather.glyphMap; iconColor?: string; isLast?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <>
      <View style={styles.weeklyRow}>
        <View style={styles.weeklyRowLeft}>
          {icon ? (
            <View style={[styles.weekRowIcon, { backgroundColor: (iconColor ?? theme.primary) + "18" }]}>
              <Feather name={icon} size={14} color={iconColor ?? theme.primary} />
            </View>
          ) : null}
          <ThemedText type="body" style={{ color: theme.textSecondary }}>{label}</ThemedText>
        </View>
        <ThemedText type="body" style={{ fontWeight: "700", color: valueColor ?? theme.text }}>{value}</ThemedText>
      </View>
      {!isLast ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
    </>
  );
}

export default function ProviderDashboardScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { currentProvider, setCurrentProvider, requestHistory, updateHistoryEntry } = useApp();
  const [isAvailable, setIsAvailable] = useState(false);
  const cardBg = theme.cardAnimatedBg;

  useProviderLocation(currentProvider?.id ?? null, isAvailable);
  useProviderHeartbeat(currentProvider?.id ?? null, isAvailable);

  useEffect(() => {
    if (currentProvider) {
      registerProviderOnServer(currentProvider);
      updateProviderAvailability(currentProvider.id, false);
    }
  }, [currentProvider?.id]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tipBanner, setTipBanner] = useState<{ totalTips: number; jobCount: number } | null>(null);
  const [reviewBanner, setReviewBanner] = useState<{ newRating: number } | null>(null);
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const reviewBannerOpacity = useRef(new Animated.Value(0)).current;
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTipBanner = useCallback((totalTips: number, jobCount: number) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setTipBanner({ totalTips, jobCount });
    Animated.sequence([
      Animated.timing(bannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(bannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => { bannerTimer.current = setTimeout(() => setTipBanner(null), 50); });
  }, [bannerOpacity]);

  const showReviewBanner = useCallback((newRating: number) => {
    if (reviewBannerTimer.current) clearTimeout(reviewBannerTimer.current);
    setReviewBanner({ newRating });
    Animated.sequence([
      Animated.timing(reviewBannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(4000),
      Animated.timing(reviewBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => { reviewBannerTimer.current = setTimeout(() => setReviewBanner(null), 50); });
  }, [reviewBannerOpacity]);

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      if (reviewBannerTimer.current) clearTimeout(reviewBannerTimer.current);
    };
  }, []);

  const handleAvailabilityChange = (value: boolean) => {
    setIsAvailable(value);
    if (currentProvider) {
      setCurrentProvider({ ...currentProvider, isAvailable: value });
      updateProviderAvailability(currentProvider.id, value);
    }
  };

  const myJobs = React.useMemo(() =>
    requestHistory.filter((r) => r.provider?.id === currentProvider?.id && r.status === "completed"),
    [requestHistory, currentProvider?.id]
  );

  const syncFromServer = useCallback(async () => {
    let newTipTotal = 0, newTipJobs = 0, newReviewRating = 0, newReviews = 0;

    // Single AbortController shared by all fetches — hard cap of 5 seconds total
    const controller = new AbortController();
    const hardCapTimer = setTimeout(() => controller.abort(), 5000);

    try {
      const recentJobs = [...myJobs]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      // All job fetches + provider fetch run concurrently under the same abort signal
      const fetchJob = async (r: typeof recentJobs[0]) => {
        try {
          const url = new URL(`/api/jobs/${r.id}`, getApiUrl());
          const res = await fetch(url.toString(), {
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
            signal: controller.signal,
          });
          if (!res.ok) return;
          const job = await res.json() as { tip?: number; totalCost?: number; driverRating?: number };
          const updates: Record<string, unknown> = {};
          if (typeof job.tip === "number" && job.tip > 0) {
            const prevTip = r.tip ?? 0;
            if (job.tip > prevTip) { newTipTotal += job.tip - prevTip; newTipJobs += 1; }
            updates.tip = job.tip; updates.totalCost = job.totalCost;
          }
          if (typeof job.driverRating === "number" && job.driverRating > 0) {
            const prevRating = r.driverRating ?? 0;
            if (prevRating === 0) { newReviewRating = job.driverRating; newReviews += 1; }
            updates.driverRating = job.driverRating;
          }
          if (Object.keys(updates).length > 0) updateHistoryEntry(r.id, updates as Partial<import("@/context/AppContext").ServiceRequest>);
        } catch { /* aborted or network error — silent */ }
      };

      const fetchProvider = async () => {
        if (!currentProvider?.id) return;
        try {
          const provUrl = new URL(`/api/providers/${currentProvider.id}`, getApiUrl());
          const provRes = await fetch(provUrl.toString(), {
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
            signal: controller.signal,
          });
          if (!provRes.ok) return;
          const provData = await provRes.json() as { rating: number; reviewCount: number };
          if (
            typeof provData.rating === "number" &&
            typeof provData.reviewCount === "number" &&
            (provData.rating !== currentProvider.rating || provData.reviewCount !== currentProvider.reviewCount)
          ) {
            setCurrentProvider({ ...currentProvider, rating: provData.rating, reviewCount: provData.reviewCount });
          }
        } catch { /* aborted or network error — silent */ }
      };

      // All network calls race together — the AbortController kills them all at 5s
      await Promise.allSettled([
        ...recentJobs.map(fetchJob),
        fetchProvider(),
      ]);
    } finally {
      clearTimeout(hardCapTimer);
    }

    return { newTipTotal, newTipJobs, newReviewRating, newReviews };
  }, [myJobs, updateHistoryEntry, currentProvider, setCurrentProvider]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const result = await syncFromServer();
    setIsRefreshing(false);
    if (result.newTipJobs > 0) showTipBanner(result.newTipTotal, result.newTipJobs);
    if (result.newReviews > 0) showReviewBanner(result.newReviewRating);
  }, [syncFromServer, showTipBanner, showReviewBanner]);

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);

  const todayJobs = myJobs.filter((r) => r.createdAt >= todayStart);
  const weekJobs = myJobs.filter((r) => r.createdAt >= weekStart);

  const acceptsPriority = currentProvider?.acceptsPriorityJobs;
  const todayEarnings = todayJobs.reduce((s, r) => s + netEarnings(r, acceptsPriority), 0);
  const weekEarnings = weekJobs.reduce((s, r) => s + netEarnings(r, acceptsPriority), 0);
  const allTimeEarnings = myJobs.reduce((s, r) => s + netEarnings(r, acceptsPriority), 0);
  const totalTips = myJobs.reduce((s, r) => s + (r.tip ?? 0), 0);

  const rating = currentProvider?.rating ?? 0;
  const reviewCount = currentProvider?.reviewCount ?? 0;
  const isVerified = currentProvider?.verificationStatus === "verified";
  const hasAnyJobs = myJobs.length > 0;
  const providerName = currentProvider?.name?.split(" ")[0] ?? "Provider";

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#000000" : theme.backgroundRoot }]}>
      <AnimatedBackground />

      {/* Floating tip banner */}
      {tipBanner ? (
        <Animated.View style={[styles.floatingBanner, { backgroundColor: "#166534", top: insets.top + Spacing.sm, opacity: bannerOpacity }]}>
          <View style={[styles.bannerIcon, { backgroundColor: "#22C55E22" }]}>
            <Feather name="gift" size={16} color="#4ADE80" />
          </View>
          <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>New tip received!</ThemedText>
            <ThemedText type="small" style={{ color: "rgba(255,255,255,0.7)" }}>
              +${tipBanner.totalTips.toFixed(2)} across {tipBanner.jobCount} {tipBanner.jobCount === 1 ? "job" : "jobs"}
            </ThemedText>
          </View>
          <Feather name="dollar-sign" size={16} color="#4ADE80" />
        </Animated.View>
      ) : null}

      {reviewBanner ? (
        <Animated.View style={[styles.floatingBanner, { backgroundColor: "#78350F", top: insets.top + (tipBanner ? 80 : 0) + Spacing.sm, opacity: reviewBannerOpacity }]}>
          <View style={[styles.bannerIcon, { backgroundColor: "#F59E0B22" }]}>
            <Feather name="star" size={16} color="#FBBF24" />
          </View>
          <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>New review!</ThemedText>
            <ThemedText type="small" style={{ color: "rgba(255,255,255,0.7)" }}>
              Rated {reviewBanner.newRating} {reviewBanner.newRating === 1 ? "star" : "stars"}
            </ThemedText>
          </View>
          <View style={{ flexDirection: "row" }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Feather key={s} name="star" size={12} color={s <= reviewBanner.newRating ? "#FBBF24" : "#FFFFFF44"} style={{ marginLeft: 2 }} />
            ))}
          </View>
        </Animated.View>
      ) : null}

      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, Spacing["2xl"]) + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#22C55E"
            colors={["#22C55E", "#0066FF"]}
            progressBackgroundColor="#0F2855"
            title={isRefreshing ? "Syncing earnings..." : "Pull to sync"}
            titleColor="#22C55E"
            progressViewOffset={8}
          />
        }
      >
        {/* Hero card */}
        <LinearGradient
          colors={isAvailable ? ["#052E16", "#0A3D22", "#052E16"] : ["#0A1F3A", "#0F2855", "#14124A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "600", letterSpacing: 0.8 }}>
                WELCOME BACK
              </ThemedText>
              <ThemedText style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "800", marginTop: 2 }}>
                {providerName}
              </ThemedText>
            </View>
            <View style={[styles.statusPill, { backgroundColor: isAvailable ? "#22C55E22" : "rgba(255,255,255,0.08)" }]}>
              <View style={[styles.statusDot, { backgroundColor: isAvailable ? "#4ADE80" : "#64748B" }]} />
              <ThemedText style={{ color: isAvailable ? "#4ADE80" : "#94A3B8", fontSize: 12, fontWeight: "700" }}>
                {isAvailable ? "ONLINE" : "OFFLINE"}
              </ThemedText>
            </View>
          </View>

          <View style={styles.heroEarningsRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: "600", letterSpacing: 0.6 }}>
                ALL-TIME EARNED
              </ThemedText>
              <ThemedText style={{ color: isAvailable ? "#4ADE80" : "#60A5FA", fontSize: 28, fontWeight: "800", marginTop: 2 }}>
                ${allTimeEarnings.toFixed(2)}
              </ThemedText>
            </View>
            <View style={styles.heroStatsRight}>
              <View style={styles.heroMiniStat}>
                <ThemedText style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "600" }}>TODAY</ThemedText>
                <ThemedText style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>${todayEarnings.toFixed(2)}</ThemedText>
              </View>
              <View style={[styles.heroStatDivider, { backgroundColor: "rgba(255,255,255,0.1)" }]} />
              <View style={styles.heroMiniStat}>
                <ThemedText style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "600" }}>JOBS</ThemedText>
                <ThemedText style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>{myJobs.length}</ThemedText>
              </View>
            </View>
          </View>

          {/* Verification badge row */}
          <View style={styles.heroBottomRow}>
            {isVerified ? (
              <View style={[styles.heroBadge, { backgroundColor: "#22C55E18", borderColor: "#22C55E30" }]}>
                <Feather name="shield" size={11} color="#4ADE80" />
                <ThemedText style={{ color: "#4ADE80", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>ID Verified</ThemedText>
              </View>
            ) : (
              <View style={[styles.heroBadge, { backgroundColor: "#F59E0B18", borderColor: "#F59E0B30" }]}>
                <Feather name="alert-circle" size={11} color="#FBBF24" />
                <ThemedText style={{ color: "#FBBF24", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>Verification Pending</ThemedText>
              </View>
            )}
            {rating > 0 ? (
              <View style={[styles.heroBadge, { backgroundColor: "#F59E0B18", borderColor: "#F59E0B30", marginLeft: Spacing.sm }]}>
                <Feather name="star" size={11} color="#FBBF24" />
                <ThemedText style={{ color: "#FBBF24", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                  {rating.toFixed(1)} ({reviewCount})
                </ThemedText>
              </View>
            ) : null}
            <View style={{ flex: 1 }} />
            <ThemedText style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>Pull to sync</ThemedText>
          </View>
        </LinearGradient>

        {/* Availability toggle */}
        <View style={[styles.availabilityCard, { backgroundColor: cardBg }]}>
          <View style={[styles.availIconBox, { backgroundColor: isAvailable ? "#22C55E22" : "#60A5FA18" }]}>
            <Feather name={isAvailable ? "radio" : "power"} size={20} color={isAvailable ? "#4ADE80" : "#60A5FA"} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "700" }}>
              {isAvailable ? "You're Online" : "Ready to Earn?"}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 1 }}>
              {isAvailable ? "Drivers nearby can see and request you" : "Go online to start accepting jobs"}
            </ThemedText>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={handleAvailabilityChange}
            trackColor={{ false: theme.border, true: "#22C55E" }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Today's Stats */}
        <ThemedText style={[styles.sectionLabel, { marginBottom: Spacing.sm }]}>TODAY'S STATS</ThemedText>
        <View style={styles.statsGrid}>
          <StatCard icon="dollar-sign" label="Earnings" value={todayJobs.length > 0 ? `$${todayEarnings.toFixed(2)}` : "$0.00"} color="#4ADE80" cardBg={cardBg} />
          <StatCard icon="check-circle" label="Jobs Done" value={String(todayJobs.length)} color="#60A5FA" cardBg={cardBg} />
          <StatCard icon="star" label="Rating" value={rating > 0 ? rating.toFixed(1) : "--"} color="#FBBF24" cardBg={cardBg} />
          <StatCard icon="briefcase" label="Total Jobs" value={String(myJobs.length)} color="#F87171" cardBg={cardBg} />
        </View>

        {/* This Week */}
        <ThemedText style={[styles.sectionLabel, { marginBottom: Spacing.sm }]}>THIS WEEK</ThemedText>
        <View style={[styles.weekCard, { backgroundColor: cardBg }]}>
          <WeekRow label="Net Earnings" value={`$${weekEarnings.toFixed(2)}`} valueColor="#4ADE80" icon="trending-up" iconColor="#4ADE80" />
          <WeekRow label="Jobs Completed" value={String(weekJobs.length)} icon="check-circle" iconColor="#60A5FA" />
          <WeekRow label="All-Time Earned" value={`$${allTimeEarnings.toFixed(2)}`} valueColor="#4ADE80" icon="dollar-sign" iconColor="#4ADE80" />
          {totalTips > 0 ? (
            <WeekRow label="Tips Received" value={`+$${totalTips.toFixed(2)}`} valueColor="#4ADE80" icon="gift" iconColor="#4ADE80" />
          ) : null}
          <WeekRow label="Avg. Rating" value={rating > 0 ? `${rating.toFixed(1)} (${reviewCount})` : "--"} icon="star" iconColor="#FBBF24" isLast />
        </View>

        {/* Recent Reviews */}
        {myJobs.filter((r) => typeof r.driverRating === "number").length > 0 ? (
          <>
            <ThemedText style={[styles.sectionLabel, { marginBottom: Spacing.sm }]}>RECENT REVIEWS</ThemedText>
            <View style={[styles.weekCard, { backgroundColor: cardBg }]}>
              {myJobs
                .filter((r) => typeof r.driverRating === "number")
                .slice(-5).reverse()
                .map((r, idx, arr) => (
                  <View key={r.id}>
                    <View style={styles.reviewRow}>
                      <View style={[styles.reviewAvatar, { backgroundColor: "#0066FF20" }]}>
                        <Feather name="user" size={16} color="#60A5FA" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="body" style={{ fontWeight: "600" }}>{r.driver?.name ?? "Driver"}</ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary }}>
                          {r.serviceType?.replace(/_/g, " ") ?? "Service"} · {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </ThemedText>
                      </View>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Feather key={s} name="star" size={13} color={s <= (r.driverRating ?? 0) ? "#FBBF24" : theme.border} style={{ marginLeft: 2 }} />
                        ))}
                      </View>
                    </View>
                    {idx < arr.length - 1 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
                  </View>
                ))}
            </View>
          </>
        ) : null}

        {/* Empty state */}
        {!hasAnyJobs ? (
          <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
            <View style={[styles.emptyIconBox, { backgroundColor: "#0066FF18" }]}>
              <Feather name="zap" size={28} color="#60A5FA" />
            </View>
            <ThemedText type="h4" style={{ marginTop: Spacing.md, textAlign: "center", color: "#FFFFFF" }}>
              Ready for Your First Job
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              Toggle online above and accept jobs from the Jobs tab. Your earnings and stats will appear here after each completed job.
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Floating banners
  floatingBanner: { position: "absolute", left: Spacing.lg, right: Spacing.lg, flexDirection: "row", alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.md, zIndex: 100 },
  bannerIcon: { width: 36, height: 36, borderRadius: BorderRadius.xs, alignItems: "center", justifyContent: "center" },
  // Hero
  heroCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.md },
  heroTopRow: { flexDirection: "row", alignItems: "flex-start" },
  statusPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: 20, gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  heroEarningsRow: { flexDirection: "row", alignItems: "flex-end" },
  heroStatsRight: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingBottom: 4 },
  heroMiniStat: { alignItems: "flex-end" },
  heroStatDivider: { width: 1, height: 28 },
  heroBottomRow: { flexDirection: "row", alignItems: "center" },
  heroBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  // Availability
  availabilityCard: { flexDirection: "row", alignItems: "center", padding: Spacing.lg, borderRadius: BorderRadius.md, marginBottom: Spacing.lg, gap: Spacing.md },
  availIconBox: { width: 44, height: 44, borderRadius: BorderRadius.xs, alignItems: "center", justifyContent: "center" },
  // Section label
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.9, textTransform: "uppercase", color: "rgba(148,163,184,0.8)" },
  // Stats grid
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: { width: "48%", borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: "flex-start" },
  statIconBox: { width: 40, height: 40, borderRadius: BorderRadius.xs, alignItems: "center", justifyContent: "center", marginBottom: Spacing.sm },
  statValue: { fontSize: 26, fontWeight: "800", lineHeight: 30 },
  // Weekly card
  weekCard: { borderRadius: BorderRadius.md, marginBottom: Spacing.lg, overflow: "hidden" },
  weeklyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  weeklyRowLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  weekRowIcon: { width: 28, height: 28, borderRadius: BorderRadius.xs, alignItems: "center", justifyContent: "center" },
  divider: { height: 1, marginHorizontal: Spacing.lg },
  // Reviews
  reviewRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  reviewStars: { flexDirection: "row" },
  // Empty state
  emptyState: { alignItems: "center", padding: Spacing["2xl"], borderRadius: BorderRadius.lg, overflow: "hidden" },
  emptyIconBox: { width: 60, height: 60, borderRadius: BorderRadius.sm, alignItems: "center", justifyContent: "center" },
});
