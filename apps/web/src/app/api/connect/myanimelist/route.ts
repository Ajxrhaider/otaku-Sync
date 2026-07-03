import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const clientId = process.env.MAL_CLIENT_ID;
  const redirectUri = process.env.MAL_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Configuration block missing core MAL system variables." },
      { status: 500 }
    );
  }

  // Generate unique high-entropy strings for OAuth cross-verification
  const state = crypto.randomBytes(32).toString("hex");
  const codeVerifier = crypto.randomBytes(50).toString("hex"); // Safely generates 100 characters

  // Construct target gateway URL
  const authorizationUrl = new URL("https://myanimelist.net/v1/oauth2/authorize");
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("code_challenge", codeVerifier);
  authorizationUrl.searchParams.set("code_challenge_method", "plain");

  // CRITICAL FIX: Create the redirect response object FIRST
  const response = NextResponse.redirect(authorizationUrl.toString());

  const isProd = process.env.NODE_ENV === "production";

  // Attach cookies directly to the outgoing response headers
  response.cookies.set("mal_oauth_state", state, {
    httpOnly: true,
    secure: isProd,
    path: "/",
    maxAge: 60 * 10, // 10 minutes
    sameSite: "lax",
  });

  response.cookies.set("mal_oauth_verifier", codeVerifier, {
    httpOnly: true,
    secure: isProd,
    path: "/",
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  return response;
}