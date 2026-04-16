import * as opentype from 'opentype.js';
import { DetectedCharacter, FontConfig } from '../types';

export async function buildFont(
  characters: DetectedCharacter[],
  config: FontConfig
): Promise<ArrayBuffer> {
  const notdefGlyph = new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: 650,
    path: new opentype.Path()
  });

  const glyphs = [notdefGlyph];
  
  // Font metrics
  const unitsPerEm = 1000;
  const ascender = 800;
  const descender = -200;
  
  for (const char of characters) {
    if (!char.svgPath) continue;
    
    // Convert SVG path string to opentype.Path
    // Note: Potrace output might need scaling/flipping
    // Potrace usually outputs with Y-down, OpenType needs Y-up
    const path = new opentype.Path();
    
    // Simple path parsing
    const glyphPath = new opentype.Path();
    
    // Very basic SVG path parser for M, L, Q, C, Z commands
    const pathData = char.svgPath;
    const commands = pathData.match(/[a-df-z][^a-df-z]*/ig) || [];
    
    for (const cmd of commands) {
      const type = cmd[0];
      const args = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat);
      
      const scale = unitsPerEm / 500;
      const transformX = (x: number) => x * scale;
      const transformY = (y: number) => (500 - y) * scale + descender;

      switch (type.toUpperCase()) {
        case 'M':
          glyphPath.moveTo(transformX(args[0]), transformY(args[1]));
          break;
        case 'L':
          glyphPath.lineTo(transformX(args[0]), transformY(args[1]));
          break;
        case 'Q':
          glyphPath.quadraticCurveTo(
            transformX(args[0]), transformY(args[1]),
            transformX(args[2]), transformY(args[3])
          );
          break;
        case 'C':
          glyphPath.curveTo(
            transformX(args[0]), transformY(args[1]),
            transformX(args[2]), transformY(args[3]),
            transformX(args[4]), transformY(args[5])
          );
          break;
        case 'Z':
          glyphPath.close();
          break;
      }
    }

    const glyph = new opentype.Glyph({
      name: char.char,
      unicode: char.char.charCodeAt(0),
      advanceWidth: 600 + config.letterSpacing * 10,
      path: glyphPath
    });
    
    glyphs.push(glyph);
  }

  const font = new opentype.Font({
    familyName: config.name || 'HandFont',
    styleName: 'Regular',
    unitsPerEm: unitsPerEm,
    ascender: ascender,
    descender: descender,
    glyphs: glyphs
  });

  return font.toArrayBuffer();
}
