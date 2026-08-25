"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Container } from "@/components/container";
import { Spinner } from "@/components/spinner";

export default function LogsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const clearInProgressRef = useRef(false);
  const requestVersionRef = useRef(0);

  async function fetchLogs() {
    if (clearInProgressRef.current) return;
    const requestVersion = ++requestVersionRef.current;
    try {
      const response = await fetch("/api/logs", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch logs");
      const data = (await response.json()) as { logs: string[] };
      if (
        clearInProgressRef.current ||
        requestVersion !== requestVersionRef.current
      ) {
        return;
      }
      setLogs(data.logs);
      setError(null);
    } catch (err) {
      if (
        clearInProgressRef.current ||
        requestVersion !== requestVersionRef.current
      ) {
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      if (
        !clearInProgressRef.current &&
        requestVersion === requestVersionRef.current
      ) {
        setLoading(false);
      }
    }
  }

  async function clearLogs() {
    if (clearing || clearInProgressRef.current) return;

    clearInProgressRef.current = true;
    requestVersionRef.current += 1;
    setClearing(true);
    try {
      const response = await fetch("/api/logs", {
        method: "DELETE",
        headers: { "x-apply-ink": "1" },
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Could not clear logs");
      }
      setLogs([]);
      setError(null);
      setConfirmingClear(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear logs");
    } finally {
      clearInProgressRef.current = false;
      setClearing(false);
      void fetchLogs();
    }
  }

  useEffect(() => {
    const loadLogs = async () => {
      await fetchLogs();
    };
    void loadLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void fetchLogs();
    }, 2_000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="flex min-h-screen flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-espresso">Auto-Apply Logs</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-espresso">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4"
            />
            Auto-refresh
          </label>
          <Button
            variant="outline"
            disabled={logs.length === 0 || clearing}
            onClick={() => setConfirmingClear(true)}
          >
            Clear logs
          </Button>
          <Button
            type="button"
            disabled={clearing}
            onClick={() => void fetchLogs()}
          >
            Refresh now
          </Button>
        </div>
      </header>

      {error && (
        <Container variant="card" className="border border-sienna/30 p-3">
          <p className="text-sm text-sienna">{error}</p>
        </Container>
      )}

      {loading ? (
        <Container
          variant="card"
          className="flex items-center justify-center gap-3 p-6"
        >
          <Spinner />
          <p className="text-sm text-espresso/70">Loading logs...</p>
        </Container>
      ) : logs.length === 0 ? (
        <Container variant="card" className="p-8 text-center">
          <p className="text-sm text-espresso/70">No logs yet</p>
        </Container>
      ) : (
        <Container
          variant="card"
          className="max-h-[calc(100vh-12rem)] overflow-auto p-4"
        >
          <div className="font-mono text-xs leading-relaxed">
            {logs.map((line, index) => {
              const isError = /error|failed|blocker/i.test(line);
              const isSuccess = /success|submitted|completed/i.test(line);
              const isWarning = /warning|captcha|needs_user/i.test(line);

              return (
                <div
                  key={index}
                  className={`border-b border-sand/30 py-1 ${
                    isError
                      ? "text-sienna"
                      : isSuccess
                        ? "text-green-700"
                        : isWarning
                          ? "text-orange-700"
                          : "text-espresso/70"
                  }`}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </Container>
      )}

      <ConfirmDialog
        open={confirmingClear}
        title="Clear logs?"
        description="This permanently removes all auto-apply log entries. It cannot be undone."
        confirmLabel={clearing ? "Clearing..." : "Clear logs"}
        onConfirm={() => void clearLogs()}
        onCancel={() => {
          if (!clearing) setConfirmingClear(false);
        }}
      />
    </div>
  );
}
