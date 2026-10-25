// Distant traffic keeps a clean silhouette with no sub-pixel badges, rim spokes,
// coplanar light inserts or dynamic self-shadows. Geometry is shared by every car.
export function trafficLODFactory(THREE){
 const paintParts=[],detailParts=[];
 function part(geometry,x,y,z,color,target,rotation=0){geometry.rotateZ(rotation);geometry.translate(x,y,z);const flat=geometry.index?geometry.toNonIndexed():geometry;const p=flat.attributes.position,n=flat.attributes.normal,c=new THREE.Color(color).convertSRGBToLinear();target.push({p:Array.from(p.array),n:Array.from(n.array),c});if(flat!==geometry)flat.dispose();geometry.dispose();}
 part(new THREE.BoxGeometry(1.83,.75,4.16),0,.7,0,'#ffffff',paintParts);
 part(new THREE.BoxGeometry(1.5,.65,2.35),0,1.37,-.25,'#ffffff',paintParts);
 part(new THREE.BoxGeometry(1.27,.43,.035),0,1.4,-1.448,'#253b40',detailParts);
 part(new THREE.BoxGeometry(1.27,.43,.035),0,1.4,.948,'#253b40',detailParts);
 for(const side of [-1,1]){
  part(new THREE.BoxGeometry(.035,.43,1.98),side*.766,1.4,-.25,'#253b40',detailParts);
  for(const z of [-1.47,1.397])part(new THREE.CylinderGeometry(.31,.31,.24,10),side*.90,.31,z,'#30352f',detailParts,Math.PI/2);
  part(new THREE.BoxGeometry(.19,.26,.055),side*.64,.78,-2.117,'#ac3030',detailParts);
  part(new THREE.BoxGeometry(.29,.20,.055),side*.64,.78,2.117,'#f7e9c6',detailParts);
 }
 function combine(parts){const p=[],n=[],c=[];for(const a of parts){p.push(...a.p);n.push(...a.n);for(let i=0;i<a.p.length;i+=3)c.push(a.c.r,a.c.g,a.c.b);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.computeBoundingSphere();return g;}
 const body=combine(paintParts),details=combine(detailParts),detailMat=new THREE.MeshLambertMaterial({vertexColors:true});
 return color=>{const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color,vertexColors:true});g.add(new THREE.Mesh(body,m),new THREE.Mesh(details,detailMat));g.userData.paint=m;return g;};
}
