import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'

import './style.css'
import * as json from './IO/json-files'
import { dragElement } from './util/drag-element'

dragElement(document.getElementById("color-gradient-container")); // Make the color gradient element draggable.
const COLOR_BAR_PRECISION = 3; // Number of significant digits in color bar labels.

// Mesh:
let meshData = {
  position: [],
  normal: [],
  uv: [],
  color: [],

  positionInitial: [],
  positionDeformed: [],

  colorBC: [],
  colorNeutral: [],
  colorSurfaceLoads: [],
  colorSurfaceLoadsX: [],
  colorSurfaceLoadsY: [],
  colorSurfaceLoadsZ: [],

  colorDisp: [],
  colorDispX: [],
  colorDispY: [],
  colorDispZ: [],

  colorE11: [],
  colorE22: [],
  colorE33: [],
  colorE12: [],
  colorE23: [],
  colorE31: [],

  colorEPrincipal: [],
  colorEi: [],
  colorEii: [],
  colorEiii: [],

  colorTraction: [],
  colorTractionX: [],
  colorTractionY: [],
  colorTractionZ: [],

  colorRelativeErrorNodeTraction: [],
  colorRelativeErrorNodeTractionX: [],
  colorRelativeErrorNodeTractionY: [],
  colorRelativeErrorNodeTractionZ: [],

  colorExpectedNodalCoefficients: [],
  colorExpectedNodalCoefficientsX: [],
  colorExpectedNodalCoefficientsY: [],
  colorExpectedNodalCoefficientsZ: [],

  colorReconstructedNodalCoefficients: [],
  colorReconstructedNodalCoefficientsX: [],
  colorReconstructedNodalCoefficientsY: [],
  colorReconstructedNodalCoefficientsZ: [],

  colorRelativeErrorNodalCoefficients: [],
  colorRelativeErrorNodalCoefficientsX: [],
  colorRelativeErrorNodalCoefficientsY: [],
  colorRelativeErrorNodalCoefficientsZ: [],

  // Forces:
  linePoints: [],

  // Sensors:
  sensorPosition: [],
  sensorNormal: [],
  sensorUv: [],
  sensorColor: [],

  sensorColorE11: [],
  sensorColorE22: [],
  sensorColorE33: [],
  sensorColorE12: [],
  sensorColorE23: [],
  sensorColorE31: [],
  sensorColorNeutral: [],

  sensorFiberLines: [],
  sensorFiberColor: [],

  // Extrapolated Sensors:
  extrapolatedSensorPosition: [],
  extrapolatedSensorNormal: [],
  extrapolatedSensorUv: [],
  extrapolatedSensorColor: [],

  extrapolatedSensorColorE11: [],
  extrapolatedSensorColorE22: [],
  extrapolatedSensorColorE33: [],
  extrapolatedSensorColorE12: [],
  extrapolatedSensorColorE23: [],
  extrapolatedSensorColorE31: [],

  // Color scales:
  colorScales: {}
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

// Lines (for forces)
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
const lineGeometry = new THREE.BufferGeometry();
const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
lines.frustumCulled = false;
scene.add(lines);

// Lines (for fiber sensors)
const lineFiberMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
const lineFiberGeometry = new THREE.BufferGeometry();
const linesFiber = new THREE.LineSegments(lineFiberGeometry, lineFiberMaterial);
linesFiber.frustumCulled = false;
scene.add(linesFiber);

// Object (for sensors)
const materialSensor = new THREE.MeshStandardMaterial()
materialSensor.vertexColors = true
materialSensor.metalness = 0.0
materialSensor.roughness = 0.0
const guiMaterialSensorFolder = gui.addFolder('Material Sensor')
guiMaterialSensorFolder.add(materialSensor, 'metalness').min(0).max(1)
guiMaterialSensorFolder.add(materialSensor, 'roughness').min(0).max(1)
guiMaterialSensorFolder.close();

materialSensor.side = THREE.FrontSide

const meshGeometrySensor = new THREE.BufferGeometry();

const meshSensor = new THREE.Mesh(
  meshGeometrySensor,
  materialSensor
)
meshSensor.frustumCulled = false;
scene.add(meshSensor)

const meshGeometryExtrapolatedSensor = new THREE.BufferGeometry();

const meshExtrapolatedSensor = new THREE.Mesh(
  meshGeometryExtrapolatedSensor,
  materialSensor
)
meshExtrapolatedSensor.frustumCulled = false;
scene.add(meshExtrapolatedSensor)

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

  // Lines (for forces)
  lineGeometry.setFromPoints(meshData.linePoints);

  // Lines (for fiber sensors)
  console.dir(meshData.sensorFiberLines);
  lineFiberGeometry.setFromPoints(meshData.sensorFiberLines);

  // Object (for sensors)
  updateAttribute(meshGeometrySensor, 'position', meshData.sensorPosition, 3);
  updateAttribute(meshGeometrySensor, 'normal', meshData.sensorNormal, 3);
  updateAttribute(meshGeometrySensor, 'uv', meshData.sensorUv, 2);
  updateAttribute(meshGeometrySensor, 'color', meshData.sensorColor, 3);

  // Object (for extrapolated sensors)
  updateAttribute(meshGeometryExtrapolatedSensor, 'position', meshData.extrapolatedSensorPosition, 3);
  updateAttribute(meshGeometryExtrapolatedSensor, 'normal', meshData.extrapolatedSensorNormal, 3);
  updateAttribute(meshGeometryExtrapolatedSensor, 'uv', meshData.extrapolatedSensorUv, 2);
  updateAttribute(meshGeometryExtrapolatedSensor, 'color', meshData.extrapolatedSensorColor, 3);

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

// Labels for the color scale:
const colorNameToColorDescription = {
  'colorBC': 'Boundary conditions',
  'colorNeutral': 'Mesh',
  'colorSurfaceLoads': 'Surface loads',
  'colorSurfaceLoadsX': 'Surface loads in X',
  'colorSurfaceLoadsY': 'Surface loads in Y',
  'colorSurfaceLoadsZ': 'Surface loads in Z',
  'colorDisp': 'All displacements',
  'colorDispX': 'Displacements in X',
  'colorDispY': 'Displacements in Y',
  'colorDispZ': 'Displacements in Z',
  'colorE11': 'Strain E11',
  'colorE22': 'Strain E22',
  'colorE33': 'Strain E33',
  'colorE12': 'Strain E12',
  'colorE23': 'Strain E23',
  'colorE31': 'Strain E31',
  'colorEPrincipal': 'Principal strains',
  'colorEi': 'Principal strain Ei',
  'colorEii': 'Principal strain Eii',
  'colorEiii': 'Principal strain Eiii',
  'colorTraction': 'All tractions',
  'colorTractionX': 'Tractions in X',
  'colorTractionY': 'Tractions in Y',
  'colorTractionZ': 'Tractions in Z',
  'sensorColorE11': 'Strain sensors E11',
  'sensorColorE22': 'Strain sensors E22',
  'sensorColorE33': 'Strain sensors E33',
  'sensorColorE12': 'Strain sensors E12',
  'sensorColorE23': 'Strain sensors E23',
  'sensorColorE31': 'Strain sensors E31',
  'sensorColorNeutral': 'Strain sensors',
  'extrapolatedSensorColorE11': 'Extrapolated strain sensors E11',
  'extrapolatedSensorColorE22': 'Extrapolated strain sensors E22',
  'extrapolatedSensorColorE33': 'Extrapolated strain sensors E33',
  'extrapolatedSensorColorE12': 'Extrapolated strain sensors E12',
  'extrapolatedSensorColorE23': 'Extrapolated strain sensors E23',
  'extrapolatedSensorColorE31': 'Extrapolated strain sensors E31',
  'colorRelativeErrorNodeTraction': 'All relative traction errors',
  'colorRelativeErrorNodeTractionX': 'Relative traction errors in X',
  'colorRelativeErrorNodeTractionY': 'Relative traction errors in Y',
  'colorRelativeErrorNodeTractionZ': 'Relative traction errors in Z',
  'colorExpectedNodalCoefficients': 'All expected coefficients',
  'colorExpectedNodalCoefficientsX': 'Expected coefficients in X',
  'colorExpectedNodalCoefficientsY': 'Expected coefficients in Y',
  'colorExpectedNodalCoefficientsZ': 'Expected coefficients in Z',
  'colorReconstructedNodalCoefficients': 'All reconstructed coefficients',
  'colorReconstructedNodalCoefficientsX': 'Reconstructed coefficients in X',
  'colorReconstructedNodalCoefficientsY': 'Reconstructed coefficients in Y',
  'colorReconstructedNodalCoefficientsZ': 'Reconstructed coefficients in Z',
  'colorRelativeErrorNodalCoefficients': 'Relative coefficient errors',
  'colorRelativeErrorNodalCoefficientsX': 'Relative coefficient errors in X',
  'colorRelativeErrorNodalCoefficientsY': 'Relative coefficient errors in Y',
  'colorRelativeErrorNodalCoefficientsZ': 'Relative coefficient errors in Z',
};

// Handle updates to the color scale:
let lastColorName = 'colorNeutral';
async function updateColorBar(colorName) {
  lastColorName = colorName;

  const colorGradientContainer = document.getElementById('color-gradient-container');
  const colorGradientTitle = document.getElementById('color-gradient-title');
  const colorGradientLabels = [0,1,2,3,4,5,6,7].map(number => document.getElementById(`color-gradient-${number}`));

  colorGradientTitle.innerText = colorNameToColorDescription[colorName];

  if (meshData.colorScales.hasOwnProperty(colorName)) {
    colorGradientContainer.classList.add('visible');
    const minimum = meshData.colorScales[colorName].minimum;
    const maximum = meshData.colorScales[colorName].maximum;
    colorGradientLabels.map((label, index) => {
      label.innerText = (minimum + (maximum-minimum) * (7 - index) / 7).toPrecision(COLOR_BAR_PRECISION);// + "%"; TODO: Add a fix for showing percentages only when appropriate.
    });
  } else {
    colorGradientContainer.classList.remove('visible');
    colorGradientLabels.map(label => label.innerText = 'Unknown');
  }
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
guiVisibilityFolder.add(lines, 'visible').name('Forces Visible').setValue(false)
guiVisibilityFolder.add(linesFiber, 'visible').name('Fiber Visible').setValue(true)
guiVisibilityFolder.add(meshSensor, 'visible').name('Sensors Visible')
guiVisibilityFolder.add(meshExtrapolatedSensor, 'visible').name('Extrapolated Sensors Visible').setValue(false)
guiVisibilityFolder.add(wireframeLineSegments, 'visible').name('Element Grid Visible')
guiVisibilityFolder.close();

const positionControls = {
  positionInitial: () => { meshData.position = meshData.positionInitial; updateMeshGeometry(); },
  positionDeformed: () => { meshData.position = meshData.positionDeformed; updateMeshGeometry(); },
  deformationScale: 1
}
const guiPositionFolder = gui.addFolder('Position');
guiPositionFolder.add(mesh.position, 'x', -3, 3, 0.01).name('Mesh X')
guiPositionFolder.add(mesh.position, 'y', -3, 3, 0.01).name('Mesh Y')
guiPositionFolder.add(mesh.position, 'z', -3, 3, 0.01).name('Mesh Z')
guiPositionFolder.add(positionControls, 'positionInitial').name('Initial position');
guiPositionFolder.add(positionControls, 'positionDeformed').name('Deformed position');
guiPositionFolder.add(positionControls, 'deformationScale').min(0).max(10000).name('Deformation scale').onChange(
  (deformationScale) => { 
    for (let i = 0; i < meshData.positionDisplacement.length; i++) {
      meshData.positionDeformed[i] = meshData.positionInitial[i] + meshData.positionDisplacement[i] * deformationScale;
    }
    meshData.position = meshData.positionDeformed; updateMeshGeometry();
    updateMeshGeometry();
  }
);
guiPositionFolder.close();

const colorControls = {
  colorBC: () => { meshData.color = meshData.colorBC; updateMeshGeometry(); updateColorBar('colorBC') },
  colorNeutral: () => { meshData.color = meshData.colorNeutral; updateMeshGeometry(); updateColorBar('colorNeutral') },
  colorSurfaceLoads: () => { meshData.color = meshData.colorSurfaceLoads; updateMeshGeometry(); updateColorBar('colorSurfaceLoads') },
  colorSurfaceLoadsX: () => { meshData.color = meshData.colorSurfaceLoadsX; updateMeshGeometry(); updateColorBar('colorSurfaceLoadsX') },
  colorSurfaceLoadsY: () => { meshData.color = meshData.colorSurfaceLoadsY; updateMeshGeometry(); updateColorBar('colorSurfaceLoadsY') },
  colorSurfaceLoadsZ: () => { meshData.color = meshData.colorSurfaceLoadsZ; updateMeshGeometry(); updateColorBar('colorSurfaceLoadsZ') },
  colorDisp: () => { meshData.color = meshData.colorDisp; updateMeshGeometry(); updateColorBar('colorDisp') },
  colorDispX: () => { meshData.color = meshData.colorDispX; updateMeshGeometry(); updateColorBar('colorDispX') },
  colorDispY: () => { meshData.color = meshData.colorDispY; updateMeshGeometry(); updateColorBar('colorDispY') },
  colorDispZ: () => { meshData.color = meshData.colorDispZ; updateMeshGeometry(); updateColorBar('colorDispZ') },
  colorE11: () => { meshData.color = meshData.colorE11; updateMeshGeometry(); updateColorBar('colorE11') },
  colorE22: () => { meshData.color = meshData.colorE22; updateMeshGeometry(); updateColorBar('colorE22') },
  colorE33: () => { meshData.color = meshData.colorE33; updateMeshGeometry(); updateColorBar('colorE33') },
  colorE12: () => { meshData.color = meshData.colorE12; updateMeshGeometry(); updateColorBar('colorE12') },
  colorE23: () => { meshData.color = meshData.colorE23; updateMeshGeometry(); updateColorBar('colorE23') },
  colorE31: () => { meshData.color = meshData.colorE31; updateMeshGeometry(); updateColorBar('colorE31') },
  colorEPrincipal: () => { meshData.color = meshData.colorEPrincipal; updateMeshGeometry(); updateColorBar('colorEPrincipal') },
  colorEi: () => { meshData.color = meshData.colorEi; updateMeshGeometry(); updateColorBar('colorEi') },
  colorEii: () => { meshData.color = meshData.colorEii; updateMeshGeometry(); updateColorBar('colorEii') },
  colorEiii: () => { meshData.color = meshData.colorEiii; updateMeshGeometry(); updateColorBar('colorEiii') },
  colorTraction: () => { meshData.color = meshData.colorTraction; updateMeshGeometry(); updateColorBar('colorTraction') },
  colorTractionX: () => { meshData.color = meshData.colorTractionX; updateMeshGeometry(); updateColorBar('colorTractionX') },
  colorTractionY: () => { meshData.color = meshData.colorTractionY; updateMeshGeometry(); updateColorBar('colorTractionY') },
  colorTractionZ: () => { meshData.color = meshData.colorTractionZ; updateMeshGeometry(); updateColorBar('colorTractionZ') },
  sensorColorE11: () => { meshData.sensorColor = meshData.sensorColorE11; updateMeshGeometry(); updateColorBar('sensorColorE11') },
  sensorColorE22: () => { meshData.sensorColor = meshData.sensorColorE22; updateMeshGeometry(); updateColorBar('sensorColorE22') },
  sensorColorE33: () => { meshData.sensorColor = meshData.sensorColorE33; updateMeshGeometry(); updateColorBar('sensorColorE33') },
  sensorColorE12: () => { meshData.sensorColor = meshData.sensorColorE12; updateMeshGeometry(); updateColorBar('sensorColorE12') },
  sensorColorE23: () => { meshData.sensorColor = meshData.sensorColorE23; updateMeshGeometry(); updateColorBar('sensorColorE23') },
  sensorColorE31: () => { meshData.sensorColor = meshData.sensorColorE31; updateMeshGeometry(); updateColorBar('sensorColorE31') },
  sensorColorNeutral: () => { meshData.sensorColor = meshData.sensorColorNeutral; updateMeshGeometry(); updateColorBar('sensorColorNeutral'); },
  extrapolatedSensorColorE11: () => { meshData.extrapolatedSensorColor = meshData.extrapolatedSensorColorE11; updateMeshGeometry(); updateColorBar('extrapolatedSensorColorE11') },
  extrapolatedSensorColorE22: () => { meshData.extrapolatedSensorColor = meshData.extrapolatedSensorColorE22; updateMeshGeometry(); updateColorBar('extrapolatedSensorColorE22') },
  extrapolatedSensorColorE33: () => { meshData.extrapolatedSensorColor = meshData.extrapolatedSensorColorE33; updateMeshGeometry(); updateColorBar('extrapolatedSensorColorE33') },
  extrapolatedSensorColorE12: () => { meshData.extrapolatedSensorColor = meshData.extrapolatedSensorColorE12; updateMeshGeometry(); updateColorBar('extrapolatedSensorColorE12') },
  extrapolatedSensorColorE23: () => { meshData.extrapolatedSensorColor = meshData.extrapolatedSensorColorE23; updateMeshGeometry(); updateColorBar('extrapolatedSensorColorE23') },
  extrapolatedSensorColorE31: () => { meshData.extrapolatedSensorColor = meshData.extrapolatedSensorColorE31; updateMeshGeometry(); updateColorBar('extrapolatedSensorColorE31') },
  colorRelativeErrorNodeTraction: () => { meshData.color = meshData.colorRelativeErrorNodeTraction; updateMeshGeometry(); updateColorBar('colorRelativeErrorNodeTraction') },
  colorRelativeErrorNodeTractionX: () => { meshData.color = meshData.colorRelativeErrorNodeTractionX; updateMeshGeometry(); updateColorBar('colorRelativeErrorNodeTractionX') },
  colorRelativeErrorNodeTractionY: () => { meshData.color = meshData.colorRelativeErrorNodeTractionY; updateMeshGeometry(); updateColorBar('colorRelativeErrorNodeTractionY') },
  colorRelativeErrorNodeTractionZ: () => { meshData.color = meshData.colorRelativeErrorNodeTractionZ; updateMeshGeometry(); updateColorBar('colorRelativeErrorNodeTractionZ') },
  colorExpectedNodalCoefficients: () => { meshData.color = meshData.colorExpectedNodalCoefficients; updateMeshGeometry(); updateColorBar('colorExpectedNodalCoefficients') },
  colorExpectedNodalCoefficientsX: () => { meshData.color = meshData.colorExpectedNodalCoefficientsX; updateMeshGeometry(); updateColorBar('colorExpectedNodalCoefficientsX') },
  colorExpectedNodalCoefficientsY: () => { meshData.color = meshData.colorExpectedNodalCoefficientsY; updateMeshGeometry(); updateColorBar('colorExpectedNodalCoefficientsY') },
  colorExpectedNodalCoefficientsZ: () => { meshData.color = meshData.colorExpectedNodalCoefficientsZ; updateMeshGeometry(); updateColorBar('colorExpectedNodalCoefficientsZ') },
  colorReconstructedNodalCoefficients: () => { meshData.color = meshData.colorReconstructedNodalCoefficients; updateMeshGeometry(); updateColorBar('colorReconstructedNodalCoefficients') },
  colorReconstructedNodalCoefficientsX: () => { meshData.color = meshData.colorReconstructedNodalCoefficientsX; updateMeshGeometry(); updateColorBar('colorReconstructedNodalCoefficientsX') },
  colorReconstructedNodalCoefficientsY: () => { meshData.color = meshData.colorReconstructedNodalCoefficientsY; updateMeshGeometry(); updateColorBar('colorReconstructedNodalCoefficientsY') },
  colorReconstructedNodalCoefficientsZ: () => { meshData.color = meshData.colorReconstructedNodalCoefficientsZ; updateMeshGeometry(); updateColorBar('colorReconstructedNodalCoefficientsZ') },
  colorRelativeErrorNodalCoefficients: () => { meshData.color = meshData.colorRelativeErrorNodalCoefficients; updateMeshGeometry(); updateColorBar('colorRelativeErrorNodalCoefficients') },
  colorRelativeErrorNodalCoefficientsX: () => { meshData.color = meshData.colorRelativeErrorNodalCoefficientsX; updateMeshGeometry(); updateColorBar('colorRelativeErrorNodalCoefficientsX') },
  colorRelativeErrorNodalCoefficientsY: () => { meshData.color = meshData.colorRelativeErrorNodalCoefficientsY; updateMeshGeometry(); updateColorBar('colorRelativeErrorNodalCoefficientsY') },
  colorRelativeErrorNodalCoefficientsZ: () => { meshData.color = meshData.colorRelativeErrorNodalCoefficientsZ; updateMeshGeometry(); updateColorBar('colorRelativeErrorNodalCoefficientsZ') }
}
const colorScaleControls = {
  minimum: 0.0,
  maximum: 1.0
}

const guiColorFolder = gui.addFolder('Color');
function updateColorScale() {
  const pressureMin = [ colorScaleControls.minimum, colorScaleControls.minimum, colorScaleControls.minimum ];
  const xyzDispMin = [ colorScaleControls.minimum, colorScaleControls.minimum, colorScaleControls.minimum ];
  const strainMin = [ colorScaleControls.minimum, colorScaleControls.minimum, colorScaleControls.minimum ];
  const strainPrincipalMin = [ colorScaleControls.minimum, colorScaleControls.minimum, colorScaleControls.minimum ];
  const tractionMin = [ colorScaleControls.minimum, colorScaleControls.minimum, colorScaleControls.minimum ];
  const ExyzMin = [ colorScaleControls.minimum, colorScaleControls.minimum, colorScaleControls.minimum ];
  const ExyzMinExtra = [ colorScaleControls.minimum, colorScaleControls.minimum, colorScaleControls.minimum ];
  const relativeErrorNodeTractionMin = [ colorScaleControls.minimum, colorScaleControls.minimum, colorScaleControls.minimum ];
  const expectedNodalCoefficientsMin = [ colorScaleControls.minimum, colorScaleControls.minimum, colorScaleControls.minimum ];
  const reconstructedNodalCoefficientsMin = [ colorScaleControls.minimum, colorScaleControls.minimum, colorScaleControls.minimum ];
  const relativeErrorNodalCoefficientsMin = [ colorScaleControls.minimum, colorScaleControls.minimum, colorScaleControls.minimum ];
  
  const pressureMax = [ colorScaleControls.maximum, colorScaleControls.maximum, colorScaleControls.maximum ];
  const xyzDispMax = [ colorScaleControls.maximum, colorScaleControls.maximum, colorScaleControls.maximum ];
  const strainMax = [ colorScaleControls.maximum, colorScaleControls.maximum, colorScaleControls.maximum ];
  const strainPrincipalMax = [ colorScaleControls.maximum, colorScaleControls.maximum, colorScaleControls.maximum ];
  const tractionMax = [ colorScaleControls.maximum, colorScaleControls.maximum, colorScaleControls.maximum ];
  const ExyzMax = [ colorScaleControls.maximum, colorScaleControls.maximum, colorScaleControls.maximum ];
  const ExyzMaxExtra = [ colorScaleControls.maximum, colorScaleControls.maximum, colorScaleControls.maximum ];
  const relativeErrorNodeTractionMax = [ colorScaleControls.maximum, colorScaleControls.maximum, colorScaleControls.maximum ];
  const expectedNodalCoefficientsMax = [ colorScaleControls.maximum, colorScaleControls.maximum, colorScaleControls.maximum ];
  const reconstructedNodalCoefficientsMax = [ colorScaleControls.maximum, colorScaleControls.maximum, colorScaleControls.maximum ];
  const relativeErrorNodalCoefficientsMax = [ colorScaleControls.maximum, colorScaleControls.maximum, colorScaleControls.maximum ];

  meshData = json.updateSurfaceColorsWithMinMax(
    meshData, 
    pressureMin, pressureMax,
    xyzDispMin, xyzDispMax, 
    strainMin, strainMax,
    strainPrincipalMin, strainPrincipalMax,
    tractionMin, tractionMax,
    ExyzMin, ExyzMax,
    ExyzMinExtra, ExyzMaxExtra,
    relativeErrorNodeTractionMin, relativeErrorNodeTractionMax,
    expectedNodalCoefficientsMin, expectedNodalCoefficientsMax,
    reconstructedNodalCoefficientsMin, reconstructedNodalCoefficientsMax,
    relativeErrorNodalCoefficientsMin, relativeErrorNodalCoefficientsMax
  );

  updateMeshGeometry();
  updateColorBar(lastColorName);
}
guiColorFolder.add(colorScaleControls, 'minimum').name('Color scale minimum').onChange( function( v ) {
  colorScaleControls.minimum = v;
  updateColorScale();
});
guiColorFolder.add(colorScaleControls, 'maximum').name('Color scale maximum').onChange( function( v ) {
  colorScaleControls.maximum = v;
	updateColorScale();
});
guiColorFolder.add(colorControls, 'colorBC').name('Color by boundary conditions');
guiColorFolder.add(colorControls, 'colorNeutral').name('Color neutrally');
guiColorFolder.add(colorControls, 'colorSurfaceLoads').name('Color by surface loads');
guiColorFolder.add(colorControls, 'colorSurfaceLoadsX').name('Color by surface loads in X');
guiColorFolder.add(colorControls, 'colorSurfaceLoadsY').name('Color by surface loads in Y');
guiColorFolder.add(colorControls, 'colorSurfaceLoadsZ').name('Color by surface loads in Z');
const guiColorDispFolder = guiColorFolder.addFolder('Color by displacements');
guiColorDispFolder.add(colorControls, 'colorDisp').name('Color by all displacements');
guiColorDispFolder.add(colorControls, 'colorDispX').name('Color by displacements in X');
guiColorDispFolder.add(colorControls, 'colorDispY').name('Color by displacements in Y');
guiColorDispFolder.add(colorControls, 'colorDispZ').name('Color by displacements in Z');
guiColorDispFolder.close();
const guiColorStrainFolder = guiColorFolder.addFolder('Color by strain');
guiColorStrainFolder.add(colorControls, 'colorE11').name('Color by strain E11');
guiColorStrainFolder.add(colorControls, 'colorE22').name('Color by strain E22');
guiColorStrainFolder.add(colorControls, 'colorE33').name('Color by strain E33');
guiColorStrainFolder.add(colorControls, 'colorE12').name('Color by strain E12');
guiColorStrainFolder.add(colorControls, 'colorE23').name('Color by strain E23');
guiColorStrainFolder.add(colorControls, 'colorE31').name('Color by strain E31');
guiColorStrainFolder.close();
const guiColorStrainPrincipalFolder = guiColorFolder.addFolder('Color by principal strain');
guiColorStrainPrincipalFolder.add(colorControls, 'colorEPrincipal').name('Color by principal strains');
guiColorStrainPrincipalFolder.add(colorControls, 'colorEi').name('Color by principal strain Ei');
guiColorStrainPrincipalFolder.add(colorControls, 'colorEii').name('Color by principal strain Eii');
guiColorStrainPrincipalFolder.add(colorControls, 'colorEiii').name('Color by principal strain Eiii');
guiColorStrainPrincipalFolder.close();
const guiColorTractionFolder = guiColorFolder.addFolder('Color by traction');
guiColorTractionFolder.add(colorControls, 'colorTraction').name('Color by all tractions');
guiColorTractionFolder.add(colorControls, 'colorTractionX').name('Color by tractions in X');
guiColorTractionFolder.add(colorControls, 'colorTractionY').name('Color by tractions in Y');
guiColorTractionFolder.add(colorControls, 'colorTractionZ').name('Color by tractions in Z');
guiColorTractionFolder.close();
const guiColorStrainSensorFolder = guiColorFolder.addFolder('Color strain sensors');
guiColorStrainSensorFolder.add(colorControls, 'sensorColorE11').name('Color strain sensors by E11');
guiColorStrainSensorFolder.add(colorControls, 'sensorColorE22').name('Color strain sensors by E22');
guiColorStrainSensorFolder.add(colorControls, 'sensorColorE33').name('Color strain sensors by E33');
guiColorStrainSensorFolder.add(colorControls, 'sensorColorE12').name('Color strain sensors by E12');
guiColorStrainSensorFolder.add(colorControls, 'sensorColorE23').name('Color strain sensors by E23');
guiColorStrainSensorFolder.add(colorControls, 'sensorColorE31').name('Color strain sensors by E31');
guiColorStrainSensorFolder.add(colorControls, 'sensorColorNeutral').name('Color strain sensors neutrally');
guiColorStrainSensorFolder.close();
const guiColorStrainExtrapolatedSensorFolder = guiColorFolder.addFolder('Color strain extrapolated sensors');
guiColorStrainExtrapolatedSensorFolder.add(colorControls, 'extrapolatedSensorColorE11').name('Color strain extrapolated sensors by E11');
guiColorStrainExtrapolatedSensorFolder.add(colorControls, 'extrapolatedSensorColorE22').name('Color strain extrapolated sensors by E22');
guiColorStrainExtrapolatedSensorFolder.add(colorControls, 'extrapolatedSensorColorE33').name('Color strain extrapolated sensors by E33');
guiColorStrainExtrapolatedSensorFolder.add(colorControls, 'extrapolatedSensorColorE12').name('Color strain extrapolated sensors by E12');
guiColorStrainExtrapolatedSensorFolder.add(colorControls, 'extrapolatedSensorColorE23').name('Color strain extrapolated sensors by E23');
guiColorStrainExtrapolatedSensorFolder.add(colorControls, 'extrapolatedSensorColorE31').name('Color strain extrapolated sensors by E31');
guiColorStrainExtrapolatedSensorFolder.close();
const guiColorRelativeErrorNodeTractionFolder = guiColorFolder.addFolder('Color by relative traction errors');
guiColorRelativeErrorNodeTractionFolder.add(colorControls, 'colorRelativeErrorNodeTraction').name('Color by all relative traction errors');
guiColorRelativeErrorNodeTractionFolder.add(colorControls, 'colorRelativeErrorNodeTractionX').name('Color by relative traction errors in X');
guiColorRelativeErrorNodeTractionFolder.add(colorControls, 'colorRelativeErrorNodeTractionY').name('Color by relative traction errors in Y');
guiColorRelativeErrorNodeTractionFolder.add(colorControls, 'colorRelativeErrorNodeTractionZ').name('Color by relative traction errors in Z');
guiColorRelativeErrorNodeTractionFolder.close();
const guiColorExpectedNodalCoefficientsFolder = guiColorFolder.addFolder('Color by expected coefficients');
guiColorExpectedNodalCoefficientsFolder.add(colorControls, 'colorExpectedNodalCoefficients').name('Color by all expected coefficients');
guiColorExpectedNodalCoefficientsFolder.add(colorControls, 'colorExpectedNodalCoefficientsX').name('Color by expected coefficients in X');
guiColorExpectedNodalCoefficientsFolder.add(colorControls, 'colorExpectedNodalCoefficientsY').name('Color by expected coefficients in Y');
guiColorExpectedNodalCoefficientsFolder.add(colorControls, 'colorExpectedNodalCoefficientsZ').name('Color by expected coefficients in Z');
guiColorExpectedNodalCoefficientsFolder.close();
const guiColorReconstructedNodalCoefficientsFolder = guiColorFolder.addFolder('Color by reconstructed coefficients');
guiColorReconstructedNodalCoefficientsFolder.add(colorControls, 'colorReconstructedNodalCoefficients').name('Color by all reconstructed coefficients');
guiColorReconstructedNodalCoefficientsFolder.add(colorControls, 'colorReconstructedNodalCoefficientsX').name('Color by reconstructed coefficients in X');
guiColorReconstructedNodalCoefficientsFolder.add(colorControls, 'colorReconstructedNodalCoefficientsY').name('Color by reconstructed coefficients in Y');
guiColorReconstructedNodalCoefficientsFolder.add(colorControls, 'colorReconstructedNodalCoefficientsZ').name('Color by reconstructed coefficients in Z');
guiColorReconstructedNodalCoefficientsFolder.close();
const guiColorRelativeErrorNodalCoefficientsFolder = guiColorFolder.addFolder('Color by relative coefficient errors');
guiColorRelativeErrorNodalCoefficientsFolder.add(colorControls, 'colorRelativeErrorNodalCoefficients').name('Color by relative coefficient errors');
guiColorRelativeErrorNodalCoefficientsFolder.add(colorControls, 'colorRelativeErrorNodalCoefficientsX').name('Color by relative coefficient errors in X');
guiColorRelativeErrorNodalCoefficientsFolder.add(colorControls, 'colorRelativeErrorNodalCoefficientsY').name('Color by relative coefficient errors in Y');
guiColorRelativeErrorNodalCoefficientsFolder.add(colorControls, 'colorRelativeErrorNodalCoefficientsZ').name('Color by relative coefficient errors in Z');
guiColorRelativeErrorNodalCoefficientsFolder.close();
guiColorFolder.close();

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