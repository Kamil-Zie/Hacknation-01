// DM-018 T-104 Role tags of account members (separate file so model mocks in tests do not hide them)
// owner = full rights, partner = edits + removes member/guest, member and guest = read only
export const MEMBER_ROLES = ['owner', 'partner', 'member', 'guest'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];
