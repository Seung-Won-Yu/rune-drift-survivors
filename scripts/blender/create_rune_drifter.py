import math
import os

import bpy


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(ROOT, "public", "models")
OUT_FILE = os.path.join(OUT_DIR, "rune-drifter.glb")
BLEND_OUT_DIR = os.path.join(ROOT, "assets", "blender")
BLEND_OUT_FILE = os.path.join(BLEND_OUT_DIR, "rune-drifter.blend")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def make_mat(name, color, roughness=0.75, metallic=0.0, emission=None, strength=0.0):
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
    obj.data.materials.append(mat)
    return obj


def shade_flat(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = False
    return obj


def shade_smooth(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def add_bevel(obj, amount=0.025, segments=1):
    bevel = obj.modifiers.new(name="soft_bevel", type="BEVEL")
    bevel.width = amount
    bevel.segments = segments
    bevel.affect = "EDGES"
    obj.modifiers.new(name="weighted_normals", type="WEIGHTED_NORMAL")
    return obj


def add_cube(name, loc, scale, mat, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    assign(obj, mat)
    if bevel:
        add_bevel(obj, bevel)
    return obj


def add_uv_sphere(name, loc, scale, mat, segments=16, rings=8, smooth=False):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    assign(obj, mat)
    shade_smooth(obj) if smooth else shade_flat(obj)
    return obj


def add_cone(name, loc, radius1, radius2, depth, mat, vertices=6, rot=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=loc,
        rotation=rot,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    assign(obj, mat)
    shade_flat(obj)
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
        major_segments=36,
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


def add_mesh(name, verts, faces, mat):
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign(obj, mat)
    shade_flat(obj)
    return obj


def add_rune_shard(name, angle, height, mat, radius=0.98, scale=(0.13, 0.055, 0.31)):
    x = math.cos(angle) * radius
    y = math.sin(angle) * radius
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=(x, y, height), rotation=(0.65, 0.0, angle + 0.4))
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    assign(obj, mat)
    shade_flat(obj)
    return obj


def build_model():
    cloth = make_mat("deep_hood_cloth", (0.025, 0.085, 0.078, 1), roughness=0.88)
    cloth_hi = make_mat("cloak_inner_green", (0.045, 0.165, 0.135, 1), roughness=0.86)
    cloth_edge = make_mat("worn_teal_trim", (0.12, 0.34, 0.28, 1), roughness=0.8)
    leather = make_mat("dark_leather_wraps", (0.11, 0.075, 0.047, 1), roughness=0.9)
    armor = make_mat("smoked_bronze_plates", (0.21, 0.16, 0.105, 1), roughness=0.68, metallic=0.18)
    rune = make_mat(
        "cyan_rune_glow",
        (0.62, 0.96, 1.0, 1),
        roughness=0.32,
        emission=(0.25, 0.9, 1.0, 1),
        strength=2.8,
    )
    gold = make_mat(
        "warm_relic_trim",
        (1.0, 0.72, 0.22, 1),
        roughness=0.46,
        metallic=0.15,
        emission=(1.0, 0.52, 0.08, 1),
        strength=0.45,
    )
    shadow = make_mat("mask_void", (0.006, 0.014, 0.014, 1), roughness=0.65)
    pale = make_mat("pale_mask_shell", (0.55, 0.72, 0.72, 1), roughness=0.52, metallic=0.04)

    root = bpy.data.objects.new("Rune_Drifter_Root", None)
    bpy.context.collection.objects.link(root)

    parts = []

    # Body and layered cloak. The custom mesh keeps the readable "little hooded runner"
    # silhouette without becoming a heavy humanoid model.
    parts.append(add_uv_sphere("tunic_core", (0, 0, 0.72), (0.31, 0.24, 0.52), cloth, 14, 7))
    cloak_verts = [
        (-0.44, -0.18, 1.08), (0.44, -0.18, 1.08), (0.55, -0.11, 0.28), (0.22, -0.23, 0.08),
        (0.00, -0.31, 0.18), (-0.22, -0.23, 0.08), (-0.55, -0.11, 0.28),
        (-0.34, 0.13, 1.02), (0.34, 0.13, 1.02), (0.34, 0.08, 0.42), (-0.34, 0.08, 0.42),
    ]
    cloak_faces = [
        (0, 1, 2, 6), (6, 2, 3, 4, 5), (7, 8, 1, 0), (8, 9, 2, 1),
        (7, 0, 6, 10), (10, 9, 8, 7), (10, 6, 5, 4, 3, 2, 9),
    ]
    parts.append(add_mesh("split_back_cloak", cloak_verts, cloak_faces, cloth_hi))
    parts.append(add_cube("front_tunic_panel", (0, 0.22, 0.63), (0.22, 0.035, 0.42), leather, bevel=0.012))
    parts.append(add_cube("left_cloak_trim", (-0.38, -0.08, 0.62), (0.04, 0.035, 0.48), cloth_edge, rot=(0, 0.05, -0.08), bevel=0.01))
    parts.append(add_cube("right_cloak_trim", (0.38, -0.08, 0.62), (0.04, 0.035, 0.48), cloth_edge, rot=(0, -0.05, 0.08), bevel=0.01))

    # Hood, cowl and mask.
    parts.append(add_uv_sphere("hood_shell", (0, 0.02, 1.24), (0.42, 0.36, 0.34), cloth, 18, 9))
    parts.append(add_cone("hood_peak_fold", (0, 0.19, 1.39), 0.33, 0.02, 0.43, cloth, 6, rot=(math.radians(78), 0, 0)))
    parts.append(add_cube("inner_face_shadow", (0, 0.34, 1.23), (0.27, 0.035, 0.19), shadow, bevel=0.012))
    parts.append(add_cube("bone_mask_plate", (0, 0.375, 1.25), (0.19, 0.026, 0.145), pale, bevel=0.018))
    parts.append(add_cube("cyan_eye_slit", (0, 0.402, 1.27), (0.17, 0.012, 0.026), rune, bevel=0.004))
    parts.append(add_torus("cowl_rune_ring", (0, 0.02, 1.0), 0.43, 0.018, rune, rot=(math.pi / 2, 0, 0)))

    # Shoulders, sleeves, hands and boots.
    parts.append(add_cube("left_shoulder_plate", (-0.35, 0.05, 0.98), (0.18, 0.12, 0.08), armor, rot=(0, -0.2, 0.22), bevel=0.018))
    parts.append(add_cube("right_shoulder_plate", (0.35, 0.05, 0.98), (0.18, 0.12, 0.08), armor, rot=(0, 0.2, -0.22), bevel=0.018))
    parts.append(add_cylinder("left_sleeve", (-0.47, 0.07, 0.72), 0.09, 0.42, cloth, 7, rot=(0.12, 0.18, -0.32), scale=(0.82, 0.82, 1.0), bevel=0.01))
    parts.append(add_cylinder("right_sleeve", (0.47, 0.07, 0.72), 0.09, 0.42, cloth, 7, rot=(0.12, -0.18, 0.32), scale=(0.82, 0.82, 1.0), bevel=0.01))
    parts.append(add_uv_sphere("left_hand", (-0.55, 0.17, 0.51), (0.075, 0.06, 0.075), leather, 8, 4))
    parts.append(add_uv_sphere("right_hand", (0.55, 0.17, 0.51), (0.075, 0.06, 0.075), leather, 8, 4))
    parts.append(add_cube("left_boot", (-0.16, 0.11, 0.13), (0.13, 0.22, 0.085), shadow, rot=(0, 0, -0.04), bevel=0.018))
    parts.append(add_cube("right_boot", (0.16, 0.11, 0.13), (0.13, 0.22, 0.085), shadow, rot=(0, 0, 0.04), bevel=0.018))

    # Belt, talisman and rune staff.
    parts.append(add_torus("belt_relic_ring", (0, 0.02, 0.72), 0.29, 0.016, gold, rot=(math.pi / 2, 0, 0)))
    parts.append(add_cube("hanging_relic_tab", (0, 0.285, 0.47), (0.08, 0.026, 0.18), gold, bevel=0.01))
    parts.append(add_cylinder("rune_staff_shaft", (0.7, 0.18, 0.78), 0.025, 0.78, leather, 8, rot=(0.38, 0.05, 0.08), bevel=0.004))
    parts.append(add_rune_shard("staff_rune_head", 0.0, 1.12, rune, radius=0.72, scale=(0.12, 0.055, 0.25)))

    for i in range(5):
        angle = i * (math.pi * 2 / 5) + 0.25
        parts.append(add_rune_shard(f"orbit_rune_shard_{i + 1}", angle, 1.08 + (i % 2) * 0.12, rune, radius=0.88, scale=(0.105, 0.045, 0.24)))

    for obj in parts:
        obj.parent = root

    root.scale = (1.0, 1.0, 1.0)

    light_data = bpy.data.lights.new("preview_rune_light", type="POINT")
    light_data.color = (0.25, 0.9, 1.0)
    light_data.energy = 60
    light = bpy.data.objects.new("preview_rune_light", light_data)
    light.location = (0, 1.2, 1.4)
    bpy.context.collection.objects.link(light)

    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root


def export_glb():
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(BLEND_OUT_DIR, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUT_FILE,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
        export_yup=True,
    )
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT_FILE)
    print(f"Exported {OUT_FILE}")
    print(f"Saved {BLEND_OUT_FILE}")


if __name__ == "__main__":
    clear_scene()
    build_model()
    export_glb()
