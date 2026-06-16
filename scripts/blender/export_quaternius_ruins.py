import os
import re
import sys

import bpy


EXPORTS = {
    "arch_gothic": ["Arch_Gothic"],
    "arch_round": ["Arch_Round"],
    "arch_round_columns": ["Arch_Round_RoundColumn"],
    "column_round": ["Column_Round"],
    "column_square": ["Column_Square"],
    "stairs": ["Stairs"],
    "stairs_wide": ["Stairs_2"],
    "statue_fox": ["Statue_Fox.001"],
    "statue_stag": ["Statue_Stag"],
    "wall_plain": ["Wall"],
    "wall_arch_gothic": ["Wall_ArchGothic.001"],
    "wall_arch_overgrown": ["Wall_ArchRound_Overgrown"],
    "wall_arch_broken": ["Wall_ArchRound_Overgrown_Broken"],
    "wall_hole": ["Wall_Hole"],
    "wall_overgrown": ["Wall_Overgrown"],
    "floor_diamond": ["Floor_Diamond"],
    "floor_large": ["Floor_SquareLarge"],
    "floor_squares": ["Floor_Squares.001"],
    "floor_standard": ["Floor_Standard"],
    "floor_hole_corner": ["Floor_Hole_Corner.001"],
    "floor_hole_straight": ["Floor_Hole_Straight.001"],
    "floor_tree": ["Floor_Tree"],
    "trapdoor": ["Trapdoor"],
}


def normalize_object(obj):
    obj.location = (0, 0, 0)
    obj.rotation_euler = (0, 0, 0)


def select_named_objects(names):
    bpy.ops.object.select_all(action="DESELECT")
    selected = []
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj is None:
            print(f"missing object: {name}")
            continue
        obj.select_set(True)
        selected.append(obj)
    if selected:
        bpy.context.view_layer.objects.active = selected[0]
    return selected


def export_one(label, names, output_dir):
    selected = select_named_objects(names)
    if not selected:
        return
    for obj in selected:
        normalize_object(obj)
    filepath = os.path.join(output_dir, f"{label}.glb")
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
    )
    print(f"exported {label}: {', '.join(obj.name for obj in selected)}")


def main():
    output_dir = sys.argv[-1]
    os.makedirs(output_dir, exist_ok=True)
    for label, names in EXPORTS.items():
        safe_label = re.sub(r"[^a-z0-9_]+", "_", label.lower()).strip("_")
        export_one(safe_label, names, output_dir)


if __name__ == "__main__":
    main()
