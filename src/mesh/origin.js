import * as THREE from 'three'
// import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
// import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'

export function createOrigin(scene) {
  const directions = [
    new THREE.Vector3( 1, 0, 0 ),
    new THREE.Vector3( 0, 1, 0 ),
    new THREE.Vector3( 0, 0, 1 )
  ]
  const colors = [ 0xff0000, 0x00ff00, 0x0000ff ];
  const origin = new THREE.Vector3( 0, 0, 0 );
  const length = 2;
  const arrows = directions.map((direction, index) => new THREE.ArrowHelper( direction, origin, length, colors[index] ));
  arrows.forEach(arrow => scene.add(arrow));

  // /**
  //  * Text to label coordinate system arrows:
  //  */
  // const fontLoader = new FontLoader();
  // fontLoader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
  //   const textGeometry = new TextGeometry('Hello Three.js!', {
  //     font: font,
  //     size: 0.5,
  //     height: 0.02,
  //     curveSegments: 5,
  //     bevelEnabled: true,
  //     bevelThickness: 0.03,
  //     bevelSize: 0.02,
  //     bevelOffset: 0,
  //     bevelSegments: 5
  //   });
  //   // textGeometry.computeBoundingBox();
  //   // textGeometry.translate(
  //   //     - (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x) * 0.5,
  //   //     0, //- (textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y) * 0.5,
  //   //     - (textGeometry.boundingBox.max.z - textGeometry.boundingBox.min.z) * 0.5,
  //   // );
  //   textGeometry.center();
  //   const text = new THREE.Mesh(textGeometry, material);
  //   scene.add(text);
  // });
}
