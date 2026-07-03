import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@otaku-sync/db";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const history = await prisma.syncActivity.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10, // Keep the feed snappy by loading the 10 most recent changes
    });

    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ error: "Failed to pull history logs" }, { status: 500 });
  }
}