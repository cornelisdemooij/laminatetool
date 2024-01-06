import * as THREE from 'three'

export function createRenderer(sizes, canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  })
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  return renderer;
}
