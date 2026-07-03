// apps/web/src/lib/trackers.ts
import { prisma } from "@otaku-sync/db";

export async function getConnectedTrackers(userId: string) {
  const trackers = await prisma.trackerCredential.findMany({
    where: { userId },
  });
  return trackers;
}