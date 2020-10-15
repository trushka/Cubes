var density=.22, bevel=.8 ,Cu=.22,
	pSise=185, deviation=.65,

	count=480, countAround=20,
	big=320, small=110, figSize=610,

	bumpMap='bump.jpg',
	force=.005, parallax=1100,
	fogColor='#171717', //page background color
	color='#886', CuColor='#f70', expandColor=2,
	scroll0=scrollY, ds=0, CuCount=0,
	raycaster=new THREE.Raycaster(), touched,

	camera, scene, renderer, light, pos0, size,
	cubes, particles, figure, around, main,
	q0=new THREE.Quaternion(),
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
var canvas=document.querySelector('.renderer'),
	W, H, aspect=1, vMin, dpr=1, bCount, bR=500, bdR=50, PI=Math.PI;
var bgObj, bGeometry=new THREE.BufferGeometry(), bVerts=[], bTrans=[], bRR=bR*bR, bRR2=(bR+bdR)*(bR+bdR);

renderer = new THREE.WebGLRenderer({alpha:true, antialias:true, canvas: canvas});//
//renderer.shadowMap.enabled = true;


camera = new THREE.PerspectiveCamera( 18, aspect, 5000, 10000 );
camera.position.z=-7500;
camera.lookAt(0,0,0);
camera.updateMatrixWorld();
scene = new THREE.Scene();
scene.add(camera);

scene.fog=new THREE.Fog(fogColor, camera.near, camera.far)

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

var lights=new THREE.IcosahedronGeometry(1,8);
lights.vertices.forEach((v, i)=>{
	//console.log(v);
	//if (v.y<-.2) return;
	var color=new THREE.Color('#ddc');
	color.r+=rnd(.2);
	color.g+=rnd(.2);
	color.b+=rnd(.23);
	if (Math.random()>.2) color.multiplyScalar(v.y*.2+.2);
	lights.colors.push(color)
})
lights.faces.forEach((f, i)=>{
	f.vertexColors=[lights.colors[f.a],
	 lights.colors[f.b], lights.colors[f.c]]
})
// new THREE.TextureLoader()//EXRLoader()forest.exr
//  //.setDataType( THREE.UnsignedByteType )
//  //.setPath( 'textures/equirectangular/' )
//  .load( 'env0.jpg', function ( texture ) {

// 	var envMap = pmremGenerator.fromEquirectangular( texture ).texture;

// 	scene.environment = envMap;

// 	texture.dispose();
// 	pmremGenerator.dispose();
// })

var scene2=new THREE.Scene().add(
	new THREE.Mesh(lights, new THREE.MeshBasicMaterial({
		vertexColors: true,
		wireframe: true,
		side: THREE.BackSide
	}))
)
scene2.background=new THREE.Color('#666');
renderer._render=renderer.render;
renderer.render=function(s,c){
	console.log('rr');
	renderer._render(s,c);
	renderer.gammaFactor=.5;
	renderer.outputEncoding=THREE.GammaEncoding;
}
var pmremGenerator = new THREE.PMREMGenerator( renderer );
//pmremGenerator.compileEquirectangularShader();
scene.environment =scene.background= pmremGenerator.fromScene(scene2, .016).texture;
pmremGenerator.dispose();
	renderer.render=renderer._render;

bTexture=new THREE.TextureLoader().load(bumpMap);
var material = new THREE.MeshStandardMaterial({
	//flatShading: true,
	metalness: .974,
	roughness: .25,
	color: color,
	bumpMap: bTexture,
	roughnessMap: bTexture,
	aoMap: bTexture,
	aoMapIntensity: 1.6,
	envMapIntensity: 8.5,//.25,
	bumpScale: .01
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
		scrSize=pSise/H/2*scrScale, size2=scrSize*scrSize*6, minS=size2,
		bCount=Math.round(W*H/10000/scrScale/scrScale*density);
	size=vec3(0, scrSize, 0).unproject(camera).y;
	var scale=size/size0;
	if (l) {
		for (var i = 0; i < l; i++) {
			let cube=particles[i],
				pos=cube.position.multiply(vec3(scale, scale,1)).clone();
			cubes.localToWorld(pos).project(camera);

			if (Math.abs(pos.x)+scrSize>1 || Math.abs(pos.y)>1){
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
		var x=rnd(2)-1, y=rnd(2)-1, pos;

		if (positions.some(p=>(x-p.x)*(x-p.x)+(y-p.y)*(y-p.y)<dist)) return setPos(dist*.9999);

		minS=Math.min(minS, dist);
		positions.push(pos=vec3(x, y, rnd(1.8)-.9));
		return cubes.worldToLocal(pos.unproject(camera)).clone();
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
	console.log(minS/scrSize/scrSize);
	//particles.length=bCount;
};
function initMain(){
	scene.fog.near=camera.position.length()-figSize;
	scene.add(main=new THREE.Group());
	main.add(
		figure=new THREE.Group(),
		around=new THREE.Group()
	).tr={
			axis: vec3(0,1,0),
			axisW: vec3(0,0,1).normalize(),
			dq: new THREE.Quaternion(),
			dp: vec3(),
			size: figSize,
			size2: figSize*figSize/2
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
		var pos=i<4?vec3().fromArray([[1,1,1],[-1,-1,1],[1,-1,-1],[-1,1,-1]][i]).multiplyScalar(figSize/2):setPos(5000,sizeI);
		if (!pos) {console.log(i); break};

		geom=cubeGeometry(sizeI, bevel);

		let isCu=(i<4 || CuCount<Math.round(i*Cu));
		cube=new THREE.Mesh(geom, isCu?CuMaterial:material);
		figure.add(cube);
		cube.position.copy(pos).multiplyScalar(50);
		cube.rotation.set(rnd(PI), rnd(PI), rnd(PI));
		if (i<4) cube.rotation.multiplyScalar(.05);
		//console.log(cube.quaternion);

		cube.tr={
			pos: pos,
			lerp: i>3?(figSize*1.5-pos.length())/figSize:1.1,
			dq: new THREE.Quaternion(),
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
	roV=1-Math.pow(ro/2/Math.PI, 7);
	if (window.showMainAnimation) {
		figure.children.forEach(function(el, i){
			el.position.lerp(el.tr.pos, delta*(dPos+2)*el.tr.lerp);
		});
		main.rotateOnAxis(main.tr.axis, -delta*2*(roV+.00));
		main.rotateOnWorldAxis(main.tr.axisW, dRo);
		//main.matrix.makeRotationFromQuaternion(main.quaternion);
		main.tr.dq.slerp(quMouse.slerp(q0, delta*1), delta*30);
		main.applyQuaternion((main.tr.dq).slerp(q0, roV).normalize());
		//scene.quaternion.copy(main.quaternion);
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
		if (touched&&main) {
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