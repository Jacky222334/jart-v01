/** 3D-Treibstoff- / Teilchenmodelle · rotierend · phys. Eigenschaften */

export const FUEL_KEYS = [
  'chemical', 'scramjet', 'ion', 'laser', 'nuclear', 'antimatter', 'quantum',
];

/** Atom: pos [x,y,z], el, color, r */
function chainShort() {
  const atoms = [];
  const bonds = [];
  for (let i = 0; i < 4; i++) {
    const p = [i * 0.55, (i % 2) * 0.3 - 0.12, Math.sin(i) * 0.15];
    const ci = atoms.length;
    atoms.push({ el: 'C', pos: p, color: '#888888', r: 11 });
    if (i > 0) bonds.push([ci - 2, ci]);
    const hi = atoms.length;
    atoms.push({ el: 'H', pos: [p[0], p[1] + 0.32, p[2]], color: '#00ff88', r: 6 });
    bonds.push([ci, hi]);
  }
  return { atoms, bonds, bondOrders: bonds.map(() => 1) };
}

const oct = chainShort();

export const MODELS = {
  chemical_lox: {
    id: 'chemical_lox',
    title: 'O₂ · Flüssigsauerstoff (LOX)',
    subtitle: 'Oxidator · chemisch',
    props: [
      ['Molmasse', '32,00 g/mol'],
      ['Dichte (fl.)', '1,141 g/cm³'],
      ['Siedepunkt', '−182,96 °C'],
      ['Bindungsenergie', '498 kJ/mol'],
      ['Elektronegativität', '3,44 Pauling'],
      ['Zustand', 'paramagnetisch · blassblau'],
    ],
    atoms: [
      { el: 'O', pos: [-0.55, 0, 0], color: '#ff4400', r: 16 },
      { el: 'O', pos: [0.55, 0, 0], color: '#ff2200', r: 16 },
    ],
    bonds: [[0, 1]],
    bondOrders: [2],
  },
  chemical_rp1: {
    id: 'chemical_rp1',
    title: 'C₈H₁₈ · Octan (RP-1)',
    subtitle: 'Kerosin · chemisch',
    props: [
      ['Molmasse', '114,23 g/mol'],
      ['Dichte', '0,81 g/cm³'],
      ['Siedepunkt', '125–127 °C'],
      ['Heizwert', '≈ 43 MJ/kg'],
      ['H/C-Verhältnis', '2,25'],
      ['Typ', 'Rocket Propellant-1'],
    ],
    atoms: oct.atoms,
    bonds: oct.bonds,
    bondOrders: oct.bondOrders,
  },
  scramjet_air: {
    id: 'scramjet_air',
    title: 'Luft · N₂ + O₂',
    subtitle: 'phys. Medium · SCRAMJET',
    props: [
      ['N₂', '78,08 Vol-%'],
      ['O₂', '20,95 Vol-%'],
      ['Molmasse (mittel)', '28,97 g/mol'],
      ['Dichte (SSL)', '1,225 kg/m³'],
      ['γ (adiabatic)', '1,4'],
      ['Mach', '> 5 · Überschall'],
    ],
    atoms: [
      { el: 'N', pos: [-0.5, 0.2, 0], color: '#4488ff', r: 14 },
      { el: 'N', pos: [0.5, 0.2, 0], color: '#4488ff', r: 14 },
      { el: 'O', pos: [-0.5, -0.5, 0.3], color: '#ff4400', r: 13 },
      { el: 'O', pos: [0.5, -0.5, 0.3], color: '#ff4400', r: 13 },
    ],
    bonds: [[0, 1], [2, 3]],
    bondOrders: [3, 2],
  },
  ion_xe: {
    id: 'ion_xe',
    title: 'Xe · Xenon',
    subtitle: 'Edelgas · ION-Triebwerk',
    props: [
      ['Molmasse', '131,29 g/mol'],
      ['Dichte (gas)', '5,894 g/L'],
      ['Ionisierung', '12,13 eV'],
      ['Schmelze', '−111,8 °C'],
      ['Isp (typ.)', '2000–3000 s'],
      ['Plasma', 'e⁻ abgesprengt · Xe⁺'],
    ],
    atoms: [
      { el: 'Xe', pos: [0, 0, 0], color: '#8844ff', r: 28 },
    ],
    bonds: [],
    shell: true,
  },
  laser_photon: {
    id: 'laser_photon',
    title: 'Photon · EM-Welle',
    subtitle: 'phys. Strahlung · Laser-Sail',
    props: [
      ['Ruhemasse', '0 kg'],
      ['Energie', 'E = h·ν'],
      ['λ (typ.)', '1064 nm · Nd:YAG'],
      ['Impuls', 'p = E/c'],
      ['Druck', '2P/c · A⁻¹'],
      ['Leistung', 'GW-Board'],
    ],
    wave: true,
    atoms: [],
    bonds: [],
  },
  nuclear_u235: {
    id: 'nuclear_u235',
    title: '²³⁵U · Uran',
    subtitle: 'Kernspaltung · nuklear',
    props: [
      ['Molmasse', '235,04 u'],
      ['Halbwertszeit', '703,8 Ma'],
      ['Spaltenergie', '≈ 200 MeV / Kern'],
      ['Kritische Masse', '≈ 52 kg (nackt)'],
      ['Neutronen', '143 N + 92 P'],
      ['Orion-Puls', 'Spalt-Patronen'],
    ],
    atoms: [
      { el: 'U', pos: [0, 0, 0], color: '#ffee00', r: 26 },
    ],
    bonds: [],
    nucleus: { n: 12, p: 8, orbit: true },
  },
  antimatter_ep: {
    id: 'antimatter_ep',
    title: 'e⁻ + e⁺ · Antimaterie',
    subtitle: 'Annihilation · paare',
    props: [
      ['Ruhemasse', '9,109×10⁻³¹ kg'],
      ['Annihilation', '2γ · 1,022 MeV'],
      ['Effizienz', '100% m→E'],
      ['Speicher', 'Penning-Falle · 4 T'],
      ['Isp (theor.)', '≈ 10 000 s'],
      ['Sicherheit', 'e⁺ Kontakt = γ-Blitz'],
    ],
    atoms: [
      { el: 'e⁻', pos: [-0.7, 0, 0.4], color: '#4488ff', r: 10 },
      { el: 'e⁺', pos: [0.7, 0, -0.4], color: '#ff00ea', r: 10 },
    ],
    bonds: [],
    orbit: true,
  },
  quantum_pair: {
    id: 'quantum_pair',
    title: 'Virtuelles Paar · Q-Vakuum',
    subtitle: 'Casimir · Quantenfluktuation',
    props: [
      ['ΔE·Δt', '≥ ℏ/2'],
      ['Paar', 'Partikel + Antiteilchen'],
      ['Implosion', 'Vakuum-Energie'],
      ['Skala', 'Planck · 10⁻³⁵ m'],
      ['Status', 'spekulativ'],
      ['Effekt', 'Stoßfront'],
    ],
    atoms: [
      { el: 'q', pos: [-0.4, 0.3, 0], color: '#8844ff', r: 9 },
      { el: 'q̄', pos: [0.4, -0.3, 0], color: '#cc44ff', r: 9 },
    ],
    bonds: [[0, 1]],
    flicker: true,
  },
};

export function modelForPhase(key, local) {
  switch (key) {
    case 'chemical': return local < 0.5 ? MODELS.chemical_lox : MODELS.chemical_rp1;
    case 'scramjet': return MODELS.scramjet_air;
    case 'ion': return MODELS.ion_xe;
    case 'laser': return MODELS.laser_photon;
    case 'nuclear': return MODELS.nuclear_u235;
    case 'antimatter': return MODELS.antimatter_ep;
    case 'quantum': return MODELS.quantum_pair;
    default: return null;
  }
}

export function hasFuelModel(key) {
  return FUEL_KEYS.includes(key);
}
