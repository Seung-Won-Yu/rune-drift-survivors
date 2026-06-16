import math
import os

import bpy
from mathutils import Vector


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(ROOT, "public", "models")
BLEND_OUT_DIR = os.path.join(ROOT, "assets", "blender")
MONSTER_DIR = os.path.join(ROOT, "assets", "source", "quaternius-cute-monsters", "glTF")
RPG_WEAPON_DIR = os.path.join(ROOT, "assets", "source", "quaternius-rpg-character-pack", "FBX", "Only Weapons")


ASSETS = [
    {
        "kind": "gltf",
        "name": "enemy-golem",
        "source": os.path.join(MONSTER_DIR, "Demon.gltf"),
        "height": 1.25,
        "tint": None,
        "rotation": (0, 0, 0),
    },
    {
        "kind": "gltf",
        "name": "enemy-runner",
        "source": os.path.join(MONSTER_DIR, "Bat.gltf"),
        "height": 0.9,
        "tint": None,
        "rotation": (0, 0, 0),
    },
    {
        "kind": "gltf",
        "name": "enemy-brute",
        "source": os.path.join(MONSTER_DIR, "Yeti.gltf"),
        "height": 1.55,
        "tint": None,
        "rotation": (0, 0, 0),
    },
    {
        "kind": "gltf",
        "name": "arena-tree",
        "source": os.path.join(MONSTER_DIR, "Tree.gltf"),
        "height": 1.95,
        "tint": None,
        "rotation": (0, 0, 0),
    },
    {
        "kind": "fbx",
        "name": "projectile-orb",
        "source": os.path.join(RPG_WEAPON_DIR, "Ranger_Arrow.fbx"),
        "height": 0.52,
        "tint": (0.38, 0.88, 1.0, 1),
        "emission": (0.12, 0.68, 1.0, 1),
        "emission_strength": 1.8,
        "rotation": (math.radians(90), 0, 0),
    },
    {
        "kind": "fbx",
        "name": "projectile-storm",
        "source": os.path.join(RPG_WEAPON_DIR, "Wizard_Staff.fbx"),
        "height": 0.8,
        "tint": (0.76, 0.95, 1.0, 1),
        "emission": (0.45, 0.9, 1.0, 1),
        "emission_strength": 1.4,
        "rotation": (math.radians(90), 0, math.radians(24)),
    },
    {
        "kind": "fbx",
        "name": "orbit-blade",
        "source": os.path.join(RPG_WEAPON_DIR, "Rogue_Dagger.fbx"),
        "height": 0.7,
        "tint": (1.0, 0.72, 0.22, 1),
        "emission": (1.0, 0.48, 0.04, 1),
        "emission_strength": 0.9,
        "rotation": (math.radians(90), 0, math.radians(90)),
    },
]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_asset(asset):
    if not os.path.exists(asset["source"]):
        raise FileNotFoundError(asset["source"])
    if asset["kind"] == "gltf":
        bpy.ops.import_scene.gltf(filepath=asset["source"])
    elif asset["kind"] == "fbx":
        bpy.ops.import_scene.fbx(filepath=asset["source"])
    else:
        raise ValueError(asset["kind"])


def mesh_objects():
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def world_bounds(objects):
    corners = []
    for obj in objects:
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    min_v = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
    max_v = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
    return min_v, max_v


def materialize(asset, meshes):
    tint = asset.get("tint")
    emission = asset.get("emission")
    for obj in meshes:
        for poly in obj.data.polygons:
            poly.use_smooth = False
        obj.name = f"{asset['name']}_{obj.name}"
        for slot in obj.material_slots:
            mat = slot.material
            if not mat:
                continue
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            if not bsdf:
                continue
            bsdf.inputs["Roughness"].default_value = 0.68
            if tint:
                bsdf.inputs["Base Color"].default_value = tint
            if emission:
                bsdf.inputs["Emission Color"].default_value = emission
                bsdf.inputs["Emission Strength"].default_value = asset.get("emission_strength", 1.0)


def normalize(asset, objects):
    meshes = [obj for obj in objects if obj.type == "MESH"]
    min_v, max_v = world_bounds(meshes)
    center = (min_v + max_v) * 0.5
    height = max_v.z - min_v.z
    scale = asset["height"] / height if height else 1.0

    root = bpy.data.objects.new(asset["name"], None)
    bpy.context.collection.objects.link(root)
    for obj in objects:
        if obj.parent is None:
            obj.parent = root

    root.location = (-center.x * scale, -center.y * scale, -min_v.z * scale)
    root.rotation_euler = asset["rotation"]
    root.scale = (scale, scale, scale)
    return root


def export_asset(asset):
    clear_scene()
    import_asset(asset)
    objects = list(bpy.context.scene.objects)
    meshes = mesh_objects()
    if not meshes:
        raise RuntimeError(f"No meshes imported for {asset['name']}")

    materialize(asset, meshes)
    root = normalize(asset, objects)

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(BLEND_OUT_DIR, exist_ok=True)

    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in objects:
        obj.select_set(True)

    glb_path = os.path.join(OUT_DIR, f"{asset['name']}.glb")
    blend_path = os.path.join(BLEND_OUT_DIR, f"{asset['name']}.blend")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
        export_yup=True,
    )
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Exported {glb_path}")


if __name__ == "__main__":
    for asset in ASSETS:
        export_asset(asset)
