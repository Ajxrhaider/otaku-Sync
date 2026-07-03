import { prisma } from "@otaku-sync/db";

interface LookupQuery {
  titleRomaji: string;
  titleEnglish?: string;
  anilistId?: number;
  malId?: number;
}

export async function findOrCreateAnimeMapping(query: LookupQuery) {
  // 1. Try to locate an existing translation node by direct structural platform IDs
  if (query.anilistId) {
    const match = await prisma.animeMapping.findUnique({ where: { anilistId: query.anilistId } });
    if (match) return match;
  }

  if (query.malId) {
    const match = await prisma.animeMapping.findUnique({ where: { malId: query.malId } });
    if (match) return match;
  }

  // 2. Fallback: Query indexed text names across Romaji or English fields
  const textMatch = await prisma.animeMapping.findFirst({
    where: {
      OR: [
        { titleRomaji: { equals: query.titleRomaji, mode: "insensitive" } },
        ...(query.titleEnglish ? [{ titleEnglish: { equals: query.titleEnglish, mode: "insensitive" } }] : []),
      ],
    },
  });

  if (textMatch) {
    // Dynamically update the entry if missing an ID we now possess
    const updates: any = {};
    if (query.anilistId && !textMatch.anilistId) updates.anilistId = query.anilistId;
    if (query.malId && !textMatch.malId) updates.malId = query.malId;

    if (Object.keys(updates).length > 0) {
      return await prisma.animeMapping.update({
        where: { id: textMatch.id },
        data: updates,
      });
    }
    return textMatch;
  }

  // 3. Fallback 2: Record doesn't exist anywhere yet. Register it as a new master record node.
  console.log(`[Mapping System] Creating new master mapping node for: ${query.titleRomaji}`);
  return await prisma.animeMapping.create({
    data: {
      titleRomaji: query.titleRomaji,
      titleEnglish: query.titleEnglish || null,
      anilistId: query.anilistId || null,
      malId: query.malId || null,
    },
  });
}