import { createWorker } from '../../api/src/services/queue.js';
import {
  fetchWikidataClubs,
  fetchWikidataPlayers,
  fetchWikidataCompetitions,
  fetchWikidataStadiums,
} from './jobs/wikidata-connector.js';
import { fetchRsssfClubs, fetchRsssfCompetitions } from './jobs/rsssf-connector.js';
import { fetchFbrefClubs, fetchFbrefMatches } from './jobs/fbref-connector.js';
import {
  fetchFootballDataTeams,
  fetchFootballDataMatches,
} from './jobs/football-data-connector.js';
import { fetchStadiumsByCountry } from './jobs/openstreetmap-connector.js';
import { searchClubImages } from './jobs/wikimedia-commons-connector.js';
import { fetchSportsDbBrazilianTeams } from './jobs/thesportsdb-connector.js';
import {
  upsertClubFromWikidata,
  upsertPlayerFromWikidata,
  upsertCompetitionFromWikidata,
  upsertStadiumFromWikidata,
} from './jobs/entity-resolver.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

createWorker('etl', async (job) => {
  const { source, entity } = job.data as { source: string; entity?: string };

  console.log(`\n[ETL Worker] Starting ingest: source=${source} entity=${entity ?? 'all'}`);

  try {
    switch (source) {
      case 'wikidata':
        await ingestWikidata(entity);
        break;
      case 'rsssf':
        await ingestRsssf();
        break;
      case 'fbref':
        await ingestFbref();
        break;
      case 'football-data':
        await ingestFootballData();
        break;
      case 'openstreetmap':
        await ingestOpenStreetMap();
        break;
      case 'wikimedia-commons':
        await ingestWikimediaCommons();
        break;
      case 'thesportsdb':
        await ingestTheSportsDb();
        break;
      case 'full-sync':
        await ingestFullSync();
        break;
      default:
        console.warn(`[ETL Worker] Unknown source: ${source}`);
    }
  } catch (err) {
    console.error(`[ETL Worker] Failed: source=${source}`, err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
});

async function ingestWikidata(entity?: string) {
  if (!entity || entity === 'clubs') {
    console.log('[ETL] Wikidata → clubs');
    const clubs = await fetchWikidataClubs('BR');
    for (const c of clubs) {
      try {
        await upsertClubFromWikidata(prisma, c);
      } catch (e) {
        console.error(`[ETL] Club ${c.qid} failed:`, e);
      }
    }
    console.log(`[ETL] Wikidata clubs: ${clubs.length} processed`);
  }

  if (!entity || entity === 'players') {
    console.log('[ETL] Wikidata → players');
    const players = await fetchWikidataPlayers();
    for (const p of players) {
      try {
        await upsertPlayerFromWikidata(prisma, p);
      } catch (e) {
        console.error(`[ETL] Player ${p.qid} failed:`, e);
      }
    }
    console.log(`[ETL] Wikidata players: ${players.length} processed`);
  }

  if (!entity || entity === 'competitions') {
    console.log('[ETL] Wikidata → competitions');
    const comps = await fetchWikidataCompetitions();
    for (const c of comps) {
      try {
        await upsertCompetitionFromWikidata(prisma, c);
      } catch (e) {
        console.error(`[ETL] Competition ${c.qid} failed:`, e);
      }
    }
    console.log(`[ETL] Wikidata competitions: ${comps.length} processed`);
  }

  if (!entity || entity === 'stadiums') {
    console.log('[ETL] Wikidata → stadiums');
    const stadiums = await fetchWikidataStadiums('BR');
    for (const s of stadiums) {
      try {
        await upsertStadiumFromWikidata(prisma, s);
      } catch (e) {
        console.error(`[ETL] Stadium ${s.qid} failed:`, e);
      }
    }
    console.log(`[ETL] Wikidata stadiums: ${stadiums.length} processed`);
  }
}

async function ingestRsssf() {
  console.log('[ETL] RSSSF → clubs + competitions');
  const clubs = await fetchRsssfClubs('brazil');
  console.log(`[ETL] RSSSF clubs: ${clubs.length} found (manual review needed)`);

  const comps = await fetchRsssfCompetitions('brazil');
  console.log(`[ETL] RSSSF competitions: ${comps.length} found`);
}

async function ingestFbref() {
  console.log('[ETL] FBref → clubs + matches');
  const clubs = await fetchFbrefClubs('Brasileirão Série A');
  console.log(`[ETL] FBref clubs: ${clubs.length} found`);

  const matches = await fetchFbrefMatches('Brasileirão Série A', '2025');
  console.log(`[ETL] FBref matches: ${matches.length} found`);
}

async function ingestFootballData() {
  console.log('[ETL] Football-Data.org → teams + matches');
  const teams = await fetchFootballDataTeams('BSA');
  console.log(`[ETL] Football-Data teams: ${teams.length} found`);

  const matches = await fetchFootballDataMatches('BSA', '2025');
  console.log(`[ETL] Football-Data matches: ${matches.length} found`);
}

async function ingestOpenStreetMap() {
  console.log('[ETL] OpenStreetMap → stadiums');
  const stadiums = await fetchStadiumsByCountry('Brazil');
  console.log(`[ETL] OSM stadiums: ${stadiums.length} found`);
}

async function ingestWikimediaCommons() {
  console.log('[ETL] Wikimedia Commons → images (sample)');
  const sampleClubs = ['Flamengo', 'Palmeiras', 'Santos', 'Corinthians', 'São Paulo'];
  for (const clubName of sampleClubs) {
    const images = await searchClubImages(clubName);
    console.log(`[ETL] Commons images for ${clubName}: ${images.length} found`);
  }
}

async function ingestTheSportsDb() {
  console.log('[ETL] TheSportsDB → teams');
  const teams = await fetchSportsDbBrazilianTeams();
  console.log(`[ETL] SportsDB teams: ${teams.length} found`);
}

async function ingestFullSync() {
  console.log('[ETL] Starting FULL SYNC — all sources, all entities');
  await ingestWikidata();
  await ingestRsssf();
  await ingestFbref();
  await ingestFootballData();
  await ingestOpenStreetMap();
  await ingestTheSportsDb();
  console.log('[ETL] FULL SYNC completed');
}

console.log('ETL Worker iniciado. Aguardando jobs...');
