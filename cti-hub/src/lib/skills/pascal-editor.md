---
name: "pascal-editor"
description: "Browser-based 3D building editor for architectural design and modeling. Use when the user needs to create, edit, or visualize building designs in 3D without expensive CAD software. Supports 3D modeling, floor plan creation, material selection, and export to common formats. Runs entirely in the browser - no AutoCAD, no Revit, no expensive licenses required."
license: MIT
metadata:
  version: 1.0.0
  author: BoomerAng9
  category: design
  updated: 2026-03-26
---

# Pascal 3D Building Editor

A complete browser-based 3D building design and editing system. Pascal enables architects, designers, and hobbyists to create professional-grade building models without expensive CAD licenses.

## Overview

Pascal provides:
- **3D Modeling**: Create walls, floors, roofs, and custom geometries
- **Floor Plans**: Draw and edit 2D floor plans that auto-generate 3D structures
- **Material Library**: Apply realistic materials (wood, concrete, glass, brick, etc.)
- **Export Formats**: OBJ, GLTF, STL, and JSON for interoperability
- **Browser-Native**: Zero installation, runs on any modern browser

## When to Use This Skill

Activate Pascal when the user requests:
- 3D building or architectural modeling
- Floor plan creation or editing
- Interior or exterior space visualization
- Building design without CAD software
- Exporting 3D models for 3D printing or rendering
- Quick architectural prototyping
- Educational building design exercises

## Core Capabilities

### 1. 3D Modeling

Create and manipulate 3D building elements:

```javascript
// Create a rectangular room
pascal.createRoom({
  width: 5,      // meters
  depth: 4,      // meters
  height: 2.8,   // meters
  position: { x: 0, y: 0, z: 0 }
});

// Add a wall opening (door)
pascal.addDoor({
  wall: 'north',
  position: 1.5,  // meters from corner
  width: 0.9,
  height: 2.1
});

// Add a window
pascal.addWindow({
  wall: 'east',
  position: 1.0,
  width: 1.2,
  height: 1.0,
  sillHeight: 0.9
});
```

### 2. Floor Plan Editor

Draw building layouts in 2D, see instant 3D results:

```javascript
// Start a new floor plan
pascal.floorPlan.new({
  name: "Ground Floor",
  level: 0,
  elevation: 0
});

// Draw walls
pascal.floorPlan.drawWall([
  { x: 0, y: 0 },
  { x: 5000, y: 0 },
  { x: 5000, y: 4000 },
  { x: 0, y: 4000 }
], {
  thickness: 200,  // mm
  height: 2800     // mm
});

// Auto-generate 3D from 2D
pascal.floorPlan.extrude({
  autoClose: true,
  generateCeiling: true
});
```

### 3. Material System

Apply and customize materials:

```javascript
// Apply preset material
pascal.materials.apply('wall-01', 'brick-red');
pascal.materials.apply('floor-01', 'oak-hardwood');
pascal.materials.apply('roof-01', 'slate-dark');

// Create custom material
pascal.materials.create({
  id: 'custom-concrete',
  name: 'Polished Concrete',
  type: 'standard',
  color: '#888888',
  roughness: 0.4,
  metalness: 0.1,
  textureScale: 1.0
});
```

**Built-in Material Categories:**
- **Structural**: Concrete, brick, stone, steel, wood framing
- **Finishes**: Paint (matte, gloss), wallpaper, plaster
- **Flooring**: Hardwood, tile, carpet, vinyl, polished concrete
- **Exterior**: Siding, stucco, shingles, metal panels
- **Transparent**: Clear glass, frosted glass, tinted glass
- **Roofing**: Shingles, tiles, metal, membrane, green roof

### 4. Export & Interoperability

```javascript
// Export to various formats
pascal.export.toOBJ('building.obj');       // Universal 3D format
pascal.export.toGLTF('building.gltf');     // Modern web standard
pascal.export.toSTL('building.stl');       // 3D printing
pascal.export.toJSON('building.pascal');   // Native format

// Import from external sources
pascal.import.fromOBJ('external-model.obj');
pascal.import.fromJSON('previous-project.pascal');
```

## UI Components

### Main Toolbar
```
[Select] [Wall] [Room] [Door] [Window] [Stairs] [Roof] [Measure]
```

### Property Panel
- **Dimensions**: Width, Height, Depth
- **Position**: X, Y, Z coordinates
- **Material**: Selector with preview
- **Level**: Floor assignment

### View Controls
- **Orbit**: Rotate around building
- **Pan**: Move view horizontally
- **Zoom**: Scale in/out
- **Views**: Top, Front, Side, Isometric, Perspective

## Advanced Features

### Multi-Level Buildings

```javascript
// Add additional floors
pascal.addLevel({
  name: "Second Floor",
  elevation: 2800,    // mm above ground
  height: 2600
});

// Copy elements between floors
pascal.duplicateToLevel('ground-floor-walls', 'Second Floor');
```

### Roof Generation

```javascript
// Auto-generate roof from footprint
pascal.roof.generate({
  type: 'gable',
  pitch: 30,          // degrees
  overhang: 300       // mm
});

// Manual roof planes
pascal.roof.addPlane({
  vertices: [...],
  material: 'shingles'
});
```

### Measurement & Annotations

```javascript
// Add dimensions
pascal.measure.addLinear({
  from: 'corner-a',
  to: 'corner-b',
  display: 'above'
});

// Calculate area
const floorArea = pascal.measure.area('ground-floor');
const volume = pascal.measure.volume('building-total');
```

## Best Practices

### 1. Start Simple
- Begin with basic room shapes
- Add complexity incrementally
- Use snap-to-grid for precision

### 2. Organize by Level
- Name floors descriptively ("Ground", "Upper", "Basement")
- Group related elements
- Use consistent elevation spacing

### 3. Material Consistency
- Define a palette before starting
- Use material variants for variation
- Preview at different lighting conditions

### 4. Performance Optimization
- Merge static geometry when possible
- Use LOD (Level of Detail) for complex models
- Limit real-time shadows on mobile

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Toggle 2D/3D view |
| `Tab` | Cycle selection modes |
| `Delete` | Remove selected |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `G` | Grab/move selected |
| `R` | Rotate selected |
| `S` | Scale selected |
| `F` | Focus on selection |
| `1-4` | Switch views (Top/Front/Side/Perspective) |

## Output Artifacts

| Artifact | Format | Description |
|----------|--------|-------------|
| 3D Model | .obj, .gltf, .stl | Full 3D geometry with materials |
| Floor Plans | .svg, .pdf | 2D drawings with dimensions |
| Project File | .pascal | Native format with full editability |
| Material List | .csv | Bill of materials with quantities |
| Screenshots | .png | High-res renders from any angle |

## Integration Patterns

### With Frontend Design
Use Pascal-generated models as 3D backgrounds for property websites, configurators, or virtual tours.

### With Brand Guidelines
Apply consistent color palettes from brand guidelines to building materials and presentation exports.

### With Export Workflows
Export to Three.js for web embedding, Blender for advanced rendering, or Sketchfab for portfolio sharing.

## Browser Requirements

- **WebGL 2.0**: Required for 3D rendering
- **Recommended**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Android 90+
- **Hardware**: GPU with 1GB+ VRAM for complex models

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Model not rendering | Check WebGL is enabled; reduce complexity |
| Slow performance | Enable performance mode; hide internal details |
| Export fails | Check file size limits; try simplified geometry |
| Materials not applying | Ensure UV mapping exists; check material assignments |
| Snap not working | Adjust grid size; check snap settings |

## Related Skills

- **frontend-design** — Use for creating web-based 3D viewers and configurators for Pascal models
- **brand-guidelines** — Apply consistent visual identity to presentation materials and exports
- **skill-creator** — Extend Pascal with custom components or specialized architectural workflows

---

*Pascal: Professional architecture, zero licensing costs, infinite browser accessibility.*
