/* roots.js — Family Roots stage: rotating abstract globe → country map → path to pendant
   Visual language: warm off-white bg, electric blue linework, orange accent points.
   This is about meaningful family-story geography, not demographic classification. */

import { openKeyboardFor } from './virtual-keyboard.js';

const BLUE = '#282828';
const ORANGE = '#fb5716';

const SPARKLE_IMG = new Image();
SPARKLE_IMG.src = '/image/v5-sparkle.png';

/* ── Continent silhouettes (lon, lat) — detailed coastlines. Each polygon
   is a closed ring; points are listed clockwise. Hand-traced from memory
   of major coastline features so the globe reads as geographically real
   while staying lightweight (no GeoJSON dataset). ── */
/* Continent silhouettes — detailed coastline polygons traced from a
   real-world world map, simplified but with enough resolution to read
   as the actual continents. Each ring lists [lon, lat] points in
   CLOCKWISE order (no doubling back, no self-intersections).
   Neighbouring continents are split along clear geographic boundaries
   (Suez/Sinai for Africa-Asia, Urals + Caspian + Caucasus for
   Europe-Asia, Panama Isthmus for the Americas) so they don't overlap. */
const CONTINENTS = [
  { id:'namerica', name:'צפון אמריקה',
    center:[-100,48],
    poly:[
      // === Alaska north shore (Beaufort Sea) ===
      [-168,66],   // Bering Strait near Cape Prince of Wales
      [-160,71],   // Point Lay
      [-156,71],   // Point Barrow (northernmost US)
      [-148,70],   // Prudhoe Bay
      [-141,70],   // Demarcation Point (US/Canada border)
      // === Canadian Arctic / north coast ===
      [-130,69],   // Mackenzie Delta
      [-120,69],   // Amundsen Gulf
      [-110,68],   // Coronation Gulf
      [-100,69],   // Queen Maud Gulf
      [-90,68],    // Boothia Peninsula base
      [-85,70],    // NW Hudson Bay area
      // Hudson Bay west shore
      [-85,62],
      // Hudson Bay south
      [-80,55],
      // Hudson Bay east → Quebec
      [-78,60],
      // === Labrador / NE Canada ===
      [-65,60],    // Ungava Bay
      [-60,58],    // Labrador coast
      [-56,52],    // Newfoundland area
      // === East coast US ===
      [-63,47],    // Nova Scotia
      [-67,45],    // Bay of Fundy / Maine
      [-70,43],    // Cape Cod
      [-72,41],    // Long Island
      [-75,38],    // Chesapeake / Delaware
      [-76,35],    // Cape Hatteras
      [-79,33],    // Charleston
      [-81,31],    // Savannah / Jacksonville
      [-80,28],    // Florida east (Cape Canaveral)
      [-80,25],    // Miami / Florida Keys
      [-82,24.5],  // Florida southern tip
      // === Gulf of Mexico (west arc) ===
      [-83,29],    // Tampa Bay / Florida west
      [-86,30],    // Pensacola
      [-89,30],    // Mississippi delta
      [-94,29],    // Galveston / Texas
      [-97,26],    // Brownsville / Mexican border
      // === Mexican east coast & Yucatan ===
      [-97,21],    // Veracruz
      [-91,21],    // Bay of Campeche
      [-87,21],    // Yucatan NW (Mérida)
      [-87,18],    // Yucatan east / Belize
      // === Central America east coast ===
      [-83,15],    // Honduras
      [-83,11],    // Nicaragua east
      [-81,9],     // Costa Rica
      // === Panama narrow (boundary with South America) ===
      [-77,9],
      // === Central America Pacific coast (going north) ===
      [-83,8],     // Panama Pacific
      [-86,11],    // Nicaragua Pacific
      [-88,13],    // El Salvador
      [-93,15],    // Guatemala Pacific / Tehuantepec
      [-96,16],    // Oaxaca
      [-100,17],   // Guerrero
      [-105,20],   // Jalisco
      [-106,23],   // Mazatlán
      // === Baja California peninsula ===
      [-110,23],   // Cabo San Lucas
      [-113,28],   // mid Baja
      [-115,30],   // Baja north
      [-117,32],   // Tijuana / San Diego
      // === US west coast ===
      [-118,34],   // Los Angeles
      [-122,37],   // San Francisco
      [-124,40],   // Cape Mendocino
      [-124,46],   // Oregon
      [-124,48],   // Olympic Peninsula / Strait of Juan de Fuca
      // === BC + Alaska panhandle ===
      [-128,52],   // Vancouver Island
      [-132,55],   // Prince Rupert
      [-136,58],   // SE Alaska
      [-145,60],   // Yakutat / Gulf of Alaska
      [-152,60],   // Cook Inlet (Anchorage)
      [-158,57],   // Alaska Peninsula
      [-162,55],   // Aleutian east
      [-165,55],   // Unalaska area
      // back up to Bering Strait
      [-166,60],
      [-168,66]    // close
    ] },
  { id:'samerica', name:'דרום אמריקה',
    center:[-60,-15],
    poly:[
      // === Panama narrow (boundary with North America) ===
      [-77,8],
      // === Caribbean coast east ===
      [-77,11],    // Colombia (Cartagena)
      [-72,12],    // Guajira Peninsula
      [-67,11],    // Venezuela coast
      [-62,10],    // Paria peninsula
      [-58,8],     // Guyana
      [-54,5],     // Suriname / French Guiana
      // === Brazil NE — Amazon mouth → eastern bulge ===
      [-50,1],     // Amazon delta
      [-44,-2],    // Sao Luis
      [-39,-4],    // Fortaleza
      [-35,-6],    // Recife / Cabo Branco (Brazil's easternmost point)
      [-36,-9],    // Maceio
      [-38,-13],   // Salvador / Bahia
      [-40,-18],   // Vitória
      [-43,-22],   // Rio de Janeiro
      [-46,-24],   // São Paulo coast
      [-48,-26],   // Paraná
      // === Río de la Plata / Argentine east coast ===
      [-54,-34],   // Montevideo / Rio de la Plata
      [-57,-38],   // Buenos Aires / Mar del Plata
      [-62,-40],   // Bahía Blanca
      [-64,-44],   // Comodoro Rivadavia / Patagonia
      [-66,-50],   // Santa Cruz
      [-68,-53],   // Tierra del Fuego east
      // === Cape Horn ===
      [-67,-55.5], // Cape Horn (southernmost tip)
      // === West coast going north ===
      [-74,-53],   // Magellan Strait / Tierra del Fuego west
      [-75,-50],   // Chile fjords
      [-74,-45],   // Aysén
      [-74,-40],   // Puerto Montt area
      [-73,-37],   // Concepción
      [-72,-32],   // Valparaíso / Santiago coast
      [-71,-28],   // Antofagasta
      [-71,-20],   // Iquique / Arica
      [-77,-12],   // Lima / Peru coast
      [-81,-5],    // Piura / Gulf of Guayaquil
      [-80,-2],    // Guayaquil
      [-80,1],     // Esmeraldas (Ecuador)
      [-78,3],     // Tumaco (Colombia Pacific)
      [-77,6],     // Buenaventura
      // back to Panama
      [-77,8]
    ] },
  { id:'europe',   name:'אירופה',
    center:[15,55],
    poly:[
      // SW Iberia (Gibraltar)
      [-9,36],
      // Portuguese Atlantic coast up to NW Iberia
      [-9,43],
      // French Atlantic coast → English Channel
      [-2,46], [-2,49], [2,51],
      // North-European lowlands / Denmark
      [8,55], [12,57],
      // Norwegian + Swedish west coast up to North Cape
      [11,63], [16,67], [25,71], [32,69],
      // Russian Arctic coast east to White Sea / Kola
      [45,67],
      // North Urals (Europe-Asia boundary)
      [60,67], [60,58],
      // South Urals down to the Caspian Sea NW shore
      [55,52], [50,48],
      // Caspian Sea NW + Caucasus boundary
      [48,45], [42,43],
      // Black Sea north shore
      [38,46], [32,46], [28,42],
      // Bosporus / Aegean
      [25,40], [22,38],
      // Italian / Adriatic east edge of the Balkans
      [19,42], [16,41],
      // Italian peninsula (toe + heel)
      [18,40], [14,40],
      // Italy north + S French Mediterranean coast
      [10,44], [4,43],
      // Spanish Med coast back to Gibraltar
      [-2,37], [-9,36]
    ] },
  { id:'africa',   name:'אפריקה',
    center:[20,2],
    poly:[
      // NW corner — Morocco / Gibraltar side
      [-10,32],
      // Mediterranean coast east: Algeria → Tunisia → Libya → Egypt
      [-2,36], [10,37], [20,32], [31,31],
      // Suez / Sinai (boundary with Asia)
      [34,29],
      // Red Sea west coast → Horn of Africa
      [38,18], [43,12], [51,11],
      // East coast: Somalia → Kenya → Tanzania → Mozambique
      [42,2], [40,-8], [40,-22], [35,-26],
      // South Africa — Cape Agulhas / Cape of Good Hope
      [28,-34], [18,-34],
      // West coast: Namibia → Angola → Gabon → Gulf of Guinea
      [12,-22], [12,-7], [8,2], [3,5],
      // West African bulge: Liberia → Sierra Leone → Senegal
      [-9,5], [-15,11], [-17,16], [-15,22],
      // Mauritania / Western Sahara back up
      [-13,28], [-10,32]
    ] },
  { id:'asia',     name:'אסיה',
    center:[90,45],
    poly:[
      // Bosporus (boundary with Europe)
      [29,41],
      // East Anatolia / Caucasus south
      [40,38],
      // Mediterranean / Levant coast south
      [36,35], [34,32],
      // Suez / Sinai (boundary with Africa)
      [34,29],
      // Arabian peninsula — Red Sea east coast → Aden → Oman
      [42,18], [50,13], [55,18], [58,24],
      // Persian Gulf NW / S Iran / Pakistan / India W
      [55,26], [60,25], [68,25], [72,22],
      // India south tip + east coast
      [78,8], [82,18], [88,22],
      // Bay of Bengal / Burma / Malay peninsula tip
      [95,16], [98,12], [104,2],
      // Indochina east coast / South China Sea
      [108,12], [110,22],
      // China east coast
      [120,32], [122,37],
      // Korean peninsula
      [128,35], [129,38],
      // Sea of Japan / Japan (mainland Asia continues)
      [136,42],
      // Russian Far East: Sakhalin / Kamchatka south
      [142,54], [160,55],
      // Bering Strait / NE Siberia
      [175,65],
      // Russian Arctic north coast east → west
      [160,72], [130,73], [100,76], [80,75],
      // Down to North Urals (boundary with Europe)
      [60,67],
      // South along Urals to the Caspian NE
      [60,58], [55,52], [50,48],
      // Caspian east / Caucasus boundary back to Bosporus
      [50,42], [42,42], [35,40], [29,41]
    ] },
  { id:'oceania',  name:'אוסטרליה',
    center:[133,-25],
    poly:[
      // Cape York (north tip of Australia)
      [142,-12],
      // Queensland east coast south
      [148,-20], [152,-28], [150,-34],
      // SE corner: Sydney / Victoria
      [145,-39],
      // South coast: Great Australian Bight → SW corner
      [135,-37], [125,-33], [115,-34],
      // West coast: Perth → Pilbara
      [114,-22], [122,-18],
      // Top end / Kimberley / Arnhem Land
      [128,-15], [135,-12], [142,-12]
    ] },
];

/* ── Country reference points: Hebrew name → [lat, lon] ── */
const COUNTRIES = {
  'מרוקו':[31.7,-7.1], 'אלג׳יריה':[28.0,1.7], 'תוניסיה':[33.9,9.5], 'לוב':[26.3,17.2],
  'מצרים':[26.8,30.8], 'אתיופיה':[9.1,40.5], 'דרום אפריקה':[-30.6,22.9],
  'תימן':[15.5,48.5], 'עיראק':[33.2,43.7], 'איראן':[32.4,53.7], 'סוריה':[34.8,38.9],
  'לבנון':[33.8,35.8], 'ירדן':[30.6,36.2], 'תורכיה':[38.9,35.2], 'סעודיה':[23.9,45.1],
  'איחוד האמירויות':[23.4,53.8], 'הודו':[20.6,78.9], 'אוזבקיסטן':[41.4,64.6],
  'גאורגיה':[42.3,43.4], 'אזרבייג׳ן':[40.1,47.6], 'קזחסטן':[48.0,66.9],
  'סין':[35.9,104.2], 'יפן':[36.2,138.3], 'תאילנד':[15.9,100.9], 'וייטנאם':[14.1,108.3],
  'יוון':[39.0,21.8], 'בולגריה':[42.7,25.5], 'רומניה':[45.9,24.9], 'הונגריה':[47.1,19.5],
  'אוקראינה':[48.4,31.2], 'רוסיה':[61.5,105.3], 'בלארוס':[53.7,27.9],
  'גרמניה':[51.2,10.4], 'צרפת':[46.2,2.2], 'ספרד':[40.5,-3.7], 'איטליה':[41.9,12.6],
  'פולין':[51.9,19.1], 'פורטוגל':[39.4,-8.2], 'הולנד':[52.1,5.3], 'בלגיה':[50.5,4.5],
  'אוסטריה':[47.5,14.6], 'שוויץ':[46.8,8.2], "צ'כיה":[49.8,15.5], 'סלובקיה':[48.7,19.7],
  'קרואטיה':[45.1,15.2], 'סרביה':[44.0,21.0], 'ליטא':[55.2,23.9], 'לטביה':[56.9,24.6],
  'אסטוניה':[58.6,25.0], 'אנגליה':[55.4,-3.4], 'בריטניה':[55.4,-3.4], 'אירלנד':[53.4,-8.2],
  'שוודיה':[60.1,18.6], 'נורווגיה':[60.5,8.5], 'דנמרק':[56.3,9.5], 'פינלנד':[61.9,25.7],
  'ארה"ב':[37.1,-95.7], 'אמריקה':[37.1,-95.7], 'קנדה':[56.1,-106.3], 'מקסיקו':[23.6,-102.5],
  'ארגנטינה':[-38.4,-63.6], 'ברזיל':[-14.2,-51.9], "צ'ילה":[-35.7,-71.5],
  'קולומביה':[4.6,-74.3], 'פרו':[-9.2,-75.0], 'ונצואלה':[6.4,-66.6], 'קובה':[21.5,-77.8],
  'אוסטרליה':[-25.3,133.8], 'ניו זילנד':[-40.9,174.9], 'קוריאה':[36.5,127.8],
};
const COUNTRY_KEYS = Object.keys(COUNTRIES).map(k=>({ key:k, n:norm(k) }));

function norm(s){
  return (s||'').toString().trim().toLowerCase().replace(/["'׳״]/g,'').replace(/\s+/g,'');
}
function findCountry(input){
  const n = norm(input); if(!n) return null;
  for(const {key} of COUNTRY_KEYS) if(norm(key)===n) return { name:key, lat:COUNTRIES[key][0], lon:COUNTRIES[key][1] };
  for(const {key,n:kn} of COUNTRY_KEYS) if(kn.includes(n)||n.includes(kn)) return { name:key, lat:COUNTRIES[key][0], lon:COUNTRIES[key][1] };
  return null;
}

function easeInOut(t){ t=Math.max(0,Math.min(1,t)); return t<.5?2*t*t:-1+(4-2*t)*t; }
function easeOut(t){ t=Math.max(0,Math.min(1,t)); return 1-(1-t)*(1-t); }

function pointInPolygon(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const CONTINENT_BBOXES = CONTINENTS.map(c => {
  let lonMin = 180, lonMax = -180, latMin = 90, latMax = -90;
  c.poly.forEach(([lon, lat]) => {
    lonMin = Math.min(lonMin, lon);
    lonMax = Math.max(lonMax, lon);
    latMin = Math.min(latMin, lat);
    latMax = Math.max(latMax, lat);
  });
  return {
    id: c.id,
    lonMin,
    lonMax,
    latMin,
    latMax,
    poly: c.poly.map(p => ({ x: p[0], y: p[1] }))
  };
});

function getContinentAt(lon, lat) {
  let l = ((lon + 180) % 360 + 360) % 360 - 180;
  for (const box of CONTINENT_BBOXES) {
    if (lat < box.latMin || lat > box.latMax) continue;
    if (box.lonMin <= box.lonMax) {
      if (l < box.lonMin || l > box.lonMax) continue;
    } else {
      if (l < box.lonMin && l > box.lonMax) continue;
    }
    if (pointInPolygon(l, lat, box.poly)) {
      return box.id;
    }
  }
  return null;
}

/* Anchor a continent's label to a lat/lon that sits in EMPTY yellow space
   (ocean — no continent dots) close to the continent, so the name reads on
   clean sphere rather than over the dotted land. Computed once, then cached
   on the continent object. Spirals outward from the centre and takes the
   nearest ocean point that also has a few degrees of clearance around it. */
function findLabelPos(c) {
  if (c._labelPos) return c._labelPos;
  const [clon, clat] = c.center;
  const norm = (lon) => ((lon + 180) % 360 + 360) % 360 - 180;
  const clampLat = (lat) => Math.max(-80, Math.min(80, lat));
  const ocean = (lon, lat) => !getContinentAt(norm(lon), clampLat(lat));
  for (let rad = 9; rad <= 50; rad += 3) {
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const lon = clon + Math.cos(a) * rad;
      const lat = clat + Math.sin(a) * rad * 0.72;   // sphere squashes latitude
      // require the anchor AND a little further out to be ocean → clearance
      if (ocean(lon, lat) && ocean(lon + Math.cos(a) * 4, lat + Math.sin(a) * 4 * 0.72)) {
        c._labelPos = { lon: norm(lon), lat: clampLat(lat) };
        return c._labelPos;
      }
    }
  }
  c._labelPos = { lon: clon, lat: clat };
  return c._labelPos;
}

/* ── Sphere projection (orthographic) ── */
function project(lon,lat,rot,R,cx,cy){
  const lonR=(lon*Math.PI/180)+rot, latR=lat*Math.PI/180;
  const x=Math.cos(latR)*Math.sin(lonR), y=-Math.sin(latR), z=Math.cos(latR)*Math.cos(lonR);
  return { x:cx+x*R, y:cy+y*R, z };
}
function strokeVisible(ctx,pts){
  let started=false; ctx.beginPath();
  for(const p of pts){
    if(p.z>=0){ if(!started){ctx.moveTo(p.x,p.y);started=true;} else ctx.lineTo(p.x,p.y); }
    else started=false;
  }
  ctx.stroke();
}

/* ── Map (equirectangular crop) projection ── */
function mapX(lon,view,W){ return (lon-view.lonMin)/(view.lonMax-view.lonMin)*W; }
function mapY(lat,view,H){ return (view.latMax-lat)/(view.latMax-view.latMin)*H; }

function continentBBox(ids){
  let lonMin=180,lonMax=-180,latMin=90,latMax=-90;
  CONTINENTS.forEach(c=>{
    if(!ids.has(c.id)) return;
    c.poly.forEach(([lon,lat])=>{
      lonMin=Math.min(lonMin,lon); lonMax=Math.max(lonMax,lon);
      latMin=Math.min(latMin,lat); latMax=Math.max(latMax,lat);
    });
  });
  const padLon=(lonMax-lonMin)*0.08+2, padLat=(latMax-latMin)*0.08+2;
  return {
    lonMin:lonMin-padLon, lonMax:lonMax+padLon,
    latMin:Math.max(-89,latMin-padLat), latMax:Math.min(89,latMax+padLat),
  };
}

/* ── Path-to-pendant overlay animation ── */
function animatePathToPendant(fromScreen, targetEl, onDone){
  const overlay=document.createElement('canvas');
  overlay.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999';
  document.body.appendChild(overlay);
  const dpr=window.devicePixelRatio||1;
  const W=window.innerWidth, H=window.innerHeight;
  overlay.width=W*dpr; overlay.height=H*dpr; overlay.style.width=W+'px'; overlay.style.height=H+'px';
  const octx=overlay.getContext('2d'); octx.setTransform(dpr,0,0,dpr,0,0);

  const rect=targetEl.getBoundingClientRect();
  const to={ x:rect.left+rect.width*0.5, y:rect.top+rect.height*0.55 };
  const cp={ x:(fromScreen.x+to.x)/2, y:Math.min(fromScreen.x===to.x?0:fromScreen.y,to.y)-Math.abs(to.x-fromScreen.x)*0.25-40 };
  const start=performance.now(), dur=1200, steps=80;

  function frame(now){
    const t=Math.min((now-start)/dur,1), u=easeInOut(t);
    octx.clearRect(0,0,W,H);
    octx.strokeStyle='rgba(0,0,0,0.45)'; octx.lineWidth=1.2;
    octx.beginPath();
    const n=Math.floor(steps*u);
    for(let i=0;i<=n;i++){
      const s=i/steps;
      const x=(1-s)*(1-s)*fromScreen.x+2*(1-s)*s*cp.x+s*s*to.x;
      const y=(1-s)*(1-s)*fromScreen.y+2*(1-s)*s*cp.y+s*s*to.y;
      i===0?octx.moveTo(x,y):octx.lineTo(x,y);
    }
    octx.stroke();
    const x=(1-u)*(1-u)*fromScreen.x+2*(1-u)*u*cp.x+u*u*to.x;
    const y=(1-u)*(1-u)*fromScreen.y+2*(1-u)*u*cp.y+u*u*to.y;
    octx.fillStyle=ORANGE; octx.beginPath(); octx.arc(x,y,4,0,Math.PI*2); octx.fill();
    if(t<1) requestAnimationFrame(frame);
    else { setTimeout(()=>overlay.remove(),300); onDone(); }
  }
  requestAnimationFrame(frame);
}

/* ══════════════════════════════════════════
   Public entry — mounts the widget into `container`
══════════════════════════════════════════ */
export function initRootsWidget(container, opts){
  const { onAdd, onDone, targetEl } = opts;

  container.innerHTML = `
    <div class="roots-widget">
      <div class="roots-canvas-wrap">
        <canvas class="roots-canvas"></canvas>
      </div>
      <div class="roots-controls" id="roots-controls">
        <button class="q-help" type="button" aria-label="עזרה"><span class="q-help-tip">בחרו יבשה אחת או יותר שקשורות לסיפור המשפחה שלכם</span></button>
        <!-- Starts DIMMED (off); lights up + breathes once ≥1 continent is chosen. -->
        <button class="roots-done-text is-dim" id="roots-done">סימנתי, אפשר להמשיך</button>
      </div>
      <div class="roots-map-controls" id="roots-map-controls" hidden>
        <div class="roots-input-row">
          <input type="text" class="roots-input" id="roots-country-input" dir="rtl" placeholder=" ">
        </div>
        <!-- Both actions sit below the writing line: "הוסף" (right) and "סיימתי"
             (left). "סיימתי" starts DIMMED and lights up after the first country
             is added. -->
        <div class="roots-actions-row">
          <button class="roots-add-country" id="roots-send">הוסף</button>
          <button class="roots-finish is-dim" id="roots-finish" type="button">סיימתי</button>
        </div>
      </div>
      <div class="roots-map-note" id="roots-map-note">
        <span class="roots-map-note-text">הזן את ארצות המוצא</span>
      </div>
      <!-- Dotted-pattern title, split into two lines so each types itself in,
           letter by letter, on entry: line 1 "איפה הסיפור", then line 2
           "שלך מתחיל?". Pinned in the top-right column; hidden in the input
           phase. -->
      <div class="roots-story-title" role="img" aria-label="איפה הסיפור שלך מתחיל?">
        <div class="roots-story-line rsl-1" aria-hidden="true"></div>
        <div class="roots-story-line rsl-2" aria-hidden="true"></div>
      </div>
    </div>`;

  const wrap=container.querySelector('.roots-canvas-wrap');
  const canvas=container.querySelector('.roots-canvas');
  const ctx=canvas.getContext('2d');
  const controlsEl=container.querySelector('#roots-controls');
  const mapControlsEl=container.querySelector('#roots-map-controls');
  const backBtn=container.querySelector('#roots-back');
  const sendBtn=container.querySelector('#roots-send');
  const inputEl=container.querySelector('#roots-country-input');

  const state={
    phase:'globe',          // 'globe' | 'map'
    rot:0, targetRot:null, hover:null,
    dotReveal:1,            // 0 = bare gold sphere, 1 = all continent dots (swept in L→R)
    labelReveal:1,          // 0 = no names, 1 = names fully written (typewriter after dots)
    selected:new Set(),
    mapDots:[], mapT:0, rotAtDone:0,
    countryDots:[],         // orange markers placed at typed countries' true positions
    points:[],               // {lon,lat,name}
    view:null, targetView:null,
    pendingPoint:null, zoomT:0, zooming:false, settled:false,
  };

  // Locations already used by a glow point (this session) — a spot never
  // lights up twice, so pickUnusedLandSpot() always finds fresh ground.
  const usedGlowSpots = new Set();
  function pickUnusedLandSpot() {
    for (let attempts = 0; attempts < 300; attempts++) {
      const lon = Math.random() * 360 - 180;
      const lat = Math.random() * 160 - 80;
      const key = `${Math.round(lon)},${Math.round(lat)}`;
      if (usedGlowSpots.has(key)) continue;
      if (getContinentAt(lon, lat)) {
        usedGlowSpots.add(key);
        return { lon, lat };
      }
    }
    return null;
  }

  const glowPoints = [];
  for (let i = 0; i < 40; i++) {
    const spot = pickUnusedLandSpot();
    if (!spot) break;
    glowPoints.push({
      lon: spot.lon,
      lat: spot.lat,
      intensity: 0,
      state: 'idle', // 'idle' | 'fade-in' | 'fade-out'
      speed: 0.006 + Math.random() * 0.012,
    });
  }

  // During the opening → stage-1 morph, hold the continent dots (bare gold
  // sphere), then sweep them in one-after-another when told to.
  window.addEventListener('opening-morph-start', () => { state.dotReveal = 0; state.labelReveal = 0; });
  window.addEventListener('globe-reveal-dots', () => {
    const DUR = 650; let t0 = null;   // random, quick one-after-another build-up
    (function anim(ts){
      if(!t0) t0 = ts;
      state.dotReveal = Math.min(1, (ts - t0) / DUR);
      if(state.dotReveal < 1) requestAnimationFrame(anim);
      else revealLabels();            // once the dots are in, type out the names
    })(performance.now());
  });
  function revealLabels(){
    const DUR = 1500; let t0 = null;
    (function anim(ts){
      if(!t0) t0 = ts;
      state.labelReveal = Math.min(1, (ts - t0) / DUR);
      if(state.labelReveal < 1) requestAnimationFrame(anim);
    })(performance.now());
  }

  let W=0,H=0,R=0,cx=0,cy=0;
  function resize(){
    const w=wrap.clientWidth, h=wrap.clientHeight, dpr=window.devicePixelRatio||1;
    W=w; H=h;
    canvas.width=w*dpr; canvas.height=h*dpr;
    canvas.style.width=w+'px'; canvas.style.height=h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    cx=W/2; cy=H/2; R=Math.min(W,H)*0.49;
  }
  const ro=new ResizeObserver(resize); ro.observe(wrap); resize();

  /* ── Globe interaction ──
     The whole projected polygon is the hit target, not just the outline,
     so the user can click anywhere inside a continent. */
  function visibleHit(px,py){
    // Polygon containment for any continent on the visible hemisphere.
    for(const c of CONTINENTS){
      const pts=c.poly.map(([lon,lat])=>project(lon,lat,state.rot,R,cx,cy));
      const avgZ=pts.reduce((a,p)=>a+p.z,0)/pts.length;
      if(avgZ<=0.05) continue;
      if(pointInPolygon(px,py,pts)) return c.id;
    }
    // Generous fallback for tiny shapes near the limb: nearest center within radius.
    let best=null,bestD=30;
    for(const c of CONTINENTS){
      const p=project(c.center[0],c.center[1],state.rot,R,cx,cy);
      if(p.z<0.12) continue;
      const d=Math.hypot(px-p.x,py-p.y);
      if(d<bestD){ bestD=d; best=c.id; }
    }
    return best;
  }
  canvas.addEventListener('mousemove',e=>{
    if(state.phase!=='globe') return;
    const r=canvas.getBoundingClientRect();
    const id=visibleHit(e.clientX-r.left,e.clientY-r.top);
    state.hover=id;
    // The custom line-art hand (#cursor) IS the pointer here — never show the OS
    // cursor on top of it.
    canvas.style.cursor = 'none';
  });
  canvas.addEventListener('mouseleave',()=>{ state.hover=null; });
  // Drag to rotate the globe by hand — pointer events cover BOTH mouse and touch
  // (this is a touchscreen). A real drag spins the globe (and pauses the gentle
  // auto-spin); a tap (no real movement) still selects the continent under it.
  canvas.style.touchAction = 'none';
  // The custom line-art hand is the pointer here — hide the OS cursor from the
  // start (not only after the first mousemove).
  canvas.style.cursor = 'none';
  // Custom-cursor swap: while the globe is grabbed the hand closes into a fist.
  const cursorEl = document.getElementById('cursor');
  const grabCursor = () => {};   // the global touch-cursor (app.js) now shows the fist while dragging
  let dragStartX = 0, dragLastX = 0, dragMoved = false;
  canvas.addEventListener('pointerdown', e => {
    if(state.phase!=='globe') return;
    state.dragging = true; dragMoved = false; dragStartX = dragLastX = e.clientX;
    grabCursor(true);
    try { canvas.setPointerCapture(e.pointerId); } catch(_) {}
  });
  canvas.addEventListener('pointermove', e => {
    if(!state.dragging) return;
    const dx = e.clientX - dragLastX; dragLastX = e.clientX;
    state.rot += dx / (R || 300);                       // ~1:1 with the sphere surface at the equator
    if(Math.abs(e.clientX - dragStartX) > 6) dragMoved = true;
  });
  const endDrag = e => {
    if(!state.dragging) return;
    state.dragging = false;
    grabCursor(false);
    try { canvas.releasePointerCapture(e.pointerId); } catch(_) {}
    if(!dragMoved){
      // A tap, not a drag → toggle the continent under the finger (multi-select).
      const r = canvas.getBoundingClientRect();
      const id = visibleHit(e.clientX - r.left, e.clientY - r.top);
      if(id){
        if(state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
        doneBtn.classList.toggle('is-dim', state.selected.size === 0);
      }
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', () => { state.dragging = false; grabCursor(false); });

  /* ── "סיימתי" → spread the chosen continents into a flat world map ── */
  const doneBtn = container.querySelector('#roots-done');
  doneBtn.addEventListener('click',()=>{
    if(state.selected.size === 0) return;
    // Sample the interior of every selected continent into dots.
    // Sample ONLY the selected continents.
    const dots=[];
    for(let lat=-84; lat<=84; lat+=1.8){
      for(let lon=-180; lon<=180; lon+=1.8){
        const cid=getContinentAt(lon,lat);
        if(cid && state.selected.has(cid)) dots.push({lon,lat,sel:true});
      }
    }
    state.mapDots=dots;
    // Frame just the selection (keeps their true world-map relative positions,
    // but zooms so they fill the space at a medium size).
    state.view=continentBBox(state.selected);
    // A single continent leaves a lot of empty space on the left → nudge right.
    document.getElementById('section-3')?.classList.toggle('roots-single', state.selected.size === 1);
    state.rotAtDone=state.rot;
    const s3=document.getElementById('section-3');
    // ── Phase A: the globe, the title "איפה מתחיל הסיפור שלך?" and the vertical
    //    grid between them all slide RIGHT and vanish; the instruction glides to
    //    the top-right corner of the central rectangle. Globe stays drawn while
    //    it exits (still phase 'globe'). ──
    s3?.classList.add('roots-exiting');   // slide-out (globe + title + grid)
    s3?.classList.add('roots-marked');    // persistent: keeps title gone, moves instruction
    doneBtn.hidden = true;
    controlsEl.hidden = true;
    // ── Phase B (after the exit): reveal the flat world map — the chosen
    //    continents start filling in dot-by-dot. ──
    setTimeout(()=>{
      s3?.classList.remove('roots-exiting');
      container.querySelector('.roots-widget').classList.add('state-input');
      state.mapT=0;
      state.phase='map';                 // draw loop now fills the continent dots
      mapControlsEl.hidden=false;
      // Keyboard rises together with the dot-fill + the text box (parallel),
      // on the next frame so the just-unhidden input can take focus.
      const inp=container.querySelector('#roots-country-input');
      if(inp) requestAnimationFrame(()=>openKeyboardFor(inp));
    }, 760);
  });

  /* ── Phase: map → globe ── */
  backBtn?.addEventListener('click',()=>{
    state.selected.clear();
    inputEl.value = '';
    state.phase='globe';
    state.mapT=0; state.mapDots=[];
    doneBtn.classList.add('is-dim');   // selection cleared → back to dimmed
    container.querySelector('.roots-widget').classList.remove('state-input');
    const s3b=document.getElementById('section-3');
    s3b?.classList.remove('roots-marked');
    s3b?.classList.remove('roots-exiting');
    s3b?.classList.remove('roots-single');
    controlsEl.hidden=false; mapControlsEl.hidden=true;
  });

  /* ── Country Submission ── */
  /* "הוסף מדינה" — geocode the typed country and drop an orange marker at its
     true position on the map (staying so more can be added). */
  const finishBtn = container.querySelector('#roots-finish');
  function addCountry(){
    const raw=inputEl.value.trim(); if(!raw) return;
    const geo = findCountry(raw);
    if(geo){
      state.countryDots.push({ lon: geo.lon, lat: geo.lat, name: geo.name });
    }
    if (onAdd) onAdd(raw);
    inputEl.value='';
    inputEl.focus();
    // First country added → "סיימתי" lights up (loses .is-dim).
    if(state.countryDots.length >= 1) finishBtn?.classList.remove('is-dim');
  }
  sendBtn.addEventListener('click',addCountry);
  inputEl.addEventListener('keydown',e=>{ if(e.key==='Enter') addCountry(); });

  // "סיימתי" — finish the origin stage: the symbol appears (2D on the touch
  // screen, 3D on the display), driven by onDone → advance(). Inert while dim
  // (no country added yet).
  finishBtn?.addEventListener('click',()=>{
    const raw=inputEl.value.trim();
    if(raw) addCountry();       // capture a country still in the box first
    if(state.countryDots.length === 0) return;   // nothing entered at all
    onDone && onDone();
  });

  /* ── Draw loop ── */
  let glowActivationCooldown = 0;
  function drawGlobe(){
    ctx.clearRect(0,0,W,H);
    const isNeg = document.body.classList.contains('theme-negative');
    // Once a continent is chosen the gold sphere and the other continents
    // vanish — only the selected continent's (orange) dots remain, centred.
    const inputMode = state.phase === 'input';

    // Update sparkle intensities — a cooldown (not just a probability roll)
    // guarantees real spacing between activations instead of letting chance
    // cluster several of them into the same moment.
    if (glowActivationCooldown > 0) glowActivationCooldown--;
    let activeCount = glowPoints.filter(p => p.state !== 'idle').length;
    if (glowActivationCooldown <= 0 && activeCount < 3 && Math.random() < 0.05) {
      const idlePoints = glowPoints.filter(p => p.state === 'idle');
      if (idlePoints.length > 0) {
        const gp = idlePoints[Math.floor(Math.random() * idlePoints.length)];
        gp.state = 'fade-in';
        gp.intensity = 0;
        gp.speed = 0.008 + Math.random() * 0.015;
        glowActivationCooldown = 55 + Math.random() * 70; // ~1–2s at 60fps
      }
    }

    glowPoints.forEach(gp => {
      if (gp.state === 'fade-in') {
        gp.intensity += gp.speed;
        if (gp.intensity >= 1) {
          gp.intensity = 1;
          gp.state = 'fade-out';
          gp.speed = 0.004 + Math.random() * 0.008; // slower fade out
        }
      } else if (gp.state === 'fade-out') {
        gp.intensity -= gp.speed;
        if (gp.intensity <= 0) {
          gp.intensity = 0;
          gp.state = 'idle';
          // Move to a fresh spot that has never hosted a glow point before.
          const spot = pickUnusedLandSpot();
          if (spot) { gp.lon = spot.lon; gp.lat = spot.lat; }
        }
      }
    });

    // Flat circular background — hidden once a continent is selected.
    // This stage inverts the interface's cream/gold pair: gold sphere on the
    // light (cream) plate (the plate is set in stage1.css, scoped to this question).
    if (!inputMode) {
      ctx.fillStyle = '#e2bc71';
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw the world map dots (crisp halftone grid) — swept in left→right by
    // state.dotReveal after the globe settles.
    if (state.dotReveal > 0) {
    // Once the globe has fully filled in, the (clickable) continent dots gently
    // pulse — swelling a bit then settling — to hint that they can be clicked.
    // Each dot gets a phase offset (below) so they don't all pulse in sync.
    const fullyIn = state.dotReveal >= 1 && !inputMode;
    const now = performance.now();
    // Halftone grid. RES = columns per radius; a little denser than before.
    const RES = 54;
    const gridSpacing = R / RES;
    const GRID_N = RES * 2;          // cells across the full diameter
    const gridStartX = cx - R;
    const gridStartY = cy - R;

    // Project active sparkles to screen-space grid cell indices
    const activeGlows = {};
    glowPoints.forEach(gp => {
      if (gp.intensity <= 0) return;
      const p = project(gp.lon, gp.lat, state.rot, R, cx, cy);
      if (p.z >= 0.05) { // visible on front hemisphere
        const col = Math.round((p.x - gridStartX) / gridSpacing);
        const row = Math.round((p.y - gridStartY) / gridSpacing);
        const key = `${col},${row}`;
        activeGlows[key] = Math.max(activeGlows[key] || 0, gp.intensity);
      }
    });

    // Pass 1 — continent membership per grid cell. Rotation-dependent, so it is
    // rebuilt each frame; it lets the draw pass tell an OUTER-ring dot from an
    // interior one (and projects each cell just once).
    const mStride = GRID_N + 1;
    const member = new Array(mStride * mStride).fill(null);
    const midx = (c, r) => c * mStride + r;
    for (let col = 0; col <= GRID_N; col++) {
      for (let row = 0; row <= GRID_N; row++) {
        const dx = (gridStartX + col * gridSpacing) - cx;
        const dy = (gridStartY + row * gridSpacing) - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq > R * R) continue;
        const z = Math.sqrt(R * R - distSq);
        const lat = Math.asin(-(dy / R)) * 180 / Math.PI;
        let lon = (Math.atan2(dx / R, z / R) - state.rot) * 180 / Math.PI;
        lon = ((lon + 180) % 360 + 360) % 360 - 180;
        member[midx(col, row)] = getContinentAt(lon, lat);
      }
    }

    // Pass 2 — draw.
    for (let col = 0; col <= GRID_N; col++) {
      for (let row = 0; row <= GRID_N; row++) {
        const continentId = member[midx(col, row)];
        if (continentId) {
          const gx = gridStartX + col * gridSpacing;
          const gy = gridStartY + row * gridSpacing;
          // Reveal the dots in a RANDOM order (stable per grid cell) as
          // dotReveal grows 0→1 — not a left→right sweep.
          const seed = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
          const threshold = seed - Math.floor(seed);   // pseudo-random [0,1)
          if (threshold > state.dotReveal) continue;
          const isSel = state.selected.has(continentId);
          // In input mode only the chosen continent's dots are drawn.
          if (inputMode && !isSel) continue;
          const isHover = state.hover === continentId;

          let dotRadius = 0.65;
          let color;

          {
            if (isSel) {
              // Selected (tapped) continent — SETTLES DOWN: small #282828 dots,
              // no emphasis, reads quiet against the still-inviting gold ones.
              color = isNeg ? '#f5f5ed' : '#282828';
              dotRadius = 0.75;
            } else {
              // Unselected (and hovered) — the WHOLE continent is emphasised in
              // cream and gently breathes as one (all dots pulse together in size,
              // each continent on its own phase), inviting the tap. Cream reads on
              // the gold sphere (this stage's inverted pair).
              color = isNeg ? '#282828' : '#f5f5ed';
              if (fullyIn) {
                let hh = 0;
                for (let ci = 0; ci < continentId.length; ci++) hh = (hh * 31 + continentId.charCodeAt(ci)) & 0xffff;
                const kk = 0.5 + 0.5 * Math.sin(now / 260 + hh * 0.0013);
                dotRadius = 1.15 * (1 + 0.25 * kk);   // whole continent swells gently
              } else {
                dotRadius = 1.15;
              }
            }
            ctx.fillStyle = color;
          }

          ctx.beginPath();
          ctx.arc(gx, gy, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 3. Continent labels — PRINTED ON THE SPHERE.
    // Each name is anchored to its own lat/lon in empty yellow space near
    // the continent, projected through the same rotation as the globe, then
    // oriented tangent to the surface, scaled by perspective and faded as it
    // rotates toward the sphere's edge/back. It is not screen-fixed UI text.
    CONTINENTS.forEach(c => {
      // In input mode, only the chosen continent keeps its label.
      if (inputMode && !state.selected.has(c.id)) return;
      const lp = findLabelPos(c);
      const p = project(lp.lon, lp.lat, state.rot, R, cx, cy);
      if (p.z <= 0.12) return;                          // back hemisphere → hidden

      // Local EAST tangent in screen space → the text baseline follows the
      // curvature of the sphere (a point a few degrees east, reprojected).
      const pe = project(lp.lon + 6, lp.lat, state.rot, R, cx, cy);
      let ang = Math.atan2(pe.y - p.y, pe.x - p.x);
      if (Math.abs(ang) > Math.PI / 2) ang += Math.PI; // keep upright, never mirrored

      // Perspective: shrink toward the limb; fade on the back and near the edge
      // so the label never spills outside the yellow circle.
      const s = 0.6 + 0.4 * Math.min(1, p.z);
      const dist = Math.hypot(p.x - cx, p.y - cy);
      const edgeFade = Math.max(0, Math.min(1, (R * 0.86 - dist) / (R * 0.12)));
      const alpha = Math.max(0, Math.min(1, (p.z - 0.12) / 0.3)) * edgeFade;
      if (alpha <= 0.02) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.scale(s, s);
      // Selected (tapped) continent's name turns cream; others stay dark. (Cream,
      // not gold — the sphere under it is gold now, so gold would vanish.)
      ctx.fillStyle = state.selected.has(c.id) ? '#f5f5ed' : (isNeg ? '#f5f5ed' : '#282828');
      ctx.font = "10.5px 'SimplerPro_HLAR_Mono-Regular', 'ArbelG', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Typewriter: reveal the name character-by-character (all continents type
      // in together, driven by state.labelReveal 0→1 after the dots land).
      const shown = c.name.slice(0, Math.ceil(state.labelReveal * c.name.length));
      if (shown) ctx.fillText(shown, 0, 0);
      ctx.restore();
    });
    } // end if (state.dotsReady)
  }

  /* Spread the chosen continents' dots from their globe positions out into a
     flat, aspect-correct world-map layout (equirectangular), animated by
     state.mapT (0 = globe, 1 = map). */
  function spreadEase(t){ return t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
  function mapFit(v){
    const lonR=v.lonMax-v.lonMin, latR=v.latMax-v.latMin, pad=0.14;
    const s=Math.min(W*(1-2*pad)/lonR, H*(1-2*pad)/latR);
    // Centred: the canvas is now only the region ABOVE the horizontal divider
    // (the keyboard band is excluded via CSS), so the continents already clear
    // the keyboard.
    return { s, ox:(W-lonR*s)/2, oy:(H-latR*s)/2 };
  }
  function drawSpreadMap(){
    ctx.clearRect(0,0,W,H);
    const v=state.view, f=mapFit(v);
    // Build the dots on a SCREEN-space halftone grid at the SAME spacing as the
    // globe (R / RES), so the map's dot density matches the globe. Row-major
    // order → they fill in top-to-bottom via state.mapT.
    const spacing = R / 54;
    const x1 = f.ox + (v.lonMax - v.lonMin) * f.s;
    const y1 = f.oy + (v.latMax - v.latMin) * f.s;
    const pts=[];
    for(let sy=f.oy; sy<=y1; sy+=spacing){
      for(let sx=f.ox; sx<=x1; sx+=spacing){
        const lon = v.lonMin + (sx - f.ox) / f.s;
        const lat = v.latMax - (sy - f.oy) / f.s;
        const cid = getContinentAt(lon, lat);
        if(cid && state.selected.has(cid)){
          // Stable pseudo-random reveal threshold per cell → the dots appear in
          // a scattered, unordered sequence (not a top-to-bottom sweep).
          const seed = Math.sin(sx * 12.9898 + sy * 78.233) * 43758.5453;
          pts.push([sx, sy, seed - Math.floor(seed)]);
        }
      }
    }
    ctx.fillStyle = '#e2bc71';                  // gold land on the light (cream) plate
    for(const p of pts){
      if(p[2] > state.mapT) continue;           // revealed once mapT passes its threshold
      ctx.beginPath(); ctx.arc(p[0], p[1], 1.15, 0, Math.PI*2); ctx.fill();
    }
    // Orange markers for the countries typed in via "הוסף מדינה", each with
    // its name written just below its own dot (same font/size/weight as the
    // continent labels).
    const isNegC = document.body.classList.contains('theme-negative');
    for(const p of state.countryDots){
      const px = f.ox+(p.lon-v.lonMin)*f.s;
      const py = f.oy+(v.latMax-p.lat)*f.s;
      ctx.fillStyle='#fb5716';
      ctx.beginPath(); ctx.arc(px,py,3.2,0,Math.PI*2); ctx.fill();
      if(p.name){
        ctx.save();
        ctx.font = "bold 9px 'SimplerPro_HLAR_Mono-Regular', 'ArbelG', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        // Subtle background-colour halo so the name reads over the dots — which
        // is the light (cream) plate on this stage.
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#f5f5ed';
        ctx.globalAlpha = 0.85;
        ctx.strokeText(p.name, px, py + 6);
        ctx.fillStyle = isNegC ? '#f5f5ed' : '#282828';
        ctx.globalAlpha = 0.72;
        ctx.fillText(p.name, px, py + 6);
        ctx.restore();
      }
    }
    // Continent names — beside each continent on clean background (using the
    // same empty-space anchor as the globe), fading in as the map settles.
    if(state.mapT > 0.55){
      const isNeg = document.body.classList.contains('theme-negative');
      ctx.save();
      ctx.globalAlpha = Math.min(1, (state.mapT - 0.55) / 0.35);
      ctx.fillStyle = isNeg ? '#f5f5ed' : '#282828';
      ctx.font = "11px 'SimplerPro_HLAR_Mono-Regular', 'ArbelG', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      CONTINENTS.forEach(c=>{
        if(!state.selected.has(c.id)) return;
        // Anchor the name centred just ABOVE the continent's own screen
        // bounding box (from its coastline), so it sits beside the land in
        // clean space instead of over the dots.
        let minx = Infinity, maxx = -Infinity, miny = Infinity;
        c.poly.forEach(([lon, lat]) => {
          const x = f.ox + (lon - v.lonMin) * f.s;
          const y = f.oy + (v.latMax - lat) * f.s;
          if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y;
        });
        ctx.fillText(c.name, (minx + maxx) / 2, miny - 6);
      });
      ctx.restore();
    }
  }

  function drawMap(){
    ctx.clearRect(0,0,W,H);
    const isNeg = document.body.classList.contains('theme-negative');
    const v=state.view;
    // grid
    ctx.strokeStyle = isNeg ? 'rgba(252,247,241,0.08)' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth=0.5;
    for(let lon=Math.ceil(v.lonMin/10)*10; lon<=v.lonMax; lon+=10){
      const x=mapX(lon,v,W); ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
    }
    for(let lat=Math.ceil(v.latMin/10)*10; lat<=v.latMax; lat+=10){
      const y=mapY(lat,v,H); ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    }
    // continent outlines
    CONTINENTS.forEach(c=>{
      if(!state.selected.has(c.id)) return;
      ctx.beginPath();
      c.poly.forEach(([lon,lat],i)=>{
        const x=mapX(lon,v,W), y=mapY(lat,v,H);
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      });
      ctx.closePath();
      ctx.strokeStyle = isNeg ? 'rgba(252,247,241,0.45)' : 'rgba(0,0,0,0.45)';
      ctx.lineWidth=1.1; ctx.stroke();
    });
    // confirmed points
    state.points.forEach(p=>drawPoint(p.lon,p.lat,p.name,1));
    // pending (zooming-in) point
    if(state.pendingPoint){
      const p=state.pendingPoint;
      drawPoint(p.lon,p.lat,p.name,p.alpha);
    }
  }
  function drawPoint(lon,lat,name,alpha){
    const v=state.view, x=mapX(lon,v,W), y=mapY(lat,v,H);
    const isNeg = document.body.classList.contains('theme-negative');
    ctx.save(); ctx.globalAlpha=alpha;
    ctx.fillStyle=ORANGE; ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = isNeg ? '#f5f5ed' : '#000000';
    ctx.font="11px 'ArbelG',sans-serif"; ctx.textAlign='center';
    ctx.fillText(name,x,y-10);
    ctx.restore();
  }

  let alive=true;
  function frame(){
    if(!alive){ return; }
    // The canvas may be momentarily detached while a stage transition swaps the
    // central content in/out of the DOM. Don't kill the loop for that — only
    // retire it once a DIFFERENT roots-canvas has taken our place (a new geo
    // stage was mounted). Otherwise keep polling and resume drawing on reattach.
    if(!document.body.contains(canvas)){
      const current=document.querySelector('.roots-canvas');
      if(current && current!==canvas){ alive=false; ro.disconnect(); return; }
      requestAnimationFrame(frame);
      return;
    }
    if(state.phase==='globe'){
      if(!state.dragging) state.rot += 0.0028;   // gentle auto-spin while idle; the user's drag takes over
      drawGlobe();
    } else if(state.phase==='map'){
      if(state.mapT < 1) state.mapT = Math.min(1, state.mapT + 0.035);
      drawSpreadMap();
    }
    requestAnimationFrame(frame);
  }
  frame();

  /* ── Demo hooks (questionnaire.js drives the ghost-hand globe demo) ── */
  return {
    demo: {
      isGlobe(){ return state.phase === 'globe'; },
      hold(on){ state.dragging = !!on; },   // pause the idle auto-spin while driving
      spinBy(rad){ state.rot += rad; },
      // Viewport-space centre of a continent now, or null if it's on the far side.
      continentPos(id){
        const c = CONTINENTS.find(k => k.id === id);
        if(!c) return null;
        const p = project(c.center[0], c.center[1], state.rot, R, cx, cy);
        if(p.z <= 0.18) return null;
        const r = canvas.getBoundingClientRect();
        return { x: r.left + p.x, y: r.top + p.y, z: p.z };
      },
      select(id){
        if(!state.selected.has(id)){
          state.selected.add(id);
          doneBtn.classList.toggle('is-dim', state.selected.size === 0);
        }
      },
      clear(){ state.selected.clear(); doneBtn.classList.toggle('is-dim', true); },
    },
  };
}
