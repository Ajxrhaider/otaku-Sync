"use html";
"use client";

import { useEffect, useState } from "react";

interface Activity {
  id: string;
  title: string;
  platform: string;
  action: string;
  fromEpisode: number;
  toEpisode: number;
  createdAt: string;
}

export default function SyncActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/sync/history");
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (err) {
      console.error("Failed to fetch sync audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-pulse">
        <div className="h-5 bg-zinc-800 w-1/4 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-12 bg-zinc-800 rounded"></div>
          <div className="h-12 bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-zinc-100">Sync Audit Trail</h3>
          <p className="text-xs text-zinc-400">Recent automated pipeline execution logs</p>
        </div>
        <button 
          onClick={fetchHistory}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md transition-all border border-zinc-700"
        >
          Refresh Feed
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg">
          <p className="text-sm text-zinc-500">No cross-platform sync updates recorded yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800 max-h-[400px] overflow-y-auto pr-1">
          {activities.map((log) => (
            <div key={log.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-zinc-200 line-clamp-1">
                  {log.title}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(log.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Progress Indicator Bridge Badge */}
                <div className="text-right flex flex-col items-end">
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                    Ep. {log.fromEpisode} → <b className="text-emerald-400">{log.toEpisode}</b>
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase mt-0.5 tracking-wider">
                    Progress Bump
                  </span>
                </div>

                {/* Target Platform Badge Layout */}
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                  log.platform.toLowerCase() === "myanimelist" 
                    ? "bg-blue-950/40 text-blue-400 border-blue-900/50" 
                    : "bg-purple-950/40 text-purple-400 border-purple-900/50"
                }`}>
                  {log.platform.toLowerCase() === "myanimelist" ? "MyAnimeList" : "AniList"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}