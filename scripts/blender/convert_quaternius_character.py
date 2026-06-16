import math
import os

import bpy
from mathutils import Vector


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SOURCE_CHARACTER = os.environ.get("RUNE_SOURCE_CHARACTER", "Rogue")
SOURCE_FILE = os.path.join(
    ROOT,
    "assets",
    "source",
    "quaternius-rpg-character-pack",
    "glTF",
    f"{SOURCE_CHARACTER}.gltf",
)
OUT_DIR = os.path.join(ROOT, "public", "models")
OUT_FILE = os.path.join(OUT_DIR, "rune-drifter.glb")
BLEND_OUT_DIR = os.path.join(ROOT, "assets", "blender")
BLEND_OUT_FILE = os.path.join(BLEND_OUT_DIR, "rune-drifter-source.blend")
PREVIEW_OUT = os.path.join(ROOT, "output", "rune-drifter-source-preview.png")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def make_mat(name, color, roughness=0.7, metallic=0.0, emission=None, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if emission:
            bsdf.inputs["Emission Color"].default_value = emission
            bsdf.inputs["Emission Strength"].default_value = strength
    return mat


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


def shade_flat(obj):
    if not hasattr(obj.data, "polygons"):
        return obj
    for poly in obj.data.polygons:
        poly.use_smooth = False
    return obj


def add_bevel(obj, amount=0.015, segments=1):
    bevel = obj.modifiers.new(name="source_soft_bevel", type="BEVEL")
    bevel.width = amount
    bevel.segments = segments
    bevel.affect = "EDGES"
    obj.modifiers.new(name="source_weighted_normals", type="WEIGHTED_NORMAL")
    return obj


def import_source():
    if not os.path.exists(SOURCE_FILE):
        raise FileNotFoundError(SOURCE_FILE)

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=SOURCE_FILE)
    imported = [obj for obj in bpy.data.objects if obj not in before]
    meshes = [obj for obj in imported if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("No mesh objects imported from source character.")

    return imported, meshes


def world_bounds(objects):
    corners = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    min_v = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
    max_v = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
    return min_v, max_v


def normalize_model(imported, meshes):
    min_v, max_v = world_bounds(meshes)
    center = (min_v + max_v) * 0.5
    height = max_v.z - min_v.z
    scale = 1.72 / height if height else 1.0

    root = bpy.data.objects.new("Rune_Drifter_Source_Root", None)
    bpy.context.collection.objects.link(root)

    for obj in imported:
        if obj.parent is None:
            obj.parent = root

    root.location = (-center.x * scale, -center.y * scale, -min_v.z * scale)
    root.scale = (scale, scale, scale)
    return root


def tune_source_materials(meshes):
    for obj in meshes:
        obj.name = f"Source_{obj.name}"
        shade_flat(obj)
        add_bevel(obj, amount=0.008, segments=1)

        for slot in obj.material_slots:
            mat = slot.material
            if not mat:
                continue
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            if not bsdf:
                continue
            name = mat.name.lower()
            bsdf.inputs["Roughness"].default_value = 0.82
            if any(token in name for token in ("robe", "cloth", "hat", "wizard")):
                bsdf.inputs["Base Color"].default_value = (0.035, 0.12, 0.115, 1)
            if any(token in name for token in ("skin", "face", "head")):
                bsdf.inputs["Base Color"].default_value = (0.46, 0.63, 0.62, 1)
            if any(token in name for token in ("staff", "wood", "belt", "shoe")):
                bsdf.inputs["Base Color"].default_value = (0.13, 0.075, 0.045, 1)


def add_cube(name, loc, scale, mat, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    assign(obj, mat)
    shade_flat(obj)
    if bevel:
        add_bevel(obj, bevel)
    return obj


def add_cylinder(name, loc, radius, depth, mat, vertices=8, rot=(0, 0, 0), scale=(1, 1, 1), bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=loc,
        rotation=rot,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    assign(obj, mat)
    shade_flat(obj)
    if bevel:
        add_bevel(obj, bevel)
    return obj


def add_torus(name, loc, major_radius, minor_radius, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=44,
        minor_segments=8,
        major_radius=major_radius,
        minor_radius=minor_radius,
        location=loc,
        rotation=rot,
    )
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    shade_flat(obj)
    return obj


def add_rune_shard(name, angle, height, mat, radius=0.9, scale=(0.1, 0.04, 0.24)):
    x = math.cos(angle) * radius
    y = math.sin(angle) * radius
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=1,
        radius=1,
        location=(x, y, height),
        rotation=(0.75, 0.2, angle + 0.55),
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    assign(obj, mat)
    shade_flat(obj)
    return obj


def add_signature_parts(root):
    rune = make_mat(
        "cyan_rune_source_glow",
        (0.54, 0.94, 1.0, 1),
        roughness=0.22,
        emission=(0.2, 0.9, 1.0, 1),
        strength=3.8,
    )
    gold = make_mat(
        "warm_relic_source_trim",
        (1.0, 0.67, 0.22, 1),
        roughness=0.55,
        metallic=0.12,
        emission=(1.0, 0.43, 0.08, 1),
        strength=0.35,
    )
    void = make_mat("deep_mask_shadow", (0.006, 0.014, 0.014, 1), roughness=0.72)
    crystal = make_mat(
        "pale_source_crystal",
        (0.68, 0.88, 0.9, 0.92),
        roughness=0.25,
        metallic=0.04,
        emission=(0.18, 0.72, 0.86, 1),
        strength=1.1,
    )

    parts = [
        add_cube("source_visor_shadow", (0, 0.43, 1.34), (0.22, 0.026, 0.075), void, bevel=0.008),
        add_cube("source_cyan_eye_slit", (0, 0.458, 1.36), (0.18, 0.012, 0.018), rune, bevel=0.003),
        add_torus("source_collar_rune_ring", (0, 0.02, 1.03), 0.46, 0.012, rune, rot=(math.pi / 2, 0, 0)),
        add_torus("source_back_sigil_ring", (0, -0.27, 1.13), 0.31, 0.01, gold, rot=(math.pi / 2, 0, 0)),
        add_cube("source_back_sigil_bar", (0, -0.282, 1.13), (0.02, 0.01, 0.27), gold, rot=(0, 0, math.radians(28)), bevel=0.004),
        add_cube("source_back_sigil_cross", (0, -0.283, 1.13), (0.02, 0.01, 0.24), gold, rot=(0, 0, math.radians(-28)), bevel=0.004),
        add_cylinder("source_staff_focus", (0.58, 0.18, 1.23), 0.085, 0.22, crystal, 6, rot=(0.45, 0.0, 0.28), scale=(0.72, 0.72, 1.0), bevel=0.006),
    ]

    for i in range(7):
        angle = i * (math.pi * 2 / 7) + 0.18
        parts.append(
            add_rune_shard(
                f"source_orbit_rune_shard_{i + 1}",
                angle,
                1.08 + (i % 3) * 0.11,
                rune,
                radius=0.88 + (i % 2) * 0.05,
                scale=(0.09, 0.038, 0.22),
            )
        )

    for obj in parts:
        obj.parent = root

    return parts


def add_preview_camera_and_light():
    light_data = bpy.data.lights.new("source_preview_key", type="AREA")
    light_data.energy = 420
    light_data.size = 4.0
    light = bpy.data.objects.new("source_preview_key", light_data)
    light.location = (2.6, 3.0, 4.3)
    bpy.context.collection.objects.link(light)

    fill_data = bpy.data.lights.new("source_preview_rune_fill", type="POINT")
    fill_data.color = (0.25, 0.9, 1.0)
    fill_data.energy = 70
    fill = bpy.data.objects.new("source_preview_rune_fill", fill_data)
    fill.location = (-1.4, 1.4, 1.8)
    bpy.context.collection.objects.link(fill)

    bpy.ops.object.camera_add(location=(1.85, -3.2, 1.75))
    camera = bpy.context.object
    target = Vector((0, 0.0, 0.95))
    direction = target - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 70
    bpy.context.scene.camera = camera


def save_and_export(model_objects):
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(BLEND_OUT_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(PREVIEW_OUT), exist_ok=True)

    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT_FILE)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in model_objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=OUT_FILE,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
        export_yup=True,
    )

    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.render.resolution_x = 1200
    bpy.context.scene.render.resolution_y = 1200
    bpy.context.scene.eevee.taa_render_samples = 48
    bpy.context.scene.view_settings.view_transform = "Filmic"
    bpy.context.scene.render.filepath = PREVIEW_OUT
    bpy.ops.render.render(write_still=True)

    print(f"Imported source: {SOURCE_FILE}")
    print(f"Exported playable GLB: {OUT_FILE}")
    print(f"Saved editable Blender file: {BLEND_OUT_FILE}")
    print(f"Rendered preview: {PREVIEW_OUT}")


if __name__ == "__main__":
    clear_scene()
    imported, meshes = import_source()
    root = normalize_model(imported, meshes)
    tune_source_materials(meshes)
    signature_parts = add_signature_parts(root)
    add_preview_camera_and_light()
    model_objects = [root] + imported + signature_parts
    save_and_export(model_objects)
