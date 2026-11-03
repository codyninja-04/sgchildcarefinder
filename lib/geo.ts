// Distance and Singapore location helpers.
//
// Exact coordinates come from OneMap (see lib/onemap.ts). When OneMap is down or a
// postal code is new, the first two digits of a Singapore postal code still put you
// in the right neighbourhood, which is good enough to sort centres by distance.

const EARTH_RADIUS_KM = 6371

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Straight line distance in kilometres. Fine for a city 50km across. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m away`
  return `${km.toFixed(1)}km away`
}

/** Rough walking time with a pram, in the heat. */
export function walkMinutes(km: number): number {
  return Math.round((km / 4) * 60)
}

type Sector = { area: string; lat: number; lng: number }

// Postal sector (first two digits) to a named area and its rough centre.
const POSTAL_SECTORS: Record<string, Sector> = {
  '01': { area: 'Raffles Place', lat: 1.2847, lng: 103.8512 },
  '02': { area: 'Raffles Place', lat: 1.2847, lng: 103.8512 },
  '03': { area: 'Marina', lat: 1.2806, lng: 103.8545 },
  '04': { area: 'Marina', lat: 1.2806, lng: 103.8545 },
  '05': { area: 'Chinatown', lat: 1.2836, lng: 103.8443 },
  '06': { area: 'Chinatown', lat: 1.2836, lng: 103.8443 },
  '07': { area: 'Tanjong Pagar', lat: 1.2764, lng: 103.8455 },
  '08': { area: 'Tanjong Pagar', lat: 1.2764, lng: 103.8455 },
  '09': { area: 'Telok Blangah', lat: 1.2707, lng: 103.8213 },
  '10': { area: 'HarbourFront', lat: 1.2653, lng: 103.8220 },
  '11': { area: 'Pasir Panjang', lat: 1.2765, lng: 103.7913 },
  '12': { area: 'Alexandra', lat: 1.2860, lng: 103.8050 },
  '13': { area: 'Queenstown', lat: 1.2947, lng: 103.8060 },
  '14': { area: 'Queenstown', lat: 1.2947, lng: 103.8060 },
  '15': { area: 'Tiong Bahru', lat: 1.2860, lng: 103.8270 },
  '16': { area: 'Bukit Merah', lat: 1.2820, lng: 103.8180 },
  '17': { area: 'City Hall', lat: 1.2930, lng: 103.8520 },
  '18': { area: 'Bugis', lat: 1.3000, lng: 103.8550 },
  '19': { area: 'Lavender', lat: 1.3070, lng: 103.8630 },
  '20': { area: 'Little India', lat: 1.3067, lng: 103.8494 },
  '21': { area: 'Little India', lat: 1.3067, lng: 103.8494 },
  '22': { area: 'Orchard', lat: 1.3040, lng: 103.8320 },
  '23': { area: 'River Valley', lat: 1.2930, lng: 103.8330 },
  '24': { area: 'Tanglin', lat: 1.3070, lng: 103.8200 },
  '25': { area: 'Bukit Timah', lat: 1.3290, lng: 103.8020 },
  '26': { area: 'Upper Bukit Timah', lat: 1.3400, lng: 103.7770 },
  '27': { area: 'Holland', lat: 1.3110, lng: 103.7960 },
  '28': { area: 'Novena', lat: 1.3200, lng: 103.8430 },
  '29': { area: 'Novena', lat: 1.3200, lng: 103.8430 },
  '30': { area: 'Thomson', lat: 1.3260, lng: 103.8380 },
  '31': { area: 'Balestier', lat: 1.3260, lng: 103.8480 },
  '32': { area: 'Toa Payoh', lat: 1.3330, lng: 103.8490 },
  '33': { area: 'Toa Payoh', lat: 1.3330, lng: 103.8490 },
  '34': { area: 'MacPherson', lat: 1.3260, lng: 103.8830 },
  '35': { area: 'MacPherson', lat: 1.3260, lng: 103.8830 },
  '36': { area: 'Braddell', lat: 1.3400, lng: 103.8470 },
  '37': { area: 'Potong Pasir', lat: 1.3310, lng: 103.8690 },
  '38': { area: 'Geylang', lat: 1.3160, lng: 103.8880 },
  '39': { area: 'Geylang', lat: 1.3160, lng: 103.8880 },
  '40': { area: 'Eunos', lat: 1.3200, lng: 103.9030 },
  '41': { area: 'Eunos', lat: 1.3200, lng: 103.9030 },
  '42': { area: 'Katong', lat: 1.3050, lng: 103.9040 },
  '43': { area: 'Joo Chiat', lat: 1.3110, lng: 103.9010 },
  '44': { area: 'Marine Parade', lat: 1.3020, lng: 103.9060 },
  '45': { area: 'Marine Parade', lat: 1.3020, lng: 103.9060 },
  '46': { area: 'Bedok', lat: 1.3240, lng: 103.9300 },
  '47': { area: 'Bedok', lat: 1.3240, lng: 103.9300 },
  '48': { area: 'Upper East Coast', lat: 1.3220, lng: 103.9450 },
  '49': { area: 'Changi', lat: 1.3510, lng: 103.9840 },
  '50': { area: 'Changi', lat: 1.3510, lng: 103.9840 },
  '51': { area: 'Tampines', lat: 1.3540, lng: 103.9440 },
  '52': { area: 'Tampines', lat: 1.3540, lng: 103.9440 },
  '53': { area: 'Serangoon', lat: 1.3500, lng: 103.8730 },
  '54': { area: 'Hougang', lat: 1.3710, lng: 103.8920 },
  '55': { area: 'Hougang', lat: 1.3710, lng: 103.8920 },
  '56': { area: 'Bishan', lat: 1.3510, lng: 103.8480 },
  '57': { area: 'Ang Mo Kio', lat: 1.3690, lng: 103.8460 },
  '58': { area: 'Upper Bukit Timah', lat: 1.3400, lng: 103.7770 },
  '59': { area: 'Clementi Park', lat: 1.3230, lng: 103.7800 },
  '60': { area: 'Jurong', lat: 1.3330, lng: 103.7420 },
  '61': { area: 'Jurong', lat: 1.3330, lng: 103.7420 },
  '62': { area: 'Jurong West', lat: 1.3400, lng: 103.7050 },
  '63': { area: 'Jurong West', lat: 1.3400, lng: 103.7050 },
  '64': { area: 'Boon Lay', lat: 1.3390, lng: 103.7060 },
  '65': { area: 'Hillview', lat: 1.3620, lng: 103.7670 },
  '66': { area: 'Bukit Panjang', lat: 1.3790, lng: 103.7640 },
  '67': { area: 'Choa Chu Kang', lat: 1.3850, lng: 103.7440 },
  '68': { area: 'Choa Chu Kang', lat: 1.3850, lng: 103.7440 },
  '69': { area: 'Lim Chu Kang', lat: 1.4300, lng: 103.7170 },
  '70': { area: 'Tengah', lat: 1.3660, lng: 103.7150 },
  '71': { area: 'Tengah', lat: 1.3660, lng: 103.7150 },
  '72': { area: 'Kranji', lat: 1.4250, lng: 103.7620 },
  '73': { area: 'Woodlands', lat: 1.4370, lng: 103.7860 },
  '75': { area: 'Yishun', lat: 1.4290, lng: 103.8350 },
  '76': { area: 'Sembawang', lat: 1.4490, lng: 103.8200 },
  '77': { area: 'Upper Thomson', lat: 1.3540, lng: 103.8330 },
  '78': { area: 'Springleaf', lat: 1.3970, lng: 103.8180 },
  '79': { area: 'Seletar', lat: 1.4030, lng: 103.8690 },
  '80': { area: 'Seletar', lat: 1.4030, lng: 103.8690 },
  '81': { area: 'Loyang', lat: 1.3690, lng: 103.9650 },
  '82': { area: 'Punggol', lat: 1.4030, lng: 103.9070 },
}

export function lookupPostalCode(
  postal: string | null | undefined
): { area: string; lat: number; lng: number } | null {
  if (!postal) return null
  const digits = postal.replace(/\D/g, '')
  if (digits.length !== 6) return null
  return POSTAL_SECTORS[digits.slice(0, 2)] ?? null
}

export function isValidPostalCode(postal: string): boolean {
  return lookupPostalCode(postal) !== null
}

/** Centre of Singapore, used when we have no idea where the user is. */
export const SG_CENTRE = { lat: 1.3521, lng: 103.8198 }
