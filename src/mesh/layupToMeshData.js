import { surfaceNormal } from "../util/vector";

export function layupToMeshData(layup) {
  console.log(layup);

  const plyThickness = 0.2;
  const length = 1.0;
  const width = 1.0;

  const nLength = 1; // Number of elements in the length direction (x)
  const nWidth = 1; // Number of elements in the width direction (y)

  const meshData = {
    nodes: [],
    elements: [],
    surfaces: [],
    materials: [], 

    position: [],
    normal: [],
    uv: [],
    color: []
  };

  // Create some helper arrays to make it easier to create rendered mesh:
  for (let iPly = 0; iPly < layup.length + 1; iPly++) {
    for (let iLength = 0; iLength < nLength + 1; iLength++) {
      for (let iWidth = 0; iWidth < nWidth + 1; iWidth++) {
        meshData.nodes.push({
          xyz: [
            iWidth * width / nWidth, 
            iPly * plyThickness,
            iLength * length / nLength
          ]
        });
      }
    }
  }

  // Create the elements:
  for (let iPly = 0; iPly < layup.length; iPly++) {
    for (let iLength = 0; iLength < nLength; iLength++) {
      for (let iWidth = 0; iWidth < nWidth; iWidth++) {
        const nodeNumbers = [
          iNode(iWidth,     iPly,     iLength,     nWidth, layup.length, nLength),
          iNode(iWidth + 1, iPly,     iLength,     nWidth, layup.length, nLength),
          iNode(iWidth + 1, iPly,     iLength + 1, nWidth, layup.length, nLength),
          iNode(iWidth,     iPly,     iLength + 1, nWidth, layup.length, nLength),
          iNode(iWidth,     iPly + 1, iLength,     nWidth, layup.length, nLength),
          iNode(iWidth + 1, iPly + 1, iLength,     nWidth, layup.length, nLength),
          iNode(iWidth + 1, iPly + 1, iLength + 1, nWidth, layup.length, nLength),
          iNode(iWidth,     iPly + 1, iLength + 1, nWidth, layup.length, nLength)
        ];
        meshData.elements.push({
          materialNumber: 0,
          nodeNumbers
        });
      }
    }
  }

  // Create the surfaces:
  const localNodeIndices = [
    [0, 1, 2, 3], // Bottom
    [0, 3, 7, 4], // Front
    [1, 5, 6, 2], // Back
    [0, 4, 5, 1], // Left
    [2, 6, 7, 3], // Right
    [4, 7, 6, 5]  // Top
  ];
  for (let iElement = 0; iElement < meshData.elements.length; iElement++) {
    const nodeNumbers = meshData.elements[iElement].nodeNumbers;
    for (let iSurface = 0; iSurface < 6; iSurface++) {
      meshData.surfaces.push({
        nodeNumbers: [
          nodeNumbers[localNodeIndices[iSurface][0]],
          nodeNumbers[localNodeIndices[iSurface][1]],
          nodeNumbers[localNodeIndices[iSurface][2]],
          nodeNumbers[localNodeIndices[iSurface][3]]
        ],
        elementNumber: iElement
      });
    }
  }

  // Create the materials:
  meshData.materials.push({
    name: 'Material 1',
    color: [0.5, 0.5, 0.5]
  });

  // Convert the surfaces to triangles:
  const surfacesTriangles = [ // Contains indices per face (polygon, triangle etc)
    [ 0, 1, 3 ], // Triangle 1
    [ 3, 1, 2 ]  // Triangle 2
  ]
  for (let iSurface = 0; iSurface < meshData.surfaces.length; iSurface++) {
    const surface = meshData.surfaces[iSurface];

    // Positions:
    for (let iTriangle = 0; iTriangle < surfacesTriangles.length; iTriangle++) {
      const indices = surfacesTriangles[iTriangle];
      for (let iIndex = 0; iIndex < indices.length; iIndex++) {
        const nodeNumber = surface.nodeNumbers[indices[iIndex]];
        const xyz = meshData.nodes[nodeNumber].xyz;
        meshData.position.push(xyz[0], xyz[1], xyz[2]);

        // Neutral color:
        meshData.color.push(0.5, 0.5, 0.5);
      }
    }

    // Normal:
    for (let iTriangle = 0; iTriangle < surfacesTriangles.length; iTriangle++) {
      const indices = surfacesTriangles[iTriangle];
      const points = [];
      for (let iIndex = 0; iIndex < indices.length; iIndex++) {
        const nodeNumber = surface.nodeNumbers[indices[iIndex]];
        const xyz = meshData.nodes[nodeNumber].xyz;
        points.push(xyz);
      }
      const normal = surfaceNormal(points[0], points[1], points[2]);
      for (let iPoint = 0; iPoint < points.length; iPoint++) {
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

  return meshData;
}

function iNode(ix, iy, iz, nx, ny, nz) {
  return iy * (nz + 1) * (nx + 1) + iz * (nx + 1) + ix;
}