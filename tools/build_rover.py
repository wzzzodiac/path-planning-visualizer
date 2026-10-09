"""Reproducible Blender asset. Units: grid cells; GLB forward +Z, wheel axles X."""
from pathlib import Path
from math import pi
import bpy

ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
root=bpy.data.objects.new('RoverRoot',None);bpy.context.collection.objects.link(root)
def mat(name,color,metal=0,rough=.5):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 return m
gold=mat('SafetyOchre',(.95,.47,.075),.35,.38)
ivory=mat('CeramicIvory',(.81,.86,.81),.2,.4)
dark=mat('Graphite',(.038,.057,.071),.5,.4)
rubber=mat('Rubber',(.018,.025,.03),.05,.9)
glass=mat('Optics',(.06,.28,.37),.65,.15)
def parent(obj,p=root):
 bpy.context.view_layer.update();world=obj.matrix_world.copy();obj.parent=p;obj.matrix_world=world
 return obj
def cube(name,loc,scale,material,bevel=.03):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(material)
 if bevel:
  mod=o.modifiers.new('MachinedEdges','BEVEL');mod.width=bevel;mod.segments=3
  o.modifiers.new('WeightedNormals','WEIGHTED_NORMAL')
 return parent(o)
def cyl(name,loc,radius,depth,material,rotation=(0,0,0)):
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=radius,depth=depth,location=loc,rotation=rotation);o=bpy.context.object;o.name=name;o.data.materials.append(material)
 bevel=o.modifiers.new('RimBevel','BEVEL');bevel.width=.012;bevel.segments=2
 o.modifiers.new('WeightedNormals','WEIGHTED_NORMAL');return parent(o)
cube('Chassis',(0,0,.27),(.57,.9,.16),dark)
cube('Shell',(0,-.04,.42),(.6,.82,.24),gold,.055)
cube('TopCover',(0,.04,.555),(.45,.49,.045),ivory,.022)
for side,x in [('L',-.36),('R',.36)]:
 for end,y in [('F',-.33),('B',.33)]:
  pivot=bpy.data.objects.new(f'Wheel_{side}{end}',None);bpy.context.collection.objects.link(pivot);pivot.location=(x,y,.22);parent(pivot)
  tire=cyl(f'Tire_{side}{end}',(x,y,.22),.215,.17,rubber,(0,pi/2,0));parent(tire,pivot)
  hub=cyl(f'Hub_{side}{end}',(x+(-.091 if x<0 else .091),y,.22),.115,.018,ivory,(0,pi/2,0));parent(hub,pivot)
  cap=cyl(f'Cap_{side}{end}',(x+(-.105 if x<0 else .105),y,.22),.047,.022,dark,(0,pi/2,0));parent(cap,pivot)
  for n in range(12):
   from math import sin,cos
   a=n*pi/6;lug=cube(f'Tread_{side}{end}_{n}',(x,y+sin(a)*.205,.22+cos(a)*.205),(.18,.046,.028),dark,.005);lug.rotation_euler.x=-a;parent(lug,pivot)
cube('FrontBumper',(0,-.52,.26),(.65,.065,.08),ivory,.016)
cube('RearBumper',(0,.5,.26),(.65,.065,.08),dark,.016)
for x in [-.205,.205]:cube('Headlight',(x,-.462,.44),(.13,.02,.055),ivory,.009)
cyl('SensorMast',(0,.15,.71),.027,.3,dark)
cyl('LidarHousing',(0,.15,.89),.11,.10,ivory)
cyl('LidarOptics',(0,.15,.90),.114,.028,glass)
cube('CameraHousing',(0,-.38,.57),(.19,.14,.10),dark,.018)
cyl('CameraLens',(0,-.462,.57),.043,.025,glass,(pi/2,0,0))
for i in range(5):cube('CoolingVent',(i*.065-.13,.25,.584),(.027,.12,.012),dark,.003)
cube('AntennaBase',(.21,.27,.58),(.06,.06,.05),dark)
cyl('Antenna',(.21,.27,.79),.009,.38,dark)
bpy.ops.object.select_all(action='DESELECT')
for o in [root,*root.children_recursive]:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets'/'rover.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets'/'rover.glb'),export_format='GLB',use_selection=True,export_apply=True)
print('EXPORTED RoverRoot with four Wheel pivots; no camera, floor or lights')

