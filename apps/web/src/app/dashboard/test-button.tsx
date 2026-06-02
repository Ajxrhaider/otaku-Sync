"use client";

import { useState } from "react";

export function TestSyncButton({ isConnected }: { isConnected: boolean }) {
  const [loading, setLoading] = useState(false);

  if (!isConnected) return null;

  const handleTestSync = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Hardcoded Attack on Titan (MAL ID: 16498) Episode 1 for testing
        body: JSON.stringify({ sourcePlatform: 'mal', sourceId: 16498, episode: 1 })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ Success! Synced to AniList.\n\nResponse: ${JSON.stringify(data.data, null, 2)}`);
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert("An unexpected error occurred while syncing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-800">
      <h3 className="text-lg font-medium text-gray-200 mb-2">Developer Tools</h3>
      <p className="text-sm text-gray-400 mb-4">
        Simulate a webhook payload from a web extension to test the mapping and AniList mutation.
      </p>
      <button 
        onClick={handleTestSync}
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:text-gray-400 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-lg shadow-purple-900/20"
      >
        {loading ? "Syncing..." : "Test Sync: Attack on Titan (Ep 1)"}
      </button>
    </div>
  );
}