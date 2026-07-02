/** Vergleichsdaten · Stand Juli 2026 · bodenständig mit Quellen */

export const NEON = [
  '#00ffff', '#ffee00', '#ff0044', '#00ff55', '#ff00ea', '#ff6600', '#ffffff',
];

/** Bloomberg / Forbes · Juni–Juli 2026 · stark schwankend, mostly Papierwert */
export const MUSK = {
  name: 'Elon Musk',
  netWorthUsd: 1_010_000_000_000,
  display: '1,01 Bio. USD',
  range: '0,95 – 1,45 Bio. USD',
  source: 'Bloomberg Billionaires Index · Juli 2026',
  note: 'Papiervermögen (SpaceX/Tesla-Aktien), nicht auszahlbar',
  peak: 1_450_000_000_000,
};

/** Hungersnot-Hilfe · verschiedene Ebenen */
export const NEEDS = [
  {
    id: 'wfp-afrika',
    label: 'WFP · Sub-Sahara-Afrika',
    sub: 'Akute Hungersnot · 1 Jahr · 170 Mio. Menschen',
    usd: 8_400_000_000,
    display: '8,4 Mrd. USD',
    source: 'WFP Global Outlook 2025',
    color: '#ff0044',
  },
  {
    id: 'wfp-global',
    label: 'WFP · weltweit',
    sub: 'Humanitäre Lebensmittelhilfe · 1 Jahr',
    usd: 16_900_000_000,
    display: '16,9 Mrd. USD',
    source: 'WFP · Nov 2024',
    color: '#ff6600',
  },
  {
    id: 'fao-notfall',
    label: 'FAO · Notfall-Hilfe',
    sub: 'Agrar-Hilfe · 49 Mio. Menschen · global',
    usd: 1_900_000_000,
    display: '1,9 Mrd. USD',
    source: 'FAO · 2025',
    color: '#ffee00',
  },
  {
    id: 'hunger-min',
    label: 'Hunger beenden · Minimum',
    sub: 'Zusätzl. Investition/Jahr · Sozialschutz + Forschung',
    usd: 45_000_000_000,
    display: '39–50 Mrd. USD/Jahr',
    source: 'IFPRI / FAO · SDG 2 Studie',
    color: '#00ff55',
  },
  {
    id: 'hunger-full',
    label: 'Hunger beenden · umfassend',
    sub: 'Systemwandel · Armut + Ernährung · pro Jahr',
    usd: 265_000_000_000,
    display: '265 Mrd. USD/Jahr',
    source: 'Hunger-Investment-Studie · FAO/IFPRI',
    color: '#00ffff',
  },
];

export const SLIDE_SEC = 9;
export const TOTAL_CYCLE = NEEDS.length * SLIDE_SEC;

export function fmtUsd(n) {
  if (n >= 1e12) {
    return `${(n / 1e12).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Bio. USD`;
  }
  if (n >= 1e9) {
    return `${(n / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mrd. USD`;
  }
  if (n >= 1e6) {
    return `${(n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 0 })} Mio. USD`;
  }
  return `${n.toLocaleString('de-DE')} USD`;
}

export function ratio(muskUsd, needUsd) {
  return muskUsd / needUsd;
}

export function yearsFunded(muskUsd, needUsdPerYear) {
  return muskUsd / needUsdPerYear;
}

export function activeNeed(t) {
  const idx = Math.floor((t % TOTAL_CYCLE) / SLIDE_SEC) % NEEDS.length;
  const local = ((t % TOTAL_CYCLE) % SLIDE_SEC) / SLIDE_SEC;
  return { need: NEEDS[idx], idx, local };
}

export const DISCLAIMER =
  'Vergleich vereinfacht · Hilfe braucht Logistik, nicht nur Geld · Musks Vermögen ist illiquide';
