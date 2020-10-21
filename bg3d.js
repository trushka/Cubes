var density=.22, bevel=1 ,Cu=.17,
	pSise=185, deviation=.7,

	count=480, countAround=20,
	big=340*1.2, small=135*1.21,
	figSize=600*1.1,

	bumpMap='bump.jpg',
	force=.005, parallax=1100,
	fogColor='#171717', //page background color
	color='#8d8755', CuColor='#f70', expandColor=3.6,
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

renderer.gammaFactor=1.6
renderer.outputEncoding=THREE.GammaEncoding

scene.fog=new THREE.Fog(fogColor, camera.near, camera.far)

cubes = new THREE.Group();
particles=cubes.children;
var lightH=new THREE.HemisphereLight('#eec', 0, 3)
scene.add(lightH,  cubes);
var lightE=new THREE.AmbientLight('#fff', -1)
//scene.add(lightE);

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

	scene.environment = pmremGenerator.fromEquirectangular( texture ).texture;
	// texture.minFilter=THREE.LinearMipmapLinearFilter;
	// texture.generateMipmaps=true;
	//  = new THREE.WebGLCubeRenderTarget(512)
	//  .fromEquirectangularTexture(renderer, texture).texture

	texture.dispose();
	pmremGenerator.dispose();
})

var pmremGenerator = new THREE.PMREMGenerator( renderer );
pmremGenerator.compileEquirectangularShader();

var bTexture=new THREE.TextureLoader().load('metall3_.png');
var mTexture=new THREE.TextureLoader().load('map.jpg');
mTexture.wrapT = mTexture.wrapS = 
bTexture.wrapS = bTexture.wrapT = THREE.RepeatWrapping;
mTexture.offset.set(1.4, 1.5);
mTexture.repeat.set(.0008, .0008);
//mTexture.repeat.set(.1, .1);

//THREE.ShaderChunk.bumpmap_pars_fragment=
THREE.ShaderChunk.bumpmap_pars_fragment.replace('dBx, dBy', 'dBx*abs(dBx), dBy*abs(dBy)')

var material = new THREE.MeshStandardMaterial({
	//flatShading: true,
	onBeforeCompile: function(){console.log(this)},
	metalness: .99,
	roughness: .23,
	color: color,
	bumpMap: bTexture,
	roughnessMap: bTexture,
	metalnessMap: bTexture,
	map: mTexture,
	//aoMap: bTexture,
	aoMapIntensity: 1.6,
	envMapIntensity: .27,
	bumpScale: -.15
}),
	//CuMaterial=material.clone();//, opacity: 0
	CuMaterial=Object.create(material, {id:{value: new THREE.Material().id}});
	//CuMaterial.uuid="9DF2775B-63E7-4695-8890-2AEA123B10F6";
material.color.multiplyScalar(expandColor)//.multiplyScalar(1.11);

CuMaterial.color=new THREE.Color(CuColor).multiplyScalar(expandColor);
CuMaterial.envMapIntensity=.3; 

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
	scene.fog.near=camera.position.length()-figSize*6;
	scene.add(main=new THREE.Group());
	main.add(
		figure=new THREE.Group().rotateZ(-.2).rotateY(-PI/4),
		around=new THREE.Group()
	)
	 .tr={
		axis: vec3(0,1,0),
		axisW: vec3(.6,-.1,1).normalize(),
		dq: new THREE.Quaternion(),
		dp: vec3(),
		size: figSize,
		size2: figSize*figSize/2,
		q: q0.clone().setFromEuler(
			new THREE.Euler(PI/5, PI/4, -PI/2))
	};
	around.tr={
		axisW: vec3(0,1,0).rotate(-PI/6, PI/4),
		dq: new THREE.Quaternion()
	}
	//cubes.add(main);
	for (var i = 0, CuCount=0; i < count; i++) {
		let sizeI=i<4?big:i<4?small*rnd(deviation, 1):small*(.8+deviation);
		let pos;
		if (i<4) pos=vec3().fromArray([[1,1,1],[-1,-1,1],[1,-1,-1],[-1,1,-1]][i]).multiplyScalar(figSize/2)
		else if (i<8) pos=vec3().fromArray([[1,1,-1],[-1,-1,-1],[1,-1,1],[-1,1,1]][i-4]).multiplyScalar((figSize-small+big)*.43)
		else for (var n=0; n<8000; n++) {
			pos=vec3(rnd(2)-1, rnd(2)-1, rnd(2)-1).multiplyScalar((small*.8+figSize)/2);
			if (!figure.children.some(el=>el.tr.pos.distanceTo(pos)<(sizeI+el.tr.size)*.53))
				 break;
			//if (!n) sizeI=small;
			sizeI*=n<50?.995:.99995;
			pos=false;
		}
		if (!pos) {console.log(i); break};

		let geom=cubeGeometry(sizeI, bevel);

		let isCu=(i<4 || (i<8 && rnd()>.5) || CuCount<Math.round(i*Cu));
		let cube=new THREE.Mesh(geom, isCu?CuMaterial:material);
		figure.add(cube);
		cube.position.copy(pos).multiplyScalar(100);
		cube.rotation.set(rnd(.5)-.25, rnd(.5)-.25, rnd(.5)-.25);
		cube.rotation.multiplyScalar(i<4?.3:1);
		//console.log(isCu, CuCount);

		cube.tr={
			big: i<4,
			pos: pos,
			lerp: i>3?(figSize*2.5-pos.length())*.34/figSize:.56,
			dq: new THREE.Quaternion(),
			q: cube.quaternion.clone(),
			dp: vec3(),
			size: sizeI,
			size2: sizeI*sizeI/2
		}
		if (isCu) CuCount++;
	}

	function setOrbitPos(n){
		if (!n) return false;
		var pos=vec3(Math.min(figSize*(1.63+rnd(2.1)), -camera.position.z-camera.near-small*1.5), 0, 0)
		 .rotate(0, 0, rnd(PI)).rotate(rnd(PI*2), 0, 0);
		if (around.children.some(el=>el.tr.pos.distanceTo(pos)<figSize*1.9)){
			return setOrbitPos(n-1)
		} else return pos;
	}
	for (var i = 0, CuCount=0; i < count; i++) {
		sizeI=small*rnd(deviation, 1)*.6;
		let pos=setOrbitPos(5000);
		if (!pos) {console.log(i); break};
		//console.log(pos);

		let geom=cubeGeometry(sizeI, bevel);

		let isCu=(CuCount<Math.round(i*Cu));
		let cube=new THREE.Mesh(geom, isCu?CuMaterial:material);
		around.add(cube);
		cube.position.copy(pos).multiplyScalar(10);//.y*=15;
		cube.rotation.set(rnd(PI), rnd(PI), rnd(PI))		//console.log(cube.quaternion);

		cube.tr={
			pos: pos,
			lerp: rnd(.2)+.5,
			dq: q0.clone().setFromEuler(
				new THREE.Euler(rnd()-.5, rnd()-.5, rnd()-.5).multiplyScalar(0.3)),
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
		camera.zoom=Math.min(1, W/H);
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
	var delta2=delta*.55
	dPos+=(2-dPos)*delta2/2;
	var dRo=dPos*dPos*dPos*delta2*.2*roV;
	ro+=dRo;
	roV=1-Math.pow(ro/1.3/PI, 5);
	if (window.showMainAnimation) {
		main.traverse(function(el){
			if (!el.isMesh) return;
			el.position.lerp(el.tr.pos, delta*(dPos+3)*el.tr.lerp);
			if (el.parent==around) {
				el.applyQuaternion(q0.clone().slerp(el.tr.dq, delta))
			} else if (el.tr.q) {
				 //el.quaternion.copy(el.tr.q)
				 //.slerp(q0, el.tr.pos.distanceTo(el.position)*.01)
			}
		});
		figure.rotateOnAxis(main.tr.axis, -delta2*3.34*(roV));
		around.rotateOnAxis(main.tr.axis, -delta2*roV*roV*.7);
		figure.rotateOnWorldAxis(main.tr.axisW, dRo);
		around.rotateOnWorldAxis(main.tr.axisW, dRo*.9);

		main.tr.dq.slerp(quMouse.slerp(q0, delta*6), delta*10);
		figure.applyQuaternion((main.tr.dq).slerp(q0, roV).normalize());
		figure.quaternion.slerp(main.tr.q, delta*.3*(1-roV))
		around.applyQuaternion(around.tr.dq.slerp(main.tr.dq, delta*3).slerp(q0, .3));
		//(around.tr.dq).slerp(q0, roV).normalize());
		around.rotateOnWorldAxis(around.tr.axisW, -delta*.034);
	}
	renderer.render( scene, camera );
	//document.body.style.background=touched?'#0a6':''
});
var dPos=0, roV=1, ro=-1.3, mouse0=vec3(),
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