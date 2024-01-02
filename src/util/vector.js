/**
 * Vector utilities
 */
export function crossProduct(v1, v2) {
  return [
    v1[1]*v2[2] - v1[2]*v2[1],
    v1[2]*v2[0] - v1[0]*v2[2],
    v1[0]*v2[1] - v1[1]*v2[0]
  ]
}
export function magnitude(v) {
  return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
}
export function normalize(v) {
  const mag = magnitude(v);
  return [ v[0]/mag, v[1]/mag, v[2]/mag ];
}
export function surfaceNormal(p0, p1, p2) {
  // Points should be in counterclockwise order to make the normal point at you.
  const v1 = [ p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2] ];
  const v2 = [ p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2] ];
  const c = crossProduct(v1, v2);
  return normalize(c);
}