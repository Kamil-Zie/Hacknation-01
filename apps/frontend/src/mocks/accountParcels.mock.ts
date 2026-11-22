// API-020 API-021 API-022 DM-026 (T-104 role tags) Mock of account parcels with their latest report, and per-parcel member access
import type { DroughtClass, Member, MemberRole, ParcelOverview } from '@/api/types';
import { mockDelay, requireAccount, saveStore } from '@/mocks/auth.mock';
import { MOCK_PARCELS } from '@/mocks/parcels.mock';

// Fixed demo values per mock parcel: crop and drought class of the latest report
const DEMO: Record<string, { crop: { code: string; name: string }; droughtClass: DroughtClass }> = {
  '061409_2.0009.612': {
    crop: { code: 'winter_wheat', name: 'Pszenica ozima' },
    droughtClass: 'severe',
  },
  '061409_2.0009.613': { crop: { code: 'maize', name: 'Kukurydza' }, droughtClass: 'moderate' },
  '061401_1.0001.691/9': { crop: { code: 'rapeseed', name: 'Rzepak ozimy' }, droughtClass: 'none' },
};

// T-102 the seeded demo account has every mock parcel with a report; a new account starts empty
// and gets parcels (without a report) through API-022, so the empty states of a fresh account show
const DEMO_ACCOUNT_ID = 'a_kowalscy';
const ADDED_KEY = 'kropelka.mock.account-parcels.v1';

function loadAdded(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(ADDED_KEY) ?? '{}') as Record<string, string[]>;
  } catch {
    return {};
  }
}

function accountOverviews(accountId: string): ParcelOverview[] {
  if (accountId === DEMO_ACCOUNT_ID) return MOCK_PARCELS.map((p, index) => buildOverview(p, index));
  const added = loadAdded()[accountId] ?? [];
  return MOCK_PARCELS.flatMap((p, index) =>
    added.includes(p.id) ? [{ ...buildOverview(p, index), lastReport: null, atRisk: false }] : [],
  );
}

export async function mockGetAccountParcels(
  accountId: string,
  token: string,
): Promise<ParcelOverview[]> {
  await mockDelay();
  requireAccount(accountId, token);
  return accountOverviews(accountId);
}

function buildOverview(p: (typeof MOCK_PARCELS)[number], index: number): ParcelOverview {
  const demo = DEMO[p.id];
  const lastReport = demo
    ? {
        id: `mock_report_${index + 1}`,
        analysisDate: '2026-05-25',
        crop: demo.crop,
        status: 'complete' as const,
        droughtClass: demo.droughtClass,
        createdAt: '2026-11-21T20:00:00.000Z',
      }
    : null;
  return {
    parcel: {
      id: p.id,
      parcelNumber: p.parcelNumber,
      region: p.region,
      commune: p.commune,
      county: p.county,
      voivodeship: p.voivodeship,
      areaHa: p.areaHa,
      centroid: p.centroid,
      bbox: p.bbox,
      geometry: p.geometry,
    },
    lastReport,
    atRisk: demo ? demo.droughtClass === 'moderate' || demo.droughtClass === 'severe' : false,
    fieldIds: [],
  };
}

// API-022: adds a mock parcel to the account (idempotent; unknown id = 404)
export async function mockAddAccountParcel(
  accountId: string,
  parcelId: string,
  token: string,
): Promise<ParcelOverview> {
  await mockDelay();
  requireAccount(accountId, token);
  const index = MOCK_PARCELS.findIndex((p) => p.id === parcelId);
  if (index < 0) throw new Error('PARCEL_NOT_FOUND');
  if (accountId !== DEMO_ACCOUNT_ID) {
    const added = loadAdded();
    const list = added[accountId] ?? [];
    if (!list.includes(parcelId)) added[accountId] = [...list, parcelId];
    try {
      localStorage.setItem(ADDED_KEY, JSON.stringify(added));
    } catch {
      // Persistence is best-effort in the mock
    }
  }
  return accountOverviews(accountId).find((item) => item.parcel.id === parcelId)!;
}

export async function mockUpdateMemberParcels(
  accountId: string,
  memberId: string,
  parcelIds: string[] | null,
  token: string,
): Promise<Member> {
  await mockDelay();
  const member = requireAccount(accountId, token).members.find((m) => m.id === memberId);
  if (!member) throw new Error('MEMBER_NOT_FOUND');
  member.parcelIds = parcelIds;
  saveStore();
  return { ...member };
}

// T-104 the first member is the creator: always owner, its tag cannot change
export async function mockUpdateMemberRole(
  accountId: string,
  memberId: string,
  role: MemberRole,
  token: string,
): Promise<Member> {
  await mockDelay();
  const members = requireAccount(accountId, token).members;
  const member = members.find((m) => m.id === memberId);
  if (!member) throw new Error('MEMBER_NOT_FOUND');
  if (members[0]?.id === memberId) throw new Error('CANNOT_CHANGE_CREATOR');
  member.role = role;
  saveStore();
  return { ...member };
}
