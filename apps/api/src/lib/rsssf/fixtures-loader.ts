/**
 * T448b-2b FASE 1 — Loader de fixtures LOCAIS (apenas testes/scripts).
 * I/O de sistema de arquivos isolado AQUI; o núcleo do parser é puro.
 */
/* eslint-disable security/detect-non-literal-fs-filename -- loader local de fixtures (caminho parametrizado por design) */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ClubIndexEntry, CompetitionIndexEntry, FixtureFile } from './types.js';

/** Lê JSON tolerando BOM (arquivos gerados por ferramentas que emitem BOM). */
function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')) as T;
}

export function loadFixtures(dir: string): FixtureFile[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.fixture.json'))
    .sort()
    .map((f) => readJson<FixtureFile>(join(dir, f)));
}

export function loadJson<T>(path: string): T {
  return readJson<T>(path);
}

export function loadClubIndex(path: string): ClubIndexEntry[] {
  return loadJson<ClubIndexEntry[]>(path);
}

export function loadCompetitionIndex(path: string): CompetitionIndexEntry[] {
  return loadJson<CompetitionIndexEntry[]>(path);
}
