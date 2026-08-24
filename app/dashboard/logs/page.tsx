"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/container";
import { Spinner } from "@/components/spinner";

export default function LogsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function fetchLogs() {
    try {
      const response = await fetch("/api/logs", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch logs");
      const data = (await response.json()) as { logs: string[] };
      setLogs(data.logs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
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
          <button
            type="button"
            onClick={() => void fetchLogs()}
            className="rounded-lg bg-sienna px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-sienna/90"
          >
            Refresh Now
          </button>
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
    </div>
  );
}
