import { Point2D } from '@flam/shared';

/**
 * Calculates perpendicular distance from a point to a line segment.
 */
function perpendicularDistance(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
  let dx = lineEnd.x - lineStart.x;
  let dy = lineEnd.y - lineStart.y;

  const mag = Math.hypot(dx, dy);
  if (mag > 0) {
    dx /= mag;
    dy /= mag;
  }

  const pvx = point.x - lineStart.x;
  const pvy = point.y - lineStart.y;

  // Project vector onto normalized line segment direction
  const pvdot = dx * pvx + dy * pvy;

  // Clamped projection
  const dsx = pvdot * dx;
  const dsy = pvdot * dy;

  const ax = pvx - dsx;
  const ay = pvy - dsy;

  return Math.hypot(ax, ay);
}

/**
 * Ramer-Douglas-Peucker (RDP) Algorithm:
 * Reduces the number of points in a curve that is approximated by a series of points.
 * Dramatically reduces freehand path coordinate size for network and GPU rasterization.
 *
 * @param points Array of Point2D
 * @param epsilon Distance tolerance (default: 1.2 world units)
 */
export function simplifyPathRDP(points: Point2D[], epsilon: number = 1.2): Point2D[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }

  if (maxDistance > epsilon) {
    // Recursive divide and conquer
    const left = simplifyPathRDP(points.slice(0, index + 1), epsilon);
    const right = simplifyPathRDP(points.slice(index), epsilon);

    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [points[0], points[end]];
  }
}
