// Gráficos 3D com three.js: estádio, jogadores do Blender, bola, efeitos e câmera de TV
import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Estado, Anim } from './motor';
import { TEMAS, PECAS } from '../dados/mapas';

const COR_TIME = [0x1e88ff, 0xff3b3b];

interface Boneco {
  raiz: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  acoes: Partial<Record<Anim, THREE.AnimationAction>>;
  atual: Anim | '';
  anel: THREE.Mesh;
  gelo: THREE.Mesh;
  escudo: THREE.Mesh;
  tontura: THREE.Mesh;
  seta: THREE.Mesh | null;
  materiais: THREE.Material[];
}

export type ModoCamera = 'tv' | 'perto';

export class Cena {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  bonecos: Boneco[] = [];
  bola!: THREE.Object3D;
  sombraBola!: THREE.Mesh;
  murosGrupo = new THREE.Group();
  efeitosGrupo = new THREE.Group();
  chuva: THREE.Points | null = null;
  torcida: THREE.InstancedMesh | null = null;
  torcidaBase: { y: number; fase: number }[] = [];
  modoCamera: ModoCamera = 'tv';
  camAlvo = new THREE.Vector3();
  tempo = 0;
  sombras: boolean;
  private cacheEfeito = new Map<string, THREE.Object3D>();
  private murosChave = '';
  mira: { x: number; z: number; super: boolean } | null = null;
  private seta!: THREE.Mesh;

  private modeloEstadio?: THREE.Object3D;
  private modeloBola?: THREE.Object3D;
  private matsBola: THREE.MeshStandardMaterial[] = [];

  constructor(public renderer: THREE.WebGLRenderer, largura: number, altura: number, e: Estado, modelos: Record<string, GLTF>, sombras: boolean) {
    this.sombras = sombras;
    if (modelos.estadio) { this.modeloEstadio = modelos.estadio.scene.clone(true); this.modeloEstadio.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.receiveShadow = sombras; } }); }
    if (modelos.bola) this.modeloBola = modelos.bola.scene.clone(true);
    this.camera = new THREE.PerspectiveCamera(42, largura / altura, 0.3, 600);
    renderer.setPixelRatio(1);
    renderer.setSize(largura, altura, false);
    renderer.shadowMap.enabled = sombras;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    this.montarEstadio(e);
    this.montarJogadores(e, modelos);
    this.montarBola();
    this.scene.add(this.murosGrupo, this.efeitosGrupo);
    const forma = new THREE.Shape();
    forma.moveTo(0, -0.25); forma.lineTo(7, -0.25); forma.lineTo(7, -0.6); forma.lineTo(8.5, 0); forma.lineTo(7, 0.6); forma.lineTo(7, 0.25); forma.lineTo(0, 0.25); forma.lineTo(0, -0.25);
    this.seta = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
    this.seta.rotation.x = -Math.PI / 2; this.seta.visible = false;
    const setaG = new THREE.Group(); setaG.add(this.seta); setaG.name = 'mira'; this.scene.add(setaG);
    this.camera.position.set(0, 22, e.larg / 2 + 18);
    this.camAlvo.set(0, 0, 0);
  }

  redimensionar(w: number, h: number) {
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  // ---------- estádio ----------
  private montarEstadio(e: Estado) {
    const tema = TEMAS[e.mapa.tema];
    const noite = e.mapa.noite;
    const s = this.scene;
    s.background = new THREE.Color(noite ? (e.mapa.tema === 'lua' ? 0x02020a : 0x0a1024) : tema.ceu);
    s.fog = new THREE.Fog(s.background as THREE.Color, 90, 260);

    s.add(new THREE.HemisphereLight(noite ? 0x6677aa : 0xdfefff, 0x335522, noite ? 0.55 : 1.0));
    const sol = new THREE.DirectionalLight(noite ? 0xdde6ff : 0xfff2dd, noite ? 1.6 : 2.4);
    sol.position.set(-30, 50, 25);
    if (this.sombras) {
      sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
      const c = sol.shadow.camera as THREE.OrthographicCamera;
      c.left = -e.comp / 2 - 6; c.right = e.comp / 2 + 6; c.top = e.larg / 2 + 6; c.bottom = -e.larg / 2 - 6; c.near = 1; c.far = 140;
      sol.shadow.bias = -0.0005;
    }
    s.add(sol);
    if (noite) {
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const l = new THREE.PointLight(0xffffff, 900, 120, 1.6); l.position.set(x * (e.comp / 2 + 10), 30, z * (e.larg / 2 + 10)); s.add(l);
      }
    }

    // chão de fora
    const fora = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: tema.fora, roughness: 1 }));
    fora.rotation.x = -Math.PI / 2; fora.position.y = -0.02; fora.receiveShadow = this.sombras; s.add(fora);

    // gramado com faixas
    const faixas = 12; const fw = (e.comp + 8) / faixas;
    const m1 = new THREE.MeshStandardMaterial({ color: tema.grama1, roughness: 0.95 });
    const m2 = new THREE.MeshStandardMaterial({ color: tema.grama2, roughness: 0.95 });
    for (let i = 0; i < faixas; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(fw, e.larg + 8), i % 2 ? m1 : m2);
      p.rotation.x = -Math.PI / 2; p.position.set(-e.comp / 2 - 4 + fw * (i + 0.5), 0, 0); p.receiveShadow = this.sombras; s.add(p);
    }

    // linhas
    const ml = new THREE.MeshBasicMaterial({ color: tema.linhas });
    const linha = (x: number, z: number, w: number, d: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ml); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.01, z); s.add(m);
    };
    const C = e.comp / 2, L = e.larg / 2, t = 0.12;
    linha(0, -L, e.comp, t); linha(0, L, e.comp, t); linha(-C, 0, t, e.larg); linha(C, 0, t, e.larg); linha(0, 0, t, e.larg);
    const circ = new THREE.Mesh(new THREE.RingGeometry(5.2, 5.32, 64), ml); circ.rotation.x = -Math.PI / 2; circ.position.y = 0.01; s.add(circ);
    const ponto = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), ml); ponto.rotation.x = -Math.PI / 2; ponto.position.y = 0.011; s.add(ponto);
    for (const sx of [-1, 1]) {
      const aw = Math.min(9, e.comp * 0.15), ah = Math.min(e.larg * 0.6, e.golL + 12);
      linha(sx * (C - aw), 0, t, ah); linha(sx * (C - aw / 2), -ah / 2, aw, t); linha(sx * (C - aw / 2), ah / 2, aw, t);
      const pw = 3, ph = e.golL + 4;
      linha(sx * (C - pw), 0, t, ph); linha(sx * (C - pw / 2), -ph / 2, pw, t); linha(sx * (C - pw / 2), ph / 2, pw, t);
      const pen = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), ml); pen.rotation.x = -Math.PI / 2; pen.position.set(sx * (C - aw * 0.7), 0.011, 0); s.add(pen);
      this.montarGol(sx, e);
    }

    // arquibancadas + torcida
    this.montarArquibancada(e, noite, this.modeloEstadio);

    // peças do mapa (zonas)
    for (const z of e.zonas) {
      const cor = new THREE.Color(PECAS[z.tipo].cor);
      if (z.tipo === 'arbusto') {
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });
        for (let i = 0; i < 6; i++) {
          const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + Math.random() * 0.4, 1), mat);
          b.position.set((Math.random() - 0.5) * 2, 0.7 + Math.random() * 0.4, (Math.random() - 0.5) * 2); b.castShadow = this.sombras; g.add(b);
        }
        g.position.set(z.x, 0, z.z); s.add(g);
      } else if (z.tipo === 'pula') {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.25, 24), new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.4 }));
        b.position.set(z.x, 0.12, z.z); s.add(b);
      } else {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(z.h * 2, z.h * 2), new THREE.MeshStandardMaterial({ color: cor, emissive: z.tipo === 'acelerador' ? cor : 0x000000, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 }));
        p.rotation.x = -Math.PI / 2; p.position.set(z.x, 0.02, z.z); s.add(p);
        if (z.tipo === 'acelerador') {
          const seta = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
          seta.rotation.x = -Math.PI / 2; seta.position.set(z.x, 0.05, z.z); s.add(seta);
        }
      }
    }

    if (e.mapa.chuva) {
      const n = 1500; const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * (e.comp + 30); pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = (Math.random() - 0.5) * (e.larg + 30); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.chuva = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaaccff, size: 0.12, transparent: true, opacity: 0.6 }));
      s.add(this.chuva);
    }
    if (e.mapa.tema === 'lua') {
      const n = 800; const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(250); v.y = Math.abs(v.y); pos.set([v.x, v.y, v.z], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      s.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false })));
      const terra = new THREE.Mesh(new THREE.SphereGeometry(18, 32, 16), new THREE.MeshStandardMaterial({ color: 0x2a6fd6, emissive: 0x0a2a66 }));
      terra.position.set(-60, 70, -180); s.add(terra);
    }
  }

  private montarGol(sx: number, e: Estado) {
    const s = this.scene; const x = sx * e.comp / 2; const gl = e.golL; const alt = 2.44; const fundo = 1.8;
    const branco = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const poste = (z: number) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, alt, 12), branco); p.position.set(x, alt / 2, z); p.castShadow = this.sombras; s.add(p); };
    poste(-gl / 2); poste(gl / 2);
    const trav = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, gl + 0.14, 12), branco); trav.rotation.x = Math.PI / 2; trav.position.set(x, alt, 0); trav.castShadow = this.sombras; s.add(trav);
    const rede = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.45 });
    const tras = new THREE.Mesh(new THREE.PlaneGeometry(gl, alt, Math.round(gl * 3), 8), rede); tras.rotation.y = Math.PI / 2; tras.position.set(x + sx * fundo, alt / 2, 0); s.add(tras);
    const topo = new THREE.Mesh(new THREE.PlaneGeometry(fundo, gl, 6, Math.round(gl * 3)), rede); topo.rotation.x = Math.PI / 2; topo.position.set(x + sx * fundo / 2, alt, 0); s.add(topo);
    for (const sz of [-1, 1]) { const lado = new THREE.Mesh(new THREE.PlaneGeometry(fundo, alt, 6, 8), rede); lado.position.set(x + sx * fundo / 2, alt / 2, sz * gl / 2); s.add(lado); }
  }

  private montarArquibancada(e: Estado, noite: boolean, modelo?: THREE.Object3D) {
    // com o estádio do Blender: monta tudo no tamanho do campo médio e estica para o tamanho do mapa
    const usaModelo = !!modelo && e.mapa.tema !== 'lua';
    const comp = usaModelo ? 60 : e.comp, larg = usaModelo ? 36 : e.larg;
    const raiz = new THREE.Group();
    if (usaModelo) { raiz.scale.set(e.comp / 60, 1, e.larg / 36); raiz.add(modelo!); }
    this.scene.add(raiz);
    const C = comp / 2 + 7, L = larg / 2 + 7;
    const concreto = new THREE.MeshStandardMaterial({ color: e.mapa.tema === 'lua' ? 0x333340 : 0x8a8f99, roughness: 0.9 });
    const lados: { cx: number; cz: number; comp: number; rot: number }[] = [
      { cx: 0, cz: -L, comp: comp + 14, rot: 0 }, { cx: 0, cz: L, comp: comp + 14, rot: Math.PI },
      { cx: -C, cz: 0, comp: larg + 14, rot: Math.PI / 2 }, { cx: C, cz: 0, comp: larg + 14, rot: -Math.PI / 2 },
    ];
    const degraus = 7;
    const posicoes: THREE.Matrix4[] = []; const cores: THREE.Color[] = [];
    const paleta = [0xffffff, 0xffd60a, 0x1e88ff, 0xff3b3b, 0x2ecc71, 0x111111, 0xff7f50, 0xf5d0a9];
    const tmp = new THREE.Object3D();
    for (const l of lados) {
      const g = new THREE.Group(); g.position.set(l.cx, 0, l.cz); g.rotation.y = l.rot; g.updateMatrix();
      if (!usaModelo) {
        const placa = new THREE.Mesh(new THREE.BoxGeometry(l.comp - 4, 0.9, 0.15), new THREE.MeshStandardMaterial({ color: 0x0b1a33, emissive: 0x1e40af, emissiveIntensity: noite ? 0.9 : 0.4 }));
        placa.position.set(0, 0.45, 3.2); g.add(placa);
        for (let d = 0; d < degraus; d++) {
          const deg = new THREE.Mesh(new THREE.BoxGeometry(l.comp, 0.8, 1.4), concreto);
          deg.position.set(0, 0.4 + d * 0.8, -d * 1.4); g.add(deg);
        }
        const cob = new THREE.Mesh(new THREE.BoxGeometry(l.comp, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0xdde3ea, metalness: 0.3, roughness: 0.5 }));
        cob.position.set(0, degraus * 0.8 + 3.5, -degraus * 1.4 + 2); g.add(cob);
        raiz.add(g);
      }
      if (e.mapa.tema === 'lua') continue;
      for (let d = 0; d < degraus; d++) {
        for (let k = -l.comp / 2 + 0.5; k < l.comp / 2 - 0.5; k += 0.75) {
          if (Math.random() < 0.15) continue;
          tmp.position.set(k + (Math.random() - 0.5) * 0.2, 1.15 + d * 0.8, -d * 1.4 + 0.15); tmp.updateMatrix();
          posicoes.push(new THREE.Matrix4().multiplyMatrices(g.matrix, tmp.matrix));
          cores.push(new THREE.Color(paleta[(Math.random() * paleta.length) | 0]));
        }
      }
    }
    if (posicoes.length) {
      const geo = new THREE.BoxGeometry(0.42, 0.72, 0.32);
      const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), posicoes.length);
      for (let i = 0; i < posicoes.length; i++) {
        inst.setMatrixAt(i, posicoes[i]); inst.setColorAt(i, cores[i]);
        this.torcidaBase.push({ y: new THREE.Vector3().setFromMatrixPosition(posicoes[i]).y, fase: Math.random() * 6.28 });
      }
      inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      this.torcida = inst; raiz.add(inst);
    }
    if (!usaModelo) {
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const tx = x * (C + 8), tz = z * (L + 8);
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 30, 8), concreto); t.position.set(tx, 15, tz); raiz.add(t);
        const luz = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: noite ? 2 : 0.6 }));
        luz.position.set(tx, 30, tz); luz.lookAt(0, 0, 0); raiz.add(luz);
      }
    }
  }

  // ---------- jogadores ----------
  private montarJogadores(e: Estado, modelos: Record<string, GLTF>) {
    for (const j of e.jogadores) {
      const gltf = modelos[j.p.id];
      const raiz = new THREE.Group();
      let mixer: THREE.AnimationMixer | null = null; const acoes: Boneco['acoes'] = {};
      const materiais: THREE.Material[] = [];
      if (gltf) {
        const corpo = SkeletonUtils.clone(gltf.scene) as THREE.Group;
        corpo.traverse(o => {
          const m = o as THREE.Mesh;
          if (m.isMesh) { m.castShadow = this.sombras; m.frustumCulled = false; const mm = Array.isArray(m.material) ? m.material : [m.material]; materiais.push(...mm); }
        });
        corpo.scale.setScalar(1.15); raiz.add(corpo);
        mixer = new THREE.AnimationMixer(corpo);
        for (const clip of gltf.animations) {
          const nome = clip.name as Anim;
          const a = mixer.clipAction(clip);
          if (nome === 'chutar') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
          acoes[nome] = a;
        }
      } else {
        const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.1, 4, 12), new THREE.MeshStandardMaterial({ color: COR_TIME[j.time] }));
        c.position.y = 0.9; raiz.add(c);
      }
      const anel = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 32), new THREE.MeshBasicMaterial({ color: COR_TIME[j.time], transparent: true, opacity: 0.85 }));
      anel.rotation.x = -Math.PI / 2; anel.position.y = 0.03; raiz.add(anel);
      const gelo = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 1.1), new THREE.MeshStandardMaterial({ color: 0xaee9ff, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2 }));
      gelo.position.y = 1.05; gelo.visible = false; raiz.add(gelo);
      const escudo = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 16), new THREE.MeshBasicMaterial({ color: 0x7df9ff, transparent: true, opacity: 0.25 }));
      escudo.position.y = 1; escudo.visible = false; raiz.add(escudo);
      const tontura = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 16), new THREE.MeshBasicMaterial({ color: 0xffeb3b }));
      tontura.rotation.x = Math.PI / 2; tontura.position.y = 2.15; tontura.visible = false; raiz.add(tontura);
      let seta: THREE.Mesh | null = null;
      if (j.humano) {
        seta = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 4), new THREE.MeshBasicMaterial({ color: 0xffd60a }));
        seta.rotation.x = Math.PI; seta.position.y = 2.45; raiz.add(seta);
        (anel.material as THREE.MeshBasicMaterial).color.set(0xffd60a);
      }
      this.scene.add(raiz);
      this.bonecos.push({ raiz, mixer, acoes, atual: '', anel, gelo, escudo, tontura, seta, materiais });
    }
  }

  private montarBola() {
    const g = new THREE.IcosahedronGeometry(0.22, 2).toNonIndexed();
    const base = new THREE.IcosahedronGeometry(1, 0); const bp = base.getAttribute('position');
    const vertsBase: THREE.Vector3[] = [];
    for (let i = 0; i < bp.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(bp, i).normalize(); if (!vertsBase.some(w => w.distanceTo(v) < 0.01)) vertsBase.push(v); }
    const pos = g.getAttribute('position'); const cores = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i += 3) {
      const c = new THREE.Vector3(); for (let k = 0; k < 3; k++) c.add(new THREE.Vector3().fromBufferAttribute(pos, i + k)); c.normalize();
      const preto = vertsBase.some(v => v.dot(c) > 0.93);
      for (let k = 0; k < 3; k++) cores.set(preto ? [0.05, 0.05, 0.05] : [0.97, 0.97, 0.97], (i + k) * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cores, 3)); g.computeVertexNormals();
    if (this.modeloBola) {
      const grupo = new THREE.Group(); grupo.add(this.modeloBola);
      this.modeloBola.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = this.sombras; const mm = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]; mm.forEach(x => { const c = x.clone(); this.matsBola.push(c); }); m.material = Array.isArray(m.material) ? this.matsBola.slice(-mm.length) : this.matsBola[this.matsBola.length - 1]; } });
      this.bola = grupo; this.scene.add(grupo);
    } else {
      const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }));
      mesh.castShadow = this.sombras; this.matsBola.push(mesh.material as THREE.MeshStandardMaterial);
      this.bola = mesh; this.scene.add(mesh);
    }
    this.sombraBola = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
    this.sombraBola.rotation.x = -Math.PI / 2; this.sombraBola.position.y = 0.02; this.scene.add(this.sombraBola);
  }

  // ---------- atualização por quadro ----------
  atualizar(e: Estado, dt: number) {
    this.tempo += dt;
    const humano = e.jogadores.find(j => j.humano);
    e.jogadores.forEach((j, i) => {
      const b = this.bonecos[i];
      b.raiz.position.set(j.x, j.y, j.z);
      b.raiz.rotation.y = Math.PI / 2 - j.dir;
      const anim: Anim = j.anim;
      if (b.mixer && anim !== b.atual) {
        const nova = b.acoes[anim] ?? b.acoes.parado; const velha = b.atual ? b.acoes[b.atual] : undefined;
        if (nova) { nova.reset(); nova.setEffectiveWeight(1); nova.play(); if (velha && velha !== nova) velha.crossFadeTo(nova, 0.15, false); }
        b.atual = anim;
      }
      if (b.mixer) {
        const v = Math.hypot(j.vx, j.vz);
        const corr = b.acoes.correr; if (corr) corr.timeScale = Math.max(0.6, v / 5);
        b.mixer.update(j.congelado > 0 ? 0 : dt);
      }
      b.gelo.visible = j.congelado > 0;
      b.escudo.visible = j.escudo > 0; if (j.escudo > 0) b.escudo.scale.setScalar(1 + Math.sin(this.tempo * 8) * 0.05);
      b.tontura.visible = j.atordoado > 0; b.tontura.rotation.z += dt * 6;
      if (b.seta) b.seta.position.y = 2.45 + Math.sin(this.tempo * 5) * 0.1;
      // escondido no arbusto: adversário some se estiver longe de mim
      const esconder = j.escondido && humano && j.time !== humano.time && Math.hypot(j.x - humano.x, j.z - humano.z) > 4.5;
      b.raiz.visible = !esconder;
      // super cheio brilha
      (b.anel.material as THREE.MeshBasicMaterial).opacity = j.superCarga >= 1 ? 0.6 + Math.sin(this.tempo * 10) * 0.4 : 0.85;
    });

    // bola
    const bo = e.bola;
    this.bola.position.set(bo.x, bo.y, bo.z);
    const v = Math.hypot(bo.vx, bo.vz);
    if (v > 0.1) { const eixo = new THREE.Vector3(bo.vz, 0, -bo.vx).normalize(); this.bola.rotateOnWorldAxis(eixo, (v * dt) / 0.22); }
    this.sombraBola.position.set(bo.x, 0.02, bo.z); this.sombraBola.scale.setScalar(Math.max(0.4, 1 - bo.y * 0.15));
    for (const matBola of this.matsBola) {
      matBola.emissive.set(bo.especial === 'ouro' ? 0xffc400 : bo.especial === 'canhao' ? 0xff5500 : 0x000000);
      matBola.emissiveIntensity = bo.especial ? 1.2 : 0;
    }

    const setaG = this.seta.parent!;
    const hum = e.jogadores.find(j => j.humano);
    if (this.mira && hum) {
      this.seta.visible = true; setaG.position.set(hum.x, 0.06, hum.z);
      setaG.rotation.y = -Math.atan2(this.mira.z, this.mira.x);
      (this.seta.material as THREE.MeshBasicMaterial).color.set(this.mira.super ? 0xffd60a : 0xffffff);
    } else this.seta.visible = false;
    this.atualizarMuros(e);
    this.atualizarEfeitos(e, dt);

    // torcida pulando (mais quando é gol)
    if (this.torcida) {
      const festa = e.fase === 'gol' ? 1 : 0.15; const m = new THREE.Matrix4(); const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
      const passoI = e.fase === 'gol' ? 1 : 4; const off = Math.floor(this.tempo * 10) % passoI;
      for (let i = off; i < this.torcidaBase.length; i += passoI) {
        this.torcida.getMatrixAt(i, m); m.decompose(p, q, sc);
        const tb = this.torcidaBase[i]; if (!tb) continue; p.y = tb.y + Math.max(0, Math.sin(this.tempo * 9 + tb.fase)) * 0.35 * festa;
        m.compose(p, q, sc); this.torcida.setMatrixAt(i, m);
      }
      this.torcida.instanceMatrix.needsUpdate = true;
    }

    if (this.chuva) {
      const pos = this.chuva.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) { let y = pos.getY(i) - dt * 22; if (y < 0) y = 30; pos.setY(i, y); }
      pos.needsUpdate = true;
    }

    // câmera de TV acompanhando a bola
    const alvoX = THREE.MathUtils.clamp(bo.x, -e.comp / 2 + 8, e.comp / 2 - 8);
    if (this.modoCamera === 'tv') {
      const desejada = new THREE.Vector3(alvoX * 0.85, 10.5, e.larg / 2 + 12);
      this.camera.position.lerp(desejada, Math.min(1, dt * 2.5));
      this.camAlvo.lerp(new THREE.Vector3(alvoX, 0, bo.z * 0.35 - 3), Math.min(1, dt * 3));
    } else {
      const h = humano ?? e.jogadores[0];
      const desejada = new THREE.Vector3(h.x * 0.85 + bo.x * 0.15, 11, h.z + 13);
      this.camera.position.lerp(desejada, Math.min(1, dt * 3));
      this.camAlvo.lerp(new THREE.Vector3(h.x * 0.7 + bo.x * 0.3, 0.5, h.z * 0.8 + bo.z * 0.2 - 1), Math.min(1, dt * 4));
    }
    if (e.fase === 'gol') { // zoom no gol
      this.camera.position.lerp(new THREE.Vector3(bo.x * 0.8, 9, bo.z + 14), Math.min(1, dt * 1.2));
      this.camAlvo.lerp(new THREE.Vector3(bo.x, 1, bo.z), dt * 2);
    }
    this.camera.lookAt(this.camAlvo);
    this.renderer.render(this.scene, this.camera);
  }

  private atualizarMuros(e: Estado) {
    const chave = e.muros.map(m => `${m.x.toFixed(1)},${m.z.toFixed(1)},${m.temp}`).join('|');
    if (chave === this.murosChave) return;
    this.murosChave = chave;
    this.murosGrupo.clear();
    for (const m of e.muros) {
      const mat = m.temp
        ? new THREE.MeshStandardMaterial({ color: 0xffb74d, emissive: 0xff8f00, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 })
        : new THREE.MeshStandardMaterial({ color: 0x9c5b3b, roughness: 0.95 });
      const b = new THREE.Mesh(new THREE.BoxGeometry(m.hx * 2, 2, m.hz * 2), mat);
      b.position.set(m.x, 1, m.z); b.castShadow = this.sombras; b.receiveShadow = this.sombras; this.murosGrupo.add(b);
    }
  }

  private atualizarEfeitos(e: Estado, dt: number) {
    const vivos = new Set<string>();
    e.efeitos.forEach((f, i) => {
      const id = `${f.tipo}:${f.x.toFixed(2)}:${f.z.toFixed(2)}:${i % 1000}`;
      const chave = `${f.tipo}:${f.x.toFixed(2)}:${f.z.toFixed(2)}`;
      vivos.add(chave);
      let o = this.cacheEfeito.get(chave);
      if (!o) { o = this.criarEfeito(f.tipo, f.time); o.position.set(f.x, 0.05, f.z); this.efeitosGrupo.add(o); this.cacheEfeito.set(chave, o); }
      const k = f.t / f.dur;
      if (f.tipo === 'gelo' || f.tipo === 'impacto') { o.scale.setScalar(0.5 + k * 8); ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k); }
      else if (f.tipo === 'ciclone') { o.rotation.y += dt * 12; o.scale.setScalar(1 + k * 6); ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k); }
      else if (f.tipo === 'teleporte') { o.scale.set(1, 1 + k * 3, 1); ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k); }
      else if (f.tipo === 'fogo') { o.scale.setScalar(1 - k * 0.7); o.position.y = 0.3 + k * 0.6; }
      else if (f.tipo === 'gol') { o.rotation.y += dt; o.children.forEach((c, n) => { c.position.y = 3 + ((this.tempo * 3 + n) % 8) * -0.6 + 4; }); }
      else if (f.tipo === 'muro') { o.scale.setScalar(1 + k * 3); }
      void id;
    });
    for (const [chave, o] of this.cacheEfeito) if (!vivos.has(chave)) { this.efeitosGrupo.remove(o); this.cacheEfeito.delete(chave); }
  }

  private criarEfeito(tipo: string, time?: number): THREE.Object3D {
    switch (tipo) {
      case 'gelo': { const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color: 0x9be7ff, transparent: true, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; return m; }
      case 'impacto': { const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; return m; }
      case 'ciclone': return new THREE.Mesh(new THREE.TorusGeometry(1, 0.15, 8, 32, Math.PI * 1.5), new THREE.MeshBasicMaterial({ color: 0xc8fff0, transparent: true }));
      case 'teleporte': { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.5, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xb388ff, transparent: true, side: THREE.DoubleSide })); m.position.y = 1.2; const g = new THREE.Group(); g.add(m); return g; }
      case 'fogo': return new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 8), new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0xff6d00 : 0xffc400 }));
      case 'muro': { const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 32), new THREE.MeshBasicMaterial({ color: 0xffb74d, transparent: true, opacity: 0.6 })); m.rotation.x = -Math.PI / 2; return m; }
      case 'gol': {
        const g = new THREE.Group(); const cores = [0xffd60a, 0xffffff, time === 0 ? 0x1e88ff : 0xff3b3b, 0x2ecc71];
        for (let i = 0; i < 60; i++) { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.15), new THREE.MeshBasicMaterial({ color: cores[i % 4], side: THREE.DoubleSide })); c.position.set((Math.random() - 0.5) * 12, 3, (Math.random() - 0.5) * 12); c.rotation.set(Math.random() * 3, Math.random() * 3, 0); g.add(c); }
        return g;
      }
    }
    return new THREE.Object3D();
  }

  destruir() {
    this.scene.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
    this.renderer.dispose();
  }
}
