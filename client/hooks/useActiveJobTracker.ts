import { useEffect, useRef } from "react";
import { getApiUrl } from "@/lib/query-client";
import { useApp, ServiceStatus, Provider } from "@/context/AppContext";
import {
  notifyProviderEnRoute,
  notifyProviderArrived,
  notifyServiceComplete,
} from "@/lib/notifications";
import { navigateTo } from "@/lib/navigationRef";

const STATUS_ORDER: ServiceStatus[] = [
  "pending", "accepted", "en_route", "arrived", "in_progress", "completed", "cancelled",
];

const SERVICE_LABELS: Record<string, string> = {
  flat_tire:      "Flat Tire",
  jump_start:     "Jump Start",
  tow:            "Tow Service",
  fuel:           "Fuel Delivery",
  lockout:        "Lockout",
  obd_diagnostic: "OBD Diagnostic",
};

/**
 * Global job tracker — runs on every driver screen (mounted in DriverTabNavigator).
 * Polls + listens via WebSocket for job status changes, fires push notifications,
 * and navigates to ServiceCompletion — all independent of which driver screen is active.
 */
export function useActiveJobTracker() {
  const { activeRequest, setActiveRequest, updateHistoryEntry, userRole } = useApp();

  const activeRequestRef          = useRef(activeRequest);
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef                     = useRef<WebSocket | null>(null);
  const prevStatusRef             = useRef<ServiceStatus | null>(null);
  // Guard: once we've sent the driver to ServiceCompletion, don't do it again
  // until a brand-new job starts (activeRequest goes null → new id)
  const hasNavigatedCompletionRef = useRef(false);

  // Keep ref in sync so polling closures always read the latest value
  useEffect(() => { activeRequestRef.current = activeRequest; }, [activeRequest]);

  // ── WebSocket — real-time status updates ──────────────────────────────────
  useEffect(() => {
    if (!activeRequest?.id) return;
    const apiUrl = getApiUrl();
    const wsBase = apiUrl.replace(/^https/, "wss").replace(/^http/, "ws").replace(/\/$/, "");
    const wsUrl  = `${wsBase}/ws`;

    const applyJobUpdate = (job: Record<string, unknown>) => {
      const current = activeRequestRef.current;
      if (!current || job.id !== current.id) return;
      if (job.status === "cancelled") { setActiveRequest(null); return; }
      // Never re-trigger once already completed — avoids re-launching ServiceCompletion
      if (current.status === "completed") return;
      const serverIdx = STATUS_ORDER.indexOf(job.status as ServiceStatus);
      const localIdx  = STATUS_ORDER.indexOf(current.status);
      const providerChanged = !!(job.provider && !current.provider);
      if (serverIdx > localIdx || providerChanged) {
        const newStatus   = job.status as ServiceStatus;
        const newProvider = (job.provider as Provider | undefined) ?? current.provider;
        setActiveRequest({
          ...current,
          status: newStatus,
          provider: newProvider,
          eta: (job.eta as number | undefined) ?? current.eta,
        });
        updateHistoryEntry(current.id, { status: newStatus, provider: newProvider });
      }
    };

    let cancelled = false;
    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data as string);
          if (d.type === "job_status_update") applyJobUpdate(d.job);
        } catch {}
      };
      ws.onerror = () => {};
      ws.onclose = () => { if (!cancelled) setTimeout(connect, 2000); };
    };
    connect();
    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [activeRequest?.id]);

  // ── HTTP polling fallback every 2 s ──────────────────────────────────────
  useEffect(() => {
    if (!activeRequest?.id) return;

    const poll = async () => {
      const cur = activeRequestRef.current;
      if (!cur) return;
      if (cur.status === "cancelled" || cur.status === "completed") {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        return;
      }
      try {
        const url = new URL(`/api/jobs/${cur.id}`, getApiUrl());
        const res = await fetch(url.toString(), {
          headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
        });
        if (!res.ok) return;
        const job = await res.json();

        if (job.status === "cancelled") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setActiveRequest(null);
          return;
        }

        const serverIdx = STATUS_ORDER.indexOf(job.status as ServiceStatus);
        const localIdx  = STATUS_ORDER.indexOf(cur.status);
        const providerChanged = !!(job.provider && !cur.provider);
        if (serverIdx > localIdx || providerChanged) {
          const newStatus   = job.status as ServiceStatus;
          const newProvider = job.provider ? (job.provider as Provider) : cur.provider;
          setActiveRequest({
            ...cur,
            status: newStatus,
            provider: newProvider,
            eta: job.eta ?? cur.eta,
          });
          updateHistoryEntry(cur.id, { status: newStatus, provider: newProvider });
          if (newStatus === "completed" && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {}
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [activeRequest?.id]);

  // ── Push notifications on status transitions ─────────────────────────────
  useEffect(() => {
    if (!activeRequest) return;
    const status = activeRequest.status;
    if (status === prevStatusRef.current) return; // guard: don't re-fire on re-mount
    prevStatusRef.current = status;

    const providerName = activeRequest.provider?.name ?? "Your provider";
    const serviceLabel = SERVICE_LABELS[activeRequest.serviceType] ?? "service";
    if      (status === "en_route")  notifyProviderEnRoute(providerName, activeRequest.eta ?? 8);
    else if (status === "arrived")   notifyProviderArrived(providerName);
    else if (status === "completed") notifyServiceComplete(serviceLabel);
  }, [activeRequest?.status]);

  // ── Navigate to completion screen when job finishes ───────────────────────
  // Reset the guard whenever a new job starts so a future completion can navigate again
  useEffect(() => {
    if (!activeRequest) {
      hasNavigatedCompletionRef.current = false;
    }
  }, [activeRequest]);

  useEffect(() => {
    if (
      activeRequest?.status === "completed" &&
      userRole === "driver" &&
      !hasNavigatedCompletionRef.current
    ) {
      hasNavigatedCompletionRef.current = true;
      navigateTo("ServiceCompletion");
    }
  }, [activeRequest?.status]);
}
