const CACHE_TTL_MS = 30_000;

export interface EnrolledStudent {
  name: string;
  student_id: string;
  phone: string;
  tenant_id: string;
  photo: string | null;
  hasPhoto: boolean;
}

let cache: { data: EnrolledStudent[]; expires: number } | null = null;

export function getEnrolledCache() {
  return cache && cache.expires > Date.now() ? cache : null;
}

export function setEnrolledCache(data: EnrolledStudent[]) {
  cache = { data, expires: Date.now() + CACHE_TTL_MS };
}

export function invalidateEnrolledCache() {
  cache = null;
}
