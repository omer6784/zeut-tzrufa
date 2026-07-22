/* questionnaire.js — Identity Forging v6 — Icon Talisman */
import { initRootsWidget } from './roots.js';
import { mountArtifact3D, unmountArtifact3D } from './artifact3d.js';

const BLUE   = '#fcf7f1';
const ORANGE = '#FD7041';
const BLUE_RGB   = '252,247,241';
const ORANGE_RGB = '253,112,65';
const BG     = '#fcf7f1';
const LAYER_DUR = 2200;

const GEMATRIA = {
  'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
  'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,
  'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400
};
function calcGematria(s){ return [...s].reduce((a,c)=>a+(GEMATRIA[c]||0),0); }
function simpleHash(s){ let h=0x12345678; for(const c of s) h=(Math.imul(31,h)+c.charCodeAt(0))>>>0; return h; }
function lerp(a,b,t){ return a+(b-a)*t; }
function easeIO(t){ return t<.5?2*t*t:-1+(4-2*t)*t; }
function easeOut(t){ t=Math.max(0,Math.min(1,t)); return 1-(1-t)*(1-t); }

/* ── Vector shape library — thin line-art primitives, drawn progressively ── */
const ICON_KEYS = ['circle','triangle','diamond','star','crescent','eye','hamsa','flower','anah'];
const SHAPES = {
  circle(size){
    const r=size/2;
    return [{type:'arc',cx:0,cy:0,r,start:-Math.PI/2,end:-Math.PI/2+Math.PI*2}];
  },
  triangle(size){
    const r=size/2;
    const v0={x:0,y:-r}, v1={x:-r*0.866,y:r*0.5}, v2={x:r*0.866,y:r*0.5};
    return [
      {type:'line',from:v0,to:v1},
      {type:'line',from:v1,to:v2},
      {type:'line',from:v2,to:v0},
    ];
  },
  diamond(size){
    const r=size/2;
    const top={x:0,y:-r}, right={x:r,y:0}, bottom={x:0,y:r}, left={x:-r,y:0};
    return [
      {type:'line',from:top,to:right},
      {type:'line',from:right,to:bottom},
      {type:'line',from:bottom,to:left},
      {type:'line',from:left,to:top},
    ];
  },
  star(size){
    const rOut=size/2, rIn=rOut*0.42, n=16, pts=[];
    for(let i=0;i<n;i++){
      const a=-Math.PI/2+i*(Math.PI/8);
      const r=i%2===0?rOut:rIn;
      pts.push({x:Math.cos(a)*r,y:Math.sin(a)*r});
    }
    const segs=[];
    for(let i=0;i<n;i++) segs.push({type:'line',from:pts[i],to:pts[(i+1)%n]});
    return segs;
  },
  crescent(size){
    return [
      {type:'arc',cx:size*0.05,cy:0,r:size*0.5,start:50*Math.PI/180,end:310*Math.PI/180},
      {type:'arc',cx:size*0.18,cy:0,r:size*0.38,start:310*Math.PI/180,end:50*Math.PI/180},
    ];
  },
  eye(size){
    const r=size*0.5865, dy=size*0.3064;
    return [
      {type:'arc',cx:0,cy:dy, r,start:-148.5*Math.PI/180,end:-31.5*Math.PI/180},
      {type:'arc',cx:0,cy:-dy,r,start:31.5*Math.PI/180, end:148.5*Math.PI/180},
      {type:'arc',cx:0,cy:0,r:size*0.12,start:0,end:Math.PI*2},
    ];
  },
  hamsa(size){
    const r=size*0.35, cy=size*0.08, len=size*0.32;
    const segs=[{type:'arc',cx:0,cy,r,start:0,end:Math.PI*2}];
    for(let i=0;i<5;i++){
      const a=(-150+i*30)*Math.PI/180;
      const px=Math.cos(a)*r, py=cy+Math.sin(a)*r;
      segs.push({type:'line',from:{x:px,y:py},to:{x:px+Math.cos(a)*len,y:py+Math.sin(a)*len}});
    }
    return segs;
  },
  flower(size){
    const petalR=size*0.2, dist=size*0.28, n=6, segs=[
      {type:'arc',cx:0,cy:0,r:size*0.12,start:0,end:Math.PI*2},
    ];
    for(let i=0;i<n;i++){
      const a=-Math.PI/2+i*(Math.PI*2/n);
      segs.push({type:'arc',cx:Math.cos(a)*dist,cy:Math.sin(a)*dist,r:petalR,start:0,end:Math.PI*2});
    }
    return segs;
  },
  // anah — 2D placeholder. In the 3D artifact this key swaps to the loaded
  // anah.gltf model; the 2D outline is just a simple symbolic stand-in.
  anah(size){
    const r=size*0.4, dy=size*0.05;
    return [
      {type:'arc',cx:0,cy:dy, r,                start:Math.PI,         end:0,                  },
      {type:'line',from:{x:r,y:dy},to:{x:r*0.8,y:dy+r*0.6}},
      {type:'line',from:{x:-r,y:dy},to:{x:-r*0.8,y:dy+r*0.6}},
      {type:'line',from:{x:r*0.8,y:dy+r*0.6},to:{x:-r*0.8,y:dy+r*0.6}},
      {type:'arc',cx:0,cy:dy,r:size*0.12,start:0,end:Math.PI*2},
    ];
  },
};

/* ── Family-origin → motif map (placeholder vector symbols) ──
   Maps a country name (as selected in the roots/globe widget)
   to one of the SHAPES keys above. Unmapped countries fall back
   to a deterministic hash-based pick from ICON_KEYS. */
const COUNTRY_MOTIFS = {
  'מרוקו':'hamsa', 'אלג׳יריה':'hamsa', 'תוניסיה':'diamond', 'לוב':'crescent',
  'מצרים':'eye', 'תימן':'crescent', 'עיראק':'eye', 'איראן':'star',
  'תורכיה':'crescent', 'סוריה':'crescent', 'לבנון':'eye',
  'פולין':'star', 'רוסיה':'star', 'יוון':'circle', 'איטליה':'flower',
  'ספרד':'diamond', 'צרפת':'flower', 'גרמניה':'triangle',
  'אנגליה':'circle', 'בריטניה':'circle', 'ארה"ב':'star', 'אמריקה':'star',
  'אתיופיה':'eye', 'הודו':'flower',
};
function motifFallback(name){
  const h=simpleHash(name||'');
  return ICON_KEYS[h%ICON_KEYS.length];
}
function motifForCountry(name){
  return COUNTRY_MOTIFS[(name||'').trim()] || motifFallback(name);
}
/* originToMotif — alias kept explicit per spec (Morocco→hamsa, Iraq→eye, ... ).
   Same lookup table as COUNTRY_MOTIFS; motifForCountry() reads from it. */
const originToMotif = COUNTRY_MOTIFS;

/* ── Simple SVG placeholders for each motif key, used in the debug panel ── */
const MOTIF_SVG = {
  circle:   '<circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  triangle: '<polygon points="20,6 35,33 5,33" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  diamond:  '<polygon points="20,4 36,20 20,36 4,20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  star:     '<polygon points="20,3 24,15 37,15 26,23 30,36 20,28 10,36 14,23 3,15 16,15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  crescent: '<path d="M24,4 A16,16 0 1 0 24,36 A12,12 0 1 1 24,4 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  eye:      '<path d="M3,20 C9,9 31,9 37,20 C31,31 9,31 3,20 Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="20" cy="20" r="3.2" fill="currentColor" stroke="none"/>',
  hamsa:    '<circle cx="20" cy="22" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/>'
            + '<line x1="20" y1="13" x2="20" y2="3" stroke="currentColor" stroke-width="1.6"/>'
            + '<line x1="12" y1="16" x2="5" y2="9" stroke="currentColor" stroke-width="1.6"/>'
            + '<line x1="28" y1="16" x2="35" y2="9" stroke="currentColor" stroke-width="1.6"/>'
            + '<line x1="11" y1="25" x2="3" y2="29" stroke="currentColor" stroke-width="1.6"/>'
            + '<line x1="29" y1="25" x2="37" y2="29" stroke="currentColor" stroke-width="1.6"/>',
  flower:   '<circle cx="20" cy="20" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>'
            + [0,60,120,180,240,300].map(a=>{
                const r=a*Math.PI/180, x=20+Math.cos(r)*9, y=20+Math.sin(r)*9;
                return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
              }).join(''),
};
function motifSvg(key){
  return `<svg viewBox="0 0 40 40">${MOTIF_SVG[key]||MOTIF_SVG.circle}</svg>`;
}

/* ── Gematria reduction — repeated digit-sum down to a single 1-9 value.
   Selects one of the fixed dot compositions; not a progressive fill. ── */
function reduceGematria(g){
  if(g<=0) return 0;
  let n=g;
  while(n>9) n=String(n).split('').reduce((a,d)=>a+Number(d),0);
  return n;
}

/* Fixed dot compositions by reduced value 1–9.
   Counts per region: { top, left, right, bottom }. */
const DOT_COMPOSITIONS = {
  1:{top:0,left:0,right:0,bottom:1},
  2:{top:1,left:0,right:0,bottom:1},
  3:{top:1,left:0,right:0,bottom:2},
  4:{top:1,left:0,right:0,bottom:3},
  5:{top:1,left:1,right:1,bottom:2},
  6:{top:1,left:1,right:1,bottom:3},
  7:{top:2,left:1,right:1,bottom:3},
  8:{top:2,left:2,right:2,bottom:2},
  9:{top:2,left:2,right:2,bottom:3},
};

function renderDebugPanel(){ /* removed — calculation is silent */ }

const SYMBOL_TO_ICON = { 'עיגול':'circle','משולש':'triangle','סהר':'crescent','כוכב':'star','עין':'eye','חמסה':'hamsa','יהלום':'diamond' };
/* Fixed curated word pool for Step 2 — symbolic, open-ended Hebrew words.
   No AI: each word maps to one motif from the existing symbolic library. */
const WORD_POOL = ['רוח','שער','אבן','גשם','זיכרון','מדבר','מסע','ים','צל','שורש','אש','אור','דרך','בית','זמן','שמירה'];
const WORD_TO_MOTIF = {
  'רוח':'crescent','שער':'triangle','אבן':'diamond','גשם':'flower',
  'זיכרון':'eye','מדבר':'star','מסע':'star','ים':'crescent',
  'צל':'circle','שורש':'flower','אש':'triangle','אור':'star',
  'דרך':'diamond','בית':'hamsa','זמן':'circle','שמירה':'eye',
};
const ELEMENT_TO_ICON = {
  'אש 🔥':   {key:'triangle', rot:0},
  'מים 💧':  {key:'crescent', rot:0},
  'אוויר 🌬':{key:'star',     rot:0},
  'אדמה 🌿': {key:'diamond',  rot:Math.PI/4},
};
const ELEMENT_COLOR = {
  'אש 🔥':   ORANGE_RGB,
  'מים 💧':  '0,70,200',
  'אוויר 🌬':'90,130,230',
  'אדמה 🌿': '120,90,40',
};
const ZODIAC_ELEMENT = {
  'טלה':'fire','אריה':'fire','קשת':'fire',
  'שור':'earth','בתולה':'earth','גדי':'earth',
  'תאומים':'air','מאזניים':'air','דלי':'air',
  'סרטן':'water','עקרב':'water','דגים':'water'
};

const QUESTIONS = [
  { id:'origin',    label:'ארץ מוצא',   text:'מאיפה מתחיל\nהסיפור שלך?',     type:'geo' },
  { id:'word',      label:'מילה',       text:'איזו מילה\nתפסה לך את העין?',  type:'words' },
  { id:'stars',     label:'כוכבים',     text:'בחר שלושה כוכבים',             type:'stars' },
  { id:'personal',  label:'מילה אישית', text:'איזו מילה\nתרצה לשאת איתך?',   type:'text',   placeholder:'מילה אחת...' },
  { id:'name',      label:'שם',         text:'איך קוראים לך?',               type:'text',   placeholder:'כתבי את שמך...' },
];

/* Maps each question id to its fixed pendant layer (drawing/animation slot),
   independent of question order in the array above. */
const LAYER_BY_ID = { name:1, word:2, symbol:2, stars:3, birthdate:3, origin:4, zodiac:5, element:6, personal:7 };
/* Hidden behind each star in Step 3 — placeholder motifs from the existing
   symbolic library. The pool is intentionally fixed; user discovers, doesn't pick. */
const HIDDEN_STAR_MOTIFS = ['eye','hamsa','crescent','diamond','flower','triangle','circle','star','eye','crescent','flower','diamond'];

const ENTER_ANIMS = ['q-enter-slide','q-enter-scale','q-enter-blur','q-enter-3d','q-enter-drift','q-enter-rise'];

const st = {
  current:0, answers:{}, layerProgress:new Array(8).fill(0),
  particles:[], gematriaValue:0,
};
const layerStart = new Array(8).fill(-Infinity);
let cvs=null, ctx2d=null, LW=0, LH=0, sc=1, grainCvs=null;

/* ── Pendant zones (fixed, always vertical) ── */
function Z() {
  sc = Math.min(LW,LH)/340;
  const cx=LW*0.50;
  const m=Math.min(LW,LH);
  return {
    cx, sc, m,
    chainY: LH*0.05,
    headY:  LH*0.23,
    gapY:   LH*0.36,
    bodyY:  LH*0.51,
    ringY:  LH*0.665,
    foundY: LH*0.80,
    tipY:   LH*0.885,
    capY:   LH*0.945,
    crownD: m*0.36,
    bodyD:  m*0.27,
    elemD:  m*0.17,
  };
}

/* ── Entry ── */
export function initQuestionnaire() {
  cvs=document.getElementById('artifact-canvas'); if(!cvs) return;
  ctx2d=cvs.getContext('2d');
  buildProgressList(); renderQuestion(0); bindEvents(); triggerLayer(0); renderDebugPanel();
  const ro=new ResizeObserver(()=>resizeCanvas());
  ro.observe(cvs.parentElement);
  resizeCanvas(); animate();
}
function resizeCanvas(){
  if(!cvs) return;
  const p=cvs.parentElement, dpr=window.devicePixelRatio||1;
  LW=p.clientWidth||300; LH=p.clientHeight||500;
  cvs.width=LW*dpr; cvs.height=LH*dpr;
  cvs.style.width=LW+'px'; cvs.style.height=LH+'px';
  ctx2d.setTransform(dpr,0,0,dpr,0,0);
  grainCvs=null;
}

function buildProgressList(){
  const list=document.getElementById('progress-list'); if(!list) return;
  list.innerHTML=QUESTIONS.map((_,i)=>`<div class="prog-item ${i===0?'prog-active':'prog-future'}" data-idx="${i}"><div class="prog-dot-wrap"><div class="prog-dot"></div><div class="prog-line"></div></div></div>`).join('');
}
function updateProgressList(idx){
  document.querySelectorAll('.prog-item').forEach((el,i)=>{
    el.className='prog-item '+(i<idx?'prog-done':i===idx?'prog-active':'prog-future');
  });
}

const STAGE_COORDS = [
  '32.0853° N, 34.7818° E', // Tel Aviv
  '41.7151° N, 44.8271° E', // Tbilisi
  '30.0444° N, 31.2357° E', // Cairo
  '55.7558° N, 37.6173° E', // Moscow
  '31.7683° N, 35.2137° E', // Jerusalem
  '32.7940° N, 34.9896° E'  // Haifa
];
const STAGE_LABELS = [
  'REMIX / REIMAGINE',
  'ZODIAC / CONSTELLATION',
  'MYTHOLOGY / MOTIF',
  'ORIGINS / ANCESTRY',
  'PATHS / INK TRAIL',
  'TALISMAN / RENDER'
];

function renderQuestion(idx){
  const q=QUESTIONS[idx]; if(!q) return;
  const midContainer = document.getElementById('word-field-container');
  if (midContainer) midContainer.innerHTML = '';
  st.current=idx;
  document.getElementById('section-3')?.setAttribute('data-stage',idx);
  document.getElementById('q-num-current').textContent=String(idx+1).padStart(2,'0');
  document.getElementById('q-num-total').textContent=String(QUESTIONS.length).padStart(2,'0');

  // Update dynamic decorative elements for the grid layout
  const decoNumber = document.getElementById('deco-number-val');
  if (decoNumber) decoNumber.textContent = String(idx+1).padStart(2,'0');

  const decoCoord = document.getElementById('deco-coord-val');
  if (decoCoord) decoCoord.textContent = STAGE_COORDS[idx] || '';

  const decoBrandText = document.querySelector('#q-deco-mid-right .deco-brand-text');
  if (decoBrandText) decoBrandText.textContent = STAGE_LABELS[idx] || '';

  const qEl=document.getElementById('q-text');
  qEl.innerHTML=q.text.replace(/\n/g,'<br>'); qEl.setAttribute('data-q',idx);
  const numEl=document.getElementById('q-num-current');
  numEl.classList.remove('count-pop'); void numEl.offsetWidth; numEl.classList.add('count-pop');
  const wrap=document.getElementById('q-input-wrap');
  wrap.classList.remove('roots-active','words-active','stars-active');
  if(q.type==='stars'){
    const items=HIDDEN_STAR_MOTIFS.map((m,i)=>{
      const left=8+((i*47)%84);
      const top=8+((i*29)%80);
      const size=18+((i*5)%10);
      const dur=4+((i*3)%5);
      const delay=-((i*1.3)%5);
      return `<span class="star-pick" data-idx="${i}" data-motif="${m}" style="left:${left}%;top:${top}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay}s"><svg viewBox="0 0 40 40">${MOTIF_SVG.star}</svg><span class="star-reveal"><svg viewBox="0 0 40 40">${MOTIF_SVG[m]||MOTIF_SVG.circle}</svg></span></span>`;
    }).join('');
    wrap.classList.add('stars-active');
    wrap.innerHTML=`<div id="star-field">${items}</div>`;
    const picked=[];
    document.querySelectorAll('.star-pick').forEach(el=>{
      el.addEventListener('click',()=>{
        if(el.classList.contains('chosen')||picked.length>=3) return;
        el.classList.add('chosen');
        picked.push(el.dataset.motif);
        if(picked.length===3){
          document.querySelectorAll('.star-pick:not(.chosen)').forEach(o=>o.classList.add('fade-out'));
          st.answers.stars=picked.slice();
          setTimeout(()=>advance(),1100);
        }
      });
    });
  } else if(q.type==='words'){
    const shuffled = [...WORD_POOL];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const items = shuffled.map((w, i) => {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const baseX = 12 + col * 23;
      const baseY = 10 + row * 22;
      const jitterX = (Math.random() - 0.5) * 8;
      const jitterY = (Math.random() - 0.5) * 8;
      const left = baseX + jitterX;
      const top = baseY + jitterY;
      
      const size = 0.95 + Math.random() * 0.55;
      const dur = 7 + Math.random() * 6;
      const delay = -Math.random() * 6;
      
      return `<span class="float-word" data-word="${w}" style="left:${left}%;top:${top}%;font-size:${size}rem;animation-duration:${dur}s;animation-delay:${delay}s">${w}</span>`;
    }).join('');
    
    const midContainer = document.getElementById('word-field-container');
    if (midContainer) {
      midContainer.innerHTML = `<div id="word-field">${items}</div>`;
    }
    
    wrap.classList.add('words-active');
    wrap.innerHTML = '';
    
    document.querySelectorAll('.float-word').forEach(el=>{
      el.addEventListener('click',()=>{
        const w=el.dataset.word;
        document.querySelectorAll('.float-word').forEach(o=>{ if(o!==el) o.classList.add('fade-out'); });
        el.classList.add('chosen');
        st.answers.word=w;
        setTimeout(()=>advance(),420);
      });
    });
  } else if(q.type==='choice'){
    wrap.innerHTML=`<div id="q-choices">${q.choices.map(c=>`<button class="choice-btn" data-value="${c}">${c}</button>`).join('')}</div>`;
    document.querySelectorAll('.choice-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        document.querySelectorAll('.choice-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected'); submitChoiceAnswer(btn.dataset.value);
      });
    });
  } else if(q.type==='geo'){
    wrap.innerHTML=`<div id="roots-host"></div><div id="selected-origins-list"></div>`;
    wrap.classList.add('roots-active');
    st.roots = st.roots || [];
    st.selectedOrigins = st.roots; // alias — array of chosen origin countries
    const updateSelectedOriginsList=()=>{
      const listEl=document.getElementById('selected-origins-list');
      if(listEl) listEl.textContent = st.roots.join(', ');
    };
    updateSelectedOriginsList();
    initRootsWidget(document.getElementById('roots-host'),{
      targetEl: document.getElementById('artifact-canvas'),
      onAdd:(name)=>{
        st.roots.push(name);
        st.answers.origin = st.roots.join(', ');
        triggerLayer(4); spawnBurst(); renderDebugPanel();
        updateSelectedOriginsList();
      },
      onDone:()=>{
        if(!st.answers.origin) st.answers.origin = st.roots.join(', ');
        advance();
      },
    });
  } else {
    wrap.innerHTML=`<textarea id="q-input" dir="rtl" rows="2" placeholder="${q.placeholder}"></textarea><button id="q-submit" aria-label="המשך">המשך</button>`;
    const inp=document.getElementById('q-input');
    inp.value=st.answers[q.id]||''; setTimeout(()=>inp.focus(),350);
    document.getElementById('q-submit').addEventListener('click',submitAnswer);
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submitAnswer();}});
    if(q.id==='name') inp.addEventListener('input',()=>{ st.gematriaValue=calcGematria(inp.value); renderDebugPanel(); });
  }
  updateProgressList(idx);
  const pb=document.getElementById('q-prev'); if(pb) pb.style.opacity=idx>0?'1':'0.2';
  const sb=document.getElementById('q-skip'); if(sb) sb.style.opacity=idx<QUESTIONS.length-1?'1':'0';
}

function bindEvents(){
  document.getElementById('q-prev')?.addEventListener('click',goPrev);
  document.getElementById('q-skip')?.addEventListener('click',goSkip);
}
function submitAnswer(){
  const inp=document.getElementById('q-input'), val=inp?.value?.trim();
  if(!val){inp?.classList.add('shake');setTimeout(()=>inp?.classList.remove('shake'),500);return;}
  st.answers[QUESTIONS[st.current].id]=val;
  if(QUESTIONS[st.current].id==='name') st.gematriaValue=calcGematria(val);
  advance();
}
function submitChoiceAnswer(val){
  st.answers[QUESTIONS[st.current].id]=val;
  setTimeout(()=>advance(),320);
}
function advance(){
  triggerLayer(LAYER_BY_ID[QUESTIONS[st.current].id]); spawnBurst();
  if(st.current>=QUESTIONS.length-1) finishQuestionnaire();
  else transitionQuestion(st.current+1);
}
function goPrev(){ if(st.current>0) transitionQuestion(st.current-1); }
function goSkip(){ if(st.current<QUESTIONS.length-1) transitionQuestion(st.current+1); }
function transitionQuestion(next){
  const col=document.getElementById('q-content'); if(!col){renderQuestion(next);return;}
  col.classList.add('q-exit');
  setTimeout(()=>{
    renderQuestion(next); col.classList.remove('q-exit');
    const anim=ENTER_ANIMS[next%ENTER_ANIMS.length]; col.classList.add(anim);
    setTimeout(()=>col.classList.remove(anim),700);
  },280);
}
function finishQuestionnaire(){
  // Pendant is complete — show the "סיימתי" invitation rather than auto-advance.
  for(let i=st.current+1;i<8;i++) triggerLayer(i);
  // Snapshot the canvas dimensions the user actually saw the pendant in.
  // The 3D artifact must be built against THIS layout, not the wider
  // artifact-view container — otherwise motif sizes and gaps would drift
  // when the container changes shape.
  st.pendantLayout = { width: LW, height: LH };
  const col=document.getElementById('q-content');
  if(col){
    col.innerHTML=`<button id="finish-pendant" class="finish-blink">סיימתי</button>`;
    document.getElementById('finish-pendant')?.addEventListener('click',enterArtifactView);
  }
}
function enterArtifactView(){
  document.getElementById('section-3')?.classList.add('artifact-view');
  // Force a synchronous layout flush so the expanded artifact-col reports
  // its full dimensions, then mount the 3D scene without relying on rAF
  // (which can be throttled when the tab is not focused).
  const col=document.getElementById('artifact-col');
  if(!col) return;
  void col.offsetWidth;
  resizeCanvas();
  if(cvs) cvs.style.display='none';
  const data=buildArtifactData(col.clientWidth, col.clientHeight);
  mountArtifact3D(col, data);
}

/* Gathers the generated pendant's data for the 3D module. The composition
   (positions, motif choices, dot layout) is read straight from current state. */
function buildArtifactData(width,height){
  // Use the dimensions of the 2D pendant the user actually saw, not the
  // expanded artifact-view container. This locks the composition (motif
  // sizes, gaps, positions) — fitCamera will then scale the whole mesh.
  const layoutW = st.pendantLayout?.width  || width;
  const layoutH = st.pendantLayout?.height || height;
  const prevLW=LW, prevLH=LH;
  LW=layoutW; LH=layoutH;
  const Zv=Z();
  LW=prevLW; LH=prevLH;

  const word=st.answers.word;
  const personal=(st.answers.personal||'').trim();
  const origins=st.selectedOrigins||st.roots||[];

  let sidesMotif=null;
  if(personal){
    const h=simpleHash(personal);
    sidesMotif=ICON_KEYS[h%ICON_KEYS.length];
  }

  // Recompute dot positions using the new Z() values.
  const val=reduceGematria(st.gematriaValue||0);
  const comp=DOT_COMPOSITIONS[val];
  const dots=[];
  if(comp){
    const {cx,headY,bodyY,foundY,crownD,bodyD,elemD,sc}=Zv;
    const r=1.7*sc, gap=4, sp=9*sc;
    const yTopA=headY - crownD*0.5 - r - gap;
    if(comp.top===1) dots.push({x:cx,y:yTopA});
    else if(comp.top===2) dots.push({x:cx,y:yTopA},{x:cx,y:yTopA-sp*2});
    const yBotA=foundY + elemD*0.5 + r + gap;
    if(comp.bottom===1) dots.push({x:cx,y:yBotA});
    else if(comp.bottom===2) dots.push({x:cx,y:yBotA},{x:cx,y:yBotA+sp*2});
    else if(comp.bottom===3) dots.push({x:cx,y:yBotA},{x:cx,y:yBotA+sp*2},{x:cx,y:yBotA+sp*4});
    const sCx=bodyD*0.85, sH=elemD*0.85*0.5;
    const xLA=cx - sCx - sH - r - gap;
    const xRA=cx + sCx + sH + r + gap;
    if(comp.left===1) dots.push({x:xLA,y:bodyY});
    else if(comp.left===2) dots.push({x:xLA,y:bodyY},{x:xLA-sp*2,y:bodyY});
    if(comp.right===1) dots.push({x:xRA,y:bodyY});
    else if(comp.right===2) dots.push({x:xRA,y:bodyY},{x:xRA+sp*2,y:bodyY});
  }

  // Tilt/rotation values used in the 2D draw — must match exactly.
  const crownTilt = ((simpleHash(st.answers.name||'')%21)-10) * Math.PI/180 * 0.4;
  let sideRot = 0;
  if(personal){ const h=simpleHash(personal); sideRot = ((h>>4)%8)*(Math.PI/8); }

  return {
    width, height,
    zones:Zv,
    crown: word ? { motif: WORD_TO_MOTIF[word]||'circle', tilt: crownTilt } : null,
    seed:  origins.length ? { origins: origins.map(motifForCountry) } : null,
    sides: sidesMotif ? { motif: sidesMotif, rotation: sideRot } : null,
    stars: (st.answers.stars||[]).slice(),
    dots,
  };
}

function triggerLayer(i){ if(i>=0&&i<8) layerStart[i]=performance.now(); }
function updateLayers(now){ for(let i=0;i<8;i++){ if(layerStart[i]===-Infinity) continue; st.layerProgress[i]=Math.min((now-layerStart[i])/LAYER_DUR,1); } }
function lp(i){ return easeIO(st.layerProgress[i]||0); }
function rawP(i){ return st.layerProgress[i]||0; }
function layerAge(i){ return layerStart[i]===-Infinity?Infinity:performance.now()-layerStart[i]; }
function isNew(i){ return layerAge(i)<1100; }

function spawnBurst(){
  const {cx,bodyY}=Z();
  for(let i=0;i<16;i++){
    const a=Math.random()*Math.PI*2,v=1.5+Math.random()*3.5;
    st.particles.push({x:cx,y:bodyY,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,decay:0.013+Math.random()*0.015,r:1+Math.random()*3,orange:Math.random()>0.5});
  }
}
function updateParticles(){ st.particles=st.particles.filter(p=>p.life>0); st.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=0.92;p.vy*=0.92;p.life-=p.decay;}); }

function animate(){
  const now=performance.now();
  updateLayers(now); updateParticles();
  drawCanvas(now);
  requestAnimationFrame(animate);
}

/* ══════════════════════════════════════════
   MAIN DRAW — vertical icon talisman
   chain → crown icon → date marks → body icon
   → gematria tick/ring → element icon → cap ring
══════════════════════════════════════════ */
function drawCanvas(now){
  if(!ctx2d||!LW) return;
  ctx2d.clearRect(0,0,LW,LH);
  if(st.artifactView){
    // Presentation mode — same geometry, re-drawn with thick rounded strokes
    // and a pink→orange gradient. No realistic materials, no lighting.
    drawArtifactPresentation();
    drawLightSweep(now);
    return;
  }
  drawGrain();
  drawAtmosphere(now);
  drawSpine(now);
  drawCrownIcon(now);
  drawStarSymbols(now);
  drawBodyIcon(now);
  drawSideElements(now);
  drawGematriaMark(now);
  drawNameDots(now);
  drawChainTop(now);
  drawParticles();
}

/* Artifact presentation — chunky rounded strokes + gradient give the
   pendant a graphic, contemporary "soft volume" feeling.
   The geometry is identical to what was generated; only the visual
   treatment changes. */
function drawArtifactPresentation(){
  const Zv=Z();
  const {cx,chainY,headY,bodyY,foundY,tipY,capY,crownD,bodyD,elemD,sc}=Zv;
  const baseLW=Math.max(10, Math.min(LW,LH)*0.025);

  // Pink → orange diagonal gradient across the whole pendant volume.
  const grad=ctx2d.createLinearGradient(LW*0.12, chainY, LW*0.88, capY);
  grad.addColorStop(0,    '#F73B95');
  grad.addColorStop(0.45, '#FF5468');
  grad.addColorStop(1,    '#FF8A2E');

  ctx2d.lineCap='round'; ctx2d.lineJoin='round';
  ctx2d.strokeStyle=grad; ctx2d.fillStyle=grad;

  // Soft pseudo-depth — fakes the matte volumetric shading of the reference.
  ctx2d.shadowColor='rgba(247,59,149,0.22)';
  ctx2d.shadowBlur=baseLW*0.6;
  ctx2d.shadowOffsetX=1;
  ctx2d.shadowOffsetY=baseLW*0.18;

  // Chain top loop
  ctx2d.lineWidth=baseLW*0.55;
  ctx2d.beginPath(); ctx2d.arc(cx,chainY,14*sc,0,Math.PI*2); ctx2d.stroke();

  // Spine
  ctx2d.lineWidth=baseLW*0.42;
  ctx2d.beginPath(); ctx2d.moveTo(cx,chainY+10*sc); ctx2d.lineTo(cx,tipY); ctx2d.stroke();

  const drawMotif=(key,x,y,size,rot=0,lw=baseLW)=>{
    const gen=SHAPES[key]||SHAPES.circle;
    ctx2d.save();
    ctx2d.translate(x,y);
    if(rot) ctx2d.rotate(rot);
    ctx2d.lineWidth=lw;
    strokeProgressive(ctx2d,gen(size),1);
    ctx2d.restore();
  };

  // Crown / upper motif (word discovery)
  const word=st.answers.word;
  if(word){
    const key=WORD_TO_MOTIF[word]||'circle';
    drawMotif(key,cx,headY,crownD*0.85,0,baseLW);
  }

  // Side elements (personal word) — symmetric pair flanking the seed
  const personal=(st.answers.personal||'').trim();
  if(personal){
    const h=simpleHash(personal);
    const key=ICON_KEYS[h%ICON_KEYS.length];
    const sideX=bodyD*0.85, size=elemD*0.9;
    drawMotif(key,cx-sideX,bodyY,size,0,baseLW*0.82);
    drawMotif(key,cx+sideX,bodyY,size,0,baseLW*0.82);
  }

  // Origin seed (hybrid if multiple)
  const origins=st.selectedOrigins||st.roots||[];
  if(origins.length===1){
    drawMotif(motifForCountry(origins[0]),cx,bodyY,bodyD*0.82,0,baseLW);
  } else if(origins.length>1){
    origins.forEach((o,i)=>{
      const rot=(i*Math.PI)/origins.length;
      drawMotif(motifForCountry(o),cx,bodyY,bodyD*0.78,rot,baseLW*0.85);
    });
  }

  // Three star motifs stacked between seed and foundation
  const stars=st.answers.stars||[];
  if(stars.length){
    const yStart=bodyY+elemD*0.95, yEnd=foundY-elemD*0.35;
    stars.forEach((m,i)=>{
      const y=stars.length===1?(yStart+yEnd)/2:lerp(yStart,yEnd,i/(stars.length-1));
      drawMotif(m,cx,y,elemD*0.88,0,baseLW*0.78);
    });
  }

  // Gematria composition dots — small filled spheres
  ctx2d.shadowOffsetY=baseLW*0.10;
  const positions=gematriaDotPositions();
  positions.forEach(pos=>{
    ctx2d.beginPath(); ctx2d.arc(pos.x,pos.y,baseLW*0.42,0,Math.PI*2); ctx2d.fill();
  });

  // Reset shadow so the light sweep overlay isn't shadowed.
  ctx2d.shadowColor='transparent';
  ctx2d.shadowBlur=0; ctx2d.shadowOffsetX=0; ctx2d.shadowOffsetY=0;
}

/* Subtle light sweep — a soft orange band travels across the line work
   once on entry to artifact view, then fades. Vector/line-based: it only
   tints existing strokes via source-atop, no glow, no depth, no rendering. */
function drawLightSweep(now){
  const dur=2200;
  const t=(now-(st.artifactStart||now))/dur;
  if(t<0||t>1.3) return;
  const u=Math.max(0,Math.min(1,t));
  const fade=t<1?1:Math.max(0,1-(t-1)/0.3);
  const bandW=LW*0.55;
  const startX=-bandW, endX=LW;
  const x=startX+(endX-startX)*u;
  ctx2d.save();
  ctx2d.globalCompositeOperation='source-atop';
  const g=ctx2d.createLinearGradient(x,0,x+bandW,0);
  g.addColorStop(0,   'rgba(253,112,65,0)');
  g.addColorStop(0.5, `rgba(253,112,65,${(0.85*fade).toFixed(3)})`);
  g.addColorStop(1,   'rgba(253,112,65,0)');
  ctx2d.fillStyle=g;
  ctx2d.fillRect(0,0,LW,LH);
  ctx2d.restore();
}

/* ── Grain ── */
function drawGrain(){
  if(!grainCvs||grainCvs.width!==LW||grainCvs.height!==LH){
    grainCvs=document.createElement('canvas'); grainCvs.width=LW; grainCvs.height=LH;
    const gc=grainCvs.getContext('2d'), id=gc.createImageData(LW,LH);
    for(let i=0;i<id.data.length;i+=4){const v=Math.random()>0.5?255:0;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=Math.random()*9;}
    gc.putImageData(id,0,0);
  }
  ctx2d.globalAlpha=0.2; ctx2d.drawImage(grainCvs,0,0,LW,LH); ctx2d.globalAlpha=1;
}

/* ── Atmosphere — subtle grid + a glow that follows the newest layer ── */
function drawAtmosphere(now){
  const {cx,headY,bodyY,foundY}=Z();
  ctx2d.save(); ctx2d.strokeStyle='rgba(252,247,241,0.04)'; ctx2d.lineWidth=0.4;
  const gs=24*sc; ctx2d.beginPath();
  for(let x=gs;x<LW;x+=gs){ctx2d.moveTo(x,0);ctx2d.lineTo(x,LH);}
  for(let y=gs;y<LH;y+=gs){ctx2d.moveTo(0,y);ctx2d.lineTo(LW,y);}
  ctx2d.stroke(); ctx2d.restore();

  const focusLayer=LAYER_BY_ID[QUESTIONS[st.current]?.id];
  const focusY={2:headY,4:bodyY,6:foundY}[focusLayer];
  const p=lp(focusLayer);
  if(focusY!==undefined&&p>0&&p<1){
    const g=ctx2d.createRadialGradient(cx,focusY,0,cx,focusY,LH*0.42);
    g.addColorStop(0,`rgba(${ORANGE_RGB},${0.06*(1-p)})`); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx2d.save(); ctx2d.fillStyle=g; ctx2d.fillRect(0,0,LW,LH); ctx2d.restore();
  }

  /* element-tinted aura, layer 6 */
  const p6=lp(6);
  if(p6>0&&st.answers.element){
    const rgb=ELEMENT_COLOR[st.answers.element]||BLUE_RGB;
    const g=ctx2d.createRadialGradient(cx,bodyY,0,cx,bodyY,LH*0.55);
    g.addColorStop(0,`rgba(${rgb},${p6*0.10})`); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx2d.save(); ctx2d.fillStyle=g; ctx2d.fillRect(0,0,LW,LH); ctx2d.restore();
  }
}

/* ── Central spine — the thread the talisman hangs on ── */
function drawSpine(now){
  const p=lp(0); if(p<=0) return;
  const {cx,chainY,tipY}=Z();
  ctx2d.save();
  ctx2d.globalAlpha=p*0.22; ctx2d.strokeStyle=BLUE; ctx2d.lineWidth=0.7;
  ctx2d.beginPath(); ctx2d.moveTo(cx,chainY); ctx2d.lineTo(cx,tipY); ctx2d.stroke();
  ctx2d.restore();
}

/* ── Chain link at top ── */
function drawChainTop(now){
  const p=lp(0); if(p<=0) return;
  const {cx,chainY,sc}=Z();
  ctx2d.save();
  ctx2d.globalAlpha=p*0.5; ctx2d.strokeStyle=BLUE; ctx2d.lineWidth=0.9;
  ctx2d.beginPath(); ctx2d.ellipse(cx,chainY-9*sc,3.5*sc,6*sc,0,0,Math.PI*2); ctx2d.stroke();
  ctx2d.beginPath(); ctx2d.moveTo(cx,chainY-3*sc); ctx2d.lineTo(cx,chainY+3*sc); ctx2d.stroke();
  ctx2d.restore();
}

/* ── Helpers ── */
function segLength(seg){
  if(seg.type==='line') return Math.hypot(seg.to.x-seg.from.x, seg.to.y-seg.from.y);
  return Math.abs(seg.end-seg.start)*seg.r;
}
function segStart(seg){
  if(seg.type==='line') return seg.from;
  return {x:seg.cx+Math.cos(seg.start)*seg.r, y:seg.cy+Math.sin(seg.start)*seg.r};
}
/* Strokes `segments` up to `reveal` (0..1) of their total length, as one path —
   gives the "being drawn" effect by literally truncating the path mid-segment. */
function strokeProgressive(ctx,segments,reveal){
  reveal=Math.max(0,Math.min(1,reveal));
  if(reveal<=0) return;
  const lens=segments.map(segLength);
  const total=lens.reduce((a,b)=>a+b,0);
  if(total<=0) return;
  let remaining=total*reveal;
  ctx.beginPath();
  for(let i=0;i<segments.length;i++){
    const seg=segments[i], segLen=lens[i];
    if(segLen<=0) continue;
    const start=segStart(seg);
    if(remaining>=segLen-0.001){
      ctx.moveTo(start.x,start.y);
      if(seg.type==='line') ctx.lineTo(seg.to.x,seg.to.y);
      else ctx.arc(seg.cx,seg.cy,seg.r,seg.start,seg.end,seg.end<seg.start);
      remaining-=segLen;
    } else {
      const t=remaining/segLen;
      ctx.moveTo(start.x,start.y);
      if(seg.type==='line'){
        ctx.lineTo(lerp(seg.from.x,seg.to.x,t), lerp(seg.from.y,seg.to.y,t));
      } else {
        const endA=seg.start+(seg.end-seg.start)*t;
        ctx.arc(seg.cx,seg.cy,seg.r,seg.start,endA,seg.end<seg.start);
      }
      break;
    }
  }
  ctx.stroke();
}
/* Draws a vector shape centered at (x,y), progressively revealed by `reveal` (0..1). */
function drawShape(key,x,y,size,rotation,reveal,alpha,color,lw){
  const gen=SHAPES[key]||SHAPES.circle;
  ctx2d.save();
  ctx2d.globalAlpha=alpha;
  ctx2d.translate(x,y);
  if(rotation) ctx2d.rotate(rotation);
  ctx2d.strokeStyle=color||BLUE;
  ctx2d.lineWidth=lw||Math.max(1,1.2*sc);
  ctx2d.lineCap='round'; ctx2d.lineJoin='round';
  strokeProgressive(ctx2d,gen(size),reveal);
  ctx2d.restore();
}
function drawGlow(x,y,r,rgb,alpha){
  if(alpha<=0) return;
  const g=ctx2d.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,`rgba(${rgb},${alpha})`); g.addColorStop(1,'rgba(0,0,0,0)');
  ctx2d.save(); ctx2d.fillStyle=g; ctx2d.beginPath(); ctx2d.arc(x,y,r,0,Math.PI*2); ctx2d.fill(); ctx2d.restore();
}

/* ══════════════════════════════════════════
   LAYER 2 — CROWN ICON (Symbol)
   The largest icon. Crowns the talisman.
══════════════════════════════════════════ */
function drawCrownIcon(now){
  const p=lp(2); if(p<=0) return;
  const word=st.answers.word, symbol=st.answers.symbol;
  if(!word && !symbol) return;
  const key = word ? (WORD_TO_MOTIF[word]||'circle') : (SYMBOL_TO_ICON[symbol]||'circle');
  const {cx,headY,crownD,sc}=Z();
  const fresh=isNew(2);
  const t=now*0.0013;
  const scaleIn=p<0.6?easeOut(p/0.6):1;
  const breathe=p>=1?1+0.02*Math.sin(t):1;
  const tilt=((simpleHash(st.answers.name||'')%21)-10)*Math.PI/180*0.4; // subtle asymmetric tilt

  if(fresh){
    drawGlow(cx,headY,crownD*0.85,ORANGE_RGB,0.30*Math.sin(rawP(2)*Math.PI));
  }
  /* orbit ring marking the crown's reach */
  if(p>0.3){
    ctx2d.save(); ctx2d.globalAlpha=(p-0.3)/0.7*0.16; ctx2d.strokeStyle=BLUE; ctx2d.lineWidth=0.6;
    ctx2d.setLineDash([2,11]); ctx2d.lineDashOffset=-(t*22);
    ctx2d.beginPath(); ctx2d.arc(cx,headY,crownD*0.66,0,Math.PI*2); ctx2d.stroke();
    ctx2d.setLineDash([]); ctx2d.restore();
  }

  drawShape(key,cx,headY,crownD*scaleIn*breathe,tilt,rawP(2),p,fresh?ORANGE:BLUE,Math.max(1,1.3*sc));
}

/* ══════════════════════════════════════════
   LAYER 3 — STAR SYMBOLS (Discovery)
   Three motifs revealed from behind chosen stars,
   stacked vertically below the central seed.
══════════════════════════════════════════ */
function drawStarSymbols(now){
  const p=lp(3); if(p<=0) return;
  const stars=st.answers.stars||[]; if(stars.length===0) return;
  const {cx,bodyY,foundY,elemD,sc}=Z();
  const fresh=isNew(3);
  const n=stars.length;
  const yStart=bodyY+elemD*0.85, yEnd=foundY-elemD*0.4;
  const size=elemD*0.78;

  stars.forEach((motif,i)=>{
    const y=n===1?(yStart+yEnd)/2:lerp(yStart,yEnd,i/(n-1));
    const segP=easeOut(Math.max(0,Math.min(1,(rawP(3)*n-i)/1.1)));
    if(segP<=0) return;
    const isLast=(i===n-1);
    const scaleIn=segP<0.6?easeOut(segP/0.6):1;
    drawShape(motif,cx,y,size*scaleIn,0,segP,p*0.9,(fresh&&isLast)?ORANGE:BLUE,Math.max(1,1.0*sc));
  });
}

/* ══════════════════════════════════════════
   LAYER 7 — SIDE ELEMENTS (Personal word)
   Symmetric pair flanking the seed. Placeholder
   mapping (hash → motif) until AI interpretation
   replaces it later — no new symbols generated.
══════════════════════════════════════════ */
function drawSideElements(now){
  const p=lp(7); if(p<=0) return;
  const word=(st.answers.personal||'').trim(); if(!word) return;
  const {cx,bodyY,bodyD,elemD,sc}=Z();
  const h=simpleHash(word);
  const key=ICON_KEYS[h%ICON_KEYS.length];
  const fresh=isNew(7);
  const scaleIn=p<0.6?easeOut(p/0.6):1;
  const size=elemD*0.85;
  const offset=bodyD*0.85;
  const rot=((h>>4)%8)*(Math.PI/8);

  if(fresh){
    drawGlow(cx,bodyY,bodyD*1.0,ORANGE_RGB,0.18*Math.sin(rawP(7)*Math.PI));
  }
  drawShape(key,cx-offset,bodyY,size*scaleIn,-rot,rawP(7),p*0.9,fresh?ORANGE:BLUE,Math.max(1,1.0*sc));
  drawShape(key,cx+offset,bodyY,size*scaleIn, rot,rawP(7),p*0.9,fresh?ORANGE:BLUE,Math.max(1,1.0*sc));
}

/* ══════════════════════════════════════════
   LAYER 3 (legacy) — DATE MARKS (Birthdate)
   Horizontal hatch lines crossing the spine
   in the gap between crown and body.
══════════════════════════════════════════ */
function drawDateMarks(now){
  const p=lp(3); if(p<=0) return;
  const {cx,gapY,sc}=Z();
  const dateStr=st.answers.birthdate||'';
  const nums=dateStr.replace(/[^0-9]/g,' ').trim().split(/\s+/).map(Number).filter(n=>!isNaN(n)&&n>0);
  const day=Math.max(1,Math.min(31,nums[0]||15));
  const month=Math.max(1,Math.min(12,nums[1]||6));
  const n=2+(month%4); // 2-5 marks
  const fresh=isNew(3);
  const baseW=(8+(day%10))*sc;

  ctx2d.save();
  for(let i=0;i<n;i++){
    const lineP=easeOut(Math.max(0,Math.min(1,(rawP(3)*n-i)/1.1))); if(lineP<=0) continue;
    const y=gapY+(i-(n-1)/2)*5.5*sc;
    const w=baseW*(1-Math.abs(i-(n-1)/2)*0.18);
    ctx2d.globalAlpha=p*lineP*(i===Math.floor((n-1)/2)?0.55:0.3);
    ctx2d.strokeStyle=fresh&&lineP<0.85?ORANGE:BLUE; ctx2d.lineWidth=0.8;
    ctx2d.beginPath(); ctx2d.moveTo(cx-w*lineP,y); ctx2d.lineTo(cx+w*lineP,y); ctx2d.stroke();
  }
  ctx2d.restore();
}

/* ══════════════════════════════════════════
   LAYER 4 — BODY ICON (Origin)
   Medium icon, hash-selected (different from crown),
   rotated by hash. The pendant's central mass.
══════════════════════════════════════════ */
function drawBodyIcon(now){
  const p=lp(4); if(p<=0) return;
  const {cx,bodyY,bodyD,sc}=Z();
  const fresh=isNew(4);
  const scaleIn=p<0.6?easeOut(p/0.6):1;
  const origins=st.selectedOrigins||st.roots||[];

  if(fresh){
    drawGlow(cx,bodyY,bodyD*0.8,ORANGE_RGB,0.26*Math.sin(rawP(4)*Math.PI));
  }

  if(origins.length===0){
    // No origin selected yet — fall back to a hash-derived placeholder icon
    const h=simpleHash(st.answers.origin||'');
    const crownKey=SYMBOL_TO_ICON[st.answers.symbol]||'circle';
    let idx=h%ICON_KEYS.length, key=ICON_KEYS[idx];
    if(key===crownKey) key=ICON_KEYS[(idx+1)%ICON_KEYS.length];
    const rot=((h>>4)%4)*(Math.PI/2);
    drawShape(key,cx,bodyY,bodyD*scaleIn,rot,rawP(4),p,fresh?ORANGE:BLUE,Math.max(1,1.3*sc));
    return;
  }

  if(origins.length===1){
    const key=motifForCountry(origins[0]);
    drawShape(key,cx,bodyY,bodyD*scaleIn,0,rawP(4),p,fresh?ORANGE:BLUE,Math.max(1,1.3*sc));
    return;
  }

  // Multiple origins — a single hybrid seed symbol: each motif overlaid
  // at the same center with a rotation offset, not a pendant layout.
  const n=origins.length;
  origins.forEach((name,i)=>{
    const key=motifForCountry(name);
    const rot=(i*Math.PI)/n;
    const segP=easeOut(Math.max(0,Math.min(1,(rawP(4)*n-i)/1.1)));
    if(segP<=0) return;
    const isLast=(i===n-1);
    drawShape(key,cx,bodyY,bodyD*0.85*scaleIn,rot,segP,p*0.85,(fresh&&isLast)?ORANGE:BLUE,Math.max(1,1.2*sc));
  });
}

/* ══════════════════════════════════════════
   LAYER 5 — ZODIAC DOT CLUSTER
   Small constellation of dots scattered around
   the crown — like the reference's "..." marks.
══════════════════════════════════════════ */
function drawZodiacDots(now){
  const p=lp(5); if(p<=0) return;
  const {cx,headY,crownD}=Z();
  const zodiac=(st.answers.zodiac||'').trim();
  const elem=ZODIAC_ELEMENT[zodiac]||'air';
  const h=simpleHash(zodiac);
  const n=4+(h%5); // 4-8 dots
  const fresh=isNew(5);
  const t=now*0.0015;

  ctx2d.save();
  for(let i=0;i<n;i++){
    const dp=easeOut(Math.max(0,Math.min(1,(rawP(5)*n-i)/1.1))); if(dp<=0) continue;
    const hi=simpleHash(zodiac+i);
    const angle=-Math.PI/2+(((hi&0xFF)/255)-0.5)*Math.PI*1.5;
    const radius=crownD*(0.55+((hi>>8&0xFF)/255)*0.45);
    const x=cx+Math.cos(angle)*radius;
    const y=headY+Math.sin(angle)*radius*0.85;
    const r=(0.8+((hi>>16&0xFF)/255)*2.2)*sc;
    const pulse=0.6+0.4*Math.sin(t+i*1.9);
    ctx2d.globalAlpha=p*dp*pulse*0.7;
    ctx2d.fillStyle=(fresh&&i===0)?ORANGE:BLUE;
    ctx2d.beginPath(); ctx2d.arc(x,y,r,0,Math.PI*2); ctx2d.fill();
  }
  /* element hints at a connecting arc beneath the crown */
  if(elem==='fire'||elem==='air'){
    ctx2d.globalAlpha=p*0.18; ctx2d.strokeStyle=BLUE; ctx2d.lineWidth=0.5;
    ctx2d.setLineDash([2,8]);
    ctx2d.beginPath(); ctx2d.arc(cx,headY,crownD*0.78,Math.PI*0.15,Math.PI*0.85); ctx2d.stroke();
    ctx2d.setLineDash([]);
  }
  ctx2d.restore();
}

/* ══════════════════════════════════════════
   LAYER 1 — GEMATRIA MARK (Name)
   A tilted tick crossing the spine near ringY,
   plus a small ring and the gematria number,
   echoing the reference's measurement marks.
══════════════════════════════════════════ */
function drawGematriaMark(now){
  const p=lp(1); if(p<=0) return;
  const {cx,ringY,sc}=Z();
  const g=st.gematriaValue||0;
  const fresh=isNew(1);
  const angle=((g%180)-90)*Math.PI/180;
  const len=14*sc;

  ctx2d.save();
  ctx2d.globalAlpha=p*0.6; ctx2d.strokeStyle=fresh?ORANGE:BLUE; ctx2d.lineWidth=0.9;
  ctx2d.beginPath();
  ctx2d.moveTo(cx-Math.cos(angle)*len, ringY-Math.sin(angle)*len);
  ctx2d.lineTo(cx+Math.cos(angle)*len, ringY+Math.sin(angle)*len);
  ctx2d.stroke();

  /* small ring */
  ctx2d.globalAlpha=p*0.55;
  ctx2d.beginPath(); ctx2d.arc(cx,ringY+10*sc,3*sc,0,Math.PI*2); ctx2d.stroke();

  ctx2d.restore();
}

/* ══════════════════════════════════════════
   LAYER 1b — GEMATRIA DOTS
   10 fixed positions distributed across the pendant
   (top, sides, around the central symbol, lower area).
   The name's reduced gematria value (1-10) activates
   that many of these positions, in order.
══════════════════════════════════════════ */
/* Fixed dot positions for the selected composition, anchored to the
   nearest generated motifs so the dots feel attached to the pendant.
     - top    → horizontal row, ~gap above the upper motif (crown)
     - bottom → horizontal row, ~gap below the lowest motif
     - sides  → vertical column, ~gap outside each side motif
   Gap is the user-spec'd ~4px distance from the nearest symbol. */
function gematriaDotPositions(){
  const val=reduceGematria(st.gematriaValue||0);
  const comp=DOT_COMPOSITIONS[val]; if(!comp) return [];
  const {cx,headY,bodyY,foundY,crownD,bodyD,elemD,sc}=Z();
  const r=1.7*sc;
  const gap=4;
  const sp=9*sc;   // dot-to-dot spacing within a cluster
  const out=[];

  // TOP — vertical column above the upper motif (extends the pendant upward)
  const yTopAnchor = headY - crownD*0.5 - r - gap;
  if(comp.top===1) out.push({x:cx,y:yTopAnchor});
  else if(comp.top===2) out.push({x:cx,y:yTopAnchor},{x:cx,y:yTopAnchor-sp*2});

  // BOTTOM — vertical column below the lowest motif (extends the pendant downward)
  const yBotAnchor = foundY + elemD*0.5 + r + gap;
  if(comp.bottom===1) out.push({x:cx,y:yBotAnchor});
  else if(comp.bottom===2) out.push({x:cx,y:yBotAnchor},{x:cx,y:yBotAnchor+sp*2});
  else if(comp.bottom===3) out.push({x:cx,y:yBotAnchor},{x:cx,y:yBotAnchor+sp*2},{x:cx,y:yBotAnchor+sp*4});

  // SIDES — horizontal row outside each side motif (extends the sides outward)
  const sideMotifCx = bodyD*0.85;
  const sideMotifHalf = elemD*0.85*0.5;
  const xLAnchor = cx - sideMotifCx - sideMotifHalf - r - gap;
  const xRAnchor = cx + sideMotifCx + sideMotifHalf + r + gap;
  if(comp.left===1) out.push({x:xLAnchor,y:bodyY});
  else if(comp.left===2) out.push({x:xLAnchor,y:bodyY},{x:xLAnchor-sp*2,y:bodyY});
  if(comp.right===1) out.push({x:xRAnchor,y:bodyY});
  else if(comp.right===2) out.push({x:xRAnchor,y:bodyY},{x:xRAnchor+sp*2,y:bodyY});

  return out;
}

function drawNameDots(now){
  const p=lp(1); if(p<=0) return;
  const {sc}=Z();
  const val=reduceGematria(st.gematriaValue||0);
  if(val<=0) return;
  const fresh=isNew(1);
  const positions=gematriaDotPositions();
  const reveal=easeOut(rawP(1));

  ctx2d.save();
  positions.forEach(pos=>{
    ctx2d.globalAlpha=p*reveal*(fresh?0.75:0.55);
    ctx2d.fillStyle=fresh?ORANGE:BLUE;
    ctx2d.beginPath(); ctx2d.arc(pos.x,pos.y,1.7*sc,0,Math.PI*2); ctx2d.fill();
  });
  ctx2d.restore();
}

/* ══════════════════════════════════════════
   LAYER 6 — ELEMENT ICON (Foundation)
   The smallest icon — the talisman's base.
   Carries the elemental color into the aura.
══════════════════════════════════════════ */
function drawElementIcon(now){
  const p=lp(6); if(p<=0) return;
  const {cx,foundY,tipY,elemD,sc}=Z();
  const elem=st.answers.element;
  const cfg=ELEMENT_TO_ICON[elem]||{key:'circle',rot:0};
  const fresh=isNew(6);
  const scaleIn=p<0.6?easeOut(p/0.6):1;
  const rgb=ELEMENT_COLOR[elem]||BLUE_RGB;

  if(fresh){
    drawGlow(cx,foundY,elemD*0.9,ORANGE_RGB,0.3*Math.sin(rawP(6)*Math.PI));
  } else {
    drawGlow(cx,foundY,elemD*0.95,rgb,p*0.18);
  }

  drawShape(cfg.key,cx,foundY,elemD*scaleIn,cfg.rot,rawP(6),p,fresh?ORANGE:BLUE,Math.max(1,1.3*sc));

  /* small ring at the very tip — the talisman's lowest point */
  ctx2d.save();
  ctx2d.globalAlpha=p*0.5; ctx2d.strokeStyle=BLUE; ctx2d.lineWidth=0.8;
  ctx2d.beginPath(); ctx2d.arc(cx,tipY,2.6*sc,0,Math.PI*2); ctx2d.stroke();
  ctx2d.restore();
}

/* ── Particles ── */
function drawParticles(){
  st.particles.forEach(p=>{
    ctx2d.save(); ctx2d.globalAlpha=Math.max(0,p.life*0.8); ctx2d.fillStyle=p.orange?ORANGE:BLUE;
    ctx2d.beginPath(); ctx2d.arc(p.x,p.y,p.r,0,Math.PI*2); ctx2d.fill(); ctx2d.restore();
  });
}
