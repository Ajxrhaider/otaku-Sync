import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(request: NextRequest) {
  const session = await auth();
  
  // Guard clause: Make sure the user is logged into Otaku Sync first
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No authorization code returned from AniList" }, { status: 400 });
  }

  try {
    // 1. Exchange the temporary code for a permanent Access Token
    const tokenResponse = await fetch("https://anilist.co/api/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: process.env.ANILIST_CLIENT_ID,
        client_secret: process.env.ANILIST_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/anilist/callback`,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || "Failed to exchange token");
    }

    const accessToken = tokenData.access_token;

    // 2. Query AniList's GraphQL API to find out who this token belongs to (username)
    const viewerQuery = `
      query {
        Viewer {
          name
        }
      }
    `;

    const userResponse = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query: viewerQuery }),
    });

    const userData = await userResponse.json();
    const anilistUsername = userData.data?.Viewer?.name || "Unknown User";

    // 3. Save the tokens to Neon Database linked to our user ID
    await pool.query(`
      INSERT INTO tracker_credentials ("userId", platform, access_token, username)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT ("userId", platform) 
      DO UPDATE SET access_token = $3, username = $4;
    `, [session.user.id, "anilist", accessToken, anilistUsername]);

    // 4. Send them back to the user dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?connected=anilist`);

  } catch (error: any) {
    console.error("AniList connection error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}