/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { Users, MousePointerClick, RefreshCw } from "lucide-react";

export default function App() {
  const [status, setStatus] = useState<{ status: string; botConfigured: boolean } | null>(null);
  const [stats, setStats] = useState<{ users: number; hdpClicks: number; omonClicks: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(console.error);
      
    fetchStats();
  }, []);

  const fetchStats = () => {
    setLoadingStats(true);
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoadingStats(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingStats(false);
      });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          HR Telegram Bot Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-4 rounded-lg bg-gray-100 border border-gray-200">
            <h2 className="text-xl font-semibold mb-2">Bot Status</h2>
            {status ? (
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${status.botConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-700">
                  {status.botConfigured 
                    ? "Bot is running (Webhook active)" 
                    : "Bot token is missing. Configure BOT_TOKEN in secrets."}
                </span>
              </div>
            ) : (
              <span className="text-gray-500">Checking status...</span>
            )}
          </div>
          
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-blue-900">Live Statistics</h2>
              <button 
                onClick={fetchStats} 
                disabled={loadingStats}
                className="p-2 bg-blue-100 hover:bg-blue-200 rounded-full text-blue-700 transition-colors disabled:opacity-50"
                title="Refresh stats"
              >
                <RefreshCw size={18} className={loadingStats ? "animate-spin" : ""} />
              </button>
            </div>
            
            {stats ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <Users size={18} />
                    <span>Total Users:</span>
                  </div>
                  <span className="font-bold text-lg text-blue-900">{stats.users}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <MousePointerClick size={18} />
                    <span>HDP LC Clicks:</span>
                  </div>
                  <span className="font-bold text-lg text-blue-900">{stats.hdpClicks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <MousePointerClick size={18} />
                    <span>Omon School Clicks:</span>
                  </div>
                  <span className="font-bold text-lg text-blue-900">{stats.omonClicks}</span>
                </div>
              </div>
            ) : (
              <span className="text-blue-500">Loading stats...</span>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Setup Instructions</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Open the <strong>Settings</strong> panel in AI Studio.</li>
              <li>Add a new secret named <code>BOT_TOKEN</code> with your Telegram bot token from BotFather.</li>
              <li>(Optional) Add <code>CHANNEL_USERNAME</code> secret (e.g., @dilmurodbekmatematika).</li>
              <li>(Optional) Add <code>ADMIN_ID</code> secret with your Telegram user ID.</li>
              <li>The bot will automatically set up a webhook to this server.</li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Features</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Requires users to subscribe to a specific channel.</li>
              <li>Provides quick links to HR forms (HDP LC, Omon School).</li>
              <li>Tracks click statistics in a local SQLite database.</li>
              <li><code>/admin</code> command to view statistics directly in Telegram.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
