/**
 * welcome3d.js
 * Three.js r128 — 파티클 네트워크 + 음파 웨이브 + 플로팅 오브
 * 캔버스: #welcomeCanvas (vm-welcome 안 absolute, pointer-events:none)
 */

let _scene, _camera, _renderer, _animId, _running = false;
let _mouse = { x:0, y:0, sx:0, sy:0 };
let _pts = [], _ptMesh, _lineMesh, _waveLine, _waveLine2, _orbs = [];

const PT  = 110;
const CD  = 2.0;
const WSG = 160;

function initWelcome3D() {
  const canvas = document.getElementById('welcomeCanvas');
  if (!canvas || typeof THREE === 'undefined') return;
  if (_running) { return; }
  _running = true;

  canvas.style.pointerEvents = 'none';

  const W = canvas.offsetWidth  || window.innerWidth;
  const H = canvas.offsetHeight || window.innerHeight;

  _scene  = new THREE.Scene();
  _camera = new THREE.PerspectiveCamera(55, W/H, 0.1, 100);
  _camera.position.z = 8;

  _renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true });
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.setSize(W, H);
  _renderer.setClearColor(0x000000, 0);

  _buildNetwork();
  _buildWaves();
  _buildOrbs();

  window.addEventListener('mousemove', _onMouse);
  window.addEventListener('resize',    _onResize);
  _loop();
}

/* ── 파티클 네트워크 ── */
function _buildNetwork() {
  _pts = [];
  const pos = new Float32Array(PT * 3);
  const asp = _asp();

  for (let i = 0; i < PT; i++) {
    const x = (Math.random()-.5)*11*asp;
    const y = (Math.random()-.5)*10;
    const z = (Math.random()-.5)*3-1;
    pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z;
    _pts.push({ x,y,z, vx:(Math.random()-.5)*0.005, vy:(Math.random()-.5)*0.004 });
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  _ptMesh = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color:0x6699FF, size:0.055, transparent:true, opacity:0.75
  }));
  _scene.add(_ptMesh);

  const lGeo = new THREE.BufferGeometry();
  const lPos = new Float32Array(PT*PT*6);
  lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
  _lineMesh = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({
    color:0x4477EE, transparent:true, opacity:0.18
  }));
  _scene.add(_lineMesh);
}

/* ── 웨이브 라인 ── */
function _buildWaves() {
  const make = () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((WSG+1)*3), 3));
    return g;
  };
  _waveLine  = new THREE.Line(make(), new THREE.LineBasicMaterial({ color:0x6699FF, transparent:true, opacity:0.5 }));
  _waveLine2 = new THREE.Line(make(), new THREE.LineBasicMaterial({ color:0x9966FF, transparent:true, opacity:0.28 }));
  _scene.add(_waveLine);
  _scene.add(_waveLine2);
}

/* ── 플로팅 오브 ── */
function _buildOrbs() {
  const defs = [
    [-5.5, 2.5,-2, 0.55, 0x3355CC, 0.16],
    [ 5.5,-1.5,-1.5, 0.45, 0x6633BB, 0.14],
    [-3,  -3.5,-3, 0.32, 0x4466DD, 0.12],
    [ 4.5, 3.5,-2, 0.38, 0x8855CC, 0.13],
    [ 0,  -4.5,-1, 0.28, 0x5588EE, 0.10],
    [-6.5, 0,  -3, 0.62, 0x2244BB, 0.09],
    [ 6.5, 1,  -2, 0.58, 0x7733CC, 0.09],
  ];
  defs.forEach(([x,y,z,r,c,o], i) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r,20,20),
      new THREE.MeshBasicMaterial({ color:c, transparent:true, opacity:o })
    );
    m.position.set(x,y,z);
    m.userData = { ox:x, oy:y, ph:i*1.3, sp:0.28+Math.random()*0.25 };
    _scene.add(m);
    _orbs.push(m);
  });
}

let _t = 0;
function _loop() {
  _animId = requestAnimationFrame(_loop);
  _t += 0.016;
  _mouse.sx += (_mouse.x - _mouse.sx)*0.05;
  _mouse.sy += (_mouse.y - _mouse.sy)*0.05;

  _updateNetwork();
  _updateWaves();
  _orbs.forEach(o => {
    const d = o.userData;
    o.position.x = d.ox + Math.sin(_t*d.sp + d.ph)*0.55 + _mouse.sx*0.12;
    o.position.y = d.oy + Math.cos(_t*d.sp*.7 + d.ph)*0.45 + _mouse.sy*0.08;
  });

  _camera.position.x += (_mouse.sx*0.35 - _camera.position.x)*0.03;
  _camera.position.y += (_mouse.sy*0.2  - _camera.position.y)*0.03;
  _renderer.render(_scene, _camera);
}

function _updateNetwork() {
  const pa = _ptMesh.geometry.attributes.position.array;
  const asp = _asp();
  for (let i=0;i<PT;i++) {
    const p=_pts[i];
    p.x+=p.vx+_mouse.sx*0.0007;
    p.y+=p.vy+_mouse.sy*0.0005;
    if(p.x> 5.5*asp)p.x=-5.5*asp;
    if(p.x<-5.5*asp)p.x= 5.5*asp;
    if(p.y> 5)p.y=-5; if(p.y<-5)p.y=5;
    pa[i*3]=p.x; pa[i*3+1]=p.y; pa[i*3+2]=p.z;
  }
  _ptMesh.geometry.attributes.position.needsUpdate=true;

  const la=_lineMesh.geometry.attributes.position.array;
  let li=0;
  for(let i=0;i<PT;i++) for(let j=i+1;j<PT;j++){
    const dx=_pts[i].x-_pts[j].x, dy=_pts[i].y-_pts[j].y;
    if(dx*dx+dy*dy < CD*CD && li+5<la.length){
      la[li++]=_pts[i].x; la[li++]=_pts[i].y; la[li++]=_pts[i].z;
      la[li++]=_pts[j].x; la[li++]=_pts[j].y; la[li++]=_pts[j].z;
    }
  }
  while(li<la.length) la[li++]=0;
  _lineMesh.geometry.attributes.position.needsUpdate=true;
  _lineMesh.geometry.setDrawRange(0,li/3);
}

function _updateWaves() {
  const upd = (line, amp, freq, offset) => {
    const a = line.geometry.attributes.position.array;
    const asp = _asp();
    for(let i=0;i<=WSG;i++){
      const xn=(i/WSG)*2-1;
      const x=xn*6.5*asp;
      const env=Math.exp(-xn*xn*0.7);
      const y = Math.sin(xn*freq*Math.PI+_t*2.2+offset)*amp*env
              + Math.sin(xn*freq*1.6*Math.PI+_t*1.5+offset*1.4)*amp*0.38*env
              + _mouse.sy*0.28*env;
      a[i*3]=x; a[i*3+1]=y; a[i*3+2]=0;
    }
    line.geometry.attributes.position.needsUpdate=true;
  };
  upd(_waveLine,  0.52, 2.4, 0);
  upd(_waveLine2, 0.33, 3.1, 1.1);
}

function _asp() { return window.innerWidth/window.innerHeight; }

function _onMouse(e) {
  _mouse.x = (e.clientX/window.innerWidth -.5)*2;
  _mouse.y = -(e.clientY/window.innerHeight-.5)*2;
}

function _onResize() {
  const canvas = document.getElementById('welcomeCanvas');
  if(!canvas||!_renderer) return;
  const W=canvas.offsetWidth||window.innerWidth;
  const H=canvas.offsetHeight||window.innerHeight;
  _camera.aspect=W/H; _camera.updateProjectionMatrix();
  _renderer.setSize(W,H);
}

function destroyWelcome3D() {
  if(_animId) cancelAnimationFrame(_animId);
  _running=false;
  window.removeEventListener('mousemove',_onMouse);
  window.removeEventListener('resize',  _onResize);
  if(_renderer) _renderer.dispose();
  _pts=[]; _orbs=[];
}
