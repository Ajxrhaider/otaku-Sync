import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.ANILIST_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/anilist/callback`;
  
  // AniList uses standard OAuth2 authorization URL code grant code
  const anilistAuthUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

  return NextResponse.redirect(anilistAuthUrl);
}