// Celular: usa o expo-gl para desenhar o three.js
import React, { useEffect, useRef } from 'react';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { Controle, PalcoProps } from './palcoTipos';

export default function Palco3D({ iniciar }: PalcoProps) {
  const fim = useRef<() => void>(() => {});
  useEffect(() => () => fim.current(), []);
  const aoCriar = (gl: ExpoWebGLRenderingContext) => {
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const canvas: any = { width: w, height: h, style: {}, clientWidth: w, clientHeight: h, addEventListener: () => {}, removeEventListener: () => {}, getContext: () => gl };
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl as any, antialias: false });
    const ctrl: Controle = iniciar(renderer, w, h, false);
    let raf = 0, ultimo = Date.now(), vivo = true;
    const loop = () => {
      if (!vivo) return;
      const agora = Date.now(); const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
      ctrl.quadro(dt); gl.endFrameEXP();
      raf = requestAnimationFrame(loop);
    };
    loop();
    fim.current = () => { vivo = false; cancelAnimationFrame(raf); ctrl.destruir(); };
  };
  return <GLView style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} onContextCreate={aoCriar} />;
}
