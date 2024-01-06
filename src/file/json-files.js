import * as THREE from 'three'
import * as vector from '../util/vector.js'

// TODO: Stuff all of this into a class.

const colorScale = [ // navy, blue,aqua,green,yellow,orange,red
  [0, 0, 0.5], // Navy
  [0, 0, 1],   // Blue
  [0, 1, 1],   // Aqua
  [0, 0.5, 0], // Green
  [1, 1, 0],   // Yellow
  [1, 0.625, 0], // Orange
  [1, 0, 0]    // Red
];
const colorSteps = [ 0, 1.0/6.0, 2.0/6.0, 3.0/6.0, 4.0/6.0, 5.0/6.0, 1.0 ];

let meshData = {};
let rawMesh = {};
let nNodesFull = 0;

export async function parseJson(jsonFileContent) {
  meshData = {
    // Mesh:
    position: [],
    normal: [],
    uv: [],
    color: [],

    positionInitial: [],
    positionDeformed: [],
    positionDisplacement: [],

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
    colorScales: {} // Keys are names of color arrays (e.g. colorDispX), values are objects containing corresponding minimum and maximum.
  }

  rawMesh = JSON.parse(jsonFileContent);
  console.dir(rawMesh);

  // Pre-processing: change all the relative error values to percentages.
  for (let i = 0; i < rawMesh.relativeErrorNodeTractionX.length; i++) {
    rawMesh.relativeErrorNodeTractionX[i] = rawMesh.relativeErrorNodeTractionX[i] * 100;
  }
  for (let i = 0; i < rawMesh.relativeErrorNodeTractionY.length; i++) {
    rawMesh.relativeErrorNodeTractionY[i] = rawMesh.relativeErrorNodeTractionY[i] * 100;
  }
  for (let i = 0; i < rawMesh.relativeErrorNodeTractionZ.length; i++) {
    rawMesh.relativeErrorNodeTractionZ[i] = rawMesh.relativeErrorNodeTractionZ[i] * 100;
  }
  for (let i = 0; i < rawMesh.relativeErrorNodalCoefficientsX.length; i++) {
    rawMesh.relativeErrorNodalCoefficientsX[i] = rawMesh.relativeErrorNodalCoefficientsX[i] * 100;
  }
  for (let i = 0; i < rawMesh.relativeErrorNodalCoefficientsY.length; i++) {
    rawMesh.relativeErrorNodalCoefficientsY[i] = rawMesh.relativeErrorNodalCoefficientsY[i] * 100;
  }
  for (let i = 0; i < rawMesh.relativeErrorNodalCoefficientsZ.length; i++) {
    rawMesh.relativeErrorNodalCoefficientsZ[i] = rawMesh.relativeErrorNodalCoefficientsZ[i] * 100;
  }

  nNodesFull = rawMesh.nodes.length;
  // Add offset to each x-coordinate, to create an offset from the origin:
  const positionOffsetX = 3;
  for (let i = 0; i < nNodesFull; i++) {
    rawMesh.nodes[i].xyz[0] = rawMesh.nodes[i].xyz[0] + positionOffsetX;
  }
  for (let i = 0; i < rawMesh.strainSensors.length; i++) {
    rawMesh.strainSensors[i].xyz[0] = rawMesh.strainSensors[i].xyz[0] + positionOffsetX;
  }
  for (let i = 0; i < rawMesh.strainSensorsExtrapolated.length; i++) {
    rawMesh.strainSensorsExtrapolated[i].xyz[0] = rawMesh.strainSensorsExtrapolated[i].xyz[0] + positionOffsetX;
  }
  for (let i = 0; i < rawMesh.fiberSensors.length; i++) {
    rawMesh.fiberSensors[i].xyzStart[0] = rawMesh.fiberSensors[i].xyzStart[0] + positionOffsetX;
    rawMesh.fiberSensors[i].xyzEnd[0] = rawMesh.fiberSensors[i].xyzEnd[0] + positionOffsetX;
    rawMesh.fiberSensors[i].xyz[0] = rawMesh.fiberSensors[i].xyz[0] + positionOffsetX;
  }

  // Find the minimum and maximum surface pressures in X, Y and Z, to scale these results later:
  let pressureMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
  let pressureMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
  for (const surface of rawMesh.surfaces) {
    for (let iDim = 0; iDim < 3; iDim++) {
      if (surface.pressures[iDim] < pressureMin[iDim]) {
        pressureMin[iDim] = surface.pressures[iDim];
      }
      if (surface.pressures[iDim] > pressureMax[iDim]) {
        pressureMax[iDim] = surface.pressures[iDim];
      }
    }
  }

  // Find the minimum and maximum displacements in X, Y and Z, to scale these results later:
  let xyzDispMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
  let xyzDispMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
  for (const node of rawMesh.nodes) {
    for (let iDim = 0; iDim < 3; iDim++) {
      if (node.xyzDisp[iDim] < xyzDispMin[iDim]) {
        xyzDispMin[iDim] = node.xyzDisp[iDim];
      }
      if (node.xyzDisp[iDim] > xyzDispMax[iDim]) {
        xyzDispMax[iDim] = node.xyzDisp[iDim];
      }
    }
  }

  // Find the minimum and maximum strains for each strain component, to scale these results later:
  const allStrains = [ rawMesh.nodeE11, rawMesh.nodeE22, rawMesh.nodeE33, rawMesh.nodeE12, rawMesh.nodeE23, rawMesh.nodeE31 ];
  let strainMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 
                    Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
  let strainMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, 
                    Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
  for (let iStrain = 0; iStrain < 6; iStrain++) {
    for (let iNode = 0; iNode < nNodesFull; iNode++) {
      if (allStrains[iStrain][iNode] < strainMin[iStrain]) {
        strainMin[iStrain] = allStrains[iStrain][iNode];
      }
      if (allStrains[iStrain][iNode] > strainMax[iStrain]) {
        strainMax[iStrain] = allStrains[iStrain][iNode];
      }
    }
  }
  
  // Calculate the principal strains for each node:
  rawMesh.nodeEi = Array(nNodesFull);
  rawMesh.nodeEii = Array(nNodesFull);
  rawMesh.nodeEiii = Array(nNodesFull);
  for (let iNode = 0; iNode < nNodesFull; iNode++) {
    const E11 = rawMesh.nodeE11[iNode];
    const E22 = rawMesh.nodeE22[iNode];
    const E33 = rawMesh.nodeE33[iNode];
    const E12 = rawMesh.nodeE12[iNode];
    const E23 = rawMesh.nodeE23[iNode];
    const E31 = rawMesh.nodeE31[iNode];

    rawMesh.nodeEi[iNode] = E11 + E22 + E33;
    rawMesh.nodeEii[iNode] = E11*E22 + E22*E33 + E33*E11 - E12*E12 - E31*E31 - E23*E23;
    rawMesh.nodeEiii[iNode] = E11*E22*E33 - E11*E23*E23 - E22*E31*E31 - E33*E12*E12 + 2*E12*E31*E23;
  }

  // Find the minimum and maximum principal strains for each principal strain component, to scale these results later:
  const allPrincipalStrains = [ rawMesh.nodeEi, rawMesh.nodeEii, rawMesh.nodeEiii ];
  let strainPrincipalMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 
                            Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
  let strainPrincipalMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, 
                            Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
  for (let iStrain = 0; iStrain < 3; iStrain++) {
    for (let iNode = 0; iNode < nNodesFull; iNode++) {
      if (allPrincipalStrains[iStrain][iNode] < strainPrincipalMin[iStrain]) {
        strainPrincipalMin[iStrain] = allPrincipalStrains[iStrain][iNode];
      }
      if (allPrincipalStrains[iStrain][iNode] > strainPrincipalMax[iStrain]) {
        strainPrincipalMax[iStrain] = allPrincipalStrains[iStrain][iNode];
      }
    }
  }

  // Find the minimum and maximum traction in X, Y and Z, to scale these results later:
  const allTractions = [
    rawMesh.nodeTractionX,
    rawMesh.nodeTractionY,
    rawMesh.nodeTractionZ
  ];
  let tractionMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
  let tractionMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
  for (let iNode = 0; iNode < nNodesFull; iNode++) {
    for (let iDim = 0; iDim < 3; iDim++) {
      if (allTractions[iDim][iNode] < tractionMin[iDim]) {
        tractionMin[iDim] = allTractions[iDim][iNode];
      }
      if (allTractions[iDim][iNode] > tractionMax[iDim]) {
        tractionMax[iDim] = allTractions[iDim][iNode];
      }
    }
  }

  // Find the minimum and maximum relative error of the nodal tractions in X, Y and Z, to scale these results later:
  const allRelativeErrorNodeTractions = [
    rawMesh.relativeErrorNodeTractionX,
    rawMesh.relativeErrorNodeTractionY,
    rawMesh.relativeErrorNodeTractionZ
  ];
  let relativeErrorNodeTractionMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
  let relativeErrorNodeTractionMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
  for (let iNode = 0; iNode < nNodesFull; iNode++) {
    for (let iDim = 0; iDim < 3; iDim++) {
      if (allRelativeErrorNodeTractions[iDim][iNode] < relativeErrorNodeTractionMin[iDim]) {
        relativeErrorNodeTractionMin[iDim] = allRelativeErrorNodeTractions[iDim][iNode];
      }
      if (allRelativeErrorNodeTractions[iDim][iNode] > relativeErrorNodeTractionMax[iDim]) {
        relativeErrorNodeTractionMax[iDim] = allRelativeErrorNodeTractions[iDim][iNode];
      }
    }
  }

  // Find the minimum and maximum of the expected nodal coefficients in X, Y and Z, to scale these results later:
  const allExpectedNodalCoefficients = [
    rawMesh.expectedNodalCoefficientsX,
    rawMesh.expectedNodalCoefficientsY,
    rawMesh.expectedNodalCoefficientsZ
  ];
  let expectedNodalCoefficientsMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
  let expectedNodalCoefficientsMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
  for (let iNode = 0; iNode < nNodesFull; iNode++) {
    for (let iDim = 0; iDim < 3; iDim++) {
      if (allExpectedNodalCoefficients[iDim][iNode] < expectedNodalCoefficientsMin[iDim]) {
        expectedNodalCoefficientsMin[iDim] = allExpectedNodalCoefficients[iDim][iNode];
      }
      if (allExpectedNodalCoefficients[iDim][iNode] > expectedNodalCoefficientsMax[iDim]) {
        expectedNodalCoefficientsMax[iDim] = allExpectedNodalCoefficients[iDim][iNode];
      }
    }
  }

  // Find the minimum and maximum of the reconstructed nodal coefficients in X, Y and Z, to scale these results later:
  const allReconstructedNodalCoefficients = [
    rawMesh.reconstructedNodalCoefficientsX,
    rawMesh.reconstructedNodalCoefficientsY,
    rawMesh.reconstructedNodalCoefficientsZ
  ];
  let reconstructedNodalCoefficientsMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
  let reconstructedNodalCoefficientsMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
  for (let iNode = 0; iNode < nNodesFull; iNode++) {
    for (let iDim = 0; iDim < 3; iDim++) {
      if (allReconstructedNodalCoefficients[iDim][iNode] < reconstructedNodalCoefficientsMin[iDim]) {
        reconstructedNodalCoefficientsMin[iDim] = allReconstructedNodalCoefficients[iDim][iNode];
      }
      if (allReconstructedNodalCoefficients[iDim][iNode] > reconstructedNodalCoefficientsMax[iDim]) {
        reconstructedNodalCoefficientsMax[iDim] = allReconstructedNodalCoefficients[iDim][iNode];
      }
    }
  }

  // Find the minimum and maximum of the reconstructed nodal coefficients in X, Y and Z, to scale these results later:
  const allRelativeErrorNodalCoefficients = [
    rawMesh.relativeErrorNodalCoefficientsX,
    rawMesh.relativeErrorNodalCoefficientsY,
    rawMesh.relativeErrorNodalCoefficientsZ
  ];
  let relativeErrorNodalCoefficientsMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
  let relativeErrorNodalCoefficientsMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
  for (let iNode = 0; iNode < nNodesFull; iNode++) {
    for (let iDim = 0; iDim < 3; iDim++) {
      if (allRelativeErrorNodalCoefficients[iDim][iNode] < relativeErrorNodalCoefficientsMin[iDim]) {
        relativeErrorNodalCoefficientsMin[iDim] = allRelativeErrorNodalCoefficients[iDim][iNode];
      }
      if (allRelativeErrorNodalCoefficients[iDim][iNode] > relativeErrorNodalCoefficientsMax[iDim]) {
        relativeErrorNodalCoefficientsMax[iDim] = allRelativeErrorNodalCoefficients[iDim][iNode];
      }
    }
  }

  // Find the minimum and maximum of the fiber strains, to scale the results later:
  let fiberStrainMin = Number.POSITIVE_INFINITY;
  let fiberStrainMax = Number.NEGATIVE_INFINITY;
  for (const fiberSensor of rawMesh.fiberSensors) {
    if (fiberSensor.strain < fiberStrainMin) {
      fiberStrainMin = fiberSensor.strain;
    }
    if (fiberSensor.strain > fiberStrainMax) {
      fiberStrainMax = fiberSensor.strain;
    }
  }

  // Convert the raw data to something we can render:
  for (let surface of rawMesh.surfaces) {
    if (!surface.external) {
      continue;
    }

    const nodeIndices = [
      surface.nodeNumbers[0],
      surface.nodeNumbers[2],
      surface.nodeNumbers[4],
      surface.nodeNumbers[6]
    ];
    
    const verticesInitial = [];
    const verticesDeformed = [];
    const verticesDisplacement = [];
    for (let iNodeLocal = 0; iNodeLocal < nodeIndices.length; iNodeLocal++) {
      const iNode = nodeIndices[iNodeLocal];
      const node = rawMesh.nodes[iNode];
      const xyz = node.xyz;
      const xyzDisp = node.xyzDisp;
      const xyzDeformed = [
        xyz[0] + xyzDisp[0], 
        xyz[1] + xyzDisp[1], 
        xyz[2] + xyzDisp[2]
      ];
      verticesInitial.push(xyz);
      verticesDeformed.push(xyzDeformed);
      verticesDisplacement.push(xyzDisp);
    }
    
    const loads = [];
    for (let iNodeLocal = 0; iNodeLocal < nodeIndices.length; iNodeLocal++) {
      const iNode = nodeIndices[iNodeLocal];
      loads.push([
        rawMesh.loads[3*iNode],
        rawMesh.loads[3*iNode + 1],
        rawMesh.loads[3*iNode + 2]
      ]);
    }

    // Indices per face (polygon, triangle etc)
    const indices = [
      [ 0, 1, 3 ], // Triangle 1
      [ 3, 1, 2 ]  // Triangle 2
    ]

    // Position:
    for (let iFace = 0; iFace < indices.length; iFace++) {
      const faceIndices = indices[iFace];
      meshData.positionInitial.push(
        ...verticesInitial[faceIndices[0]],
        ...verticesInitial[faceIndices[1]],
        ...verticesInitial[faceIndices[2]]
      )
      meshData.positionDeformed.push(
        ...verticesDeformed[faceIndices[0]],
        ...verticesDeformed[faceIndices[1]],
        ...verticesDeformed[faceIndices[2]]
      )
      meshData.positionDisplacement.push(
        ...verticesDisplacement[faceIndices[0]],
        ...verticesDisplacement[faceIndices[1]],
        ...verticesDisplacement[faceIndices[2]]
      )
    }

    // Normal:
    for (let iFace = 0; iFace < indices.length; iFace++) {
      const faceIndices = indices[iFace];
      const p0 = verticesInitial[faceIndices[0]];
      const p1 = verticesInitial[faceIndices[1]];
      const p2 = verticesInitial[faceIndices[2]];
      const normal = vector.surfaceNormal(p0, p1, p2);
      for (let iPoint = 0; iPoint < 3; iPoint++) {
        meshData.normal.push(...normal);
      }
    }

    // UV:
    meshData.uv.push(
      0, 0,
      1, 0,
      0, 1,
      0, 1,
      1, 0,
      1, 1
    )
  }

  // Convert the loads to arrows:
  let maxLoad = 1e-12;
  for (let load of rawMesh.loads) {
    if (Math.abs(load) > maxLoad) {
      maxLoad = Math.abs(load);
    }
  }

  // Visualize the loads with line segments:
  for (let iNode = 0; iNode < rawMesh.nodes.length; iNode++) {
    const xyz = rawMesh.nodes[iNode].xyz;
    const load = [
      rawMesh.loads[3*iNode + 0],
      rawMesh.loads[3*iNode + 1],
      rawMesh.loads[3*iNode + 2]
    ];
    if (load[0] === 0.0 && load[1] === 0.0 && load[2] === 0.0) {
      continue;
    }

    const scaledLoad = [
      load[0] / maxLoad,
      load[1] / maxLoad,
      load[2] / maxLoad
    ];

    const origin = new THREE.Vector3(xyz[0], xyz[1], xyz[2]);
    const tip = new THREE.Vector3(xyz[0] + scaledLoad[0], xyz[1] + scaledLoad[1], xyz[2] + scaledLoad[2]);

    meshData.linePoints.push(origin);
    meshData.linePoints.push(tip);
  }

  // Find the maximum sensor strain for each component to scale these results later:
  let ExyzMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
  let ExyzMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
  for (const strainSensor of rawMesh.strainSensors) {
    for (let iStrain = 0; iStrain < 6; iStrain++) {
      if (strainSensor.Exyz[iStrain] < ExyzMin[iStrain]) {
        ExyzMin[iStrain] = strainSensor.Exyz[iStrain];
      }
      if (strainSensor.Exyz[iStrain] > ExyzMax[iStrain]) {
        ExyzMax[iStrain] = strainSensor.Exyz[iStrain];
      }
    }
  }

  // Visualize the strain sensors with cube elements:
  for (const strainSensor of rawMesh.strainSensors) {
    const xyz = strainSensor.xyz;
    const dx = 0.01;
    const vertices = [
      [ xyz[0]-dx, xyz[1]-dx, xyz[2]-dx ],
      [ xyz[0]+dx, xyz[1]-dx, xyz[2]-dx ],
      [ xyz[0]+dx, xyz[1]+dx, xyz[2]-dx ],
      [ xyz[0]-dx, xyz[1]+dx, xyz[2]-dx ],
      [ xyz[0]-dx, xyz[1]-dx, xyz[2]+dx ],
      [ xyz[0]+dx, xyz[1]-dx, xyz[2]+dx ],
      [ xyz[0]+dx, xyz[1]+dx, xyz[2]+dx ],
      [ xyz[0]-dx, xyz[1]+dx, xyz[2]+dx ]
    ];

    // Indices per face (polygon, triangle etc)
    const indices = [
      // Bottom
      [ 0, 3, 1 ], // Triangle 1
      [ 1, 3, 2 ], // Triangle 2
      // Front
      [ 0, 1, 4 ], // Triangle 3
      [ 4, 1, 5 ], // Triangle 4
      // Right
      [ 1, 2, 5 ], // Triangle 5
      [ 5, 2, 6 ], // Triangle 6
      // Back
      [ 2, 3, 6 ], // Triangle 7
      [ 6, 3, 7 ], // Triangle 8
      // Left
      [ 3, 0, 7 ], // Triangle 9
      [ 7, 0, 4 ], // Triangle 10
      // Top
      [ 4, 5, 7 ], // Triangle 11
      [ 7, 5, 6 ], // Triangle 12
    ]

    // Position:
    for (let iFace = 0; iFace < indices.length; iFace++) {
      const faceIndices = indices[iFace];
      meshData.sensorPosition.push(
        ...vertices[faceIndices[0]],
        ...vertices[faceIndices[1]],
        ...vertices[faceIndices[2]]
      )
    }

    // Normal:
    for (let iFace = 0; iFace < indices.length; iFace++) {
      const faceIndices = indices[iFace];
      const p0 = vertices[faceIndices[0]];
      const p1 = vertices[faceIndices[1]];
      const p2 = vertices[faceIndices[2]];
      const normal = vector.surfaceNormal(p0, p1, p2);
      for (let iPoint = 0; iPoint < 3; iPoint++) {
        meshData.sensorNormal.push(...normal);
      }
    }

    // UV:
    for (let i = 0; i < 6; i++) {
      meshData.sensorUv.push(
        0, 0,
        1, 0,
        0, 1,
        0, 1,
        1, 0,
        1, 1
      )
    }
  }

  // Find the maximum extrapolated sensor strain for each component to scale these results later:
  let ExyzMinExtra = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
  let ExyzMaxExtra = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
  for (const extrapolatedStrainSensor of rawMesh.strainSensorsExtrapolated) {
    for (let iStrain = 0; iStrain < 6; iStrain++) {
      if (extrapolatedStrainSensor.Exyz[iStrain] < ExyzMinExtra[iStrain]) {
        ExyzMinExtra[iStrain] = extrapolatedStrainSensor.Exyz[iStrain];
      }
      if (extrapolatedStrainSensor.Exyz[iStrain] > ExyzMaxExtra[iStrain]) {
        ExyzMaxExtra[iStrain] = extrapolatedStrainSensor.Exyz[iStrain];
      }
    }
  }

  // Visualize the extrapolated strain sensors with cube elements:
  for (const extrapolatedStrainSensor of rawMesh.strainSensorsExtrapolated) {
    const xyz = extrapolatedStrainSensor.xyz;
    const dx = 0.01;
    const vertices = [
      [ xyz[0]-dx, xyz[1]-dx, xyz[2]-dx ],
      [ xyz[0]+dx, xyz[1]-dx, xyz[2]-dx ],
      [ xyz[0]+dx, xyz[1]+dx, xyz[2]-dx ],
      [ xyz[0]-dx, xyz[1]+dx, xyz[2]-dx ],
      [ xyz[0]-dx, xyz[1]-dx, xyz[2]+dx ],
      [ xyz[0]+dx, xyz[1]-dx, xyz[2]+dx ],
      [ xyz[0]+dx, xyz[1]+dx, xyz[2]+dx ],
      [ xyz[0]-dx, xyz[1]+dx, xyz[2]+dx ]
    ];

    // Indices per face (polygon, triangle etc)
    const indices = [
      // Bottom
      [ 0, 3, 1 ], // Triangle 1
      [ 1, 3, 2 ], // Triangle 2
      // Front
      [ 0, 1, 4 ], // Triangle 3
      [ 4, 1, 5 ], // Triangle 4
      // Right
      [ 1, 2, 5 ], // Triangle 5
      [ 5, 2, 6 ], // Triangle 6
      // Back
      [ 2, 3, 6 ], // Triangle 7
      [ 6, 3, 7 ], // Triangle 8
      // Left
      [ 3, 0, 7 ], // Triangle 9
      [ 7, 0, 4 ], // Triangle 10
      // Top
      [ 4, 5, 7 ], // Triangle 11
      [ 7, 5, 6 ], // Triangle 12
    ]

    // Position:
    for (let iFace = 0; iFace < indices.length; iFace++) {
      const faceIndices = indices[iFace];
      meshData.extrapolatedSensorPosition.push(
        ...vertices[faceIndices[0]],
        ...vertices[faceIndices[1]],
        ...vertices[faceIndices[2]]
      )
    }

    // Normal:
    for (let iFace = 0; iFace < indices.length; iFace++) {
      const faceIndices = indices[iFace];
      const p0 = vertices[faceIndices[0]];
      const p1 = vertices[faceIndices[1]];
      const p2 = vertices[faceIndices[2]];
      const normal = vector.surfaceNormal(p0, p1, p2);
      for (let iPoint = 0; iPoint < 3; iPoint++) {
        meshData.extrapolatedSensorNormal.push(...normal);
      }
    }

    // UV:
    for (let i = 0; i < 6; i++) {
      meshData.extrapolatedSensorUv.push(
        0, 0,
        1, 0,
        0, 1,
        0, 1,
        1, 0,
        1, 1
      )
    }
  }

  meshData = updateSurfaceColorsWithMinMax(
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
    relativeErrorNodalCoefficientsMin, relativeErrorNodalCoefficientsMax,
    fiberStrainMin, fiberStrainMax
  );

  meshData.position = meshData.positionInitial;
  meshData.color = meshData.colorNeutral;
  meshData.sensorColor = meshData.sensorColorNeutral;
  meshData.extrapolatedSensorColor = meshData.extrapolatedSensorColorE11;

  meshData.surfaces = rawMesh.surfaces;
  meshData.elements = rawMesh.elements;
  meshData.nodes = rawMesh.nodes;

  return meshData;
}

export function updateSurfaceColorsWithMinMax(
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
    relativeErrorNodalCoefficientsMin, relativeErrorNodalCoefficientsMax,
    fiberStrainMin, fiberStrainMax) {
  // Reset the color arrays in the mesh data:
  meshData.colorBC = [];
  meshData.colorSurfaceLoads = [];
  meshData.colorSurfaceLoadsX = [];
  meshData.colorSurfaceLoadsY = [];
  meshData.colorSurfaceLoadsZ = [];
  
  meshData.colorDisp = [];
  meshData.colorDispX = [];
  meshData.colorDispY = [];
  meshData.colorDispZ = [];
  
  meshData.colorE11 = [];
  meshData.colorE22 = [];
  meshData.colorE33 = [];
  meshData.colorE12 = [];
  meshData.colorE23 = [];
  meshData.colorE31 = [];

  meshData.colorEPrincipal = [];
  meshData.colorEi = [];
  meshData.colorEii = [];
  meshData.colorEiii = [];

  meshData.colorTraction = [];
  meshData.colorTractionX = [];
  meshData.colorTractionY = [];
  meshData.colorTractionZ = [];

  meshData.sensorColorE11 = [];
  meshData.sensorColorE22 = [];
  meshData.sensorColorE33 = [];
  meshData.sensorColorE12 = [];
  meshData.sensorColorE23 = [];
  meshData.sensorColorE31 = [];
  meshData.sensorColorNeutral = [];

  meshData.sensorFiberColor = [];

  meshData.extrapolatedSensorColorE11 = [];
  meshData.extrapolatedSensorColorE22 = [];
  meshData.extrapolatedSensorColorE33 = [];
  meshData.extrapolatedSensorColorE12 = [];
  meshData.extrapolatedSensorColorE23 = [];
  meshData.extrapolatedSensorColorE31 = [];

  meshData.colorRelativeErrorNodeTraction = [];
  meshData.colorRelativeErrorNodeTractionX = [];
  meshData.colorRelativeErrorNodeTractionY = [];
  meshData.colorRelativeErrorNodeTractionZ = [];

  meshData.colorExpectedNodalCoefficients = [];
  meshData.colorExpectedNodalCoefficientsX = [];
  meshData.colorExpectedNodalCoefficientsY = [];
  meshData.colorExpectedNodalCoefficientsZ = [];

  meshData.colorReconstructedNodalCoefficients = [];
  meshData.colorReconstructedNodalCoefficientsX = [];
  meshData.colorReconstructedNodalCoefficientsY = [];
  meshData.colorReconstructedNodalCoefficientsZ = [];

  meshData.colorRelativeErrorNodalCoefficients = [];
  meshData.colorRelativeErrorNodalCoefficientsX = [];
  meshData.colorRelativeErrorNodalCoefficientsY = [];
  meshData.colorRelativeErrorNodalCoefficientsZ = [];

  // Convert the raw data to something we can render:
  for (let surface of rawMesh.surfaces) {
    if (!surface.external) {
      continue;
    }

    const nodeIndices = [
      surface.nodeNumbers[0],
      surface.nodeNumbers[2],
      surface.nodeNumbers[4],
      surface.nodeNumbers[6]
    ];
    
    const verticesInitial = [];
    const verticesDeformed = [];
    const verticesDisplacement = [];
    for (let iNodeLocal = 0; iNodeLocal < nodeIndices.length; iNodeLocal++) {
      const iNode = nodeIndices[iNodeLocal];
      const node = rawMesh.nodes[iNode];
      const xyz = node.xyz;
      const xyzDisp = node.xyzDisp;
      const xyzDeformed = [
        xyz[0] + xyzDisp[0], 
        xyz[1] + xyzDisp[1], 
        xyz[2] + xyzDisp[2]
      ];
      verticesInitial.push(xyz);
      verticesDeformed.push(xyzDeformed);
      verticesDisplacement.push(xyzDisp);
    }
    
    const loads = [];
    for (let iNodeLocal = 0; iNodeLocal < nodeIndices.length; iNodeLocal++) {
      const iNode = nodeIndices[iNodeLocal];
      loads.push([
        rawMesh.loads[3*iNode],
        rawMesh.loads[3*iNode + 1],
        rawMesh.loads[3*iNode + 2]
      ]);
    }

    // Color:
    let allNodesLoaded = true;
    for (let i = 0; i < 4; i++) {
      if (vector.magnitude(loads[i]) < 1e-12) {
        allNodesLoaded = false;
      }
    }

    const indicesAll = [ 0, 1, 3, 3, 1, 2 ];
    for (let i = 0; i < 6; i++) {
      const iNodeLocal = indicesAll[i];
      const iNode = nodeIndices[iNodeLocal];
      
      // Standard color, indicating constrained and loaded surfaces:
      if (surface.constrained) {
        meshData.colorBC.push(1, 0, 0)
      } else if (allNodesLoaded) {
        meshData.colorBC.push(0, 0, 1)
      } else {
        meshData.colorBC.push(0.5, 0.5, 0.5)
      }

      // Neutral color:
      meshData.colorNeutral.push(0.5, 0.5, 0.5)

      // Colors for plotting all surface loads:
      const surfaceLoads = surface.pressures;
      const surfaceLoadsScaled = surfaceLoads.map((load, iLoad) => (load - pressureMin[iLoad]) / (pressureMax[iLoad] - pressureMin[iLoad]));
      meshData.colorSurfaceLoads.push(surfaceLoadsScaled[0], surfaceLoadsScaled[1], surfaceLoadsScaled[2]);
      
      // Colors for plotting individual surface load components:
      meshData.colorSurfaceLoadsX.push(...lerpXToColor(surfaceLoadsScaled[0], colorScale, colorSteps));
      meshData.colorSurfaceLoadsY.push(...lerpXToColor(surfaceLoadsScaled[1], colorScale, colorSteps));
      meshData.colorSurfaceLoadsZ.push(...lerpXToColor(surfaceLoadsScaled[2], colorScale, colorSteps));

      // Save minima and maxima for individual surface load components:
      meshData.colorScales.colorSurfaceLoadsX = { 'minimum': pressureMin[0], 'maximum': pressureMax[0] };
      meshData.colorScales.colorSurfaceLoadsY = { 'minimum': pressureMin[1], 'maximum': pressureMax[1] };
      meshData.colorScales.colorSurfaceLoadsZ = { 'minimum': pressureMin[2], 'maximum': pressureMax[2] };

      // Colors for plotting all displacements:
      const xyzDisp = rawMesh.nodes[iNode].xyzDisp;
      const xyzDispScaled = xyzDisp.map((disp, iDisp) => (disp - xyzDispMin[iDisp]) / (xyzDispMax[iDisp] - xyzDispMin[iDisp]));
      meshData.colorDisp.push(xyzDispScaled[0], xyzDispScaled[1], xyzDispScaled[2]);

      // Colors for plotting individual displacement components:
      meshData.colorDispX.push(...lerpXToColor(xyzDispScaled[0], colorScale, colorSteps));
      meshData.colorDispY.push(...lerpXToColor(xyzDispScaled[1], colorScale, colorSteps));
      meshData.colorDispZ.push(...lerpXToColor(xyzDispScaled[2], colorScale, colorSteps));

      // Save minima and maxima for individual displacement components:
      meshData.colorScales.colorDispX = { 'minimum': xyzDispMin[0], 'maximum': xyzDispMax[0] };
      meshData.colorScales.colorDispY = { 'minimum': xyzDispMin[1], 'maximum': xyzDispMax[1] };
      meshData.colorScales.colorDispZ = { 'minimum': xyzDispMin[2], 'maximum': xyzDispMax[2] };

      // Scale the strain components:
      const strains = [
        rawMesh.nodeE11[iNode], 
        rawMesh.nodeE22[iNode], 
        rawMesh.nodeE33[iNode], 
        rawMesh.nodeE12[iNode], 
        rawMesh.nodeE23[iNode], 
        rawMesh.nodeE31[iNode]
      ];
      const strainsScaled = strains.map((strain, iStrain) => 
        (strain - strainMin[iStrain]) / (strainMax[iStrain] - strainMin[iStrain])
      );

      // Colors for plotting individual strain components:
      meshData.colorE11.push(...lerpXToColor(strainsScaled[0], colorScale, colorSteps));
      meshData.colorE22.push(...lerpXToColor(strainsScaled[1], colorScale, colorSteps));
      meshData.colorE33.push(...lerpXToColor(strainsScaled[2], colorScale, colorSteps));
      meshData.colorE12.push(...lerpXToColor(strainsScaled[3], colorScale, colorSteps));
      meshData.colorE23.push(...lerpXToColor(strainsScaled[4], colorScale, colorSteps));
      meshData.colorE31.push(...lerpXToColor(strainsScaled[5], colorScale, colorSteps));

      // Save minima and maxima for individual strain components:
      meshData.colorScales.colorE11 = { 'minimum': strainMin[0], 'maximum': strainMax[0] };
      meshData.colorScales.colorE22 = { 'minimum': strainMin[1], 'maximum': strainMax[1] };
      meshData.colorScales.colorE33 = { 'minimum': strainMin[2], 'maximum': strainMax[2] };
      meshData.colorScales.colorE12 = { 'minimum': strainMin[3], 'maximum': strainMax[3] };
      meshData.colorScales.colorE23 = { 'minimum': strainMin[4], 'maximum': strainMax[4] };
      meshData.colorScales.colorE31 = { 'minimum': strainMin[5], 'maximum': strainMax[5] };

      // Scale the principal strain components:
      const strainsPrincipal = [
        rawMesh.nodeEi[iNode],
        rawMesh.nodeEii[iNode],
        rawMesh.nodeEiii[iNode]
      ];
      const strainsPrincipalScaled = strainsPrincipal.map((strain, iStrain) => 
        (strain - strainPrincipalMin[iStrain]) / (strainPrincipalMax[iStrain] - strainPrincipalMin[iStrain])
      );
      
      // Colors for plotting principal strain components:
      meshData.colorEPrincipal.push(strainsPrincipalScaled[0], strainsPrincipalScaled[1], strainsPrincipalScaled[2]);
      meshData.colorEi.push(...lerpXToColor(strainsPrincipalScaled[0], colorScale, colorSteps));
      meshData.colorEii.push(...lerpXToColor(strainsPrincipalScaled[1], colorScale, colorSteps));
      meshData.colorEiii.push(...lerpXToColor(strainsPrincipalScaled[2], colorScale, colorSteps));

      // Save minima and maxima for principal strain components:
      meshData.colorScales.colorEi = { 'minimum': strainPrincipalMin[0], 'maximum': strainPrincipalMax[0] };
      meshData.colorScales.colorEii = { 'minimum': strainPrincipalMin[1], 'maximum': strainPrincipalMax[1] };
      meshData.colorScales.colorEiii = { 'minimum': strainPrincipalMin[2], 'maximum': strainPrincipalMax[2] };

      // Scale the traction components:
      const tractions = [
        rawMesh.nodeTractionX[iNode],
        rawMesh.nodeTractionY[iNode],
        rawMesh.nodeTractionZ[iNode]
      ];
      const tractionsScaled = tractions.map((traction, iDim) =>
        (traction - tractionMin[iDim]) / (tractionMax[iDim] - tractionMin[iDim])
      );

      // Colors for plotting traction components:
      meshData.colorTraction.push(tractionsScaled[0], tractionsScaled[1], tractionsScaled[2]);
      meshData.colorTractionX.push(...lerpXToColor(tractionsScaled[0], colorScale, colorSteps));
      meshData.colorTractionY.push(...lerpXToColor(tractionsScaled[1], colorScale, colorSteps));
      meshData.colorTractionZ.push(...lerpXToColor(tractionsScaled[2], colorScale, colorSteps));

      // Save minima and maxima for traction components:
      meshData.colorScales.colorTractionX = { 'minimum': tractionMin[0], 'maximum': tractionMax[0] };
      meshData.colorScales.colorTractionY = { 'minimum': tractionMin[1], 'maximum': tractionMax[1] };
      meshData.colorScales.colorTractionZ = { 'minimum': tractionMin[2], 'maximum': tractionMax[2] };

      // Scale the relative traction error components:
      const relativeErrorNodeTractions = [
        rawMesh.relativeErrorNodeTractionX[iNode],
        rawMesh.relativeErrorNodeTractionY[iNode],
        rawMesh.relativeErrorNodeTractionZ[iNode]
      ];
      const relativeErrorNodeTractionsScaled = relativeErrorNodeTractions.map((relativeErrorNodeTraction, iDim) =>
        (relativeErrorNodeTraction - relativeErrorNodeTractionMin[iDim]) / (relativeErrorNodeTractionMax[iDim] - relativeErrorNodeTractionMin[iDim])
      );
  
      // Colors for plotting traction components:
      meshData.colorRelativeErrorNodeTraction.push(relativeErrorNodeTractionsScaled[0], relativeErrorNodeTractionsScaled[1], relativeErrorNodeTractionsScaled[2]);
      meshData.colorRelativeErrorNodeTractionX.push(...lerpXToColor(relativeErrorNodeTractionsScaled[0], colorScale, colorSteps));
      meshData.colorRelativeErrorNodeTractionY.push(...lerpXToColor(relativeErrorNodeTractionsScaled[1], colorScale, colorSteps));
      meshData.colorRelativeErrorNodeTractionZ.push(...lerpXToColor(relativeErrorNodeTractionsScaled[2], colorScale, colorSteps));
  
      // Save minima and maxima for traction components:
      meshData.colorScales.colorRelativeErrorNodeTractionX = { 'minimum': relativeErrorNodeTractionMin[0], 'maximum': relativeErrorNodeTractionMax[0] };
      meshData.colorScales.colorRelativeErrorNodeTractionY = { 'minimum': relativeErrorNodeTractionMin[1], 'maximum': relativeErrorNodeTractionMax[1] };
      meshData.colorScales.colorRelativeErrorNodeTractionZ = { 'minimum': relativeErrorNodeTractionMin[2], 'maximum': relativeErrorNodeTractionMax[2] };

      // Scale the relative traction error components:
      const expectedNodalCoefficientss = [
        rawMesh.expectedNodalCoefficientsX[iNode],
        rawMesh.expectedNodalCoefficientsY[iNode],
        rawMesh.expectedNodalCoefficientsZ[iNode]
      ];
      const expectedNodalCoefficientssScaled = expectedNodalCoefficientss.map((expectedNodalCoefficients, iDim) =>
        (expectedNodalCoefficients - expectedNodalCoefficientsMin[iDim]) / (expectedNodalCoefficientsMax[iDim] - expectedNodalCoefficientsMin[iDim])
      );

      // Colors for plotting traction components:
      meshData.colorExpectedNodalCoefficients.push(expectedNodalCoefficientssScaled[0], expectedNodalCoefficientssScaled[1], expectedNodalCoefficientssScaled[2]);
      meshData.colorExpectedNodalCoefficientsX.push(...lerpXToColor(expectedNodalCoefficientssScaled[0], colorScale, colorSteps));
      meshData.colorExpectedNodalCoefficientsY.push(...lerpXToColor(expectedNodalCoefficientssScaled[1], colorScale, colorSteps));
      meshData.colorExpectedNodalCoefficientsZ.push(...lerpXToColor(expectedNodalCoefficientssScaled[2], colorScale, colorSteps));

      // Save minima and maxima for traction components:
      meshData.colorScales.colorExpectedNodalCoefficientsX = { 'minimum': expectedNodalCoefficientsMin[0], 'maximum': expectedNodalCoefficientsMax[0] };
      meshData.colorScales.colorExpectedNodalCoefficientsY = { 'minimum': expectedNodalCoefficientsMin[1], 'maximum': expectedNodalCoefficientsMax[1] };
      meshData.colorScales.colorExpectedNodalCoefficientsZ = { 'minimum': expectedNodalCoefficientsMin[2], 'maximum': expectedNodalCoefficientsMax[2] };

      // Scale the relative traction error components:
      const reconstructedNodalCoefficients = [
        rawMesh.reconstructedNodalCoefficientsX[iNode],
        rawMesh.reconstructedNodalCoefficientsY[iNode],
        rawMesh.reconstructedNodalCoefficientsZ[iNode]
      ];
      const reconstructedNodalCoefficientsScaled = reconstructedNodalCoefficients.map((reconstructedNodalCoefficient, iDim) =>
        (reconstructedNodalCoefficient - reconstructedNodalCoefficientsMin[iDim]) / (reconstructedNodalCoefficientsMax[iDim] - reconstructedNodalCoefficientsMin[iDim])
      );

      // Colors for plotting traction components:
      meshData.colorReconstructedNodalCoefficients.push(reconstructedNodalCoefficientsScaled[0], reconstructedNodalCoefficientsScaled[1], reconstructedNodalCoefficientsScaled[2]);
      meshData.colorReconstructedNodalCoefficientsX.push(...lerpXToColor(reconstructedNodalCoefficientsScaled[0], colorScale, colorSteps));
      meshData.colorReconstructedNodalCoefficientsY.push(...lerpXToColor(reconstructedNodalCoefficientsScaled[1], colorScale, colorSteps));
      meshData.colorReconstructedNodalCoefficientsZ.push(...lerpXToColor(reconstructedNodalCoefficientsScaled[2], colorScale, colorSteps));

      // Save minima and maxima for traction components:
      meshData.colorScales.colorReconstructedNodalCoefficientsX = { 'minimum': reconstructedNodalCoefficientsMin[0], 'maximum': reconstructedNodalCoefficientsMax[0] };
      meshData.colorScales.colorReconstructedNodalCoefficientsY = { 'minimum': reconstructedNodalCoefficientsMin[1], 'maximum': reconstructedNodalCoefficientsMax[1] };
      meshData.colorScales.colorReconstructedNodalCoefficientsZ = { 'minimum': reconstructedNodalCoefficientsMin[2], 'maximum': reconstructedNodalCoefficientsMax[2] };

      // Scale the relative traction error components:
      const relativeErrorNodalCoefficientss = [
        rawMesh.relativeErrorNodalCoefficientsX[iNode],
        rawMesh.relativeErrorNodalCoefficientsY[iNode],
        rawMesh.relativeErrorNodalCoefficientsZ[iNode]
      ];
      const relativeErrorNodalCoefficientssScaled = relativeErrorNodalCoefficientss.map((relativeErrorNodalCoefficients, iDim) =>
        (relativeErrorNodalCoefficients - relativeErrorNodalCoefficientsMin[iDim]) / (relativeErrorNodalCoefficientsMax[iDim] - relativeErrorNodalCoefficientsMin[iDim])
      );

      // Colors for plotting traction components:
      meshData.colorRelativeErrorNodalCoefficients.push(relativeErrorNodalCoefficientssScaled[0], relativeErrorNodalCoefficientssScaled[1], relativeErrorNodalCoefficientssScaled[2]);
      meshData.colorRelativeErrorNodalCoefficientsX.push(...lerpXToColor(relativeErrorNodalCoefficientssScaled[0], colorScale, colorSteps));
      meshData.colorRelativeErrorNodalCoefficientsY.push(...lerpXToColor(relativeErrorNodalCoefficientssScaled[1], colorScale, colorSteps));
      meshData.colorRelativeErrorNodalCoefficientsZ.push(...lerpXToColor(relativeErrorNodalCoefficientssScaled[2], colorScale, colorSteps));

      // Save minima and maxima for traction components:
      meshData.colorScales.colorRelativeErrorNodalCoefficientsX = { 'minimum': relativeErrorNodalCoefficientsMin[0], 'maximum': relativeErrorNodalCoefficientsMax[0] };
      meshData.colorScales.colorRelativeErrorNodalCoefficientsY = { 'minimum': relativeErrorNodalCoefficientsMin[1], 'maximum': relativeErrorNodalCoefficientsMax[1] };
      meshData.colorScales.colorRelativeErrorNodalCoefficientsZ = { 'minimum': relativeErrorNodalCoefficientsMin[2], 'maximum': relativeErrorNodalCoefficientsMax[2] };
    }
  }

  // Visualize the strain sensors with cube elements:
  for (const strainSensor of rawMesh.strainSensors) {
    const Exyz = strainSensor.Exyz;
    const ExyzScaled = [
      (Exyz[0] - ExyzMin[0]) / (ExyzMax[0] - ExyzMin[0]),
      (Exyz[1] - ExyzMin[1]) / (ExyzMax[1] - ExyzMin[1]),
      (Exyz[2] - ExyzMin[2]) / (ExyzMax[2] - ExyzMin[2]),
      (Exyz[3] - ExyzMin[3]) / (ExyzMax[3] - ExyzMin[3]),
      (Exyz[4] - ExyzMin[4]) / (ExyzMax[4] - ExyzMin[4]),
      (Exyz[5] - ExyzMin[5]) / (ExyzMax[5] - ExyzMin[5])
    ];

    // Color:
    for (let i = 0; i < 36; i++) {
      // Colors for plotting individual strain components:
      meshData.sensorColorE11.push(...lerpXToColor(ExyzScaled[0], colorScale, colorSteps));
      meshData.sensorColorE22.push(...lerpXToColor(ExyzScaled[1], colorScale, colorSteps));
      meshData.sensorColorE33.push(...lerpXToColor(ExyzScaled[2], colorScale, colorSteps));
      meshData.sensorColorE12.push(...lerpXToColor(ExyzScaled[3], colorScale, colorSteps));
      meshData.sensorColorE23.push(...lerpXToColor(ExyzScaled[4], colorScale, colorSteps));
      meshData.sensorColorE31.push(...lerpXToColor(ExyzScaled[5], colorScale, colorSteps));

      // Save minima and maxima for individual strain components:
      meshData.colorScales.sensorColorE11 = { 'minimum': ExyzMin[0], 'maximum': ExyzMax[0] };
      meshData.colorScales.sensorColorE22 = { 'minimum': ExyzMin[1], 'maximum': ExyzMax[1] };
      meshData.colorScales.sensorColorE33 = { 'minimum': ExyzMin[2], 'maximum': ExyzMax[2] };
      meshData.colorScales.sensorColorE12 = { 'minimum': ExyzMin[3], 'maximum': ExyzMax[3] };
      meshData.colorScales.sensorColorE23 = { 'minimum': ExyzMin[4], 'maximum': ExyzMax[4] };
      meshData.colorScales.sensorColorE31 = { 'minimum': ExyzMin[5], 'maximum': ExyzMax[5] };
    }

    meshData.sensorColorNeutral = meshData.sensorColorE11.map(_ => 0.5);
  }

  // Visualize the fibers with line segments:
  for (const fiberSensor of rawMesh.fiberSensors) {
    const xyzStart = fiberSensor.xyzStart;
    const xyzEnd = fiberSensor.xyzEnd;

    const origin = new THREE.Vector3(xyzStart[0], xyzStart[1], xyzStart[2]);
    const tip = new THREE.Vector3(xyzEnd[0], xyzEnd[1], xyzEnd[2]);

    meshData.sensorFiberLines.push(origin);
    meshData.sensorFiberLines.push(tip);

    const strainScaled = (fiberSensor.strain - fiberStrainMin) / (fiberStrainMax - fiberStrainMin);
    meshData.sensorFiberColor.push(...lerpXToColor(strainScaled, colorScale, colorSteps));
  }

  // Visualize the extrapolated strain sensors with cube elements:
  for (const extrapolatedStrainSensor of rawMesh.strainSensorsExtrapolated) {
    const Exyz = extrapolatedStrainSensor.Exyz;
    const ExyzScaled = [
      (Exyz[0] - ExyzMinExtra[0]) / (ExyzMaxExtra[0] - ExyzMinExtra[0]),
      (Exyz[1] - ExyzMinExtra[1]) / (ExyzMaxExtra[1] - ExyzMinExtra[1]),
      (Exyz[2] - ExyzMinExtra[2]) / (ExyzMaxExtra[2] - ExyzMinExtra[2]),
      (Exyz[3] - ExyzMinExtra[3]) / (ExyzMaxExtra[3] - ExyzMinExtra[3]),
      (Exyz[4] - ExyzMinExtra[4]) / (ExyzMaxExtra[4] - ExyzMinExtra[4]),
      (Exyz[5] - ExyzMinExtra[5]) / (ExyzMaxExtra[5] - ExyzMinExtra[5])
    ];

    // Color:
    for (let i = 0; i < 36; i++) {
      // Colors for plotting individual strain components:
      meshData.extrapolatedSensorColorE11.push(...lerpXToColor(ExyzScaled[0], colorScale, colorSteps));
      meshData.extrapolatedSensorColorE22.push(...lerpXToColor(ExyzScaled[1], colorScale, colorSteps));
      meshData.extrapolatedSensorColorE33.push(...lerpXToColor(ExyzScaled[2], colorScale, colorSteps));
      meshData.extrapolatedSensorColorE12.push(...lerpXToColor(ExyzScaled[3], colorScale, colorSteps));
      meshData.extrapolatedSensorColorE23.push(...lerpXToColor(ExyzScaled[4], colorScale, colorSteps));
      meshData.extrapolatedSensorColorE31.push(...lerpXToColor(ExyzScaled[5], colorScale, colorSteps));

      // Save minima and maxima for individual strain components:
      meshData.colorScales.extrapolatedSensorColorE11 = { 'minimum': ExyzMinExtra[0], 'maximum': ExyzMaxExtra[0] };
      meshData.colorScales.extrapolatedSensorColorE22 = { 'minimum': ExyzMinExtra[1], 'maximum': ExyzMaxExtra[1] };
      meshData.colorScales.extrapolatedSensorColorE33 = { 'minimum': ExyzMinExtra[2], 'maximum': ExyzMaxExtra[2] };
      meshData.colorScales.extrapolatedSensorColorE12 = { 'minimum': ExyzMinExtra[3], 'maximum': ExyzMaxExtra[3] };
      meshData.colorScales.extrapolatedSensorColorE23 = { 'minimum': ExyzMinExtra[4], 'maximum': ExyzMaxExtra[4] };
      meshData.colorScales.extrapolatedSensorColorE31 = { 'minimum': ExyzMinExtra[5], 'maximum': ExyzMaxExtra[5] };
    }
  }

  return meshData;
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function lerpXToColor(x, colorScale, colorSteps) {
  if (x > 1) {
    return [ 1, 1, 1 ];
  }
  if (x < 0) {
    return [ 0, 0, 0 ];
  }

  const xClamped = clamp(x, 0, 1);
  let iLast = 0;
  let lowerValue = colorSteps[iLast];
  let upperValue = colorSteps[iLast + 1];
  for (let i = 1; i < colorSteps.length-1; i++) {
    if (xClamped > upperValue) {
      iLast = i;
      lowerValue = colorSteps[iLast];
      upperValue = colorSteps[iLast+1];
    }
  }
  const lowerFactor = (upperValue - x) / (upperValue - lowerValue);
  const upperFactor = (x - lowerValue) / (upperValue - lowerValue);
  const c1 = colorScale[iLast];
  const c2 = colorScale[iLast+1];
  const color = [
    c1[0]*lowerFactor + c2[0]*upperFactor,
    c1[1]*lowerFactor + c2[1]*upperFactor,
    c1[2]*lowerFactor + c2[2]*upperFactor
  ]
  return color;
}
