import { Point2D, TextProps } from '@flam/shared';
import { BaseShape } from './BaseShape.js';

export class TextShape extends BaseShape {
  public readonly type = 'text';
  public text: string;
  public fontSize: number;
  public fontFamily: string;
  public textAlign: 'left' | 'center' | 'right';

  constructor(props: TextProps) {
    super(props);
    this.text = props.text;
    this.fontSize = props.fontSize || 16;
    this.fontFamily = props.fontFamily || 'Inter, sans-serif';
    this.textAlign = props.textAlign || 'left';
  }

  protected drawGeometry(ctx: CanvasRenderingContext2D): void {
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    ctx.fillStyle = this.strokeColor; // For text, strokeColor acts as font color
    ctx.textBaseline = 'top';
    ctx.textAlign = this.textAlign;

    const lines = this.text.split('\n');
    const lineHeight = this.fontSize * 1.25;

    let drawX = this.x;
    if (this.textAlign === 'center') {
      drawX = this.x + this.width / 2;
    } else if (this.textAlign === 'right') {
      drawX = this.x + this.width;
    }

    lines.forEach((line, index) => {
      ctx.fillText(line, drawX, this.y + index * lineHeight);
    });
  }

  public hitTest(worldPoint: Point2D): boolean {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    const dx = worldPoint.x - cx;
    const dy = worldPoint.y - cy;
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);

    const localX = cos * dx - sin * dy + cx;
    const localY = sin * dx + cos * dy + cy;

    return (
      localX >= this.x &&
      localX <= this.x + this.width &&
      localY >= this.y &&
      localY <= this.y + this.height
    );
  }

  public clone(newId?: string): TextShape {
    return new TextShape({
      ...this.serialize(),
      id: newId ?? this.id,
    });
  }

  public serialize(): TextProps {
    return {
      id: this.id,
      type: 'text',
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      strokeColor: this.strokeColor,
      fillColor: this.fillColor,
      strokeWidth: this.strokeWidth,
      opacity: this.opacity,
      zIndex: this.zIndex,
      version: this.version,
      text: this.text,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      textAlign: this.textAlign,
    };
  }
}
