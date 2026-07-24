/* questionnaire.js — Identity Forging v6 — Icon Talisman */
import { initRootsWidget } from './roots.js';
import { mountArtifact3D, unmountArtifact3D, assetsReady } from './artifact3d.js';
import { attachKeyboardTo, detachKeyboard } from './virtual-keyboard.js';
import { showSymbolInfo, hideSymbolInfo, SYMBOL_INFO as SYMBOL_INFO_2D } from './symbol-info.js';
import { openSymbolWindow, closeSymbolWindow } from './symbol-window.js';
import { SYMBOLS_3D } from './symbols-3d.js';
import { mountTimeWheel } from './time-wheel.js';
import { mountLightGate } from './light-gate.js';
import { mountCalibration } from './calibration.js';
import { playHandDemo, stopHandDemo, getGhostHand } from './demo-hand.js';
import { mountDotTiles } from './dot-tiles.js';
import { mountDrive } from './drive.js';
import { mountEditor } from './editor.js';

// Dev hook — lets us open the symbol window from the preview while we dial in
// its look/proportions before wiring the real per-stage triggers.
if (typeof window !== 'undefined') {
  window.__openSymbolWindow = (motif = 'hamsa', opts) => openSymbolWindow(motif, opts);
  window.__closeSymbolWindow = closeSymbolWindow;
}

let BLUE   = '#282828';
const ORANGE = '#fb5716';
let BLUE_RGB   = '40, 40, 40';
const ORANGE_RGB = '251, 87, 22';
const BG     = '#efede9';
const LAYER_DUR = 1200;
const STAGE1_LOADBAR_SHARE = 0.8;

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
const ICON_KEYS = [
  'circle','triangle','diamond','star','crescent','eye','hamsa','flower','anah',
  'yaz','meti','nazar','rosette','tyet','agadez','shatkona','triskele','spiral',
  'om','evil_eye','vegvisir','dharmachakra','pentagram','scarab','lotus','pomegranate','sun','sri_yantra','yin_yang'
];
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
  yaz(size) {
    const r = size / 2;
    return [
      {type:'line', from:{x:0, y:-r*0.5}, to:{x:0, y:r*0.5}},
      {type:'line', from:{x:-r*0.6, y:0}, to:{x:r*0.6, y:0}},
      {type:'arc', cx:0, cy:-r*0.5, r:r*0.4, start:Math.PI, end:2*Math.PI},
      {type:'arc', cx:0, cy:r*0.5, r:r*0.4, start:0, end:Math.PI},
    ];
  },
  meti(size) {
    const r = size / 2;
    return [
      {type:'line', from:{x:0, y:-r}, to:{x:0, y:r}},
      {type:'line', from:{x:-r, y:0}, to:{x:r, y:0}},
      {type:'arc', cx:0, cy:0, r:r*0.6, start:0, end:Math.PI*2},
      {type:'arc', cx:0, cy:0, r:r*0.3, start:0, end:Math.PI*2},
    ];
  },
  nazar(size) {
    const r = size / 2;
    return [
      {type:'arc', cx:0, cy:0, r, start:0, end:Math.PI*2},
      {type:'arc', cx:0, cy:0, r:r*0.65, start:0, end:Math.PI*2},
      {type:'arc', cx:0, cy:0, r:r*0.3, start:0, end:Math.PI*2},
    ];
  },
  rosette(size) {
    const r = size / 2;
    const segs = [{type:'arc', cx:0, cy:0, r:r*0.15, start:0, end:Math.PI*2}];
    const n = 8;
    for(let i=0; i<n; i++) {
      const a = i * (Math.PI * 2 / n);
      const cx = Math.cos(a) * r * 0.5;
      const cy = Math.sin(a) * r * 0.5;
      segs.push({type:'arc', cx, cy, r:r*0.4, start:0, end:Math.PI*2});
    }
    return segs;
  },
  tyet(size) {
    const r = size / 2;
    return [
      {type:'arc', cx:0, cy:-r*0.4, r:r*0.35, start:0, end:Math.PI*2},
      {type:'line', from:{x:0, y:-r*0.05}, to:{x:0, y:r*0.85}},
      {type:'line', from:{x:-r*0.5, y:-r*0.05}, to:{x:r*0.5, y:-r*0.05}},
      {type:'line', from:{x:-r*0.5, y:-r*0.05}, to:{x:-r*0.5, y:r*0.45}},
      {type:'line', from:{x:r*0.5, y:-r*0.05}, to:{x:r*0.5, y:r*0.45}},
    ];
  },
  agadez(size) {
    const r = size / 2;
    return [
      {type:'arc', cx:0, cy:-r*0.4, r:r*0.3, start:0, end:Math.PI*2},
      {type:'line', from:{x:0, y:-r*0.1}, to:{x:0, y:r*0.9}},
      {type:'line', from:{x:-r*0.4, y:r*0.3}, to:{x:r*0.4, y:r*0.3}},
      {type:'line', from:{x:-r*0.3, y:-r*0.4}, to:{x:-r*0.5, y:-r*0.6}},
      {type:'line', from:{x:r*0.3, y:-r*0.4}, to:{x:r*0.5, y:-r*0.6}},
      {type:'line', from:{x:0, y:-r*0.7}, to:{x:0, y:-r*0.9}},
    ];
  },
  shatkona(size) {
    const r = size / 2;
    const v1 = {x:0, y:-r}, v2 = {x:-r*0.866, y:r*0.5}, v3 = {x:r*0.866, y:r*0.5};
    const u1 = {x:0, y:r}, u2 = {x:-r*0.866, y:-r*0.5}, u3 = {x:r*0.866, y:-r*0.5};
    return [
      {type:'line', from:v1, to:v2}, {type:'line', from:v2, to:v3}, {type:'line', from:v3, to:v1},
      {type:'line', from:u1, to:u2}, {type:'line', from:u2, to:u3}, {type:'line', from:u3, to:u1},
    ];
  },
  triskele(size) {
    const r = size / 2;
    const segs = [];
    for(let i=0; i<3; i++) {
      const a = -Math.PI/2 + i*(Math.PI*2/3);
      const cx1 = Math.cos(a)*r*0.3, cy1 = Math.sin(a)*r*0.3;
      const cx2 = Math.cos(a+Math.PI*0.4)*r*0.5, cy2 = Math.sin(a+Math.PI*0.4)*r*0.5;
      segs.push({type:'arc', cx:cx1, cy:cy1, r:r*0.3, start:a, end:a+Math.PI});
      segs.push({type:'arc', cx:cx2, cy:cy2, r:r*0.2, start:a+Math.PI, end:a+Math.PI*2.5});
    }
    return segs;
  },
  spiral(size) {
    const r = size / 2;
    return [
      {type:'arc', cx:0, cy:0, r:r*0.2, start:0, end:Math.PI},
      {type:'arc', cx:-r*0.05, cy:0, r:r*0.3, start:Math.PI, end:Math.PI*2},
      {type:'arc', cx:0, cy:0, r:r*0.45, start:0, end:Math.PI},
      {type:'arc', cx:-r*0.05, cy:0, r:r*0.6, start:Math.PI, end:Math.PI*2},
      {type:'arc', cx:0, cy:0, r:r*0.75, start:0, end:Math.PI},
      {type:'arc', cx:-r*0.05, cy:0, r:r*0.9, start:Math.PI, end:Math.PI*2},
    ];
  },
  om(size) {
    const r = size / 2;
    return [
      {type:'arc', cx:-r*0.15, cy:-r*0.2, r:r*0.25, start:-Math.PI*0.5, end:Math.PI*0.85},
      {type:'arc', cx:-r*0.1, cy:r*0.2, r:r*0.35, start:-Math.PI*0.85, end:Math.PI*0.7},
      {type:'arc', cx:r*0.25, cy:0, r:r*0.3, start:Math.PI, end:Math.PI*2.2},
      {type:'arc', cx:r*0.15, cy:-r*0.6, r:r*0.18, start:0, end:Math.PI},
      {type:'arc', cx:r*0.15, cy:-r*0.8, r:r*0.05, start:0, end:Math.PI*2},
    ];
  },
  evil_eye(size) {
    const r = size / 2;
    return [
      {type:'arc', cx:0, cy:r*0.5, r:r*0.9, start:-Math.PI*0.8, end:-Math.PI*0.2},
      {type:'arc', cx:0, cy:-r*0.5, r:r*0.9, start:Math.PI*0.2, end:Math.PI*0.8},
      {type:'arc', cx:0, cy:0, r:r*0.35, start:0, end:Math.PI*2},
      {type:'arc', cx:0, cy:0, r:r*0.15, start:0, end:Math.PI*2},
    ];
  },
  vegvisir(size) {
    const r = size / 2;
    const segs = [];
    for(let i=0; i<8; i++) {
      const a = i * Math.PI / 4;
      const x = Math.cos(a)*r*0.9;
      const y = Math.sin(a)*r*0.9;
      segs.push({type:'line', from:{x:0, y:0}, to:{x, y}});
      const tx = Math.cos(a + Math.PI/2)*r*0.12;
      const ty = Math.sin(a + Math.PI/2)*r*0.12;
      segs.push({type:'line', from:{x: x - tx, y: y - ty}, to:{x: x + tx, y: y + ty}});
    }
    return segs;
  },
  dharmachakra(size) {
    const r = size / 2;
    const segs = [
      {type:'arc', cx:0, cy:0, r, start:0, end:Math.PI*2},
      {type:'arc', cx:0, cy:0, r:r*0.25, start:0, end:Math.PI*2},
    ];
    for(let i=0; i<8; i++) {
      const a = i * Math.PI / 4;
      const hx = Math.cos(a)*r*0.25, hy = Math.sin(a)*r*0.25;
      const wx = Math.cos(a)*r, wy = Math.sin(a)*r;
      segs.push({type:'line', from:{x:hx, y:hy}, to:{x:wx, y:wy}});
    }
    return segs;
  },
  pentagram(size) {
    const r = size / 2;
    const pts = [];
    for(let i=0; i<6; i++) {
      const a = -Math.PI/2 + (i % 5) * (Math.PI * 4 / 5);
      pts.push({x:Math.cos(a)*r*0.95, y:Math.sin(a)*r*0.95});
    }
    const segs = [{type:'arc', cx:0, cy:0, r, start:0, end:Math.PI*2}];
    for(let i=0; i<5; i++) {
      segs.push({type:'line', from:pts[i], to:pts[i+1]});
    }
    return segs;
  },
  scarab(size) {
    const r = size / 2;
    return [
      {type:'arc', cx:0, cy:0, r:r*0.75, start:0, end:Math.PI*2},
      {type:'line', from:{x:-r*0.75, y:0}, to:{x:r*0.75, y:0}},
      {type:'line', from:{x:0, y:-r*0.75}, to:{x:0, y:r*0.75}},
      {type:'line', from:{x:-r*0.6, y:-r*0.3}, to:{x:-r*0.9, y:-r*0.5}},
      {type:'line', from:{x:r*0.6, y:-r*0.3}, to:{x:r*0.9, y:-r*0.5}},
      {type:'line', from:{x:-r*0.75, y:0}, to:{x:-r*1.0, y:0}},
      {type:'line', from:{x:r*0.75, y:0}, to:{x:r*1.0, y:0}},
      {type:'line', from:{x:-r*0.6, y:r*0.3}, to:{x:-r*0.9, y:r*0.5}},
      {type:'line', from:{x:r*0.6, y:r*0.3}, to:{x:r*0.9, y:r*0.5}},
    ];
  },
  lotus(size) {
    const r = size / 2;
    return [
      {type:'arc', cx:-r*0.2, cy:0, r:r*0.6, start:-Math.PI*0.4, end:Math.PI*0.4},
      {type:'arc', cx:r*0.2, cy:0, r:r*0.6, start:Math.PI*0.6, end:Math.PI*1.4},
      {type:'arc', cx:-r*0.4, cy:r*0.1, r:r*0.5, start:-Math.PI*0.5, end:Math.PI*0.3},
      {type:'arc', cx:0, cy:r*0.2, r:r*0.5, start:Math.PI*0.5, end:Math.PI*1.3},
      {type:'arc', cx:0, cy:r*0.2, r:r*0.5, start:-Math.PI*0.3, end:Math.PI*0.5},
      {type:'arc', cx:r*0.4, cy:r*0.1, r:r*0.5, start:Math.PI*0.7, end:Math.PI*1.5},
    ];
  },
  pomegranate(size) {
    const r = size / 2;
    return [
      {type:'arc', cx:0, cy:r*0.1, r:r*0.75, start:-Math.PI*0.38, end:-Math.PI*0.62},
      {type:'line', from:{x:-r*0.25, y:-r*0.6}, to:{x:-r*0.35, y:-r*0.85}},
      {type:'line', from:{x:-r*0.35, y:-r*0.85}, to:{x:-r*0.1, y:-r*0.7}},
      {type:'line', from:{x:-r*0.1, y:-r*0.7}, to:{x:0, y:-r*0.92}},
      {type:'line', from:{x:0, y:-r*0.92}, to:{x:r*0.1, y:-r*0.7}},
      {type:'line', from:{x:r*0.1, y:-r*0.7}, to:{x:r*0.35, y:-r*0.85}},
      {type:'line', from:{x:r*0.35, y:-r*0.85}, to:{x:r*0.25, y:-r*0.6}},
    ];
  },
  sun(size) {
    const r = size / 2;
    const segs = [{type:'arc', cx:0, cy:0, r:r*0.4, start:0, end:Math.PI*2}];
    const n = 12;
    for(let i=0; i<n; i++) {
      const a = i * Math.PI * 2 / n;
      const x1 = Math.cos(a)*r*0.48;
      const y1 = Math.sin(a)*r*0.48;
      const x2 = Math.cos(a)*r*0.9;
      const y2 = Math.sin(a)*r*0.9;
      segs.push({type:'line', from:{x:x1, y:y1}, to:{x:x2, y:y2}});
    }
    return segs;
  },
  sri_yantra(size) {
    const r = size / 2;
    const segs = [
      {type:'arc', cx:0, cy:0, r, start:0, end:Math.PI*2},
      {type:'arc', cx:0, cy:0, r:r*0.05, start:0, end:Math.PI*2},
    ];
    const tris = [
      {up: true, h: r*0.75, offset: -r*0.1},
      {up: false, h: r*0.75, offset: r*0.1},
      {up: true, h: r*0.5, offset: r*0.15},
      {up: false, h: r*0.5, offset: -r*0.15},
    ];
    tris.forEach(tri => {
      const dy = tri.offset;
      const h = tri.h;
      const yTip = tri.up ? dy - h/2 : dy + h/2;
      const yBase = tri.up ? dy + h/2 : dy - h/2;
      const halfW = h * 0.58;
      segs.push({type:'line', from:{x:0, y:yTip}, to:{x:-halfW, y:yBase}});
      segs.push({type:'line', from:{x:-halfW, y:yBase}, to:{x:halfW, y:yBase}});
      segs.push({type:'line', from:{x:halfW, y:yBase}, to:{x:0, y:yTip}});
    });
    return segs;
  },
  yin_yang(size) {
    const r = size / 2;
    return [
      {type:'arc', cx:0, cy:0, r, start:0, end:Math.PI*2},
      {type:'arc', cx:0, cy:-r*0.5, r:r*0.5, start:-Math.PI/2, end:Math.PI/2},
      {type:'arc', cx:0, cy:r*0.5, r:r*0.5, start:Math.PI/2, end:Math.PI*1.5},
      {type:'arc', cx:0, cy:-r*0.5, r:r*0.1, start:0, end:Math.PI*2},
      {type:'arc', cx:0, cy:r*0.5, r:r*0.1, start:0, end:Math.PI*2},
    ];
  },
};

/* ── Family-origin → motif map (placeholder vector symbols) ──
   Maps a country name (as selected in the roots/globe widget)
   to one of the SHAPES keys above. Unmapped countries fall back
   to a deterministic hash-based pick from ICON_KEYS. */
const COUNTRY_MOTIFS = {
  'מרוקו':'hamsa', 'אלג׳יריה':'yaz', 'תוניסיה':'nazar', 'לוב':'nazar',
  'מצרים':'anah', 'תימן':'crescent', 'עיראק':'nazar', 'איראן':'sun',
  'תורכיה':'nazar', 'טורקיה':'nazar', 'סוריה':'crescent', 'לבנון':'eye',
  'גאורגיה':'meti', 'גיאורגיה':'meti',
  'נורווגיה':'vegvisir', 'נורבגיה':'vegvisir', 'שוודיה':'vegvisir', 'שבדיה':'vegvisir',
  'סין':'yin_yang', 'יפן':'yin_yang',
  'אירלנד':'triskele', 'בריטניה':'triskele',
  'פולין':'star', 'רוסיה':'star', 'יוון':'nazar', 'איטליה':'rosette',
  'ספרד':'rosette', 'צרפת':'flower', 'גרמניה':'triangle',
  'אנגליה':'circle', 'ארה"ב':'star', 'אמריקה':'star',
  'אתיופיה':'eye', 'הודו':'om',
};
function motifFallback(name){
  const h=simpleHash(name||'');
  return ICON_KEYS[h%ICON_KEYS.length];
}
function motifForCountry(name){
  return COUNTRY_MOTIFS[(name||'').trim()] || motifFallback(name);
}
/* RANDOM mechanism: pick a random symbol from those that have BOTH a 2D info
   card (SYMBOL_INFO) and a 3D registry entry (SYMBOLS_3D), so both screens can
   show it. Called at each stage-end. */
function pickRandomSymbol(){
  const pool = Object.keys(SYMBOL_INFO_2D).filter(k => SYMBOLS_3D[k]);
  if(!pool.length) return null;
  // A symbol can never appear twice on the same talisman — draw only from those
  // not already chosen; fall back to the full pool only if every one is used.
  const used = new Set(st.chosenSymbols || []);
  const free = pool.filter(k => !used.has(k));
  const from = free.length ? free : pool;
  return from[Math.floor(Math.random() * from.length)];
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
  anah:     '<path d="M20,14 A6,6 0 1,0 20,2 A6,6 0 1,0 20,14 Z M20,14 L20,38 M10,18 L30,18 M10,18 L10,30 M30,18 L30,30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  yaz:      '<path d="M20,10 L20,30 M10,20 L30,20 M12,12 A8,8 0 0,1 28,12 M12,28 A8,8 0 0,0 28,28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  meti:     '<path d="M20,5 L20,35 M5,20 L35,20 M10,10 Q20,12 30,10 M10,30 Q20,28 30,30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  nazar:    '<circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="20" cy="20" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="20" cy="20" r="4" fill="currentColor"/>',
  rosette:  '<path d="M20,20 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0 M20,8 L20,32 M8,20 L32,20 M11.5,11.5 L28.5,28.5 M11.5,28.5 L28.5,11.5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  tyet:     '<path d="M20,14 A6,6 0 1,0 20,2 A6,6 0 1,0 20,14 Z M20,14 L20,38 M10,18 L30,18 M10,18 L10,30 M30,18 L30,30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  agadez:   '<path d="M20,16 A5,5 0 1,0 20,6 A5,5 0 1,0 20,16 Z M20,16 L20,38 M12,28 L28,28 M14,10 L8,6 M26,10 L32,6 M20,6 L20,2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  shatkona:  '<polygon points="20,4 34,28 6,28" fill="none" stroke="currentColor" stroke-width="1.6"/><polygon points="20,36 34,12 6,12" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  triskele: '<path d="M20,20 Q12,14 14,8 A5,5 0 1,1 23,12 M20,20 Q28,22 26,30 A5,5 0 1,1 18,26 M20,20 Q14,28 7,24 A5,5 0 1,1 12,17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  spiral:   '<path d="M20,20 A3,3 0 0,0 20,14 A6,6 0 0,1 20,26 A9,9 0 0,0 20,11 A12,12 0 0,1 20,29" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  om:       '<path d="M14,15 A5,5 0 0,1 21,11 A6,6 0 0,1 24,20 A8,8 0 0,1 14,26 M24,20 Q32,20 30,28 A4,4 0 0,1 22,26 M23,9 A6,6 0 0,0 29,9 M26,5 A1.5,1.5 0 1,1 26,4" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  evil_eye: '<path d="M5,20 C11,10 29,10 35,20 C29,30 11,30 5,20 Z M20,14 A6,6 0 1,0 20,26 A6,6 0 1,0 20,14 Z M20,18 A2,2 0 1,0 20,22 A2,2 0 1,0 20,18 Z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  vegvisir: '<path d="M20,4 L20,36 M4,20 L36,20 M8.7,8.7 L31.3,31.3 M8.7,31.3 L31.3,8.7 M20,4 L16,8 M20,4 L24,8 M4,20 L8,16 M4,20 L8,24 M20,36 L16,32 M20,36 L24,32 M36,20 L32,16 M36,20 L32,24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  dharmachakra: '<circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="20" cy="20" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M20,6 L20,16 M20,24 L20,34 M6,20 L16,20 M24,20 L34,20 M10,10 L17,17 M23,23 L30,30 M10,30 L17,23 M23,17 L30,10" stroke="currentColor" stroke-width="1.6"/>',
  pentagram: '<circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="1.6"/><polygon points="20,5 29,32 8,15 32,15 11,32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  scarab:   '<ellipse cx="20" cy="20" rx="10" ry="13" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="20" y1="7" x2="20" y2="33" stroke="currentColor" stroke-width="1.6"/><line x1="10" y1="20" x2="30" y2="20" stroke="currentColor" stroke-width="1.6"/><path d="M10,14 L6,10 M30,14 L34,10 M10,20 L5,20 M30,20 L35,20 M11,26 L7,30 M29,26 L33,30" stroke="currentColor" stroke-width="1.6"/>',
  lotus:    '<path d="M20,32 C14,32 10,26 12,20 C14,14 18,10 20,6 C22,10 26,14 28,20 C30,26 26,32 20,32 Z M12,24 C8,23 6,18 9,14 C12,18 16,21 20,22 M28,24 C32,23 34,18 31,14 C28,18 24,21 20,22" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  pomegranate: '<path d="M20,13 C14,13 10,17 10,24 C10,31 15,35 20,35 C25,35 30,31 30,24 C30,17 26,13 20,13 Z M20,13 L17,8 L20,10 L23,8 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  sun:      '<circle cx="20" cy="20" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M20,5 L20,9 M20,31 L20,35 M5,20 L9,20 M31,20 L35,20 M9.4,9.4 L12.2,12.2 M27.8,27.8 L30.6,30.6 M9.4,30.6 L12.2,27.8 M27.8,12.2 L30.6,9.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  sri_yantra: '<circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="1.6"/><polygon points="20,8 30,26 10,26" fill="none" stroke="currentColor" stroke-width="1.2"/><polygon points="20,32 30,14 10,14" fill="none" stroke="currentColor" stroke-width="1.2"/><polygon points="20,12 27,24 13,24" fill="none" stroke="currentColor" stroke-width="1.2"/><polygon points="20,28 27,16 13,16" fill="none" stroke="currentColor" stroke-width="1.2"/>',
  yin_yang: '<circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M20,5 A7.5,7.5 0 0,0 20,20 A7.5,7.5 0 0,1 20,35 A15,15 0 0,0 20,5" fill="currentColor"/><circle cx="20" cy="12.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="20" cy="27.5" r="2.5" fill="currentColor"/>',
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

const SYMBOL_TO_ICON = {
  'עיגול':'circle','משולש':'triangle','סהר':'crescent','כוכב':'star','עין':'eye','חמסה':'hamsa','יהלום':'diamond',
  'יאז':'yaz', 'מטי':'meti', 'נזאר בונז׳וק':'nazar', 'רוזטה':'rosette', 'הקשר של איזיס':'tyet', 'צלב אגדס':'agadez',
  'אשטאקונה':'shatkona', 'טריסקל':'triskele', 'ספירלה':'spiral', 'אום':'om', 'עין הרע':'evil_eye', 'וק-ויסיר':'vegvisir',
  'גלגל הדהרמה':'dharmachakra', 'פנטגרם':'pentagram', 'אנח':'anah', 'חרפושית':'scarab', 'לוטוס':'lotus',
  'רימון':'pomegranate', 'חצי סהר':'crescent', 'שמש':'sun', 'סרי ינטרה':'sri_yantra', 'יין ויאנג':'yin_yang'
};
/* Fixed curated word pool for Step 2 — symbolic, open-ended Hebrew words.
   No AI: each word maps to one motif from the existing symbolic library. */
const WORD_POOL = [
  'רוח','שער','אבן','גשם','זיכרון','מדבר','מסע','ים','צל','שורש','אש','אור','דרך','בית','זמן','שמירה',
  'חופש', 'זרימה', 'תנועה', 'הגנה', 'פריחה', 'נשיות', 'הדרכה', 'איחוד', 'מחזוריות', 'צמיחה', 'חיבור',
  'מצפן', 'שחרור', 'טבע', 'התחדשות', 'טוהר', 'שפע', 'חיוניות', 'יקום', 'איזון'
];
const WORD_TO_MOTIF = {
  'רוח':'crescent','שער':'triangle','אבן':'diamond','גשם':'flower',
  'זיכרון':'eye','מדבר':'star','מסע':'star','ים':'crescent',
  'צל':'circle','שורש':'flower','אש':'triangle','אור':'star',
  'דרך':'diamond','בית':'hamsa','זמן':'circle','שמירה':'evil_eye',
  'חופש':'yaz', 'זרימה':'meti', 'תנועה':'triskele', 'הגנה':'nazar', 'פריחה':'rosette',
  'נשיות':'tyet', 'הדרכה':'agadez', 'איחוד':'shatkona', 'מחזוריות':'triskele', 'צמיחה':'spiral',
  'חיבור':'om', 'מצפן':'vegvisir', 'שחרור':'dharmachakra', 'טבע':'pentagram', 'התחדשות':'scarab',
  'טוהר':'lotus', 'שפע':'pomegranate', 'חיוניות':'sun', 'יקום':'sri_yantra', 'איזון':'yin_yang'
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

/* `styleStage` = the FIXED per-stage CSS style id used for the section-3
   `data-stage` attribute (drives the hundreds of `[data-stage="N"]` rules in
   styles/geometric/stage1 css). It is DECOUPLED from the array position so that
   inserting the new background stage at index 0 does not shift every stage's
   styling by one. Each real stage keeps its ORIGINAL data-stage value; the new
   background stage reuses 0 (it renders swatches, never concurrent with the
   globe, and finer targeting is done via the `.q-layout-*` classes). */
const QUESTIONS = [
  { id:'background', label:'רקע',       text:'בחר צבע רקע\nלתכשיט שלך',        type:'background',  styleStage:0 },
  { id:'origin',    label:'ארץ מוצא',   text:'איפה הסיפור שלך\nמתחיל?',       type:'geo',         styleStage:0 },
  /* 3 = light-point ("נקודת אור" — scattered gold dots you click; type 'words'),
     4 = path — a placeholder for now (fixed grid only, no content),
     5 = word selection (the yellow letter grid; type 'word-grid'). */
  { id:'word',      label:'מילה',       text:'מהי נקודת האור\nשלך?',           type:'words',       styleStage:1 },
  { id:'roots',     label:'מסלול',      text:'',                              type:'roots-tree', styleStage:5 },
  { id:'life-wish', label:'משאלה',      text:'איזו תנועה\nמושכת אותך?',       type:'word-grid',   styleStage:2 },
  /* Stages 6–7 are placeholders for now (fixed grid stays, no middle content):
     6 = "שעה" (not built yet), 7 = empty. The former stars stage is retired. */
  { id:'stars',     label:'שעה',        text:'',                              type:'time',        styleStage:3 },
  { id:'personal',  label:'כוח',        text:'מה מניע\nאותך?',                type:'drive',       styleStage:4 },
  { id:'name',      label:'שם',         text:'איך קוראים לך?',                 type:'text',   placeholder:'כתבי את שמך...', styleStage:6 },
];

/* Per-stage instructions shown in the bottom rectangle of the grid (#ff5003).
   Keyed by question id; add a line here for each stage. */
const INSTRUCTIONS = {
  background: 'בחר צבע רקע לתכשיט שלך',
  origin: 'בחר את היבשות מהן הגיעו בני משפחתך',
  word: 'מתח קו בין הנקודה לעיגול',
  roots: 'גררו את הנקודה במסלול שאתם בוחרים',
  stars: 'גללו ובחרו את השעה הרצויה.',
  personal: 'בחרו את הכוח שמוביל אתכם:',
};

/* The frequency stage's own cue text (shown in the shared band's note slot). */
const FREQ_HINT = 'בחרו את התדר איתו תרצו להיכנס לתהליך היצירה';

/* Forward button wording per stage (kept from each stage's own confirm). */
const STAGE_CONTINUE_TEXT = {
  origin: 'סיימתי',
  word: 'המשך',
  roots: 'המשך',
  'life-wish': 'המשך',
  stars: 'זו השעה שלי',
  personal: 'המשך',
  name: 'סיום',
};

/* ── Shared bottom band: below every stage's content — a dotted rule, the
   instruction, then a forward button (same dot language as the frequency band,
   just at the bottom). Order top→bottom: rule → instruction → button. ── */
let _stageBand = null;
function ensureStageBand(){
  if(_stageBand) return _stageBand;
  const sec = document.getElementById('section-3');
  if(!sec) return null;
  const band = document.createElement('div');
  band.className = 'stage-band';
  band.innerHTML = `<div class="sb-note"></div>`
    + `<button type="button" class="sb-btn"></button>`;
  sec.appendChild(band);
  const btn = band.querySelector('.sb-btn');
  btn.addEventListener('click', () => {
    if(btn.classList.contains('is-pressed') || btn.classList.contains('is-disabled')) return;
    btn.classList.add('is-pressed');
    fireStageContinue();
  });
  _stageBand = { band, note: band.querySelector('.sb-note'), btn };
  return _stageBand;
}
/* Called on every stage: fill in that stage's instruction + button wording and
   the forward action. `background` (frequency) opts out — it has its own band. */
/* Stages where the forward button stays dimmed until the visitor makes a choice
   (the stage calls armBand once the pick is in). Others are ready immediately. */
const GATED_STAGES = new Set(['origin', 'word', 'roots', 'life-wish', 'personal', 'stars']);
function updateStageBand(qid){
  const sb = ensureStageBand();
  if(!sb) return;
  sb.btn.classList.remove('is-pressed', 'is-disabled');
  sb.band.classList.add('is-shown');
  st._bandNoteText = null;   // force a fresh typewriter reveal on stage entry
  // Frequency stage: the band is driven by calibration.js — dimmed until a
  // frequency is picked, and the press commits that choice.
  if(qid === 'background'){
    setBandNote(FREQ_HINT);
    sb.btn.textContent = 'המשך';
    sb.btn.classList.add('is-disabled');
    st._stageContinue = () => { if(st._calib) st._calib.commit(); };
    return;
  }
  setBandNote(INSTRUCTIONS[qid] || '');
  sb.btn.textContent = STAGE_CONTINUE_TEXT[qid] || 'המשך';
  // These stages have NO continue button — the pick itself opens the symbol window
  // directly (light-point: line→gate; path: reaching the exit; movement: tapping a
  // tile). Only the instruction note shows in their band.
  sb.btn.style.display = (qid === 'word' || qid === 'roots' || qid === 'life-wish') ? 'none' : '';
  if(GATED_STAGES.has(qid)){
    // Dimmed until the stage arms it (see armBand, called on the pick).
    sb.btn.classList.add('is-disabled');
    st._stageContinue = null;
  } else {
    // Ready immediately (e.g. name): submit / advance on press.
    st._stageContinue = () => { if(qid === 'name') submitAnswer(); else advance(); };
  }
}
/* A stage calls this once a choice is made: light up the forward button and set
   what its press does. Replaces the old "advance the instant you pick" flow. */
function armBand(fn){
  const sb = ensureStageBand();
  if(!sb) return;
  sb.btn.classList.remove('is-disabled');
  st._stageContinue = fn;
}
function fireStageContinue(){
  // Don't null it — the button's own is-pressed guard prevents a double-fire, and
  // the two-phase origin needs to fire again after the poll clears is-pressed.
  if(st._stageContinue) st._stageContinue();
}
/* Reveal the band's instruction with a one-shot typewriter. Re-types only when
   the target text changes (so the origin poll re-running every 200ms is a no-op,
   but a globe→input phase swap does re-type). */
function setBandNote(text){
  const sb = ensureStageBand();
  if(!sb || st._bandNoteText === text) return;
  st._bandNoteText = text;
  typewriterText(sb.note, text || '', 34);
}

/* Maps each question id to its fixed pendant layer (drawing/animation slot),
   independent of question order in the array above. */
const LAYER_BY_ID = { name:1, word:2, symbol:2, 'life-wish':2, stars:3, birthdate:3, origin:4, zodiac:5, element:6, personal:7, roots:5 };
/* Hidden behind each star in Step 3 — placeholder motifs from the existing
   symbolic library. The pool is intentionally fixed; user discovers, doesn't pick. */
const HIDDEN_STAR_MOTIFS = [
  'yaz', 'meti', 'nazar', 'rosette', 'tyet', 'agadez', 'shatkona', 'triskele', 'spiral', 'om', 'evil_eye',
  'vegvisir', 'dharmachakra', 'pentagram', 'scarab', 'lotus', 'pomegranate', 'sun', 'sri_yantra', 'yin_yang',
  'eye', 'hamsa', 'crescent', 'diamond', 'triangle', 'circle', 'star'
];

const ENTER_ANIMS = ['q-enter-slide','q-enter-scale','q-enter-blur','q-enter-3d','q-enter-drift','q-enter-rise'];

const SYMBOL_INFO = {
  circle: {
    name: 'עיגול',
    tradition: 'זן ומסורות רוחניות',
    meaning: 'שלמות, אינסוף ומחזוריות נצחית'
  },
  triangle: {
    name: 'משולש',
    tradition: 'אלכימיה פילוסופית',
    meaning: 'איזון, שאיפה קדימה ושילוש'
  },
  diamond: {
    name: 'מעוין',
    tradition: 'סימבוליזם שבטי',
    meaning: 'יציבות, מיקוד וכוח אדמה'
  },
  star: {
    name: 'כוכב',
    tradition: 'קוסמולוגיה ומיסטיקה',
    meaning: 'הדרכה, שאיפה ואור פנימי'
  },
  crescent: {
    name: 'חצי סהר',
    tradition: 'מסורות קדומות ואסלאם',
    meaning: 'התחדשות, מחזוריות וזמן'
  },
  eye: {
    name: 'עין הורוס',
    tradition: 'מצרים העתיקה',
    meaning: 'הגנה, ריפוי ושמירה'
  },
  hamsa: {
    name: 'חמסה',
    tradition: 'המזרח התיכון',
    meaning: 'הגנה, מזל ושמירה מעין הרע'
  },
  flower: {
    name: 'פרח החיים',
    tradition: 'גיאומטריה מקודשת',
    meaning: 'מחזוריות, הרמוניה וחיבור הבריאה'
  },
  anah: {
    name: 'אנח',
    tradition: 'מצרים העתיקה',
    meaning: 'חיים, התחדשות וחיי נצח'
  },
  yaz: {
    name: 'יאז',
    tradition: 'המסורת האמזיגית (ברברים)',
    meaning: 'אדם חופשי, חיבור לאדמה ולחירות'
  },
  meti: {
    name: 'מטי',
    tradition: 'המסורת הגיאורגית (קווקז)',
    meaning: 'זרימה, תנועה והרמוניה נצחית'
  },
  nazar: {
    name: 'נזאר בונז׳וק',
    tradition: 'מסורות המזרח התיכון ואנטוליה',
    meaning: 'עין כחולה להגנה מפני אנרגיות שליליות'
  },
  rosette: {
    name: 'רוזטה',
    tradition: 'מסופוטמיה והמזרח הקדום',
    meaning: 'פריחה, יופי ומחזוריות הטבע'
  },
  tyet: {
    name: 'הקשר של איזיס',
    tradition: 'מצרים העתיקה',
    meaning: 'הגנה קוסמית, כוח נשי וחיוניות'
  },
  agadez: {
    name: 'צלב אגדס',
    tradition: 'המסורת הטוארגית (סהרה)',
    meaning: 'הדרכה, הגנה בדרכים וארבע רוחות השמים'
  },
  shatkona: {
    name: 'אשטאקונה',
    tradition: 'הינדואיזם מקודש',
    meaning: 'איחוד בין זכרי לנקבי, איזון יקומי'
  },
  triskele: {
    name: 'טריסקל',
    tradition: 'המסורת הקלטית',
    meaning: 'תנועה, מחזוריות והתפתחות'
  },
  spiral: {
    name: 'ספירלה',
    tradition: 'מסורות קדומות פרהיסטוריות',
    meaning: 'צמיחה אינסופית, התפתחות ומסע החיים'
  },
  om: {
    name: 'אום',
    tradition: 'הינדואיזם ובבודהיזם',
    meaning: 'אחדות, צליל הבריאה וחיבור רוחני'
  },
  evil_eye: {
    name: 'עין הרע',
    tradition: 'פולקלור ים תיכוני',
    meaning: 'שמירה מפני קנאה ומיקוד אנרגיה חיובית'
  },
  vegvisir: {
    name: 'וק-ויסיר',
    tradition: 'המסורת הנורדית',
    meaning: 'מצפן רוחני, שלא תלך לאיבוד בסערה'
  },
  dharmachakra: {
    name: 'גלגל הדהרמה',
    tradition: 'בודהיזם',
    meaning: 'נתיב שמונת השלבים לשחרור ואיזון'
  },
  pentagram: {
    name: 'פנטגרם',
    tradition: 'מיסטיקה קדומה ואלכימיה',
    meaning: 'איזון חמשת היסודות והרמוניה עם הטבע'
  },
  scarab: {
    name: 'חרפושית',
    tradition: 'מצרים העתיקה',
    meaning: 'התחדשות עצמית, הגנה ומזל טוב'
  },
  lotus: {
    name: 'לוטוס',
    tradition: 'בודהיזם והמזרח הרחוק',
    meaning: 'טוהר, התעוררות רוחנית וצמיחה מתוך הקושי'
  },
  pomegranate: {
    name: 'רימון',
    tradition: 'מסורות שמיות וים-תיכוניות',
    meaning: 'שפע, פריון, חוכמה ויופי פנימי'
  },
  sun: {
    name: 'שמש',
    tradition: 'קוסמולוגיה קדומה',
    meaning: 'חיוניות, אור פנימי, אנרגיית חיים וכוח'
  },
  sri_yantra: {
    name: 'סרי ינטרה',
    tradition: 'גיאומטריה מקודשת הודית',
    meaning: 'התגלמות העולמות, שפע חומרי ורוחני'
  },
  yin_yang: {
    name: 'יין ויאנג',
    tradition: 'פילוסופיה סינית קדומה',
    meaning: 'איזון בין כוחות מנוגדים ומשלימים'
  }
};
const revealedSymbols = new Set();
let lastLH = 0;

const st = {
  current:0, answers:{}, layerProgress:new Array(8).fill(0),
  particles:[], gematriaValue:0,
  p5SymbolsByStage: {},
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
  // The sidebar tagline loop is started when it is revealed in the stage-0
  // choreography, so it types in from empty rather than appearing mid-text.
  broadcastArtifact();   // publish a clean initial state for any open display

  // Contrast theme toggle initialization
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isNegative = document.body.classList.toggle('theme-negative');
      if (isNegative) {
        BLUE = '#f5f5ed';
        BLUE_RGB = '245, 245, 237';
      } else {
        BLUE = '#282828';
        BLUE_RGB = '40, 40, 40';
      }
    });
  }

  const ro=new ResizeObserver(()=>resizeCanvas());
  ro.observe(cvs.parentElement);
  resizeCanvas(); animate();
}
function resizeCanvas(){
  if(!cvs) return;
  const p=cvs.parentElement, dpr=window.devicePixelRatio||1;
  const newLW = p.clientWidth || 300;
  const newLH = p.clientHeight || 500;
  // No-op if dimensions are unchanged. ResizeObserver fires on every
  // CSS-transition frame; without this guard, grainCvs was being
  // regenerated 60×/s during layout animations, choking the main thread
  // and freezing inputs (text fields, click handlers) on the next stage.
  if(newLW === LW && newLH === LH) return;
  LW = newLW; LH = newLH;
  cvs.width=LW*dpr; cvs.height=LH*dpr;
  cvs.style.width=LW+'px'; cvs.style.height=LH+'px';
  ctx2d.setTransform(dpr,0,0,dpr,0,0);
  grainCvs=null;
}

/* ─── Symbol Annotations Manager ─── */
function getActiveSymbols() {
  const list = [];

  // 1. Layer 2: Crown Icon (Word or Symbol)
  if (layerStart[2] !== -Infinity) {
    const word = st.answers.word;
    const symbol = st.answers.symbol;
    if (word || symbol) {
      const key = word ? (WORD_TO_MOTIF[word] || 'circle') : (SYMBOL_TO_ICON[symbol] || 'circle');
      list.push({
        id: `layer-2-crown`,
        key,
        layer: 2
      });
    }
  }

  // 2. Layer 4: Body Icon (Family Origin)
  if (layerStart[4] !== -Infinity) {
    const origins = st.selectedOrigins || st.roots || [];
    if (origins.length > 0) {
      origins.forEach((name, i) => {
        const key = motifForCountry(name);
        list.push({
          id: `layer-4-origin-${i}-${key}`,
          key,
          layer: 4,
          subIdx: i
        });
      });
    } else if (st.answers.origin) {
      const h = simpleHash(st.answers.origin);
      const key = ICON_KEYS[h % ICON_KEYS.length];
      list.push({
        id: `layer-4-origin-fallback-${key}`,
        key,
        layer: 4
      });
    }
  }

  // 3. Layer 3: Star Symbols
  if (layerStart[3] !== -Infinity) {
    const stars = st.answers.stars || [];
    if (stars.length > 0) {
      const n = stars.length;
      stars.forEach((motif, i) => {
        const segP = Math.max(0, Math.min(1, (rawP(3) * n - i) / 1.1));
        if (segP > 0) {
          list.push({
            id: `layer-3-star-${i}-${motif}`,
            key: motif,
            layer: 3,
            subIdx: i
          });
        }
      });
    }
  }

  // 4. Layer 5: Roots Symbol (paths game)
  if (layerStart[5] !== -Infinity && st.answers.roots) {
    list.push({
      id: `layer-5-roots-${st.answers.roots}`,
      key: st.answers.roots,
      layer: 5
    });
  }

  // 5. Layer 7: Side Elements (Personal word)
  if (layerStart[7] !== -Infinity) {
    const word = (st.answers.personal || '').trim();
    if (word) {
      const h = simpleHash(word);
      const key = ICON_KEYS[h % ICON_KEYS.length];
      list.push({
        id: `layer-7-personal-${key}`,
        key,
        layer: 7
      });
    }
  }

  return list;
}

function getSymbolPosition(item) {
  const { headY, bodyY, foundY, elemD } = Z();
  if (item.layer === 2) return headY;
  if (item.layer === 4) return bodyY;
  if (item.layer === 5) return foundY;
  if (item.layer === 7) return bodyY;
  if (item.layer === 3) {
    const stars = st.answers.stars || [];
    const n = stars.length;
    const yStart = bodyY + elemD * 0.85;
    const yEnd = foundY - elemD * 0.4;
    const i = item.subIdx || 0;
    return n === 1 ? (yStart + yEnd) / 2 : lerp(yStart, yEnd, i / (n - 1));
  }
  return bodyY;
}

function computeVerticalPositions(items) {
  const sorted = [...items].sort((a, b) => {
    const yA = getSymbolPosition(a);
    const yB = getSymbolPosition(b);
    if (Math.abs(yA - yB) < 1) {
      return a.layer - b.layer;
    }
    return yA - yB;
  });

  const spacing = 80; // Minimum vertical gap between annotations
  const positions = [];

  sorted.forEach(item => {
    const idealY = getSymbolPosition(item);
    let adjustedY = idealY;
    let overlapFound = true;
    
    while (overlapFound) {
      overlapFound = false;
      for (const pos of positions) {
        if (Math.abs(pos.y - adjustedY) < spacing) {
          adjustedY = pos.y + spacing;
          overlapFound = true;
          break;
        }
      }
    }
    
    positions.push({
      item,
      y: adjustedY
    });
  });

  return positions;
}

/* The old in-stage symbol readout — the side "symbol-annotation" blocks with a
   chevron toggle and סמל/מסורת/משמעות rows — is SUPERSEDED by the centred symbol
   window (symbol-window.js), which now presents the chosen symbol + text after a
   choice. So this renders nothing; it only keeps its container empty in case any
   stray blocks were ever added. */
function updateAnnotations() {
  const container = document.getElementById('artifact-annotations');
  if (container && container.children.length) container.innerHTML = '';
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

/* Per-stage talisman dimensions (height × width, mm). The pendant grows
   as the wearer adds layers, so the numbers climb across stages. */
const STAGE_DIMS = [
  { h: 18, w: 12 }, // origin
  { h: 24, w: 16 }, // word
  { h: 30, w: 18 }, // stars
  { h: 36, w: 20 }, // personal
  { h: 40, w: 22 }, // roots
  { h: 46, w: 26 }  // name (final talisman)
];
const STAGE_COORDS = STAGE_DIMS.map(d => `H ${d.h}MM × W ${d.w}MM`);
const STAGE_LABELS = [
  'TALISMAN / מידות',
  'TALISMAN / מידות',
  'TALISMAN / מידות',
  'TALISMAN / מידות',
  'TALISMAN / מידות',
  'TALISMAN / מידות',
  'TALISMAN / מידות',
  'TALISMAN / מידות'
];

/* Adds accent cells inside #q-main-cell — three solid rectangles plus
   one hatching cell that holds SVG diagonal lines (animated by CSS).
   CSS positions each per stage via the .stage-accent rules in styles.css. */
function ensureStageAccents(){
  const host = document.getElementById('q-main-cell');
  if (!host) return;
  // Tear down any element from older accent schemes (e.g. previous "orb"
  // cell). Lets the page recover cleanly without a hard reload.
  host.querySelectorAll('.stage-accent.is-orb').forEach(el => el.remove());

  ['is-blue', 'is-brown', 'is-yellow', 'is-hatch'].forEach(cls => {
    if (!host.querySelector(`.stage-accent.${cls}`)) {
      const el = document.createElement('div');
      el.className = `stage-accent ${cls}`;
      if (cls === 'is-hatch') el.innerHTML = buildHatchSVG();
      if (cls === 'is-yellow') el.innerHTML = buildPulleyHTML();
      host.appendChild(el);
    }
  });
}

function buildPulleyHTML(){
  let html = '<div class="pulley-track">';
  for (let i = 0; i < 15; i++) {
    html += '<div class="pulley-wheel"></div>';
  }
  html += '</div>';
  return html;
}

/* Builds the inline SVG for the hatching cell — N diagonal lines spaced
   evenly across the cell, each set up with an animation-delay so they
   appear in sequence and then disappear in sequence, repeating forever.
   Timing constants here are mirrored by the @keyframes `hatch-cycle`
   rule in styles.css; if you change N/stagger, also update those %s. */
function buildHatchSVG(){
  const N        = 8;        // line count
  const stagger  = 250;      // ms between successive line starts
  const fadeIn   = 200;      // ms
  const fadeOut  = 200;      // ms
  const settle   = 100;      // ms rest between cycles
  const cycle    = 2 * (N - 1) * stagger + fadeIn + fadeOut + settle; // 4000 ms

  let lines = '';
  for (let i = 0; i < N; i++) {
    const x = ((i + 0.5) * 100) / N;
    const delay = i * stagger;
    // Each line slopes from top-right to bottom-left across the cell;
    // y1/y2 overshoot the viewBox so the line meets the cell edges
    // even after preserveAspectRatio="none" stretches the geometry.
    lines += `<line x1="${x + 14}" y1="-6" x2="${x - 14}" y2="106" ` +
             `stroke="rgba(28, 28, 28,0.55)" stroke-width="1" ` +
             `vector-effect="non-scaling-stroke" ` +
             `style="opacity:0; animation: hatch-cycle ${cycle}ms ease-in-out ${delay}ms infinite;" />`;
  }
  return `<svg class="hatch-svg" viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">${lines}</svg>`;
}

function renderQuestion(idx){
  // Wrap the DOM updates in a View Transition so grid cells smoothly
  // morph between their old and new positions instead of jump-cutting.
  // Falls back to a plain call on browsers that don't implement it.
  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition(() => _renderQuestionImpl(idx));
  } else {
    _renderQuestionImpl(idx);
  }
}
/* ── Sidebar tagline typewriter loop ──────────────────────── */
function startSidebarTaglineLoop() {
  const el = document.getElementById('sidebar-tagline');
  if (!el) return;
  // Cancel any loop already running on this element. Without this, each stage
  // that re-reveals the sidebar (background stage + globe stage) starts a SECOND
  // concurrent typewriter on the same element; the loops race and the text
  // garbles. Storing the timer on the element makes the loop idempotent.
  if (el._taglineTimer) { clearTimeout(el._taglineTimer); el._taglineTimer = null; }
  const FULL = 'זהות צרופה - ליצור את התכשיט האישי שלך';
  const TYPE_SPEED = 105;  // ms per character while typing
  const DEL_SPEED  = 55;   // ms per character while deleting
  const PAUSE_FULL = 3000; // ms pause when fully typed
  const PAUSE_EMPTY = 900; // ms pause when fully deleted
  let pos = 0, deleting = false;

  function tick() {
    if (!deleting) {
      pos++;
      el.textContent = FULL.slice(0, pos);
      if (pos >= FULL.length) { deleting = true; el._taglineTimer = setTimeout(tick, PAUSE_FULL); return; }
    } else {
      pos--;
      el.textContent = FULL.slice(0, pos);
      if (pos <= 0) { deleting = false; el._taglineTimer = setTimeout(tick, PAUSE_EMPTY); return; }
    }
    el._taglineTimer = setTimeout(tick, deleting ? DEL_SPEED : TYPE_SPEED);
  }
  el._taglineTimer = setTimeout(tick, PAUSE_EMPTY);
}

/* ── Word-grid stage ──────────────────────────────────────── */
const lifeWishWords = [
  'פוריות','מזל','זוגיות','שפע','בריאות','אהבה','שמירה','הגנה','בית','פרנסה',
  'אור','ריפוי','אמונה','דרך','משפחה','הצלחה','שלווה','כוח','שורש','ברכה'
];

function generateHebrewWordGrid(rows, cols, words) {
  const HEBREW = 'אבגדהוזחטיכלמנסעפצקרשת';
  const rng = n => Math.floor(Math.random() * n);
  const grid = Array.from({length: rows}, () => Array(cols).fill(null));
  const placements = [];

  for (const word of words) {
    let placed = false;
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const horiz = Math.random() < 0.85;
      const len = word.length;
      if (horiz) {
        const r = rng(rows);
        const c = rng(cols - len);
        let ok = true;
        for (let i = 0; i < len && ok; i++) ok = grid[r][c + i] === null;
        if (ok) {
          for (let i = 0; i < len; i++) grid[r][c + i] = {ch: word[i], word};
          placements.push({word, row: r, col: c, direction: 'h', length: len});
          placed = true;
        }
      } else {
        const r = rng(rows - len);
        const c = rng(cols);
        let ok = true;
        for (let i = 0; i < len && ok; i++) ok = grid[r + i][c] === null;
        if (ok) {
          for (let i = 0; i < len; i++) grid[r + i][c] = {ch: word[i], word};
          placements.push({word, row: r, col: c, direction: 'v', length: len});
          placed = true;
        }
      }
    }
  }

  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c] === null)
        grid[r][c] = {ch: HEBREW[rng(HEBREW.length)], word: null};

  return {grid, placements};
}

/* Auto "ghost hand" demo for a stage: after a short idle, play the gesture
   demonstration; cancel it the instant the user actually touches anything. */
function scheduleStageDemo(getPoints, opts = {}){
  cancelStageDemo();
  // Cancel only on a real tap INSIDE the stage (#section-3) — not the landing
  // CTA that brought us here, and not synthetic events the app dispatches.
  const target = document.getElementById('section-3') || document;
  const onUser = (e) => { if (e && e.isTrusted === false) return; cancelStageDemo(); };
  st._demoCancel = onUser; st._demoTarget = target;
  target.addEventListener('pointerdown', onUser, { capture: true });
  st._demoTimer = setTimeout(() => {
    let pts = []; try { pts = getPoints() || []; } catch (_) {}
    if (pts.length) playHandDemo(pts, opts);
  }, 1700);
}
function cancelStageDemo(){
  clearTimeout(st._demoTimer); st._demoTimer = null;
  if (st._demoCancel && st._demoTarget) {
    st._demoTarget.removeEventListener('pointerdown', st._demoCancel, { capture: true });
    st._demoCancel = null; st._demoTarget = null;
  }
  stopHandDemo();
}

function _renderQuestionImpl(idx){
  const q=QUESTIONS[idx]; if(!q) return;
  // Tear down the light-point gate overlay whenever the stage changes.
  cancelStageDemo();
  if (st._lightGateTeardown) { try { st._lightGateTeardown(); } catch (_) {} st._lightGateTeardown = null; }
  if (st._calibTeardown) { try { st._calibTeardown(); } catch (_) {} st._calibTeardown = null; }
  if (st._driveTeardown) { try { st._driveTeardown(); } catch (_) {} st._driveTeardown = null; }
  if (st._originBandPoll) { clearInterval(st._originBandPoll); st._originBandPoll = null; }
  document.getElementById('section-3')?.classList.remove('origin-input-phase');
  if (st._lightEntryTimers) { st._lightEntryTimers.forEach(clearTimeout); st._lightEntryTimers = []; }
  if (st._pathsEntryTimers) { st._pathsEntryTimers.forEach(clearTimeout); st._pathsEntryTimers = []; }
  st._globeDemoToken = (st._globeDemoToken || 0) + 1;   // kill any running globe demo
  st._roots = null;
  st._calib = null;
  // Clear the "מה השעה שלך" live sky tint so it never lingers on other stages
  // (it's an inline background on the shared #section-3). The time stage re-sets
  // it via applyTimeSky when it mounts.
  { const sec3 = document.getElementById('section-3');
    if (sec3) { sec3.style.removeProperty('background-color'); sec3.classList.remove('tw-daylight'); } }
  const midContainer = document.getElementById('word-field-container');
  if (midContainer) midContainer.innerHTML = '';
  const dotsContainer = document.getElementById('s2-dots-container');
  if (dotsContainer) dotsContainer.innerHTML = '';
  st.current=idx;
  st._stageEnteredAt = performance.now();   // for time-based symbol sizing (advance)
  updateLoadBar();
  updateV5StepProgress(idx);
  document.getElementById('section-3')?.setAttribute('data-stage', (q.styleStage!=null ? q.styleStage : idx));
  ensureStageAccents();
  document.getElementById('q-num-current').textContent=String(idx+1).padStart(2,'0');
  document.getElementById('q-num-total').textContent=String(QUESTIONS.length).padStart(2,'0');

  // Update dynamic decorative elements for the grid layout
  const decoNumber = document.getElementById('deco-number-val');
  if (decoNumber) decoNumber.textContent = String(idx+1).padStart(2,'0');

  updateDynamicDimensions();

  const decoBrandText = document.querySelector('#q-deco-mid-right .deco-brand-text');
  if (decoBrandText) decoBrandText.textContent = STAGE_LABELS[idx] || '';

  const qEl=document.getElementById('q-text');
  qEl.setAttribute('data-q',idx);
  const instrEl=document.getElementById('q-instruction');
  if(idx === 0 && firstStage0Intro){
    // First landing on stage 1 — hold the text; it types after the opening
    // morph lands (see playStage0Intro / 'opening-morph-done').
    firstStage0Intro = false;
    qEl.innerHTML = '';
    if(instrEl){ stopTypewriter(instrEl); instrEl.textContent = ''; }
  } else if(q.id === 'word'){
    // Light-point stage: the title FADES in (not typed) — held blank here and
    // revealed by the gradual-entry choreography in the 'words' branch below.
    stopTypewriter(qEl);
    qEl.textContent = '';
    if(instrEl){ stopTypewriter(instrEl); instrEl.textContent = INSTRUCTIONS[q.id] || ''; }
  } else {
    typewriterText(qEl, q.text.replace(/\n/g, ' '));
    if(instrEl){ stopTypewriter(instrEl); instrEl.textContent = INSTRUCTIONS[q.id] || ''; }
  }
  const numEl=document.getElementById('q-num-current');
  numEl.classList.remove('count-pop'); void numEl.offsetWidth; numEl.classList.add('count-pop');
  const wrap=document.getElementById('q-input-wrap');
  wrap.className = '';
  detachKeyboard();
  const middleQ = document.getElementById('middle-q-container');
  if (middleQ) {
    middleQ.className = `q-layout-${q.id}`;
  }
  // Set up the bottom band BEFORE the per-type branches, so a stage can arm/route
  // its forward button (armBand) after this default is in place.
  updateStageBand(q.id);
  // Placeholder stages show ONLY the fixed grid — flag the section so its
  // leftover layout lines + the stage counter are hidden (see CSS).
  document.getElementById('section-3')?.classList.toggle('q-placeholder-stage', q.type === 'placeholder');
  // The colour/calibration stage shares styleStage 0 with the origin stage, so
  // the origin panel's leftover vertical dotted rule bleeds onto it — flag the
  // section so that rule (and the rest of the origin panel) is hidden here.
  document.getElementById('section-3')?.classList.toggle('q-color-stage', q.type === 'background');
  if(q.type==='background'){
    // Digital "calibration": ONE fixed dot grid whose four frequencies (each a
    // colour + scan behaviour) cycle continuously on the same grid. The user taps
    // anywhere to stop the system on the current frequency — that colour becomes
    // the jewel background (calibration.js). No colour cards, no colour blocks.
    wrap.classList.add('calib-active');
    wrap.innerHTML = `<div id="calib-host" aria-label="כיול תדרים"></div>`;
    if(st._calibTeardown){ try{ st._calibTeardown(); }catch(_){} }
    const sb = ensureStageBand();
    const calib = mountCalibration(document.getElementById('calib-host'), {
      onLock: (hex) => { chooseBackground(hex); },
      cont: sb && sb.btn,
    });
    st._calibTeardown = calib.teardown;
    st._calib = calib;
    // The frequency stage runs its own ghost-hand demo (tap a square → it shows
    // large → tap "המשך"), synced to its internal state — see calibration.js.
  }
  if(q.type==='stars'){
    const numCols = 9;
    const items=HIDDEN_STAR_MOTIFS.map((m,i)=>{
      const row = Math.floor(i / numCols);
      const col = i % numCols;
      const baseX = 8 + col * 10.5;
      const baseY = 8 + row * 26;
      const jitterX = (Math.random() - 0.5) * 5;
      const jitterY = (Math.random() - 0.5) * 12;
      const left = baseX + jitterX;
      const top = baseY + jitterY;
      
      const size = 6 + ((i * 3) % 11);
      const opacity = 0.55 + ((i * 7) % 5) * 0.1;
      const dur = 1.6 + Math.random() * 2.8;
      const delay = -Math.random() * 4;
      
      return `<span class="star-pick" data-idx="${i}" data-motif="${m}" style="left:${left}%;top:${top}%;width:${size}px;height:${size}px;--star-opacity:${opacity};animation-duration:${dur}s;animation-delay:${delay}s"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="currentColor"/></svg><span class="star-reveal"><svg viewBox="0 0 40 40">${MOTIF_SVG[m]||MOTIF_SVG.circle}</svg></span></span>`;
    }).join('');
    wrap.classList.add('stars-active');
    wrap.innerHTML=`<div id="star-field">${items}</div>`;
    const picked=[];
    document.querySelectorAll('.star-pick').forEach(el=>{
      el.addEventListener('click',()=>{
        if(el.classList.contains('chosen')||picked.length>=1) return;
        el.classList.add('chosen');
        picked.push(el.dataset.motif);
        if(picked.length===1){
          document.querySelectorAll('.star-pick:not(.chosen)').forEach(o=>o.classList.add('fade-out'));
          st.answers.stars=picked.slice();
          st.p5SymbolsByStage = st.p5SymbolsByStage || {};
          if (!st.p5SymbolsByStage[2]) {
            st.p5SymbolsByStage[2] = [getRandomSymbol()];
          }
          
          const qCol = document.getElementById('middle-q-container');
          if (qCol) qCol.style.pointerEvents = 'none';

          // Start the pendant animation IMMEDIATELY (don't wait for advance()
          // to fire it later). Then wait for the full layer animation to
          // complete before transitioning to q4 — so the text typewriter and
          // textarea focus on q4 land into a calm canvas, not a busy one.
          triggerLayer(3); spawnBurst();
          setTimeout(() => {
            if (qCol) qCol.style.pointerEvents = 'auto';
            if(st.current >= QUESTIONS.length - 1) finishQuestionnaire();
            else transitionQuestion(st.current + 1);
          }, LAYER_DUR + 250);
        }
      });
    });
  } else if(q.type==='words'){
    const pool = [...WORD_POOL];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const chosenWords = [...pool];
    while (chosenWords.length < 50) {
      const randomWord = pool[Math.floor(Math.random() * pool.length)];
      chosenWords.push(randomWord);
    }

    for (let i = chosenWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chosenWords[i], chosenWords[j]] = [chosenWords[j], chosenWords[i]];
    }

    const numCols = 10;
    const dotItems = chosenWords.map((w, i) => {
      const row = Math.floor(i / numCols);
      const col = i % numCols;
      // Keep a margin inside the rectangle so even the largest dots don't spill.
      const baseX = 9 + col * 8.2;
      const baseY = 8 + row * 19;
      const jitterX = (Math.random() - 0.5) * 3;
      const jitterY = (Math.random() - 0.5) * 9;
      const left = baseX + jitterX;
      const top = baseY + jitterY;

      const delay = -Math.random() * 6;
      const dur = 3 + Math.random() * 3;
      
      return `<span class="gold-dot-pick" data-word="${w}" style="left:${left}%;top:${top}%;--dur:${dur}s;--delay:${delay}s"><img class="gold-dot-img" src="/image/v5-stage2/dot-gold.png" alt="" /><span class="gold-dot-label">${w}</span></span>`;
    }).join('');

    const dotsContainer = document.getElementById('s2-dots-container');
    if (dotsContainer) {
      dotsContainer.innerHTML = dotItems;
    }

    // fallback / hidden word list setup
    const items = chosenWords.map((w, i) => {
      return `<span class="float-word" data-word="${w}">${w}</span>`;
    }).join('');
    const midContainer = document.getElementById('word-field-container');
    if (midContainer) {
      midContainer.innerHTML = `<div id="word-field">${items}</div>`;
    }
    
    wrap.classList.add('words-active');
    wrap.innerHTML = '';

    // ── Entry choreography (under the grow-cover that already turned everything
    //    dark + recoloured the grid): once the cover reveals the dark stage, the
    //    light-points — BIG and small alike, all clipped inside the content
    //    rectangle — appear one after another, and only THEN the title
    //    "מהי נקודת האור שלך?" fades in. Timed to start just after the cover
    //    reveals (~650ms after this stage builds under it). ──
    const DOTS_START = 720, DOT_STEP = 9;
    st._lightEntryTimers = st._lightEntryTimers || [];
    const lightT = (fn, ms) => st._lightEntryTimers.push(setTimeout(fn, ms));
    // Both dot layers: big labelled (.gold-dot-pick) + small scattered
    // (.s2-float-dot). Shuffle them together so the rectangle fills as a scatter.
    const bigDots = dotsContainer ? Array.from(dotsContainer.querySelectorAll('.gold-dot-pick')) : [];
    const smallDots = Array.from(document.querySelectorAll('#stage2-float-dots .s2-float-dot'));
    const allDots = [...bigDots, ...smallDots];
    for (let i = allDots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [allDots[i], allDots[j]] = [allDots[j], allDots[i]]; }
    allDots.forEach(d => { d.style.opacity = '0'; d.style.transition = 'opacity 0.4s ease'; });
    allDots.forEach((d, i) => lightT(() => { d.style.opacity = ''; }, DOTS_START + i * DOT_STEP));
    // Title fades in LAST — after every dot has appeared. The visible title is the
    // dotted prompt image (.s2-prompt); #q-text is hidden on this stage.
    const TITLE_AT = DOTS_START + allDots.length * DOT_STEP + 250;
    const GATE_AT = DOTS_START + Math.round(allDots.length * DOT_STEP * 0.5);   // gate circle mid-cascade
    const qTitle = document.querySelector('#section-3 .stage2 .s2-prompt');
    if (qTitle) {
      qTitle.style.opacity = '0';
      qTitle.style.transition = 'opacity 0.9s ease';
      lightT(() => { qTitle.style.opacity = '1'; }, TITLE_AT);
    }

    // Picking a light-point — works for BOTH the labelled dots and the small
    // scattered dots. Fades every other dot (both layers), marks the chosen one,
    // stores the word + a symbol, then advances.
    // Light-point selection: press a point, drag a path toward the gate, and
    // release inside it — the point then travels the dotted trail on its own and
    // is absorbed (light-gate.js). The chosen point's word (labelled dots carry
    // one; scattered dots take a random one) is saved when it is absorbed.
    const commitWord = (dotEl) => {
      const word = (dotEl && dotEl.dataset && dotEl.dataset.word) || chosenWords[Math.floor(Math.random() * chosenWords.length)];
      st.answers.word = word || '';
      st.p5SymbolsByStage = st.p5SymbolsByStage || {};
      if (!st.p5SymbolsByStage[1]) st.p5SymbolsByStage[1] = [getRandomSymbol()];
      advance();                     // no "המשך" here — the pick opens the symbol window directly
    };
    // Old click-to-advance is superseded; reset the persistent scattered dots.
    document.querySelectorAll('.s2-float-dot').forEach(el => {
      el.classList.remove('fade-out', 'chosen', 's2-selected', 's2-consumed', 's2-fade', 's2-hidden-by-gate');
      el.onclick = null;
    });
    document.querySelectorAll('.gold-dot-pick').forEach(el => { el.onclick = null; });
    if (st._lightGateTeardown) { try { st._lightGateTeardown(); } catch (_) {} }
    st._lightGateTeardown = mountLightGate({
      arena: document.getElementById('q-main-cell'),
      dots: document.querySelectorAll('.s2-float-dot, .gold-dot-pick'),
      onAbsorb: (dotEl) => commitWord(dotEl),
      revealDelay: GATE_AT,          // the dotted gate circle fades in with the build
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
    st._roots = initRootsWidget(document.getElementById('roots-host'),{
      targetEl: document.getElementById('artifact-canvas'),
      onAdd:(name)=>{
        if(!st.roots.includes(name)){
          st.roots.push(name);
          st.answers.origin = st.roots.join(', ');
          st.p5SymbolsByStage = st.p5SymbolsByStage || {};
          st.p5SymbolsByStage[0] = st.roots.map(getObjFileForCountry);
          triggerLayer(4); spawnBurst(); renderDebugPanel();
          updateSelectedOriginsList();
          broadcastArtifact();   // push the new origin seed to the display screen
        }
      },
      onDone:()=>{
        if(!st.answers.origin) st.answers.origin = st.roots.join(', ');
        advance();
      },
    });
    // Origin is a two-step stage: mark continents → "סימנתי" spreads them to a
    // map → add countries → "סיימתי" finishes. Drive the shared band from whichever
    // of the (now hidden) widget confirms is currently live, and mirror its wording.
    const originLiveBtn = () => {
      // A hidden button is NOT live — after phase 1 #roots-done is hidden but keeps
      // its (non-dim) class, so without the hidden guard the band would click that
      // stale button instead of #roots-finish and never reach onDone/the symbol window.
      const fin = document.getElementById('roots-finish');
      if (fin && !fin.hidden && !fin.classList.contains('is-dim')) return fin;
      const done = document.getElementById('roots-done');
      if (done && !done.hidden && !done.classList.contains('is-dim')) return done;
      return null;
    };
    st._stageContinue = () => { const b = originLiveBtn(); if (b) b.click(); };
    clearInterval(st._originBandPoll);
    st._originBandPoll = setInterval(() => {
      const sb = ensureStageBand(); if (!sb) return;
      // Hide the widget's own confirms inline (a stage rule out-specifies the
      // stylesheet hide); the band drives them from behind the scenes.
      ['roots-done', 'roots-finish'].forEach(id => {
        const b = document.getElementById(id);
        if (b && b.style.display !== 'none') b.style.setProperty('display', 'none', 'important');
      });
      const live = originLiveBtn();
      const liveId = live ? live.id : null;
      // Phase changed (mark → finish) → un-press so the band accepts the next tap.
      if (liveId !== st._originLastLive) { sb.btn.classList.remove('is-pressed'); st._originLastLive = liveId; }
      sb.btn.classList.toggle('is-disabled', !live);
      // After "סימנתי" the map/keyboard phase begins: the note becomes the
      // country prompt and the button reads "הזנתי, אפשר להמשיך".
      const inputPhase = !!document.querySelector('.roots-widget.state-input');
      sb.btn.textContent = inputPhase ? 'הזנתי, אפשר להמשיך' : 'סימנתי';
      setBandNote(inputPhase ? 'הזן את ארצות המוצא' : (INSTRUCTIONS.origin || ''));
      // Flag the input phase so CSS can move the band button ("הזנתי") to the
      // empty area on the LEFT (only there — not the earlier "סימנתי" placement).
      document.getElementById('section-3')?.classList.toggle('origin-input-phase', inputPhase);
    }, 200);
    // Virtual Hebrew keyboard — attaches once the country input is mounted
    // (the roots widget shows it lazily on phase change), so retry briefly.
    (function bindCountryKbd(tries){
      const el = document.getElementById('roots-country-input');
      if (el) { attachKeyboardTo(el); return; }
      if (tries > 0) setTimeout(() => bindCountryKbd(tries - 1), 200);
    })(20);
    // Globe stage reached (now stage 2): run its reveal choreography (big title →
    // shrink → globe). setTimeout (not rAF) so it fires reliably even if rAF is
    // throttled, and after the widget's title is in the DOM.
    setTimeout(() => runStage0Choreography(), 60);
  } else if(q.type==='roots-tree'){
    wrap.innerHTML = '';
    wrap.classList.add('roots-tree-active');
    const midContainer = document.getElementById('word-field-container');
    if(midContainer){
      midContainer.innerHTML = `<div id="paths-game"></div><img class="paths-title" src="/image/v5-stage5/path-title.png" alt="מה המסלול שלך?" /><button class="q-help q-help-floating" type="button" aria-label="עזרה"><span class="q-help-tip">גררו את הנקודה הכתומה מימין, ועקבו אחר המסלולים עד נקודת היציאה משמאל</span></button>`;
      buildPathsGame(document.getElementById('paths-game'), (symbolKey) => {
        st.answers.roots = symbolKey;
        st.p5SymbolsByStage = st.p5SymbolsByStage || {};
        if (!st.p5SymbolsByStage[4]) {
          st.p5SymbolsByStage[4] = [getRandomSymbol()];
        }
        triggerLayer(5); spawnBurst();
        setTimeout(() => advance(), 900);   // reaching the exit opens the symbol window directly (no "המשך")
      });
      // Entry choreography: the maze shows LARGE, then shrinks a touch, and the
      // title "מה המסלול שלך?" rises from beneath it + types in, settling below.
      const pg = document.getElementById('paths-game');
      const ptitle = document.querySelector('#section-3 .paths-title');
      // Until the PNG is added, hide it so no broken-image box shows.
      if (ptitle) ptitle.addEventListener('error', () => { ptitle.style.display = 'none'; }, { once: true });
      st._pathsEntryTimers = st._pathsEntryTimers || [];
      const pT = (fn, ms) => st._pathsEntryTimers.push(setTimeout(fn, ms));
      pT(() => { if (pg) pg.classList.add('paths-shrunk'); }, 1200);
      pT(() => { if (ptitle) ptitle.classList.add('is-in'); }, 1950);
    }
  } else if(q.type==='time'){
    wrap.innerHTML = '';
    wrap.classList.add('time-active');
    const midContainer = document.getElementById('word-field-container');
    if(midContainer){
      midContainer.innerHTML = `<div id="time-wheel"></div>`;
      if(st._timeTeardown){ try{ st._timeTeardown(); }catch(_){} }
      st._timeTeardown = mountTimeWheel(document.getElementById('time-wheel'), {
        onHour: (hf) => applyTimeSky(hf),
        onDone: (val) => {
          st.answers.stars = val;
          st.p5SymbolsByStage = st.p5SymbolsByStage || {};
          if(!st.p5SymbolsByStage[3]) st.p5SymbolsByStage[3] = [getRandomSymbol()];
          advance();
        },
      });
      // An hour is always selected → the band button is ready at once; it drives
      // the wheel's (now hidden) "זו השעה שלי" confirm.
      armBand(() => document.querySelector('.tw-confirm')?.click());
    }
  } else if(q.type==='word-grid'){
    // Replaced the yellow letter grid with 8 animated dot tiles — the user picks
    // the living movement that attracts them (dot-tiles.js). The chosen tile's
    // internal meaning maps to a symbol, saved for a later reveal.
    const midContainer = document.getElementById('word-field-container');
    if (midContainer) midContainer.innerHTML = '';
    wrap.classList.add('tile-grid-active');
    wrap.innerHTML = '';

    if (st._dotTilesTeardown) { try { st._dotTilesTeardown(); } catch (_) {} st._dotTilesTeardown = null; }
    let picked = false;
    st._dotTilesTeardown = mountDotTiles(midContainer, {
      onChoose: (index, meaning) => {
        if (picked) return; picked = true;
        const symbolKey = pickTileSymbol(meaning);
        st.answers['life-wish'] = meaning;      // internal meaning (never shown)
        st.lifeWishSymbol = symbolKey;          // mapped symbol, revealed later
        st.p5SymbolsByStage = st.p5SymbolsByStage || {};
        st.p5SymbolsByStage[6] = [symbolKey + '.obj'];
        if (st._dotTilesTeardown) { try { st._dotTilesTeardown(); } catch (_) {} st._dotTilesTeardown = null; }
        advance();                     // no "המשך" — picking a movement opens the symbol window directly
      },
    });

  } else if(q.type==='drive'){
    // "מה מניע אותך?" — floating words; a tap picks the driving force, which maps
    // (via drive-words.js) to a jewel symbol. onSelect stores the answer + the
    // mapped symbol, then advance() builds that symbol onto the pendant and opens
    // the symbol window (advance uses st._forcedSymbol instead of a random pick).
    // MUST live inside this type-chain: the trailing `else` (text/textarea) would
    // otherwise overwrite the mounted field.
    wrap.classList.add('drive-active');
    wrap.innerHTML = '';
    st._driveTeardown = mountDrive(wrap, {
      onSelect: (word, symbol) => {
        st.answers = st.answers || {};
        st.answers.personal = word;
        st._forcedSymbol = symbol;
        armBand(advance);              // light up "המשך"; the press continues
      },
    });
  } else if(q.type==='placeholder'){
    // Empty placeholder stage — the shared grid/frame stays, no middle content.
    wrap.innerHTML='';
  } else if(q.type!=='background'){
    const isName = q.id === 'name';
    // Name (final) stage is stripped bare — just the input + a "סיום" button (no
    // help hint, no gematria watermark). The gematria is still computed on input
    // and, on submit, drives the ornament on the display.
    const submitLabel = isName ? 'סיום' : 'המשך';
    const helpBtn = isName ? '' : `<button class="q-help" type="button" aria-label="עזרה"><span class="q-help-tip">${q.placeholder||''}</span></button>`;
    wrap.innerHTML=`<textarea id="q-input" dir="rtl" rows="2"></textarea><button id="q-submit" aria-label="${submitLabel}">${submitLabel}</button>${helpBtn}`;
    const inp=document.getElementById('q-input');
    inp.value=st.answers[q.id]||''; setTimeout(()=>inp.focus(),350);
    document.getElementById('q-submit').addEventListener('click',submitAnswer);
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submitAnswer();}});
    if(isName){
      attachKeyboardTo(inp);   // virtual Hebrew keyboard, name step only
      inp.addEventListener('input',()=>{ st.gematriaValue=calcGematria(inp.value); });
    }
  }
  updateProgressList(idx);
  const pb=document.getElementById('q-prev'); if(pb) pb.style.opacity='1';
  const sb=document.getElementById('q-skip');
  if(sb) {
    sb.style.opacity = idx < QUESTIONS.length-1 ? '1' : '0';
    sb.style.pointerEvents = idx < QUESTIONS.length-1 ? 'auto' : 'none';
  }
}

/* Live typewriter — types `text` into `el` one character at a time,
   honoring \n as <br>. Cancels any in-flight typing on the same element
   (so navigating between questions doesn't leave overlapping streams). */
/* Stop an in-flight typewriter on `el`. Assigning `el.textContent` does NOT stop
   one: the pending timer keeps appendChild-ing its remaining characters onto
   whatever text replaced it. Anything that sets this text directly must call
   this first, or a stage left mid-type bleeds into the next stage's line. */
function stopTypewriter(el){
  if(el && el._typeTimer){ clearTimeout(el._typeTimer); el._typeTimer = null; }
}

function typewriterText(el, text, charDelay = 80, onDone){
  if(!el) return;
  stopTypewriter(el);
  el.innerHTML = '';
  let i = 0;
  const step = () => {
    if(i >= text.length){ el._typeTimer = null; if(onDone) onDone(); return; }
    const ch = text[i++];
    if(ch === '\n') el.appendChild(document.createElement('br'));
    else el.appendChild(document.createTextNode(ch));
    el._typeTimer = setTimeout(step, charDelay);
  };
  step();
}

/* Opening → stage-1 intro: after the gold dot lands as the globe, type the
   question letter-by-letter, then the bottom orange instruction the same way. */
let firstStage0Intro = true;
function playStage0Intro(){
  const qEl = document.getElementById('q-text');
  const instrEl = document.getElementById('q-instruction');
  if(!qEl) return;
  typewriterText(qEl, QUESTIONS[0].text.replace(/\n/g, ' '), 70, () => {
    if(instrEl) setTimeout(() => typewriterText(instrEl, INSTRUCTIONS[QUESTIONS[0].id] || '', 34), 260);
  });
}

/* Choreographed reveal once the globe has landed:
   continent dots sweep in → vertical grid line → horizontal grid line → text. */
function runStage0Choreography(){
  const sec = document.getElementById('section-3');
  if(!sec) return;
  const rootsTitle = sec.querySelector('.roots-story-title');
  const canvasWrap = sec.querySelector('.roots-canvas-wrap');
  const s1pTitle   = sec.querySelector('.stage1-panel .s1p-title');
  const rail    = document.getElementById('step-rail');
  const railDots= rail ? [...rail.querySelectorAll('li')] : [];
  railDots.forEach(d => d.classList.remove('is-current'));

  // Hold the globe + the small corner title hidden while the big title plays.
  // The roots title itself stays clipped (no .story-go) through the slide-in.
  if(canvasWrap){ canvasWrap.style.transition = 'none'; canvasWrap.style.opacity = '0'; }
  if(s1pTitle){ s1pTitle.style.transition = 'none'; s1pTitle.style.opacity = '0'; }
  if(rootsTitle){ rootsTitle.classList.remove('story-go'); rootsTitle.style.transition = 'none'; rootsTitle.style.transform = 'none'; }

  const SETTLE = 450;      // let the stage's slide-in finish before measuring
  const TITLE_MS = 2000;   // both lines type in at the big size

  // ── 1. After the slide settles: the title writes in LARGE, centred. ──
  setTimeout(() => {
    if(rootsTitle){
      rootsTitle.style.transition = 'none';
      rootsTitle.style.transform = 'none';
      void rootsTitle.offsetWidth;
      const R = rootsTitle.getBoundingClientRect();   // now-settled resting rect
      const sx = innerWidth / 1360, sy = innerHeight / 768;
      const L = 100 * sx, Rt = innerWidth - 100 * sx;   // central-rectangle sides
      const T = 85 * sy, B = 656 * sy;                  // top line → raised bottom line
      const S = R.width ? ((Rt - L) * 0.86) / R.width : 1.6;
      const cx = (L + Rt) / 2, cy = (T + B) / 2;
      const dx = cx - (R.left + R.width / 2), dy = cy - (R.top + R.height / 2);
      rootsTitle.style.transformOrigin = 'center center';
      rootsTitle.style.transform = `translate(${dx}px, ${dy}px) scale(${S})`;
      void rootsTitle.offsetWidth;
      rootsTitle.classList.add('story-go');   // arm the stepped clip reveal (types in big)
    }
    // ── 2. Shrink the title down to its resting corner. ──
    setTimeout(() => {
      if(rootsTitle){
        rootsTitle.style.transition = 'transform 0.85s cubic-bezier(0.4, 0, 0.15, 1)';
        rootsTitle.style.transform = 'none';
      }
    }, TITLE_MS);
    // ── 3. Once it's home, the globe fills in and the corner title returns. ──
    setTimeout(() => {
      if(canvasWrap){ canvasWrap.style.transition = 'opacity 0.55s ease'; canvasWrap.style.opacity = '1'; }
      if(s1pTitle){ s1pTitle.style.transition = 'opacity 0.4s ease'; s1pTitle.style.opacity = ''; }
      window.dispatchEvent(new CustomEvent('globe-reveal-dots'));
      setTimeout(() => railDots[st.current] && railDots[st.current].classList.add('is-current'), 400);
      setTimeout(() => runGlobeDemo(), 1700);   // once the globe has filled in, play the ghost-hand demo
    }, TITLE_MS + 950);
  }, SETTLE);
}

/* Ghost-hand demo for the globe stage: an OPEN hand glides in, closes to a FIST
   and spins the globe until Asia faces front, opens to a POINTING finger and taps
   Asia (it marks black), then the open hand presses "סימנתי". Plays once; a real
   touch cancels it. */
function runGlobeDemo(){
  const rd = st._roots && st._roots.demo;
  if(!rd || !rd.isGlobe()) return;
  const my = st._globeDemoToken = (st._globeDemoToken || 0) + 1;
  const sec = document.getElementById('section-3');
  const cancel = (e) => { if(e && e.isTrusted === false) return; st._globeDemoToken++; };
  sec && sec.addEventListener('pointerdown', cancel, { capture: true });
  const cleanup = () => sec && sec.removeEventListener('pointerdown', cancel, { capture: true });

  (async () => {
    const gh = getGhostHand();
    const dead = () => my !== st._globeDemoToken || !rd.isGlobe();
    const abort = () => { try { rd.hold(false); } catch (_) {} gh.hide(); cleanup(); };   // user cut in — leave state
    await gh.sleep(200);
    if(dead()) return abort();
    const canvas = document.querySelector('.roots-canvas-wrap canvas');
    if(!canvas) return abort();
    const cr = canvas.getBoundingClientRect();
    const gcx = cr.left + cr.width * 0.5, gcy = cr.top + cr.height * 0.5;

    // 1. open hand glides in from below onto the globe
    gh.open();
    gh.place(gcx + 40, (window.innerHeight || 900) + 60);
    gh.show('dark');
    await gh.sleep(90); if(dead()) return abort();
    gh.move(gcx - cr.width * 0.26, gcy);          // glide to the LEFT side to flick rightward
    await gh.sleep(720); if(dead()) return abort();

    // 2. fist → spin the globe to bring Asia to the front, done as 3 SHORT swipes
    //    (grab, flick a little, release, reposition), the way a visitor really
    //    rolls it round — not one long drag. The globe turns to the RIGHT (the hand
    //    flicks rightward). Measure the total rotation first and rewind synchronously
    //    (no await → the intermediate never renders), then replay it split evenly
    //    across the three flicks.
    const asiaFront = () => { const p = rd.continentPos('asia'); return !!(p && p.z > 0.62); };
    let need = 0;
    while(need < 400 && !asiaFront()){ rd.spinBy(0.03); need++; }
    rd.spinBy(-0.03 * need);                       // rewind to the start (no frame rendered)
    const startX = gcx - cr.width * 0.26, swipeLen = cr.width * 0.30;
    const perSwipe = Math.max(1, Math.ceil(need / 3));
    let done = 0;
    for(let s = 0; s < 3 && !dead() && done < need; s++){
      const steps = Math.min(perSwipe, need - done);
      gh.grab(true);                              // fist grabs the globe
      rd.hold(true);
      await gh.sleep(70); if(dead()) return abort();
      for(let f = 0; f < steps && !dead(); f++){
        rd.spinBy(0.03);                          // turn RIGHT
        // place() (instant, no glide) so the fist tracks the rotation frame-by-
        // frame — a real visible DRAG. move()'s CSS glide would lag and read as a tap.
        gh.place(startX + swipeLen * (f + 1) / steps, gcy);
        await gh.sleep(16);
        done++;
      }
      rd.hold(false);                             // let go — the globe holds while the hand lifts
      if(s < 2 && done < need){
        gh.open();
        gh.move(startX, gcy);                     // reposition to the left for the next flick
        await gh.sleep(200); if(dead()) return abort();
      }
    }
    if(dead()) return abort();
    await gh.sleep(350);

    // 3. open → pointing finger → tap Asia (it marks black)
    const ap = rd.continentPos('asia') || { x: gcx, y: gcy };
    gh.point(true);
    gh.move(ap.x, ap.y);
    await gh.sleep(650); if(dead()) return abort();
    await gh.tapPoint();
    rd.select('asia');
    await gh.sleep(800); if(dead()) return abort();

    // 4. open hand presses "סימנתי" below
    gh.open();
    const btn = document.querySelector('.stage-band .sb-btn');
    if(btn){
      const b = btn.getBoundingClientRect();
      gh.move(b.left + b.width / 2, b.top + b.height / 2);
      await gh.sleep(720); if(dead()) return abort();
      await gh.tap();
    }
    await gh.sleep(500);
    // Normal end: hide the hand and reset the demo's Asia pick so the visitor starts clean.
    gh.hide(); try { rd.hold(false); rd.clear(); } catch (_) {} cleanup();
  })();
}

window.addEventListener('opening-morph-start', () => {
  document.getElementById('section-3')?.classList.add('intro-chrome-hidden');
});
// First stage is now the background-colour choice (not the globe), so reveal the
// shared chrome simply and type its prompt — no globe choreography.
window.addEventListener('opening-morph-done', revealFirstStage);

function revealFirstStage(){
  const sec = document.getElementById('section-3');
  if(!sec) return;
  const logo    = sec.querySelector('.grid-logo');
  const symBtn  = document.getElementById('q-btn-symbol-library');
  const rail    = document.getElementById('step-rail');
  const railDots= rail ? [...rail.querySelectorAll('li')] : [];
  const progWrap= sec.querySelector('.q-header-progress-text-wrap');
  const sidebar = document.getElementById('sidebar-tagline');
  const prevBtn = document.getElementById('step-prev-btn');
  const nextBtn = document.getElementById('step-next-btn');
  const symText = symBtn ? symBtn.textContent.trim() : 'מאגר הסמלים';

  logo && logo.classList.add('is-in');
  if(symBtn){ symBtn.classList.add('is-in'); typewriterText(symBtn, symText, 75); }
  rail && rail.classList.add('is-in');
  railDots.forEach(d => d.classList.add('is-in'));
  progWrap && progWrap.classList.add('is-in');
  prevBtn && prevBtn.classList.add('is-in');
  nextBtn && nextBtn.classList.add('is-in');
  railDots.forEach(d => d.classList.remove('is-current'));
  setTimeout(() => railDots[0] && railDots[0].classList.add('is-current'), 400);

  if(sidebar){ sidebar.textContent = ''; sidebar.classList.add('is-in'); }
  startSidebarTaglineLoop();

  sec.classList.remove('intro-chrome-hidden');

  // Type the stage prompt (top-right, orange) — the swatches are already built.
  const instrEl = document.getElementById('q-instruction');
  // Guard: only type the first-stage instruction while we're actually on it.
  if(instrEl && QUESTIONS[st.current] && QUESTIONS[st.current].id === QUESTIONS[0].id) {
    typewriterText(instrEl, INSTRUCTIONS[QUESTIONS[0].id] || '', 40);
  }
}

function bindEvents(){
  document.getElementById('q-prev')?.addEventListener('click',goPrev);
  document.getElementById('q-skip')?.addEventListener('click',goSkip);
  document.getElementById('step-prev-btn')?.addEventListener('click',goPrev);
  document.getElementById('step-next-btn')?.addEventListener('click',goSkip);
  document.getElementById('stage-restart-btn')?.addEventListener('click',restartStage);
}
/* Restart the CURRENT stage from its beginning — clears its answer, tears down
   any open keyboard / roots-phase state, and re-renders it fresh. */
function restartStage(){
  const sec = document.getElementById('section-3');
  sec?.classList.remove('roots-marked','roots-exiting','roots-single');
  try { detachKeyboard(); } catch(_) {}
  hideSymbolInfo();
  closeSymbolWindow();
  const id = QUESTIONS[st.current]?.id;
  if(id) delete st.answers[id];
  // ── Roll the display jewel back to how it looked BEFORE this stage ──
  // Undo every contribution this stage made to the shared/broadcast state, then
  // re-broadcast so the external display rebuilds the earlier pendant — this
  // runs in parallel with the stage's own reset below.
  const P5_SLOT = { origin: 0, word: 1, stars: 2, personal: 3, roots: 4, 'life-wish': 6 };
  if (id && st.p5SymbolsByStage && P5_SLOT[id] != null) delete st.p5SymbolsByStage[P5_SLOT[id]];
  if (id === 'origin') st.roots = [];
  if (id === 'background') st.background = null;
  if (id === 'life-wish') st.lifeWishSymbol = null;
  // Drop any symbols this stage had already added to the accumulating stack.
  if (st.chosenBaseline != null) {
    st.chosenSymbols = (st.chosenSymbols || []).slice(0, st.chosenBaseline);
    st.chosenSymbolSizes = (st.chosenSymbolSizes || []).slice(0, st.chosenBaseline);
  }
  renderQuestion(st.current);
  broadcastArtifact();   // push the reverted pendant to the external display
}
function submitAnswer(){
  const inp=document.getElementById('q-input'), val=inp?.value?.trim();
  if(!val){inp?.classList.add('shake');setTimeout(()=>inp?.classList.remove('shake'),500);return;}
  const currentQ = QUESTIONS[st.current];
  st.answers[currentQ.id]=val;
  if(currentQ.id==='name'){
    st.gematriaValue=calcGematria(val);
    // Final stage: broadcast so the display builds the dotted ornament (gematria
    // dots) in parallel; animate the gematria calculation; then open the window
    // showing that same ornament + text about gematria.
    broadcastArtifact();
    try { detachKeyboard(); } catch(_){}
    playGematriaCalc(val, st.gematriaValue, () => {
      openSymbolWindow(null, {
        gematria: { value: st.gematriaValue, name: val },
        onContinue: () => finishQuestionnaire(),
      });
    });
    return;
  }
  if(currentQ.id==='personal') {
    st.p5SymbolsByStage = st.p5SymbolsByStage || {};
    if (!st.p5SymbolsByStage[3]) {
      st.p5SymbolsByStage[3] = [getRandomSymbol()];
    }
  }
  advance();
}

/* Illustrate the gematria of `name`: reveal each Hebrew letter with its value,
   the running total climbing in the big dotted numerals (the time-stage digit
   art), landing on `total`. Calls onDone when finished. */
function playGematriaCalc(name, total, onDone){
  const host = document.getElementById('middle-q-container');
  const letters = [...name].map(c=>({ c, v: GEMATRIA[c]||0 })).filter(o=>o.v>0);
  if(!host || !letters.length){ onDone && onDone(); return; }
  // Hide the input row while the calc plays.
  ['q-input','q-submit'].forEach(id=>{ const e=document.getElementById(id); if(e) e.style.visibility='hidden'; });
  document.getElementById('gematria-calc')?.remove();
  const ov = document.createElement('div');
  ov.id='gematria-calc';
  ov.style.cssText='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5vh;z-index:30;pointer-events:none;direction:rtl;';
  const row=document.createElement('div');
  row.style.cssText='display:flex;gap:1.2vw;align-items:flex-end;flex-wrap:wrap;justify-content:center;max-width:80%;';
  letters.forEach(o=>{
    const cell=document.createElement('div');
    cell.style.cssText='display:flex;flex-direction:column;align-items:center;opacity:0;transition:opacity .35s ease;';
    cell.innerHTML=`<span style="font-family:'ArbelG',sans-serif;font-size:clamp(28px,3.2vw,50px);color:#282828;line-height:1;">${o.c}</span><span style="font-family:monospace;font-size:clamp(11px,0.95vw,15px);color:#fb5716;margin-top:6px;">${o.v}</span>`;
    row.appendChild(cell); o.cell=cell;
  });
  const sum=document.createElement('div');
  sum.style.cssText='display:flex;gap:0.5vw;align-items:center;direction:ltr;';
  const renderSum=n=>{ sum.innerHTML=String(n).split('').map(d=>`<img src="/image/v5-stage6/${d}.png" style="height:clamp(56px,12vh,140px);width:auto;display:block;" alt="">`).join(''); };
  renderSum(0);
  ov.appendChild(row); ov.appendChild(sum); host.appendChild(ov);
  let running=0, i=0;
  const step=()=>{
    if(i>=letters.length){ renderSum(total); setTimeout(()=>{ try{ov.remove();}catch(_){} onDone && onDone(); }, 1500); return; }
    const o=letters[i]; o.cell.style.opacity='1'; running+=o.v; renderSum(running); i++;
    setTimeout(step, 540);
  };
  setTimeout(step, 350);
}
function submitChoiceAnswer(val){
  st.answers[QUESTIONS[st.current].id]=val;
  setTimeout(()=>advance(),320);
}
function updateLoadBar(progress){
  // Three-section dot progress: design (8) | colors (1) | background (1).
  // `progress` (0..1), when provided, fills proportionally across all 10.
  // Otherwise the current design question index controls just the design row.
  const designDots = document.querySelectorAll('.q-progress-section[data-section="design"] .q-progress-dot');
  const colorDots  = document.querySelectorAll('.q-progress-section[data-section="colors"] .q-progress-dot');
  const bgDots     = document.querySelectorAll('.q-progress-section[data-section="background"] .q-progress-dot');
  if (!designDots.length) return;

  let designFilled = 0, colorFilled = 0, bgFilled = 0, currentInDesign = -1;
  if (progress != null) {
    const total = designDots.length + colorDots.length + bgDots.length;
    const filled = Math.round(progress * total);
    designFilled = Math.min(designDots.length, filled);
    colorFilled  = Math.min(colorDots.length,  Math.max(0, filled - designDots.length));
    bgFilled     = Math.min(bgDots.length,     Math.max(0, filled - designDots.length - colorDots.length));
  } else {
    const n = QUESTIONS.length;
    const idx = Math.max(0, Math.min(n - 1, st.current));
    // Map 0..n-1 questions to 1..designDots.length lit dots
    designFilled = Math.max(1, Math.round(((idx + 1) / n) * designDots.length));
    currentInDesign = designFilled - 1;
  }

  designDots.forEach((d, i) => {
    d.classList.toggle('is-filled', i < designFilled);
    d.classList.toggle('is-current', i === currentInDesign && designFilled < designDots.length + 1);
  });
  colorDots.forEach((d, i) => { d.classList.toggle('is-filled', i < colorFilled); d.classList.remove('is-current'); });
  bgDots.forEach((d, i)    => { d.classList.toggle('is-filled', i < bgFilled);    d.classList.remove('is-current'); });
}

/* Background-choice stage: store the picked colour, push it to the display, and
   advance. This stage adds NO symbol to the jewel. */
function chooseBackground(color){
  st.background = color;
  broadcastArtifact();   // display switches its background to `color`
  if(st.current < QUESTIONS.length-1) transitionQuestion(st.current+1);
  else finishQuestionnaire();
}

/* Sky tint for the "מה השעה שלך" stage: the background follows the chosen hour —
   cream by day, #282828 by night, with fixed transition windows.
     06:00–18:00 → full cream (day)
     18:00–20:30 → cream → #282828 (dusk)
     20:30–04:00 → full #282828 (night)
     04:00–06:00 → #282828 → cream (dawn)
   The numerals + grid also cross to a readable light/dark theme around the
   half-way point of each transition. */
const TIME_NIGHT = [40, 40, 40];    // #282828 — night
const TIME_DAY   = [245, 245, 237]; // #f5f5ed — cream (interface day plate)
function daylightForHour(hf){
  const h = ((hf % 24) + 24) % 24;
  if(h >= 6 && h <= 18) return 1;                    // 06:00–18:00 full day
  if(h >= 4 && h < 6)   return (h - 4) / 2;          // 04:00–06:00 night → day
  if(h > 18 && h < 20.5) return 1 - (h - 18) / 2.5;  // 18:00–20:30 day → night
  return 0;                                           // 20:30–04:00 full night
}
function applyTimeSky(hf){
  const sec = document.getElementById('section-3');
  if(!sec || sec.getAttribute('data-stage') !== '3') return;
  const a = daylightForHour(hf);
  const c = TIME_NIGHT.map((n, i) => Math.round(n + (TIME_DAY[i] - n) * a));
  sec.style.setProperty('background-color', `rgb(${c[0]}, ${c[1]}, ${c[2]})`, 'important');
  sec.classList.toggle('tw-daylight', a >= 0.5);   // day → dark content, night → light
}

/* Map time-spent-in-a-stage (ms) → a symbol size factor. Longer → bigger, clamped
   so the smallest and largest still read together and never dominate. */
function timeToSymbolSize(dt){
  // Minimum size = ~the rimon in the reference (floor 1.3); longer dwell → bigger,
  // up to ~1.8× that. So no symbol is ever tiny, and the hierarchy still reads.
  const s = 1.2 + (dt || 0) / 7000;    // +1.0 per ~7s
  return Math.max(1.3, Math.min(2.3, s));
}
function advance(){
  const qid = QUESTIONS[st.current].id;
  triggerLayer(LAYER_BY_ID[qid]); spawnBurst();

  const goNext = () => {
    if(st.current>=QUESTIONS.length-1) finishQuestionnaire();
    else transitionQuestion(st.current+1);
  };

  // The background stage picks a colour (via chooseBackground), not a symbol,
  // and shows no symbol window.
  if(qid === 'background'){ goNext(); return; }

  // Add a symbol to the accumulating list (symbols build up on the jewel — they
  // don't replace each other). Most stages pick at random; a stage that maps its
  // answer to a specific symbol (e.g. the "מה מניע אותך?" drive stage) sets
  // st._forcedSymbol, which takes precedence for this one transition.
  st.chosenSymbols = st.chosenSymbols || [];
  let sym = st._forcedSymbol || pickRandomSymbol();
  st._forcedSymbol = null;
  // Guard against a forced symbol repeating one already on the talisman — swap
  // it for an unused one (pickRandomSymbol already excludes used symbols).
  if(sym && st.chosenSymbols.includes(sym)){
    const alt = pickRandomSymbol();
    if(alt) sym = alt;
  }
  if(sym){
    st.chosenSymbols.push(sym);
    // Size this symbol by how long the visitor spent in THIS stage — longer → bigger,
    // so the times set the hierarchy (positions/order unchanged; layout keeps them
    // from overlapping). Aligned with chosenSymbols.
    st.chosenSymbolSizes = st.chosenSymbolSizes || [];
    const dt = performance.now() - (st._stageEnteredAt || performance.now());
    st.chosenSymbolSizes.push(timeToSymbolSize(dt));
  }
  broadcastArtifact();   // 3D display builds in parallel with the window below

  // The symbol window opens on the touch screen (grow-in → dotted divider draws →
  // contour animates → text types). "המשך" closes it and continues to the next
  // stage. Triggered per-stage automatically because every choice calls advance().
  // Leaving the globe → the light-point stage uses the grow-cover: the window
  // grows and turns everything dark (the light-point stage's own bg), the fixed
  // grid recolours in step, then the stage assembles underneath (see its 'words'
  // branch: dots cascade in, title fades in last).
  if(sym) openSymbolWindow(sym, { onContinue: goNext });
  else goNext();
}
function goPrev(){
  if(st.current>0) {
    transitionQuestion(st.current-1);
  } else {
    location.reload();
  }
}
function goSkip(){ if(st.current<QUESTIONS.length-1) transitionQuestion(st.current+1); }
function transitionQuestion(next){
  // Snapshot how many symbols the jewel carries as we ENTER the next stage, so a
  // "restart stage" can roll the display back to exactly this point (see
  // restartStage). Captured here (after the previous stage's symbol was already
  // pushed in advance) so it marks the state BEFORE the stage we're entering.
  st.chosenBaseline = (st.chosenSymbols || []).length;
  // Clear the momentary symbol-info card / window so nothing lingers into the
  // next stage.
  hideSymbolInfo();
  closeSymbolWindow();
  // Vertical inner-track transition: the fixed outer frame stays put while the
  // central content travels along a vertical track. Moving forward (descending
  // the track) the current content exits upward and the next enters from below;
  // moving back (ascending) it reverses.
  const mid = document.getElementById('middle-q-container');
  if(!mid){ renderQuestion(next); return; }
  const descending = next > st.current;
  // Pause the canvas animation loop during the transition + the first ~600ms of
  // the next question so the typewriter and textarea focus land cleanly.
  st.paused = true;
  mid.classList.remove('q-track-enter-up','q-track-enter-down');
  mid.classList.add(descending ? 'q-track-exit-up' : 'q-track-exit-down');
  setTimeout(()=>{
    // renderQuestion resets #middle-q-container.className (to q-layout-<id>),
    // which clears the exit class; re-grab and apply the matching enter slide.
    renderQuestion(next);
    const mid2 = document.getElementById('middle-q-container');
    if(mid2){
      const enterCls = descending ? 'q-track-enter-up' : 'q-track-enter-down';
      mid2.classList.add(enterCls);
      setTimeout(()=>mid2.classList.remove(enterCls), 640);
    }
    // Resume canvas drawing after the new question text + input are in.
    setTimeout(()=>{ st.paused = false; }, 600);
  },320);
}
function finishQuestionnaire(){
  // Pendant is complete — go straight to the tools/editor page (the extra page
  // after the 8 stages), as pressing "המשך" in the name window should.
  for(let i=st.current+1;i<8;i++) triggerLayer(i);
  updateLoadBar(STAGE1_LOADBAR_SHARE);
  updateV5StepProgress(6);
  // Snapshot the canvas dimensions the user actually saw the pendant in, so the
  // broadcast artifact is built against THIS layout.
  st.pendantLayout = { width: LW, height: LH };
  broadcastArtifact();   // final, complete pendant → external display
  enterEditor();
}

/* The post-questionnaire tools page — pick a symbol and tweak its size/position/
   colour, and change the background + frame colour; every change re-broadcasts so
   the display (and the embedded jewel) update live. */
let _editorTeardown = null;
function enterEditor(){
  broadcastArtifact();   // make sure the displays hold the final artifact first
  if (_editorTeardown) { try { _editorTeardown(); } catch (_) {} }
  _editorTeardown = mountEditor({
    st,
    broadcast: broadcastArtifact,
    symbolName: (key) => (SYMBOL_INFO_2D[key] && SYMBOL_INFO_2D[key].name) || key,
  });
}
export function setStage(stageNum) {
  const stepsRow = document.querySelector('.q-header-steps-row');
  if (!stepsRow) return;
  stepsRow.setAttribute('data-stage', stageNum);

  const leftCol = document.querySelector('.q-header-steps-left');
  const rightCol = document.querySelector('.q-header-steps-right');

  if (leftCol && rightCol) {
    // Stage 3: בחירת הרקע — Only visible if we reached it
    const isStage3Active = (stageNum === 3);
    const stage3Visibility = (stageNum >= 3) ? 'visible' : 'hidden';
    
    if (isStage3Active) {
      leftCol.innerHTML = `<div class="q-header-step-active" data-stage="3" style="visibility: ${stage3Visibility}"><span>בחירת הרקע</span></div>`;
    } else {
      leftCol.innerHTML = `<span class="q-header-step-label" data-stage="3" style="visibility: ${stage3Visibility}">בחירת הרקע</span>`;
    }

    // Stages 2, 1
    let rightHTML = '';
    
    // Stage 2: התכשיט שלך מוכן — Only visible if we reached it
    const isStage2Active = (stageNum === 2);
    const stage2Visibility = (stageNum >= 2) ? 'visible' : 'hidden';
    
    if (isStage2Active) {
      rightHTML += `<div class="q-header-step-active" data-stage="2" style="visibility: ${stage2Visibility}"><span>התכשיט שלך מוכן</span></div>`;
    } else {
      rightHTML += `<span class="q-header-step-label" data-stage="2" style="visibility: ${stage2Visibility}">התכשיט שלך מוכן</span>`;
    }

    // Stage 1: עיצוב התכשיט
    if (stageNum === 1) {
      rightHTML += `<div class="q-header-step-active" data-stage="1"><span>עיצוב התכשיט</span></div>`;
    } else {
      rightHTML += `<span class="q-header-step-label" data-stage="1">עיצוב התכשיט</span>`;
    }

    rightCol.innerHTML = rightHTML;
  }

  // Update progress bar based on stage
  if (stageNum === 1) {
    updateLoadBar();
  } else if (stageNum === 2) {
    updateLoadBar(0.92);
  } else if (stageNum === 3) {
    updateLoadBar(1.00);
  }
}

function enterArtifactView(){
  // Transition steps row and progress bar to stage 2 (תוצר)
  setStage(2);
  updateV5StepProgress(7);

  const sec3 = document.getElementById('section-3');
  if (sec3) {
    sec3.classList.add('stage-2-view');
  }

  const col = document.getElementById('artifact-col');
  if (!col) return;

  // Let the CSS width transition (0.8s) run.
  // During this time, the ResizeObserver on col will trigger resizeCanvas() on every frame,
  // causing the 2D canvas to animate smoothly to the center.
  setTimeout(() => {
    // Add stage-2-active class to hide question-col and middle-col
    if (sec3) {
      sec3.classList.add('stage-2-active');
    }
    
    // Hide 2D canvas and mount 3D after transition
    if (cvs) cvs.style.display = 'none';
    const data = buildArtifactData(col.clientWidth, col.clientHeight);
    mountArtifact3D(col, data);
  }, 800); // 800ms matches the CSS transition duration
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
    origins,
    p5Symbols: getActiveP5Symbols(),
    crown: word ? { motif: WORD_TO_MOTIF[word]||'circle', tilt: crownTilt } : null,
    // The user-chosen background colour (from the background stage), or null.
    background: st.background || null,
    // Accumulating stack of the randomly-chosen symbols (one per stage-end).
    symbols3d: (st.chosenSymbols || []).slice(),
    // Per-symbol size factor from the time spent in each stage (aligned with symbols3d).
    symbolSizes: (st.chosenSymbolSizes || []).slice(),
    seed:  origins.length ? { origins: origins.map(motifForCountry) } : null,
    sides: sidesMotif ? { motif: sidesMotif, rotation: sideRot } : null,
    stars: (st.answers.stars||[]).slice(),
    dots,
    // Once the name is submitted, its gematria value drives the Moroccan
    // floral dot-ornament that frames the jewel on the display (dot count =
    // gematria). 0 before the name stage → no ornament.
    gematria: (st.answers.name && st.answers.name.trim()) ? (st.gematriaValue || 0) : 0,
    // Post-questionnaire editor tweaks: per-symbol { scale, dx, dy, color }
    // (indexed like symbols3d) + a frame/ornament colour. Null/empty until the
    // user touches the tools page.
    edits: (st.artifactEdits || []).slice(),
    frameColor: st.frameColor || null,
  };
}

/* ── External display sync ────────────────────────────────────────
   Broadcasts the current pendant `data` (the SAME object buildArtifactData
   produces for the final 3D mount) so the hidden portrait display page
   (display.html) can render the object live as the user progresses.
   buildArtifactData already reads live state, so calling it after each
   step naturally yields a progressive pendant — no separate logic. */
const ARTIFACT_CHANNEL = 'zehut-artifact';
const ARTIFACT_STORAGE_KEY = 'zehut-artifact-data';
const ACTIVITY_STORAGE_KEY = 'zehut-activity-state';   // 'idle' (opening screen) | 'active'
let _artifactBC = null;
try { _artifactBC = ('BroadcastChannel' in window) ? new BroadcastChannel(ARTIFACT_CHANNEL) : null; } catch(_) { _artifactBC = null; }

// Tell the display whether the interface is idle (opening screen, showing the
// 20-talisman gallery) or active (a visitor pressed "לחץ להתחלה" → single jewel).
function broadcastActivity(state){
  try {
    _artifactBC?.postMessage({ type: 'activity', state });
    localStorage.setItem(ACTIVITY_STORAGE_KEY, state);
  } catch(_) { /* best-effort */ }
}
// Opening screen is up on load (and after a reload back to it) → gallery.
broadcastActivity('idle');
// The visitor pressed "לחץ להתחלה" → the experience begins → single live jewel.
window.addEventListener('opening-morph-start', () => broadcastActivity('active'));

function broadcastArtifact(){
  try {
    // Use the live pendant layout so zones match what the user is seeing;
    // the display overrides pixel size itself when it fits the camera.
    const w = st.pendantLayout?.width  || LW || 340;
    const h = st.pendantLayout?.height || LH || 480;
    const data = buildArtifactData(w, h);
    _artifactBC?.postMessage({ type: 'artifact', payload: data });
    // localStorage doubles as a fallback channel AND a snapshot so a display
    // opened late (mid-session) can restore the current object immediately.
    localStorage.setItem(ARTIFACT_STORAGE_KEY, JSON.stringify(data));
  } catch(_) { /* display sync is best-effort; never break the interface */ }
}

function triggerLayer(i){ if(i>=0&&i<8) layerStart[i]=performance.now(); }
function updateLayers(now){ for(let i=0;i<8;i++){ if(layerStart[i]===-Infinity) continue; st.layerProgress[i]=Math.min((now-layerStart[i])/LAYER_DUR,1); } }
function lp(i){ return easeIO(st.layerProgress[i]||0); }
function rawP(i){ return st.layerProgress[i]||0; }
function layerAge(i){ return layerStart[i]===-Infinity?Infinity:performance.now()-layerStart[i]; }
function isNew(i){ return layerAge(i)<1100; }

function spawnBurst(){
  const {cx,bodyY}=Z();
  // Reduced from 16 → 6 particles to keep the burst light during transitions
  for(let i=0;i<6;i++){
    const a=Math.random()*Math.PI*2,v=1.5+Math.random()*3.5;
    st.particles.push({x:cx,y:bodyY,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,decay:0.020+Math.random()*0.018,r:1+Math.random()*3,orange:Math.random()>0.5});
  }
}
function updateParticles(){ st.particles=st.particles.filter(p=>p.life>0); st.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=0.92;p.vy*=0.92;p.life-=p.decay;}); }

let lastDimStr = "";
export function updateDynamicDimensions() {
  let h = 0;
  let w = 0;

  // 1. Seed/Origins (Layer 2)
  const numOrigins = (st.selectedOrigins || st.roots || []).length;
  if (numOrigins > 0) {
    h = 18;
    w = 12;
  }

  // Only grow if the base core is built
  if (h > 0) {
    // 2. Crown/Word (Layer 1)
    if (st.answers.word) {
      h = 24;
      w = 16;
    }

    // 3. Stars (Layer 3)
    if (st.answers.stars && st.answers.stars.length > 0) {
      h = 30;
      w = 18;
    }

    // 4. Sides/Personal Word (Layer 4)
    const inp = document.getElementById('q-input');
    const isPersonalStep = QUESTIONS[st.current] && QUESTIONS[st.current].id === 'personal';
    const isNameStep = QUESTIONS[st.current] && QUESTIONS[st.current].id === 'name';
    
    let hasPersonal = (st.answers.personal || '').trim().length > 0;
    if (isPersonalStep && inp && inp.value.trim().length > 0) {
      hasPersonal = true;
    }
    if (hasPersonal) {
      h = 36;
      w = 20;
    }

    // 5. Roots (Layer 5)
    if (st.answers.roots) {
      h = 40;
      w = 22;
    }

    // 6. Name (Layer 6)
    let hasName = (st.answers.name || '').trim().length > 0;
    if (isNameStep && inp && inp.value.trim().length > 0) {
      hasName = true;
    }
    if (hasName) {
      h = 46;
      w = 26;
    }
  }

  const dimStr = `H ${String(h).padStart(2, '0')}MM × W ${String(w).padStart(2, '0')}MM`;
  
  if (dimStr !== lastDimStr) {
    lastDimStr = dimStr;
    
    // Update in stage 0 orange panel
    const s0Val = document.getElementById('s0-orange-coord-val');
    if (s0Val) s0Val.textContent = dimStr;
    
    // Update in right panel coordinates
    const decoVal = document.getElementById('deco-coord-val');
    if (decoVal) decoVal.textContent = dimStr;
  }
}

let p5Instance = null;
let prevHamsaMode = 'none';

function ensureP5(callback) {
  if (window.p5) {
    callback();
    return;
  }
  const s = document.createElement('script');
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js";
  s.onload = callback;
  document.head.appendChild(s);
}

// Simple fast client-side OBJ parser
function parseOBJText(text) {
  const verts = [];
  const faces = [];
  const lines = text.split('\n');
  
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('v ')) {
      const parts = line.split(/\s+/);
      verts.push({
        x: parseFloat(parts[1]),
        y: parseFloat(parts[2]),
        z: parseFloat(parts[3])
      });
    } else if (line.startsWith('f ')) {
      const parts = line.split(/\s+/);
      const f = [];
      for (let i = 1; i < parts.length; i++) {
        const idx = parseInt(parts[i].split('/')[0]) - 1;
        f.push(idx);
      }
      if (f.length === 3) {
        faces.push(f);
      } else if (f.length === 4) {
        faces.push([f[0], f[1], f[2]]);
        faces.push([f[0], f[2], f[3]]);
      }
    }
  }
  return { vertices: verts, faces };
}

function getObjFileForCountry(country) {
  const c = (country || '').trim();
  if (c === 'מרוקו') return 'hamsa.obj';
  if (['עיראק', 'לבנון', 'תוניסיה', 'לוב', 'סוריה', 'יוון', 'טורקיה', 'תורכיה', 'אתיופיה'].includes(c)) return 'eye.obj';
  if (['פולין', 'רוסיה', 'גרמניה', 'רומניה', 'הונגריה', 'בלגיה', 'אוסטריה', 'צ׳כיה', 'אוקראינה'].includes(c)) return 'rimon.obj';
  if (['תימן', 'מצרים', 'אלג׳יריה', "אלג'יריה", 'טריפולי', 'פרס', 'איראן'].includes(c)) return 'fish.obj';
  
  // Deterministic fallback using hash
  const files = ['hamsa.obj', 'eye.obj', 'rimon.obj', 'fish.obj'];
  const h = simpleHash(c);
  return files[h % files.length];
}

function centerAndOffset(verts, offsetY) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let v of verts) {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
    minZ = Math.min(minZ, v.z);
    maxZ = Math.max(maxZ, v.z);
  }

  let cx = (minX + maxX) / 2;
  let cy = (minY + maxY) / 2;
  let cz = (minZ + maxZ) / 2;

  let size = Math.max(maxX - minX, Math.max(maxY - minY, maxZ - minZ)) || 1;

  // Scale to fit a bounding box of size 120 so multiple symbols fit stacked
  const scaleSize = 120;

  for (let v of verts) {
    v.x = (v.x - cx) / size * scaleSize;
    v.y = -(v.y - cy) / size * scaleSize + offsetY; // apply vertical offset
    v.z = (v.z - cz) / size * scaleSize;
  }
}

function getRandomSymbol() {
  const pool = ['hamsa.obj', 'eye.obj', 'rimon.obj', 'fish.obj'];
  return pool[Math.floor(Math.random() * pool.length)];
}

/* Behaviour-tile → symbol. Each internal meaning maps to several historically
   valid symbols from the database; we pick one that a previous stage hasn't
   already used (never hard-locking a single symbol per meaning). */
const TILE_SYMBOL_CANDIDATES = {
  healing:     ['scarab', 'lotus', 'moon'],
  abundance:   ['rimon', 'artichoke'],
  growth:      ['spiral', 'tiltan'],
  flow:        ['fish', 'rimon'],
  balance:     ['anah', 'dharma'],
  cleansing:   ['moon', 'lotus'],
  continuity:  ['dharma', 'anah'],
  journey:     ['vegvisir', 'spiral'],
  renewal:     ['scarab', 'lotus', 'moon'],
  protection:  ['hamsa', 'eye'],
  harmony:     ['anah', 'dharma'],
  energy:      ['scarab', 'spiral'],
  ascent:      ['spiral', 'tiltan'],
  aspiration:  ['pyramid', 'hamsa'],
  guidance:    ['vegvisir', 'dharma'],
  fertility:   ['rimon', 'fish', 'tiltan'],
  connection:  ['tiltan', 'dharma'],
  luck:        ['horseshoe', 'tiltan', 'fish'],
  freedom:     ['fish', 'moon'],
  exploration: ['vegvisir', 'spiral'],
  community:   ['rimon', 'artichoke'],
  vitality:    ['scarab', 'lotus'],
  roots:       ['anah', 'djed'],
  strength:    ['djed', 'pyramid'],
  wisdom:      ['eye', 'dharma'],
  eternity:    ['anah', 'spiral', 'moon'],
  rebirth:     ['scarab', 'lotus'],
  unity:       ['dharma', 'anah'],
  passage:     ['djed', 'vegvisir'],
  radiance:    ['scarab', 'spiral'],
  shelter:     ['hamsa', 'pyramid'],
  serenity:    ['moon', 'lotus'],
};
const objToKey = obj => String(obj || '').replace(/\.obj$/i, '').toLowerCase();
function usedSymbolKeys() {
  const set = new Set();
  const s = st.p5SymbolsByStage || {};
  Object.values(s).forEach(arr => (arr || []).forEach(o => set.add(objToKey(o))));
  if (st.answers.symbol) set.add(String(st.answers.symbol).toLowerCase());
  if (st.lifeWishSymbol) set.add(String(st.lifeWishSymbol).toLowerCase());
  return set;
}
function pickTileSymbol(meaning) {
  const cands = TILE_SYMBOL_CANDIDATES[meaning] || ['circle'];
  const used = usedSymbolKeys();
  const free = cands.filter(k => !used.has(k));
  const pool = free.length ? free : cands;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getActiveP5Symbols() {
  const list = [];
  const stageSymbols = st.p5SymbolsByStage || {};
  if (stageSymbols[0]) list.push(...stageSymbols[0]);
  if (st.answers.word && stageSymbols[1]) list.push(...stageSymbols[1]);
  if (st.answers.stars && stageSymbols[2]) list.push(...stageSymbols[2]);
  if (st.answers.personal && stageSymbols[3]) list.push(...stageSymbols[3]);
  if (st.answers.roots && stageSymbols[4]) list.push(...stageSymbols[4]);
  return list;
}

function handleHamsaP5() {
  const symbols = getActiveP5Symbols();
  const hasCustomSymbol = symbols.length > 0;
  const hasName = st.answers.name && st.answers.name.trim().length > 0;

  let currentMode = 'none';
  if (hasCustomSymbol) {
    currentMode = hasName ? '3d' : '2d';
  }

  if (currentMode === prevHamsaMode) {
    return;
  }
  prevHamsaMode = currentMode;

  const canvasCol = document.getElementById('artifact-col');
  if (!canvasCol) return;

  let p5Container = document.getElementById('artifact-p5-container');

  // Clean up old instance
  if (p5Instance) {
    p5Instance.remove();
    p5Instance = null;
  }

  if (currentMode === 'none') {
    if (p5Container) {
      p5Container.remove();
    }
    if (cvs && !st.artifactView) {
      cvs.style.display = 'block';
    }
    return;
  }

  // Ensure container exists
  if (cvs) cvs.style.display = 'none';
  const threeCanvas = canvasCol.querySelector('canvas:not(#artifact-canvas)');
  if (threeCanvas) threeCanvas.style.display = 'none';

  if (!p5Container) {
    p5Container = document.createElement('div');
    p5Container.id = 'artifact-p5-container';
    Object.assign(p5Container.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '5'
    });
    canvasCol.appendChild(p5Container);
  }

  ensureP5(() => {
    // Re-evaluate mode after loading script
    const curSymbols = getActiveP5Symbols();
    const curHasCustom = curSymbols.length > 0;
    const curHasName = st.answers.name && st.answers.name.trim().length > 0;
    const evaluatedMode = curHasCustom ? (curHasName ? '3d' : '2d') : 'none';

    if (evaluatedMode === 'none' || p5Instance) return;

    // Calculate vertical spacing offsets based on number of symbols
    const N = curSymbols.length;
    const offsets = [];
    if (N === 1) {
      offsets.push(0);
    } else if (N === 2) {
      offsets.push(-80, 80);
    } else if (N === 3) {
      offsets.push(-110, 0, 110);
    } else {
      const step = 240 / (N - 1);
      for (let i = 0; i < N; i++) {
        offsets.push(-120 + i * step);
      }
    }

    // Load and parse all OBJ files asynchronously using fetch
    const promises = curSymbols.map((file, idx) => {
      const offsetY = offsets[idx];
      return fetch('/v5/' + file)
        .then(res => res.text())
        .then(text => {
          const model = parseOBJText(text);
          centerAndOffset(model.vertices, offsetY);
          return model;
        });
    });

    Promise.all(promises).then(models => {
      // Double check mode hasn't changed during fetch
      if (prevHamsaMode !== evaluatedMode) return;

      if (evaluatedMode === '2d') {
        const sketch = (p) => {
          let rawPoints = [];
          let targetPoints = [];
          let particles = [];
          let createdParticles = false;

          const dotSpacing = 4.5;
          const dotSize = 1.0;

          p.setup = function() {
            const w = p5Container.clientWidth || 500;
            const h = p5Container.clientHeight || 500;
            p.createCanvas(w, h, p.WEBGL);
            p.pixelDensity(window.devicePixelRatio || 2);

            // Populate combined rawPoints from all models
            for (let model of models) {
              for (let v of model.vertices) {
                rawPoints.push(p.createVector(v.x, v.y, v.z));
              }
            }

            // Build even grid
            let occupied = {};
            for (let pt of rawPoints) {
              let gx = p.round(pt.x / dotSpacing);
              let gy = p.round(pt.y / dotSpacing);
              let key = gx + "," + gy;
              if (!occupied[key]) {
                occupied[key] = true;
                targetPoints.push(p.createVector(gx * dotSpacing, gy * dotSpacing, pt.z));
              }
            }

            // Create particles
            for (let i = 0; i < targetPoints.length; i++) {
              particles.push(new Particle(targetPoints[i]));
            }
            createdParticles = true;
          };

          p.draw = function() {
            p.clear();
            p.translate(0, -20, 0);
            p.scale(1.1);

            if (createdParticles) {
              for (let particle of particles) {
                particle.update();
                particle.display();
              }
            }
          };

          class Particle {
            constructor(target) {
              this.target = target.copy();
              this.start = p.createVector(
                p.random(-350, 350),
                p.random(-350, 350),
                p.random(-500, 500)
              );
              this.position = this.start.copy();
              this.progress = p.random(-0.25, 0);
              this.speed = p.random(0.004, 0.035);
            }

            update() {
              this.progress = p.min(this.progress + this.speed, 1);
              let t = easeOutCubic(p.constrain(this.progress, 0, 1));
              this.position.x = p.lerp(this.start.x, this.target.x, t);
              this.position.y = p.lerp(this.start.y, this.target.y, t);
              this.position.z = p.lerp(this.start.z, this.target.z, t);
            }

            display() {
              p.push();
              p.translate(this.position.x, this.position.y, this.position.z);
              p.noStroke();
              p.fill(40);
              p.circle(0, 0, dotSize);
              p.pop();
            }
          }

          function easeOutCubic(t) {
            return 1 - p.pow(1 - t, 3);
          }
        };

        p5Instance = new p5(sketch, p5Container);

      } else if (evaluatedMode === '3d') {
        const sketch = (p) => {
          let pts = [];

          p.setup = function() {
            const w = p5Container.clientWidth || 500;
            const h = p5Container.clientHeight || 500;
            p.createCanvas(w, h, p.WEBGL);
            p.pixelDensity(window.devicePixelRatio || 2);
            
            p.strokeWeight(0.9);
            p.noFill();

            // Populate 30,000 points distributed equally among all models
            const NUM_DOTS_PER_MODEL = Math.floor(30000 / models.length);

            for (let model of models) {
              const verts = model.vertices;
              const faces = model.faces;

              let minZ = Infinity, maxZ = -Infinity;
              for (const v of verts) {
                minZ = p.min(minZ, v.z);
                maxZ = p.max(maxZ, v.z);
              }

              for (let i = 0; i < NUM_DOTS_PER_MODEL; i++) {
                let x, y, z;
                if (faces && faces.length > 0) {
                  const face = faces[p.int(p.random(faces.length))];
                  const v0 = verts[face[0]];
                  const v1 = verts[face[1]];
                  const v2 = verts[face[2]];
                  if (!v0 || !v1 || !v2) continue;
                  let r1 = p.random(1);
                  let r2 = p.random(1);
                  if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
                  const r3 = 1 - r1 - r2;
                  x = r1 * v0.x + r2 * v1.x + r3 * v2.x;
                  y = r1 * v0.y + r2 * v1.y + r3 * v2.y;
                  z = r1 * v0.z + r2 * v1.z + r3 * v2.z;
                } else {
                  const v = verts[p.int(p.random(verts.length))];
                  const spread = 5;
                  x = v.x + p.random(-spread, spread);
                  y = v.y + p.random(-spread, spread);
                  z = v.z + p.random(-spread, spread);
                }
                const zNorm = maxZ === minZ ? 0 : (z - minZ) / (maxZ - minZ) * 2 - 1;
                const edgeFactor = p.pow(1 - p.abs(zNorm), 8);
                pts.push({ x, y, z, col: [252, 88, 24], edgeFactor });
              }
            }
          };

          p.draw = function() {
            p.clear();

            const isNeg = document.body.classList.contains('theme-negative');
            const BG = isNeg ? [40, 40, 40] : [234, 234, 234];

            p.rotateY(p.frameCount * 0.02);
            p.scale(1.1);

            p.beginShape(p.POINTS);
            for (const pt of pts) {
              const r = p.lerp(pt.col[0], BG[0], pt.edgeFactor);
              const g = p.lerp(pt.col[1], BG[1], pt.edgeFactor);
              const b = p.lerp(pt.col[2], BG[2], pt.edgeFactor);
              p.stroke(r, g, b);
              p.vertex(pt.x, -pt.y, pt.z);
            }
            p.endShape();
          };
        };

        p5Instance = new p5(sketch, p5Container);
      }
    });
  });
}

function animate(){
  const now=performance.now();
  updateDynamicDimensions();
  // While a question transition is in progress, pause the heavy canvas
  // work entirely so the typewriter and textarea focus on the next stage
  // are not starved by layer animations sharing the main thread.
  if(st.paused){
    requestAnimationFrame(animate);
    return;
  }
  updateLayers(now); updateParticles();
  drawCanvas(now);
  updateAnnotations();
  requestAnimationFrame(animate);
}

function drawScanningCircles(now) {
  if (!ctx2d) return;
  const Zv = Z();
  const { cx, headY, bodyY, foundY, sc } = Zv;
  const elapsed = now - st.scanStart;
  const duration = 2000; // 2 seconds scan
  const progress = Math.min(elapsed / duration, 1);

  // 3 waves of expanding circles
  const waveDuration = 1000; // each wave takes 1 second
  const centers = [
    { x: cx, y: headY },
    { x: cx, y: bodyY },
    { x: cx, y: foundY }
  ];

  ctx2d.save();

  // Draw expanding waves
  for (let wave = 0; wave < 3; wave++) {
    const waveDelay = wave * 400; // delay between waves: 0ms, 400ms, 800ms
    if (elapsed < waveDelay) continue;

    const waveElapsed = elapsed - waveDelay;
    const waveProgress = Math.min(waveElapsed / waveDuration, 1);
    if (waveProgress >= 1) continue;

    // Fade out as it expands
    const opacity = (1 - waveProgress) * 0.75;
    ctx2d.strokeStyle = `rgba(252, 247, 241, ${opacity})`;
    ctx2d.lineWidth = (1.5 - waveProgress * 0.5) * sc;

    // Radius expands from 15px to 120px
    const radius = (15 + waveProgress * 100) * sc;

    centers.forEach(c => {
      ctx2d.beginPath();
      ctx2d.arc(c.x, c.y, radius, 0, Math.PI * 2);
      ctx2d.stroke();
    });
  }

  // Horizontal scanning line sweeping down the pendant
  const lineY = headY - 40 * sc + progress * (foundY - headY + 80 * sc);
  if (progress < 1) {
    ctx2d.strokeStyle = 'rgba(252, 247, 241, 0.45)';
    ctx2d.lineWidth = 0.8 * sc;
    ctx2d.beginPath();
    ctx2d.moveTo(cx - 120 * sc, lineY);
    ctx2d.lineTo(cx + 120 * sc, lineY);
    ctx2d.stroke();
    
    // Subtle glow on the sweep line
    const g = ctx2d.createRadialGradient(cx, lineY, 0, cx, lineY, 80 * sc);
    g.addColorStop(0, 'rgba(252, 247, 241, 0.15)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx2d.fillStyle = g;
    ctx2d.fillRect(cx - 150 * sc, lineY - 15 * sc, 300 * sc, 30 * sc);
  }

  ctx2d.restore();
}

/* ══════════════════════════════════════════
   MAIN DRAW — vertical icon talisman
   chain → crown icon → date marks → body icon
   → gematria tick/ring → element icon → cap ring
══════════════════════════════════════════ */
function drawCanvas(now){
  handleHamsaP5();
  const symbols = getActiveP5Symbols();
  if (symbols.length > 0) {
    return;
  }
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
  // New simplified pendant composition — symbols stack vertically along
  // the sidebar with explicit sizes per stage. Replaces the older
  // per-layer functions (drawCrownIcon/drawBodyIcon/etc.).
  drawNewTalisman(now);
  drawNameDots(now);
  drawParticles();
}

/* ── New talisman composition ──────────────────────────────────────
   Vertical stack of symbols on the orange sidebar. Each question adds
   one motif at a fixed slot. Sizes follow the user spec:
     Q0 origin  → CENTRAL (largest)  — scales down with more countries
     Q1 word    → above central, medium
     Q2 stars   → below central, medium (same as above)
     Q3 personal → another below, medium (same)
     Q4 roots   → above (smaller)
     Q5 name    → name dots (existing drawNameDots) */
function drawNewTalisman(now){
  if(!ctx2d || !LW) return;
  const { cx, sc } = Z();

  // The full stack (top-small + top-med + central + bot-med1 + bot-med2
  // + bot-small) must fit inside LH. We size everything relative to a
  // unit U so the total stack height stays bounded and the symbols don't
  // run off the canvas. Total ≈ (1 + 0.62 + 0.62 + 0.45 + 0.45)·U for
  // centres, plus half a symbol at each end, plus 5 small gaps.
  const minDim = Math.min(LW, LH);
  // Tight stack fitting: 80% of LH for the symbol column, 10% margin
  // top + 10% bottom.
  const columnH = LH * 0.80;
  // Cap base size by canvas width so it never spills sideways either.
  const baseSize = Math.min(LW * 0.55, columnH * 0.30);
  const medSize  = baseSize * 0.62;
  const smallSize = baseSize * 0.45;
  // Compact vertical gap between adjacent symbol centres (small)
  const gap = baseSize * 0.18;

  // Y coordinates — built from the centre outwards so the central
  // symbol always lands at the midpoint of the canvas.
  const yCentral  = LH * 0.5;
  const yTopMed   = yCentral - (baseSize/2 + gap + medSize/2);
  const yTopSmall = yTopMed  - (medSize/2  + gap + smallSize/2);
  const yBotMed1  = yCentral + (baseSize/2 + gap + medSize/2);
  const yBotMed2  = yBotMed1 + (medSize    + gap);
  const yBotSmall = yBotMed2 + (medSize/2  + gap + smallSize/2);

  // ── Q0 origin → CENTRAL symbol(s). Multiple roots = multiple motifs
  // stacked at the centre, each progressively smaller. ───────────────
  const origins = st.selectedOrigins || [];
  if (origins.length > 0) {
    const n = origins.length;
    // Shrink central symbols as more countries are added
    const sizeFactor = Math.pow(0.82, Math.max(0, n - 1));
    const sizePer = baseSize * sizeFactor;
    const spacing = sizePer * 1.08;
    origins.forEach((country, i) => {
      const key = motifForCountry(country);
      const yOff = (i - (n - 1) / 2) * spacing;
      drawShape(key, cx, yCentral + yOff, sizePer, 0, 1, 1, BLUE, Math.max(1, 1.3*sc));
    });
  } else if (st.answers.origin) {
    // Fallback: single origin via free-text
    const h = simpleHash(st.answers.origin);
    const key = ICON_KEYS[h % ICON_KEYS.length];
    drawShape(key, cx, yCentral, baseSize, 0, 1, 1, BLUE, Math.max(1, 1.3*sc));
  }

  // ── Q1 word → above central, medium ──────────────────────────────
  if (st.answers.word || st.answers.symbol) {
    const word = st.answers.word;
    const symbol = st.answers.symbol;
    const key = word ? (WORD_TO_MOTIF[word] || 'circle')
                     : (SYMBOL_TO_ICON[symbol] || 'circle');
    drawShape(key, cx, yTopMed, medSize, 0, 1, 1, BLUE, Math.max(1, 1.1*sc));
  }

  // ── Q2 stars → below central, medium (same size as above) ────────
  const stars = st.answers.stars || [];
  if (stars.length > 0) {
    drawShape(stars[0], cx, yBotMed1, medSize, 0, 1, 1, BLUE, Math.max(1, 1.1*sc));
  }

  // ── Q3 personal → another below, medium (same size) ──────────────
  const personal = (st.answers.personal || '').trim();
  if (personal) {
    const h = simpleHash(personal);
    const key = ICON_KEYS[h % ICON_KEYS.length];
    drawShape(key, cx, yBotMed2, medSize, 0, 1, 1, BLUE, Math.max(1, 1.1*sc));
  }

  // ── Q4 roots → above (smaller than the medium above) ─────────────
  if (st.answers.roots) {
    drawShape(st.answers.roots, cx, yTopSmall, smallSize, 0, 1, 1, BLUE, Math.max(1, 1.0*sc));
  }

  // ── Q5 name → name dots (existing drawNameDots, called from drawCanvas) ──
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
  grad.addColorStop(0,    '#282828');
  grad.addColorStop(0.45, '#282828');
  grad.addColorStop(1,    '#282828');

  ctx2d.lineCap='round'; ctx2d.lineJoin='round';
  ctx2d.strokeStyle=grad; ctx2d.fillStyle=grad;

  // Soft pseudo-depth — fakes the matte volumetric shading of the reference.
  ctx2d.shadowColor='rgba(26,26,26,0.22)';
  ctx2d.shadowBlur=baseLW*0.6;
  ctx2d.shadowOffsetX=1;
  ctx2d.shadowOffsetY=baseLW*0.18;

  // Chain top loop
  ctx2d.lineWidth=baseLW*0.55;
  ctx2d.beginPath(); ctx2d.arc(cx,chainY,14*sc,0,Math.PI*2); ctx2d.stroke();

  // Spine (dashed/with gaps)
  ctx2d.save();
  ctx2d.lineWidth=baseLW*0.42;
  ctx2d.setLineDash([4 * sc, 4 * sc]);
  ctx2d.beginPath(); ctx2d.moveTo(cx,chainY+10*sc); ctx2d.lineTo(cx,tipY); ctx2d.stroke();
  ctx2d.restore();

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
  g.addColorStop(0,   'rgba(26,26,26,0)');
  g.addColorStop(0.5, `rgba(26,26,26,${(0.55*fade).toFixed(3)})`);
  g.addColorStop(1,   'rgba(26,26,26,0)');
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

/* ── Atmosphere — a glow that follows the newest layer.
   (Grid squares removed — the orange sidebar should read as a clean
   solid surface, not a checkerboard.) ── */
function drawAtmosphere(now){
  const {cx,headY,bodyY,foundY}=Z();

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
/* In-place "signature" loop animation per motif. Returns transform +
   reveal overrides that apply ONLY after the entry animation finishes
   (when the symbol has settled at reveal>=0.95). Mid-range pace —
   nothing too fast, nothing too slow — with the eye family slightly
   slower than the rest per spec.

   Categories:
   - eye family            → "wink" on Y axis (scaleX cycles −1 to 1)
   - pure circle            → same Y-axis effect (symmetric, real rotation invisible)
   - wheel/asymmetric       → real rotation
   - geometric (lines)      → continuous redraw via reveal cycling
   - organic                → gentle uniform breathe (scale)
   - vertical breathers     → breathe on Y only
   - star/sun/burst         → small uniform breathe (radial pulse is per-element, separate)
*/
const EYE_KEYS        = new Set(['eye','evil_eye','nazar','yaz']);
const ROTATION_KEYS   = new Set(['spiral','dharmachakra','triskele','yin_yang','rosette','shatkona','sri_yantra']);
const REDRAW_KEYS     = new Set(['triangle','diamond','agadez','vegvisir','pentagram']);
const Y_BREATHE_KEYS  = new Set(['crescent','tyet']);
const ORGANIC_KEYS    = new Set(['flower','lotus','pomegranate','om','anah','hamsa','scarab','meti','tyet']);
const TWO_PI = Math.PI * 2;

function getMotifLoop(key, now){
  const t = now / 1000;
  if(EYE_KEYS.has(key)){
    const period = 17;                       // slow, per spec
    const scaleX = Math.cos(t * TWO_PI / period);
    return { scaleX, scaleY: 1, rotation: 0, revealOverride: null, removePupil: true };
  }
  if(key === 'circle'){
    const period = 14;
    const scaleX = Math.cos(t * TWO_PI / period);
    return { scaleX, scaleY: 1, rotation: 0, revealOverride: null, removePupil: false };
  }
  if(ROTATION_KEYS.has(key)){
    const period = key === 'sri_yantra' ? 18 : 13;
    return { scaleX: 1, scaleY: 1, rotation: (t * TWO_PI / period), revealOverride: null, removePupil: false };
  }
  if(REDRAW_KEYS.has(key)){
    const period = 6;
    const cyclePos = (t % period) / period;
    let revealOverride;
    if(cyclePos < 0.70) revealOverride = cyclePos / 0.70;                 // wipe in
    else                revealOverride = 1 - (cyclePos - 0.70) / 0.30;    // wipe out
    revealOverride = Math.max(0.05, revealOverride);                       // never fully invisible
    return { scaleX: 1, scaleY: 1, rotation: 0, revealOverride, removePupil: false };
  }
  if(Y_BREATHE_KEYS.has(key)){
    const period = 6;
    const s = 1 + 0.035 * Math.sin(t * TWO_PI / period);
    return { scaleX: 1, scaleY: s, rotation: 0, revealOverride: null, removePupil: false };
  }
  if(ORGANIC_KEYS.has(key) || key === 'star' || key === 'sun'){
    const period = 5.5;
    const s = 1 + 0.030 * Math.sin(t * TWO_PI / period);
    return { scaleX: s, scaleY: s, rotation: 0, revealOverride: null, removePupil: false };
  }
  // Fallback: a barely-there breathe so nothing is fully static
  const period = 7;
  const s = 1 + 0.020 * Math.sin(t * TWO_PI / period);
  return { scaleX: s, scaleY: s, rotation: 0, revealOverride: null, removePupil: false };
}

function drawShape(key,x,y,size,rotation,reveal,alpha,color,lw){
  const gen=SHAPES[key]||SHAPES.circle;
  let segments = gen(size);
  let effectiveReveal = reveal;

  ctx2d.save();
  ctx2d.globalAlpha=alpha;
  ctx2d.translate(x,y);

  // Apply the loop animation only after the entry animation settles.
  if(reveal >= 0.95){
    const anim = getMotifLoop(key, performance.now());
    if(anim.rotation) ctx2d.rotate(anim.rotation);
    if(anim.scaleX !== 1 || anim.scaleY !== 1) ctx2d.scale(anim.scaleX, anim.scaleY);
    if(anim.revealOverride !== null) effectiveReveal = anim.revealOverride;
    // Eye family: third segment is the inner pupil/iris — drop it during loop.
    if(anim.removePupil && segments.length > 2) segments = segments.slice(0, 2);
  }

  if(rotation) ctx2d.rotate(rotation);
  ctx2d.strokeStyle=color||BLUE;
  ctx2d.lineWidth=lw||Math.max(1,1.2*sc);
  ctx2d.lineCap='round'; ctx2d.lineJoin='round';
  strokeProgressive(ctx2d,segments,effectiveReveal);
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
  // Roots-paths game uses layer 5 too — if the user reached a sink, render
  // its symbol on the pendant (foundation slot) instead of the zodiac dots.
  if(st.answers.roots){
    const {cx,foundY,elemD,sc}=Z();
    const fresh=isNew(5);
    const scaleIn=p<0.6?easeOut(p/0.6):1;
    if(fresh) drawGlow(cx,foundY,elemD*0.95,ORANGE_RGB,0.30*Math.sin(rawP(5)*Math.PI));
    drawShape(st.answers.roots,cx,foundY,elemD*0.95*scaleIn,0,rawP(5),p,fresh?ORANGE:BLUE,Math.max(1,1.3*sc));
    return;
  }
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

/* ══════════════════════════════════════════════════════════════
   ROOTS TREE QUESTION
   15 tangled nodes, each carrying a symbol from ICON_KEYS.
   The user long-presses one node, drags along the root-edge
   network, and releases over another node. The symbol of the
   exit node is added to the pendant (st.answers.roots) and
   layer 5 fires (spawnBurst gives visual feedback).
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   PATHS GAME (replaces roots-tree)
   ──────────────────────────────────────────────────────────────
   A non-crossing planar DAG generated frontier-style: one source
   on the left grows organically (branching + occasional merges)
   into ~13 sinks. Y-bands are preserved across the recursion so
   no two edges ever cross visually. Each edge renders as two
   parallel thin lines (outer dark stroke + inner cream stroke).

   The tracer is small (r=3) and constrained: at every pointer-
   move it can only step to a sample within MOVE_RADIUS of its
   current position. Straying off the corridor → reset to source.
   Reaching a sink → reveal that sink's pre-assigned symbol
   (hidden until reached) and add it to the pendant via layer 5.
   ══════════════════════════════════════════════════════════════ */

const PATHS_SYMBOL_POOL = [
  'yaz', 'meti', 'nazar', 'rosette', 'tyet', 'agadez', 'shatkona', 'triskele', 'spiral', 'om', 'evil_eye',
  'vegvisir', 'dharmachakra', 'pentagram', 'scarab', 'lotus', 'pomegranate', 'sun', 'sri_yantra', 'yin_yang',
  'eye', 'hamsa', 'crescent', 'diamond', 'triangle', 'circle', 'star', 'anah'
];

/* Helper for the paths-game reveal panel. Uses the SYMBOL_INFO map
   defined earlier in this file (line ~509) which has full coverage. */
function getSymbolInfo(key){
  return SYMBOL_INFO[key] || { name: key, tradition: '—', meaning: '—' };
}

function buildPathsGame(host, onSelect){
  if(!host) return;

  // ───── Geometry constants ─────
  // The viewBox aspect is matched to the ACTUAL panel size so the network fills
  // the whole board — no empty gutters left or right. Height is the reference
  // dimension; width follows the panel's aspect ratio.
  const hostRect = host.getBoundingClientRect();
  const H = 720;
  const aspect = (hostRect.width > 60 && hostRect.height > 60) ? (hostRect.width / hostRect.height) : 1.9;
  const W = Math.round(H * aspect);
  const MARGIN_X = Math.round(W * 0.035), MARGIN_Y = 18;
  const X_MIN = MARGIN_X, X_MAX = W - MARGIN_X;
  const Y_MIN = MARGIN_Y, Y_MAX = H - MARGIN_Y;
  const TARGET_SINKS = 30;   /* enough branches to feel rich, few enough to stay clean */
  /* x where the maze stops branching and the convergence funnel begins.
     Everything left of this (post-flip) is the gradual gathering zone;
     everything right of it is the twisty network. Funnel ≈ 15% of the width. */
  const MAZE_X = Math.round(X_MAX - W * 0.15);

  const OUTER_W = 7;
  const INNER_W = 4.5;
  const HIT_TOLERANCE = 85;                 // Very generous hit tolerance (~85px) so dragging doesn't reset on slight mouse offsets
  const MOVE_RADIUS = 75;                   // Larger step radius (~75px) so fast dragging is captured smoothly
  const LONG_PRESS_MS = 260;

  // ───── Node + edge primitives ─────
  const nodes = [];
  const edges = [];
  let nextId = 0;
  function mkNode(x, y, y0, y1){
    const n = {
      id: nextId++,
      x, y,
      y0, y1,           // permitted vertical band (used to prevent crossings)
      isSource:false, isSink:false,
      edgesOut:[], edgesIn:[],
    };
    nodes.push(n);
    return n;
  }
  // A single straight grid step (horizontal OR vertical) between two adjacent
  // grid nodes. Corners are SHARP: they form where a horizontal edge meets a
  // vertical edge at a shared node. Sampled to an even polyline that drives both
  // the dotted render and the path-locked tracer.
  function resampleRoute(pts, step){
    const cum = [0];
    for(let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const total = cum[cum.length - 1] || 1;
    const n = Math.max(2, Math.round(total / step));
    const out = [];
    let seg = 0;
    for(let k = 0; k <= n; k++){
      const target = total * (k / n);
      while(seg < pts.length - 2 && cum[seg + 1] < target) seg++;
      const segLen = (cum[seg + 1] - cum[seg]) || 1;
      const f = (target - cum[seg]) / segLen;
      out.push({ x: pts[seg].x + (pts[seg + 1].x - pts[seg].x) * f, y: pts[seg].y + (pts[seg + 1].y - pts[seg].y) * f, t: k / n });
    }
    return out;
  }
  function mkEdge(from, to, type){
    const samples = resampleRoute([{ x: from.x, y: from.y }, { x: to.x, y: to.y }], 13);
    let d = `M${samples[0].x.toFixed(1)} ${samples[0].y.toFixed(1)}`;
    for(let i = 1; i < samples.length; i++) d += ` L${samples[i].x.toFixed(1)} ${samples[i].y.toFixed(1)}`;
    const e = { id: edges.length, from, to, samples, d, type: type || 'side' };
    edges.push(e);
    from.edgesOut.push(e);
    to.edgesIn.push(e);
    return e;
  }

  // ───── Winding orthogonal maze (matches the reference) ─────
  // A dense grid of NY rows × NX columns. We carve a winding maze on it with a
  // randomised depth-first walk, then BRAID it (add back some skipped edges) so
  // the corridors wind AND meet at junctions with loops — the dense, irregular
  // weave of the reference. Every segment is a deduped UNIT edge (no overlaps),
  // corners are sharp, and the whole thing is one connected system.
  const NY = 14, NX = 26;
  const gx = c => X_MIN + (X_MAX - X_MIN) * (c / (NX - 1));
  const gy = r => Y_MIN + (Y_MAX - Y_MIN) * (r / (NY - 1));
  const MID = (NY - 1) >> 1;

  const nodeAt = {};
  const getNode = (c, r) => {
    const k = c + ',' + r;
    return nodeAt[k] || (nodeAt[k] = mkNode(gx(c), gy(r), Y_MIN, Y_MAX));
  };
  const edgeAt = {};                                     // dedupe: one segment ⇒ one edge
  const unitEdge = (c1, r1, c2, r2) => {
    const a = c1 + ',' + r1, b = c2 + ',' + r2;
    const k = a < b ? a + '|' + b : b + '|' + a;
    return edgeAt[k] || (edgeAt[k] = mkEdge(getNode(c1, r1), getNode(c2, r2), 'primary'));
  };

  // 1) Randomised depth-first carve — winding corridors that visit every cell.
  const seen = new Uint8Array(NX * NY);
  const idx = (c, r) => c * NY + r;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const stack = [[0, MID]]; seen[idx(0, MID)] = 1;
  while(stack.length){
    const [c, r] = stack[stack.length - 1];
    const nb = [];
    for(const [dc, dr] of DIRS){ const nc = c + dc, nr = r + dr; if(nc >= 0 && nc < NX && nr >= 0 && nr < NY && !seen[idx(nc, nr)]) nb.push([nc, nr]); }
    if(!nb.length){ stack.pop(); continue; }
    const [nc, nr] = nb[(Math.random() * nb.length) | 0];
    unitEdge(c, r, nc, nr); seen[idx(nc, nr)] = 1; stack.push([nc, nr]);
  }
  // 2) Braid — add back some skipped edges so corridors meet in loops/junctions.
  for(let c = 0; c < NX; c++) for(let r = 0; r < NY; r++){
    if(c + 1 < NX && Math.random() < 0.2) unitEdge(c, r, c + 1, r);
    if(r + 1 < NY && Math.random() < 0.2) unitEdge(c, r, c, r + 1);
  }
  // clean horizontal lead-in at the entry and exit
  unitEdge(0, MID, 1, MID);
  unitEdge(NX - 1, MID, NX - 2, MID);

  const source = getNode(0, MID); source.isSource = true;
  const exitNode = getNode(NX - 1, MID); exitNode.isSink = true;
  const sinks = [exitNode];
  exitNode.symbol = PATHS_SYMBOL_POOL[Math.floor(Math.random() * PATHS_SYMBOL_POOL.length)];
  // ONE clean straight corridor along the MID row from entry to exit. Built via
  // unitEdge so any segment the maze already carved there is REUSED (deduped) —
  // no overlapping/doubled dots, and the tracer passes cleanly.
  for (let c = 0; c < NX - 1; c++) unitEdge(c, MID, c + 1, MID);
  nodes.forEach(n => { n.isJunction = false; });        // no prominent junction dots

  // Flip horizontally so the ENTRY (source) is on the RIGHT and the EXIT on the
  // LEFT — right-to-left, matching the Hebrew interface. Coordinates and edge
  // paths are mirrored together, so the tracer keeps working unchanged.
  nodes.forEach(n => { n.x = W - n.x; });
  edges.forEach(e => {
    for(const s of e.samples) s.x = W - s.x;
    let pd = `M${e.samples[0].x.toFixed(1)} ${e.samples[0].y.toFixed(1)}`;
    for(let i=1;i<e.samples.length;i++) pd += ` L${e.samples[i].x.toFixed(1)} ${e.samples[i].y.toFixed(1)}`;
    e.d = pd;
  });

  // ───── Render: one dark DOTTED centreline per edge (rounded corners come from
  //       the sampled arcs). ─────
  let svgInner = '';
  edges.forEach(e => { svgInner += `<path class="paths-rail" d="${e.d}"/>`; });
  svgInner += `<path class="paths-ink-trail" d=""/>`;
  svgInner += `<g class="paths-source-group" style="cursor: pointer;">`;
  svgInner += `<circle class="paths-source" cx="${source.x.toFixed(1)}" cy="${source.y.toFixed(1)}" r="3"/>`;
  svgInner += `<circle class="paths-source-hit" cx="${source.x.toFixed(1)}" cy="${source.y.toFixed(1)}" r="32" fill="transparent" pointer-events="all"/>`;
  svgInner += `</g>`;
  // Exit — a single clearly-marked destination (pulsing ring + centre dot) the
  // user traces toward. There is only one, so it reads as "the goal".
  sinks.forEach(s => {
    svgInner += `<g class="paths-exit" data-sink-id="${s.id}">`;
    svgInner += `<circle class="paths-exit-ring" cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="11.5"/>`;
    svgInner += `<circle class="paths-sink" data-sink-id="${s.id}" cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="3.4"/>`;
    svgInner += `</g>`;
  });
  // Reveal slot — fades in the symbol at the sink the user lands on.
  svgInner += `<g class="paths-reveal" style="opacity:0"></g>`;
  // Tracer — small precise dot.
  svgInner += `<circle class="paths-tracer" cx="${source.x.toFixed(1)}" cy="${source.y.toFixed(1)}" r="6" style="opacity:1"/>`;

  host.innerHTML = `
    <svg class="paths-game-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      ${svgInner}
    </svg>
  `;

  const svg = host.querySelector('.paths-game-svg');
  const tracer = svg.querySelector('.paths-tracer');
  const trailPath = svg.querySelector('.paths-ink-trail');
  const reveal = svg.querySelector('.paths-reveal');
  const sourceEl = svg.querySelector('.paths-source');
  const sourceHit = svg.querySelector('.paths-source-hit');

  // ───── Tracer state ─────
  // Position is anchored to a specific (edge, t) point on the network.
  // We never store free coordinates — the dot literally cannot leave a path.
  const state = {
    phase: 'idle',                  // idle | pressing | tracing | completed | returning
    pressTimer: null,
    edge: null,                     // current edge tracer is on (null while at source)
    idx: 0,                          // sample index along the current edge
    fidx: 0,                         // float sample position (bead-on-wire projection)
    t: 0,                            // parameter along current edge (0..1)
    pos: { x: source.x, y: source.y },
    trailPoints: [{ x: source.x, y: source.y }],
  };

  function svgPoint(e){
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function setTracerPos(x, y){
    state.pos.x = x; state.pos.y = y;
    tracer.setAttribute('cx', x.toFixed(1));
    tracer.setAttribute('cy', y.toFixed(1));
  }
  function updateTrailSvg(){
    if(state.trailPoints.length === 0){
      trailPath.setAttribute('d', '');
      return;
    }
    let d = `M${state.trailPoints[0].x.toFixed(1)} ${state.trailPoints[0].y.toFixed(1)}`;
    for(let i=1; i<state.trailPoints.length; i++){
      d += ` L${state.trailPoints[i].x.toFixed(1)} ${state.trailPoints[i].y.toFixed(1)}`;
    }
    trailPath.setAttribute('d', d);
  }
  function clearTrail(){
    state.trailPoints = [{ x: source.x, y: source.y }];
    updateTrailSvg();
    while(reveal.firstChild) reveal.removeChild(reveal.firstChild);
    reveal.style.opacity = '0';
  }
  function resetToSource(){
    state.phase = 'idle';
    state.edge = null;
    state.idx = 0;
    state.fidx = 0;
    state.t = 0;
    setTracerPos(source.x, source.y);
    tracer.style.opacity = '1';
    clearTrail();
    sourceEl.classList.remove('active','pressing');
    svg.classList.remove('tracing');
    if(state.pressTimer){ clearTimeout(state.pressTimer); state.pressTimer = null; }
  }
  function startTracing(){
    state.phase = 'tracing';
    if(state.edge === null){
      state.idx = 0;
      state.fidx = 0;
      state.t = 0;
      setTracerPos(source.x, source.y);
    }
    tracer.style.opacity = '1';
    sourceEl.classList.add('active');
    svg.classList.add('tracing');
    // Retire the cream start dot for good — from here on the gold tracer is the
    // only mark at the entry, so it never re-appears behind it on release.
    svg.classList.add('paths-began');
  }
  function stopTracing(){
    state.phase = 'idle';
    sourceEl.classList.remove('active');
    svg.classList.remove('tracing');
  }

  // ───── Path-locked Tracer Update (index-based walk) ─────
  // The tracer's position is ALWAYS a real sample on some edge, identified by
  // (edge, idx). Each move it walks the polyline ONE sample at a time toward the
  // pointer, hopping to a connected edge only at a shared node. Because it never
  // teleports across a gap — it steps through every intermediate sample — the
  // dot and its ink-trail follow the exact curve of the road: they can never
  // chord across a bend or slip onto an unconnected lane.

  // Every sample the tracer can reach from (edge, idx) in ONE micro-step: the
  // neighbouring samples on the same edge, plus (at an endpoint) the first step
  // into every edge meeting at that node.
  function microNeighbours(edge, idx){
    const out = [];
    if(edge === null){ // sitting on the source node
      source.edgesOut.forEach(e => out.push({ edge: e, idx: 1 }));
      return out;
    }
    const last = edge.samples.length - 1;
    if(idx < last) out.push({ edge, idx: idx + 1 });
    if(idx > 0)    out.push({ edge, idx: idx - 1 });
    if(idx === last){ // at edge.to node — branch into anything meeting there
      edge.to.edgesOut.forEach(e => { if(e !== edge) out.push({ edge: e, idx: 1 }); });
      edge.to.edgesIn.forEach(e  => { if(e !== edge) out.push({ edge: e, idx: e.samples.length - 2 }); });
    }
    if(idx === 0){ // at edge.from node
      edge.from.edgesIn.forEach(e  => { if(e !== edge) out.push({ edge: e, idx: e.samples.length - 2 }); });
      edge.from.edgesOut.forEach(e => { if(e !== edge) out.push({ edge: e, idx: 1 }); });
      if(edge.from.isSource) out.push({ edge: null, idx: 0, pos: source }); // allow returning to source
    }
    return out;
  }

  // Push a sample onto the trail, retracting when the walk reverses over the
  // point it just came from (so back-tracking cleanly rewinds the ink line).
  function pushTrail(x, y){
    const n = state.trailPoints.length;
    if(n >= 2 && Math.hypot(state.trailPoints[n - 2].x - x, state.trailPoints[n - 2].y - y) < 0.5){
      state.trailPoints.pop();
    } else {
      const lastPt = state.trailPoints[n - 1];
      if(!lastPt || Math.hypot(lastPt.x - x, lastPt.y - y) > 0.5){
        state.trailPoints.push({ x, y });
      }
    }
  }

  // ───── Bead-on-wire control ─────
  // The dot follows ONLY the edge it is currently on — it is the projection of the
  // cursor onto THAT one line (a bead sliding on a wire). It ignores every other
  // lane, so it can never be "sucked" onto a nearby line the user didn't choose.
  // A branch is taken ONLY at a junction node, and ONLY toward the branch the
  // cursor is actually pointing at — so the route is entirely the user's choice.
  const MAX_IDX_STEP = 26;   // most samples the bead can slide per move (speed cap, prevents teleport)

  // Nearest point on an edge's polyline to (mx,my): returns a float sample index.
  function projectOnEdge(edge, mx, my){
    const S = edge.samples;
    let best = { idx: 0, d: Infinity, x: S[0].x, y: S[0].y };
    for(let i = 0; i < S.length - 1; i++){
      const ax = S[i].x, ay = S[i].y, dx = S[i+1].x - ax, dy = S[i+1].y - ay;
      const len2 = dx*dx + dy*dy || 1e-6;
      let t = ((mx - ax)*dx + (my - ay)*dy) / len2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + dx*t, py = ay + dy*t, d = Math.hypot(px - mx, py - my);
      if(d < best.d) best = { idx: i + t, d, x: px, y: py };
    }
    return best;
  }
  function posAt(edge, fidx){
    const S = edge.samples, i = Math.floor(fidx), f = fidx - i;
    if(i >= S.length - 1) return { x: S[S.length-1].x, y: S[S.length-1].y };
    if(i < 0) return { x: S[0].x, y: S[0].y };
    return { x: S[i].x + (S[i+1].x - S[i].x)*f, y: S[i].y + (S[i+1].y - S[i].y)*f };
  }
  // Slide the bead along the CURRENT edge to `toIdx`, laying trail through every
  // sample crossed so both dot and trail stay exactly on the curve.
  function glideTo(edge, toIdx){
    const S = edge.samples;
    let i = Math.round(state.fidx);
    const dstI = Math.round(toIdx);
    while(i < dstI){ i++; pushTrail(S[i].x, S[i].y); }
    while(i > dstI){ i--; pushTrail(S[i].x, S[i].y); }
    const p = posAt(edge, toIdx);
    state.fidx = toIdx; setTracerPos(p.x, p.y); pushTrail(p.x, p.y);
  }

  function updateTracer(mx, my){
    // Starting from the source node: commit to the source-edge the cursor points
    // most toward (the bead then slides onto it).
    if(state.edge === null){
      let bestE = null, bd = Infinity;
      for(const e of source.edgesOut){ const pr = projectOnEdge(e, mx, my); if(pr.d < bd){ bd = pr.d; bestE = e; } }
      const dSource = Math.hypot(source.x - mx, source.y - my);
      if(!bestE || bd >= dSource - 0.5){ updateTrailSvg(); return 'TRACING'; }  // still pointing at the source → wait
      state.edge = bestE; state.fidx = 0;
    }

    let guard = 0;
    while(guard++ < 6){
      const S = state.edge.samples, last = S.length - 1;
      const proj = projectOnEdge(state.edge, mx, my);
      // clamp the slide so the bead never teleports on a fast jump
      let target = proj.idx;
      if(target - state.fidx >  MAX_IDX_STEP) target = state.fidx + MAX_IDX_STEP;
      if(target - state.fidx < -MAX_IDX_STEP) target = state.fidx - MAX_IDX_STEP;

      const atEnd   = proj.idx >= last - 0.001 && target >= last - 0.001;
      const atStart = proj.idx <= 0.001      && target <= 0.001;

      if(atEnd || atStart){
        const node    = atEnd ? state.edge.to : state.edge.from;
        const nodePos = atEnd ? S[last] : S[0];
        glideTo(state.edge, atEnd ? last : 0);         // settle exactly on the junction

        if(node.isSink){                                // reached the exit
          state.phase = 'completed'; updateTrailSvg();
          return { type: 'SINK', sink: node };
        }
        // ── The branch is the USER's choice: GREEDY PURSUIT ──
        // Step onto whichever branch's next node sits closest to the cursor, and
        // only when that node is genuinely closer than staying put. The bead
        // simply chases where the finger points — drag up and it climbs, drag
        // down and it descends, hold still and it stops. It never advances on
        // its own and never picks a route for you.
        // The branch is the USER's: take the one the cursor is actually OVER —
        // the branch whose line passes nearest the finger — and only when that is
        // nearer than staying on the node. So the dot follows wherever the finger
        // traces the path, and holds still when the finger sits on the junction.
        let bestE = null, bd = Infinity, enterIdx = 0;
        for(const e of [...node.edgesOut, ...node.edgesIn]){
          if(e === state.edge) continue;                        // don't bounce back the way we came
          const pr = projectOnEdge(e, mx, my);
          if(pr.d < bd){ bd = pr.d; bestE = e; enterIdx = (node === e.from) ? 0 : e.samples.length - 1; }
        }
        const nodeDist = Math.hypot(nodePos.x - mx, nodePos.y - my);
        if(bestE && bd < nodeDist - 0.5){
          state.edge = bestE; state.fidx = enterIdx;
          continue;                                             // re-project on the chosen branch
        }
        break;                                                  // finger on the junction — hold
      }

      glideTo(state.edge, target);
      break;
    }
    updateTrailSvg();
    return 'TRACING';
  }

  // Reveal the symbol at the arrived sink. The sink itself gets a subtle
  // highlight; the actual annotation (name / tradition / meaning) appears
  // as quiet text in the hint area below the network — not as a popup.
  function revealAtSink(sink){
    const sinkEl = svg.querySelector(`[data-sink-id="${sink.id}"]`);
    if(sinkEl) sinkEl.classList.add('revealed');
    setTracerPos(sink.x, sink.y);
    // The chosen symbol's name / tradition / meaning is now presented by the
    // centred symbol window (symbol-window.js), not as inline hint text here.
    setTimeout(() => { onSelect && onSelect(sink.symbol); }, 1400);
  }

  // ───── Pointer events ─────
  const GRAB_RADIUS = 140;   // generous, so a paused trace is easy to pick up again
  svg.addEventListener('pointerdown', (e) => {
    if(state.phase === 'completed') return;
    const pt = svgPoint(e);
    // You can only GRAB the existing dot where it currently sits and keep tracing
    // from there — pressing elsewhere does nothing, so no second/parallel path can
    // be started. The radius is generous so re-grabbing after a pause is easy.
    if(Math.hypot(pt.x - state.pos.x, pt.y - state.pos.y) > GRAB_RADIUS) return;
    e.preventDefault();
    startTracing();
    updateTracer(pt.x, pt.y);   // snap the dot to where you pressed (on the line)
    try { svg.setPointerCapture(e.pointerId); } catch(_) {}
  });
  svg.addEventListener('pointermove', (e) => {
    if(state.phase !== 'tracing') return;
    e.preventDefault();
    const pt = svgPoint(e);
    const r = updateTracer(pt.x, pt.y);
    if(r === 'EXIT') {
      stopTracing();
      try { svg.releasePointerCapture(e.pointerId); } catch(_) {}
    }
    else if(typeof r === 'object' && r.type === 'SINK') {
      revealAtSink(r.sink);
      try { svg.releasePointerCapture(e.pointerId); } catch(_) {}
    }
  });
  svg.addEventListener('pointerup', (e) => {
    if(state.phase === 'completed') return;
    if(state.phase === 'tracing') {
      e.preventDefault();
      stopTracing();
      try { svg.releasePointerCapture(e.pointerId); } catch(_) {}
    }
  });
  svg.addEventListener('pointercancel', (e) => {
    if(state.phase === 'completed') return;
    e.preventDefault();
    stopTracing();
    try { svg.releasePointerCapture(e.pointerId); } catch(_) {}
  });
}

export function updateV5StepProgress(stageNum) {
  const currentStep = (stageNum !== undefined) ? stageNum : (st.current || 0);
  
  const capsules = document.querySelectorAll('.q-capsule');
  capsules.forEach((c, idx) => {
    c.classList.toggle('is-active', idx === currentStep);
  });
  
  const progressCurrent = document.querySelector('.q-header-progress-val .q-hp-current');
  if (progressCurrent) {
    progressCurrent.textContent = String(currentStep + 1).padStart(2, '0');
  }

  // Left progress rail — highlight the current step dot.
  const railDots = document.querySelectorAll('#step-rail li');
  railDots.forEach((d, i) => d.classList.toggle('is-current', i === currentStep));
}
