/* roots.js — Family Roots stage: rotating abstract globe → country map → path to pendant
   Visual language: warm off-white bg, electric blue linework, orange accent points.
   This is about meaningful family-story geography, not demographic classification. */

const BLUE = '#000000';
const ORANGE = '#1c1c1c';

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
      <div class="roots-canvas-wrap"><canvas class="roots-canvas"></canvas></div>
      <div class="roots-controls" id="roots-controls">
        <button class="roots-btn" id="roots-choose" hidden>בחר מדינה</button>
        <button class="q-help" type="button" aria-label="עזרה"><span class="q-help-tip">בחרו יבשה אחת או יותר שקשורות לסיפור המשפחה שלכם, ואז המשיכו</span></button>
      </div>
      <div class="roots-map-controls" id="roots-map-controls" hidden>
        <button class="roots-btn ghost" id="roots-back">→ חזרה ליבשות</button>
        <div class="roots-input-row">
          <input type="text" class="roots-input" id="roots-country-input" dir="rtl" placeholder="כתבו שם מדינה">
          <button class="roots-send" id="roots-send">שלח</button>
          <button class="q-help" type="button" aria-label="עזרה"><span class="q-help-tip">שם מקום שמשמעותי לסיפור המשפחה שלכם</span></button>
        </div>
        <div class="roots-chips" id="roots-chips"></div>
        <button class="roots-btn" id="roots-finish">המשך</button>
      </div>
    </div>`;

  const wrap=container.querySelector('.roots-canvas-wrap');
  const canvas=container.querySelector('.roots-canvas');
  const ctx=canvas.getContext('2d');
  const controlsEl=container.querySelector('#roots-controls');
  const mapControlsEl=container.querySelector('#roots-map-controls');
  const chooseBtn=container.querySelector('#roots-choose');
  const backBtn=container.querySelector('#roots-back');
  const sendBtn=container.querySelector('#roots-send');
  const finishBtn=container.querySelector('#roots-finish');
  const inputEl=container.querySelector('#roots-country-input');
  const chipsEl=container.querySelector('#roots-chips');

  const state={
    phase:'globe',          // 'globe' | 'map'
    rot:0, hover:null,
    selected:new Set(),
    points:[],               // {lon,lat,name}
    view:null, targetView:null,
    pendingPoint:null, zoomT:0, zooming:false, settled:false,
  };

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
  function pointInPolygon(px,py,pts){
    let inside=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const xi=pts[i].x, yi=pts[i].y, xj=pts[j].x, yj=pts[j].y;
      const intersect=((yi>py)!==(yj>py)) && (px<(xj-xi)*(py-yi)/(yj-yi)+xi);
      if(intersect) inside=!inside;
    }
    return inside;
  }
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
    canvas.style.cursor = id ? 'pointer' : 'default';
  });
  canvas.addEventListener('mouseleave',()=>{ state.hover=null; });
  canvas.addEventListener('click',e=>{
    if(state.phase!=='globe') return;
    const r=canvas.getBoundingClientRect();
    const id=visibleHit(e.clientX-r.left,e.clientY-r.top);
    if(!id) return;
    if(state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
    chooseBtn.hidden = state.selected.size===0;
  });

  /* ── Phase: continents → map ── */
  chooseBtn.addEventListener('click',()=>{
    if(state.selected.size===0) return;
    state.view = continentBBox(state.selected);
    state.targetView = { ...state.view };
    state.phase='map';
    controlsEl.hidden=true; mapControlsEl.hidden=false;
  });
  backBtn.addEventListener('click',()=>{
    state.phase='globe'; state.pendingPoint=null; state.zooming=false;
    controlsEl.hidden=false; mapControlsEl.hidden=true;
  });

  /* ── Phase: map → search → zoom → path ── */
  function submitCountry(){
    const raw=inputEl.value.trim(); if(!raw) return;
    let found=findCountry(raw);
    if(!found){
      const v=state.view;
      const jLon=(Math.random()-0.5)*(v.lonMax-v.lonMin)*0.3;
      const jLat=(Math.random()-0.5)*(v.latMax-v.latMin)*0.3;
      found={ name:raw, lat:(v.latMin+v.latMax)/2+jLat, lon:(v.lonMin+v.lonMax)/2+jLon };
    }
    inputEl.value=''; inputEl.disabled=true; sendBtn.disabled=true;
    
    if (onAdd) {
      onAdd(found.name);
    }

    const span=Math.max(6,(state.view.lonMax-state.view.lonMin)*0.22);
    state.targetView={
      lonMin:found.lon-span, lonMax:found.lon+span,
      latMin:found.lat-span*0.8, latMax:found.lat+span*0.8,
    };
    state.pendingPoint={ ...found, alpha:0 };
    state.zooming=true;
  }
  sendBtn.addEventListener('click',submitCountry);
  inputEl.addEventListener('keydown',e=>{ if(e.key==='Enter') submitCountry(); });

  finishBtn.addEventListener('click',()=>{ onDone && onDone(); });

  function addChip(name){
    const chip=document.createElement('div');
    chip.className='roots-chip'; chip.textContent=name;
    chipsEl.appendChild(chip);
  }

  /* ── Draw loop ── */
  function drawGlobe(){
    ctx.clearRect(0,0,W,H);
    const isNeg = document.body.classList.contains('theme-negative');
    const strokeColor = isNeg ? 'rgba(252,247,241,0.35)' : 'rgba(0,0,0,0.35)';
    const gridColor = isNeg ? 'rgba(252,247,241,0.16)' : 'rgba(0,0,0,0.16)';

    // sphere outline
    ctx.strokeStyle=strokeColor; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke();
    // graticule
    ctx.strokeStyle=gridColor; ctx.lineWidth=0.6;
    for(let lon=-150;lon<=180;lon+=30){
      const pts=[]; for(let lat=-90;lat<=90;lat+=4) pts.push(project(lon,lat,state.rot,R,cx,cy));
      strokeVisible(ctx,pts);
    }
    for(let lat=-60;lat<=60;lat+=30){
      const pts=[]; for(let lon=-180;lon<=180;lon+=4) pts.push(project(lon,lat,state.rot,R,cx,cy));
      strokeVisible(ctx,pts);
    }
    // continents — filled hit area + outline; hover and selection are obvious
    // Smooth closed-path drawing — uses quadratic curves through midpoints
    // so the coastline reads as soft flowing curves instead of an angular
    // polygon. The actual data points become Bezier control points; the
    // curve passes through their midpoints, eliminating sharp corners.
    const drawSmoothClosed = (pts2d) => {
      const n = pts2d.length;
      if (n < 3) return;
      const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      ctx.beginPath();
      const mStart = mid(pts2d[n - 1], pts2d[0]);
      ctx.moveTo(mStart.x, mStart.y);
      for (let i = 0; i < n; i++) {
        const p = pts2d[i];
        const next = pts2d[(i + 1) % n];
        const m = mid(p, next);
        ctx.quadraticCurveTo(p.x, p.y, m.x, m.y);
      }
      ctx.closePath();
    };

    CONTINENTS.forEach(c=>{
      const pts=c.poly.map(([lon,lat])=>project(lon,lat,state.rot,R,cx,cy));
      const avgZ=pts.reduce((a,p)=>a+p.z,0)/pts.length;
      if(avgZ<=0.05) return;
      const isSel=state.selected.has(c.id), isHover=state.hover===c.id;
      ctx.lineCap='round'; ctx.lineJoin='round';
      drawSmoothClosed(pts);
      // Filled body
      if(isSel) {
        ctx.fillStyle = isNeg ? 'rgba(252,247,241,0.92)' : 'rgba(26,26,26,0.92)';
      } else if(isHover) {
        ctx.fillStyle = isNeg ? 'rgba(252,247,241,0.10)' : 'rgba(0,0,0,0.10)';
      } else {
        ctx.fillStyle = isNeg ? 'rgba(252,247,241,0.03)' : 'rgba(0,0,0,0.03)';
      }
      ctx.fill();

      const inkBase = isNeg ? '252,247,241' : (isSel ? '26,26,26' : '0,0,0');
      ctx.strokeStyle = isSel
        ? `rgba(${inkBase},${(0.55+avgZ*0.35).toFixed(3)})`
        : `rgba(${inkBase},${(0.25+avgZ*0.45+(isHover?0.25:0)).toFixed(3)})`;
      ctx.lineWidth = isHover && !isSel ? 1.4 : 1;
      ctx.stroke();
    });
    // labels
    CONTINENTS.forEach(c=>{
      const p=project(c.center[0],c.center[1],state.rot,R,cx,cy);
      const visible = Math.max(0, Math.min(1, (p.z - 0.05) * 1.6));
      if(visible <= 0.02) return;
      const isSel=state.selected.has(c.id), isHover=state.hover===c.id;
      const horizSquash = Math.max(0.05, p.z);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(horizSquash, 1);
      
      if (isSel) {
        ctx.fillStyle = isNeg ? `rgba(26,26,26,${visible.toFixed(2)})` : `rgba(252,247,241,${visible.toFixed(2)})`;
      } else {
        ctx.fillStyle = isNeg ? `rgba(252,247,241,${(visible*(isHover?0.95:0.70)).toFixed(2)})` : `rgba(0,0,0,${(visible*(isHover?0.95:0.70)).toFixed(2)})`;
      }

      ctx.font=`${Math.max(10, R*0.055)}px 'ArbelG',sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(c.name, 0, 0);
      ctx.restore();
    });
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
    const g=ctx.createRadialGradient(x,y,0,x,y,18);
    g.addColorStop(0,'rgba(26,26,26,0.35)'); g.addColorStop(1,'rgba(26,26,26,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,18,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=ORANGE; ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = isNeg ? '#fffae6' : '#000000';
    ctx.font="11px 'ArbelG',sans-serif"; ctx.textAlign='center';
    ctx.fillText(name,x,y-10);
    ctx.restore();
  }

  let alive=true;
  function frame(){
    if(!alive || !document.body.contains(canvas)){ alive=false; ro.disconnect(); return; }
    if(state.phase==='globe'){
      // Pause rotation once the user has chosen a continent so the click
      // doesn't appear to make the globe "jump" away from the cursor.
      if(state.selected.size === 0) state.rot += 0.0028;
      drawGlobe();
    } else {
      // animate view toward target
      const v=state.view, t=state.targetView;
      v.lonMin+=(t.lonMin-v.lonMin)*0.08; v.lonMax+=(t.lonMax-v.lonMax)*0.08;
      v.latMin+=(t.latMin-v.latMin)*0.08; v.latMax+=(t.latMax-v.latMax)*0.08;
      if(state.pendingPoint) state.pendingPoint.alpha=Math.min(1,state.pendingPoint.alpha+0.04);
      drawMap();
      if(state.zooming){
        const close=Math.abs(v.lonMin-t.lonMin)<0.05 && Math.abs(v.lonMax-t.lonMax)<0.05;
        if(close && state.pendingPoint && state.pendingPoint.alpha>=1){
          state.zooming=false;
          const r=canvas.getBoundingClientRect();
          const x=mapX(state.pendingPoint.lon,state.view,W), y=mapY(state.pendingPoint.lat,state.view,H);
          const fromScreen={ x:r.left+x, y:r.top+y };
          const point=state.pendingPoint;
          state.points.push(point);
          addChip(point.name);
          state.pendingPoint=null;
          inputEl.disabled=false; sendBtn.disabled=false;
          // ease back out so the next search starts from the family-story view
          state.targetView=continentBBox(state.selected);
        }
      }
    }
    requestAnimationFrame(frame);
  }
  frame();
}
