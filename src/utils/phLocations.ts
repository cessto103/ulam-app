// Cascading region → city/municipality → barangay lookups, backed by static
// PSGC-derived data (bundled as JSON — no network round trip needed to pick
// an address). Data extracted from the `phil-reg-prov-mun-brgy` npm package
// (ISC licensed), not installed as a dependency since its JS wrapper pulls
// in axios + Node's `read-file` — neither works in React Native. We only
// need the plain JSON it ships internally.
//
// City/municipality names are NOT globally unique (many are reused across
// provinces), so every lookup after "region" is keyed by the PSGC code, not
// the name, to avoid picking the wrong branch of the tree. Only names are
// ever shown in the UI.

import regionsData from '../data/ph/regions.json';
import provincesData from '../data/ph/provinces.json';
import citiesData from '../data/ph/cities.json';
import barangaysData from '../data/ph/barangays.json';

type RegionRow = { name: string; reg_code: string };
type ProvinceRow = { name: string; reg_code: string; prov_code: string };
type CityRow = { name: string; prov_code: string; mun_code: string };
type BarangayRow = { name: string; mun_code: string };

const regions = regionsData as RegionRow[];
const provinces = provincesData as ProvinceRow[];
const cities = citiesData as CityRow[];
const barangays = barangaysData as BarangayRow[];

export type PhCity = {
  /** Plain city name — what actually gets stored/submitted. */
  name: string;
  /** Display label for the picker list only. Same as `name`, unless another
   * city in this same region shares that name (genuinely common — e.g.
   * "BURGOS" appears 4 times within Region I alone, in different provinces)
   * in which case the province is appended so the two are distinguishable
   * and don't collide as React list keys. Never store/submit this — store
   * `name`. */
  label: string;
  code: string;
  /** null for Metro Manila — PSGC models it as 4 numbered "districts"
   * instead of real provinces, which isn't a name worth showing/storing. */
  province: string | null;
};

export function getPhRegions(): string[] {
  return regions.map((r) => r.name);
}

export function getPhCitiesForRegion(regionName: string): PhCity[] {
  const region = regions.find((r) => r.name === regionName);
  if (!region) return [];

  const provCodes = new Set(provinces.filter((p) => p.reg_code === region.reg_code).map((p) => p.prov_code));

  const matches = cities
    .filter((c) => provCodes.has(c.prov_code))
    .map((c) => {
      const province = provinces.find((p) => p.prov_code === c.prov_code);
      const isNcr = province?.name.startsWith('NCR') ?? false;
      return { name: c.name, code: c.mun_code, province: isNcr ? null : (province?.name ?? null) };
    });

  const nameCounts = new Map<string, number>();
  for (const m of matches) nameCounts.set(m.name, (nameCounts.get(m.name) ?? 0) + 1);

  return matches
    .map((m) => ({
      ...m,
      label: (nameCounts.get(m.name) ?? 0) > 1 && m.province ? `${m.name} (${m.province})` : m.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** `cityCode` is a city's `code` (PSGC mun_code) from getPhCitiesForRegion — not its name. */
export function getPhBarangaysForCity(cityCode: string): string[] {
  return barangays
    .filter((b) => b.mun_code === cityCode)
    .map((b) => b.name)
    .sort((a, b) => a.localeCompare(b));
}
