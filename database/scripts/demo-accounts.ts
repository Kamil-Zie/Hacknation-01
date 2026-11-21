// T-DB-017 Demo accounts for the team through the public API (API-007/008, API-004, API-002, API-016, API-019, API-011, API-021)
// Usage: npm run demo-accounts -- [apiUrl] [--partners-only] --account dawid@test.pl:<password>:Dawid --account jan@test.pl:<password>:Jan
// Passwords come only from the command line, never from the repo. Re-running is safe: existing users log in,
// existing fields are kept, analyses are re-used from the cache.

type Json = Record<string, unknown>;

interface Plan {
  accountName: string;
  parcels: { id: string; crop: string }[];
  // Field = seed parcel + its real neighbours found in ULDK around the seed's bbox
  fields: { name: string; seed: string; crop: string; neighbours: number }[];
}

const DATE = '2026-06-10';
const GAP_MS = 6_500; // API-004 allows 10 analyses per minute per IP

// Real parcels from the tested backup list (docs/pitch/scenariusz.md), different regions, soils and crops
const PLANS: Record<string, Plan> = {
  dawid: {
    accountName: 'Gospodarstwo Dawida – Wielkopolska i Kujawy',
    parcels: [
      { id: '302504_5.0029.66', crop: 'winter_wheat' },
      { id: '040706_4.0004.15', crop: 'sugar_beet' },
      { id: '080906_5.0018.138/3', crop: 'spring_barley' },
      { id: '041906_5.0006.38/11', crop: 'potato' },
    ],
    fields: [
      { name: 'Pole pod Środą', seed: '302504_5.0029.66', crop: 'winter_wheat', neighbours: 2 },
      { name: 'Buraki w Kruszwicy', seed: '040706_4.0004.15', crop: 'sugar_beet', neighbours: 1 },
    ],
  },
  jan: {
    accountName: 'Gospodarstwo Jana – Lubelskie, Żuławy i Opolskie',
    parcels: [
      { id: '061409_2.0009.612', crop: 'winter_wheat' },
      { id: '061409_2.0009.613', crop: 'winter_wheat' },
      { id: '221002_4.0004.136', crop: 'winter_rapeseed' },
      { id: '161002_4.0241.261', crop: 'maize' },
    ],
    fields: [
      { name: 'Pole za stodołą', seed: '061409_2.0009.612', crop: 'winter_wheat', neighbours: 1 },
      { name: 'Kukurydza w Głogówku', seed: '161002_4.0241.261', crop: 'maize', neighbours: 2 },
    ],
  },
  // Parcels below were found with API-002 (by-point) on farmland, 2026-11-22 00:50
  nataniel: {
    accountName: 'Gospodarstwo Nataniela – Lubelszczyzna',
    parcels: [
      { id: '060404_2.0142.AR_3.255', crop: 'winter_wheat' },
      { id: '061811_2.0010.AR_1.87/1', crop: 'winter_rapeseed' },
      { id: '062014_2.0028.425', crop: 'sugar_beet' },
    ],
    fields: [
      {
        name: 'Pszenica w Brodzicy',
        seed: '060404_2.0142.AR_3.255',
        crop: 'winter_wheat',
        neighbours: 2,
      },
      {
        name: 'Rzepak w Majdanie Górnym',
        seed: '061811_2.0010.AR_1.87/1',
        crop: 'winter_rapeseed',
        neighbours: 1,
      },
    ],
  },
  kuba: {
    accountName: 'Gospodarstwo Kuby – Dolny Śląsk i Opolszczyzna',
    parcels: [
      { id: '022405_5.0005.294/4', crop: 'winter_wheat' },
      { id: '160705_5.0005.475/5', crop: 'maize' },
      { id: '160203_5.0011.904', crop: 'sugar_beet' },
      { id: '021704_5.0002.29', crop: 'potato' },
    ],
    fields: [
      { name: 'Kukurydza pod Nysą', seed: '160705_5.0005.475/5', crop: 'maize', neighbours: 1 },
      { name: 'Buraki w Grobnikach', seed: '160203_5.0011.904', crop: 'sugar_beet', neighbours: 2 },
    ],
  },
  kamil: {
    accountName: 'Gospodarstwo Kamila – Mazowsze i Kujawy',
    parcels: [
      { id: '040704_2.0015.4', crop: 'sugar_beet' },
      { id: '142807_2.0038.40', crop: 'winter_wheat' },
      { id: '140605_5.0028.4/4', crop: 'spring_barley' },
    ],
    fields: [
      { name: 'Pole w Jarontach', seed: '040704_2.0015.4', crop: 'sugar_beet', neighbours: 2 },
      {
        name: 'Pszenica w Antoniewie',
        seed: '142807_2.0038.40',
        crop: 'winter_wheat',
        neighbours: 1,
      },
    ],
  },
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(api: string, path: string, init: RequestInit = {}, token?: string) {
  const res = await fetch(`${api}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(90_000),
  });
  const body = (res.status === 204 ? {} : await res.json()) as Json;
  return { status: res.status, body };
}

async function session(
  api: string,
  email: string,
  password: string,
  name: string,
  accountName: string,
) {
  const reg = await call(api, '/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, accountName }),
  });
  const res =
    reg.status === 201 || reg.status === 200
      ? reg
      : await call(api, '/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
  if (res.status >= 300)
    throw new Error(`${email}: login HTTP ${res.status} ${String(res.body.code)}`);
  const accounts = res.body.accounts as { id: string; name: string }[];
  const own = accounts.find((a) => a.name === accountName) ?? accounts[0];
  if (!own) throw new Error(`${email}: no account`);
  return { token: res.body.token as string, accountId: own.id, created: reg.status < 300 };
}

// Real neighbours: ULDK parcels at points just outside the middle of each bbox side
async function neighbours(api: string, parcelId: string, wanted: number): Promise<string[]> {
  const parcel = await call(api, `/parcels/${encodeURIComponent(parcelId)}`);
  const [minLon, minLat, maxLon, maxLat] = parcel.body.bbox as number[];
  const midLon = (minLon + maxLon) / 2;
  const midLat = (minLat + maxLat) / 2;
  const d = 0.0004;
  const probes = [
    [midLat, maxLon + d],
    [midLat, minLon - d],
    [maxLat + d, midLon],
    [minLat - d, midLon],
  ];
  const found: string[] = [];
  for (const [lat, lon] of probes) {
    const hit = await call(api, `/parcels/by-point?lat=${lat}&lon=${lon}`);
    const id = hit.body.id as string | undefined;
    const area = Number(hit.body.areaHa ?? 0);
    // skip roads and slivers: a field parcel has at least 0.3 ha
    if (hit.status === 200 && id && id !== parcelId && !found.includes(id) && area >= 0.3)
      found.push(id);
    if (found.length >= wanted) break;
  }
  return found;
}

async function analyse(
  api: string,
  token: string,
  accountId: string,
  parcelId: string,
  cropCode: string,
) {
  const res = await call(
    api,
    '/analyses',
    { method: 'POST', body: JSON.stringify({ parcelId, cropCode, analysisDate: DATE, accountId }) },
    token,
  );
  await sleep(GAP_MS);
  const assessment = res.body.assessment as { droughtClass?: string } | undefined;
  return res.status < 300
    ? `${parcelId} ${assessment?.droughtClass}`
    : `${parcelId} HTTP ${res.status} ${String(res.body.code)}`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const api = (
    args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--account') ??
    'http://localhost:3000/api/v1'
  ).replace(/\/$/, '');
  const accounts = args
    .flatMap((a, i) => (args[i - 1] === '--account' ? [a] : []))
    .map((spec) => {
      const [email = '', password = '', name = ''] = spec.split(':');
      return { email, password, name, key: email.split('@')[0] ?? '' };
    });
  // --partners-only: skip analyses and fields, only (re)set partner access
  const partnersOnly = args.includes('--partners-only');
  if (accounts.length === 0) throw new Error('Give at least one --account email:password:name');

  const sessions: Record<
    string,
    { token: string; accountId: string; email: string; parcels: string[] }
  > = {};
  for (const acc of accounts) {
    const plan = PLANS[acc.key];
    if (!plan)
      throw new Error(`No demo plan for ${acc.key} (known: ${Object.keys(PLANS).join(', ')})`);
    const s = await session(api, acc.email, acc.password, acc.name, plan.accountName);
    console.log(
      `${acc.email}: ${s.created ? 'created' : 'logged in'}, account ${plan.accountName}`,
    );
    const parcelIds = plan.parcels.map((p) => p.id);
    if (partnersOnly) {
      sessions[acc.key] = {
        token: s.token,
        accountId: s.accountId,
        email: acc.email,
        parcels: parcelIds,
      };
      continue;
    }

    for (const p of plan.parcels)
      console.log('  analysis', await analyse(api, s.token, s.accountId, p.id, p.crop));

    const existing = await call(api, `/accounts/${s.accountId}/fields?pageSize=50`, {}, s.token);
    const names = ((existing.body.items as { name: string }[]) ?? []).map((f) => f.name);
    for (const field of plan.fields) {
      if (names.includes(field.name)) {
        console.log(`  field "${field.name}" exists`);
        continue;
      }
      const near = await neighbours(api, field.seed, field.neighbours);
      for (const id of near) {
        console.log('  analysis', await analyse(api, s.token, s.accountId, id, field.crop));
        parcelIds.push(id);
      }
      const createField = (ids: string[]) =>
        call(
          api,
          `/accounts/${s.accountId}/fields`,
          { method: 'POST', body: JSON.stringify({ name: field.name, parcelIds: ids }) },
          s.token,
        );
      let created = await createField([field.seed, ...near]);
      // Narrow strips: a bbox probe can hit a parcel that touches the seed's bbox but not the parcel.
      // Fall back to the seed with one neighbour at a time.
      for (const id of [...near]) {
        if (created.body.code !== 'PARCELS_NOT_ADJACENT') break;
        near.splice(0, near.length, id);
        created = await createField([field.seed, id]);
      }
      console.log(
        `  field "${field.name}" [${[field.seed, ...near].join(', ')}]: HTTP ${created.status} ${String(created.body.code ?? '')}`,
      );
      if (created.status < 300) {
        const report = await call(
          api,
          `/fields/${String(created.body.id)}/analyses`,
          { method: 'POST', body: JSON.stringify({ cropCode: field.crop, analysisDate: DATE }) },
          s.token,
        );
        const summary = report.body.summary as { droughtClass?: string } | undefined;
        console.log(
          `  field report: HTTP ${report.status} ${summary?.droughtClass ?? String(report.body.code)}`,
        );
        await sleep(GAP_MS * 2);
      }
    }
    sessions[acc.key] = {
      token: s.token,
      accountId: s.accountId,
      email: acc.email,
      parcels: parcelIds,
    };
  }

  // Partners: each demo user is a partner in the other farms with access to the parcels of the owner's smallest
  // field, so the partner sees one whole field (T-092: fields are shown only when every parcel is accessible)
  const keys = Object.keys(sessions);
  for (const owner of keys) {
    for (const partner of keys.filter((k) => k !== owner)) {
      const o = sessions[owner]!;
      const p = sessions[partner]!;
      const added = await call(
        api,
        `/accounts/${o.accountId}/members`,
        { method: 'POST', body: JSON.stringify({ email: p.email }) },
        o.token,
      );
      const members = await call(api, `/accounts/${o.accountId}/members?pageSize=100`, {}, o.token);
      const member = (members.body.items as { id: string; email: string }[]).find(
        (m) => m.email === p.email,
      );
      if (!member) continue;
      const fields = await call(api, `/accounts/${o.accountId}/fields?pageSize=50`, {}, o.token);
      const smallest = ((fields.body.items as { parcelIds: string[] }[]) ?? []).sort(
        (a, b) => a.parcelIds.length - b.parcelIds.length,
      )[0];
      const access = smallest ? smallest.parcelIds : o.parcels.slice(0, 2);
      const limited = await call(
        api,
        `/accounts/${o.accountId}/members/${member.id}`,
        { method: 'PATCH', body: JSON.stringify({ parcelIds: access }) },
        o.token,
      );
      console.log(
        `${p.email} in ${o.email}'s farm: add HTTP ${added.status}, access to ${access.length} parcels HTTP ${limited.status}`,
      );
    }
  }
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});

export {};
