import * as THREE from 'three';
export interface Controle { quadro(dt: number): void; redimensionar(w: number, h: number): void; destruir(): void; }
export interface PalcoProps { iniciar: (r: THREE.WebGLRenderer, w: number, h: number, sombras: boolean) => Controle; }
