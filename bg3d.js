var density=.22, bevel=.8 ,Cu=.15,
	pSise=175, deviation=.1,
	bumpMap='bump.jpg',
	force=.1, parallax=1000,
	color='#aa9', CuColor='#c83', expandColor=1.2,
	scroll0=scrollY, ds=0,
	raycaster=new THREE.Raycaster(), touched,

	camera, scene, cubes, renderer, light, pos0, size, particles, 
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
function rnd(a,b) {return Math.random()*(a||1)+(b||0)};

var clock = new THREE.Clock();
var canvas=document.querySelector('#renderer'),
	W, H, aspect=1, vMin, dpr=1, bCount, bR=500, bdR=50, PI=Math.PI;
var bgObj, bGeometry=new THREE.BufferGeometry(), bVerts=[], bTrans=[], bRR=bR*bR, bRR2=(bR+bdR)*(bR+bdR);

renderer = new THREE.WebGLRenderer({alpha:true, antialias:true, canvas: canvas});//
//renderer.shadowMap.enabled = true;


camera = new THREE.PerspectiveCamera( 18, aspect, 5000, 15000 );
//camera.position.z=1000
scene = new THREE.Scene();
cubes = new THREE.Group();
particles=cubes.children;
lightH=new THREE.HemisphereLight('#ddd', 0, 9)
scene.add(lightH,  cubes);
lightH.position.set(0,1.6,1);
lightH=new THREE.HemisphereLight('#cdd', 0, 9.8)
scene.add(lightH);
lightH.position.set(1,1.6,.2);
lightH=new THREE.HemisphereLight('#ddc', 0, 9.5)
scene.add(lightH);
lightH.position.set(-1,1.6,.2);

new THREE.IcosahedronGeometry(1,1).vertices.forEach((v, i)=>{
	//console.log(v);
	if (v.y<-.2) return;
	var light=new THREE.DirectionalLight('#aa9', .011);
	if (v.y<.3 && v.z<.25 && (Math.random()>.5 || v.z<.1)) light.intensity*=-.2;
	v.z+=.3; v.y-=.2;
	light.color.r+=rnd(.2);
	light.color.g+=rnd(.2);
	light.color.b+=rnd(.23);
	light.position.copy(v.normalize());
	light.castShadow = false//(v.z>0&&v.y>.5);
	scene.add(light);
})

bTexture=new THREE.TextureLoader().load(bumpMap);
var material = new THREE.MeshStandardMaterial({
	//flatShading: true,
	metalness: .974,
	roughness: .25,
	color: color,
	//bumpMap: bTexture,
	roughnessMap: bTexture,
	aoMap: bTexture,
	aoMapIntensity: 1.6,
	//bumpScale: .01
}),
	CuMaterial=material.clone();//, opacity: 0
material.color.multiplyScalar(expandColor);
CuMaterial.color.set(CuColor).multiplyScalar(expandColor);
bTexture.repeat.set(.003, .003);
bTexture.offset.set(1.5, 1.5);
bTexture.wrapS = bTexture.wrapT = THREE.MirroredRepeatWrapping;

function cubeGeometry( size, bevel ) {
  var x=size/2;
  var y=size/2;
  let shape = new THREE.Shape();
  shape.moveTo(x, y-bevel);
  shape.lineTo(x, -y+bevel);
  shape.lineTo(x-bevel, -y);
  shape.lineTo(-x+bevel, -y);
  shape.lineTo(-x, -y+bevel);
  shape.lineTo(-x, y-bevel);
  shape.lineTo(-x+bevel, y);
  shape.lineTo(x-bevel, y);
  let geometry = new THREE.ExtrudeBufferGeometry( shape, {
    depth: size - bevel * 2,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelOffset: -bevel
  });
  
  geometry.center();
  
  return geometry;
}

function init(w0) {
	var l=particles.length,
		size0=size, positions=[],
		scrSize=pSise/H/2, size2=scrSize*scrSize*6, minS=size2,
		bCount=Math.round(W*H/10000*density);
	size=vec3(0, scrSize, 0).unproject(camera).y;
	var scale=size/size0;
	if (l) {
		for (var i = 0; i < l; i++) {
			let cube=particles[i],
				pos=cube.position.multiply(vec3(scale, scale,1)).clone().project(camera);
			if (Math.abs(pos.x)+scrSize>1 || Math.abs(pos.y)>1){
				cubes.remove(cube);
				i--; l--;
			} else {
				cube.scale.multiplyScalar(scale);
				cube.bTrans.size*=size/size0;
				positions.push(pos)
			}
		}
	}
	var CuCount=Math.round((bCount-l)*Cu);
	//console.log(W,w0)
	function setPos(dist) {
		var x=rnd(2)-1, y=rnd(2)-1, pos;

		if (positions.some(p=>(x-p.x)*(x-p.x)+(y-p.y)*(y-p.y)<dist)) return setPos(dist*.9999);

		minS=Math.min(minS, dist);
		positions.push(pos=vec3(x, y, rnd(1.8)-.9));
		return pos.clone().unproject(camera);
	}
	for (var i = 0, geom, pos=vec3(), sizeI, cube, x, dw=(W-w0)/W; i < bCount-l; i++) {
		sizeI=size*rnd(deviation, 1);
		geom=cubeGeometry(sizeI, bevel);
		cube=new THREE.Mesh(geom, i>CuCount?material:CuMaterial);
		cubes.add(cube);
		//cube.castShadow=cube.receiveShadow=true;
		cube.position.copy(setPos(size2));

		cube.rotation.set(rnd(PI), rnd(PI), rnd(PI));
		//particles[i].frustumCulled=false;
		cube.bTrans={
			dq: new THREE.Quaternion(),
			dp: vec3(),
			size: sizeI,
			size2: sizeI*sizeI/2
		}
	}
	console.log(minS/scrSize/scrSize);
	//particles.length=bCount;
};

requestAnimationFrame( function animate() {
	requestAnimationFrame( animate );
	var delta=clock.getDelta();
	if (!delta) return;
	const q0=new THREE.Quaternion();
	var pos=canvas._pos=canvas.getBoundingClientRect(), resize;
	if (pos.bottom<=0 || pos.top>=window.innerHeight) return;
	if (W!=pos.width || H!==pos.height) {
		let w0=W;
		W=pos.width;
		H=pos.height;
		vMin=Math.min(W,H);
		renderer.setSize(W, H);
		camera.aspect=W/H;
		camera.updateProjectionMatrix();
		resize=1;
		init(W>w0?w0:0);
	}
	if (dpr!=(dpr=window.devicePixelRatio) ) {
		renderer.setPixelRatio( dpr );
		resize=1;
	}
	if (resize) canvas.style.cssText='';
	var dY=(scrollY-scroll0)*parallax/H;
	scroll0=scrollY;
	if (1) {
		// background random movement
		for (var i = 0, scrPos, pos, tr; i < particles.length; i++) {
			tr=particles[i].bTrans;
			pos=particles[i].position;
			pos.y+=dY;

			scrPos=pos.clone()
			scrPos.x+=(scrPos.x<0?tr.size:-tr.size);
			scrPos.y+=(scrPos.y<0?tr.size:-tr.size);
			scrPos.z+=(scrPos.z<0?tr.size:-tr.size);
			scrPos.project(camera);
			scrPos.x=(scrPos.x+1)/2;

			if (scrPos.x<0 && tr.dp.x<tr.size*3) tr.dp.x+=force;
			if (scrPos.x>1 && -tr.dp.x<tr.size*3) tr.dp.x-=force;
			if (scrPos.y<-1 || scrPos.y>1) pos.y*=-1;
			if (scrPos.z<-1) tr.dp.z-=force;
			if (scrPos.z>1) tr.dp.z+=force;
			pos.add(tr.dp.add(vec3(rnd(.01,-.005), rnd(.01,-.005), rnd(.01,-.005))).multiplyScalar(.995));

			let active=(touched && raycaster.ray.distanceSqToPoint(pos)<tr.size2)

			if (active) {
				if (!tr.dq1){
					let fi=tr.dq.angleTo(q0);
					tr.dq1=new THREE.Quaternion().slerp(tr.dq, .025/fi);
				}
				tr.dq.slerp(tr.dq1, .1);
			} else {
				delete tr.dq1;
				let dq=.0001, dq2=-.00005;
				tr.dq._x+=rnd(dq, dq2); tr.dq._y+=rnd(dq, dq2); tr.dq._z+=rnd(dq, dq2); tr.dq._w+=rnd(dq, dq2);
				tr.dq.slerp(q0, .05);
			}
			particles[i].applyQuaternion(tr.dq.normalize());
		}
	}
	renderer.render( scene, camera );
	//document.body.style.background=touched?'#0a6':''
});

'mousedown mousemove touchstart touchmove'.split(' ').forEach(eType=>{
	addEventListener(eType, e=>{
		var touches=e.changedTouches||[e];
		raycaster.setFromCamera( new THREE.Vector2(
			(touches[0].clientX-canvas._pos.left) / W  * 2 - 1,
			-(touches[0].clientY-canvas._pos.top) / H  * 2 + 1
		), camera);
		touched=true
	})
})
'mouseup touchend touchcancel blur mouseleave'.split(' ').forEach(eType=>{
	document.addEventListener(eType, e=>{ touched=false })
})