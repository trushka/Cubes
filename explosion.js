var letter_url='p.json', roV=-.2, color='#fff',
	ds=0, camera, scene, renderer, light, pos0, geometry, letter,
	vec3=function(x,y,z){return new THREE.Vector3(x||0, y||0, z||0)}, lookAt=vec3(0,0,0), PI=Math.PI;

THREE.Clock.prototype.getDelta=function(max, min){
	var old=this._elapsedTime, now=(window.performance||Date).now()/1000,
		d=Math.min(now-old, isNaN(max)? this.maxDelta||.1 :max);
	if (d<(min||this.minDelta||.022)) return 0;
	this.oldTime=old;
	this._elapsedTime=now;
	this.elapsedTime=old+d;
	return this.delta=d;
}
THREE.Euler.prototype.multiplyScalar=THREE.Vector3.prototype.multiplyScalar;
function rnd(a,b) {return Math.random()*(a||1)+(b||0)}

var clock = new THREE.Clock();
var canvas=document.querySelector('#renderer'),
	W, H, aspect=1, vMin, dpr=1, bSise=40, bCount=300, bR=500, bdR=50, PI=Math.PI;
var bgObj, bGeometry=new THREE.BufferGeometry(), bVerts=[], bTrans=[], bRR=bR*bR, bRR2=(bR+bdR)*(bR+bdR);

renderer = new THREE.WebGLRenderer({alpha:true, antialias:true, canvas: canvas});//
//renderer.context.getExtension('OES_standard_derivatives');
camera = new THREE.PerspectiveCamera( 18, aspect, 500, 5000 );
camera.position.z=2000
scene = new THREE.Scene();
light=new THREE.HemisphereLight('#fff', 0, 23)
scene.add(light);
light.position.set(0,.5,1)
var material = new THREE.MeshStandardMaterial({
	metalness: .964,
	roughness: .5
});//, opacity: 0
material.color.set(color);
material.side=2;
new THREE.JSONLoader().load(letter_url, function(g){
	scene.add(letter=new THREE.Mesh(geometry=g, material))
	var v=geometry.vertices, vArr=[];
	geometry.faces.forEach(function(f,i){
		f.F=vec3();
		f.v= [v[f.a].clone(), v[f.b].clone(), v[f.c].clone()];
		f.dv=[v[f.a].clone(), v[f.b].clone(), v[f.c].clone()];
		f.center=f.dv[0].clone().add(f.dv[1]).add(f.dv[2]).multiplyScalar(1/3);
		f.dv[0].sub(f.center);
		f.dv[1].sub(f.center);
		f.dv[2].sub(f.center);
		genRnd(f);
	})
	for (var i = 0, v0, v1, v2, r; i < bCount; i++) {
		v0=bVerts[i*3]=vec3(rnd(bSise, -bSise/2), rnd(bSise, -bSise/2), rnd(bSise, -bSise/2));
		v1=bVerts[i*3+1]=vec3(rnd(bSise, -bSise/2), rnd(bSise, -bSise/2), rnd(bSise, -bSise/2));
		v2=bVerts[i*3+2]=v0.clone().add(v1).negate();
		bTrans[i]={
			dq: new THREE.Quaternion(),
			dr: vec3(),
			r: r=vec3(Math.random()*bdR+bR)
			 .applyEuler(new THREE.Euler(Math.random()*PI*2, Math.random()*PI*2, Math.random()*PI*2))
		}
		vArr=vArr.concat(v0.clone().add(r).toArray()); //vArr[2*i]
		vArr=vArr.concat(v1.clone().add(r).toArray());
		vArr=vArr.concat(v2.clone().add(r).toArray());
		// vArr=vArr.concat(v0.clone().sub(r).toArray());
		// vArr=vArr.concat(v1.clone().sub(r).toArray());
		// vArr=vArr.concat(v2.clone().sub(r).toArray());
	}
	bGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute ( vArr, 3 ) );
	bGeometry.computeVertexNormals();
	scene.add(bgObj=new THREE.Mesh(bGeometry, material))
});
function genRnd(f) {
	f.rot=new THREE.Euler(Math.random(), Math.random(), Math.random());
	f.dist=f.rot.x*f.rot.y*f.rot.z*3+1;
	f.rot.multiplyScalar(9)
}
// interactions
var dx, dy=dx=x0=y0=0, active, abc=['a', 'b', 'c'], movedPoints=[], activeF=[], ready,
	raycaster=new THREE.Raycaster(), rDepth=5, G=30, inertness=5, d0=vec3(),
	mouse = new THREE.Vector2(100);
window.getWpos=function(){
	return [scene.position, scene.rotation, camera]
}
function interact() {
	raycaster.setFromCamera( mouse, camera );
	var inters=raycaster.intersectObject(letter)[0], ind, vert;
	if (!geometry) return;
	active=!!inters;
	point=!active ? vec3(0,0,-100000)
		: letter.worldToLocal(inters.point.clone().add(raycaster.ray.direction.clone().multiplyScalar(rDepth)));
	// console.log('----1', point, inters.face.v);
	geometry.faces.forEach (function(f,i) {
		var val, k=i*9, g=G*f.dist,
			F=f.center.clone().sub(point).setLength(g);
		f.F.add(F.sub(f.F).multiplyScalar(1/inertness/f.dist));
		if (!active) {
			f.F.set(0,0,0);
			genRnd(f)
		}
		val=f.F.length()/g;
		// f.v.forEach(function(v,j){
		// 	var dist=v.clone().sub(point);

		// 	F.add(dist.setLength(1/dist.lengthSq()));
		// 	//F.add(dist.divideScalar(dist.lengthSq()));
		// });
		//f.F=F.multiplyScalar(G); if (F.lengthSq()>1) console.log(i, F);
		var c=f.center.clone().add(f.F),
			q=new THREE.Quaternion().setFromUnitVectors(f.F.clone().normalize(), f.normal),
			q1=new THREE.Quaternion().setFromEuler(f.rot.clone().multiplyScalar(val));
		q.slerp(new THREE.Quaternion(), 1-val).multiply(q1);
		f.v[0].addVectors(f.dv[0].clone().applyQuaternion(q), c);
		f.v[1].addVectors(f.dv[1].clone().applyQuaternion(q), c);
		f.v[2].addVectors(f.dv[2].clone().applyQuaternion(q), c);
	})
}
canvas.onmousedown=canvas.ontouchstart=
canvas.onmousemove=canvas.ontouchmove=function(e){
	var touches=e.changedTouches;
	if (touches) e=touches[0];
	mouse.x = ( (e.clientX-canvas._pos.left) / W ) * 2 - 1;
	mouse.y = -( (e.clientY-canvas._pos.top) / H ) * 2 + 1;
};
ontouchend=ontouchcancel=onmouseup=canvas.onmouseout=function(e){
	mouse.x=mouse.y=1000;
}
requestAnimationFrame( function animate() {
	requestAnimationFrame( animate );
	if (!letter) return;
	var delta=clock.getDelta();
	if (!delta) return;
	var pos=canvas._pos=canvas.getBoundingClientRect(), resize;
	if (pos.bottom<=0 || pos.top>=window.innerHeight) return;
	if (W!=(W=pos.width) || H!=(H=pos.height)) {
		vMin=Math.min(W,H);
		renderer.setSize(W, H);
		camera.aspect=W/H;
		camera.updateProjectionMatrix();
		resize=1;
	}
	if (dpr!=(dpr=window.devicePixelRatio) ) {
		renderer.setPixelRatio( dpr );
		resize=1;
	}
	if (resize) canvas.style.cssText='';
	letter.rotation.y+=roV*delta;
	bgObj.rotation.y+=roV*delta/10;
	interact();
	if (geometry && geometry._bufferGeometry) {
		var attr=geometry._bufferGeometry.attributes, bpos=attr.position, vArr=bpos.array,
			vIndex=-1, fIndex=0, components=['x','y','z'];
		vArr.forEach(function(p, i){
			var cIndex=i%3;
			if (!cIndex) {
				if (++vIndex==3){
					fIndex++; vIndex=0
				}
			}
			//console.log(i,cIndex,vIndex,fIndex)
			var f=geometry.faces[fIndex], v=f.v[vIndex], comp=v[components[cIndex]];
			vArr[i]+=(comp-p)/inertness;
		})
		geometry._bufferGeometry.computeVertexNormals();
		bpos.needsUpdate=true
		// background random movement
		var bgPos=bGeometry.attributes.position, bgArr=bgPos.array;
		for (var i = 0, i0, i1, i2, v0, v1, v2, r, tr; i < bCount; i++) {
			tr=bTrans[i]; r=tr.r;
			tr.dq._x*=.995; tr.dq._y*=.995; tr.dq._z*=.995;
			tr.dq._x+=rnd(.0014,-.0007); tr.dq._y+=rnd(.0014,-.0007); tr.dq._z+=rnd(.0014,-.0007);
			v0=bVerts[i0=i*3].applyQuaternion(tr.dq.normalize());
			v1=bVerts[i1=i0+1].applyQuaternion(tr.dq);
			v2=bVerts[i2=i0+2].applyQuaternion(tr.dq);

			if (r.lengthSq()<bRR) tr.dr.add(r.clone().multiplyScalar(.0001))
			if (r.lengthSq()>bRR2) tr.dr.sub(r.clone().multiplyScalar(.0001))
			r.add(tr.dr.add(vec3(rnd(.1,-.05), rnd(.1,-.05), rnd(.1,-.05))).multiplyScalar(.995))

			bgArr.set(v0.clone().add(r).toArray(), i0*3);
			bgArr.set(v1.clone().add(r).toArray(), i1*3);
			bgArr.set(v2.clone().add(r).toArray(), i2*3);
			// vArr=vArr.concat(v0.clone().sub(r).toArray());
			// vArr=vArr.concat(v1.clone().sub(r).toArray());
			// vArr=vArr.concat(v2.clone().sub(r).toArray());
		}
		bgPos.needsUpdate=true;
		bGeometry.computeVertexNormals();
	}
	//letter.position.add(vec3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(1))
	renderer.render( scene, camera );
})