import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Helper for CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle browser pre-flight requests (Required for browser extensions)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    // Auth Check
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { sourcePlatform, sourceId, episode } = body;

    // Validate Input
    if (!sourcePlatform || !sourceId || typeof episode !== 'number') {
      return NextResponse.json(
        { error: "Missing required fields" }, 
        { status: 400, headers: corsHeaders }
      );
    }

    const platformColumn = `${sourcePlatform}_id`; 
    
    const mappingResult = await pool.query(
      `SELECT anilist_id FROM anime_mappings WHERE ${platformColumn} = $1 LIMIT 1`,
      [sourceId]
    );

    if (mappingResult.rows.length === 0 || !mappingResult.rows[0].anilist_id) {
      return NextResponse.json(
        { error: "Anime not found in mapping database" }, 
        { status: 404, headers: corsHeaders }
      );
    }

    const anilistId = mappingResult.rows[0].anilist_id;

    // Get Token
    const tokenResult = await pool.query(
      `SELECT access_token FROM tracker_credentials WHERE "userId" = $1 AND platform = 'anilist'`,
      [session.user.id]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { error: "AniList account not connected" }, 
        { status: 403, headers: corsHeaders }
      );
    }

    const accessToken = tokenResult.rows[0].access_token;

    // GraphQL Mutation
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
        variables: { mediaId: anilistId, progress: episode, status: "CURRENT" }
      }),
    });

    const anilistData = await anilistResponse.json();

    return NextResponse.json(
      { success: true, data: anilistData.data }, 
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message }, 
      { status: 500, headers: corsHeaders }
    );
  }
}