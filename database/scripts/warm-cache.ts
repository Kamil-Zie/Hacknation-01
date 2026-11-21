// T-035 Warm the source cache: POST /analyses (API-004) for the demo and backup parcels, twice (cold and warm time)
// Usage: npm run warm-cache -- [apiUrl] [--once]   (default http://localhost:3000/api/v1)
// Only calls the public API: reports and source_cache are written by the backend, nothing else is touched.

const PARCELS: { parcelId: string; cropCode: string; analysisDate: string; label: string }[] = [
  {
    parcelId: '061409_2.0009.612',
    cropCode: 'winter_wheat',
    analysisDate: '2026-05-25',
    label: 'Bronowice (demo)',
  },
  {
    parcelId: '302504_5.0029.66',
    cropCode: 'winter_wheat',
    analysisDate: '2026-06-10',
    label: 'Środa Wlkp.',
  },
  {
    parcelId: '302504_5.0029.66',
    cropCode: 'winter_wheat',
    analysisDate: '2023-07-20',
    label: 'Środa Wlkp. (IUNG susza, T-063)',
  },
  {
    parcelId: '040706_4.0004.15',
    cropCode: 'sugar_beet',
    analysisDate: '2026-06-10',
    label: 'Kruszwica',
  },
  {
    parcelId: '040706_4.0004.15',
    cropCode: 'sugar_beet',
    analysisDate: '2024-05-31',
    label: 'Kruszwica (bez suszy, T-063)',
  },
  {
    parcelId: '221002_4.0004.136',
    cropCode: 'winter_rapeseed',
    analysisDate: '2026-06-10',
    label: 'Nowy Dwór Gdański',
  },
  {
    parcelId: '080906_5.0018.138/3',
    cropCode: 'spring_barley',
    analysisDate: '2026-06-10',
    label: 'Sulechów',
  },
  {
    parcelId: '161002_4.0241.261',
    cropCode: 'maize',
    analysisDate: '2026-06-10',
    label: 'Głogówek',
  },
];

const TIMEOUT_MS = 60_000;
// The API allows 10 analyses per minute per IP (T-066), so keep a gap between calls
const GAP_MS = 6_500;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function analyse(api: string, body: (typeof PARCELS)[number]) {
  const started = Date.now();
  try {
    const res = await fetch(`${api}/analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parcelId: body.parcelId,
        cropCode: body.cropCode,
        analysisDate: body.analysisDate,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = (await res.json()) as {
      id?: string;
      code?: string;
      status?: string;
      assessment?: { droughtClass?: string };
    };
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    return res.ok
      ? `${seconds} s ${json.status} ${json.assessment?.droughtClass ?? '?'} id=${json.id}`
      : `${seconds} s HTTP ${res.status} ${json.code ?? ''}`;
  } catch (error) {
    return `${((Date.now() - started) / 1000).toFixed(1)} s ERROR ${(error as Error).name}`;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const api = (args.find((arg) => !arg.startsWith('--')) ?? 'http://localhost:3000/api/v1').replace(
    /\/$/,
    '',
  );
  const rounds = args.includes('--once') ? 1 : 2;
  console.log(`warm-cache on ${api}, ${PARCELS.length} analyses x ${rounds}`);
  for (const parcel of PARCELS) {
    const results: string[] = [];
    for (let round = 0; round < rounds; round += 1) {
      results.push(await analyse(api, parcel));
      await sleep(GAP_MS);
    }
    console.log(
      `${parcel.label.padEnd(32)} ${parcel.parcelId.padEnd(22)} ${parcel.analysisDate} | ${results.join(' | ')}`,
    );
  }
}

void main();
