import * as THREE from 'three'

export function createCamera(sizes, lookAt, scene) {
  const isometric = true;
  const aspectRatio = sizes.width / sizes.height;
  let camera;
  if (isometric) {
    const d = 5;
    camera = new THREE.OrthographicCamera( - d * aspectRatio, d * aspectRatio, d, - d, 1, 1000 );
    camera.position.set( 2*d, 2*d, 2*d ); // all components equal  
  } else {
    const camera = new THREE.PerspectiveCamera(
      60, // Vertical field of view (vFOV) in degrees
      aspectRatio, // Aspect ratio
      0.01, // Near
      1000 // Far
    )
    camera.position.z = 3
  }
  camera.lookAt(lookAt)
  scene.add(camera)
  return camera;
}
