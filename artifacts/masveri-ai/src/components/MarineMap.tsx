import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Crosshair, Layers3, MapPin, Navigation, Plus, Target, Trash2 } from 'lucide-react';
import './marine-map.css';

type Lang = 'en' | 'dv';
type Coordinate = { lat: number; lon: number };
type Spot = Coordinate & { id: string; name: string; createdAt: string };
type GpsFix = Coordinate & { accuracy: number; speed: number | null; heading: number | null };
type MarineMapProps = {
  lang: Lang;
  areaName: string;
  areaPoint: Coordinate;
  onUsePointForForecast: (point: Coordinate) => void;
  forecast: { wind: number | null; windDir: number | null; current: number | null; currentDir: number | null; updatedAt: string } | null;
};

const STORAGE_KEY = 'masveri-marine-spots-v1';
maplibregl.setWorkerUrl(maplibreWorkerUrl);
const validCoordinate = (value: Coordinate) =>
  Number.isFinite(value.lat) && value.lat >= -90 && value.lat <= 90 &&
  Number.isFinite(value.lon) && value.lon >= -180 && value.lon <= 180;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const text = {
  en: {
    title: 'Marine map',
    intro: 'Plan around North and South Malé Atolls. Tap the map to mark a fishing spot.',
    notice: 'Planning map only — not for marine navigation. No verified chart depths in Phase 1.',
    locate: 'Locate me',
    locating: 'Finding your location…',
    gpsReady: 'Location received',
    gpsEmpty: 'Choose Locate me to show your current coordinates here.',
    gpsUnavailable: 'Location information is unavailable.',
    gpsDenied: 'Location permission was denied. Check your browser settings and try again.',
    gpsTimeout: 'The location request timed out. Try again in a clearer, open area.',
    gpsUnsupported: 'Location is not supported by this browser.',
    gpsUnexpected: 'Could not get your location. Please try again.',
    latitude: 'Latitude',
    longitude: 'Longitude',
    accuracy: 'Accuracy',
    speed: 'Speed',
    heading: 'Heading',
    selectPoint: 'Selected map point',
    pointHint: 'Tap anywhere on the map to choose a point.',
    layers: 'Map layers',
    basemap: 'Basemap',
    depthZones: 'Depth Zones',
    depthContours: 'Depth Contours',
    wind: 'Wind',
    currents: 'Sea Currents',
    comingSoon: 'Coming soon',
    spots: 'Saved fishing spots',
    noSpots: 'No saved spots yet.',
    noSpotsHint: 'Choose a point on the map or use your current location, then give it a name.',
    saveTitle: 'Save a fishing spot',
    spotName: 'Spot name',
    namePlaceholder: 'e.g. Morning reef edge',
    saveAt: 'Save location at',
    selected: 'Selected point',
    gpsLocation: 'Current GPS location',
    saveSpot: 'Save spot',
    saving: 'Saving…',
    chooseLocation: 'Choose a map point or get your location first.',
    nameRequired: 'Enter a name for this spot.',
    nameTooLong: 'Names must be 1–50 characters.',
    saveFailed: 'Could not save spots on this device. Check available browser storage and try again.',
    storageCorrupt: 'Some saved spot data could not be read. Invalid entries were skipped.',
    mapLoading: 'Loading map…',
    mapError: 'The map could not be loaded. Check your connection and retry.',
    retry: 'Retry map',
    delete: 'Delete',
    flyTo: 'Show spot on map',
    saved: 'Saved',
    mapLabel: 'Interactive planning map',
    gpsMarker: 'Your current location',
    selectedMarker: 'Selected fishing spot point',
    waypoint: 'Saved fishing spot',
    locationSource: 'Location source',
    mapControls: 'Map controls',
    fishingArea: 'Fishing area',
    areaOnMap: 'Shown on map · used by forecasts',
    centerArea: 'Center on fishing area',
    usePoint: 'Use selected point for forecasts',
    pointUsed: 'Forecasts now use the selected point',
    areaMarker: 'Selected fishing area',
    dataUnavailable: 'Data unavailable',
    depthNeedsSource: 'Depth zones and contours need a bathymetry data provider (for example a GEBCO or hydrographic office chart source). None is configured yet, so no depths are shown.',
    overlaySource: 'Source',
    overlayUpdated: 'Forecast hour',
    overlayAtArea: 'At the forecast point',
    overlayNoData: 'No forecast data loaded yet. Load forecasts on the Home tab first.',
    offline: 'Offline',
    online: 'Online',
    offlineNote: 'Offline: the app shell opens from cache, but new map tiles and forecasts need internet.',
  },
  dv: {
    title: 'މެރިން މެޕް',
    intro: 'އުތުރު އަދި ދެކުނު މާލެ އަތޮޅު މަސްބާނާ ޕްލޭން ކުރުމަށް. މަސްބާނާ ތަނެއް ނިޝާންކުރުމަށް މެޕްގައި ޓެޕްކުރޭ.',
    notice: 'މިއީ ޕްލޭނިންގ މެޕެކެވެ — ކަނޑުގައި ދަތުރުކުރުމަށް ނޫން. ފަހުން ޔަޤީންކުރެވިފައިވާ ޗާޓް ފުންމިން ފޭސް 1ގައި ނެތް.',
    locate: 'މަގާމު ހޯދާ',
    locating: 'މަގާމު ހޯދަނީ…',
    gpsReady: 'މަގާމު ލިބިއްޖެ',
    gpsEmpty: 'މިހާރުގެ ކޯއޯޑިނޭޓް ދައްކުމަށް މަގާމު ހޯދާ.',
    gpsUnavailable: 'މަގާމުގެ މަޢުލޫމާތު ނުލިބުނު.',
    gpsDenied: 'މަގާމު ހޯދުމަށް އިޒުން ނުލިބުނު. ބްރައުޒަރ ސެޓިންގްސް ޗެކްކޮށް އަލުން މަސައްކަތްކުރޭ.',
    gpsTimeout: 'މަގާމު ހޯދުމަށް ގިނަ ވަގުތު ނެގިއްޖެ. ހުޅުވި ތަނެއްގައި އަލުން މަސައްކަތްކުރޭ.',
    gpsUnsupported: 'މި ބްރައުޒަރގައި މަގާމު ހޯދުމެއް ނެތް.',
    gpsUnexpected: 'މަގާމު ހޯދުން ނުކުރެވުނު. އަލުން މަސައްކަތްކުރޭ.',
    latitude: 'ލެޓިޓިއުޑް',
    longitude: 'ލޮންގިޓިއުޑް',
    accuracy: 'ސައްޙަކަން',
    speed: 'އުޅުމުގެ ބާރު',
    heading: 'ދިމާ',
    selectPoint: 'މެޕްގައި ނިޝާންކުރި ތަން',
    pointHint: 'ތަނެއް ނިޝާންކުރުމަށް މެޕްގެ ކޮންމެ ތަނަކަށްވެސް ޓެޕްކުރޭ.',
    layers: 'މެޕް ލޭޔަރތައް',
    basemap: 'ބޭސްމެޕް',
    depthZones: 'ފުންމިން ޒޯންތައް',
    depthContours: 'ފުންމިން ކޮންޓޫރުތައް',
    wind: 'ވައި',
    currents: 'ކަނޑު ދިޔަތައް',
    comingSoon: 'އަންނަ ވަގުތު',
    spots: 'ސޭވްކުރި މަސްބާނާ ތަންތައް',
    noSpots: 'އަދި ތަނެއް ސޭވްކުރެވިފައެއް ނެތް.',
    noSpotsHint: 'މެޕްގައި ތަނެއް ނިޝާންކުރުމުން ނުވަތަ މިހާރުގެ މަގާމު ބޭނުންކޮށް ނަމެއް ދޭ.',
    saveTitle: 'މަސްބާނާ ތަނެއް ސޭވްކުރޭ',
    spotName: 'ތަނުގެ ނަން',
    namePlaceholder: 'މިސާލަކަށް: ހެނދުނުގެ ރީފް ކައިރި',
    saveAt: 'ސޭވްކުރާ މަގާމު',
    selected: 'ނިޝާންކުރި ތަން',
    gpsLocation: 'މިހާރުގެ GPS މަގާމު',
    saveSpot: 'ތަން ސޭވްކުރޭ',
    saving: 'ސޭވްކުރަނީ…',
    chooseLocation: 'ފުރަތަމަ މެޕްގައި ތަނެއް ނިޝާންކުރޭ ނުވަތަ މަގާމު ހޯދާ.',
    nameRequired: 'މަސްބާނާ ތަނަށް ނަމެއް ލިޔޭ.',
    nameTooLong: 'ނަން 1–50 އަކުރުގެ ދިގުމިނެއްގައި ވާންވާނެ.',
    saveFailed: 'މި ޑިވައިސްގައި ތަންތައް ސޭވްކުރެވުނު. ބްރައުޒަރ ސްޓޯރޭޖް ޗެކްކޮށް އަލުން މަސައްކަތްކުރޭ.',
    storageCorrupt: 'ސޭވްކުރި ބައެއް ޑޭޓާ ކިޔަން ނުކުޅުނު. ބާތިލު އެންޓްރީތައް ފާއިތުވެއްޖެ.',
    mapLoading: 'މެޕް ލޯޑްވަނީ…',
    mapError: 'މެޕް ލޯޑްވެނުކުޅުނު. އިންޓަރނެޓް ޗެކްކޮށް އަލުންލޯޑްކުރޭ.',
    retry: 'މެޕް އަލުންލޯޑްކުރޭ',
    delete: 'ފުހެލާ',
    flyTo: 'މެޕްގައި ތަން ދައްކާ',
    saved: 'ސޭވްވިއްޖެ',
    mapLabel: 'އިންޓަރެކްޓިވް ޕްލޭނިންގ މެޕް',
    gpsMarker: 'ތިބާގެ މިހާރުގެ މަގާމު',
    selectedMarker: 'ނިޝާންކުރި މަސްބާނާ ތަން',
    waypoint: 'ސޭވްކުރި މަސްބާނާ ތަން',
    locationSource: 'މަގާމުގެ ސަރޗަޝްމަ',
    mapControls: 'މެޕް ކޮންޓްރޯލްތައް',
    fishingArea: 'މަސްބާނާ ސަރަހައްދު',
    areaOnMap: 'މެޕްގައި ދައްކާ · ފޯކާސްޓް ބޭނުންކުރޭ',
    centerArea: 'މަސްބާނާ ސަރަހައްދަށް ދިމާކުރޭ',
    usePoint: 'ނިޝާންކުރި ތަން ފޯކާސްޓްގައި ބޭނުންކުރޭ',
    pointUsed: 'ފޯކާސްޓް މި ތަނުގެ ޑޭޓާ ބޭނުންކުރަނީ',
    areaMarker: 'އިޚްތިޔާރުކުރި މަސްބާނާ ސަރަހައްދު',
    dataUnavailable: 'ޑޭޓާ ނުލިބުނު',
    depthNeedsSource: 'ފުންމިން ޒޯންތަކަށް ފުންމިން ދޭ ސަރަހައްދެއް ބޭނުންވާނީ (މިސާލަކަށް GEBCO ނުވަތަ ހައިޑްރޮގްރަފިކް އޮފީހެއްގެ ޗާޓް). އަދި އެއާ ހަމަޖައްސާފައި ނެތުމުޅައި ފުންމިން ނުދައްކާ.',
    overlaySource: 'ސަރޗަޝްމަ',
    overlayUpdated: 'ފޯކާސްޓް ގަޑިއިރު',
    overlayAtArea: 'ފޯކާސްޓް ތަނުގައި',
    overlayNoData: 'ފޯކާސްޓް ޑޭޓާ އަދި ލޯޑްވެފައި ނެތް. ފުރަތަމަ ފުރަތަމަ ޓެބް ފޯކާސްޓް ލޯޑްކުރޭ.',
    offline: 'އޮފްލައިން',
    online: 'އޮންލައިން',
    offlineNote: 'އޮފްލައިން: އެޕް ކެޗްގައި ހުންނާނެ، ނަމަވެސް އާ މެޕް ޓައިލްތަކާއި ފޯކާސްޓްއަށް އިންޓަރނެޓް ބޭނުންވޭ.',
  },
} as const;

function readSavedSpots(): { spots: Spot[]; corrupt: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { spots: [], corrupt: false };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { spots: [], corrupt: true };
    let corrupt = false;
    const spots = parsed.filter((item): item is Record<string, unknown> => {
      if (!isRecord(item)) { corrupt = true; return false; }
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const valid = typeof item.id === 'string' && item.id.length > 0 &&
        name.length >= 1 && name.length <= 50 &&
        typeof item.lat === 'number' && typeof item.lon === 'number' &&
        validCoordinate({ lat: item.lat, lon: item.lon }) &&
        typeof item.createdAt === 'string';
      if (!valid) corrupt = true;
      return valid;
    }).map(item => ({
      id: item.id as string,
      name: (item.name as string).trim(),
      lat: item.lat as number,
      lon: item.lon as number,
      createdAt: item.createdAt as string,
    }));
    return { spots, corrupt };
  } catch {
    return { spots: [], corrupt: true };
  }
}

function makeMarkerElement(className: string, label: string, title?: string) {
  const el = document.createElement('div');
  el.className = className;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', label);
  if (title) el.title = title;
  return el;
}

export function MarineMap({ lang, areaName, areaPoint, onUsePointForForecast, forecast }: MarineMapProps) {
  const t = text[lang];
  const isDv = lang === 'dv';
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selectionMarker = useRef<Marker | null>(null);
  const gpsMarker = useRef<Marker | null>(null);
  const spotMarkers = useRef<Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState<Coordinate | null>(null);
  const [gpsFix, setGpsFix] = useState<GpsFix | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [spots, setSpots] = useState<Spot[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [storageCorrupt, setStorageCorrupt] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [spotName, setSpotName] = useState('');
  const [saveSource, setSaveSource] = useState<'selected' | 'gps'>('selected');
  const [formError, setFormError] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);
  const [pointUsedNotice, setPointUsedNotice] = useState(false);
  const [showWind, setShowWind] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showDepthNote, setShowDepthNote] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const areaMarkerRef = useRef<Marker | null>(null);
  const overlayMarkerRef = useRef<Marker | null>(null);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    const loaded = readSavedSpots();
    setSpots(loaded.spots);
    setStorageCorrupt(loaded.corrupt);
    setStorageReady(true);
  }, []);

  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;
    setMapReady(false);
    setMapError(false);
    let loaded = false;
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [73.51, 4.18],
        zoom: 9,
        attributionControl: false,
      });
    } catch {
      setMapError(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-right');
    const onLoad = () => {
      loaded = true;
      setMapReady(true);
      map.resize();
      const zoomIn = container.querySelector<HTMLButtonElement>('.maplibregl-ctrl-zoom-in');
      const zoomOut = container.querySelector<HTMLButtonElement>('.maplibregl-ctrl-zoom-out');
      const compass = container.querySelector<HTMLButtonElement>('.maplibregl-ctrl-compass');
      if (zoomIn) { zoomIn.setAttribute('aria-label', isDv ? 'ޒޫމް އިތުރުކުރޭ' : 'Zoom in'); zoomIn.title = isDv ? 'ޒޫމް އިތުރުކުރޭ' : 'Zoom in'; }
      if (zoomOut) { zoomOut.setAttribute('aria-label', isDv ? 'ޒޫމް ކުޑަކުރޭ' : 'Zoom out'); zoomOut.title = isDv ? 'ޒޫމް ކުޑަކުރޭ' : 'Zoom out'; }
      if (compass) { compass.setAttribute('aria-label', isDv ? 'ކޮމްޕާސް އަލުން ހަދާ' : 'Reset compass bearing'); compass.title = isDv ? 'ކޮމްޕާސް އަލުން ހަދާ' : 'Reset compass bearing'; }
    };
    const onError = () => { if (!loaded) setMapError(true); };
    const onMapClick = (event: { lngLat: { lat: number; lng: number } }) => {
      const point = { lat: event.lngLat.lat, lon: event.lngLat.lng };
      if (validCoordinate(point)) {
        setSelectedPoint(point);
        setSaveSource('selected');
        setFormError('');
      }
    };
    map.on('load', onLoad);
    map.on('error', onError);
    map.on('click', onMapClick);
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => map.resize());
    });
    observer.observe(container);
    requestAnimationFrame(() => map.resize());
    return () => {
      observer.disconnect();
      selectionMarker.current?.remove();
      selectionMarker.current = null;
      gpsMarker.current?.remove();
      gpsMarker.current = null;
      areaMarkerRef.current?.remove();
      areaMarkerRef.current = null;
      spotMarkers.current.forEach(marker => marker.remove());
      spotMarkers.current = [];
      map.off('load', onLoad);
      map.off('error', onError);
      map.off('click', onMapClick);
      map.remove();
      mapRef.current = null;
    };
  }, [mapAttempt, isDv]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    selectionMarker.current?.remove();
    selectionMarker.current = null;
    if (selectedPoint) {
      const marker = makeMarkerElement('marine-map__pin marine-map__pin--selected', t.selectedMarker);
      selectionMarker.current = new maplibregl.Marker({ element: marker, anchor: 'bottom' })
        .setLngLat([selectedPoint.lon, selectedPoint.lat]).addTo(map);
    }
  }, [selectedPoint, mapReady, t.selectedMarker]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    areaMarkerRef.current?.remove();
    areaMarkerRef.current = null;
    const marker = makeMarkerElement('marine-map__pin marine-map__pin--area', t.areaMarker, areaName);
    areaMarkerRef.current = new maplibregl.Marker({ element: marker, anchor: 'bottom' })
      .setLngLat([areaPoint.lon, areaPoint.lat]).addTo(map);
  }, [areaPoint, mapReady, t.areaMarker, areaName]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    gpsMarker.current?.remove();
    gpsMarker.current = null;
    if (gpsFix) {
      const marker = makeMarkerElement('marine-map__pin marine-map__pin--gps', t.gpsMarker);
      gpsMarker.current = new maplibregl.Marker({ element: marker, anchor: 'center' })
        .setLngLat([gpsFix.lon, gpsFix.lat]).addTo(map);
    }
  }, [gpsFix, mapReady, t.gpsMarker]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    spotMarkers.current.forEach(marker => marker.remove());
    spotMarkers.current = spots.map(spot => {
      const element = makeMarkerElement('marine-map__pin marine-map__pin--spot', `${t.waypoint}: ${spot.name}`, spot.name);
      return new maplibregl.Marker({ element, anchor: 'bottom' })
        .setLngLat([spot.lon, spot.lat]).addTo(map);
    });
  }, [spots, mapReady, t.waypoint]);

  const locateMe = useCallback(() => {
    setGpsError('');
    setGpsBusy(true);
    if (!navigator.geolocation || typeof navigator.geolocation.getCurrentPosition !== 'function') {
      setGpsError('unsupported');
      setGpsBusy(false);
      return;
    }
    try {
      navigator.geolocation.getCurrentPosition(
        position => {
          const coords = position.coords;
          const fix = {
            lat: coords.latitude,
            lon: coords.longitude,
            accuracy: coords.accuracy,
            speed: typeof coords.speed === 'number' && Number.isFinite(coords.speed) && coords.speed >= 0 ? coords.speed : null,
            heading: typeof coords.heading === 'number' && Number.isFinite(coords.heading) && coords.heading >= 0 ? coords.heading : null,
          };
          if (!validCoordinate(fix) || !Number.isFinite(fix.accuracy) || fix.accuracy < 0) {
            setGpsError('unexpected');
          } else {
            setGpsFix(fix);
            setGpsError('');
            setSaveSource('gps');
            mapRef.current?.flyTo({ center: [fix.lon, fix.lat], zoom: Math.max(mapRef.current.getZoom(), 12), duration: 800 });
          }
          setGpsBusy(false);
        },
        error => {
          const code = error.code === 1 ? 'denied' : error.code === 2 ? 'unavailable' : error.code === 3 ? 'timeout' : 'unexpected';
          setGpsError(code);
          setGpsBusy(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    } catch {
      setGpsError('unexpected');
      setGpsBusy(false);
    }
  }, []);

  const persistSpots = (next: Spot[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSpots(next);
      setStorageError(false);
      setStorageCorrupt(false);
      return true;
    } catch {
      setStorageError(true);
      return false;
    }
  };

  const saveSpot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setSavedNotice(false);
    const name = spotName.trim();
    if (!name) { setFormError('required'); return; }
    if (name.length > 50) { setFormError('tooLong'); return; }
    const location = saveSource === 'selected' ? selectedPoint : gpsFix;
    if (!location || !validCoordinate(location)) { setFormError('location'); return; }
    const spot: Spot = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      lat: location.lat,
      lon: location.lon,
      createdAt: new Date().toISOString(),
    };
    if (persistSpots([spot, ...spots])) {
      setSpotName('');
      setSavedNotice(true);
    }
  };

  const deleteSpot = (id: string) => persistSpots(spots.filter(spot => spot.id !== id));
  const flyToSpot = (spot: Spot) => {
    mapRef.current?.flyTo({ center: [spot.lon, spot.lat], zoom: Math.max(mapRef.current.getZoom(), 12), duration: 850 });
  };
  const formatCoordinate = (value: number) => value.toFixed(5);
  const gpsErrorText = gpsError === 'denied' ? t.gpsDenied :
    gpsError === 'unavailable' ? t.gpsUnavailable :
    gpsError === 'timeout' ? t.gpsTimeout :
    gpsError === 'unsupported' ? t.gpsUnsupported :
    gpsError === 'unexpected' ? t.gpsUnexpected : '';
  const formErrorText = formError === 'required' ? t.nameRequired :
    formError === 'tooLong' ? t.nameTooLong :
    formError === 'location' ? t.chooseLocation :
    formError === 'storage' ? t.saveFailed : '';

  return (
    <section className="marine-map" dir={isDv ? 'rtl' : 'ltr'} lang={lang} data-testid="marine-map-screen">
      <header className="marine-map__heading">
        <div>
          <div className="marine-map__eyebrow"><span aria-hidden="true" /> {isDv ? 'މަސްވެރި ފީލްޑް ޓޫލްސް' : 'MASVERI FIELD TOOLS'}</div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        <button className="marine-map__locate" onClick={locateMe} disabled={gpsBusy} data-testid="button-locate-me" type="button">
          <Crosshair size={16} aria-hidden="true" />
          {gpsBusy ? t.locating : t.locate}
        </button>
      </header>

      <div className="marine-map__notice" role="note" data-testid="notice-navigation-limitation">
        <Navigation size={16} aria-hidden="true" />
        <span>{t.notice}</span>
      </div>

      {gpsErrorText && <div className="marine-map__message marine-map__message--error" role="alert" data-testid="status-gps-error">{gpsErrorText}</div>}
      {storageCorrupt && <div className="marine-map__message" role="status" data-testid="status-storage-corrupt">{t.storageCorrupt}</div>}
      {storageError && <div className="marine-map__message marine-map__message--error" role="alert" data-testid="status-storage-error">{t.saveFailed}</div>}

      <div className="marine-map__workspace">
        <div className="marine-map__map-column">
          <div className="marine-map__map-frame">
            <div ref={mapContainer} className="marine-map__canvas" role="region" aria-label={t.mapLabel} data-testid="marine-map-canvas" />
            {!mapReady && !mapError && <div className="marine-map__map-state" role="status" data-testid="status-map-loading">{t.mapLoading}</div>}
            {mapError && <div className="marine-map__map-state marine-map__map-state--error" role="alert" data-testid="status-map-error">
              <span>{t.mapError}</span>
              <button type="button" onClick={() => setMapAttempt(value => value + 1)} data-testid="button-retry-map">{t.retry}</button>
            </div>}
          </div>
          <div className="marine-map__map-caption">
            <span><MapPin size={14} aria-hidden="true" /> {selectedPoint ? t.selectPoint : t.pointHint}</span>
            {selectedPoint && <span className="marine-map__coordinates" data-testid="text-selected-coordinates">
              {formatCoordinate(selectedPoint.lat)}, {formatCoordinate(selectedPoint.lon)}
            </span>}
          </div>
          {selectedPoint && <button className="marine-map__use-point" type="button"
            onClick={() => { onUsePointForForecast(selectedPoint); setPointUsedNotice(true); }}
            data-testid="button-use-point">
            <Target size={14} aria-hidden="true" /> {t.usePoint}
          </button>}
          {pointUsedNotice && <p className="marine-map__form-success" role="status" data-testid="status-point-used">{t.pointUsed}</p>}
        </div>

        <aside className="marine-map__rail" aria-label={t.title}>
          <section className="marine-map__card marine-map__area-card" aria-label={t.fishingArea}>
            <div className="marine-map__card-heading">
              <span className="marine-map__icon"><MapPin size={16} aria-hidden="true" /></span>
              <div><h2>{t.fishingArea}</h2><p>{areaName}</p></div>
            </div>
            <p className="marine-map__area-note">{t.areaOnMap}</p>
            <button className="marine-map__center-area" type="button" data-testid="button-center-area"
              onClick={() => mapRef.current?.flyTo({ center: [areaPoint.lon, areaPoint.lat], zoom: Math.max(mapRef.current.getZoom(), 11), duration: 800 })}>
              <Crosshair size={14} aria-hidden="true" /> {t.centerArea}
            </button>
          </section>

          <section className="marine-map__card marine-map__gps" aria-label={t.locate}>
            <div className="marine-map__card-heading">
              <span className="marine-map__icon"><Crosshair size={16} aria-hidden="true" /></span>
              <div><h2>{t.locate}</h2><p>{gpsFix ? t.gpsReady : t.pointHint}</p></div>
            </div>
            {gpsFix ? <div className="marine-map__gps-data" data-testid="gps-readout">
              <div><span>{t.latitude}</span><strong>{formatCoordinate(gpsFix.lat)}°</strong></div>
              <div><span>{t.longitude}</span><strong>{formatCoordinate(gpsFix.lon)}°</strong></div>
              <div><span>{t.accuracy}</span><strong>{gpsFix.accuracy.toFixed(0)} m</strong></div>
              {gpsFix.speed !== null && <div><span>{t.speed}</span><strong>{(gpsFix.speed * 1.943844).toFixed(1)} kn</strong></div>}
              {gpsFix.heading !== null && <div><span>{t.heading}</span><strong>{gpsFix.heading.toFixed(0)}°</strong></div>}
            </div> : <p className="marine-map__gps-empty" data-testid="gps-empty-state">{t.gpsEmpty}</p>}
          </section>

          <section className="marine-map__card marine-map__layers">
            <div className="marine-map__section-heading"><Layers3 size={16} aria-hidden="true" /><h2>{t.layers}</h2></div>
            <div className="marine-map__layer-list">
              <div className="marine-map__layer marine-map__layer--active"><span className="marine-map__layer-dot" /><span>{t.basemap}</span><span className="marine-map__active-tag">{isDv ? 'އެކްޓިވް' : 'Active'}</span></div>
              <label className={`marine-map__layer marine-map__layer--toggle${forecast ? '' : ' marine-map__layer--disabled'}`}>
                <input type="checkbox" checked={showWind} disabled={!forecast} onChange={event => setShowWind(event.target.checked)} data-testid="toggle-layer-wind" />
                <span>{t.wind}</span><span className="marine-map__active-tag">{forecast ? (isDv ? 'ލިބިއްޖެ' : 'Live') : t.dataUnavailable}</span>
              </label>
              <label className={`marine-map__layer marine-map__layer--toggle${forecast ? '' : ' marine-map__layer--disabled'}`}>
                <input type="checkbox" checked={showCurrent} disabled={!forecast} onChange={event => setShowCurrent(event.target.checked)} data-testid="toggle-layer-current" />
                <span>{t.currents}</span><span className="marine-map__active-tag">{forecast ? (isDv ? 'ލިބިްޖެ' : 'Live') : t.dataUnavailable}</span>
              </label>
              {[t.depthZones, t.depthContours].map((label, index) => (
                <button type="button" className="marine-map__layer marine-map__layer--disabled" key={label} onClick={() => setShowDepthNote(true)} aria-disabled="true" data-testid={`layer-coming-soon-${index}`}>
                  <span className="marine-map__layer-dot" /><span>{label}</span><span className="marine-map__soon">{t.dataUnavailable}</span>
                </button>
              ))}
            </div>
            {showDepthNote && <p className="marine-map__depth-note" role="note" data-testid="note-depth-unavailable">
              <strong>{t.dataUnavailable}.</strong> {t.depthNeedsSource}
            </p>}
          </section>

          <section className="marine-map__card marine-map__save-card">
            <div className="marine-map__section-heading"><Plus size={16} aria-hidden="true" /><h2>{t.saveTitle}</h2></div>
            <form onSubmit={saveSpot} className="marine-map__form" data-testid="marine-map-save-form" noValidate>
              <label htmlFor="marine-spot-name">{t.spotName}</label>
              <input
                id="marine-spot-name"
                data-testid="input-spot-name"
                type="text"
                maxLength={100}
                value={spotName}
                placeholder={t.namePlaceholder}
                onChange={event => { setSpotName(event.target.value); setFormError(''); setSavedNotice(false); }}
                aria-invalid={Boolean(formErrorText)}
                aria-describedby={formErrorText ? 'marine-form-message' : undefined}
              />
              <fieldset>
                <legend>{t.saveAt}</legend>
                <label className={`marine-map__radio${!selectedPoint ? ' marine-map__radio--unavailable' : ''}`}>
                  <input type="radio" name="marine-save-source" value="selected" checked={saveSource === 'selected'} disabled={!selectedPoint} onChange={() => setSaveSource('selected')} data-testid="radio-save-selected" />
                  <span>{t.selected}</span>
                </label>
                <label className={`marine-map__radio${!gpsFix ? ' marine-map__radio--unavailable' : ''}`}>
                  <input type="radio" name="marine-save-source" value="gps" checked={saveSource === 'gps'} disabled={!gpsFix} onChange={() => setSaveSource('gps')} data-testid="radio-save-gps" />
                  <span>{t.gpsLocation}</span>
                </label>
              </fieldset>
              {formErrorText && <p className="marine-map__form-message" id="marine-form-message" role="alert" data-testid="status-save-error">{formErrorText}</p>}
              {savedNotice && <p className="marine-map__form-success" role="status" data-testid="status-spot-saved">{t.saved}</p>}
              <button className="marine-map__save-button" type="submit" disabled={!storageReady} data-testid="button-save-spot">{t.saveSpot}</button>
            </form>
          </section>

          <section className="marine-map__card marine-map__spots-card">
            <div className="marine-map__section-heading marine-map__spots-heading">
              <div><MapPin size={16} aria-hidden="true" /><h2>{t.spots}</h2></div>
              <span className="marine-map__count">{spots.length}</span>
            </div>
            {!storageReady ? <div className="marine-map__spot-skeleton" aria-label={t.mapLoading} /> :
              spots.length === 0 ? <div className="marine-map__empty-spots" data-testid="empty-saved-spots">
                <span className="marine-map__empty-mark"><MapPin size={17} aria-hidden="true" /></span>
                <strong>{t.noSpots}</strong><p>{t.noSpotsHint}</p>
              </div> :
              <ul className="marine-map__spot-list">
                {spots.map((spot, index) => <li key={spot.id} className="marine-map__spot-row" data-testid={`waypoint-row-${spot.id}`}>
                  <span className="marine-map__spot-index">{String(index + 1).padStart(2, '0')}</span>
                  <button className="marine-map__spot-main" type="button" onClick={() => flyToSpot(spot)} aria-label={`${t.flyTo}: ${spot.name}`} data-testid={`waypoint-fly-${spot.id}`}>
                    <strong>{spot.name}</strong><span>{formatCoordinate(spot.lat)}, {formatCoordinate(spot.lon)}</span>
                  </button>
                  <button className="marine-map__delete" type="button" onClick={() => deleteSpot(spot.id)} aria-label={`${t.delete}: ${spot.name}`} title={t.delete} data-testid={`waypoint-delete-${spot.id}`}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </li>)}
              </ul>}
          </section>
        </aside>
      </div>
    </section>
  );
}

export default MarineMap;
