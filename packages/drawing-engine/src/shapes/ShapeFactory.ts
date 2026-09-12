import { ShapeDTO } from '@flam/shared';
import { BaseShape } from './BaseShape.js';
import { Rectangle } from './Rectangle.js';
import { Circle } from './Circle.js';
import { Line } from './Line.js';
import { Arrow } from './Arrow.js';
import { TextShape } from './TextShape.js';
import { FreehandPath } from './FreehandPath.js';

export class ShapeFactory {
  /**
   * Factory Pattern:
   * Polymorphic instantiation of concrete BaseShape subclasses from serializable DTOs.
   */
  static fromDTO(dto: ShapeDTO): BaseShape {
    switch (dto.type) {
      case 'rectangle':
        return new Rectangle(dto);
      case 'circle':
        return new Circle(dto);
      case 'line':
        return new Line(dto);
      case 'arrow':
        return new Arrow(dto);
      case 'text':
        return new TextShape(dto);
      case 'freehand':
        return new FreehandPath(dto);
      default: {
        const _exhaustiveCheck: never = dto;
        throw new Error(`Unsupported shape type: ${JSON.stringify(_exhaustiveCheck)}`);
      }
    }
  }
}
