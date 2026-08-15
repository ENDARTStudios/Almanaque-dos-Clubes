// Wikimedia Commons API connector
// https://commons.wikimedia.org/w/api.php — images for clubs, players, stadiums

export interface CommonsImage {
  title: string;
  url: string;
  thumbUrl: string;
  description?: string;
  attribution: string;
  license: string;
}

const PREFIX = '[Commons]';
const API_BASE = 'https://commons.wikimedia.org/w/api.php';

async function commonsApi(params: Record<string, string>): Promise<any> {
  const url = new URL(API_BASE);
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`${PREFIX} HTTP ${res.status}`);
      return null;
    }
    return res.json();
  } catch (err) {
    console.error(`${PREFIX} Commons API error:`, (err as Error).message);
    return null;
  }
}

function parseImageInfo(page: any): CommonsImage {
  const imageInfo = page.imageinfo?.[0] ?? {};
  const metadata = imageInfo.extmetadata ?? {};
  const artist =
    metadata.Artist?.value ??
    metadata.Credit?.value ??
    metadata.Attribution?.value ??
    'Desconhecido';
  const license = metadata.LicenseShortName?.value ?? metadata.Copyrighted?.value ?? 'Desconhecida';
  const description = metadata.ImageDescription?.value ?? metadata.ObjectName?.value;
  const url = imageInfo.url ?? imageInfo.descriptionurl ?? '';
  const thumbUrl = imageInfo.thumburl ?? url;

  return {
    title: page.title,
    url,
    thumbUrl,
    description,
    attribution: artist,
    license,
  };
}

async function searchCategoryImages(categoryName: string): Promise<CommonsImage[]> {
  const data = await commonsApi({
    generator: 'categorymembers',
    gcmtitle: `Category:${categoryName}`,
    gcmtype: 'file',
    gcmlimit: '10',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
  });

  if (!data?.query?.pages) {
    console.log(`${PREFIX} No images found in category: ${categoryName}`);
    return [];
  }

  const pages = Object.values(data.query.pages) as any[];
  const results = pages.map(parseImageInfo);

  console.log(`${PREFIX} Found ${results.length} images in category: ${categoryName}`);
  return results;
}

async function findCategoryBySearch(searchTerm: string): Promise<string | null> {
  const data = await commonsApi({
    list: 'search',
    srsearch: searchTerm,
    srnamespace: '14',
    srlimit: '5',
  });

  if (!data?.query?.search?.length) return null;

  for (const result of data.query.search) {
    const title = result.title as string;
    if (title.startsWith('Category:')) {
      return title.replace('Category:', '');
    }
  }

  return null;
}

export async function searchClubImages(clubName: string): Promise<CommonsImage[]> {
  const categoryName = await findCategoryBySearch(`${clubName} football club`);
  if (!categoryName) {
    console.log(`${PREFIX} No category found for club: ${clubName}`);
    return [];
  }
  return searchCategoryImages(categoryName);
}

export async function searchPlayerImages(playerName: string): Promise<CommonsImage[]> {
  const categoryName = await findCategoryBySearch(`${playerName} football player`);
  if (!categoryName) {
    console.log(`${PREFIX} No category found for player: ${playerName}`);
    return [];
  }
  return searchCategoryImages(categoryName);
}

export async function searchStadiumImages(stadiumName: string): Promise<CommonsImage[]> {
  const categoryName = await findCategoryBySearch(`${stadiumName} stadium`);
  if (!categoryName) {
    console.log(`${PREFIX} No category found for stadium: ${stadiumName}`);
    return [];
  }
  return searchCategoryImages(categoryName);
}

export async function getImageInfo(filename: string): Promise<CommonsImage | null> {
  const title = filename.startsWith('File:') ? filename : `File:${filename}`;

  const data = await commonsApi({
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
  });

  if (!data?.query?.pages) return null;

  const pages = Object.values(data.query.pages) as any[];
  const page = pages[0];

  if (!page || page.missing || page.invalid) {
    console.log(`${PREFIX} Image not found: ${filename}`);
    return null;
  }

  return parseImageInfo(page);
}
