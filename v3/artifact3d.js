/* artifact3d.js — final artifact presentation.
   Converts every stroke of the generated pendant into real 3D geometry
   (tubes for lines/arcs, spheres for dots) and shades it with a
   pink→orange gradient + soft normal-based volume shading. No realistic
   materials, no PBR, no reflections. */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* Bakes a loaded gltf/glb scene into a single normalized BufferGeometry so
   it can be merged into the same gradient-shaded pendant mesh as the
   procedural tubes. Returns a Promise resolving to {geom, unitMax}. */
function loadAssetGeometry(url){
  return new Promise(resolve=>{
    new GLTFLoader().load(url, gltf=>{
      let merged=null;
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(obj=>{
        if(!obj.isMesh || !obj.geometry) return;
        const g=obj.geometry.clone();
        g.applyMatrix4(obj.matrixWorld);
        // Strip extra attributes; we only need position+normal for the shader.
        Object.keys(g.attributes).forEach(n=>{ if(n!=='position'&&n!=='normal') g.deleteAttribute(n); });
        if(!g.attributes.normal) g.computeVertexNormals();
        merged = merged ? mergeGeometries([merged,g]) : g;
      });
      if(!merged){ resolve({geom:null, unitMax:1}); return; }
      merged.computeBoundingBox();
      const bb=merged.boundingBox;
      // Center on origin so instances translate cleanly.
      const cx=(bb.min.x+bb.max.x)/2, cy=(bb.min.y+bb.max.y)/2, cz=(bb.min.z+bb.max.z)/2;
      merged.translate(-cx,-cy,-cz);
      merged.computeBoundingBox();
      const bb2=merged.boundingBox;
      const unitMax = Math.max(bb2.max.x-bb2.min.x, bb2.max.y-bb2.min.y) || 1;
      resolve({geom: merged, unitMax});
    }, undefined, ()=>resolve({geom:null, unitMax:1})); // resolve on error; we'll fall back.
  });
}

let _anahGeom = null;
let _anahUnitMax = 1;
const _anahReady = loadAssetGeometry('/image/3d/anah.gltf').then(({geom,unitMax})=>{
  _anahGeom = geom; _anahUnitMax = unitMax;
});

// hamsa.glb — the user-approved model. Loaded as a full THREE scene (NOT
// extracted as bare geometry) so its original materials, colors, gradients
// and surface treatment are preserved exactly. The pendant's procedural
// shader is never applied to it: each hamsa motif is instanced as-is.
let _hamsaScene = null;
let _hamsaUnitMax = 1;
const _hamsaReady = loadAssetScene('/image/3d/3d%20symbols/hamsa.glb').then(({scene,unitMax})=>{
  _hamsaScene = scene; _hamsaUnitMax = unitMax;
});
export const assetsReady = Promise.all([_anahReady, _hamsaReady]);

/* Loads a gltf/glb and returns the full scene (materials preserved),
   wrapped in a Group whose origin is at the scene's bounding-box center
   so clones translate cleanly. `unitMax` is the larger of the scene's
   XY dimensions, used to scale instances to the symbol-system `size`. */
function loadAssetScene(url){
  return new Promise(resolve=>{
    new GLTFLoader().load(url, gltf=>{
      const obj=gltf.scene;
      obj.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(obj);
      const center=box.getCenter(new THREE.Vector3());
      const size=box.getSize(new THREE.Vector3());
      const unitMax=Math.max(size.x, size.y) || 1;
      // Wrap so the wrapper's origin = scene's center.
      const wrapper=new THREE.Group();
      obj.position.sub(center);
      wrapper.add(obj);
      resolve({scene:wrapper, unitMax});
    }, undefined, ()=>resolve({scene:null, unitMax:1}));
  });
}

/* Shape segment generators — mirrors SHAPES in questionnaire.js exactly so
   geometry positions match the 2D construction. */
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
};

/* Restored tube-traced motifs — the original SHAPES silhouettes are sacred:
   every line, arc, ring, opening, and internal cutout is preserved exactly.
   Each stroke becomes a rounded tube of `radius` thickness — no symbols are
   replaced, merged into blobs, or simplified. Only the material/shading
   changes. `anah` still uses its dedicated 3D model. */
/* Builds a closed THREE.Shape for a motif's outer silhouette only — no
   internal cutouts, no pupil holes, no center holes. Preserves the
   recognizable silhouette of the original 2D symbol. */
function shapeForMotif(key,size){
  const r=size/2;
  const s=new THREE.Shape();
  switch(key){
    case 'circle':
      s.absarc(0,0,r,0,Math.PI*2,false);
      break;
    case 'triangle': {
      // Original SHAPES.triangle in canvas-Y (Y down). Flip to shape-Y (Y up).
      const v0={x:0,y:r}, v1={x:-r*0.866,y:-r*0.5}, v2={x:r*0.866,y:-r*0.5};
      s.moveTo(v0.x,v0.y); s.lineTo(v1.x,v1.y); s.lineTo(v2.x,v2.y); s.closePath();
      break;
    }
    case 'diamond':
      s.moveTo(0,r); s.lineTo(r,0); s.lineTo(0,-r); s.lineTo(-r,0); s.closePath();
      break;
    case 'star': {
      const rOut=r, rIn=r*0.42, n=16;
      for(let i=0;i<n;i++){
        const a=Math.PI/2 - i*(Math.PI/8);
        const rad=i%2===0?rOut:rIn;
        const x=Math.cos(a)*rad, y=Math.sin(a)*rad;
        if(i===0) s.moveTo(x,y); else s.lineTo(x,y);
      }
      s.closePath();
      break;
    }
    case 'crescent': {
      // Outer arc (cx=0.05*size, r=0.5*size, 50°→310° CCW)
      // Inner arc (cx=0.18*size, r=0.38*size, 310°→50° CCW)
      // Together they close into the crescent silhouette.
      const cx1=0.05*size, r1=0.5*size, a1s=50*Math.PI/180, a1e=310*Math.PI/180;
      const cx2=0.18*size, r2=0.38*size, a2s=310*Math.PI/180, a2e=50*Math.PI/180;
      const N=40;
      s.moveTo(cx1+Math.cos(a1s)*r1, Math.sin(a1s)*r1);
      for(let i=1;i<=N;i++){ const t=i/N, a=a1s+(a1e-a1s)*t; s.lineTo(cx1+Math.cos(a)*r1, Math.sin(a)*r1); }
      for(let i=1;i<=N;i++){ const t=i/N, a=a2s+(a2e-a2s)*t; s.lineTo(cx2+Math.cos(a)*r2, Math.sin(a)*r2); }
      s.closePath();
      break;
    }
    case 'eye': {
      // Lens (almond) silhouette — top + bottom arcs joining at the corners.
      const er=size*0.5865, dy=size*0.3064;
      const a1s=-148.5*Math.PI/180, a1e=-31.5*Math.PI/180;
      const a2s= 31.5*Math.PI/180, a2e= 148.5*Math.PI/180;
      const N=32;
      // top arc (cy=dy, but flipped — in canvas Y down dy was the top arc's center y,
      // which after the canvas→shape Y flip becomes -dy).
      s.moveTo(Math.cos(a1s)*er, -dy+Math.sin(a1s)*er);
      for(let i=1;i<=N;i++){ const t=i/N, a=a1s+(a1e-a1s)*t; s.lineTo(Math.cos(a)*er, -dy+Math.sin(a)*er); }
      // bottom arc (cy=-dy in canvas → +dy in shape Y)
      for(let i=1;i<=N;i++){ const t=i/N, a=a2s+(a2e-a2s)*t; s.lineTo(Math.cos(a)*er, dy+Math.sin(a)*er); }
      s.closePath();
      break;
    }
    case 'flower': {
      // Scalloped circle — 6 lobes, no center hole. Sampled as a smooth
      // closed contour with radius oscillating around the lobe pattern.
      const baseR=size*0.40, lobe=size*0.18, N=6*8;
      for(let i=0;i<N;i++){
        const t=i/N * Math.PI*2;
        const oscill=(Math.cos(t*6)+1)*0.5; // 0..1, peaks at petal centers
        const rad=baseR + lobe*oscill;
        const x=Math.cos(t-Math.PI/2)*rad, y=Math.sin(t-Math.PI/2)*rad;
        if(i===0) s.moveTo(x,-y); else s.lineTo(x,-y);
      }
      s.closePath();
      break;
    }
    case 'yaz': {
      const w = size * 0.12;
      const mw = size * 0.45;
      const tr = size * 0.35;
      s.moveTo(-mw, w/2);
      s.lineTo(-w/2, w/2);
      s.lineTo(-w/2, size*0.4);
      s.quadraticCurveTo(-tr, size*0.4, -tr, size*0.1);
      s.lineTo(-tr - w, size*0.1);
      s.quadraticCurveTo(-tr - w, size*0.5, 0, size*0.5);
      s.quadraticCurveTo(tr + w, size*0.5, tr + w, size*0.1);
      s.lineTo(tr, size*0.1);
      s.quadraticCurveTo(tr, size*0.4, w/2, size*0.4);
      s.lineTo(w/2, w/2);
      s.lineTo(mw, w/2);
      s.lineTo(mw, -w/2);
      s.lineTo(w/2, -w/2);
      s.lineTo(w/2, -size*0.4);
      s.quadraticCurveTo(tr, -size*0.4, tr, -size*0.1);
      s.lineTo(tr + w, -size*0.1);
      s.quadraticCurveTo(tr + w, -size*0.5, 0, -size*0.5);
      s.quadraticCurveTo(-tr - w, -size*0.5, -tr - w, -size*0.1);
      s.lineTo(-tr, -size*0.1);
      s.quadraticCurveTo(-tr, -size*0.4, -w/2, -size*0.4);
      s.lineTo(-w/2, -w/2);
      s.lineTo(-mw, -w/2);
      s.closePath();
      break;
    }
    case 'meti': {
      const N = 8 * 8;
      for(let i=0; i<N; i++) {
        const t = i/N * Math.PI*2;
        const rad = r * (0.8 + 0.15 * Math.sin(t * 8));
        const x = Math.cos(t)*rad, y = Math.sin(t)*rad;
        if(i===0) s.moveTo(x,y); else s.lineTo(x,y);
      }
      s.closePath();
      break;
    }
    case 'nazar':
      s.absarc(0,0,r,0,Math.PI*2,false);
      break;
    case 'rosette': {
      const baseR = size * 0.35, lobe = size * 0.15, N = 8 * 8;
      for(let i=0; i<N; i++) {
        const t = i/N * Math.PI*2;
        const oscill = (Math.cos(t*8)+1)*0.5;
        const rad = baseR + lobe*oscill;
        const x = Math.cos(t)*rad, y = Math.sin(t)*rad;
        if(i===0) s.moveTo(x,y); else s.lineTo(x,y);
      }
      s.closePath();
      break;
    }
    case 'tyet': {
      const w = size * 0.12;
      const mw = size * 0.4;
      s.moveTo(-w/2, -size*0.45);
      s.lineTo(w/2, -size*0.45);
      s.lineTo(w/2, -size*0.15);
      s.lineTo(mw - w, -size*0.15);
      s.lineTo(mw - w, -size*0.3);
      s.lineTo(mw, -size*0.3);
      s.lineTo(mw, size*0.05);
      s.absarc(0, size*0.22, size*0.22, 0, Math.PI, false);
      s.lineTo(-mw, size*0.05);
      s.lineTo(-mw, -size*0.3);
      s.lineTo(-mw + w, -size*0.3);
      s.lineTo(-mw + w, -size*0.15);
      s.lineTo(-w/2, -size*0.15);
      s.closePath();
      break;
    }
    case 'agadez': {
      const w = size * 0.12;
      s.moveTo(-w/2, -size*0.45);
      s.lineTo(w/2, -size*0.45);
      s.lineTo(w/2, -size*0.2);
      s.lineTo(size*0.3, -size*0.2);
      s.lineTo(size*0.3, -size*0.1);
      s.lineTo(w/2, -size*0.1);
      s.lineTo(w/2, size*0.1);
      s.absarc(0, size*0.25, size*0.25, -Math.PI*0.15, Math.PI*1.15, false);
      s.lineTo(-w/2, size*0.1);
      s.lineTo(-w/2, -size*0.1);
      s.lineTo(-size*0.3, -size*0.1);
      s.lineTo(-size*0.3, -size*0.2);
      s.lineTo(-w/2, -size*0.2);
      s.closePath();
      break;
    }
    case 'shatkona': {
      const rOut = r, rIn = r * 0.577, n = 12;
      for(let i=0; i<n; i++) {
        const a = Math.PI/2 - i*(Math.PI/6);
        const rad = i%2===0 ? rOut : rIn;
        const x = Math.cos(a)*rad, y = Math.sin(a)*rad;
        if(i===0) s.moveTo(x,y); else s.lineTo(x,y);
      }
      s.closePath();
      break;
    }
    case 'triskele': {
      const N = 48;
      for(let i=0; i<N; i++) {
        const t = i/N * Math.PI*2;
        const rad = r * (0.6 + 0.4 * Math.sin(t * 3));
        const x = Math.cos(t)*rad, y = Math.sin(t)*rad;
        if(i===0) s.moveTo(x,y); else s.lineTo(x,y);
      }
      s.closePath();
      break;
    }
    case 'spiral': {
      const N = 64;
      for(let i=0; i<N; i++) {
        const t = i/N;
        const angle = t * Math.PI * 2;
        const rad = r * (0.3 + 0.7 * t);
        const x = Math.cos(angle)*rad, y = Math.sin(angle)*rad;
        if(i===0) s.moveTo(x,y); else s.lineTo(x,y);
      }
      s.closePath();
      break;
    }
    case 'om': {
      s.moveTo(-size*0.25, size*0.25);
      s.quadraticCurveTo(-size*0.4, size*0.1, -size*0.2, 0);
      s.quadraticCurveTo(-size*0.4, -size*0.1, -size*0.25, -size*0.25);
      s.quadraticCurveTo(-size*0.1, -size*0.4, size*0.1, -size*0.25);
      s.quadraticCurveTo(size*0.35, -size*0.1, size*0.25, size*0.15);
      s.quadraticCurveTo(0, size*0.4, -size*0.25, size*0.25);
      s.closePath();
      break;
    }
    case 'evil_eye': {
      const er=size*0.5865, dy=size*0.3064;
      const a1s=-148.5*Math.PI/180, a1e=-31.5*Math.PI/180;
      const a2s= 31.5*Math.PI/180, a2e= 148.5*Math.PI/180;
      const N=32;
      s.moveTo(Math.cos(a1s)*er, -dy+Math.sin(a1s)*er);
      for(let i=1;i<=N;i++){ const t=i/N, a=a1s+(a1e-a1s)*t; s.lineTo(Math.cos(a)*er, -dy+Math.sin(a)*er); }
      for(let i=1;i<=N;i++){ const t=i/N, a=a2s+(a2e-a2s)*t; s.lineTo(Math.cos(a)*er, dy+Math.sin(a)*er); }
      s.closePath();
      break;
    }
    case 'vegvisir': {
      const rOut = r, rIn = r * 0.35, n = 16;
      for(let i=0; i<n; i++) {
        const a = Math.PI/2 - i*(Math.PI/8);
        const rad = i%2===0 ? rOut : rIn;
        const x = Math.cos(a)*rad, y = Math.sin(a)*rad;
        if(i===0) s.moveTo(x,y); else s.lineTo(x,y);
      }
      s.closePath();
      break;
    }
    case 'dharmachakra': {
      const N = 32;
      for(let i=0; i<N; i++) {
        const t = i/N * Math.PI*2;
        const rad = r * (0.88 + 0.12 * (Math.cos(t * 8) > 0.5 ? 1 : 0));
        const x = Math.cos(t)*rad, y = Math.sin(t)*rad;
        if(i===0) s.moveTo(x,y); else s.lineTo(x,y);
      }
      s.closePath();
      break;
    }
    case 'pentagram': {
      const rOut = r, rIn = r * 0.38, n = 10;
      for(let i=0; i<n; i++) {
        const a = Math.PI/2 - i*(Math.PI/5);
        const rad = i%2===0 ? rOut : rIn;
        const x = Math.cos(a)*rad, y = Math.sin(a)*rad;
        if(i===0) s.moveTo(x,y); else s.lineTo(x,y);
      }
      s.closePath();
      break;
    }
    case 'scarab': {
      const N = 40;
      for(let i=0; i<N; i++) {
        const t = i/N * Math.PI*2;
        const rx = r * 0.75, ry = r * 0.9;
        const oscill = 1 + 0.05 * Math.sin(t * 6);
        const x = Math.cos(t)*rx * oscill, y = Math.sin(t)*ry * oscill;
        if(i===0) s.moveTo(x,y); else s.lineTo(x,y);
      }
      s.closePath();
      break;
    }
    case 'lotus': {
      s.moveTo(0, -r*0.8);
      s.quadraticCurveTo(-r*0.9, -r*0.6, -r*0.8, 0);
      s.quadraticCurveTo(-r*0.9, r*0.4, -r*0.4, r*0.3);
      s.quadraticCurveTo(-r*0.6, r*0.85, -r*0.1, r*0.85);
      s.lineTo(0, r*0.9);
      s.lineTo(r*0.1, r*0.85);
      s.quadraticCurveTo(r*0.6, r*0.85, r*0.4, r*0.3);
      s.quadraticCurveTo(r*0.9, r*0.4, r*0.8, 0);
      s.quadraticCurveTo(r*0.9, -r*0.6, 0, -r*0.8);
      s.closePath();
      break;
    }
    case 'pomegranate': {
      s.moveTo(0, r);
      s.lineTo(r*0.12, r*0.75);
      s.lineTo(r*0.3, r*0.9);
      s.lineTo(r*0.2, r*0.6);
      s.quadraticCurveTo(r*0.95, r*0.4, r*0.8, -r*0.3);
      s.quadraticCurveTo(r*0.5, -r*0.9, 0, -r*0.85);
      s.quadraticCurveTo(-r*0.5, -r*0.9, -r*0.8, -r*0.3);
      s.lineTo(-r*0.2, r*0.6);
      s.lineTo(-r*0.3, r*0.9);
      s.lineTo(-r*0.12, r*0.75);
      s.closePath();
      break;
    }
    case 'sun': {
      const N = 24;
      for(let i=0; i<N; i++) {
        const t = i/N * Math.PI*2;
        const rad = r * (i%2===0 ? 0.95 : 0.48);
        const x = Math.cos(t)*rad, y = Math.sin(t)*rad;
        if(i===0) s.moveTo(x,y); else s.lineTo(x,y);
      }
      s.closePath();
      break;
    }
    case 'sri_yantra': {
      const N = 16;
      for(let i=0; i<N; i++) {
        const t = i/N * Math.PI*2;
        const rad = r * (i%2===0 ? 0.95 : 0.6);
        const x = Math.cos(t)*rad, y = Math.sin(t)*rad;
        if(i===0) s.moveTo(x,y); else s.lineTo(x,y);
      }
      s.closePath();
      break;
    }
    case 'yin_yang':
      s.absarc(0,0,r,0,Math.PI*2,false);
      break;
    default:
      s.absarc(0,0,r,0,Math.PI*2,false);
  }
  return s;
}

function extrudedFromShape(shape, size){
  const settings={
    depth:        size * 0.06,
    bevelEnabled: true,
    bevelThickness: size * 0.18,
    bevelSize:      size * 0.16,
    bevelSegments: 10,
    steps:         1,
    curveSegments: 32,
  };
  const g=new THREE.ExtrudeGeometry(shape, settings);
  // Center on Z so the bevel sits symmetrically around z=0.
  g.translate(0, 0, -(size*0.06)/2);
  return g;
}

/* Procedural symbols — every motif becomes a fully-solid extruded
   silhouette with a heavy bevel. No tubes, no outlines, no internal
   cutouts. Front-facing, upright, axis-aligned. The unified shader paints
   the same blue/pink/orange halftone treatment across all of them so the
   family reads as one digital material system alongside the hamsa GLB. */
function geomsFromMotif(key,size,radius){
  if(key==='anah' && _anahGeom){
    const g=_anahGeom.clone();
    const s=size/_anahUnitMax;
    g.scale(s,s,s);
    return [g];
  }
  // hamsa is intentionally not handled here — it's instanced as a separate
  // Object3D in buildPendant so the GLB's original materials are preserved.
  if(key==='hamsa') return [];

  const shape=shapeForMotif(key,size);
  return [extrudedFromShape(shape, size)];
}

/* Single shader material shared by every symbol in the pendant. Produces:
     • a three-stop gradient across the object — electric blue / hot pink /
       vivid orange — blended by both local position and view normal, so
       cool tones sit on back-facing curvature and warm tones on facing,
       wrapping around each form like the reference images;
     • a procedural halftone dot pattern in screen space, modulated by
       surface curvature — dense where the surface faces the camera, looser
       at the limb, giving the "computational point-cloud" appearance.
   No reflections, no metallic/glass material, no realistic lighting. */
function makeMaterial(yMin,yMax,xMin,xMax){
  return new THREE.ShaderMaterial({
    transparent:false,
    uniforms:{
      colorBlue:   { value: new THREE.Color('#6b4938') }, // brown
      colorPink:   { value: new THREE.Color('#ffe6a1') }, // soft yellow
      colorOrange: { value: new THREE.Color('#6b4938') }, // brown
      yMin: { value: yMin },
      yMax: { value: yMax },
      xMin: { value: xMin },
      xMax: { value: xMax },
      dotCell:  { value: 5.0 },  // halftone cell size in screen pixels
      dotRadius:{ value: 1.55 }, // dot core radius
    },
    vertexShader: `
      varying vec3 vLocalPos;
      varying vec3 vLocalNormal;
      varying vec3 vViewNormal;
      void main(){
        vLocalPos = position;
        // Object-space normal — independent of mesh rotation, so the
        // colour bands stay painted on the geometry.
        vLocalNormal = normalize(normal);
        vViewNormal  = normalize((modelViewMatrix * vec4(normal,0.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 colorBlue;
      uniform vec3 colorPink;
      uniform vec3 colorOrange;
      uniform float yMin;
      uniform float yMax;
      uniform float xMin;
      uniform float xMax;
      uniform float dotCell;
      uniform float dotRadius;
      varying vec3 vLocalPos;
      varying vec3 vLocalNormal;
      varying vec3 vViewNormal;

      // Cyclic 3-stop palette: blue → pink → orange → blue.
      vec3 hue3(float h){
        h = fract(h);
        if(h < 0.3333) return mix(colorBlue,   colorPink,   h * 3.0);
        if(h < 0.6666) return mix(colorPink,   colorOrange, (h - 0.3333) * 3.0);
        return                  mix(colorOrange, colorBlue,  (h - 0.6666) * 3.0);
      }

      void main(){
        // Hue rotates around each tube's circumference using the object-space
        // normal — every tube cross-section shows the full blue/pink/orange
        // wrap, so even small motifs are never monochrome.
        vec3 nl = normalize(vLocalNormal);
        float ringHue = atan(nl.y, nl.x) / 6.2831853 + 0.5;
        vec3 ringCol = hue3(ringHue);

        // Slow drift of the same palette along the pendant's vertical axis,
        // so each symbol sits in a different overall key — top cooler, bottom
        // warmer — giving the diagonal sweep seen in the reference renders.
        float ty = clamp((vLocalPos.y - yMin) / max(0.0001,(yMax - yMin)), 0.0, 1.0);
        vec3 axisCol = hue3(0.66 - ty * 0.5);

        vec3 base = mix(axisCol, ringCol, 0.65);

        // Soft volumetric darken so the dot pattern still reads at grazing
        // angles, but the form stays bright and saturated overall.
        float ndotv = clamp(abs(vViewNormal.z), 0.0, 1.0);
        base *= mix(0.80, 1.05, pow(ndotv, 0.6));

        // Procedural halftone dot pattern in screen space — uniform "point
        // cloud" texture across every symbol mesh.
        vec2 cell = mod(gl_FragCoord.xy, dotCell) - dotCell * 0.5;
        float d = length(cell);
        // Dots shrink slightly at the silhouette edge — gives the
        // contour-flow / moiré on curved surfaces.
        float r = dotRadius * mix(0.55, 1.0, smoothstep(0.0, 1.0, ndotv));
        float dot = 1.0 - smoothstep(r - 0.6, r + 0.6, d);

        vec3 between = base * 0.55;
        vec3 inside  = base * 1.08;
        vec3 col = mix(between, inside, dot);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

let _scene=null, _renderer=null, _camera=null, _root=null, _mesh=null, _material=null;
let _canvas=null, _container=null, _ro=null, _raf=0, _start=0;

function disposeMesh(){
  if(_root){
    _scene?.remove(_root);
    _root.traverse(obj=>{
      if(obj.isMesh){
        if(obj!==_mesh) obj.geometry?.dispose();
      }
    });
    _root=null;
  }
  if(_mesh){
    _mesh.geometry?.dispose();
    _mesh=null;
  }
}

function buildPendant(data){
  disposeMesh();
  const Z=data.zones;
  // Tube/dot radii — pure visual choice, doesn't affect symbol layout.
  const tubeR=Math.max(4, Math.min(data.width,data.height)*0.012);
  const motifR=tubeR*1.0;
  const sideR=tubeR*0.95;
  const starR=tubeR*0.85;
  const dotR=tubeR*1.6;

  // Procedural-tube motifs go into `geoms` (merged + shader-shaded).
  // GLB-backed motifs (currently: hamsa) go into `glbInstances` as full
  // Object3D's whose original materials/colors/gradients are preserved.
  const geoms=[];
  const glbInstances=[];

  function addMotif(motif,size,x,y,rotZ,radius){
    if(motif==='hamsa' && _hamsaScene){
      // Instance the approved GLB as-is. clone(true) deep-clones the
      // hierarchy; geometries and materials are shared by reference.
      const inst=_hamsaScene.clone(true);
      const s=size/_hamsaUnitMax;
      inst.scale.set(s,s,s);
      inst.position.set(x, -y, 0);
      if(rotZ) inst.rotation.z=rotZ;
      glbInstances.push(inst);
      return;
    }
    geomsFromMotif(motif, size, radius).forEach(g=>{
      if(rotZ) g.rotateZ(rotZ);
      g.translate(x, -y, 0);
      geoms.push(g);
    });
  }

  // Every symbol stays front-facing and upright — no Z rotation on the
  // crown tilt, no rotated multi-origin hybrid, no mirrored ±sideRot.
  // Crown / upper motif (word).
  if(data.crown){
    addMotif(data.crown.motif, Z.crownD, Z.cx, Z.headY, 0, motifR);
  }
  // Origin seed — single (size=bodyD) or hybrid; layered hybrid still draws
  // each motif on top of the next, but all kept upright (no rotation).
  if(data.seed && data.seed.origins.length){
    const origins=data.seed.origins;
    if(origins.length===1){
      addMotif(origins[0], Z.bodyD, Z.cx, Z.bodyY, 0, motifR);
    } else {
      origins.forEach(m=>{
        addMotif(m, Z.bodyD*0.85, Z.cx, Z.bodyY, 0, motifR);
      });
    }
  }
  // Side elements (personal word) — symmetric pair, both upright.
  if(data.sides){
    const sideX=Z.bodyD*0.85, size=Z.elemD*0.85;
    addMotif(data.sides.motif, size, Z.cx-sideX, Z.bodyY, 0, sideR);
    addMotif(data.sides.motif, size, Z.cx+sideX, Z.bodyY, 0, sideR);
  }
  // Star symbols — three motifs stacked.
  if(data.stars && data.stars.length){
    const yStart=Z.bodyY+Z.elemD*0.85, yEnd=Z.foundY-Z.elemD*0.4;
    data.stars.forEach((m,i)=>{
      const y = data.stars.length===1 ? (yStart+yEnd)/2 : (yStart + (yEnd-yStart)*(i/(data.stars.length-1)));
      addMotif(m, Z.elemD*0.78, Z.cx, y, 0, starR);
    });
  }
  // Gematria composition dots — positions arrive exactly as the 2D placed them.
  if(data.dots && data.dots.length){
    const sphere=new THREE.SphereGeometry(dotR, 28, 18);
    data.dots.forEach(d=>{
      const g=sphere.clone();
      g.translate(d.x, -d.y, 0);
      geoms.push(g);
    });
    sphere.dispose();
  }

  // Merge procedural tubes into a single BufferGeometry.
  let mergedGeom=null;
  if(geoms.length){
    geoms.forEach(g=>{
      Object.keys(g.attributes).forEach(n=>{ if(n!=='position'&&n!=='normal') g.deleteAttribute(n); });
      if(!g.attributes.normal) g.computeVertexNormals();
    });
    mergedGeom=mergeGeometries(geoms);
    geoms.forEach(g=>g.dispose());
  }

  // Compute combined bounding box (procedural mesh + GLB instances) so we
  // can recenter everything around (0,0,0) — that way the root Group rotates
  // around the pendant's vertical axis without drift.
  const combined=new THREE.Box3(); combined.makeEmpty();
  if(mergedGeom){
    mergedGeom.computeBoundingBox();
    combined.union(mergedGeom.boundingBox);
  }
  const tmpBox=new THREE.Box3();
  glbInstances.forEach(inst=>{
    inst.updateMatrixWorld(true);
    tmpBox.setFromObject(inst);
    combined.union(tmpBox);
  });
  const center=combined.getCenter(new THREE.Vector3());

  // Recenter procedural geometry in its own local space; recenter GLB
  // instances by adjusting their `.position`. Group origin = pendant center.
  if(mergedGeom){
    mergedGeom.translate(-center.x, -center.y, -center.z);
    mergedGeom.computeBoundingBox();
  }
  glbInstances.forEach(inst=>{ inst.position.sub(center); });

  // Shader gradient spans the recentered procedural bbox so the colour
  // bands stay painted on those geometries as the group rotates.
  if(mergedGeom){
    const bb=mergedGeom.boundingBox;
    _material=makeMaterial(bb.min.y, bb.max.y, bb.min.x, bb.max.x);
    _mesh=new THREE.Mesh(mergedGeom, _material);
  }

  // Root group — the rotating container. Includes the shader-shaded
  // procedural mesh AND the GLB hamsa instances side by side.
  _root=new THREE.Group();
  if(_mesh) _root.add(_mesh);
  glbInstances.forEach(inst=>_root.add(inst));
  _scene.add(_root);

  window.__artifactMesh=_mesh; // for quick debug inspection
  window.__artifactRoot=_root;
}

// Minimal mergeGeometries (inlined to avoid pulling in BufferGeometryUtils path).
function mergeGeometries(geometries){
  if(geometries.length===0) return null;
  const attrs={};
  let totalIndex=0;
  let totalCount=0;
  // Collect attribute names from first geometry; assume all share same set.
  const first=geometries[0];
  const names=Object.keys(first.attributes);
  names.forEach(n=>{ attrs[n]={ array:[], itemSize: first.attributes[n].itemSize, normalized: first.attributes[n].normalized }; });
  const indexArr=[];
  for(const geom of geometries){
    const count=geom.attributes.position.count;
    for(const n of names){
      const a=geom.attributes[n].array;
      attrs[n].array.push(a);
    }
    if(geom.index){
      const idx=geom.index.array;
      for(let i=0;i<idx.length;i++) indexArr.push(idx[i]+totalCount);
    } else {
      for(let i=0;i<count;i++) indexArr.push(i+totalCount);
    }
    totalCount+=count;
  }
  const merged=new THREE.BufferGeometry();
  for(const n of names){
    const chunks=attrs[n].array;
    let total=0; chunks.forEach(c=>total+=c.length);
    const combined=new chunks[0].constructor(total);
    let off=0;
    chunks.forEach(c=>{ combined.set(c, off); off+=c.length; });
    merged.setAttribute(n, new THREE.BufferAttribute(combined, attrs[n].itemSize, attrs[n].normalized));
  }
  merged.setIndex(indexArr);
  // Don't recompute normals — TubeGeometry / SphereGeometry already provide
  // proper smooth normals; recomputing would flatten the tube shading.
  return merged;
}

function fitCamera(data){
  if(!_root) return;
  const bb=new THREE.Box3().setFromObject(_root);
  const pad=Math.max(data.width,data.height)*0.08;
  // Root group is centered at origin; rotates around Y. Use the existing
  // half-width / half-height as the envelope (rotation around Y leaves Y
  // unchanged, and the procedural mesh + GLB instances together span the bb).
  const halfW=(bb.max.x-bb.min.x)/2 + pad;
  const halfH=(bb.max.y-bb.min.y)/2 + pad;
  const aspect=data.width/data.height;
  const fitH = Math.max(halfH, halfW/aspect);
  const fov = _camera.fov * Math.PI/180;
  const dist = fitH / Math.tan(fov*0.5);
  _camera.aspect = aspect;
  _camera.position.set(0, 0, dist);
  _camera.lookAt(0, 0, 0);
  _camera.updateProjectionMatrix();
}

function tick(){
  if(!_renderer) return;
  _raf=requestAnimationFrame(tick);
  if(_root){
    const elapsed=(performance.now()-_start)/1000;
    // Slow continuous Y-axis rotation — one revolution every ~16 seconds.
    _root.rotation.y = elapsed * (Math.PI*2 / 16);
  }
  _renderer.render(_scene, _camera);
}

export function mountArtifact3D(container, data){
  unmountArtifact3D();
  _container=container;
  _canvas=document.createElement('canvas');
  _canvas.id='artifact-3d-canvas';
  _canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';
  container.appendChild(_canvas);

  _renderer=new THREE.WebGLRenderer({ canvas:_canvas, antialias:true, alpha:true });
  _renderer.setPixelRatio(window.devicePixelRatio||1);
  _renderer.setSize(data.width, data.height, false);
  _renderer.setClearColor(0x000000, 0);

  _scene=new THREE.Scene();
  _camera=new THREE.PerspectiveCamera(28, data.width/data.height, 0.1, 5000);

  // Wait for the approved 3D models (anah, hamsa) to be ready so those
  // motifs render with the exact provided geometry instead of falling back
  // to the procedural tube version. Loads are kicked off at module import.
  window.__assetsWaiting=true;
  assetsReady.then(()=>{
    window.__assetsWaiting=false;
    window.__anahLoaded=!!_anahGeom;
    window.__hamsaLoaded=!!_hamsaScene;
    if(!_renderer) return; // unmounted before load completed
    try {
      buildPendant(data);
      fitCamera(data);
      _start=performance.now();
      cancelAnimationFrame(_raf);
      tick();
    } catch(e) {
      window.__buildError = e.message;
      console.error('buildPendant failed:', e);
    }
  });

  _ro=new ResizeObserver(()=>{
    const w=container.clientWidth, h=container.clientHeight;
    if(!w||!h||!_renderer) return;
    _renderer.setSize(w,h,false);
    data.width=w; data.height=h;
    if(_root) fitCamera(data);
  });
  _ro.observe(container);
}

export function unmountArtifact3D(){
  cancelAnimationFrame(_raf); _raf=0;
  _ro?.disconnect(); _ro=null;
  disposeMesh();
  _material?.dispose(); _material=null;
  _renderer?.dispose(); _renderer=null;
  _scene=null; _camera=null;
  if(_canvas?.parentNode) _canvas.parentNode.removeChild(_canvas);
  _canvas=null; _container=null;
}
