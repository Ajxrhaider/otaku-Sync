// apps/web/scripts/seed-mappings.ts
import { Pool } from "@neondatabase/serverless";

// Corrected CDN link that mirrors the latest stable release branch
const AOD_URL = "https://github.com/manami-project/anime-offline-database/releases/latest/download/anime-offline-database-minified.json";

interface AODEntry {
  title: string;
  picture: string;
  sources: string[];
}

async function main() {
  console.log("🚀 Initializing connection to Neon Database...");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("🌐 Downloading Manami Database directly from jsDelivr CDN...");
    const response = await fetch(AOD_URL);
    
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const animeList: AODEntry[] = data.data;

    console.log(`✨ Successfully parsed ${animeList.length} anime entries. Processing mappings...`);

    const values: any[] = [];

    for (const anime of animeList) {
      let mal_id = null, anilist_id = null, anidb_id = null, kitsu_id = null, simkl_id = null;

      anime.sources.forEach((url) => {
        if (url.includes("myanimelist.net/anime/")) mal_id = parseInt(url.split("/").pop() || "");
        if (url.includes("anilist.co/anime/")) anilist_id = parseInt(url.split("/").pop() || "");
        if (url.includes("anidb.net/anime/")) anidb_id = parseInt(url.split("/").pop() || "");
        if (url.includes("kitsu.io/anime/") || url.includes("kitsu.app/anime/")) kitsu_id = parseInt(url.split("/").pop() || "");
        if (url.includes("simkl.com/anime/")) simkl_id = parseInt(url.split("/").pop() || "");
      });

      // Filter out empty or duplicate single quote syntax broken lines
      if (mal_id || anilist_id || anidb_id) {
        values.push({
          title: anime.title.replace(/'/g, "''"), 
          picture: anime.picture,
          mal_id, anilist_id, anidb_id, kitsu_id, simkl_id
        });
      }
    }

    console.log(`📦 Found ${values.length} trackable entries. Bulk inserting into Neon...`);

    const BATCH_SIZE = 1000;
    for (let i = 0; i < values.length; i += BATCH_SIZE) {
      const batch = values.slice(i, i + BATCH_SIZE);
      
      const insertValues = batch.map(v => 
        `('${v.title}', '${v.picture}', ${v.mal_id}, ${v.anilist_id}, ${v.anidb_id}, ${v.kitsu_id}, ${v.simkl_id})`
      ).join(",");

      const query = `
        INSERT INTO anime_mappings (title, picture, mal_id, anilist_id, anidb_id, kitsu_id, simkl_id)
        VALUES ${insertValues}
        ON CONFLICT (mal_id) DO NOTHING;
      `;

      await pool.query(query);
      console.log(`✅ Seeded batch ${i / BATCH_SIZE + 1} of ${Math.ceil(values.length / BATCH_SIZE)}`);
    }

    console.log("🎉 All data loaded successfully! The core mapping index is warm.");
  } catch (err) {
    console.error("❌ Seeder script failed catastrophically:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();