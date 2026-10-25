// Three r128 tests geometry bounds, even for InstancedMesh. Include every instance
// in a private geometry bound so off-camera batches can safely skip both views.
export function boundInstances(THREE,mesh,padding=.4){
 const geometry=mesh.geometry.clone();geometry.computeBoundingBox();
 const bounds=new THREE.Box3(),part=new THREE.Box3(),matrix=new THREE.Matrix4();
 for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);part.copy(geometry.boundingBox).applyMatrix4(matrix);bounds.union(part);}
 bounds.expandByScalar(padding);geometry.boundingBox=bounds;geometry.boundingSphere=bounds.getBoundingSphere(new THREE.Sphere());
 mesh.geometry=geometry;mesh.frustumCulled=true;return mesh;
}
