var density=.22, bevel=.8 ,Cu=.22,
	pSise=185, deviation=.65,

	count=480, countAround=20,
	big=320, small=110, figSize=610,

	bumpMap='bump.jpg',
	force=.005, parallax=1100,
	fogColor='#171717', //page background color
	color='#885', CuColor='#f70', expandColor=2,
	scroll0=scrollY, ds=0, CuCount=0,
	raycaster=new THREE.Raycaster(), touched,

	camera, scene, renderer, light, pos0, size,
	cubes, particles, figure, around, main,
	q0=new THREE.Quaternion(),
	vec3=function(x,y,z){return new THREE.Vector3(x||0, y||0, z||0)}, lookAt=vec3(0,0,0), PI=Math.PI;

THREE.Vector3.prototype.rotate=function(x,y,z,t){
	return this.applyEuler(new THREE.Euler(x,y,z,t))
}
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
var canvas=document.querySelector('.renderer'),
	W, H, aspect=1, vMin, dpr=1, bCount, bR=500, bdR=50, PI=Math.PI;
var bgObj, bGeometry=new THREE.BufferGeometry(), bVerts=[], bTrans=[], bRR=bR*bR, bRR2=(bR+bdR)*(bR+bdR);

renderer = new THREE.WebGLRenderer({alpha:true, antialias:true, canvas: canvas});//
//renderer.shadowMap.enabled = true;


camera = new THREE.PerspectiveCamera( 18, aspect, 5000, 10000 );
camera.position.z=-7500;
camera.lookAt(0,0,0);
scene = new THREE.Scene();
scene.add(camera);

renderer.gammaFactor=1.3
renderer.outputEncoding=THREE.GammaEncoding

scene.fog=new THREE.Fog(fogColor, camera.near, camera.far)

cubes = new THREE.Group();
particles=cubes.children;
lightH=new THREE.HemisphereLight('#eec', 0, 7.5)
scene.add(lightH,  cubes);
lightH.position.set(0,1.6,1);
lightH=new THREE.HemisphereLight('#cdd', 0, 7.8)
//scene.add(lightH);
lightH.position.set(1,1.6,.2);
lightH=new THREE.HemisphereLight('#ddc', 0, 7.5)
//scene.add(lightH);
lightH.position.set(-1,1.6,.2);
lightE=new THREE.AmbientLight('#fff', -1)
scene.add(lightE);

scene.rotation.y=-1
scene.updateMatrixWorld();

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
	//scene.add(light);
})
new THREE.EXRLoader()
 .setDataType( THREE.UnsignedByteType )
 //.setPath( 'textures/equirectangular/' )
 .load( 'city.exr', function ( texture ) {

	var envMap = pmremGenerator.fromEquirectangular( texture ).texture;

	scene.environment = envMap;

	texture.dispose();
	pmremGenerator.dispose();
})

var pmremGenerator = new THREE.PMREMGenerator( renderer );
pmremGenerator.compileEquirectangularShader();

bTexture=new THREE.TextureLoader().load(bumpMap);
var material = new THREE.MeshStandardMaterial({
	//flatShading: true,
	metalness: .975,
	roughness: .2,
	color: color,
	bumpMap: bTexture,
	roughnessMap: bTexture,
	aoMap: bTexture,
	aoMapIntensity: 1.6,
	envMapIntensity: .35,
	bumpScale: .1
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
	if (!window.showBgAnimation) return;
	var l=particles.length,
		size0=size, positions=[], scrScale=Math.min(1, Math.sqrt(W/H)),
		scrSize=pSise/H/2*scrScale, minS=size2,
		scrSizeX=scrSize*H/W,
		bCount=Math.round(W*H/10000/scrScale/scrScale*density);
	size=vec3(0, scrSize, 0).unproject(camera).y;
	var scale=size/size0, size2=size*size*70;
	if (l) {
		for (var i = 0; i < l; i++) {
			let cube=particles[i],
				pos=cube.position.multiplyScalar(scale).clone(),//,
				pos1=cubes.localToWorld(pos).clone().project(camera);

			if (Math.abs(pos1.x)+scrSize/2>1 ||
				Math.abs(pos1.z)+scrSize/2>1 || Math.abs(pos1.y)>1){
				if (cube.material==CuMaterial) CuCount--;
				cubes.remove(cube);
				i--; l--;
			} else {
				cube.scale.multiplyScalar(scale);
				cube.tr.size*=size/size0;
				positions.push(pos)
			}
		}
	}
	//console.log(W,w0)
	function setPos(dist) {
		var pos=vec3(rnd(2,-1)*(1- scrSizeX),
		 rnd(2,-1)*(1- scrSizeX), rnd(1.8)-.9).unproject(camera);

		if (positions.some(p=>p.distanceToSquared(pos)<dist)) return setPos(dist*.9999);

		minS=Math.min(minS, dist);
		positions.push(pos);
		return cubes.worldToLocal(pos.clone());
	}
	for (var i = 0, geom, pos=vec3(), sizeI, cube, x, dw=(W-w0)/W; i < bCount-l; i++) {
		sizeI=size;//*rnd(deviation, 1);
		geom=cubeGeometry(sizeI, bevel);

		let isCu=(CuCount<Math.round(bCount*Cu));
		cube=new THREE.Mesh(geom, isCu?CuMaterial:material);
		cubes.add(cube);
		if (isCu) CuCount++;
		//cube.castShadow=cube.receiveShadow=true;
		cube.position.copy(setPos(size2));

		cube.rotation.set(rnd(PI), rnd(PI), rnd(PI));
		//particles[i].frustumCulled=false;
		cube.tr={
			dq: new THREE.Quaternion(),
			dp: vec3(),
			size: sizeI,
			size2: sizeI*sizeI/2
		}
	}
	console.log(scrSize);
	//particles.length=bCount;
};
function initMain(){
	scene.fog.near=camera.position.length()-figSize;
	scene.add(main=new THREE.Group());
	main.add(
		figure=new THREE.Group(),
		around=new THREE.Group()
	).rotateZ(-.2).rotateY(-PI/4)
	 .tr={
		axis: vec3(0,1,0),
		axisW: vec3(0,0,1).normalize(),
		dq: new THREE.Quaternion(),
		dp: vec3(),
		size: figSize,
		size2: figSize*figSize/2,
		q: q0.clone().set(
			-0.09590164747088724, 0.5444665507147546, -0.5453308531376693, 0.6300581796797367)
	};
	//cubes.add(main);
	function setPos(n, size){
		if (!n) return false;
		var pos=vec3(rnd(2)-1, rnd(2)-1, rnd(2)-1).multiplyScalar(figSize/2);
		if (figure.children.some(el=>el.tr.pos.distanceTo(pos)<(size+el.tr.size)*.42))
			return setPos(n-1, size)
		else return pos;
	}
	for (var i = 0; i < count; i++) {
		sizeI=i<4?big:small*rnd(deviation, 1);
		let pos=i<4?vec3().fromArray([[1,1,1],[-1,-1,1],[1,-1,-1],[-1,1,-1]][i]).multiplyScalar(figSize/2):setPos(5000,sizeI);
		if (!pos) {console.log(i); break};

		let geom=cubeGeometry(sizeI, bevel);

		let isCu=(i<4 || CuCount<Math.round(i*Cu));
		let cube=new THREE.Mesh(geom, isCu?CuMaterial:material);
		figure.add(cube);
		cube.position.copy(pos).multiplyScalar(50);
		cube.rotation.set(rnd(PI), rnd(PI), rnd(PI));
		if (i<4) cube.rotation.multiplyScalar(.05);
		//console.log(cube.quaternion);

		cube.tr={
			big: i<4,
			pos: pos,
			lerp: i>3?(figSize*1.4-pos.length())*1.1/figSize:1.1,
			dq: new THREE.Quaternion(),
			dp: vec3(),
			size: sizeI,
			size2: sizeI*sizeI/2
		}
		if (isCu) CuCount++;
	}

	function setOrbitPos(n){
		if (!n) return false;
		var pos=vec3(figSize*1.45, 0, 0).add(
			vec3(rnd(figSize)*.6, 0, 0).rotate(0, 0, rnd(PI*2))
		)
		if (pos.x<figSize*1.1) return setOrbitPos(n-1);
		pos.rotate(0, rnd(PI*2), 0);
		if (around.children.some(el=>el.tr.pos.distanceTo(pos)<figSize*.85)){
			return setOrbitPos(n-1)
		} else return pos;
	}
	for (var i = 0, CuCount=0; i < count; i++) {
		sizeI=small*rnd(deviation, 1)*.8;
		let pos=setOrbitPos(5000);
		if (!pos) {console.log(i); break};
		//console.log(pos);

		let geom=cubeGeometry(sizeI, bevel);

		let isCu=(CuCount<Math.round(i*Cu));
		let cube=new THREE.Mesh(geom, isCu?CuMaterial:material);
		around.add(cube);
		cube.position.copy(pos).multiplyScalar(15).y*=15;
		cube.rotation.set(rnd(PI), rnd(PI), rnd(PI));
		//console.log(cube.quaternion);

		cube.tr={
			pos: pos,
			lerp: rnd(.2)+.5,
			dq: q0.clone().setFromEuler(
				new THREE.Euler(rnd()-.5, rnd()-.5, rnd()-.5).multiplyScalar(0.7)),
			dp: vec3(),
			size: sizeI,
			size2: sizeI*sizeI/2
		}
		if (isCu) CuCount++;
	}
}
if (window.showMainAnimation) initMain();

requestAnimationFrame( function animate() {
	requestAnimationFrame( animate );
	var delta=clock.getDelta(.1, 0.01);
	if (!delta || document.readyState!='complete' || !scene.environment) return;
	const q0=new THREE.Quaternion();
	var pos=canvas._pos=canvas.getBoundingClientRect(), resize;
	//if (pos.bottom<=0 || pos.top>=window.innerHeight) return;
	if (W!==pos.width || H!==pos.height) {
		let w0=W;
		W=pos.width;
		H=pos.height;
		vMin=Math.min(W,H);
		renderer.setSize(W, H, false);
		camera.aspect=W/H;
		camera.updateProjectionMatrix();
		init();
	}
	if (dpr!=(dpr=window.devicePixelRatio) ) {
		renderer.setPixelRatio( dpr );
	}
	var dY=(scrollY-scroll0)%H*parallax/H;
	scroll0=scrollY;
	//scene.rotateY(.0005);
	if (1) {
		// background random movement
		let scrPos, pos, posY, tr, ray, active;
		let dq=.0001, dq2=-.00005;
		for (var i = 0; i < particles.length; i++) {
			tr=particles[i].tr;
			pos=cubes.localToWorld(particles[i].position);
			pos.y+=dY;

			scrPos=pos.clone();
			//scrPos.x-=(scrPos.x<0?tr.size:-tr.size);
			posY=scrPos.y+=(scrPos.y<0?tr.size:-tr.size);
			scrPos.z-=(scrPos.z<0?tr.size:-tr.size);
			scrPos.project(camera);
			scrPos.x=(scrPos.x+1)/2;

			F=vec3();
			if (scrPos.x<-1 ) F.x=-force;
			if (scrPos.x>1 ) F.x=force;
			if (scrPos.y<-1 || scrPos.y>1) pos.y=-Math.sign(pos.y)*(posY/scrPos.y+tr.size);
			if (scrPos.z<-1) F.z=.1;
			if (scrPos.z>1) F.z=-.1;
			tr.dp.add(cubes.worldToLocal(F));
			cubes.worldToLocal(pos);
			pos.add(tr.dp.add(vec3(rnd(.01,-.005), rnd(.01,-.005), rnd(.01,-.005))).multiplyScalar(.995));

			ray=raycaster.ray.clone().applyMatrix4(new THREE.Matrix4().getInverse( cubes.matrixWorld ));
			active=(touched && ray.distanceSqToPoint(pos)<tr.size2);

			if (active) {
				if (!tr.dq1){
					let fi=tr.dq.angleTo(q0);
					tr.dq1=new THREE.Quaternion().slerp(tr.dq, .025/fi);
				}
				tr.dq.slerp(tr.dq1, .1);
			} else {
				delete tr.dq1;
				tr.dq._x+=rnd(dq, dq2); tr.dq._y+=rnd(dq, dq2); tr.dq._z+=rnd(dq, dq2); tr.dq._w+=rnd(dq, dq2);
				tr.dq.slerp(q0, .05);
			}
			particles[i].applyQuaternion(tr.dq.normalize());
		}
	}
	dPos+=(2-dPos)*delta/2;
	var dRo=dPos*dPos*dPos*dPos*delta*.09*roV;
	ro+=dRo;
	roV=1-Math.pow(ro/1.81/PI, 3);
	if (window.showMainAnimation) {
		main.traverse(function(el){
			if (!el.isMesh) return;
			el.position.lerp(el.tr.pos, delta*(dPos+2)*el.tr.lerp);
			if (el.parent==around) {
				el.applyQuaternion(q0.clone().slerp(el.tr.dq, delta))
			} else {
				// if (!el.tr.big)el.rotateY(Math.min(
				// 	10, el.position.distanceToSquared(el.tr.pos)
				// )*delta)
			}
		});
		around.rotateOnAxis(main.tr.axis, -delta*2.2*.05);
		main.rotateOnAxis(main.tr.axis, -delta*2.2*(roV));
		main.rotateOnWorldAxis(main.tr.axisW, dRo);
		main.tr.dq.slerp(quMouse.slerp(q0, delta*1), delta*30);
		main.applyQuaternion((main.tr.dq).slerp(q0, roV).normalize());
		main.quaternion.slerp(main.tr.q, delta*.1)
	}
	renderer.render( scene, camera );
	//document.body.style.background=touched?'#0a6':''
});
var dPos=0, roV=1, ro=0, mouse0=vec3(),
	quMouse=new THREE.Quaternion();

'mousedown mousemove touchstart touchmove'.split(' ').forEach(eType=>{
	addEventListener(eType, e=>{
		var touches=e.changedTouches||[e];
		var x=(touches[0].clientX-canvas._pos.left) / W  * 2 - 1,
			y=-(touches[0].clientY-canvas._pos.top) / H  * 2 + 1,
			z=-1;
		raycaster.setFromCamera( new THREE.Vector2(x,y), camera);
		var mouse=vec3(x,y,z).unproject(camera).normalize();
		scene.worldToLocal(mouse);
		if (touched && main) {
			quMouse.setFromUnitVectors(mouse0, mouse)
			 .slerp(q0, -3).slerp(main.tr.dq, .85);
		}
		mouse0=mouse;
		touched=true
	})
})
'mouseup touchend touchcancel blur mouseleave'.split(' ').forEach(eType=>{
	document.addEventListener(eType, e=>{ console.log(touched=false) })
})