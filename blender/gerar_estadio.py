# Claude Futebol - estádio e bola feitos no Blender (exporta estadio.glb e bola.glb)
import bpy, bmesh, math, os
from mathutils import Vector

OUT = os.path.join(os.path.expanduser('~'), 'Documents', 'claude-futebol-arte')
os.makedirs(OUT, exist_ok=True)

COMP, LARG = 60.0, 36.0          # campo médio (o jogo estica para os outros tamanhos)
C, L = COMP / 2 + 7, LARG / 2 + 7  # onde começa a arquibancada
DEG, ALT, PROF = 7, 0.8, 1.4      # degraus, altura e profundidade (igual ao jogo, para a torcida encaixar)

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    for x in list(coll):
        try: coll.remove(x)
        except Exception: pass

def mat(nome, cor, rough=0.7, metal=0.0, emit=0.0, alpha=1.0):
    m = bpy.data.materials.new(nome)
    try: m.use_nodes = True
    except Exception: pass
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*cor, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        try:
            b.inputs['Emission Color'].default_value = (*cor, 1)
            b.inputs['Emission Strength'].default_value = emit
        except Exception: pass
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        try: m.surface_render_method = 'BLENDED'
        except Exception:
            try: m.blend_method = 'BLEND'
            except Exception: pass
    m.diffuse_color = (*cor, alpha)
    return m

M = {
 'concreto': mat('concreto', (0.62, 0.64, 0.68), 0.9),
 'concreto2': mat('concreto_escuro', (0.38, 0.40, 0.45), 0.9),
 'assento1': mat('assento_azul', (0.08, 0.30, 0.75), 0.5),
 'assento2': mat('assento_branco', (0.92, 0.92, 0.95), 0.5),
 'assento3': mat('assento_amarelo', (0.98, 0.78, 0.08), 0.5),
 'aco': mat('aco', (0.82, 0.84, 0.88), 0.35, 0.8),
 'telhado': mat('telhado', (0.95, 0.96, 0.98), 0.4, 0.2),
 'vidro': mat('vidro', (0.7, 0.85, 1.0), 0.05, 0.0, 0.0, 0.35),
 'luz': mat('refletor', (1.0, 0.98, 0.9), 0.2, 0.0, 6.0),
 'telao': mat('telao', (0.05, 0.10, 0.25), 0.2, 0.0, 1.5),
 'telao_borda': mat('telao_borda', (0.08, 0.08, 0.1), 0.5),
 'banco': mat('banco_reserva', (0.85, 0.1, 0.1), 0.5),
 'pista': mat('pista', (0.55, 0.22, 0.18), 0.95),
}
PLACAS = [mat('placa_%d' % i, c, 0.3, 0.0, 2.0) for i, c in enumerate([(0.1,0.4,1.0), (1.0,0.75,0.05), (0.1,0.8,0.3), (1.0,0.2,0.2), (0.9,0.9,0.95), (0.6,0.2,0.9)])]

partes = []
def caixa(loc, tam, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object; o.scale = (tam[0] / 2, tam[1] / 2, tam[2] / 2)
    o.data.materials.append(m); partes.append(o); return o

def cilindro(loc, r, h, m, rot=(0, 0, 0), v=12):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=v)
    o = bpy.context.object; o.data.materials.append(m); partes.append(o); return o

# cada lado: comprimento, centro e direção "para fora"
LADOS = [
    (COMP + 14, Vector((0, -L, 0)), Vector((0, -1, 0))),
    (COMP + 14, Vector((0, L, 0)), Vector((0, 1, 0))),
    (LARG + 14, Vector((-C, 0, 0)), Vector((-1, 0, 0))),
    (LARG + 14, Vector((C, 0, 0)), Vector((1, 0, 0))),
]

for i, (comp, centro, fora) in enumerate(LADOS):
    lateral = abs(fora.y) > 0.5
    rot = (0, 0, 0) if lateral else (0, 0, math.pi / 2)
    def P(a, d, z):  # a = ao longo do lado, d = distância para fora
        ao_longo = Vector((1, 0, 0)) if lateral else Vector((0, 1, 0))
        p = centro + ao_longo * a + fora * d; p.z = z; return p
    # degraus
    for d in range(DEG):
        caixa(P(0, d * PROF, 0.4 + d * ALT), (comp, PROF, ALT + 0.02) if lateral else (PROF, comp, ALT + 0.02), M['concreto'], (0, 0, 0))
        # fileira de cadeiras na frente do degrau
        cor = M['assento1'] if d % 3 == 0 else M['assento2'] if d % 3 == 1 else M['assento3']
        caixa(P(0, d * PROF - 0.15, 0.8 + d * ALT + 0.25), (comp - 1, 0.12, 0.5) if lateral else (0.12, comp - 1, 0.5), cor)
    topo = 0.4 + DEG * ALT
    fundo = DEG * PROF
    # parede de trás e corredor
    caixa(P(0, fundo - 0.2, topo / 2 + 3), (comp + 1, 0.6, topo + 6) if lateral else (0.6, comp + 1, topo + 6), M['concreto2'])
    # mureta da frente
    caixa(P(0, -0.85, 0.55), (comp, 0.25, 1.1) if lateral else (0.25, comp, 1.1), M['concreto2'])
    # cobertura com treliças
    alt_tel = topo + 6.2
    caixa(P(0, fundo / 2 - 1.5, alt_tel), (comp + 1, fundo + 4, 0.25) if lateral else (fundo + 4, comp + 1, 0.25), M['telhado'])
    n = int(comp // 8)
    for k in range(n + 1):
        a = -comp / 2 + k * comp / n
        cilindro(P(a, fundo - 0.2, alt_tel / 2), 0.25, alt_tel, M['aco'])
        viga = caixa(P(a, fundo / 2 - 1.5, alt_tel - 0.45), (0.25, fundo + 4, 0.6) if lateral else (fundo + 4, 0.25, 0.6), M['aco'])
    # placas de propaganda em LED perto do campo
    seg = 6.0
    k = 0; a = -comp / 2 + 2 + seg / 2
    while a < comp / 2 - 2:
        caixa(P(a, -3.2, 0.5), (seg - 0.15, 0.2, 0.9) if lateral else (0.2, seg - 0.15, 0.9), PLACAS[(k + i) % len(PLACAS)])
        caixa(P(a, -3.05, 0.5), (seg, 0.15, 1.0) if lateral else (0.15, seg, 1.0), M['telao_borda'])
        a += seg; k += 1

# cantos fechando o estádio
for sx in (-1, 1):
    for sy in (-1, 1):
        for d in range(DEG):
            caixa((sx * (C + d * PROF * 0.5 + 3), sy * (L + d * PROF * 0.5 + 3), 0.4 + d * ALT), (7 + d * PROF, 7 + d * PROF, ALT), M['concreto'])
        # torre de refletores
        tx, ty = sx * (C + 8), sy * (L + 8)
        cilindro((tx, ty, 16), 0.5, 32, M['aco'])
        caixa((tx, ty, 32.5), (5, 0.6, 3.2), M['aco'], (0, 0, math.atan2(ty, tx) + math.pi / 2))
        for li in range(3):
            for lj in range(2):
                ang = math.atan2(ty, tx) + math.pi / 2
                off = Vector((math.cos(ang), math.sin(ang), 0)) * (-1.6 + li * 1.6)
                p = Vector((tx, ty, 31.7 + lj * 1.5)) + off - Vector((tx, ty, 0)).normalized() * 0.35
                caixa(p, (1.3, 0.2, 1.2), M['luz'], (0, 0, ang))

# telão atrás de um dos gols
caixa((-(C + 6), 0, 16), (1.2, 16, 9), M['telao_borda'])
caixa((-(C + 5.35), 0, 16), (0.1, 15, 8.2), M['telao'])
cilindro((-(C + 6), -6, 6), 0.4, 12, M['aco']); cilindro((-(C + 6), 6, 6), 0.4, 12, M['aco'])

# bancos de reservas do outro lado
for s in (-1, 1):
    bx = s * 9
    caixa((bx, L - 4.2, 0.45), (7, 1.0, 0.9), M['banco'])
    caixa((bx, L - 3.6, 1.2), (7.4, 0.15, 2.4), M['vidro'])
    caixa((bx, L - 4.3, 2.4), (7.4, 1.6, 0.12), M['vidro'])

# pista em volta do campo
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, -0.005))
pista = bpy.context.object; pista.scale = (COMP + 12, LARG + 12, 1); pista.data.materials.append(M['pista']); partes.append(pista)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0.0))
recorte = bpy.context.object; recorte.scale = (COMP + 6, LARG + 6, 1)
bpy.ops.object.transform_apply(scale=True)
# tira o meio da pista (onde fica a grama do jogo)
bm = bmesh.new(); bm.from_mesh(pista.data)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
bm.to_mesh(pista.data); bm.free()
bpy.data.objects.remove(recorte, do_unlink=True)
# a grama do jogo fica por cima (y=0), a pista fica um pouco abaixo e aparece só fora do campo

# junta tudo num objeto só
bpy.ops.object.select_all(action='DESELECT')
for p in partes: p.select_set(True)
bpy.context.view_layer.objects.active = partes[0]
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
bpy.ops.object.join()
estadio = bpy.context.object; estadio.name = 'estadio'
bpy.ops.object.shade_flat()

kw = dict(export_format='GLB', use_selection=True, export_apply=True)
bpy.ops.object.select_all(action='DESELECT'); estadio.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'estadio.glb'), **kw)

# ---------- bola de gomos (icosaedro truncado: 12 pentágonos pretos + 20 hexágonos brancos) ----------
me = bpy.data.meshes.new('bola'); bola = bpy.data.objects.new('bola', me); bpy.context.collection.objects.link(bola)
bm = bmesh.new()
bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
bmesh.ops.bevel(bm, geom=bm.verts[:], offset=33.333, offset_type='PERCENT', segments=1, affect='VERTICES')
branco = mat('bola_branco', (0.96, 0.96, 0.96), 0.35); preto = mat('bola_preto', (0.04, 0.04, 0.05), 0.35)
me.materials.append(branco); me.materials.append(preto)
for f in bm.faces: f.material_index = 1 if len(f.verts) == 5 else 0
# costura: um pouco de afundado entre os gomos
res = bmesh.ops.inset_individual(bm, faces=bm.faces[:], thickness=0.035, depth=0.0)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2, use_grid_fill=True)
for v in bm.verts: v.co = v.co.normalized() * 0.22
bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = True
bpy.ops.object.select_all(action='DESELECT'); bola.select_set(True); bpy.context.view_layer.objects.active = bola
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'bola.glb'), **kw)

# ---------- prévia ----------
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0.01)); g = bpy.context.object; g.scale = (COMP, LARG, 1)
g.data.materials.append(mat('grama', (0.18, 0.55, 0.22), 0.9))
bola.location = (0, 0, 0.22); bola.scale = (6, 6, 6)
sc = bpy.context.scene
for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT', 'CYCLES'):
    try: sc.render.engine = eng; break
    except Exception: pass
try: sc.view_settings.view_transform = 'Standard'
except Exception: pass
w = sc.world or bpy.data.worlds.new('W'); sc.world = w
try:
    w.use_nodes = True; bg = w.node_tree.nodes.get('Background'); bg.inputs[0].default_value = (0.5, 0.7, 0.95, 1); bg.inputs[1].default_value = 0.9
except Exception: pass
sd = bpy.data.lights.new('sol', 'SUN'); sd.energy = 3.5; so = bpy.data.objects.new('sol', sd); bpy.context.collection.objects.link(so); so.rotation_euler = (math.radians(50), 0, math.radians(-30))
cd = bpy.data.cameras.new('cam'); cd.lens = 24; cam = bpy.data.objects.new('cam', cd); bpy.context.collection.objects.link(cam)
cam.location = (0, -L - 30, 30); cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.camera = cam; sc.render.resolution_x = 960; sc.render.resolution_y = 540; sc.render.film_transparent = False
sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = os.path.join(OUT, 'estadio_previa.png')
bpy.ops.render.render(write_still=True)
with open(os.path.join(OUT, 'estadio_pronto.txt'), 'w') as f: f.write('ok')
print('ESTADIO PRONTO')
