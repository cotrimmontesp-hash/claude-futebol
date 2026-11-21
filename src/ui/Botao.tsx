import React from 'react';
import { Pressable, Text, View, ViewStyle, TextStyle } from 'react-native';
import { COR } from './tema';

interface Props { titulo: string; onPress?: () => void; cor?: string; corTexto?: string; grande?: boolean; style?: ViewStyle; textoStyle?: TextStyle; desativado?: boolean; sub?: string; }

export default function Botao({ titulo, onPress, cor = COR.amarelo, corTexto = '#1a1a1a', grande, style, textoStyle, desativado, sub }: Props) {
  return (
    <Pressable onPress={desativado ? undefined : onPress} style={({ pressed }) => [{
      backgroundColor: desativado ? '#556' : cor, borderRadius: 14, paddingVertical: grande ? 14 : 9, paddingHorizontal: grande ? 28 : 16,
      borderBottomWidth: pressed ? 1 : 5, borderColor: 'rgba(0,0,0,0.35)', transform: [{ translateY: pressed ? 3 : 0 }],
      alignItems: 'center', justifyContent: 'center', opacity: desativado ? 0.7 : 1,
    }, style]}>
      <Text style={[{ color: corTexto, fontWeight: '900', fontSize: grande ? 26 : 16, textTransform: 'uppercase' }, textoStyle]}>{titulo}</Text>
      {sub ? <Text style={{ color: corTexto, fontWeight: '700', fontSize: 11, opacity: 0.8 }}>{sub}</Text> : null}
    </Pressable>
  );
}

export function Moeda({ valor, tipo }: { valor: number; tipo: 'moeda' | 'gema' | 'trofeu' }) {
  const cfg = { moeda: { cor: COR.moeda, s: '●' }, gema: { cor: COR.gema, s: '◆' }, trofeu: { cor: COR.trofeu, s: '🏆' } }[tipo];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginHorizontal: 4 }}>
      <Text style={{ color: cfg.cor, fontSize: 16, marginRight: 6, fontWeight: '900' }}>{cfg.s}</Text>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{valor}</Text>
    </View>
  );
}
