// Mapas da galera: guarda e lista os mapas que os jogadores publicam (Vercel Blob)
import { put, list } from '@vercel/blob';

const cors = (res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const limpa = (s: any, n: number) => String(s ?? '').replace(/[<>]/g, '').slice(0, n);

export default async function handler(req: any, res: any) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: 'mapas/', limit: 200 });
      blobs.sort((a: any, b: any) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
      const pegar = blobs.slice(0, 60);
      const mapas = (await Promise.all(pegar.map(async (b: any) => {
        try { const r = await fetch(b.url); return await r.json(); } catch { return null; }
      }))).filter(Boolean);
      return res.status(200).json({ mapas });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const m = body?.mapa;
      if (!m || !Array.isArray(m.pecas)) return res.status(400).json({ erro: 'mapa inválido' });
      const id = 'gal-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const mapa = {
        id, nome: limpa(m.nome, 30) || 'Sem nome', autor: limpa(m.autor, 20) || 'Anônimo',
        tema: limpa(m.tema, 10), tamanho: limpa(m.tamanho, 10), noite: !!m.noite, chuva: !!m.chuva,
        golLargura: Math.max(5, Math.min(12, Number(m.golLargura) || 8)),
        pecas: m.pecas.slice(0, 200).map((p: any) => ({ tipo: limpa(p.tipo, 12), c: Number(p.c) | 0, l: Number(p.l) | 0 })),
        criadoEm: Date.now(),
      };
      await put(`mapas/${id}.json`, JSON.stringify(mapa), { access: 'public', contentType: 'application/json', addRandomSuffix: false });
      return res.status(200).json({ mapa });
    }
    return res.status(405).json({ erro: 'método não permitido' });
  } catch (err: any) {
    return res.status(500).json({ erro: 'servidor', detalhe: String(err?.message ?? err) });
  }
}
