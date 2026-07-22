/* questionnaire.js — Identity Forging v6 — Icon Talisman */
import { initRootsWidget } from './roots.js';
import { mountArtifact3D, unmountArtifact3D, assetsReady } from './artifact3d.js';
import { attachKeyboardTo, detachKeyboard } from './virtual-keyboard.js';

let BLUE   = '#6b4938';
const ORANGE = '#6b4938';
let BLUE_RGB   = '107,73,56';
const ORANGE_RGB = '107,73,56';
const BG     = '#fffae6';
const LAYER_DUR = 1200;

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
  'מרוקו':'yaz', 'אלג׳יריה':'yaz', 'תוניסיה':'nazar', 'לוב':'nazar',
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

const QUESTIONS = [
  { id:'origin',    label:'ארץ מוצא',   text:'איפה הסיפור שלך\nמתחיל?',     type:'geo' },
  { id:'word',      label:'מילה',       text:'איזו מילה\nתפסה לך את העין?',  type:'words' },
  { id:'stars',     label:'כוכבים',     text:'בחר כוכב אחד',                 type:'stars' },
  { id:'personal',  label:'מילה אישית', text:'איזו מילה\nתרצה לשאת איתך?',   type:'text',   placeholder:'מילה אחת...' },
  { id:'roots',     label:'שורשים',     text:'מהו המסלול\nשלך?', type:'roots-tree' },
  { id:'name',      label:'שם',         text:'איך קוראים לך?',               type:'text',   placeholder:'כתבי את שמך...' },
];

/* Maps each question id to its fixed pendant layer (drawing/animation slot),
   independent of question order in the array above. */
const LAYER_BY_ID = { name:1, word:2, symbol:2, stars:3, birthdate:3, origin:4, zodiac:5, element:6, personal:7, roots:5 };
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

  // Contrast theme toggle initialization
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isNegative = document.body.classList.toggle('theme-negative');
      if (isNegative) {
        BLUE = '#fffae6';
        BLUE_RGB = '255,250,230';
      } else {
        BLUE = '#6b4938';
        BLUE_RGB = '107,73,56';
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

function updateAnnotations(forceRebuild = false) {
  const container = document.getElementById('artifact-annotations');
  if (!container) return;

  const active = getActiveSymbols();
  
  const currentIds = Array.from(container.children).map(el => el.dataset.id);
  const activeIds = active.map(item => item.id);
  
  const needsRebuild = forceRebuild || 
    currentIds.length !== activeIds.length || 
    !activeIds.every(id => currentIds.includes(id));

  if (needsRebuild) {
    container.innerHTML = '';
    const positioned = computeVerticalPositions(active);
    positioned.forEach(({ item, y }, idx) => {
      const info = SYMBOL_INFO[item.key] || SYMBOL_INFO.circle;
      const block = document.createElement('div');
      const sideClass = idx % 2 === 0 ? 'side-right' : 'side-left';
      block.className = `symbol-annotation ${sideClass}`;
      block.dataset.id = item.id;
      block.style.top = `${y}px`;
      
      block.innerHTML = `
        <button class="annotation-toggle" type="button" aria-label="הצג פרטי סמל">
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <polyline points="4,2 8,6 4,10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="annotation-body">
          <div class="annotation-row">
            <span class="annotation-label">סמל:</span>
            <span class="annotation-value">${info.name}</span>
          </div>
          <div class="annotation-row">
            <span class="annotation-label">מסורת:</span>
            <span class="annotation-value">${info.tradition}</span>
          </div>
          <div class="annotation-row">
            <span class="annotation-label">משמעות:</span>
            <span class="annotation-value">${info.meaning}</span>
          </div>
        </div>
      `;
      container.appendChild(block);

      const toggle = block.querySelector('.annotation-toggle');
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        block.classList.toggle('is-open');
      });

      if (revealedSymbols.has(item.id)) {
        // Already seen this session — show in collapsed (arrow-only) state
        block.classList.add('revealed', 'is-collapsed');
      } else {
        revealedSymbols.add(item.id);
        // New symbol: brief auto-reveal of full info, then collapse to arrow.
        requestAnimationFrame(() => {
          setTimeout(() => {
            block.classList.add('revealed', 'is-revealing');
          }, 50);
        });
        setTimeout(() => {
          block.classList.remove('is-revealing');
          block.classList.add('is-collapsed');
        }, 3800);
      }
    });
    lastLH = LH;
  } else if (Math.abs(LH - lastLH) > 0.5) {
    const positioned = computeVerticalPositions(active);
    positioned.forEach(({ item, y }) => {
      const block = container.querySelector(`[data-id="${item.id}"]`);
      if (block) {
        block.style.top = `${y}px`;
      }
    });
    lastLH = LH;
  }
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
      host.appendChild(el);
    }
  });
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
             `stroke="rgba(107,73,56,0.55)" stroke-width="1" ` +
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
function _renderQuestionImpl(idx){
  const q=QUESTIONS[idx]; if(!q) return;
  const midContainer = document.getElementById('word-field-container');
  if (midContainer) midContainer.innerHTML = '';
  st.current=idx;
  updateLoadBar();
  document.getElementById('section-3')?.setAttribute('data-stage',idx);
  ensureStageAccents();
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
  qEl.setAttribute('data-q',idx);
  typewriterText(qEl, q.text.replace(/\n/g, ' '));
  const numEl=document.getElementById('q-num-current');
  numEl.classList.remove('count-pop'); void numEl.offsetWidth; numEl.classList.add('count-pop');
  const wrap=document.getElementById('q-input-wrap');
  wrap.className = '';
  detachKeyboard();
  const middleQ = document.getElementById('middle-q-container');
  if (middleQ) {
    middleQ.className = `q-layout-${q.id}`;
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
    const shuffled = [...WORD_POOL];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const numCols = 6;
    const items = shuffled.map((w, i) => {
      const row = Math.floor(i / numCols);
      const col = i % numCols;
      const baseX = 12 + col * 15;
      const baseY = 12 + row * 9;
      const jitterX = (Math.random() - 0.5) * 6;
      const jitterY = (Math.random() - 0.5) * 6;
      const left = baseX + jitterX;
      const top = baseY + jitterY;
      
      const size = 0.8 + Math.random() * 0.7;
      const dur = 8 + Math.random() * 8;
      const delay = -Math.random() * 8;
      
      const animType = (i % 4) + 1;
      // ArbelG-only typography for the floating words; stencil (900) intentionally skipped
      const weights = [400, 500, 700];
      const initialWeight = weights[Math.floor(Math.random() * weights.length)];
      const initialFamily = "'ArbelG', sans-serif";
      const fontStyles = ["normal", "italic"];
      const initialStyle = fontStyles[i % fontStyles.length];
      
      return `<span class="float-word word-anim-${animType}" data-word="${w}" style="left:${left}%;top:${top}%;font-size:${size}rem;font-weight:${initialWeight};font-family:${initialFamily};font-style:${initialStyle};animation-duration:${dur}s;animation-delay:${delay}s">${w}</span>`;
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
    // Virtual Hebrew keyboard — attaches once the country input is mounted
    // (the roots widget shows it lazily on phase change), so retry briefly.
    (function bindCountryKbd(tries){
      const el = document.getElementById('roots-country-input');
      if (el) { attachKeyboardTo(el); return; }
      if (tries > 0) setTimeout(() => bindCountryKbd(tries - 1), 200);
    })(20);
  } else if(q.type==='roots-tree'){
    wrap.innerHTML = '';
    wrap.classList.add('roots-tree-active');
    const midContainer = document.getElementById('word-field-container');
    if(midContainer){
      midContainer.innerHTML = `<div id="paths-game"></div><button class="q-help q-help-floating" type="button" aria-label="עזרה"><span class="q-help-tip">גררו את הנקודה השחורה משמאל, ועקבו אחר המסלולים עד נקודת היציאה</span></button>`;
      buildPathsGame(document.getElementById('paths-game'), (symbolKey) => {
        st.answers.roots = symbolKey;
        triggerLayer(5); spawnBurst();
        setTimeout(() => advance(), 900);
      });
    }
  } else {
    wrap.innerHTML=`<textarea id="q-input" dir="rtl" rows="2"></textarea><button id="q-submit" aria-label="המשך">המשך</button><button class="q-help" type="button" aria-label="עזרה"><span class="q-help-tip">${q.placeholder||''}</span></button>`;
    const inp=document.getElementById('q-input');
    inp.value=st.answers[q.id]||''; setTimeout(()=>inp.focus(),350);
    document.getElementById('q-submit').addEventListener('click',submitAnswer);
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submitAnswer();}});
    // Virtual Hebrew keyboard — ONLY on the name step (not personal/other text steps)
    if(q.id==='name') attachKeyboardTo(inp);
    if(q.id==='name') {
      const midQ = document.getElementById('middle-q-container');
      if (midQ && !document.getElementById('gematria-watermark')) {
        const wat = document.createElement('div');
        wat.id = 'gematria-watermark';
        midQ.appendChild(wat);
      }
      const updateWat = () => {
        const wat = document.getElementById('gematria-watermark');
        if (wat) {
          wat.textContent = st.gematriaValue > 0 ? `+ ${st.gematriaValue}` : '';
        }
      };
      inp.addEventListener('input',()=>{
        st.gematriaValue=calcGematria(inp.value);
        renderDebugPanel();
        updateWat();
      });
      updateWat();
    }
  }
  updateProgressList(idx);
  const pb=document.getElementById('q-prev'); if(pb) pb.style.opacity=idx>0?'1':'0.2';
  const sb=document.getElementById('q-skip');
  if(sb) {
    if (idx === 2) {
      sb.style.opacity = '0';
      sb.style.pointerEvents = 'none';
    } else {
      sb.style.opacity = idx < QUESTIONS.length-1 ? '1' : '0';
      sb.style.pointerEvents = idx < QUESTIONS.length-1 ? 'auto' : 'none';
    }
  }
}

/* Live typewriter — types `text` into `el` one character at a time,
   honoring \n as <br>. Cancels any in-flight typing on the same element
   (so navigating between questions doesn't leave overlapping streams). */
function typewriterText(el, text, charDelay = 80){
  if(!el) return;
  if(el._typeTimer){ clearTimeout(el._typeTimer); el._typeTimer = null; }
  el.innerHTML = '';
  let i = 0;
  const step = () => {
    if(i >= text.length){ el._typeTimer = null; return; }
    const ch = text[i++];
    if(ch === '\n') el.appendChild(document.createElement('br'));
    else el.appendChild(document.createTextNode(ch));
    el._typeTimer = setTimeout(step, charDelay);
  };
  step();
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
  // Pause the canvas animation loop during the transition + the first
  // ~600ms of the next question. This frees up the main thread so the
  // typewriter and textarea focus land cleanly without lag.
  st.paused = true;
  setTimeout(()=>{
    renderQuestion(next); col.classList.remove('q-exit');
    const anim=ENTER_ANIMS[next%ENTER_ANIMS.length]; col.classList.add(anim);
    setTimeout(()=>col.classList.remove(anim),700);
    // Resume canvas drawing after the new question text + input are in.
    setTimeout(()=>{ st.paused = false; }, 600);
  },280);
}
function finishQuestionnaire(){
  // Pendant is complete — show the "סיימתי" invitation rather than auto-advance.
  for(let i=st.current+1;i<8;i++) triggerLayer(i);
  updateLoadBar(STAGE1_LOADBAR_SHARE);
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
  // Reduced from 16 → 6 particles to keep the burst light during transitions
  for(let i=0;i<6;i++){
    const a=Math.random()*Math.PI*2,v=1.5+Math.random()*3.5;
    st.particles.push({x:cx,y:bodyY,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,decay:0.020+Math.random()*0.018,r:1+Math.random()*3,orange:Math.random()>0.5});
  }
}
function updateParticles(){ st.particles=st.particles.filter(p=>p.life>0); st.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=0.92;p.vy*=0.92;p.life-=p.decay;}); }

function animate(){
  const now=performance.now();
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
  // Solid spine + chain top removed — the dashed CSS spine in .q-chrome-side
  // is the only guide line. All symbols below draw dynamically on top of it
  // as the user answers questions.
  drawCrownIcon(now);
  drawStarSymbols(now);
  drawBodyIcon(now);
  drawSideElements(now);
  drawGematriaMark(now);
  drawNameDots(now);
  drawZodiacDots(now);   // layer 5 — renders the roots-paths symbol when chosen
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
  grad.addColorStop(0,    '#6b4938');
  grad.addColorStop(0.45, '#6b4938');
  grad.addColorStop(1,    '#6b4938');

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

/* ── Atmosphere — subtle grid + a glow that follows the newest layer ── */
function drawAtmosphere(now){
  const {cx,headY,bodyY,foundY}=Z();
  // Theme-aware grid color: when the sidebar bg flips to cream
  // (theme-negative), the cream grid would vanish — switch to a faint
  // dark stroke so the squares stay visible on both backgrounds.
  const isNeg = document.body.classList.contains('theme-negative');
  ctx2d.save();
  ctx2d.strokeStyle = isNeg ? 'rgba(252,247,241,0.04)' : 'rgba(26,26,26,0.15)';
  ctx2d.lineWidth = isNeg ? 0.4 : 0.6;
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
  const W = 960, H = 560;
  const MARGIN_X = 36, MARGIN_Y = 24;
  const X_MIN = MARGIN_X, X_MAX = W - MARGIN_X;
  const Y_MIN = MARGIN_Y, Y_MAX = H - MARGIN_Y;
  const TARGET_SINKS = 14;

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
  function sampleBezier(x0,y0,c1x,c1y,c2x,c2y,x1,y1,steps,dx,dy,len){
    const out = [];
    // Gentle single-wave wiggle to give a meandering feel without zig-zagging
    const amp = (Math.random() - 0.5) * 16;
    
    const nx = -dy / len;
    const ny = dx / len;

    for(let i=0;i<=steps;i++){
      const t = i/steps, u = 1-t;
      let px = u*u*u*x0 + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*x1;
      let py = u*u*u*y0 + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*y1;
      
      const envelope = Math.sin(t * Math.PI);
      const wiggle = envelope * envelope * amp;
      px += nx * wiggle;
      py += ny * wiggle;

      out.push({ x: px, y: py, t });
    }
    return out;
  }
  function mkEdge(from, to, type){
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    
    // Calculate starting tangent vector (from incoming parent edge, if any)
    let dir = { x: 1, y: 0 };
    if(from.edgesIn && from.edgesIn.length > 0){
      const parent = from.edgesIn[0];
      const pLast = parent.samples[parent.samples.length - 1];
      const pPrev = parent.samples[parent.samples.length - 2];
      const pdx = pLast.x - pPrev.x;
      const pdy = pLast.y - pPrev.y;
      const plen = Math.hypot(pdx, pdy);
      if(plen > 0.1){
        dir.x = pdx / plen;
        dir.y = pdy / plen;
      }
    }

    // Add organic bending (C-shape bend) perpendicular to the start direction
    const bend = (Math.random() - 0.5) * len * 0.30;
    const normalX = -dir.y;
    const normalY = dir.x;

    const cp1x = from.x + dir.x * len * 0.35 + normalX * bend;
    const cp1y = from.y + dir.y * len * 0.35 + normalY * bend;
    const cp2x = from.x + dir.x * len * 0.65 + normalX * bend * 0.8;
    const cp2y = from.y + dir.y * len * 0.65 + normalY * bend * 0.8;

    const samples = sampleBezier(from.x, from.y, cp1x, cp1y, cp2x, cp2y, to.x, to.y, 24, dx, dy, len);
    
    // Draw using polyline connection to match wiggled samples exactly
    let pathD = `M${samples[0].x.toFixed(1)} ${samples[0].y.toFixed(1)}`;
    for(let i=1;i<samples.length;i++){
      pathD += ` L${samples[i].x.toFixed(1)} ${samples[i].y.toFixed(1)}`;
    }

    const e = {
      id: edges.length, from, to, samples,
      d: pathD,
      type: type || 'side',
    };
    edges.push(e);
    from.edgesOut.push(e);
    to.edgesIn.push(e);
    return e;
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Resolves the hierarchy type of parent paths (highest priority wins)
  function getParentType(node){
    if(node.isSource) return 'primary';
    let highest = 'side';
    for(const e of node.edgesIn){
      if(e.type === 'primary') return 'primary';
      if(e.type === 'secondary') highest = 'secondary';
    }
    return highest;
  }

  // ───── Frontier-based DAG generator ─────
  // Each frontier node owns a [y0..y1] band. Growth keeps each child
  // inside its parent's band → edges never cross. Merges only happen
  // between Y-adjacent frontier nodes, so their unioned band is also
  // a contiguous segment → still no crossings.
  const sourceY = Y_MIN + (Y_MAX - Y_MIN) * 0.5; // Start in the middle
  const source = mkNode(X_MIN, sourceY, Y_MIN, Y_MAX);
  source.isSource = true;

  // Initialize multiple trunks to branch immediately from the start (all primary routes)
  const trunkX = X_MIN + 75 + Math.random() * 25;
  const bandHeight = Y_MAX - Y_MIN;
  const trunk1 = mkNode(trunkX, Y_MIN + bandHeight * 0.22, Y_MIN, Y_MIN + bandHeight * 0.33);
  const trunk2 = mkNode(trunkX, Y_MIN + bandHeight * 0.50, Y_MIN + bandHeight * 0.33, Y_MIN + bandHeight * 0.66);
  const trunk3 = mkNode(trunkX, Y_MIN + bandHeight * 0.78, Y_MIN + bandHeight * 0.66, Y_MAX);

  mkEdge(source, trunk1, 'primary');
  mkEdge(source, trunk2, 'primary');
  mkEdge(source, trunk3, 'primary');

  // Frontier kept sorted by y (top → bottom) so "adjacent" siblings
  // are simply array neighbours and their bands abut.
  let frontier = [trunk1, trunk2, trunk3];
  const MAX_ITER = 300;

  for(let iter = 0; iter < MAX_ITER; iter++){
    // Pick which node to grow — leftmost growable so the wavefront
    // advances evenly across all branches.
    const growable = frontier.filter(n => n.x < X_MAX - 32);
    if(growable.length === 0) break;
    growable.sort((a,b) => a.x - b.x);
    const node = growable[0];
    const fIdx = frontier.indexOf(node);

    // Two phases: while we're growing toward TARGET_SINKS the loop branches
    // aggressively; once the frontier is full, the loop "densifies" by
    // mostly extending forward (1 child) so each branch accumulates many
    // internal junctions before reaching the right edge.
    const isDense = frontier.length >= TARGET_SINKS;

    // Merge chance — moderate to create calm shortcuts. Both nodes must be near enough
    // in x AND have room left to advance.
    const mergeChance = isDense ? 0.35 : 0.20;
    if(Math.random() < mergeChance && fIdx < frontier.length - 1){
      const neighbour = frontier[fIdx + 1];
      const xDiff = Math.abs(node.x - neighbour.x);
      if(xDiff < 90 && Math.max(node.x, neighbour.x) < X_MAX - 100){
        const mergeX = Math.max(node.x, neighbour.x) + 70 + Math.random() * 30;
        const mergeY = (node.y + neighbour.y) / 2 + (Math.random()-0.5)*12;
        const merge = mkNode(mergeX, mergeY, node.y0, node.y1);
        
        // Propagate hierarchy type for merges
        const p1 = getParentType(node);
        const p2 = getParentType(neighbour);
        const mergeType = (p1 === 'primary' || p2 === 'primary') ? 'primary' : ((p1 === 'secondary' || p2 === 'secondary') ? 'secondary' : 'side');

        mkEdge(node, merge, mergeType);
        mkEdge(neighbour, merge, mergeType);
        frontier.splice(fIdx, 2, merge);
        continue;
      }
    }

    // Branch count depends on phase.
    const bandH = node.y1 - node.y0;
    let branchCount;
    if(!isDense){
      // Growing phase — branch occasionally
      const r = Math.random();
      branchCount = r < 0.35 ? 2 : (r < 0.50 ? 3 : 1);
    } else {
      // Densifying phase — split or extend
      const r = Math.random();
      // Never overshoot the sink budget by much
      if(frontier.length >= TARGET_SINKS + 2) branchCount = 1;
      else branchCount = r < 0.70 ? 1 : 2;
    }
    if(branchCount > 1 && bandH < 32) branchCount = 1;
    if(branchCount > 2 && bandH < 64) branchCount = 2;

    // Large advance per iteration → long, flowing curves, clean trails
    const advance = 70 + Math.random() * 30;
    const nextX = Math.min(node.x + advance, X_MAX);

    const children = [];
    const parentType = getParentType(node);
    if(branchCount === 1){
      const jY = (Math.random() - 0.5) * bandH * 0.25;
      const ny = clamp(node.y + jY, node.y0 + 5, node.y1 - 5);
      const c = mkNode(nextX, ny, node.y0, node.y1);
      mkEdge(node, c, parentType);
      children.push(c);
    } else if(branchCount === 2){
      // Split the band and assign hierarchy
      const splitRatio = 0.35 + Math.random() * 0.30;
      const h0 = bandH * splitRatio;
      const ny1 = node.y0 + h0 * 0.5;
      const ny2 = node.y0 + h0 + (bandH - h0) * 0.5;

      const c1 = mkNode(nextX, ny1, node.y0, node.y0 + h0);
      const c2 = mkNode(nextX, ny2, node.y0 + h0, node.y1);

      const t1 = parentType;
      const t2 = parentType === 'primary' ? 'secondary' : 'side';

      mkEdge(node, c1, t1);
      mkEdge(node, c2, t2);
      children.push(c1, c2);
    } else {
      const h = bandH / 3;
      const c1 = mkNode(nextX, node.y0 + h * 0.5, node.y0, node.y0 + h);
      const c2 = mkNode(nextX, node.y0 + h * 1.5, node.y0 + h, node.y0 + h * 2);
      const c3 = mkNode(nextX, node.y0 + h * 2.5, node.y0 + h * 2, node.y1);

      const t1 = parentType;
      const t2 = parentType === 'primary' ? 'secondary' : 'side';
      const t3 = 'side';

      mkEdge(node, c1, t1);
      mkEdge(node, c2, t2);
      mkEdge(node, c3, t3);
      children.push(c1, c2, c3);
    }
    frontier.splice(fIdx, 1, ...children);
  }

  // Any frontier nodes still inside → extend them straight to the right edge
  frontier.forEach(node => {
    let cur = node;
    const parentType = getParentType(cur);
    while(cur.x < X_MAX - 32){
      const jY = (Math.random() - 0.5) * (cur.y1 - cur.y0) * 0.20;
      const ny = clamp(cur.y + jY, cur.y0 + 5, cur.y1 - 5);
      const nx = Math.min(cur.x + 80 + Math.random() * 30, X_MAX);
      const nxt = mkNode(nx, ny, cur.y0, cur.y1);
      mkEdge(cur, nxt, parentType);
      cur = nxt;
    }
    cur.isSink = true;
  });

  // Assign hidden random symbol to each sink (revealed only on arrival).
  const sinks = nodes.filter(n => n.isSink);
  sinks.forEach(s => { s.symbol = PATHS_SYMBOL_POOL[Math.floor(Math.random() * PATHS_SYMBOL_POOL.length)]; });

  // ───── Render ─────
  let svgInner = '';
  // Outer (dark) layer first, then inner (cream) — the difference creates
  // the two-parallel-line "channel" look.
  edges.forEach(e => { svgInner += `<path class="paths-channel-outer" d="${e.d}"/>`; });
  edges.forEach(e => { svgInner += `<path class="paths-channel-inner" d="${e.d}"/>`; });
  svgInner += `<path class="paths-ink-trail" d=""/>`;
  svgInner += `<g class="paths-source-group" style="cursor: pointer;">`;
  svgInner += `<circle class="paths-source" cx="${source.x.toFixed(1)}" cy="${source.y.toFixed(1)}" r="3"/>`;
  svgInner += `<circle class="paths-source-hit" cx="${source.x.toFixed(1)}" cy="${source.y.toFixed(1)}" r="32" fill="transparent" pointer-events="all"/>`;
  svgInner += `</g>`;
  // Sinks: tiny ticks only (no big dots) — the user should not be able to
  // visually count them or anticipate which one they'll hit.
  sinks.forEach(s => {
    svgInner += `<circle class="paths-sink" data-sink-id="${s.id}" cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="2"/>`;
  });
  // Reveal slot — fades in the symbol at the sink the user lands on.
  svgInner += `<g class="paths-reveal" style="opacity:0"></g>`;
  // Tracer — small precise dot.
  svgInner += `<circle class="paths-tracer" cx="${source.x.toFixed(1)}" cy="${source.y.toFixed(1)}" r="2.5" style="opacity:1"/>`;

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
      state.t = 0;
      setTracerPos(source.x, source.y);
    }
    tracer.style.opacity = '1';
    sourceEl.classList.add('active');
    svg.classList.add('tracing');
  }
  function stopTracing(){
    state.phase = 'idle';
    sourceEl.classList.remove('active');
    svg.classList.remove('tracing');
  }

  // ───── Continuity-Constrained Tracer Update ─────
  // Searches all samples in the entire network within 45px of the tracer's current position.
  // Then, selects the candidate closest to the user's cursor.
  // This allows the user to guide the tracer forward or backward along any branch.
  function updateTracer(mx, my){
    const cur = state.pos;
    let best = null, bestDist = Infinity;
    const maxStep = 45; // continuity constraint
    
    for(const edge of edges){
      for(let i = 0; i < edge.samples.length; i++){
        const p = edge.samples[i];
        const dTracer = Math.hypot(p.x - cur.x, p.y - cur.y);
        if(dTracer <= maxStep){
          const dPointer = Math.hypot(p.x - mx, p.y - my);
          if(dPointer < bestDist){
            bestDist = dPointer;
            best = { edge, x: p.x, y: p.y, t: p.t };
          }
        }
      }
    }

    // No best within reach → dot stays exactly where it is (clamp to current
    // valid position, per spec: "do not freeze, do not reset, do not jump").
    if(!best) return 'TRACING';

    // No cutoff — the dot continues to follow the cursor as far as it can
    // along the network. If the cursor is way outside the corridor, the
    // dot simply moves to the nearest reachable point and stays.

    state.edge = best.edge;
    state.t = best.t;
    setTracerPos(best.x, best.y);

    // Add point to trail with backtracking detection
    const lastX = best.x;
    const lastY = best.y;
    const ptIdx = state.trailPoints.findIndex((p, idx) => idx < state.trailPoints.length - 4 && Math.hypot(p.x - lastX, p.y - lastY) < 6);
    if(ptIdx !== -1){
      state.trailPoints = state.trailPoints.slice(0, ptIdx + 1);
    } else {
      const lastPt = state.trailPoints[state.trailPoints.length - 1];
      if(!lastPt || Math.hypot(lastPt.x - lastX, lastPt.y - lastY) > 1.5){
        state.trailPoints.push({ x: lastX, y: lastY });
      }
    }
    updateTrailSvg();

    if(best.t >= 0.95 && best.edge.to.isSink){
      state.phase = 'completed';
      return { type:'SINK', sink: best.edge.to };
    }
    return 'TRACING';
  }

  // Reveal the symbol at the arrived sink. The sink itself gets a subtle
  // highlight; the actual annotation (name / tradition / meaning) appears
  // as quiet text in the hint area below the network — not as a popup.
  function revealAtSink(sink){
    const sinkEl = svg.querySelector(`[data-sink-id="${sink.id}"]`);
    if(sinkEl) sinkEl.classList.add('revealed');
    setTracerPos(sink.x, sink.y);
    const info = getSymbolInfo(sink.symbol);
    const hintEl = host.parentElement
      ? host.parentElement.querySelector('.roots-tree-hint')
      : null;
    if(hintEl){
      hintEl.classList.add('paths-info-shown');
      hintEl.innerHTML = `
        <div class="paths-info-row"><span class="paths-info-label">סמל:</span> <span class="paths-info-value">${info.name}</span></div>
        <div class="paths-info-row"><span class="paths-info-label">מסורת:</span> <span class="paths-info-value">${info.tradition}</span></div>
        <div class="paths-info-row"><span class="paths-info-label">משמעות:</span> <span class="paths-info-value">${info.meaning}</span></div>
      `;
    }
    setTimeout(() => { onSelect && onSelect(sink.symbol); }, 1400);
  }

  // ───── Pointer events ─────
  svg.addEventListener('pointerdown', (e) => {
    if(state.phase === 'completed') return;
    const pt = svgPoint(e);
    const dist = Math.hypot(pt.x - state.pos.x, pt.y - state.pos.y);
    if(dist <= 100){ // generous hit target around the current tracer position
      e.preventDefault();
      startTracing();
      updateTracer(pt.x, pt.y); // snap to pointer immediately on click/press
      try { svg.setPointerCapture(e.pointerId); } catch(_) {}
    }
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
