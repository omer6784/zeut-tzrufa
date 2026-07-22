/* roots.js — Family Roots stage: rotating abstract globe → country map → path to pendant
   Visual language: warm off-white bg, electric blue linework, orange accent points.
   This is about meaningful family-story geography, not demographic classification. */

const BLUE = '#000000';
const ORANGE = '#1a1a1a';

/* ── Continent silhouettes (lon, lat) — detailed coastlines. Each polygon
   is a closed ring; points are listed clockwise. Hand-traced from memory
   of major coastline features so the globe reads as geographically real
   while staying lightweight (no GeoJSON dataset). ── */
const CONTINENTS = [
  { id:'namerica', name:'צפון אמריקה',
    center:[-95,45],
    poly:[
      // Alaska + Aleutian extension
      [-166,67],[-162,70],[-156,71],[-148,70],[-141,69.5],
      // Canadian arctic coast
      [-130,69],[-122,70],[-110,68],[-100,69],[-85,70],[-78,73],[-68,73],
      // Greenland approach / Labrador
      [-61,60],[-56,52],[-65,48],
      // US east coast: Maine, Cape Cod, Long Island, Hatteras, Florida
      [-70,44],[-71,42],[-74,40],[-76,37],[-75,35],[-80.5,32],[-80.5,28],
      [-80,25.5],[-82,25],
      // Gulf of Mexico curve
      [-83,29],[-85,30],[-88,30.5],[-91,29.5],[-94,29.5],[-96,28],[-97,26],
      // Mexico east coast, Yucatan, Belize, Central America narrow
      [-97,21],[-90,21],[-87,21],[-87,17.5],[-83,15],[-77.5,9],
      // West side of Central America back up
      [-83,8.5],[-86,11],[-88,13],[-92,15],[-96,16],[-101,17],[-105,20],
      // Mexican Pacific coast, Baja California
      [-110,23],[-113,28],[-115,30],[-117,32.5],
      // US west coast: California, Oregon, Washington
      [-119,34],[-121,36],[-122,38],[-124,40.5],[-124,46],[-124,48],
      // British Columbia
      [-127,52],[-132,55],[-136,58],[-141,60],
      // Alaska south coast / panhandle / peninsula
      [-150,60],[-156,58],[-162,55],[-166,53],[-162,55],[-158,58],[-154,61],
      [-163,63],[-166,67],
    ] },
  { id:'samerica', name:'דרום אמריקה',
    center:[-60,-15],
    poly:[
      // Caribbean coast: Colombia → Venezuela → Guianas
      [-76,9],[-72,12],[-66,11],[-62,10.5],[-58,8.5],[-54,6],
      // Brazil NE bulge
      [-50,2],[-48,-1],[-44,-2.5],[-39,-4],[-35,-6],[-35,-9],
      // Brazil east coast to Rio area
      [-38,-13],[-39,-17],[-42,-22],[-43,-23],[-46,-24],[-48,-26],
      // S Brazil, Uruguay, Argentina pampas
      [-52,-29],[-56,-34],[-57,-36],[-62,-39],[-64,-42],[-65,-45],
      // Patagonia east, Tierra del Fuego
      [-66,-48],[-68,-50],[-69,-52],[-67,-54],[-69,-55.5],
      // West coast: Chile fjords, Patagonia
      [-75,-52],[-74,-48],[-74,-44],[-73,-40],[-73,-37],[-72,-33],[-71,-30],
      // Peru / Ecuador / Colombia west coast
      [-71,-27],[-72,-22],[-72,-17],[-75,-14],[-77,-11],[-79,-7],
      [-80.5,-4],[-80,-2],[-80,1],[-78,3],[-77,5],[-76,9],
    ] },
  { id:'europe',   name:'אירופה',
    center:[18,52],
    poly:[
      // Iberia: Portugal coast, Strait of Gibraltar, Spain Med coast
      [-9.5,37],[-9.5,42],[-8,43.5],[-3,43.5],[2,42.5],[3,42],
      // S France, Italy peninsula
      [7,43.5],[10,44],[12,44.5],[14,40],[18,40],[17,42],[14,46],
      // Adriatic east coast, Balkans, Greece
      [13,46],[16,43],[18,42],[20,40],[23,38],[26,38],[26,40.5],[27,41],
      // Black Sea north shore (very rough)
      [30,46],[33,46],[37,45],[40,43],[45,42],
      // Caucasus / Caspian (cut off from Asia here)
      [48,46],[50,50],[55,55],[58,60],[62,66],[68,69],[71,71],
      // Arctic Russia north coast
      [55,72],[48,72],[40,71],[30,70],[20,71],[10,68],
      // Scandinavia: Norway fjords, North Cape
      [22,71],[28,71],[31,70],[27,68],[20,67],[12,65],[10,62],[5,58],
      // Denmark / Jutland / N Germany
      [8,57],[10,56],[8,54],[7,53],[5,52],
      // Netherlands, Belgium, France Atlantic coast
      [2,51],[-1,50],[-4,48],[-2,46],[-1,46],[-1,43.5],[-3,43],
      // Back to Iberia
      [-7,43],[-9,40],[-9.5,37],
    ] },
  { id:'africa',   name:'אפריקה',
    center:[20,2],
    poly:[
      // Mediterranean coast: Morocco → Algeria → Tunisia → Libya → Egypt
      [-9.5,32],[-6,35.5],[0,35.5],[5,37],[10,37],[11,33],[15,32],[20,32.5],
      [25,32],[31,31.5],
      // Red Sea / Sinai / Horn of Africa
      [33,30],[35,28],[37,22],[39,18],[43,13],[48,12],[51,12],[51,10.5],
      [48,8],[44,5],[41,4],
      // East coast: Kenya, Tanzania, Mozambique
      [42,1],[40,-3],[40,-7],[39,-10],[40,-15],[40,-22],[36,-26],
      // South Africa: Cape Agulhas
      [33,-29],[28,-33],[24,-34],[20,-34.5],[18,-34],
      // West coast: Namibia, Angola, Gabon, Gulf of Guinea
      [15,-30],[13,-23],[11,-17],[12,-10],[12,-6],[9,-2],[9,3],
      [5,5],[1,6],[-3,5],[-7,5],[-13,8],
      // West African bulge: Liberia, Sierra Leone, Senegal
      [-17,12],[-17,15],[-16,18],[-13,22],[-12,28],
      // Western Sahara / Morocco
      [-15,28],[-13,30],[-9.5,32],
    ] },
  { id:'asia',     name:'אסיה',
    center:[95,45],
    poly:[
      // Western boundary (Bosporus → Caucasus → Caspian → Ural)
      [29,40.5],[35,40],[42,41],[48,40],[50,45],[52,52],[60,58],[68,69],
      // Russian Arctic coast east across Siberia
      [73,72],[85,75],[100,77],[110,75],[125,73],[140,72],[155,72],
      [170,68],[175,66],[180,66],
      // Bering / Chukotka / Kamchatka — single sweep, no doubleback
      [172,63],[166,58],[160,52],[156,51],
      // Sakhalin / Japan side back into continent
      [148,52],[142,55],[140,50],[140,45],[136,42],[132,42],
      // Korean peninsula — simple triangular outline
      [130,42],[128,38],[126,34],[132,36],
      // East China coast: Bohai, Yellow Sea, Yangtze, Hong Kong
      [122,40],[122,35],[121,31],[119,27],[114,22],
      // Indochina + Malay peninsula tip
      [108,18],[108,11],[107,10],[104,10],[104,2],[101,1],
      // Bay of Bengal coast: Burma, Bangladesh, India east
      [98,7],[97,16],[94,18],[90,22],[87,21],[81,17],[80,13],[78,9],
      // India south tip + west coast
      [73,8],[73,15],[72,21],[68,24],[63,25],
      // Arabian peninsula — single sweep from east round to south
      [60,25],[58,26],[57,22],[55,18],[54,15],[53,12],[48,12],[44,12],[43,15],[42,18],
      // Red Sea east coast, Aqaba, Israel/Lebanon
      [38,22],[36,28],[35,32],[36,36],
      // Turkey south coast back to start
      [33,36],[30,37],[28,37],[27,40],[29,40.5],
    ] },
  { id:'oceania',  name:'אוקיאניה',
    center:[134,-25],
    poly:[
      // Cape York north tip
      [142,-11],[143,-13],[145,-15],
      // Great Barrier Reef coast / Queensland
      [146,-17],[148,-20],[150,-23],[153,-25],[153,-28],[153,-32],[151,-34],
      // Sydney / SE corner
      [150,-36],[148,-38],[146,-39],
      // Victoria south coast / Great Australian Bight
      [143,-39],[140,-38],[136,-35],[132,-32],[127,-32],[123,-34],[119,-34],
      // SW corner / Perth
      [115,-34],[113,-30],[115,-26],[114,-22],
      // NW coast: Pilbara, Kimberley
      [120,-20],[124,-16],[129,-15],[132,-12],[136,-12],[139,-12],[142,-11],
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
          <input type="text" class="roots-input" id="roots-country-input" dir="rtl">
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
    setTimeout(()=>inputEl.focus(),200);
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
    ctx.fillStyle = isNeg ? '#fcf7f1' : '#000000';
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
          inputEl.disabled=false; sendBtn.disabled=false; inputEl.focus();
          // ease back out so the next search starts from the family-story view
          state.targetView=continentBBox(state.selected);
          onAdd && onAdd(point.name);
        }
      }
    }
    requestAnimationFrame(frame);
  }
  frame();
}
