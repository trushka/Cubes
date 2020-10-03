var density=.5, pSise=160, left=.2, right=.8,
	force=.1, parallax=1000, color='#fff',
	scroll0=scrollY, ds=0, camera, scene, renderer, light, pos0, size,
	raycaster=new THREE.Raycaster(), particles=[], 
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
//renderer.context.getExtension('OES_standard_derivatives');
camera = new THREE.PerspectiveCamera( 18, aspect, 5000, 15000 );
//camera.position.z=1000
scene = new THREE.Scene();
lightH=new THREE.HemisphereLight('#def', 0, 8)
lightD=new THREE.DirectionalLight('#ffd', .2)
lightD1=new THREE.DirectionalLight('#ffd', .2)
scene.add(lightH, lightD, lightD1);
lightH.position.set(0,.8,1);
lightD.position.set(0.55,2,-1.3);
lightD.position.set(-0.55,2,-1.3);
var material = new THREE.MeshStandardMaterial({
	metalness: .968,
	roughness: .25
});//, opacity: 0
material.color.set(color);
//material.side=2;

function init() {
	var l=particles.length, size0=size, scrSize=pSise/H/2,
		bCount=Math.round(W*H/10000*density);
	size=vec3(0, scrSize, 0).unproject(camera).y;
	for (var i = 0; i < l; i++) {
		if (i<bCount) {
			particles[i].scale.multiplyScalar(size/size0);
			bTrans[i].size*=size/size0
		} else {scene.remove(particles[i])};
	}
	for (var i = l, geom, pos=vec3(), sizeI, x; i < bCount; i++) {
		sizeI=size*rnd(.2, 1)
		geom=new THREE.BoxBufferGeometry(sizeI, sizeI, sizeI);//[rnd()>.5?'TetrahedronBufferGeometry':'OctahedronBufferGeometry'];
		scene.add(particles[i]=new THREE.Mesh(geom, material));

		x=rnd(2, -1);
		particles[i].position.set(x, rnd(2)-1, rnd(1.8)-.9).unproject(camera);
		particles[i].rotation.set(rnd(PI), rnd(PI), rnd(PI));
		particles[i].frustumCulled=false;
		bTrans[i]={
			dq: new THREE.Quaternion(),
			dp: vec3(),
			size: sizeI
		}
	}
	particles.length=bCount;
};

requestAnimationFrame( function animate() {
	requestAnimationFrame( animate );
	var delta=clock.getDelta();
	if (!delta) return;
	var pos=canvas._pos=canvas.getBoundingClientRect(), resize;
	if (pos.bottom<=0 || pos.top>=window.innerHeight) return;
	if (W!=pos.width || H!==pos.height) {
		W=pos.width;
		H=pos.height;
		vMin=Math.min(W,H);
		renderer.setSize(W, H);
		camera.aspect=W/H;
		camera.updateProjectionMatrix();
		resize=1;
		init();
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
			tr=bTrans[i]; pos=particles[i].position;
			pos.y+=dY;
			tr.dq._x+=rnd(.0001,-.00005); tr.dq._y+=rnd(.0001,-.00005); tr.dq._z+=rnd(.0001,-.00005);
			tr.dq._x*=.999; tr.dq._y*=.999; tr.dq._z*=.999;
			particles[i].applyQuaternion(tr.dq.normalize());
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
			pos.add(tr.dp.add(vec3(rnd(.1,-.05), rnd(.1,-.05), rnd(.1,-.05))).multiplyScalar(.995));
		}
	}
	//letter.position.add(vec3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(1))
	renderer.render( scene, camera );
})