import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@otaku-sync/db";

export async function GET() {
  try {
    const session = await auth();
    
    // STRICT GUARD: Stop execution if user is completely logged out
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Logged out. Please sign in to your account first." }, 
        { status: 401 }
      );
    }

    const credentials = await prisma.trackerCredential.findMany({
      where: { userId: session.user.id },
      select: {
        platform: true,
        trackerUsername: true,
      },
    });

    return NextResponse.json(credentials);
  } catch (error) {
    console.error("Failed to aggregate tracker state nodes:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}