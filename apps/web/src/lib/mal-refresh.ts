import { prisma } from "@otaku-sync/db";

export async function getValidMalToken(userId: string): Promise<string | null> {
  const credential = await prisma.trackerCredential.findUnique({
    where: {
      userId_platform: {
        userId,
        platform: "myanimelist",
      },
    },
  });

  if (!credential) return null;

  // Add a 5-minute buffer window to handle unexpected execution delays
  const isExpired = new Date(Date.now() + 5 * 60 * 1000) >= new Date(credential.expires_at);

  if (!isExpired) {
    return credential.access_token;
  }

  console.log(`[Sync Engine] MAL Token expired for user ${userId}. Initiating automatic rotation...`);

  try {
    const response = await fetch("https://myanimelist.net/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.MAL_CLIENT_ID!,
        client_secret: process.env.MAL_CLIENT_SECRET || "",
        grant_type: "refresh_token",
        refresh_token: credential.refresh_token,
      }),
    });

    if (!response.ok) {
      throw new Error(`MAL token rotation rejected with status code: ${response.status}`);
    }

    const data = await response.json();

    const updated = await prisma.trackerCredential.update({
      where: {
        userId_platform: {
          userId,
          platform: "myanimelist",
        },
      },
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: new Date(Date.now() + data.expires_in * 1000),
      },
    });

    return updated.access_token;
  } catch (error) {
    console.error(`[Sync Engine Fail] Automatic token rotation collapsed:`, error);
    return null;
  }
}