// API-020 API-021 API-022 DM-026 Mock of account parcels with their latest report, and per-parcel member access
import type { DroughtClass, Member, ParcelOverview } from '@/api/types';
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

export async function mockGetAccountParcels(
  accountId: string,
  token: string,
): Promise<ParcelOverview[]> {
  await mockDelay();
  requireAccount(accountId, token);
  return MOCK_PARCELS.map((p, index) => buildOverview(p, index));
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

// API-022: every mock parcel is already on the account, so adding returns its overview (unknown id = 404)
export async function mockAddAccountParcel(
  accountId: string,
  parcelId: string,
  token: string,
): Promise<ParcelOverview> {
  await mockDelay();
  requireAccount(accountId, token);
  const index = MOCK_PARCELS.findIndex((p) => p.id === parcelId);
  if (index < 0) throw new Error('PARCEL_NOT_FOUND');
  return buildOverview(MOCK_PARCELS[index]!, index);
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
