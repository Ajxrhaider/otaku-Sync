import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Pool } from "@neondatabase/serverless";
import { TestSyncButton } from "./test-button";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getConnectedTrackers(userId: string) {
  const result = await pool.query(
    'SELECT platform, username FROM tracker_credentials WHERE "userId" = $1',
    [userId]
  );
  return result.rows;
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const trackers = await getConnectedTrackers(session.user?.id as string);
  const isAniListConnected = trackers.some((t) => t.platform === "anilist");
  const aniListUsername = trackers.find((t) => t.platform === "anilist")?.username;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center border-b border-gray-800 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Otaku Sync Dashboard</h1>
            <p className="text-gray-400 mt-1">Logged in as {session.user?.name}</p>
          </div>
          {session.user?.image && (
            <img 
              src={session.user.image} 
              alt="Avatar" 
              className="w-12 h-12 rounded-full border border-gray-700 shadow-sm" 
            />
          )}
        </header>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl shadow-black/20">
          <h2 className="text-xl font-semibold mb-4 text-gray-200">Linked Trackers</h2>
          <p className="text-sm text-gray-400 mb-6">
            Connect your services to synchronize your streaming and reading history across platforms automatically.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AniList Integration Block */}
            <div className="flex items-center justify-between p-4 bg-gray-950 border border-gray-800 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-md">
                  AL
                </div>
                <div>
                  <h3 className="font-medium text-gray-200">AniList</h3>
                  <p className="text-sm text-gray-400">
                    {isAniListConnected ? `Connected as ${aniListUsername}` : "Not Connected"}
                  </p>
                </div>
              </div>
              
              {isAniListConnected ? (
                <span className="text-xs font-bold text-green-400 bg-green-950 border border-green-800 px-3 py-1.5 rounded-full">
                  Active
                </span>
              ) : (
                <a 
                  href="/api/connect/anilist" 
                  className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg transition-colors shadow-md"
                >
                  Connect
                </a>
              )}
            </div>

            {/* MyAnimeList (MAL) Placeholder */}
            <div className="flex items-center justify-between p-4 bg-gray-950 border border-gray-800 opacity-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center font-bold text-white">
                  MAL
                </div>
                <div>
                  <h3 className="font-medium text-gray-200">MyAnimeList</h3>
                  <p className="text-sm text-gray-400">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* Render the Webhook Tester if AniList is connected */}
          <TestSyncButton isConnected={isAniListConnected} />

        </section>
      </div>
    </div>
  );
}