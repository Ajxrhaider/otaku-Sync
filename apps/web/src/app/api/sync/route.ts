import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // e.g., sourcePlatform: 'mal', sourceId: 16498, episode: 5
    const body = await request.json();
    const { sourcePlatform, sourceId, episode, status = "CURRENT" } = body;

    if (!sourcePlatform || !sourceId || typeof episode !== 'number') {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Map the source ID to the AniList ID
    // Note: In production, validate sourcePlatform to prevent SQL injection. 
    // We expect 'mal', 'anidb', 'kitsu', etc.
    const platformColumn = `${sourcePlatform}_id`; 
    
    const mappingResult = await pool.query(
      `SELECT anilist_id FROM anime_mappings WHERE ${platformColumn} = $1 LIMIT 1`,
      [sourceId]
    );

    if (mappingResult.rows.length === 0 || !mappingResult.rows[0].anilist_id) {
      return NextResponse.json({ error: "Anime not found in mapping database" }, { status: 404 });
    }

    const anilistId = mappingResult.rows[0].anilist_id;

    // 2. Get the user's AniList Access Token
    const tokenResult = await pool.query(
      `SELECT access_token FROM tracker_credentials WHERE "userId" = $1 AND platform = 'anilist'`,
      [session.user.id]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json({ error: "AniList account not connected" }, { status: 403 });
    }

    const accessToken = tokenResult.rows[0].access_token;

    // 3. Mutate AniList via GraphQL
    const anilistMutation = `
      mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus) {
        SaveMediaListEntry (mediaId: $mediaId, progress: $progress, status: $status) {
          id
          status
          progress
        }
      }
    `;

    const anilistResponse = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: anilistMutation,
        variables: {
          mediaId: anilistId,
          progress: episode,
          status: status
        }
      }),
    });

    const anilistData = await anilistResponse.json();

    if (anilistData.errors) {
      throw new Error(anilistData.errors[0].message);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Synced to AniList", 
      data: anilistData.data.SaveMediaListEntry 
    });

  } catch (error: any) {
    console.error("Sync Webhook Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}