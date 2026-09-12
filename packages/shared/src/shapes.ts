export type ShapeType =
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'text'
  | 'freehand';

export interface Point2D {
  x: number;
  y: number;
}

export interface IBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export type BoundingBox = IBoundingBox;

export interface BaseShapeProps {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  zIndex: number;
  version: number;
}

export interface RectangleProps extends BaseShapeProps {
  type: 'rectangle';
  cornerRadius?: number;
}

export interface CircleProps extends BaseShapeProps {
  type: 'circle';
}

export interface LineProps extends BaseShapeProps {
  type: 'line';
  x2: number;
  y2: number;
}

export interface ArrowProps extends BaseShapeProps {
  type: 'arrow';
  x2: number;
  y2: number;
  headSize?: number;
}

export interface TextProps extends BaseShapeProps {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface FreehandProps extends BaseShapeProps {
  type: 'freehand';
  points: Point2D[];
}

export type ShapeDTO =
  | RectangleProps
  | CircleProps
  | LineProps
  | ArrowProps
  | TextProps
  | FreehandProps;

export type ShapeUpdateDTO = Partial<Omit<BaseShapeProps, 'id' | 'type'>> & {
  id: string;
  type?: ShapeType;
  x2?: number;
  y2?: number;
  points?: Point2D[];
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  cornerRadius?: number;
  headSize?: number;
};
