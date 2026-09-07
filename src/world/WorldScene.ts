/* three.js presentation of WorldSim: orthographic-iso camera, flat-shaded
 * procedural scenery, and rasterized expression-tree sprites.
 *
 * Architecture (v2): NO CSS3D layer, NO punch compositing. Dormant trees
 * are ink-on-transparent textures on ground-flat planes — they receive
 * fog, lighting, and cast/receive occlusion like any other scenery, so an
 * expression IS just ink lying on the moss. The single AWAKE tree is live
 * DOM in a screen-space overlay above the canvas (owned by WorldView);
 * the sprite plane crossfades out under it. Because the overlay has no
 * transformed ancestors, nool's Motion/Drag/FLIP machinery behaves
 * exactly as in the sandbox. */

import * as THREE from "three";
import * as Sim from "./WorldSim";

/* world units per CSS pixel of tree ink */
export const CSS_SCALE = 0.015;
const FOG = 0xcfd8d4;
const FOG_NEAR = 40;
const FOG_FAR = 95;
const GROUND_EXT = 1.7; /* ground skirt beyond world bounds, hidden in fog */
const CAM_HALF_H = 11.5;
/* camera offset direction; movement basis derives from it */
const CAM_OFF = new THREE.Vector3(1, 1.25, 1).normalize().multiplyScalar(55);

export type TreeHandle = {
  plane: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  blob: THREE.Mesh;
  wakeT: number;
  site: Sim.TreeSite;
};

export type Handles = {
  webgl: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera;
  trees: Map<string, TreeHandle>;
  /* CSS px on screen per world unit (orthographic: uniform) */
  pxPerUnit: () => number;
  /* world ground point -> CSS px in the viewport */
  project: (p: Sim.Vec, elevation?: number) => { x: number; y: number };
  setSprite: (key: string, dataUrl: string, cssW: number, cssH: number) => void;
  resize: (w: number, h: number) => void;
  frame: (av: Sim.Avatar, dt: number, awake: string | null) => void;
  dispose: () => void;
};

/* ---------- ground texture: jittered-grid Voronoi tint ---------- */

/* Soil under the grass carpet: soft organic moss blotches (no cell
 * seams — the Voronoi data stays in the sim for other uses), tinted by
 * terrain height so valleys read lush-dark and rises dry-light. Kept
 * darker than the blade tips so it reads as shaded soil. */
const paint_ground = (world: Sim.World): THREE.CanvasTexture => {
  const RES = 768;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = RES;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(RES, RES);
  const { bounds } = world;

  const dark = [72, 96, 62];
  const light = [122, 148, 92];

  const ext = bounds * GROUND_EXT;
  for (let py = 0; py < RES; py++) {
    const wz = (py / RES) * 2 * ext - ext;
    for (let px = 0; px < RES; px++) {
      const wx = (px / RES) * 2 * ext - ext;
      /* organic interference blotches + relief tint */
      const blotch =
        0.5 +
        0.5 *
          Math.sin(wx * 0.31 + Math.sin(wz * 0.27) * 1.7) *
          Math.sin(wz * 0.23 + Math.sin(wx * 0.19) * 1.3);
      const hn = (Sim.height(wx, wz) / 3 + 1) / 2; /* 0 valley .. 1 rise */
      const t = Math.min(1, Math.max(0, 0.2 + 0.35 * blotch + 0.45 * hn));
      let r = dark[0] + (light[0] - dark[0]) * t;
      let g = dark[1] + (light[1] - dark[1]) * t;
      let b = dark[2] + (light[2] - dark[2]) * t;
      /* per-pixel grain */
      const h = ((px * 374761393 + py * 668265263) ^ (px * py)) >>> 0;
      const grain = 1 + ((h % 1000) / 1000 - 0.5) * 0.06;
      const i = (py * RES + px) * 4;
      img.data[i] = Math.min(255, r * grain);
      img.data[i + 1] = Math.min(255, g * grain);
      img.data[i + 2] = Math.min(255, b * grain);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
};

/* ---------- scenery meshes ---------- */

/* Deform vertices by a hash of their (rounded) position so duplicated
 * vertices of the non-indexed polyhedron displace identically: crack-free
 * lumps with honest flat-shaded facets. */
const lumpy = (geo: THREE.BufferGeometry, amount: number, seed: number): void => {
  const pos = geo.getAttribute("position");
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const kx = Math.round(v.x * 1e3),
      ky = Math.round(v.y * 1e3),
      kz = Math.round(v.z * 1e3);
    let h = (kx * 374761393 + ky * 668265263 + kz * 2147483647 + seed * 1e9) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const f = 1 + (((h >>> 0) % 1000) / 1000 - 0.5) * amount;
    pos.setXYZ(i, v.x * f, v.y * f, v.z * f);
  }
  geo.computeVertexNormals();
};

const mk_rock = (r: Sim.Rock): THREE.Mesh => {
  let mesh: THREE.Mesh;
  if (r.kind === "monolith") {
    const geo = new THREE.BoxGeometry(r.r * 1.1, r.h, r.r * 0.75);
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(0.35, 0.05, 0.6 + r.seed * 0.08),
      flatShading: true,
    });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(r.pos.x, r.h * 0.44, r.pos.z);
    mesh.rotation.set((r.seed - 0.5) * 0.12, r.rot, (r.seed - 0.5) * 0.1);
  } else {
    const geo = new THREE.IcosahedronGeometry(r.r, 1);
    lumpy(geo, 0.5, r.seed);
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(0.28, 0.06, 0.5 + r.seed * 0.12),
      flatShading: true,
    });
    mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(1, r.h, 1);
    mesh.position.set(r.pos.x, r.r * r.h * 0.4, r.pos.z);
    mesh.rotation.y = r.rot;
  }
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
};

const mk_flora = (f: Sim.Flora): THREE.Group => {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.17, f.h * 0.5, 5),
    new THREE.MeshLambertMaterial({ color: 0x6b5747, flatShading: true })
  );
  trunk.position.y = f.h * 0.25;
  trunk.castShadow = true;
  g.add(trunk);
  for (let i = 0; i < 2; i++) {
    const rad = f.h * (0.28 - i * 0.09);
    const geo = new THREE.IcosahedronGeometry(rad, 0);
    lumpy(geo, 0.4, f.seed + i);
    const puff = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(
          0.29 + f.seed * 0.03,
          0.32,
          0.38 + i * 0.06
        ),
        flatShading: true,
      })
    );
    puff.position.y = f.h * (0.55 + i * 0.3);
    puff.castShadow = true;
    g.add(puff);
  }
  g.position.set(f.pos.x, 0, f.pos.z);
  g.rotation.y = f.seed * Math.PI * 2;
  return g;
};

const mk_avatar = (): THREE.Group => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.5, 3, 8),
    new THREE.MeshLambertMaterial({ color: 0xd98f4f, flatShading: true })
  );
  body.position.y = 0.85;
  body.castShadow = true;
  g.add(body);
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.3, 6),
    new THREE.MeshLambertMaterial({ color: 0xb26a33, flatShading: true })
  );
  nose.position.set(0, 0.95, 0.42);
  nose.rotation.x = Math.PI / 2;
  g.add(nose);
  return g;
};

/* ---------- assembly ---------- */

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

export const create = (world: Sim.World): Handles => {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(FOG, FOG_NEAR, FOG_FAR);

  const webgl = new THREE.WebGLRenderer({ antialias: true });
  webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  webgl.setClearColor(FOG, 1);
  webgl.shadowMap.enabled = true;
  webgl.shadowMap.type = THREE.PCFShadowMap;

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xe8eef0, 0x5d6e54, 0.75));
  const sun = new THREE.DirectionalLight(0xfff1dd, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -18;
  sc.right = sc.top = 18;
  sc.far = 80;
  sc.updateProjectionMatrix();
  scene.add(sun, sun.target);

  /* rolling ground: displace the (pre-rotation) plane along local z,
   * which maps to world y; local (x, y) maps to world (x, -y) */
  const ground_geo = new THREE.PlaneGeometry(
    world.bounds * 2 * GROUND_EXT,
    world.bounds * 2 * GROUND_EXT,
    128,
    128
  );
  {
    const pos = ground_geo.getAttribute("position");
    for (let i = 0; i < pos.count; i++)
      pos.setZ(i, Sim.height(pos.getX(i), -pos.getY(i)));
    ground_geo.computeVertexNormals();
  }
  const ground = new THREE.Mesh(
    ground_geo,
    new THREE.MeshLambertMaterial({ map: paint_ground(world) })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  for (const r of world.rocks) {
    const m = mk_rock(r);
    m.position.y += Sim.height(r.pos.x, r.pos.z);
    scene.add(m);
  }
  for (const f of world.flora) {
    const m = mk_flora(f);
    m.position.y = Sim.height(f.pos.x, f.pos.z) - 0.05;
    scene.add(m);
  }

  /* Grass carpet: instanced TUFTS (several tapered blades merged per
   * instance) so density reaches carpet levels at modest instance
   * counts. Wind sways in the vertex shader off one time uniform.
   * Normals point up so blades shade like the ground (no dark
   * backfaces). */
  const grass_time = { value: 0 };
  {
    const rand_g = Sim.rng("nool-tuft");
    const BLADES = 6;
    const posA: number[] = [];
    const colA: number[] = [];
    const normA: number[] = [];
    const idxA: number[] = [];
    for (let j = 0; j < BLADES; j++) {
      const yaw = rand_g() * Math.PI * 2;
      const rad = rand_g() * 0.24;
      const bx = Math.cos(yaw) * rad;
      const bz = Math.sin(yaw) * rad;
      const h = 0.7 + rand_g() * 0.6;
      const lean = 0.04 + rand_g() * 0.16;
      const lx = Math.cos(yaw + 1.7) * lean;
      const lz = Math.sin(yaw + 1.7) * lean;
      const w = 0.05;
      /* width direction perpendicular to lean */
      const px = Math.cos(yaw + 1.7 + Math.PI / 2);
      const pz = Math.sin(yaw + 1.7 + Math.PI / 2);
      const base = posA.length / 3;
      posA.push(
        bx - px * w, 0, bz - pz * w,
        bx + px * w, 0, bz + pz * w,
        bx + lx - px * w * 0.15, h, bz + lz - pz * w * 0.15,
        bx + lx + px * w * 0.15, h, bz + lz + pz * w * 0.15
      );
      const jit = 0.9 + rand_g() * 0.2;
      colA.push(
        0.4, 0.45, 0.36,
        0.4, 0.45, 0.36,
        jit, jit, jit,
        jit, jit, jit
      );
      normA.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
      idxA.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(posA, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(normA, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colA, 3));
    g.setIndex(idxA);
    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = grass_time;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float uTime;"
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec3 bladeBase = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
            float phase = bladeBase.x * 0.55 + bladeBase.z * 0.7
              + (position.x + position.z) * 2.5;
            float sway = sin(uTime * 1.5 + phase) + 0.45 * sin(uTime * 2.9 + phase * 1.7);
            float bend = position.y * position.y;
            vec3 windW = normalize(vec3(1.0, 0.0, 0.35));
            float lx = dot(windW, normalize(instanceMatrix[0].xyz));
            float lz = dot(windW, normalize(instanceMatrix[2].xyz));
            transformed.x += sway * 0.17 * bend * lx;
            transformed.z += sway * 0.17 * bend * lz;
          #endif`
        );
    };
    const COUNT = 45000;
    const grass = new THREE.InstancedMesh(g, mat, COUNT);
    const rand = Sim.rng("nool-grass");
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const col = new THREE.Color();
    const ext = world.bounds * 1.15;
    for (let i = 0; i < COUNT; i++) {
      const x = (rand() * 2 - 1) * ext;
      const z = (rand() * 2 - 1) * ext;
      q.setFromAxisAngle(up, rand() * Math.PI * 2);
      const s = 0.85 + rand() * 0.5;
      m4.compose(
        new THREE.Vector3(x, Sim.height(x, z) - 0.02, z),
        q,
        new THREE.Vector3(s, 0.32 + rand() * 0.34, s)
      );
      grass.setMatrixAt(i, m4);
      /* lusher (darker, greener) in valleys; drier on rises */
      const hn = (Sim.height(x, z) / 3 + 1) / 2;
      col.setHSL(
        0.3 - hn * 0.05,
        0.4 - hn * 0.08,
        0.3 + hn * 0.14 + rand() * 0.08
      );
      grass.setColorAt(i, col);
    }
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    scene.add(grass);
  }

  const avatar = mk_avatar();
  avatar.position.set(world.spawn.x, 0, world.spawn.z);
  scene.add(avatar);

  /* Expression sprites: ink on transparent camera-facing billboards —
   * paper cutouts standing in the world. Under the orthographic camera a
   * screen-parallel plane projects EXACTLY like the live DOM overlay
   * (same shape, same scale), so waking a tree swaps between two
   * renderings of the same image: no reshaping, no jump. Unlit material:
   * raw texture colors match the live DOM; fog still applies. A soft
   * contact shadow on the ground keeps the cutout physically grounded
   * (and persists through wake — the one visual constant). */
  const trees = new Map<string, TreeHandle>();
  const blob_tex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    grad.addColorStop(0, "rgba(30,40,28,0.4)");
    grad.addColorStop(1, "rgba(30,40,28,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const fog_c = new THREE.Color(FOG);
  for (const site of world.trees) {
    /* fog is applied manually (capped) so distant expressions dim into
     * ghosts and landmarks instead of vanishing entirely */
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1,
      depthWrite: false,
      fog: false,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    plane.position.set(
      site.pos.x,
      Sim.height(site.pos.x, site.pos.z) + 0.5,
      site.pos.z
    );
    plane.visible = false; /* until a sprite arrives */
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 24),
      new THREE.MeshBasicMaterial({
        map: blob_tex,
        transparent: true,
        depthWrite: false,
      })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(
      site.pos.x,
      Sim.height(site.pos.x, site.pos.z) + 0.06,
      site.pos.z
    );
    scene.add(plane, blob);
    trees.set(site.key, { plane, mat, blob, wakeT: 0, site });
  }

  /* w/h in WORLD units (the view divides captured CSS px by pxPerUnit) */
  const setSprite = (
    key: string,
    dataUrl: string,
    w: number,
    h: number
  ): void => {
    const t = trees.get(key)!;
    new THREE.TextureLoader().load(dataUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      t.mat.map?.dispose();
      t.mat.map = tex;
      t.mat.needsUpdate = true;
      t.plane.scale.set(w, h, 1);
      /* cutout stands on the terrain */
      t.plane.position.y =
        Sim.height(t.site.pos.x, t.site.pos.z) + h / 2;
      t.blob.scale.setScalar(Math.max(w * 0.8, 2));
      t.plane.visible = true;
    });
  };

  const focus = new THREE.Vector3(world.spawn.x, 0, world.spawn.z);
  let vw = 1,
    vh = 1;

  const resize = (w: number, h: number) => {
    vw = w;
    vh = h;
    const halfW = CAM_HALF_H * (w / h);
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = CAM_HALF_H;
    camera.bottom = -CAM_HALF_H;
    camera.updateProjectionMatrix();
    webgl.setSize(w, h);
  };

  const pxPerUnit = () => vh / (2 * CAM_HALF_H);

  const _p = new THREE.Vector3();
  const project = (p: Sim.Vec, elevation = 0) => {
    _p.set(p.x, elevation, p.z).project(camera);
    return { x: ((_p.x + 1) / 2) * vw, y: ((1 - _p.y) / 2) * vh };
  };

  const frame = (av: Sim.Avatar, dt: number, awake: string | null) => {
    grass_time.value += dt;
    const ay = Sim.height(av.pos.x, av.pos.z);
    avatar.position.set(av.pos.x, ay, av.pos.z);
    avatar.rotation.y = av.facing;

    focus.lerp(
      new THREE.Vector3(av.pos.x, ay, av.pos.z),
      1 - Math.exp(-4 * dt)
    );
    camera.position.copy(focus).add(CAM_OFF);
    camera.lookAt(focus);
    sun.position.copy(focus).add(new THREE.Vector3(18, 16, 10));
    sun.target.position.copy(focus);

    for (const t of trees.values()) {
      const target = awake === t.site.key ? 1 : 0;
      t.wakeT += (target - t.wakeT) * (1 - Math.exp(-10 * dt));
      /* plain crossfade, no motion: the live DOM overlay (WorldView)
       * fades in pinned to the same spot while the sprite dissolves */
      t.mat.opacity = 1 - smoothstep(t.wakeT);
      /* screen-parallel: identical projection to the DOM overlay */
      t.plane.quaternion.copy(camera.quaternion);
      /* capped manual fog: never fully swallowed */
      const d = camera.position.distanceTo(t.plane.position);
      const fogF = Math.min(
        Math.max((d - FOG_NEAR) / (FOG_FAR - FOG_NEAR), 0),
        1
      );
      t.mat.color.setRGB(1, 1, 1).lerp(fog_c, Math.min(fogF, 0.72));
    }

    webgl.render(scene, camera);
  };

  const dispose = () => {
    webgl.dispose();
    webgl.domElement.remove();
  };

  return {
    webgl,
    camera,
    trees,
    pxPerUnit,
    project,
    setSprite,
    resize,
    frame,
    dispose,
  };
};

/* movement basis for WorldView: screen-up / screen-right on the ground */
const fwd2 = new THREE.Vector2(-CAM_OFF.x, -CAM_OFF.z).normalize();
export const FORWARD: Sim.Vec = { x: fwd2.x, z: fwd2.y };
export const RIGHT: Sim.Vec = { x: -fwd2.y, z: fwd2.x };
