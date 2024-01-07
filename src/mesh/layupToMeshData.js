export function layupToMeshData(layup) {
  console.log(layup);

  const plyThickness = 0.1;
  const length = 1.0;
  const width = 1.0;

  const nLength = 1; // Number of elements in the length direction (x)
  const nWidth = 1; // Number of elements in the width direction (y)

  const meshData = {
    position: [],
    normal: [],
    uv: [],
    color: [],

    nodes: [],
    elements: [],
    surfaces: [],
    materials: []
  };

  // Create some helper arrays to make it easier to create rendered mesh:
  for (let iPly = 0; iPly < layup.length + 1; iPly++) {
    for (let iLength = 0; iLength < nLength + 1; iLength++) {
      for (let iWidth = 0; iWidth < nLength + 1; iWidth++) {
        meshData.nodes.push({
          xyz: [
            iLength * length / nLength, 
            iWidth * width / nWidth, 
            iPly * plyThickness
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
          iNode(iLength, iWidth, iPly),
          iNode(iLength + 1, iWidth, iPly),
          iNode(iLength + 1, iWidth + 1, iPly),
          iNode(iLength, iWidth + 1, iPly),
          iNode(iLength, iWidth, iPly + 1),
          iNode(iLength + 1, iWidth, iPly + 1),
          iNode(iLength + 1, iWidth + 1, iPly + 1),
          iNode(iLength, iWidth + 1, iPly + 1)
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
    [0, 3, 2, 1], // Bottom
    [0, 4, 7, 3], // Front
    [1, 2, 6, 5], // Back
    [0, 1, 5, 4], // Left
    [2, 3, 7, 6], // Right
    [4, 5, 6, 7]  // Top
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
        ]
      });
    }
  }

  // Create the materials:
  meshData.materials.push({
    name: 'Material 1',
    color: [0.5, 0.5, 0.5]
  });

  // The layers are stacked together in the z direction:
  for (let iPly = 0; iPly < layup.length + 1; iPly++) {
    // For each ply we create a cube, so 6 surfaces:
    for (let iSurface = 0; iSurface < 6; iSurface++) {
      meshData.surfaces.push({
        materialNumber: iPly,
        nodeNumbers: []
      });
    }

    for (let iLength = 0; iLength < 2; iLength++) {
      for (let iWidth = 0; iWidth < 2; iWidth++) {
        meshData.position.push(
          iLength * length / nLength, 
          iWidth * width / nWidth, 
          iPly * plyThickness
        );
      }
    } 
  }

  return meshData;
}

function iNode(ix, iy, iz) {
  return ix * (ny + 1) * (nz + 1) + iy * (nz + 1) + iz;
}