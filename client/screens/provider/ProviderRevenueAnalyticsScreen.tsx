import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

type Period = "7D" | "30D" | "ALL";

const PERIOD_LABELS: Record<Period, string> = {
  "7D":  "Last 7 Days",
  "30D": "Last 30 Days",
  "ALL": "All Time",
};

const SERVICE_LABELS: Record<string, string> = {
  flat_tire:        "Flat Tire",
  jump_start:       "Jump Start",
  tow:              "Tow Service",
  fuel:             "Fuel Delivery",
  lockout:          "Lockout",
  obd_diagnostic:   "OBD Diagnostic",
  tire_replacement: "Tire Replacement",
  mobile_inflation: "Mobile Tire Inflation",
  tire_check:       "Tire Inspection",
  battery_check:    "Battery Check",
};

const SERVICE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  flat_tire:        "disc",
  jump_start:       "battery-charging",
  tow:              "truck",
  fuel:             "droplet",
  lockout:          "key",
  obd_diagnostic:   "cpu",
  tire_replacement: "disc",
  mobile_inflation: "wind",
  tire_check:       "search",
  battery_check:    "battery-charging",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface CompletedJob {
  id: string;
  service_type: string;
  total_cost: number | null;
  tip: number | null;
  estimated_cost: number | null;
  created_at: string;
  is_ev?: boolean;
}

function jobValue(j: CompletedJob) {
  return Number(j.total_cost ?? j.estimated_cost ?? 0) + Number(j.tip ?? 0);
}

function filterByPeriod(jobs: CompletedJob[], period: Period): CompletedJob[] {
  if (period === "ALL") return jobs;
  const now = Date.now();
  const days = period === "7D" ? 7 : 30;
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return jobs.filter((j) => new Date(j.created_at).getTime() >= cutoff);
}

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string; sub?: string;
  icon: keyof typeof Feather.glyphMap; color: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <ThemedText type="h3" style={{ marginTop: Spacing.sm, color }}>
        {value}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
        {label}
      </ThemedText>
      {sub ? (
        <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10, marginTop: 2 }}>
          {sub}
        </ThemedText>
      ) : null}
    </View>
  );
}

export default function ProviderRevenueAnalyticsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { currentProvider } = useApp();
  const [period, setPeriod] = useState<Period>("30D");

  const { data: allJobs = [], isLoading } = useQuery<CompletedJob[]>({
    queryKey: [`/api/providers/${currentProvider?.id}/completed-jobs`],
    enabled: !!currentProvider?.id,
    queryFn: async () => {
      const res = await fetch(
        new URL(`/api/providers/${currentProvider!.id}/completed-jobs`, getApiUrl()).toString()
      );
      if (!res.ok) return [];
      return res.json();
    },
  });

  const jobs = useMemo(() => filterByPeriod(allJobs, period), [allJobs, period]);

  const metrics = useMemo(() => {
    const totalGross = jobs.reduce((s, j) => s + jobValue(j), 0);
    const totalNet = totalGross * 0.85;
    const totalFees = totalGross * 0.15;
    const jobCount = jobs.length;
    const avgJobValue = jobCount ? totalGross / jobCount : 0;

    // Prior period comparison
    const now = Date.now();
    const days = period === "7D" ? 7 : period === "30D" ? 30 : null;
    let priorGross = 0;
    if (days) {
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      const priorCutoff = cutoff - days * 24 * 60 * 60 * 1000;
      const priorJobs = allJobs.filter((j) => {
        const t = new Date(j.created_at).getTime();
        return t >= priorCutoff && t < cutoff;
      });
      priorGross = priorJobs.reduce((s, j) => s + jobValue(j), 0);
    }
    const growthPct = priorGross > 0
      ? ((totalGross - priorGross) / priorGross) * 100
      : null;

    // Service breakdown
    const byService: Record<string, { count: number; revenue: number }> = {};
    jobs.forEach((j) => {
      const key = j.service_type || "other";
      if (!byService[key]) byService[key] = { count: 0, revenue: 0 };
      byService[key].count++;
      byService[key].revenue += jobValue(j);
    });
    const topServices = Object.entries(byService)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5);

    // Day-of-week breakdown
    const byDay: number[] = Array(7).fill(0);
    jobs.forEach((j) => {
      const d = new Date(j.created_at).getDay();
      byDay[d]++;
    });
    const maxDayCount = Math.max(...byDay, 1);

    // Monthly trend (last 6 months)
    const monthlyRevenue: { label: string; value: number }[] = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const mRevenue = allJobs
        .filter((j) => {
          const jd = new Date(j.created_at);
          return jd.getMonth() === m && jd.getFullYear() === y;
        })
        .reduce((s, j) => s + jobValue(j), 0);
      monthlyRevenue.push({ label: MONTH_NAMES[m], value: mRevenue });
    }
    const maxMonth = Math.max(...monthlyRevenue.map((m) => m.value), 1);

    // EV jobs
    const evCount = jobs.filter((j) => j.is_ev).length;

    return {
      totalGross, totalNet, totalFees, jobCount, avgJobValue,
      growthPct, topServices, byDay, maxDayCount,
      monthlyRevenue, maxMonth, evCount,
    };
  }, [jobs, allJobs, period]);

  const sectionBg = isDark ? theme.backgroundDefault : "#FFFFFF";

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: insets.bottom + Spacing["3xl"],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={isDark ? ["#0D2818", "#0F1923"] : ["#E8F8F2", "#D5F5E3"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={[styles.heroIcon, { backgroundColor: "#10B98120" }]}>
              <Feather name="bar-chart-2" size={22} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="small" style={{ color: "#10B981", fontWeight: "700", letterSpacing: 0.8 }}>
                NET EARNINGS
              </ThemedText>
              <ThemedText type="h2" style={{ color: "#10B981" }}>
                ${metrics.totalNet.toFixed(2)}
              </ThemedText>
            </View>
            {metrics.growthPct !== null && (
              <View
                style={[
                  styles.growthBadge,
                  { backgroundColor: metrics.growthPct >= 0 ? "#10B98120" : "#EF444420" },
                ]}
              >
                <Feather
                  name={metrics.growthPct >= 0 ? "trending-up" : "trending-down"}
                  size={13}
                  color={metrics.growthPct >= 0 ? "#10B981" : "#EF4444"}
                />
                <ThemedText
                  type="small"
                  style={{
                    color: metrics.growthPct >= 0 ? "#10B981" : "#EF4444",
                    fontWeight: "700",
                    marginLeft: 4,
                  }}
                >
                  {Math.abs(metrics.growthPct).toFixed(0)}%
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 6 }}>
            {PERIOD_LABELS[period]} · {metrics.jobCount} jobs · ${metrics.totalGross.toFixed(2)} gross
          </ThemedText>
        </LinearGradient>

        {/* Period Toggle */}
        <View style={[styles.periodRow, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          {(["7D", "30D", "ALL"] as Period[]).map((p) => (
            <Pressable
              key={p}
              style={[styles.periodTab, period === p && { backgroundColor: theme.primary }]}
              onPress={() => setPeriod(p)}
            >
              <ThemedText
                type="body"
                style={{ fontWeight: "700", fontSize: 13, color: period === p ? "#FFFFFF" : theme.textSecondary }}
              >
                {p}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Key Stats */}
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          KEY METRICS
        </ThemedText>
        <View style={styles.statsRow}>
          <StatCard
            label="Jobs Done"
            value={String(metrics.jobCount)}
            icon="check-circle"
            color="#10B981"
          />
          <StatCard
            label="Avg Job"
            value={`$${metrics.avgJobValue.toFixed(0)}`}
            icon="dollar-sign"
            color="#3B82F6"
          />
          <StatCard
            label="EV Jobs"
            value={String(metrics.evCount)}
            icon="zap"
            color="#8B5CF6"
          />
        </View>

        {/* Revenue Breakdown */}
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          REVENUE BREAKDOWN
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          {[
            { label: "Gross Revenue", value: metrics.totalGross, icon: "dollar-sign" as const, color: theme.success },
            { label: "Platform Fees (15%)", value: -metrics.totalFees, icon: "percent" as const, color: theme.error },
            { label: "Net Payout", value: metrics.totalNet, icon: "trending-up" as const, color: theme.primary },
          ].map((item, i) => (
            <View key={item.label}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              <View style={styles.row}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[styles.rowIcon, { backgroundColor: item.color + "15" }]}>
                    <Feather name={item.icon} size={14} color={item.color} />
                  </View>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>
                    {item.label}
                  </ThemedText>
                </View>
                <ThemedText type="body" style={{ fontWeight: "700", color: item.color }}>
                  {item.value < 0 ? "-" : ""}${Math.abs(item.value).toFixed(2)}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Monthly Revenue Trend */}
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          6-MONTH TREND
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <View style={styles.barChart}>
            {metrics.monthlyRevenue.map((m) => {
              const barPct = m.value / metrics.maxMonth;
              return (
                <View key={m.label} style={styles.barCol}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 9, marginBottom: 4 }}>
                    ${m.value >= 1000 ? `${(m.value / 1000).toFixed(1)}k` : m.value.toFixed(0)}
                  </ThemedText>
                  <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${Math.max(barPct * 100, 2)}%`, backgroundColor: theme.primary },
                      ]}
                    />
                  </View>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10, marginTop: 4 }}>
                    {m.label}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </View>

        {/* Top Services */}
        {metrics.topServices.length > 0 && (
          <>
            <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
              TOP SERVICES BY REVENUE
            </ThemedText>
            <View style={[styles.section, { backgroundColor: sectionBg }]}>
              {metrics.topServices.map(([key, data], i) => {
                const pct = metrics.totalGross > 0 ? data.revenue / metrics.totalGross : 0;
                return (
                  <View key={key}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                    <View style={styles.serviceRow}>
                      <View style={[styles.serviceIcon, { backgroundColor: theme.secondary + "15" }]}>
                        <Feather
                          name={SERVICE_ICONS[key] ?? "tool"}
                          size={14}
                          color={theme.secondary}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                          <ThemedText type="body" style={{ fontWeight: "600", fontSize: 13 }}>
                            {SERVICE_LABELS[key] ?? key}
                          </ThemedText>
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>
                            {data.count} jobs · ${data.revenue.toFixed(0)}
                          </ThemedText>
                        </View>
                        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${pct * 100}%`, backgroundColor: theme.primary },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Busiest Days */}
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          BUSIEST DAYS OF THE WEEK
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <View style={styles.dayRow}>
            {DAY_NAMES.map((day, i) => {
              const count = metrics.byDay[i];
              const pct = count / metrics.maxDayCount;
              const isTop = count === metrics.maxDayCount && count > 0;
              return (
                <View key={day} style={styles.dayCol}>
                  <ThemedText type="small" style={{ color: isTop ? theme.primary : theme.textSecondary, fontWeight: isTop ? "700" : "400", fontSize: 10 }}>
                    {count}
                  </ThemedText>
                  <View style={[styles.dayBarTrack, { backgroundColor: theme.border }]}>
                    <View
                      style={[
                        styles.dayBarFill,
                        {
                          height: `${Math.max(pct * 100, count > 0 ? 8 : 0)}%`,
                          backgroundColor: isTop ? theme.primary : theme.textSecondary + "60",
                        },
                      ]}
                    />
                  </View>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10, marginTop: 4 }}>
                    {day}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </View>

        {/* Empty State */}
        {!isLoading && metrics.jobCount === 0 && (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={36} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
              No completed jobs in this period yet.
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4, textAlign: "center" }}>
              Complete your first job to see analytics here.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  growthBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  periodRow: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  periodTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.md,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 100,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barTrack: {
    width: "70%",
    height: 56,
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 4,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  serviceIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingVertical: Spacing.md,
    gap: 4,
  },
  dayCol: {
    flex: 1,
    alignItems: "center",
    height: 80,
    justifyContent: "flex-end",
  },
  dayBarTrack: {
    width: "70%",
    height: 44,
    borderRadius: 3,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  dayBarFill: {
    width: "100%",
    borderRadius: 3,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
});
