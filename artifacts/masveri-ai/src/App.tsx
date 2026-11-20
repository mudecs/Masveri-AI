import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Anchor, CalendarDays, Compass, Fish, Languages, LifeBuoy, Map as MapIcon,
  LoaderCircle, Moon, RotateCw, Settings2, Waves, Wind,
} from 'lucide-react';
import MarineMap from './components/MarineMap';

type Lang = 'en' | 'dv';
type Tab = 'dashboard' | 'map' | 'forecast' | 'tides' | 'moon' | 'advisor' | 'settings';
type Row = {
  time: string; wind?: number; gust?: number; rain?: number; wave?: number;
  swell?: number; current: number | null; dir?: number; sea?: number;
};
type Place = [string, number, number];
type CustomPoint = { lat: number; lon: number; name: string };

const places: Place[] = [
  ['Malé offshore', 4.15, 73.46], ['Hulhumalé offshore', 4.25, 73.58],
  ['Thulusdhoo offshore', 4.38, 73.68], ['Himmafushi offshore', 4.32, 73.57],
  ['Dhiffushi offshore', 4.45, 73.72], ['Maafushi offshore', 3.94, 73.53],
  ['Gulhi offshore', 3.99, 73.51], ['Guraidhoo offshore', 3.89, 73.47],
  ['South Malé offshore', 3.88, 73.56],
];
const methods = [
  ['reef', 'Reef / Bottom'], ['tuna', 'Tuna / Offshore'], ['troll', 'Trolling'], ['jig', 'Jigging / Popping'],
];
const copy = {
  en: {
    subtitle: 'Maldives fishing intelligence', home: 'Home', marineMap: 'Marine Map', mapIntro: 'Planning map for North and South Malé Atolls.',
    forecast: '7-day Forecast', tides: 'Modeled tides',
    moon: 'Moon calendar', advisor: 'Fishing advisor', settings: 'Settings & about', area: 'Fishing area',
    method: 'Fishing method', loading: 'Loading forecasts', loadingDetail: 'Requesting marine and weather model data…',
    updated: 'Model forecast loaded', unavailable: 'Live data unavailable', retry: 'Try again',
    headline: 'A clearer read on the water.', homeIntro: 'Local marine and weather outlook for your next fishing window.',
    forecastIntro: 'Seven days of modeled conditions for your selected area and method.',
    tideIntro: 'Estimated sea-level height relative to mean sea level.',
    moonIntro: 'Approximate astronomical moon phase for the forecast period.',
    advisorIntro: 'Rule-based forecast analysis. This version does not use a generative AI model.',
    settingsIntro: 'How this forecast is assembled, and what it can — and cannot — tell you.',
    outlook: 'Marine outlook', suitability: 'Fishing suitability · experimental', heuristic: 'heuristic score',
    higher: 'Higher suitability', moderate: 'Moderate suitability', lower: 'Lower suitability',
    insufficient: 'Insufficient data to calculate a score.', noRows: 'No forecast rows are available yet.',
    wind: 'Wind', gust: 'Gust', wave: 'Wave', swell: 'Swell', current: 'Current', direction: 'Current direction',
    sea: 'Sea level vs MSL', rain: 'Rain', todayConditions: 'Conditions at a glance',
    safety: 'Model estimates only. Not suitable for channel navigation. Check Maldives Meteorological Service warnings and local conditions before departure.',
    scoreNote: 'This score is a heuristic, not a fish-catch probability or safety clearance.',
    daily: 'Daily outlook', best: 'Best estimated window', maxWave: 'Max wave', maxWind: 'Max wind',
    noScore: 'No score available', hourly: 'Hourly model data', time: 'Time · MVT',
    modeledSea: 'Modeled sea-level height', tideDisclaimer: 'Not chart datum or official high/low tide tables.',
    turns: 'Estimated turning points', noTurns: 'No reliable turning points detected',
    highTide: 'High', lowTide: 'Low', illuminated: 'illuminated', age: 'Lunar age',
    moonCaution: 'Approximate astronomical moon phase. Moonrise, moonset and solunar transit calculations are not included. Lunar phase alone does not reliably predict catches.',
    window: 'Estimated window', conditions: 'Conditions', assess: 'Conditions may suit the selected method; assess your vessel and local hazards.',
    noRecommendations: 'Not enough data to recommend windows.', about: 'About Masveri AI',
    version: 'Version 1 · North and South Malé Atolls · English / partial Dhivehi translation.',
    source: 'Forecast data: Open-Meteo weather and marine model APIs. Moon phase: local astronomical approximation.',
    limitations: 'Data can be unavailable or coarse near reefs. This app is not a navigation or emergency warning service.',
    metService: 'Maldives Meteorological Service', refresh: 'Refresh forecasts', retryError: 'Could not load live data. Check your connection and try again.',
    noMarine: 'Some marine values may be missing at this location or forecast hour.',
  },
  dv: {
    subtitle: 'ދިވެހި މަސްވެރިކަމުގެ މަޢުލޫމާތު', home: 'ފުރަތަމަ',
    marineMap: 'މެރިން މެޕް', mapIntro: 'އުތުރު އަދި ދެކުނު މާލެ އަތޮޅުތަކުގެ މެޕް.',
    forecast: 'ފޯކާސްޓް', tides: 'އުދަ / ހިއްކަ',
    moon: 'ހަނދު', advisor: 'ލަފާ', settings: 'ސެޓިންގްސް / ތަޢާރަފް',
    area: 'މަސްބާނާ ސަރަހައްދު', method: 'މަސްބާނާ ގޮތް',
    loading: 'މަޢުލޫމާތު ހޯދަނީ', loadingDetail: 'މޫސުމާއި ކަނޑުގެ މޮޑެލް ޑޭޓާ ހޯދަނީ…',
    updated: 'ފޯކާސްޓް ލިބިއްޖެ', unavailable: 'ލައިވް ޑޭޓާ ނުލިބުނު', retry: 'އަލުން ލޯޑްކުރޭ',
    headline: 'ކަނޑުގެ ޙާލަތު އިތުރަށް ސާފުކޮށް.', homeIntro: 'މަސްބާނާއަށް ކަނޑާއި މޫސުމުގެ ފޯކާސްޓް.',
    forecastIntro: 'އިޚްތިޔާރުކުރި ސަރަހައްދާއި ގޮތަށް ހަތް ދުވަހުގެ މޮޑެލް ޙާލަތު.',
    tideIntro: 'މީން ސީ ލެވެލްއާ ގުޅޭ އަންދާޒީ ކަނޑު ފެނުގެ މިންވަރު.',
    moonIntro: 'ފޯކާސްޓް ދުވަސްތަކުގެ ހަނދުގެ އަންދާޒީ ޙާލަތު.',
    advisorIntro: 'ޤަވާއިދުން ފޯކާސްޓް ބަލާލުމެއް. މި ވަރޝަންގައި ޖެނެރޭޓިވް AI ނުބޭނުންކުރެއެވެ.',
    settingsIntro: 'ފޯކާސްޓް ހެދޭ ގޮތާއި އެއިން ދެއްކޭނެ ނުވަތަ ނުދެއްކޭނެ ކަންތައް.',
    outlook: 'ކަނޑުގެ ޙާލަތު', suitability: 'މަސްބާނާއަށް މުނާސަބު · އިމްތިޙާނީ',
    heuristic: 'އަންދާޒީ ސްކޯރު', higher: 'އިތުރަށް މުނާސަބު', moderate: 'މެދުމިނެއް', lower: 'ދަށް މުނާސަބު',
    insufficient: 'ސްކޯރު ހެދުމަށް ޑޭޓާ މަދު.', noRows: 'ފޯކާސްޓް ޑޭޓާ އަދި ނުލިބޭ.',
    wind: 'ވައި', gust: 'ވައިގެ ބާރު', wave: 'ލައްޓެވުން', swell: 'ކަނޑު ލައްޓެވުން',
    current: 'ކަނޑު ދިޔަ', direction: 'ކަނޑު ދިޔަގެ ދިމާ', sea: 'ކަނޑުފެނުގެ މިންވަރު', rain: 'ވާރޭ',
    todayConditions: 'މިހާރުގެ ޙާލަތު', safety: 'މިއީ މޮޑެލުން ލަފާކުރާ އަދަދުތަކެކެވެ. ކަނޑުތަކުގައި ދަތުރުކުރުމަށް ނުބޭނުންކުރާށެވެ. ދުރުކުރާއިރު ދިވެހި މެޓެރޮލޮޖީ ސާރވިސްގެ އިންޒާރުތަކާއި މަހައްޗަށް ބަލާށެވެ.',
    scoreNote: 'މި ސްކޯރަކީ އަންދާޒީ މިންވަރެކެވެ؛ މަސް ލިބޭނެކަމުގެ ޔަޤީނެއް ނޫން، އަދި ސަލާމަތީ ފާސްއެއް ނޫނެވެ.',
    daily: 'ދުވަހުގެ ފޯކާސްޓް', best: 'އެންމެ މުނާސަބު ވަގުތު', maxWave: 'އެންމެ ބޮޑު ލައްޓެވުން',
    maxWind: 'އެންމެ ބާރު ވައި', noScore: 'ސްކޯރެއް ނެތް', hourly: 'ގަޑިއިރުގެ މޮޑެލް ޑޭޓާ',
    time: 'ވަގުތު · MVT', modeledSea: 'މޮޑެލް ކުރެވިފައިވާ ކަނޑުފެނުގެ މިންވަރު',
    tideDisclaimer: 'ޗާޓް ޑޭޓަމް ނޫން، އަދި ރަސްމީ ބޮޑު / ދަށް އުދަގެ ޓޭބަލެއް ނޫނެވެ.',
    turns: 'އަންދާޒީ ބަދަލު ވަގުތު', noTurns: 'އިތުބާރުކުރެވޭ ބަދަލު ވަގުތެއް ނުފެނުނު',
    highTide: 'ބޮޑު', lowTide: 'ދަށް', illuminated: 'އަލިކަން', age: 'ހަނދުގެ އުމުރު',
    moonCaution: 'ހަނދުގެ ޙާލަތަކީ އަންދާޒީ އެކެވެ. ހަނދުރައި، ހަނދުބައްތި، އަދި ސޮލަނާރ ވަގުތު ހިސާބުތައް ނުހިމެނޭ. ހަނދުގެ ޙާލަތުން މަސް ލިބޭކަން ޔަޤީނެއް ނޫނެވެ.',
    window: 'އަންދާޒީ ވަގުތު', conditions: 'ޙާލަތު', assess: 'މި ޙާލަތު އިޚްތިޔާރުކުރި ގޮތަށް މުނާސަބު ވެދާނެ؛ ނަމަވެސް ދޯނިއާއި މަހައްޗުގެ ހާލަތު ބަލާށެވެ.',
    noRecommendations: 'ވަގުތު ލަފާކުރަން ޑޭޓާ މަދު.', about: 'މަސްވެރި AI ގެ ތަޢާރަފް',
    version: 'ވަރޝަން 1 · އުތުރު އަދި ދެކުނު މާލެ އަތޮޅުތައް · އިނގިރޭސި / ބައިވަރު ދިވެހި.',
    source: 'ފޯކާސްޓް ޑޭޓާ: Open-Meteo މޫސުމާއި ކަނޑުގެ މޮޑެލް API. ހަނދުގެ ޙާލަތު: އަންދާޒީ ހިސާބު.',
    limitations: 'ކަނޑުރަށް ކައިރި ޑޭޓާ ނުލިބިދާނެ ނުވަތަ ކޮމަޑު ވެދާނެ. މި އެޕް ނޭވިގޭޝަން ނުވަތަ އެމަޖެންސީ އިންޒާރު ޚިދުމަތެއް ނޫނެވެ.',
    metService: 'ދިވެހި މެޓެރޮލޮޖީ ސާރވިސް', refresh: 'ފޯކާސްޓް އަލުން ލޯޑްކުރޭ',
    retryError: 'ލައިވް ޑޭޓާ ނުލިބުނު. އިންޓަރނެޓް ޗެކްކޮށް އަލުން ލޯޑްކުރޭ.',
    noMarine: 'މި ތަނުގައި ނުވަތަ މި ގަޑިއިރުގައި ބައެއް ކަނޑު ޑޭޓާ ނުލިބިދާނެ.',
  },
};
const navItems: { id: Tab; icon: typeof Waves; key: keyof typeof copy.en }[] = [
  { id: 'dashboard', icon: Compass, key: 'home' },
  { id: 'map', icon: MapIcon, key: 'marineMap' },
  { id: 'forecast', icon: CalendarDays, key: 'forecast' },
  { id: 'tides', icon: Waves, key: 'tides' },
  { id: 'moon', icon: Moon, key: 'moon' },
  { id: 'advisor', icon: Fish, key: 'advisor' },
  { id: 'settings', icon: Settings2, key: 'settings' },
];
const valid = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const fmt = (n: number | null | undefined, d = 1) => valid(n) ? n.toFixed(d) : '—';
const dayKey = (t: string) => t.slice(0, 10);
const time = (t: string) => t.slice(11, 16);
const fullTime = (t: string) => `${t.replace('T', ' ')} MVT`;

function moonPhase(day: Date) {
  const syn = 29.530588853;
  const ref = Date.UTC(2000, 0, 6, 18, 14);
  const age = ((day.getTime() - ref) / 86400000 % syn + syn) % syn;
  const illum = (1 - Math.cos(2 * Math.PI * age / syn)) / 2;
  const name = age < 1.85 ? 'New moon' : age < 7.38 ? 'Waxing crescent' : age < 9.23 ? 'First quarter' : age < 14.77 ? 'Waxing gibbous' : age < 16.61 ? 'Full moon' : age < 22.15 ? 'Waning gibbous' : age < 24 ? 'Last quarter' : 'Waning crescent';
  return { age, illum, name };
}
function score(row: Row, method: string) {
  if (!valid(row.wind) || !valid(row.wave)) return null;
  let result = 80;
  result -= Math.max(0, row.wind - 8) * (method === 'tuna' ? 1.8 : 2.8);
  result -= Math.max(0, row.wave - .7) * (method === 'tuna' ? 12 : 19);
  if (valid(row.gust)) result -= Math.max(0, row.gust - 18) * 1.3;
  if (valid(row.rain)) result -= Math.min(15, row.rain * 4);
  if (valid(row.current)) result -= Math.max(0, row.current - (method === 'jig' ? .8 : 1.2)) * 7;
  const hour = Number(row.time.slice(11, 13));
  if ((hour >= 5 && hour <= 8) || (hour >= 16 && hour <= 18)) result += 8;
  const phase = moonPhase(new Date(`${row.time}+05:00`));
  if (phase.illum > .9 || phase.illum < .1) result += 3;
  return Math.max(0, Math.min(100, Math.round(result)));
}
function tideTurns(data: Row[]) {
  const turns: (Row & { kind: 'High' | 'Low' })[] = [];
  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1], curr = data[i], next = data[i + 1];
    if (![prev.sea, curr.sea, next.sea].every(valid)) continue;
    if (curr.sea! > prev.sea! && curr.sea! >= next.sea!) turns.push({ ...curr, kind: 'High' });
    if (curr.sea! < prev.sea! && curr.sea! <= next.sea!) turns.push({ ...curr, kind: 'Low' });
  }
  return turns;
}
function SeaChart({ values, unit }: { values: (number | undefined)[]; unit: string }) {
  const good = values.filter(valid);
  if (good.length < 2) return <div className="empty-state"><strong>Not enough model data</strong>There are not enough values to draw this chart.</div>;
  let min = Math.min(...good), max = Math.max(...good);
  if (min === max) max = min + 1;
  const pts = values.map((v, i) => valid(v) ? `${20 + i * 760 / Math.max(1, values.length - 1)},${142 - (v - min) / (max - min) * 105}` : null).filter(Boolean).join(' ');
  const [first, ...rest] = pts.split(' ');
  return <svg className="chart" viewBox="0 0 800 180" role="img" aria-label={`Modeled sea-level chart, ${fmt(min, 2)} to ${fmt(max, 2)} ${unit}`}>
    <defs><linearGradient id="seaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#56ad8e" stopOpacity=".24" /><stop offset="100%" stopColor="#56ad8e" stopOpacity="0" /></linearGradient></defs>
    {[45, 95, 145].map(y => <line key={y} className="chart-grid" x1="14" x2="786" y1={y} y2={y} />)}
    <polygon className="chart-area" points={`${first} ${rest.join(' ')} 780,145 20,145`} />
    <polyline className="chart-line" points={pts} />
    <text x="18" y="34">{fmt(max, 2)} {unit}</text><text x="18" y="168">{fmt(min, 2)} {unit}</text>
  </svg>;
}

function App() {
  const [lang, setLang] = useState<Lang>(() => localStorage.getItem('lang') === 'dv' ? 'dv' : 'en');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [placeIndex, setPlaceIndex] = useState(() => {
    const saved = Number(localStorage.getItem('place') || 0);
    return Number.isInteger(saved) && saved >= 0 && saved < places.length ? saved : 0;
  });
  const [method, setMethod] = useState(() => {
    const saved = localStorage.getItem('method') || 'reef';
    return methods.some(([id]) => id === saved) ? saved : 'reef';
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [customPoint, setCustomPoint] = useState<CustomPoint | null>(() => {
    try {
      const raw = localStorage.getItem('customPoint');
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return null;
      const p = parsed as Record<string, unknown>;
      if (typeof p.lat !== 'number' || typeof p.lon !== 'number') return null;
      const lat = p.lat, lon = p.lon;
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) return null;
      return { lat, lon, name: typeof p.name === 'string' && p.name ? p.name.slice(0, 60) : 'Map point' };
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');
  const t = copy[lang];
  const direction = lang === 'dv' ? 'rtl' : 'ltr';
  const place = places[placeIndex];
  const forecastPlace: [string, number, number] = customPoint ? [customPoint.name, customPoint.lat, customPoint.lon] : place;
  const selectedMethod = methods.find(([id]) => id === method)?.[1] || methods[0][1];
  const todayMvt = new Date(Date.now() + 5 * 3600000).toISOString().slice(0, 16);
  const currentRow = rows.find(row => row.time >= todayMvt) || rows[0];
  const days = useMemo(() => [...new Set(rows.map(row => dayKey(row.time)))].slice(0, 7), [rows]);
  const turns = useMemo(() => tideTurns(rows.slice(0, 168)), [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [, lat, lon] = forecastPlace;
    try {
      const common = `latitude=${lat}&longitude=${lon}&timezone=Indian%2FMaldives&forecast_days=7`;
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?${common}&wind_speed_unit=kn&hourly=wind_speed_10m,wind_gusts_10m,precipitation,weather_code`;
      const marineUrl = `https://marine-api.open-meteo.com/v1/marine?${common}&cell_selection=sea&hourly=wave_height,swell_wave_height,ocean_current_velocity,ocean_current_direction,sea_level_height_msl`;
      const responses = await Promise.all([fetch(weatherUrl), fetch(marineUrl)]);
      if (responses.some(response => !response.ok)) throw new Error('API HTTP error');
      const [weather, marine] = await Promise.all(responses.map(response => response.json()));
      const weatherHours = weather.hourly, marineHours = marine.hourly;
      if (!weatherHours?.time?.length || !marineHours?.time?.length) throw new Error('Forecast data is incomplete');
      const marineIndex = new Map<string, number>(marineHours.time.map((stamp: string, index: number) => [stamp, index]));
      const result: Row[] = weatherHours.time.map((stamp: string, index: number) => {
        const marineAt = marineIndex.get(stamp);
        const value = (key: string) => marineAt === undefined ? null : marineHours[key]?.[marineAt];
        const velocity = value('ocean_current_velocity');
        return {
          time: stamp, wind: weatherHours.wind_speed_10m?.[index], gust: weatherHours.wind_gusts_10m?.[index],
          rain: weatherHours.precipitation?.[index], wave: value('wave_height'), swell: value('swell_wave_height'),
          current: valid(velocity) ? velocity * 1.943844 : null,
          dir: value('ocean_current_direction'), sea: value('sea_level_height_msl'),
        };
      });
      setRows(result);
      setLastUpdate(new Date(Date.now() + 5 * 3600000).toISOString().slice(0, 16).replace('T', ' '));
    } catch {
      setRows([]);
      setError('network');
    } finally {
      setLoading(false);
    }
  }, [forecastPlace]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = direction;
  }, [lang, direction]);
  useEffect(() => { localStorage.setItem('place', String(placeIndex)); }, [placeIndex]);
  useEffect(() => { localStorage.setItem('method', method); }, [method]);

  const switchTab = (newTab: Tab) => setTab(newTab);
  const applyCustomPoint = useCallback((point: { lat: number; lon: number }) => {
    const next: CustomPoint = { lat: point.lat, lon: point.lon, name: `Map point · ${point.lat.toFixed(3)}, ${point.lon.toFixed(3)}` };
    setCustomPoint(next);
    try { localStorage.setItem('customPoint', JSON.stringify(next)); } catch { /* storage unavailable */ }
  }, []);
  const pageTitle: Record<Tab, string> = {
    dashboard: t.home, map: t.marineMap, forecast: t.forecast, tides: t.tides, moon: t.moon, advisor: t.advisor, settings: t.settings,
  };
  const subtitle: Record<Tab, string> = {
    dashboard: t.homeIntro, forecast: t.forecastIntro, tides: t.tideIntro,
    map: t.mapIntro, moon: t.moonIntro, advisor: t.advisorIntro, settings: t.settingsIntro,
  };

  const metric = (label: string, value: number | null | undefined, unit: string, decimals = 1, id: string) => (
    <div className="metric" key={id} data-testid={`metric-${id}`}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{fmt(value, decimals)} <span className="metric-unit">{unit}</span></strong>
    </div>
  );
  const warning = <div className="warning-box" role="note">{t.safety}</div>;
  const scoreLabel = (value: number | null) => value === null ? t.insufficient : value >= 70 ? t.higher : value >= 45 ? t.moderate : t.lower;
  const scorePanel = (value: number | null, compact = false) => (
    <section className={`panel dark-panel score-panel${compact ? ' compact-score' : ''}`} aria-label={t.suitability}>
      <div>
        <div className="eyebrow" style={{ color: '#a4cbb9' }}>{t.suitability}</div>
        <div className="score-value" data-testid="text-experimental-score">{value === null ? '—' : <>{value}<small> /100</small></>}</div>
        {value !== null && <div className="score-track"><div className="score-fill" style={{ width: `${value}%` }} /></div>}
        <div className="score-state">{scoreLabel(value)}</div>
      </div>
      <p className="fine-print">{t.scoreNote}</p>
    </section>
  );
  const renderLoading = () => (
    <div className="section-stack" aria-label={t.loading} aria-live="polite">
      <div className="panel"><div className="skeleton skeleton-line" style={{ width: '32%' }} /><div className="metric-grid">{Array.from({ length: 6 }, (_, i) => <div className="skeleton skeleton-card" key={i} />)}</div></div>
      <div className="panel"><div className="skeleton skeleton-line" style={{ width: '45%' }} /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line" style={{ width: '80%' }} /></div>
    </div>
  );

  const renderDashboard = () => {
    if (!currentRow) return <div className="empty-state"><strong>{error ? t.unavailable : t.noRows}</strong>{error ? t.retryError : t.noRows}<div style={{ marginTop: 14 }}><button className="refresh-button" onClick={() => void load()}><RotateCw size={14} /> {t.retry}</button></div></div>;
    const scoreNow = score(currentRow, method);
    return <div className="section-stack">
      <div className="dashboard-grid">
        <section className="panel dark-panel outlook-panel">
          <header className="panel-header">
            <div><h2 className="panel-title">{t.outlook}</h2><p className="panel-subtitle">{forecastPlace[0]} · {selectedMethod}</p></div>
            <span className="outlook-time">{fullTime(currentRow.time)}</span>
          </header>
          <div className="metric-grid">
            {metric(t.wind, currentRow.wind, 'kn', 1, 'wind')}
            {metric(t.wave, currentRow.wave, 'm', 1, 'wave')}
            {metric(t.current, currentRow.current, 'kn', 1, 'current')}
            {metric(t.direction, currentRow.dir, '°', 0, 'direction')}
            {metric(t.sea, currentRow.sea, 'm', 2, 'sea-level')}
            {metric(t.rain, currentRow.rain, 'mm', 1, 'rain')}
          </div>
        </section>
        {scorePanel(scoreNow)}
      </div>
      <div className="secondary-grid">
        <section className="panel">
          <header className="panel-header"><div><h2 className="panel-title">{t.todayConditions}</h2><p className="panel-subtitle">{t.noMarine}</p></div><Wind size={18} color="#4d9279" /></header>
          <div className="conditions-row">
            <div><span className="condition-label">{t.gust}</span><strong className="condition-value">{fmt(currentRow.gust)} kn</strong></div>
            <div><span className="condition-label">{t.swell}</span><strong className="condition-value">{fmt(currentRow.swell)} m</strong></div>
            <div><span className="condition-label">{t.direction}</span><strong className="condition-value">{fmt(currentRow.dir, 0)}°</strong></div>
          </div>
        </section>
        {warning}
      </div>
    </div>;
  };

  const renderForecast = () => {
    if (!rows.length) return <div className="empty-state"><strong>{error ? t.unavailable : t.noRows}</strong>{error ? t.retryError : t.noRows}</div>;
    return <div className="section-stack">
      <section className="panel">
        <header className="panel-header"><div><h2 className="panel-title">{t.daily}</h2><p className="panel-subtitle">{forecastPlace[0]} · {selectedMethod}</p></div><CalendarDays size={18} color="#4d9279" /></header>
        <div className="day-list">{days.map(day => {
          const dayRows = rows.filter(row => dayKey(row.time) === day);
          const eligible = dayRows.filter(row => score(row, method) !== null).sort((a, b) => score(b, method)! - score(a, method)!);
          const best = eligible[0];
          const maxWave = dayRows.map(row => row.wave).filter(valid);
          const maxWind = dayRows.map(row => row.wind).filter(valid);
          return <div className="day-row" key={day} data-testid={`forecast-day-${day}`}>
            <div className="day-date">{day}<span className="day-small">{dayRows.length} forecast hours</span></div>
            <div className="day-stat"><small>{t.best}</small>{best ? `${time(best.time)} MVT` : t.noScore}</div>
            <div className="day-stat"><small>{t.maxWave}</small>{maxWave.length ? `${fmt(Math.max(...maxWave))} m` : '—'}</div>
            <div className="day-stat"><small>{t.maxWind}</small>{maxWind.length ? `${fmt(Math.max(...maxWind))} kn` : '—'}</div>
            {best ? <span className="score-chip">{score(best, method)}/100</span> : <span className="score-chip">—</span>}
          </div>;
        })}</div>
      </section>
      <section className="panel">
        <header className="panel-header"><div><h2 className="panel-title">{t.hourly}</h2><p className="panel-subtitle">{t.noMarine}</p></div><Waves size={18} color="#4d9279" /></header>
        <div className="table-scroll"><table className="data-table">
          <thead><tr>{[t.time, t.wind, t.gust, t.rain, t.wave, t.swell, t.current, t.direction, t.sea].map(head => <th key={head}>{head}</th>)}</tr></thead>
          <tbody>{rows.map(row => <tr key={row.time} data-testid={`forecast-row-${row.time}`}>
            <td>{fullTime(row.time)}</td><td>{fmt(row.wind)} kn</td><td>{fmt(row.gust)} kn</td><td>{fmt(row.rain)} mm</td>
            <td>{fmt(row.wave)} m</td><td>{fmt(row.swell)} m</td><td>{fmt(row.current)} kn</td><td>{fmt(row.dir, 0)}°</td><td>{fmt(row.sea, 2)} m</td>
          </tr>)}</tbody>
        </table></div>
      </section>
      {warning}
    </div>;
  };

  const renderTides = () => {
    if (!rows.length) return <div className="empty-state"><strong>{error ? t.unavailable : t.noRows}</strong>{error ? t.retryError : t.noRows}</div>;
    return <div className="section-stack">
      <section className="panel">
        <header className="panel-header"><div><h2 className="panel-title">{t.modeledSea}</h2><p className="panel-subtitle">{t.tideIntro} {t.tideDisclaimer}</p></div><Waves size={18} color="#4d9279" /></header>
        <div className="chart-wrap"><SeaChart values={rows.slice(0, 48).map(row => row.sea)} unit="m" /></div>
        <h3 className="panel-title" style={{ margin: '18px 0 12px', fontSize: 14 }}>{t.turns}</h3>
        {turns.length ? turns.slice(0, 16).map((turn, index) => <div className="turn-row" key={`${turn.time}-${index}`}><span className="turn-kind">{turn.kind === 'High' ? t.highTide : t.lowTide}</span><span className="day-date">{fullTime(turn.time)}</span><span className="day-stat">{fmt(turn.sea, 2)} m</span></div>) : <div className="empty-state">{t.noTurns}</div>}
      </section>
      {warning}
    </div>;
  };

  const renderMoon = () => {
    if (!days.length) return <div className="empty-state"><strong>{error ? t.unavailable : t.noRows}</strong>{error ? t.retryError : t.noRows}</div>;
    return <div className="section-stack">
      <section className="panel">
        <header className="panel-header"><div><h2 className="panel-title">{t.moon}</h2><p className="panel-subtitle">{t.moonIntro}</p></div><Moon size={18} color="#bd9252" /></header>
        {days.map(day => {
          const phase = moonPhase(new Date(`${day}T12:00:00+05:00`));
          return <div className="moon-row" key={day} data-testid={`moon-day-${day}`}>
            <div><div className="moon-day">{day}</div><div className="moon-name">{phase.name}</div></div>
            <div className="illumination" aria-label={`${Math.round(phase.illum * 100)}% ${t.illuminated}`}><div className="illumination-fill" style={{ width: `${Math.round(phase.illum * 100)}%` }} /></div>
            <div className="day-stat">{Math.round(phase.illum * 100)}% <small>{t.illuminated}</small></div>
            <div className="day-stat">{fmt(phase.age)} <small>{t.age}</small></div>
          </div>;
        })}
        <p className="panel-subtitle" style={{ lineHeight: 1.7, marginTop: 18 }}>{t.moonCaution}</p>
      </section>
      {warning}
    </div>;
  };

  const renderAdvisor = () => {
    if (!rows.length) return <div className="empty-state"><strong>{error ? t.unavailable : t.noRows}</strong>{error ? t.retryError : t.noRows}</div>;
    const recommendations = rows.filter(row => row.time >= todayMvt && score(row, method) !== null)
      .sort((a, b) => score(b, method)! - score(a, method)!).slice(0, 8);
    return <div className="section-stack">
      <section className="panel">
        <header className="panel-header"><div><h2 className="panel-title">{t.advisor}</h2><p className="panel-subtitle">{t.advisorIntro}</p></div><Anchor size={18} color="#4d9279" /></header>
        {recommendations.length ? recommendations.map(row => <div className="advisor-item" key={row.time}>
          <strong className="advisor-time">{fullTime(row.time)}</strong>
          <div><div className="day-stat">{t.wind} {fmt(row.wind)} kn · {t.wave} {fmt(row.wave)} m · {t.current} {fmt(row.current)} kn · {t.direction} {fmt(row.dir, 0)}°</div><p className="advisor-detail">{t.assess}</p></div>
          <span className="score-chip">{score(row, method)}/100</span>
        </div>) : <div className="empty-state">{t.noRecommendations}</div>}
      </section>
      <div className="warning-box">{t.scoreNote} {t.safety}</div>
    </div>;
  };

  const renderSettings = () => <div className="section-stack">
    <section className="panel">
      <header className="panel-header"><div><h2 className="panel-title">{t.about}</h2><p className="panel-subtitle">{t.settingsIntro}</p></div><LifeBuoy size={18} color="#4d9279" /></header>
      <div className="about-grid">
        <div>
          <div className="about-fact"><div className="about-label">Masveri AI</div><div className="about-value">{t.version}</div></div>
          <div className="about-fact"><div className="about-label">{t.area}</div><div className="about-value">{places.map(p => p[0]).join(' · ')}</div></div>
          <div className="about-fact"><div className="about-label">Data source</div><div className="about-value">{t.source}</div></div>
        </div>
        <div>
          <div className="about-fact"><div className="about-label">Important</div><div className="about-value">{t.limitations}</div></div>
          <div className="about-fact"><div className="about-label">Safety reference</div><div className="about-value"><a className="text-link" href="https://www.meteorology.gov.mv/" target="_blank" rel="noopener noreferrer">{t.metService}</a></div></div>
          <div className="about-fact"><div className="about-label">{t.suitability}</div><div className="about-value">{t.scoreNote}</div></div>
        </div>
      </div>
      <button className="refresh-button" onClick={() => void load()} disabled={loading}><RotateCw size={14} /> {t.refresh}</button>
    </section>
    {warning}
  </div>;

  const content = () => {
    if (tab === 'settings') return renderSettings();
    if (tab === 'map') return <MarineMap lang={lang} areaName={forecastPlace[0]} areaPoint={{ lat: forecastPlace[1], lon: forecastPlace[2] }} onUsePointForForecast={applyCustomPoint} />;
    if (loading) return renderLoading();
    if (tab === 'dashboard') return renderDashboard();
    if (tab === 'forecast') return renderForecast();
    if (tab === 'tides') return renderTides();
    if (tab === 'moon') return renderMoon();
    return renderAdvisor();
  };

  return <div className="app-shell" dir={direction}>
    <aside className="sidebar" aria-label="Main navigation">
      <div className="brand">
        <div className="brand-mark"><Waves size={22} strokeWidth={2.1} /></div>
        <div><div className="brand-name">masveri ai</div><div className="brand-caption">{t.subtitle}</div></div>
      </div>
      <div className="nav-caption">Field guide</div>
      <nav className="side-nav">{navItems.map(({ id, icon: Icon, key }) => <button key={id} className={`nav-item${tab === id ? ' active' : ''}`} onClick={() => switchTab(id)} aria-current={tab === id ? 'page' : undefined} data-testid={`nav-${id}`}><Icon size={17} /><span>{t[key]}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><strong>FIELD NOTE 01 / SAFETY</strong>{t.scoreNote}</div></div>
    </aside>
    <div className="main-area">
      <header className="topbar">
        <div><div className="topbar-kicker">{t.subtitle}</div><div className="topbar-title">{pageTitle[tab]}</div></div>
        <div className="topbar-tools">
        <span className={`live-tag${error ? ' error' : ''}`}><span className="live-dot" />{loading ? t.loading : error ? t.unavailable : `${t.updated}${lastUpdate ? ` · ${lastUpdate} MVT` : ''}`}</span>
          <button className="language-button" onClick={() => setLang(lang === 'en' ? 'dv' : 'en')} aria-label={lang === 'en' ? 'Switch to Dhivehi' : 'Switch to English'} data-testid="button-language"><Languages size={15} />{lang === 'en' ? 'ދިވެހި' : 'EN'}</button>
          <button className="refresh-button top-refresh" onClick={() => void load()} disabled={loading} aria-label={t.retry} title={t.retry} data-testid="button-refresh">{loading ? <LoaderCircle className="spin" size={15} /> : <RotateCw size={15} />}</button>
        </div>
      </header>
      <main className="content">
        {tab !== 'map' && <div className="page-heading"><div><div className="eyebrow">Maldives · MVT +05:00</div><h1>{tab === 'dashboard' ? t.headline : pageTitle[tab]}</h1><p>{subtitle[tab]}</p></div>{!loading && !error && rows.length > 0 && <span className="live-tag"><span className="live-dot" />{forecastPlace[0]}</span>}</div>}
        {tab !== 'map' && <section className="control-panel" aria-label="Forecast controls">
          <div className="field"><label htmlFor="area-select">{t.area}</label><select id="area-select" value={placeIndex} onChange={event => setPlaceIndex(Number(event.target.value))} data-testid="select-area">{places.map((p, index) => <option value={index} key={p[0]}>{p[0]}</option>)}</select></div>
          <div className="field"><label htmlFor="method-select">{t.method}</label><select id="method-select" value={method} onChange={event => setMethod(event.target.value)} data-testid="select-method">{methods.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></div>
          <button className="refresh-button" onClick={() => void load()} disabled={loading} data-testid="button-reload">{loading ? <LoaderCircle size={15} className="spin" /> : <RotateCw size={15} />}{t.retry}</button>
          <div className={`status-line${error ? ' error' : ''}`} role="status" aria-live="polite">{loading ? `${t.loading} · ${t.loadingDetail}` : error ? t.retryError : `${t.updated}${lastUpdate ? ` · ${lastUpdate} MVT` : ''}`}</div>
        </section>}
        <div key={tab} className="page-content">{content()}</div>
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Main navigation">{navItems.map(({ id, icon: Icon, key }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => switchTab(id)} aria-current={tab === id ? 'page' : undefined} data-testid={`mobile-nav-${id}`}><Icon size={18} /><span>{t[key]}</span></button>)}</nav>
  </div>;
}

export default App;
