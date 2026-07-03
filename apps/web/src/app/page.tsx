// apps/web/src/app/page.tsx
import { signIn, auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()

  // If the user is already logged in, automatically push them to the dashboard
  if (session) {
    redirect("/dashboard")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-gray-100 p-4">
      <div className="text-center max-w-md bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-xl">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-400 bg-clip-text text-transparent mb-2">
          Otaku Sync
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Synchronize your anime watching and manga reading progress across every platform seamlessly.
        </p>
        
        <form action={async () => {
          "use server"
          await signIn("google")
        }}>
          <button className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-900/30">
            <span>Sign in with Google</span>
          </button>
        </form>
      </div>
    </main>
  )
}