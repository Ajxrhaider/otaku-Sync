import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@otaku-sync/db"; // Adjust if your import path is different

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("mal_oauth_state")?.value;
  const codeVerifier = cookieStore.get("mal_oauth_verifier")?.value;

  // --- DEBUGGING LOG: This will print in your terminal so we know what failed ---
  console.log("MAL OAUTH HANDSHAKE CHECK:", { 
    hasCode: !!code, 
    urlState: state, 
    cookieState: savedState, 
    hasVerifier: !!codeVerifier 
  });

  // Validate integrity of the handoff BEFORE deleting cookies
  if (!code || !state || state !== savedState || !codeVerifier) {
    return NextResponse.json(
      { error: "OAuth flow interrupted: token verification or state validation failed." },
      { status: 400 }
    );
  }

  // If we pass the check, NOW it is safe to delete them
  cookieStore.delete("mal_oauth_state");
  cookieStore.delete("mal_oauth_verifier");

  // Ensure active local developer/user identity context exists
  const session = await auth();
  
  // ... (The rest of your token exchange code remains exactly the same below this)
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Active user identity required to connect synchronization profiles." },
      { status: 401 }
    );
  }

  const clientId = process.env.MAL_CLIENT_ID;
  const clientSecret = process.env.MAL_CLIENT_SECRET;
  const redirectUri = process.env.MAL_REDIRECT_URI;

  try {
    // Exchange Authorization Code for the API Tokens
    const tokenResponse = await fetch("https://myanimelist.net/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret || "", // Required for web applications on MAL
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier, // Matches code_challenge exactly
        redirect_uri: redirectUri!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorPayload = await tokenResponse.text();
      console.error("MAL OAuth Core Node Error:", errorPayload);
      return NextResponse.json({ error: "Failed token negotiation with MAL target router." }, { status: 502 });
    }

    const tokens = await tokenResponse.json();

    // Query profile information to attach a readable human username handle
    const identityResponse = await fetch("https://api.myanimelist.net/v2/users/@me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!identityResponse.ok) {
      return NextResponse.json({ error: "Failed to map user profile context from remote tracker resource." }, { status: 502 });
    }

    const malUserData = await identityResponse.json();

    // Upsert into your system database tracking mapping between local user and their MAL credentials
    
  await prisma.trackerCredential.upsert({
    where: {
      userId_platform: {
        userId: session.user.id,
        platform: "myanimelist",
      },
    },
    update: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      trackerUsername: malUserData.name,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000), // Fixed to snake_case
    },
    create: {
      userId: session.user.id,
      platform: "myanimelist",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      trackerUsername: malUserData.name,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000), // Fixed to snake_case
    },
  });

    // Everything is successfully wired, send back to central hub dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Fatal error inside connection loop:", error);
    return NextResponse.json({ error: "Internal runtime process exception during credentials binding." }, { status: 500 });
  }
}