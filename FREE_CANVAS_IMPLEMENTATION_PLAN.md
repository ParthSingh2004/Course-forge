# Free Canvas Engine Implementation Plan

## Goal Description

The objective is to overhaul the current vertical-stack block engine into a strict-bounds (1920x1080) canvas where authors can place multiple blocks on the same slide. 

The blocks are grouped into three categories:
1. **Complex Blocks**: 1-slide exclusive. No other blocks can be added.
   * Video Block
   * Interactive Video Block
   * Scenario Block
2. **Interactive Blocks**: These act as full-width horizontal bands. They occupy the entire X-axis and have a fixed Y-axis height. They can be reordered vertically, but no other block can exist side-by-side with them.
   * Process Block
   * Image Stack Block
   * Flashcard Block
   * Table Block
   * Tabs Block
   * Accordion Block
   * Quote Block
   * Image Hotspot Block
3. **Simple Blocks**: Resizable and draggable (X and Y axis). They can be placed anywhere in the empty space above or below Interactive blocks.
   * Heading Block
   * Text Block
   * Image Block
   * Button Block
   * List Block
   * Audio Block

*(Note: Statement Block and Canvas Block will be removed from the UI menus as they are now redundant, though their underlying files will remain).*

## Execution Phases

To ensure stability and prevent blind development, the overhaul will be executed in the following controlled phases:

### Phase 1: Foundation & Dependencies
* **Objective:** Set up the necessary tools and logic rules without breaking the existing UI.
* **Tasks:**
  * Install `react-rnd` for drag-and-drop/resizing.
  * Create `src/utils/blockCategories.js`.
  * Define arrays for `COMPLEX_BLOCKS`, `INTERACTIVE_BLOCKS`, and `SIMPLE_BLOCKS` matching the lists above.
  * Create helper functions for logic: `canAddBlockToSlide()`, `checkYAxisCollision()`.
  * Remove "Statement Block" and "Canvas Block" from the `App.jsx` sidebar/menu (leaving files intact).

### Phase 2: State Management Updates
* **Objective:** Update the core state logic to support coordinates and enforcement rules.
* **Tasks:**
  * Modify `addBlock` in `App.jsx` to append default `x`, `y`, `width`, and `height` properties to Simple blocks.
  * Integrate `canAddBlockToSlide()` into the UI to disable block-addition buttons if a Complex block is already present on the active slide.
  * Enforce that a Complex block cannot be added if the slide already contains elements.

### Phase 3: The Canvas Render Engine
* **Objective:** Transition the slide rendering from a vertical list to a fixed-bound canvas.
* **Tasks:**
  * Modify the `.cf-editor-main` container in `App.jsx` to act as a 1920x1080 fixed aspect-ratio canvas that scales down to fit the author's screen.
  * Render Interactive blocks as full-width horizontal bands.
  * Render Simple blocks using `react-rnd` with absolute positioning.
  * Implement `onDragStop` and `onResizeStop` handlers for Simple blocks to check Y-axis collision against Interactive blocks. If a collision is detected, revert the block to its previous coordinates.

### Phase 4: Block Component Cleanup
* **Objective:** Polish the individual block components for the new canvas.
* **Tasks:**
  * Remove legacy up/down arrow controls from Simple blocks, as they will now be freely dragged.
  * Ensure Interactive blocks gracefully handle taking up 100% of the canvas width.

## Verification Plan

### Automated/Manual Testing
- **Phase 1 & 2 Verification**: Attempt to add a Complex block to an occupied slide (should fail). Attempt to add a block to a slide occupied by a Complex block (should fail).
- **Phase 3 Verification**: Drag a Simple block so its Y-coordinates overlap an Interactive block. Upon releasing the mouse, the block should revert to its safe position.
- **Phase 4 Verification**: Visual inspection of scaled 1920x1080 bounds on various window sizes.
