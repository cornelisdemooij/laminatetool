import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'

import './style.css'
import * as json from './IO/json-files'
import { validateLoc, parseLoc } from './locParser'

// Laminate Orientation Code:
const locInputs = document.getElementsByClassName('loc-input');
for (let i = 0; i < locInputs.length; i++) {
  const locInput = locInputs[i];
  locInput.addEventListener('input', (event) => {
    const loc = event.target.value;
    const locIsValid = validateLoc(loc);
    locInput.classList.toggle('invalid', !locIsValid);

    const layup = parseLoc(loc);

    const locExpandeds = locInput.parentElement.getElementsByClassName('loc-expanded');
    for (let j = 0; j < locExpandeds.length; j++) {
      const locExpanded = locExpandeds[j];
      locExpanded.value = layup.join(' ');
    }
  });
}

// Mesh:
let meshData = {
  position: [],
  normal: [],
  uv: [],
  color: []
}

/**
 * File handling
 */
const fileInput = document.getElementById("file-input")
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  const filenameSplit = file.name.split(".");
  const filetype = filenameSplit[filenameSplit.length - 1];
  const reader = new FileReader();
  reader.addEventListener('load', async function(e) {
    const fileContent = e.target.result;
    if (filetype === "json") {
      meshData = await json.parseJson(fileContent);
    }
    updateMeshGeometry();
    updateColorBar('colorNeutral');
  });
  reader.readAsText(file);
  fileInput.value = '';
})

/**
 * Debug
 */
const gui = new GUI({ touchStyles: false });
gui.close();

/**
 * Cursor
 */
const cursor = { x: 0, y: 0 }
window.addEventListener('mousemove', (event) => {
  cursor.x = event.clientX / sizes.width - 0.5;
  cursor.y = -(event.clientY / sizes.height - 0.5);
})

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

window.addEventListener('resize', () => {
  // Update size:
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera:
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer:
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

window.addEventListener('dblclick', () => {
  const fullscreenElement = document.fullscreenElement
    || document.webkitFullscreenElement;
  if (fullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  } else {
    if (canvas.requestFullscreen) {
      canvas.requestFullscreen();
    } else if (canvas.webkitRequestFullscreen) {
      canvas.webkitRequestFullscreen();
    }
  }
})

// Scene
const scene = new THREE.Scene()
const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--background-color');
scene.background = new THREE.Color(backgroundColor);
scene.fog = new THREE.Fog(0xFFFFFF, 10, 100);

// Object (for structure)
const material = new THREE.MeshStandardMaterial()
material.vertexColors = true
material.metalness = 0.3
material.roughness = 0.2
material.flatShading = false
material.wireframe = false
const guiMaterialFolder = gui.addFolder('Material')
guiMaterialFolder.add(material, 'metalness').min(0).max(1)
guiMaterialFolder.add(material, 'roughness').min(0).max(1)
guiMaterialFolder.add(material, 'flatShading').name('Flat Shading')
guiMaterialFolder.add(material, 'wireframe').name('Wire Frame')
guiMaterialFolder.close();

material.side = THREE.FrontSide

const meshGeometry = new THREE.BufferGeometry();

const mesh = new THREE.Mesh(
  meshGeometry,
  material
)
mesh.frustumCulled = false;
scene.add(mesh)

const wireframeLineGeometry = new THREE.BufferGeometry(); //.setFromPoints( linePoints );
const wireframeLineSegments = new THREE.LineSegments( wireframeLineGeometry, new THREE.LineBasicMaterial( { color: 0x000000 } ) );
scene.add( wireframeLineSegments );

// Handling updates to the geometry:
async function updateMeshGeometry() {
  function updateAttribute(object, attribute, data, itemSize) {
    object.setAttribute(attribute, new THREE.BufferAttribute(new Float32Array(data), itemSize));
  }

  updateAttribute(meshGeometry, 'position', meshData.position, 3);
  updateAttribute(meshGeometry, 'normal', meshData.normal, 3);
  updateAttribute(meshGeometry, 'uv', meshData.uv, 2);
  updateAttribute(meshGeometry, 'color', meshData.color, 3);

  // Some custom stuff for drawing the cube wireframe:
  for (let nodeNumber = 0; nodeNumber < meshData.nodes.length; nodeNumber++) {
    meshData.nodes[nodeNumber].onSurface = false;
  }

  for (const surface of meshData.surfaces) {
    for (const nodeNumber of surface.nodeNumbers) {
      meshData.nodes[nodeNumber].onSurface = true;
    }
  }

  const nodePairs = [
    [0, 1], [1, 2], [2, 3], [3, 0], // Bottom
    [0, 4], [1, 5], [2, 6], [3, 7], // Middle
    [4, 5], [5, 6], [6, 7], [7, 4], // Top
  ];
  const wireframeLinePoints = [];
  for (const element of meshData.elements) {
    for (const nodePair of nodePairs) {
      for (const localNodeIndex of nodePair) {
        const nodeNumber = element.nodeNumbers[localNodeIndex];
        const xyz = meshData.nodes[nodeNumber].xyz;
        wireframeLinePoints.push( new THREE.Vector3( xyz[0], xyz[1], xyz[2] ) );
      }
    }
  }
  updateAttribute(wireframeLineGeometry, 'points', wireframeLinePoints, 3);
}

/**
 * Coordinate system arrows:
 */
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
// const loader = new THREE.FontLoader();
// loader.load('fonts/helvetiker_regular.typeface.json', function ( font ) {
//   const textGeometry = new THREE.TextGeometry('Hello three.js!', {
//     size: 80,
//     height: 5,
//     curveSegments: 12,
//     bevelEnabled: true,
//     bevelThickness: 10,
//     bevelSize: 8,
//     bevelOffset: 0,
//     bevelSegments: 5
//   });
//   scene.add(textGeometry)
// });

/**
 * Lights:
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
scene.add(ambientLight)

const pointLight1 = new THREE.PointLight(0xffffff, 0.7)
pointLight1.position.x = 2
pointLight1.position.y = 3
pointLight1.position.z = 4
scene.add(pointLight1)
pointLight1.visible = false;

const pointLight2 = new THREE.PointLight(0xffffff, 0.7)
pointLight2.position.x = -2
pointLight2.position.y = -3
pointLight2.position.z = -4
scene.add(pointLight2)
pointLight2.visible = false;

const lightControls = {
  ambientLight: () => { ambientLight.visible = !ambientLight.visible; },
  switchLight1: () => { pointLight1.visible = !pointLight1.visible; },
  switchLight2: () => { pointLight2.visible = !pointLight2.visible; }
}
const guiLightFolder = gui.addFolder('Light');
guiLightFolder.add(lightControls, 'ambientLight').name('Ambient Light');
guiLightFolder.add(lightControls, 'switchLight1').name('Light 1');
guiLightFolder.add(lightControls, 'switchLight2').name('Light 2');
guiLightFolder.close();

// Controls:
const guiVisibilityFolder = gui.addFolder('Visibility');
guiVisibilityFolder.add(mesh, 'visible').name('Mesh Visible')
guiVisibilityFolder.add(wireframeLineSegments, 'visible').name('Element Grid Visible')
guiVisibilityFolder.close();

const guiPositionFolder = gui.addFolder('Position');
guiPositionFolder.add(mesh.position, 'x', -3, 3, 0.01).name('Mesh X')
guiPositionFolder.add(mesh.position, 'y', -3, 3, 0.01).name('Mesh Y')
guiPositionFolder.add(mesh.position, 'z', -3, 3, 0.01).name('Mesh Z')
guiPositionFolder.close();

// Camera
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
camera.lookAt(mesh.position)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Animate
const clock = new THREE.Clock()

const tick = () => {
  const elapsedTime = clock.getElapsedTime()

  // Update controls:
  controls.update();

  // Render
  renderer.render(scene, camera)

  // Call tick again on the next frame
  window.requestAnimationFrame(tick)
}

tick()