// Tela sempre deitada: no site, se o celular estiver em pé, o jogo é girado 90°
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { View, Platform, useWindowDimensions } from 'react-native';

interface Tela { width: number; height: number; rodado: boolean; larguraReal: number; }
const Ctx = createContext<Tela>({ width: 800, height: 450, rodado: false, larguraReal: 800 });
export const useTela = () => useContext(Ctx);

// converte a posição do toque na tela real para a posição dentro do jogo girado
export function pontoNaTela(t: Tela, x: number, y: number) {
  return t.rodado ? { x: y, y: t.larguraReal - x } : { x, y };
}

export function TelaDeitada({ children }: { children: React.ReactNode }) {
  const { width: W, height: H } = useWindowDimensions();
  const tentou = useRef(false);
  const toque = Platform.OS === 'web' && typeof window !== 'undefined' && ('ontouchstart' in window || (navigator as any).maxTouchPoints > 0);
  const rodado = !!toque && H > W;

  // no primeiro toque tenta tela cheia e travar deitado (Android aceita)
  useEffect(() => {
    if (Platform.OS !== 'web' || !toque) return;
    const f = () => {
      if (tentou.current) return; tentou.current = true;
      const el: any = document.documentElement;
      const p = el.requestFullscreen ? el.requestFullscreen() : null;
      Promise.resolve(p).then(() => (screen.orientation as any)?.lock?.('landscape')).catch(() => {});
    };
    window.addEventListener('pointerdown', f, { once: true });
    return () => window.removeEventListener('pointerdown', f);
  }, [toque]);

  const valor: Tela = rodado ? { width: H, height: W, rodado: true, larguraReal: W } : { width: W, height: H, rodado: false, larguraReal: W };
  // sempre a mesma árvore (só muda o estilo), para o jogo não reiniciar quando a tela gira
  const estilo: any = rodado
    ? { position: 'absolute', width: H, height: W, left: (W - H) / 2, top: (H - W) / 2, transform: [{ rotate: '90deg' }], overflow: 'hidden' }
    : { position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden' };
  return (
    <Ctx.Provider value={valor}>
      <View style={estilo}>{children}</View>
    </Ctx.Provider>
  );
}
