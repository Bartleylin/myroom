import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "https://cdn.jsdelivr.net/npm/three@0.160/examples/jsm/renderers/CSS2DRenderer.js";

/** ====== 尺寸參數（單位：公尺）====== */
const ROOM_W = 3.6;     // 房間寬（左右）
const ROOM_D = 2.6;     // 房間深（前後）
const ROOM_H = 2.6;     // 房間高

const BED_W = 1.5;      // 雙人床寬
const BED_L = 1.9;      // 雙人床長
const BED_H = 0.45;     // 床高

const DESK_W = 1.2;     // 書桌寬（常見款）
const DESK_D = 0.6;     // 書桌深
const DESK_H = 0.74;    // 書桌高

const SHELF_W = 0.6;    // 三層書櫃寬（小書櫃）
const SHELF_D = 0.28;   // 書櫃深
const SHELF_H = 1.0;    // 書櫃高（估）

const TANK_W = 0.45;    // 魚缸長
const TANK_D = 0.45;    // 魚缸深
const TANK_H = 0.45;    // 魚缸高
const TANK_STAND_H = 0.6; // 魚缸桌高（估）

/** ====== 場景基礎 ====== */
const wrap = document.getElementById("canvas-wrap");
const panel = document.getElementById("info");
const panelTitle = document.getElementById("info-title");
const panelText = document.getElementById("info-text");
const panelLink = document.getElementById("info-link");
const btnClose = document.getElementById("info-close");

let width = wrap.clientWidth, height = wrap.clientHeight;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b0c);

const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.shadowMap.enabled = true;
wrap.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(width, height);
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.inset = "0";
labelRenderer.domElement.style.pointerEvents = "none";
wrap.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minPolarAngle = Math.PI / 3;
controls.maxPolarAngle = Math.PI / 2;

/** ====== 燈光 ====== */
scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.7));
const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(3, 5, 3);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
scene.add(dir);

/** ====== 地板 & 牆面（簡化） ====== */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(ROOM_W, ROOM_D),
  new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// 四面牆：以房間中心為原點，Z+ 為前方（靠門），Z- 為後方（靠窗）
const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 });
function wall(w, h, d=0.06) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); }

const backWall = wall(ROOM_W, ROOM_H); // 後牆（窗戶＋冷氣）
backWall.position.set(0, ROOM_H/2, -ROOM_D/2);
backWall.castShadow = true; backWall.receiveShadow = true; scene.add(backWall);

const frontWall = wall(ROOM_W, ROOM_H);
frontWall.position.set(0, ROOM_H/2, ROOM_D/2);
scene.add(frontWall);

const leftWall = wall(ROOM_D, ROOM_H);
leftWall.rotation.y = Math.PI/2;
leftWall.position.set(-ROOM_W/2, ROOM_H/2, 0);
scene.add(leftWall);

const rightWall = wall(ROOM_D, ROOM_H);
rightWall.rotation.y = Math.PI/2;
rightWall.position.set( ROOM_W/2, ROOM_H/2, 0);
scene.add(rightWall);

// 窗戶（僅作視覺洞口）
const windowHole = new THREE.Mesh(
  new THREE.BoxGeometry(1.6, 1.0, 0.08),
  new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x111111 })
);
windowHole.position.set(-0.2, 1.3, -ROOM_D/2 + 0.04); // 靠後牆，偏左（依照片）
scene.add(windowHole);

// 冷氣（簡化）
const ac = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 0.24, 0.22),
  new THREE.MeshStandardMaterial({ color: 0xe8e8e8 })
);
ac.position.set(-0.2, 2.0, -ROOM_D/2 + 0.15);
scene.add(ac);

/** ====== 可點擊物件系統 ====== */
const items = [];
function addItem({ id, label, summary, link, mesh, pos=[0,0,0], hintHeight=0.35 }) {
  const group = new THREE.Group();
  group.position.set(pos[0], pos[1], pos[2]);
  group.add(mesh);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.19, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
  );
  ring.rotation.x = -Math.PI/2; ring.position.y = 0.02;
  group.add(ring);

  const el = document.createElement("div");
  el.className = "label"; el.textContent = label;
  const labelObj = new CSS2DObject(el);
  labelObj.position.set(0, hintHeight, 0);
  group.add(labelObj);

  group.userData = { id, label, summary, link, ring, labelEl: el };
  scene.add(group);
  items.push(group);
}

/** ====== 幾何：床、書桌、書櫃、魚缸 ====== */
function makeBed() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(BED_W, BED_H, BED_L),
    new THREE.MeshStandardMaterial({ color: 0xbfb7aa })
  );
  base.position.y = BED_H/2;
  g.add(base);
  return g;
}

function makeDesk() {
  const g = new THREE.Group();
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(DESK_W, 0.04, DESK_D),
    new THREE.MeshStandardMaterial({ color: 0xdccfbf })
  );
  top.position.y = DESK_H;
  const legMat = new THREE.MeshStandardMaterial({ color: 0xc8c2ba });
  const legs = [
    [-DESK_W/2+0.04, DESK_H/2,  DESK_D/2-0.04],
    [ DESK_W/2-0.04, DESK_H/2,  DESK_D/2-0.04],
    [-DESK_W/2+0.04, DESK_H/2, -DESK_D/2+0.04],
    [ DESK_W/2-0.04, DESK_H/2, -DESK_D/2+0.04],
  ].map(p => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, DESK_H, 0.04), legMat);
    leg.position.set(p[0], p[1], p[2]); return leg;
  });
  g.add(top, ...legs);
  return g;
}

function makeShelf() {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(SHELF_W, SHELF_H, SHELF_D),
    new THREE.MeshStandardMaterial({ color: 0xa8a8a8 })
  );
  frame.position.y = SHELF_H/2;
  g.add(frame);
  // 三層線條
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9a });
  [SHELF_H*0.33, SHELF_H*0.66].forEach(h => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(SHELF_W*0.98, 0.02, SHELF_D*0.98), shelfMat);
    shelf.position.set(0, h, 0);
    g.add(shelf);
  });
  return g;
}

function makeFishTank() {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(TANK_W+0.04, TANK_STAND_H, TANK_D+0.04),
    new THREE.MeshStandardMaterial({ color: 0x6b6257 })
  );
  stand.position.y = TANK_STAND_H/2;
  const tank = new THREE.Mesh(
    new THREE.BoxGeometry(TANK_W, TANK_H, TANK_D),
    new THREE.MeshStandardMaterial({ color: 0x90caf9, transparent: true, opacity: 0.35, roughness: 0 })
  );
  tank.position.y = TANK_STAND_H + TANK_H/2;
  g.add(stand, tank);
  return g;
}

/** ====== 依照片擺位（可再校正）====== 
 *  - 床：靠右牆、長向順著 Z 軸
 *  - 書桌：床的前方（靠右牆）
 *  - 書櫃：書桌前側靠右牆
 *  - 魚缸：靠後牆偏左、靠窗
 */
const margin = 0.12;

addItem({
  id: "bed",
  label: "雙人床",
  summary: "雙人床 150×190cm，靠右牆擺放。",
  mesh: makeBed(),
  pos: [ ROOM_W/2 - BED_W/2 - margin, 0, -0.2 ]
});

addItem({
  id: "desk",
  label: "工作桌",
  summary: "常見 120×60cm 桌面，放置筆電與顯示器的工作區域。",
  mesh: makeDesk(),
  pos: [ ROOM_W/2 - DESK_W/2 - margin, 0, 0.9 ],
  link: "#desk"
});

addItem({
  id: "shelf",
  label: "三層書櫃",
  summary: "小型三層書櫃（約 60×28×100cm），擺放模型與書籍。",
  mesh: makeShelf(),
  pos: [ ROOM_W/2 - SHELF_W/2 - margin, 0, 1.35 ],
  link: "#shelf"
});

addItem({
  id: "tank",
  label: "水族缸 45 × 45 × 45",
  summary: "方形魚缸（你的主角之一），後牆偏左、靠窗側。",
  mesh: makeFishTank(),
  pos: [ -ROOM_W/2 + 0.65, 0, -ROOM_D/2 + 0.55 ],
  link: "#aquarium"
});

/** ====== Raycaster（hover/click）====== */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;

wrap.addEventListener("pointermove", (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
});
wrap.addEventListener("click", () => {
  if (!hovered) return;
  const { label, summary, link } = hovered.userData;
  openPanel(label, summary, link);
});

function openPanel(title, text, link) {
  panelTitle.textContent = title;
  panelText.textContent = text;
  if (link) { panelLink.href = link; panelLink.style.display = "inline-block"; }
  else { panelLink.style.display = "none"; }
  panel.setAttribute("aria-hidden", "false");
}
btnClose.addEventListener("click", () => panel.setAttribute("aria-hidden", "true"));

/** ====== 相機 / Resize / 迴圈 ====== */
function resetCamera() {
  const isMobile = matchMedia("(max-width: 768px)").matches;
  camera.position.set( isMobile ? 4.2 : 3.6, isMobile ? 2.8 : 2.2, isMobile ? 5.2 : 4.2 );
  camera.lookAt(0, 0.9, 0);
  controls.update();
}
resetCamera();

window.addEventListener("resize", () => {
  width = wrap.clientWidth; height = wrap.clientHeight;
  camera.aspect = width / height; camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
  resetCamera();
});

function animate() {
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(items, true);
  let target = null;
  if (intersects.length) {
    target = intersects[0].object;
    while (target && !target.userData?.id) target = target.parent;
  }

  if (hovered !== target) {
    if (hovered?.userData) {
      hovered.userData.ring.material.opacity = 0.35;
      hovered.userData.labelEl.classList.remove("is-hover");
    }
    hovered = target || null;
    if (hovered?.userData) {
      hovered.userData.ring.material.opacity = 0.85;
      hovered.userData.labelEl.classList.add("is-hover");
      wrap.style.cursor = "pointer";
    } else {
      wrap.style.cursor = "grab";
    }
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
