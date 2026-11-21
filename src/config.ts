import { Platform } from 'react-native';
// endereço do site (para o app do celular achar os mapas da galera)
export const SITE = 'https://claude-futebol.vercel.app';
export const API_MAPAS = Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.host ? '/api/mapas' : SITE + '/api/mapas';
