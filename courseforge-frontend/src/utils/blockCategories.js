export const COMPLEX_BLOCKS = ['video', 'interactive-video', 'scenario'];

export const INTERACTIVE_BLOCKS = [
  'process',
  'image-stack',
  'flashcard',
  'table',
  'tabs',
  'accordion',
  'accordian',
  'quote',
  'image-hotspot',
  'columns',
  'quiz',
  'mcq',
  'true_false',
  'fill_blanks',
  'multi_select',
  'matching'
];

export const SIMPLE_BLOCKS = [
  'heading',
  'heading-1',
  'text',
  'ai-generated',
  'image',
  'button',
  'list',
  'audio'
];

/**
 * Get the category of a block type.
 * @param {string} type 
 * @returns {'complex'|'interactive'|'simple'|'unknown'}
 */
export function getBlockCategory(type) {
  if (!type) return 'unknown';
  const t = type.toLowerCase().trim();
  if (COMPLEX_BLOCKS.includes(t)) return 'complex';
  if (INTERACTIVE_BLOCKS.includes(t)) return 'interactive';
  if (SIMPLE_BLOCKS.includes(t)) return 'simple';
  return 'unknown';
}

/**
 * Checks if a block of a given type can be added to the slide based on its current elements.
 * @param {Array} elements Current elements on the slide
 * @param {string} newBlockType Type of the new block to add
 * @returns {boolean}
 */
export function canAddBlockToSlide(elements = [], newBlockType) {
  if (!newBlockType) return false;
  const category = getBlockCategory(newBlockType);
  if (category === 'unknown') return false;

  // If slide is empty, any valid block category is allowed
  if (!elements || elements.length === 0) return true;

  // Rule 1: If slide has a complex block, no other blocks can exist
  const hasComplex = elements.some(el => getBlockCategory(el.type) === 'complex');
  if (hasComplex) return false;

  // Rule 2: If the new block is complex, it can only be added if the slide is empty
  if (category === 'complex' && elements.length > 0) return false;

  return true;
}

/**
 * Check if a simple block collides vertically with any interactive blocks.
 * @param {Object} block The simple block being dragged/resized, with { y, height }
 * @param {Array} elements All elements currently on the slide
 * @returns {boolean} True if there is a vertical collision
 */
export function checkYAxisCollision(block, elements = []) {
  const category = getBlockCategory(block.type);
  if (category !== 'simple') return false;

  const yStart = block.y ?? 0;
  const yEnd = yStart + (block.height ?? 0);

  for (const el of elements) {
    if (el.id === block.id) continue;

    const elCategory = getBlockCategory(el.type);
    if (elCategory === 'interactive') {
      const elYStart = el.y ?? 0;
      const elYEnd = elYStart + (el.height ?? 0);

      // Y-axis overlap condition
      if (yStart < elYEnd && yEnd > elYStart) {
        return true;
      }
    }
  }

  return false;
}
