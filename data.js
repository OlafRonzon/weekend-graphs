/**
 * DATA.JS — The Angel of History
 * All historical datasets for the visualization.
 *
 * SOURCES:
 *  - Patents: USPTO Patent Technology Monitoring Team (PTMT); WIPO IP Statistics Database
 *  - Conflict deaths: Correlates of War (CoW); UCDP/PRIO Armed Conflict Dataset v25.1
 *  - Active conflicts/year: UCDP/PRIO Armed Conflict Dataset v25.1 (1946–2024);
 *                           CoW estimates for 1900–1945
 *  - Treaties: UN Treaty Collection; ICRC IHL database; Arms Control Association
 *  - Inventions: Britannica; IEEE; Nature; History of Science literature
 *
 * Benjamin citation: Benjamin, Walter. "On the Concept of History" [1940].
 *   In Illuminations, trans. Harry Zohn, ed. Hannah Arendt. New York: Schocken, 1969. p. 257–258.
 */

// ============================================================
// USPTO UTILITY PATENTS GRANTED — Annual (1900–2023)
// Source: USPTO PTMT, https://www.uspto.gov/web/offices/ac/ido/oeip/taf/us_stat.htm
// Decadal anchor values are from official USPTO data.
// Intervening years interpolated linearly and marked estimated.
// cumulative: running sum from 1836 (first US patent); ~339,000 by 1900.
// ============================================================
const PATENT_DATA = (function () {
  // Exact USPTO anchor values (utility patents granted)
  const anchors = [
    { year: 1900, annual: 25313 },
    { year: 1910, annual: 35930 },
    { year: 1920, annual: 37057 },
    { year: 1930, annual: 43905 },
    { year: 1940, annual: 41256 },
    { year: 1950, annual: 43039 },
    { year: 1960, annual: 47292 },
    { year: 1970, annual: 64429 },
    { year: 1980, annual: 61819 },
    { year: 1990, annual: 90365 },
    { year: 1991, annual: 96511 },
    { year: 1992, annual: 97444 },
    { year: 1993, annual: 98342 },
    { year: 1994, annual: 101676 },
    { year: 1995, annual: 101419 },
    { year: 1996, annual: 109645 },
    { year: 1997, annual: 111984 },
    { year: 1998, annual: 147517 },
    { year: 1999, annual: 153485 },
    { year: 2000, annual: 157494 },
    { year: 2001, annual: 166035 },
    { year: 2002, annual: 167331 },
    { year: 2003, annual: 169023 },
    { year: 2004, annual: 164290 },
    { year: 2005, annual: 143806 },
    { year: 2006, annual: 173772 },
    { year: 2007, annual: 157282 },
    { year: 2008, annual: 157772 },
    { year: 2009, annual: 167349 },
    { year: 2010, annual: 219614 },
    { year: 2011, annual: 224505 },
    { year: 2012, annual: 253155 },
    { year: 2013, annual: 277835 },
    { year: 2014, annual: 300677 },
    { year: 2015, annual: 298408 },
    { year: 2016, annual: 303049 },
    { year: 2017, annual: 318828 },
    { year: 2018, annual: 307760 },
    { year: 2019, annual: 354428 },
    { year: 2020, annual: 352008 },
    { year: 2021, annual: 327482 },
    { year: 2022, annual: 325445 },
    { year: 2023, annual: 312100 },
  ];

  // Build full year-by-year array with linear interpolation between anchors
  const yearlyData = [];
  // Pre-1900 cumulative: ~339,000 patents granted 1836–1899 (USPTO)
  let cumulative = 339000;

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    const years = b.year - a.year;
    for (let y = a.year; y < b.year; y++) {
      const t = (y - a.year) / years;
      const annual = Math.round(a.annual + t * (b.annual - a.annual));
      cumulative += annual;
      yearlyData.push({
        year: y,
        annual,
        cumulative,
        estimated: years > 1 && y !== a.year, // mark interpolated years
      });
    }
  }
  // Add final anchor year
  const last = anchors[anchors.length - 1];
  cumulative += last.annual;
  yearlyData.push({ year: last.year, annual: last.annual, cumulative, estimated: false });

  return yearlyData;
})();


// ============================================================
// MAJOR ARMED CONFLICTS (1900–2024)
// Sources: Correlates of War (CoW); UCDP/PRIO; Sarkees & Wayman (2010);
//          USHMM; Britannica; scholarly consensus estimates.
//
// deaths: Best-estimate total deaths (battle + directly associated civilian).
//         For pre-1946 conflicts, estimates carry significant uncertainty.
//         Ranges are noted in the `range` field.
// type: "world" | "interstate" | "civil" | "colonial" | "genocide"
// ============================================================
const CONFLICTS = [
  // --- Pre-WWII ---
  {
    name: "Boxer Rebellion",
    startYear: 1900, endYear: 1901,
    deaths: 100000, range: [50000, 100000],
    type: "colonial",
    notes: "International forces vs. Chinese Boxer movement"
  },
  {
    name: "Russo-Japanese War",
    startYear: 1904, endYear: 1905,
    deaths: 150000, range: [130000, 170000],
    type: "interstate",
    notes: "Russia vs. Japan; first modern naval war; shocked European powers"
  },
  {
    name: "Mexican Revolution",
    startYear: 1910, endYear: 1920,
    deaths: 1400000, range: [1000000, 2000000],
    type: "civil",
    notes: "Combined combat, famine, and disease"
  },
  {
    name: "Balkan Wars",
    startYear: 1912, endYear: 1913,
    deaths: 300000, range: [250000, 350000],
    type: "interstate",
    notes: "Military + civilian; prelude to WWI"
  },
  {
    name: "World War I",
    startYear: 1914, endYear: 1918,
    deaths: 17000000, range: [15000000, 20000000],
    type: "world",
    notes: "Military + civilian; excludes 1918–19 influenza pandemic"
  },
  {
    name: "Armenian Genocide",
    startYear: 1915, endYear: 1917,
    deaths: 1000000, range: [664000, 1500000],
    type: "genocide",
    notes: "Ottoman systematic deportations and massacres"
  },
  {
    name: "Russian Civil War",
    startYear: 1917, endYear: 1922,
    deaths: 7000000, range: [5000000, 9000000],
    type: "civil",
    notes: "Includes famine, disease, Red/White Terror"
  },
  {
    name: "Chinese Civil War",
    startYear: 1927, endYear: 1949,
    deaths: 2500000, range: [1200000, 8000000],
    type: "civil",
    notes: "Intermittent Nationalist–Communist conflict"
  },
  {
    name: "Spanish Civil War",
    startYear: 1936, endYear: 1939,
    deaths: 500000, range: [400000, 500000],
    type: "civil",
    notes: "Combat + executions + famine; precursor to WWII"
  },
  {
    name: "Second Sino-Japanese War",
    startYear: 1937, endYear: 1945,
    deaths: 14000000, range: [8000000, 20000000],
    type: "interstate",
    notes: "Military + civilian; incorporated into WWII theater"
  },
  {
    name: "World War II",
    startYear: 1939, endYear: 1945,
    deaths: 75000000, range: [70000000, 85000000],
    type: "world",
    notes: "Largest death toll in recorded history; includes Holocaust"
  },
  // --- Early Cold War ---
  {
    name: "Greek Civil War",
    startYear: 1946, endYear: 1949,
    deaths: 158000, range: [100000, 200000],
    type: "civil",
    notes: "Communists vs. royalist government; Cold War proxy"
  },
  {
    name: "First Indochina War",
    startYear: 1946, endYear: 1954,
    deaths: 500000, range: [400000, 600000],
    type: "colonial",
    notes: "France vs. Viet Minh; led to partition of Vietnam"
  },
  {
    name: "Korean War",
    startYear: 1950, endYear: 1953,
    deaths: 3000000, range: [2000000, 4000000],
    type: "interstate",
    notes: "Military + civilian; UN vs. North Korea/China; no formal peace treaty"
  },
  {
    name: "Algerian War",
    startYear: 1954, endYear: 1962,
    deaths: 300000, range: [150000, 400000],
    type: "colonial",
    notes: "FLN independence war against France"
  },
  {
    name: "Vietnam War",
    startYear: 1955, endYear: 1975,
    deaths: 2000000, range: [1300000, 3500000],
    type: "interstate",
    notes: "All Vietnamese parties + US forces; includes Cambodia/Laos spillover"
  },
  {
    name: "Congo Crisis",
    startYear: 1960, endYear: 1965,
    deaths: 100000, range: [50000, 150000],
    type: "civil",
    notes: "Post-independence civil war; UN intervention"
  },
  {
    name: "Nigerian Civil War (Biafra)",
    startYear: 1967, endYear: 1970,
    deaths: 1500000, range: [1000000, 2000000],
    type: "civil",
    notes: "Majority starvation and disease deaths during blockade"
  },
  {
    name: "Bangladesh Liberation War",
    startYear: 1971, endYear: 1971,
    deaths: 1500000, range: [300000, 3000000],
    type: "interstate",
    notes: "Pakistan Army atrocities; widely debated toll"
  },
  {
    name: "Cambodian Genocide",
    startYear: 1975, endYear: 1979,
    deaths: 1700000, range: [1500000, 3000000],
    type: "genocide",
    notes: "Khmer Rouge; ~20–25% of Cambodia's population killed"
  },
  {
    name: "Angolan Civil War",
    startYear: 1975, endYear: 2002,
    deaths: 500000, range: [300000, 800000],
    type: "civil",
    notes: "MPLA vs. UNITA; Cold War proxy conflict"
  },
  {
    name: "Mozambican Civil War",
    startYear: 1977, endYear: 1992,
    deaths: 900000, range: [600000, 1000000],
    type: "civil",
    notes: "FRELIMO vs. RENAMO; massive civilian toll"
  },
  {
    name: "Soviet-Afghan War",
    startYear: 1979, endYear: 1989,
    deaths: 1250000, range: [1000000, 2000000],
    type: "interstate",
    notes: "USSR vs. Mujahideen; 5–6 million displaced"
  },
  {
    name: "Iran-Iraq War",
    startYear: 1980, endYear: 1988,
    deaths: 700000, range: [500000, 1000000],
    type: "interstate",
    notes: "Trench warfare; chemical weapons used by Iraq"
  },
  // --- Post-Cold War ---
  {
    name: "Gulf War",
    startYear: 1990, endYear: 1991,
    deaths: 50000, range: [25000, 100000],
    type: "interstate",
    notes: "US-led coalition vs. Iraq; liberation of Kuwait"
  },
  {
    name: "Bosnian War",
    startYear: 1992, endYear: 1995,
    deaths: 100000, range: [97000, 110000],
    type: "civil",
    notes: "Bosnian Book of the Dead; Srebrenica massacre"
  },
  {
    name: "Rwandan Genocide",
    startYear: 1994, endYear: 1994,
    deaths: 800000, range: [500000, 1000000],
    type: "genocide",
    notes: "~100 days; primarily Tutsi and moderate Hutu killed"
  },
  {
    name: "Chechen Wars",
    startYear: 1994, endYear: 2009,
    deaths: 75000, range: [50000, 200000],
    type: "civil",
    notes: "Two wars; Russia vs. Chechen separatists"
  },
  {
    name: "Colombian Conflict",
    startYear: 1964, endYear: 2016,
    deaths: 220000, range: [180000, 250000],
    type: "civil",
    notes: "FARC/ELN vs. government; peace accord 2016"
  },
  {
    name: "Second Congo War",
    startYear: 1998, endYear: 2003,
    deaths: 3800000, range: [3000000, 5400000],
    type: "civil",
    notes: "Largest conflict since WWII; most deaths from disease/famine"
  },
  {
    name: "Ethiopia-Eritrea War",
    startYear: 1998, endYear: 2000,
    deaths: 70000, range: [50000, 100000],
    type: "interstate",
    notes: "Border war two years after Eritrean independence"
  },
  {
    name: "War in Afghanistan",
    startYear: 2001, endYear: 2021,
    deaths: 195000, range: [176000, 212000],
    type: "interstate",
    notes: "US-led coalition vs. Taliban; NATO withdrawal 2021"
  },
  {
    name: "Iraq War",
    startYear: 2003, endYear: 2011,
    deaths: 210000, range: [150000, 500000],
    type: "interstate",
    notes: "US-led invasion + insurgency; direct violence estimate"
  },
  {
    name: "Darfur Conflict",
    startYear: 2003, endYear: 2020,
    deaths: 200000, range: [180000, 400000],
    type: "civil",
    notes: "Sudanese government and Janjaweed vs. rebel groups"
  },
  {
    name: "Syrian Civil War",
    startYear: 2011, endYear: 2024,
    deaths: 550000, range: [500000, 600000],
    type: "civil",
    notes: "UNOCHA/SOHR estimates; 13 million displaced"
  },
  {
    name: "Yemeni Civil War",
    startYear: 2015, endYear: 2024,
    deaths: 230000, range: [150000, 377000],
    type: "civil",
    notes: "UN OCHA; majority from indirect causes (famine, disease)"
  },
  {
    name: "Tigray War",
    startYear: 2020, endYear: 2022,
    deaths: 400000, range: [300000, 500000],
    type: "civil",
    notes: "Ethiopia federal forces + Eritrea vs. TPLF; famine + combat"
  },
  {
    name: "Russo-Ukrainian War",
    startYear: 2022, endYear: 2024,
    deaths: 350000, range: [200000, 600000],
    type: "interstate",
    notes: "Full-scale invasion Feb 2022; estimates contested; ongoing"
  },
  {
    name: "Gaza War",
    startYear: 2023, endYear: 2024,
    deaths: 45000, range: [40000, 60000],
    type: "interstate",
    notes: "Israel–Hamas; ongoing; figures from Gaza Health Ministry"
  },
  {
    name: "Sudan Civil War",
    startYear: 2023, endYear: 2024,
    deaths: 20000, range: [15000, 40000],
    type: "civil",
    notes: "SAF vs. RSF; one of world's worst humanitarian crises"
  },
];


// ============================================================
// ACTIVE ARMED CONFLICTS PER YEAR (1900–2024)
// 1946–2024: UCDP/PRIO Armed Conflict Dataset v25.1
//   Definition: state-based conflicts with ≥25 battle-deaths/year, ≥1 state party
//   Source: Gleditsch et al. (2002), J. Peace Research 39(5)
// 1900–1945: Correlates of War (CoW) estimates
//   (CoW threshold: 1,000 battle deaths; counts are lower but comparable trend)
//   Source: Sarkees & Wayman (2010), Resort to War: 1816–2007
// Note: Pre-1946 estimates are visually distinguished (dashed line) in the chart.
// ============================================================
const ACTIVE_CONFLICTS = [
  // --- Pre-UCDP estimates (CoW-based, scaled to UCDP threshold equivalents) ---
  { year: 1900, count: 6,  estimated: true },
  { year: 1901, count: 7,  estimated: true },
  { year: 1902, count: 6,  estimated: true },
  { year: 1903, count: 5,  estimated: true },
  { year: 1904, count: 7,  estimated: true },
  { year: 1905, count: 6,  estimated: true },
  { year: 1906, count: 5,  estimated: true },
  { year: 1907, count: 5,  estimated: true },
  { year: 1908, count: 5,  estimated: true },
  { year: 1909, count: 5,  estimated: true },
  { year: 1910, count: 6,  estimated: true },
  { year: 1911, count: 8,  estimated: true },  // Italian-Turkish War
  { year: 1912, count: 10, estimated: true },  // First Balkan War
  { year: 1913, count: 9,  estimated: true },  // Second Balkan War
  { year: 1914, count: 13, estimated: true },  // WWI begins
  { year: 1915, count: 14, estimated: true },
  { year: 1916, count: 14, estimated: true },
  { year: 1917, count: 15, estimated: true },  // Russian Revolution
  { year: 1918, count: 14, estimated: true },
  { year: 1919, count: 12, estimated: true },
  { year: 1920, count: 10, estimated: true },
  { year: 1921, count: 8,  estimated: true },
  { year: 1922, count: 7,  estimated: true },
  { year: 1923, count: 6,  estimated: true },
  { year: 1924, count: 5,  estimated: true },
  { year: 1925, count: 5,  estimated: true },
  { year: 1926, count: 5,  estimated: true },
  { year: 1927, count: 6,  estimated: true },
  { year: 1928, count: 5,  estimated: true },
  { year: 1929, count: 5,  estimated: true },
  { year: 1930, count: 5,  estimated: true },
  { year: 1931, count: 7,  estimated: true },  // Manchuria
  { year: 1932, count: 7,  estimated: true },
  { year: 1933, count: 6,  estimated: true },
  { year: 1934, count: 6,  estimated: true },
  { year: 1935, count: 8,  estimated: true },  // Abyssinia
  { year: 1936, count: 10, estimated: true },  // Spanish Civil War
  { year: 1937, count: 11, estimated: true },  // Second Sino-Japanese War
  { year: 1938, count: 10, estimated: true },
  { year: 1939, count: 14, estimated: true },  // WWII begins
  { year: 1940, count: 16, estimated: true },
  { year: 1941, count: 18, estimated: true },
  { year: 1942, count: 19, estimated: true },
  { year: 1943, count: 20, estimated: true },
  { year: 1944, count: 19, estimated: true },
  { year: 1945, count: 17, estimated: true },
  // --- UCDP/PRIO v25.1 data (1946–2024) ---
  { year: 1946, count: 30, estimated: false },
  { year: 1947, count: 28, estimated: false },
  { year: 1948, count: 30, estimated: false },
  { year: 1949, count: 28, estimated: false },
  { year: 1950, count: 15, estimated: false },
  { year: 1951, count: 14, estimated: false },
  { year: 1952, count: 14, estimated: false },
  { year: 1953, count: 13, estimated: false },
  { year: 1954, count: 15, estimated: false },
  { year: 1955, count: 18, estimated: false },
  { year: 1956, count: 20, estimated: false },
  { year: 1957, count: 20, estimated: false },
  { year: 1958, count: 20, estimated: false },
  { year: 1959, count: 19, estimated: false },
  { year: 1960, count: 20, estimated: false },
  { year: 1961, count: 24, estimated: false },
  { year: 1962, count: 26, estimated: false },
  { year: 1963, count: 27, estimated: false },
  { year: 1964, count: 29, estimated: false },
  { year: 1965, count: 28, estimated: false },
  { year: 1966, count: 30, estimated: false },
  { year: 1967, count: 31, estimated: false },
  { year: 1968, count: 31, estimated: false },
  { year: 1969, count: 30, estimated: false },
  { year: 1970, count: 30, estimated: false },
  { year: 1971, count: 32, estimated: false },
  { year: 1972, count: 32, estimated: false },
  { year: 1973, count: 33, estimated: false },
  { year: 1974, count: 33, estimated: false },
  { year: 1975, count: 33, estimated: false },
  { year: 1976, count: 33, estimated: false },
  { year: 1977, count: 34, estimated: false },
  { year: 1978, count: 36, estimated: false },
  { year: 1979, count: 38, estimated: false },
  { year: 1980, count: 35, estimated: false },
  { year: 1981, count: 36, estimated: false },
  { year: 1982, count: 38, estimated: false },
  { year: 1983, count: 38, estimated: false },
  { year: 1984, count: 39, estimated: false },
  { year: 1985, count: 40, estimated: false },
  { year: 1986, count: 41, estimated: false },
  { year: 1987, count: 41, estimated: false },
  { year: 1988, count: 43, estimated: false },
  { year: 1989, count: 44, estimated: false },
  { year: 1990, count: 51, estimated: false },  // Post-Cold War surge begins
  { year: 1991, count: 52, estimated: false },
  { year: 1992, count: 53, estimated: false },  // UCDP historical peak
  { year: 1993, count: 50, estimated: false },
  { year: 1994, count: 48, estimated: false },
  { year: 1995, count: 42, estimated: false },
  { year: 1996, count: 40, estimated: false },
  { year: 1997, count: 38, estimated: false },
  { year: 1998, count: 37, estimated: false },
  { year: 1999, count: 38, estimated: false },
  { year: 2000, count: 32, estimated: false },
  { year: 2001, count: 35, estimated: false },
  { year: 2002, count: 34, estimated: false },
  { year: 2003, count: 33, estimated: false },
  { year: 2004, count: 33, estimated: false },
  { year: 2005, count: 35, estimated: false },
  { year: 2006, count: 34, estimated: false },
  { year: 2007, count: 34, estimated: false },
  { year: 2008, count: 36, estimated: false },
  { year: 2009, count: 36, estimated: false },
  { year: 2010, count: 31, estimated: false },
  { year: 2011, count: 37, estimated: false },
  { year: 2012, count: 37, estimated: false },
  { year: 2013, count: 33, estimated: false },
  { year: 2014, count: 40, estimated: false },
  { year: 2015, count: 50, estimated: false },
  { year: 2016, count: 53, estimated: false },
  { year: 2017, count: 52, estimated: false },
  { year: 2018, count: 52, estimated: false },
  { year: 2019, count: 54, estimated: false },
  { year: 2020, count: 56, estimated: false },
  { year: 2021, count: 54, estimated: false },
  { year: 2022, count: 56, estimated: false },
  { year: 2023, count: 59, estimated: false },
  { year: 2024, count: 61, estimated: false },  // Record high (UCDP v25.1)
];


// ============================================================
// KEY INTERNATIONAL PEACE TREATIES AND ARMS AGREEMENTS
// Source: UN Treaty Collection; ICRC IHL database; Arms Control Association
// ============================================================
const TREATIES = [
  { year: 1907, name: "Hague Conventions", short: "Hague '07", description: "Expanded 1899 laws of war; cornerstone of international humanitarian law" },
  { year: 1919, name: "League of Nations", short: "League of Nations", description: "First intergovernmental organization for collective security and peace arbitration" },
  { year: 1928, name: "Kellogg-Briand Pact", short: "Kellogg-Briand", description: "Renounced war as an instrument of national policy; signed by 62 nations" },
  { year: 1945, name: "UN Charter", short: "UN Charter", description: "United Nations founded; collective security and prohibition on aggressive war" },
  { year: 1949, name: "Geneva Conventions", short: "Geneva '49", description: "Comprehensive codification of laws of war; protections for POWs and civilians" },
  { year: 1968, name: "Nuclear Non-Proliferation Treaty", short: "NPT", description: "191 state parties; limits nuclear weapons to 5 recognized states" },
  { year: 1972, name: "Biological Weapons Convention", short: "BWC", description: "First multilateral treaty banning an entire category of WMD" },
  { year: 1987, name: "INF Treaty", short: "INF Treaty", description: "Eliminated US and Soviet intermediate-range nuclear missiles" },
  { year: 1998, name: "Rome Statute / ICC", short: "ICC", description: "Created International Criminal Court for war crimes and genocide" },
  { year: 2017, name: "Treaty on Prohibition of Nuclear Weapons", short: "TPNW", description: "First legally binding nuclear disarmament treaty; not signed by nuclear states" },
];


// ============================================================
// KEY TECHNOLOGICAL INVENTIONS WITH DUAL-USE / CIVILIZATIONAL IMPACT
// Sources: Britannica; IEEE; Nature; History of Science literature
// ============================================================
const INVENTIONS = [
  { year: 1903, name: "Powered Flight", short: "Airplane", description: "Wright Brothers; transformed warfare, global transport, and commerce" },
  { year: 1916, name: "Tank", short: "Tank", description: "Mechanized armored warfare; revolutionized land combat doctrine" },
  { year: 1945, name: "Atomic Bomb", short: "Atomic Bomb", description: "Manhattan Project; ended WWII; inaugurated nuclear deterrence era" },
  { year: 1947, name: "Transistor", short: "Transistor", description: "Bell Labs; foundational component enabling all modern electronics" },
  { year: 1957, name: "ICBM / Sputnik", short: "ICBM/Sputnik", description: "Intercontinental missiles + first satellite; defined Cold War deterrence" },
  { year: 1969, name: "ARPANET", short: "ARPANET", description: "First packet-switched network; direct precursor to the internet; DARPA military project" },
  { year: 1971, name: "Microprocessor", short: "Microprocessor", description: "Intel 4004; enabled personal computers and the digital economy" },
  { year: 1991, name: "World Wide Web", short: "WWW", description: "Tim Berners-Lee (CERN); democratized information globally" },
  { year: 2007, name: "Smartphone", short: "Smartphone", description: "iPhone generation; reshaped human social behavior and information access" },
  { year: 2022, name: "Generative AI", short: "Gen AI", description: "Large language models go mainstream; broad civilizational implications" },
];
