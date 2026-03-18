import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, StyleSheet, ScrollView, Switch, RefreshControl, Animated, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp, BACKGROUND_SCHEMES, ServiceRequest } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useProviderLocation, updateProviderAvailability, registerProviderOnServer } from "@/hooks/useProviderLocation";
import { getApiUrl } from "@/lib/query-client";

const PLATFORM_FEE = 0.15;

function netEarnings(r: ServiceRequest): number {
  const gross = r.estimatedCost || 0;
  const tip = typeof r.tip === "number" ? r.tip : 0;
  return gross * (1 - PLATFORM_FEE) + tip;
}

function StatCard({
  icon,
  label,
  value,
  color,
  cardBg,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color: string;
  cardBg: string;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.statCard, { backgroundColor: cardBg, borderLeftWidth: 4, borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <ThemedText type="h3" style={[styles.statValue, { color: theme.text }]}>
        {value}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
    </View>
  );
}

export default function ProviderDashboardScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { currentProvider, setCurrentProvider, requestHistory, updateHistoryEntry, backgroundPreferences } = useApp();
  const [isAvailable, setIsAvailable] = useState(currentProvider?.isAvailable ?? false);
  const isAnimated = backgroundPreferences.mode === "animated";
  const scheme = BACKGROUND_SCHEMES[backgroundPreferences.colorScheme];
  const cardBg = isAnimated ? theme.cardAnimatedBg : theme.backgroundDefault;

  useProviderLocation(currentProvider?.id ?? null, isAvailable);

  useEffect(() => {
    if (currentProvider) {
      registerProviderOnServer(currentProvider);
    }
  }, [currentProvider?.id]);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Notification banners
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
    ]).start(() => {
      bannerTimer.current = setTimeout(() => setTipBanner(null), 50);
    });
  }, [bannerOpacity]);

  const showReviewBanner = useCallback((newRating: number) => {
    if (reviewBannerTimer.current) clearTimeout(reviewBannerTimer.current);
    setReviewBanner({ newRating });
    Animated.sequence([
      Animated.timing(reviewBannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(4000),
      Animated.timing(reviewBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      reviewBannerTimer.current = setTimeout(() => setReviewBanner(null), 50);
    });
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
    requestHistory.filter(
      (r) => r.provider?.id === currentProvider?.id && r.status === "completed"
    ),
    [requestHistory, currentProvider?.id]
  );

  // Sync tips + ratings from server
  const syncFromServer = useCallback(async () => {
    let newTipTotal = 0;
    let newTipJobs = 0;
    let newReviewRating = 0;
    let newReviews = 0;

    if (myJobs.length > 0) {
      await Promise.all(
        myJobs.map(async (r) => {
          try {
            const url = new URL(`/api/jobs/${r.id}`, getApiUrl());
            const res = await fetch(url.toString(), {
              headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
            });
            if (!res.ok) return;
            const job = await res.json() as { tip?: number; totalCost?: number; driverRating?: number };
            const updates: Record<string, unknown> = {};
            if (typeof job.tip === "number" && job.tip > 0) {
              const prevTip = r.tip ?? 0;
              if (job.tip > prevTip) {
                newTipTotal += job.tip - prevTip;
                newTipJobs += 1;
              }
              updates.tip = job.tip;
              updates.totalCost = job.totalCost;
            }
            if (typeof job.driverRating === "number" && job.driverRating > 0) {
              const prevRating = r.driverRating ?? 0;
              if (prevRating === 0) {
                newReviewRating = job.driverRating;
                newReviews += 1;
              }
              updates.driverRating = job.driverRating;
            }
            if (Object.keys(updates).length > 0) {
              updateHistoryEntry(r.id, updates as Partial<import("@/context/AppContext").ServiceRequest>);
            }
          } catch {
            // silent — offline or server restarted
          }
        })
      );
    }

    // Refresh provider's overall rating/reviewCount from server
    if (currentProvider?.id) {
      try {
        const provUrl = new URL(`/api/providers/${currentProvider.id}`, getApiUrl());
        const provRes = await fetch(provUrl.toString(), {
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
        if (provRes.ok) {
          const provData = await provRes.json() as { rating: number; reviewCount: number };
          if (
            typeof provData.rating === "number" &&
            typeof provData.reviewCount === "number" &&
            (provData.rating !== currentProvider.rating || provData.reviewCount !== currentProvider.reviewCount)
          ) {
            setCurrentProvider({ ...currentProvider, rating: provData.rating, reviewCount: provData.reviewCount });
          }
        }
      } catch {
        // silent
      }
    }

    return { newTipTotal, newTipJobs, newReviewRating, newReviews };
  }, [myJobs, updateHistoryEntry, currentProvider, setCurrentProvider]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const result = await syncFromServer();
    setIsRefreshing(false);
    if (result.newTipJobs > 0) {
      showTipBanner(result.newTipTotal, result.newTipJobs);
    }
    if (result.newReviews > 0) {
      showReviewBanner(result.newReviewRating);
    }
  }, [syncFromServer, showTipBanner, showReviewBanner]);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const todayJobs = myJobs.filter((r) => r.createdAt >= todayStart);
  const weekJobs = myJobs.filter((r) => r.createdAt >= weekStart);

  const todayEarnings = todayJobs.reduce((s, r) => s + netEarnings(r), 0);
  const weekEarnings = weekJobs.reduce((s, r) => s + netEarnings(r), 0);
  const allTimeEarnings = myJobs.reduce((s, r) => s + netEarnings(r), 0);
  const totalTips = myJobs.reduce((s, r) => s + (r.tip ?? 0), 0);

  const rating = currentProvider?.rating ?? 0;
  const reviewCount = currentProvider?.reviewCount ?? 0;
  const isVerified = currentProvider?.verificationStatus === "verified";
  const hasAnyJobs = myJobs.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: isAnimated ? (isDark ? scheme.bgColor : scheme.bgColorLight) : theme.backgroundRoot }]}>
      {isAnimated ? <AnimatedBackground customColors={isDark ? scheme.colors : scheme.colorsLight} opacityBoost={isDark ? scheme.opacityBoost : scheme.opacityBoostLight} flashColor={isDark ? scheme.flashColor : scheme.flashColorLight} isDark={isDark} /> : null}

      {tipBanner ? (
        <Animated.View
          style={[
            styles.tipBanner,
            {
              backgroundColor: theme.success,
              top: insets.top + Spacing.sm,
              opacity: bannerOpacity,
            },
          ]}
        >
          <Feather name="gift" size={18} color="#FFFFFF" />
          <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
              New tip received!
            </ThemedText>
            <ThemedText type="small" style={{ color: "#FFFFFF" + "CC" }}>
              +${tipBanner.totalTips.toFixed(2)} across {tipBanner.jobCount} {tipBanner.jobCount === 1 ? "job" : "jobs"}
            </ThemedText>
          </View>
          <Feather name="dollar-sign" size={18} color="#FFFFFF" />
        </Animated.View>
      ) : null}

      {reviewBanner ? (
        <Animated.View
          style={[
            styles.tipBanner,
            {
              backgroundColor: "#F59E0B",
              top: insets.top + (tipBanner ? 80 : 0) + Spacing.sm,
              opacity: reviewBannerOpacity,
            },
          ]}
        >
          <Feather name="star" size={18} color="#FFFFFF" />
          <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
              New review received!
            </ThemedText>
            <ThemedText type="small" style={{ color: "#FFFFFF" + "CC" }}>
              A driver rated you {reviewBanner.newRating} {reviewBanner.newRating === 1 ? "star" : "stars"}
            </ThemedText>
          </View>
          <View style={{ flexDirection: "row" }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Feather key={s} name="star" size={12} color={s <= reviewBanner.newRating ? "#FFFFFF" : "#FFFFFF66"} style={{ marginLeft: 2 }} />
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
            tintColor={theme.primary}
            colors={[theme.primary]}
            title="Syncing earnings..."
            titleColor={theme.textSecondary}
          />
        }
      >
        <ThemedText type="h2" style={{ marginBottom: Spacing.lg }}>Dashboard</ThemedText>

        <View style={[styles.welcomeBanner, { backgroundColor: theme.secondary + "15" }]}>
          <Feather name="heart" size={20} color={theme.secondary} />
          <ThemedText type="body" style={{ color: theme.secondary, marginLeft: Spacing.sm, flex: 1 }}>
            {isAvailable
              ? "You're online — drivers in your area can see you."
              : "Toggle online when you're ready to accept jobs."}
          </ThemedText>
        </View>

        {isVerified ? (
          <View style={[styles.verificationBanner, { backgroundColor: theme.success + "15" }]}>
            <Feather name="shield" size={20} color={theme.success} />
            <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
              <ThemedText type="body" style={{ color: theme.success, fontWeight: "600" }}>
                ID Verified Provider
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Your identity has been verified for driver safety
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={[styles.verificationBanner, { backgroundColor: theme.warning + "15" }]}>
            <Feather name="alert-circle" size={20} color={theme.warning} />
            <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
              <ThemedText type="body" style={{ color: theme.warning, fontWeight: "600" }}>
                Verification Pending
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Complete ID verification to appear in driver searches
              </ThemedText>
            </View>
          </View>
        )}

        <View style={[styles.availabilityCard, { backgroundColor: cardBg }]}>
          <View style={styles.availabilityRow}>
            <View>
              <ThemedText type="h4">Ready to Earn?</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                {isAvailable ? "You're visible to nearby drivers" : "Go online when you're ready"}
              </ThemedText>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={handleAvailabilityChange}
              trackColor={{ false: theme.border, true: theme.success }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: isAvailable ? theme.success : theme.textSecondary },
            ]}
          />
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Today's Stats
        </ThemedText>
        <View style={styles.statsGrid}>
          <StatCard
            icon="dollar-sign"
            label="Earnings"
            value={todayJobs.length > 0 ? `$${todayEarnings.toFixed(2)}` : "$0.00"}
            color={theme.success}
            cardBg={cardBg}
          />
          <StatCard
            icon="check-circle"
            label="Jobs Done"
            value={String(todayJobs.length)}
            color={theme.secondary}
            cardBg={cardBg}
          />
          <StatCard
            icon="star"
            label="Rating"
            value={rating > 0 ? rating.toFixed(1) : "--"}
            color="#F59E0B"
            cardBg={cardBg}
          />
          <StatCard
            icon="briefcase"
            label="Total Jobs"
            value={String(myJobs.length)}
            color={theme.primary}
            cardBg={cardBg}
          />
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>
          This Week
        </ThemedText>
        <View style={[styles.weeklyCard, { backgroundColor: cardBg }]}>
          <View style={styles.weeklyRow}>
            <ThemedText type="body">Net Earnings</ThemedText>
            <ThemedText type="h4" style={{ color: theme.success }}>
              ${weekEarnings.toFixed(2)}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.weeklyRow}>
            <ThemedText type="body">Jobs Completed</ThemedText>
            <ThemedText type="h4">{weekJobs.length}</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.weeklyRow}>
            <ThemedText type="body">All-Time Earned</ThemedText>
            <ThemedText type="h4" style={{ color: theme.success }}>
              ${allTimeEarnings.toFixed(2)}
            </ThemedText>
          </View>
          {totalTips > 0 ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={[styles.weeklyRow, styles.tipRow, { backgroundColor: theme.success + "10" }]}>
                <View style={styles.tipRowLeft}>
                  <Feather name="gift" size={16} color={theme.success} />
                  <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>Tips Received</ThemedText>
                </View>
                <ThemedText type="h4" style={{ color: theme.success }}>
                  +${totalTips.toFixed(2)}
                </ThemedText>
              </View>
            </>
          ) : null}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.weeklyRow}>
            <ThemedText type="body">Avg. Rating</ThemedText>
            <View style={styles.ratingRow}>
              <Feather name="star" size={16} color={theme.warning} />
              <ThemedText type="h4" style={{ marginLeft: 4 }}>
                {rating > 0 ? `${rating.toFixed(1)} (${reviewCount})` : "--"}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.refreshHint, { backgroundColor: cardBg }]}>
          <Feather name="refresh-cw" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
            Pull down to sync tips, earnings and reviews
          </ThemedText>
        </View>

        {myJobs.filter((r) => typeof r.driverRating === "number").length > 0 ? (
          <>
            <ThemedText type="h4" style={styles.sectionTitle}>Recent Reviews</ThemedText>
            <View style={[styles.reviewsCard, { backgroundColor: cardBg }]}>
              {myJobs
                .filter((r) => typeof r.driverRating === "number")
                .slice(-5)
                .reverse()
                .map((r, idx, arr) => (
                  <View key={r.id}>
                    <View style={styles.reviewRow}>
                      <View style={styles.reviewLeft}>
                        <View style={[styles.reviewAvatar, { backgroundColor: theme.primary + "20" }]}>
                          <Feather name="user" size={16} color={theme.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText type="body" style={{ fontWeight: "600" }}>
                            {r.driver?.name ?? "Driver"}
                          </ThemedText>
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>
                            {r.serviceType?.replace(/_/g, " ") ?? "Service"} · {
                              new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            }
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Feather
                            key={s}
                            name="star"
                            size={14}
                            color={s <= (r.driverRating ?? 0) ? "#F59E0B" : theme.border}
                            style={{ marginLeft: 2 }}
                          />
                        ))}
                      </View>
                    </View>
                    {idx < arr.length - 1 ? (
                      <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    ) : null}
                  </View>
                ))}
            </View>
          </>
        ) : null}

        {!hasAnyJobs ? (
          <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
            <Feather name="zap" size={32} color={theme.secondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.md, textAlign: "center" }}>
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
  container: {
    flex: 1,
  },
  tipBanner: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  verificationBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  availabilityCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing["2xl"],
    position: "relative",
    overflow: "hidden",
  },
  availabilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    marginBottom: 2,
  },
  weeklyCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  weeklyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  tipRow: {
    borderRadius: 0,
  },
  tipRowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  refreshHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing["2xl"],
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.md,
  },
  reviewsCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  reviewLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.sm,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewStars: {
    flexDirection: "row",
    alignItems: "center",
  },
});
