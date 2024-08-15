import * as THREE from "three";
import WebGL from "three/addons/capabilities/WebGL.js"
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* import * as dat from '../../node_modules/lil-gui/dist/lil-gui.esm.js' */
import GUI from 'lil-gui';

let $canvas, scene, camera, renderer, orbitControls;
let models = [];
let old_camera_position;
const raycaster = new THREE.Raycaster(); // create once
const mouse = new THREE.Vector2();  // create once
const $btn_init_camera = document.querySelector('.btn_init_camera');
const clock = new THREE.Clock();


const testColor = 'tomato';
const floorColor = 'beige';

if(WebGL.isWebGLAvailable()){    
    //console.log(THREE);
    init();    // 기본 환경 세팅 : scene, camera, renderer, orbitControls, light    
    loadMap();    
    draw();
    eventListener();
}else{
    var warning = WebGL.getWebGLErrorMessage()
    document.body.appendChild(warning)
}

function init(){          
    $canvas = document.querySelector('#canvas');

    // SCENE
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#eeeeee');    
    scene.fog = new THREE.Fog(0x777777, 100, 800); // 땅의 경게를 부드럽게 처리하기 위한 효과
    // CAMERA
    camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0,50,200);
    //camera.position.set(-71,-2.87,28.7);
    camera.lookAt(0,0,0);
    
    // RENDERER
    renderer = new THREE.WebGLRenderer({
        canvas:$canvas,
        antialias:true,
        //alpha:true
    });
    renderer.setSize($canvas.clientWidth, $canvas.clientHeight); 
    renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
    renderer.shadowMap.enabled = true;

    // ORBIT CAMERA CONTROLS
    orbitControls = new OrbitControls(camera, $canvas);
    orbitControls.mouseButtons = {
        MIDDLE : THREE.MOUSE.ROTATE,
        RIGHT : THREE.MOUSE.PAN
    };
    orbitControls.enabled = true;
    orbitControls.enableDamping = true;
    orbitControls.enablePan = true;
    //orbitControls.minDistance = 5;
    //orbitControls.maxDistance = 60;
    orbitControls.minPolarAngle = 0;                // prevent to down view
    orbitControls.maxPolarAngle = Math.PI/2 - 0.05; // prevent camera below ground
    orbitControls.update();
    orbitControls.addEventListener('change', function() {
        //do something
    });
    orbitControls.saveState();
    

    // LIGHTS
    const dLight = new THREE.DirectionalLight('white', 0.8);
    dLight.position.set(-30, 80, 100);
    dLight.castShadow = true;
    dLight.shadow.mapSize.width = 2048;
    dLight.shadow.mapSize.height = 2048;
    const d = 35;
    dLight.shadow.camera.left = -d;
    dLight.shadow.camera.right = d;
    dLight.shadow.camera.top = d;
    dLight.shadow.camera.bottom = -d;
    scene.add(dLight);

    const aLight = new THREE.AmbientLight('white', 0.6);
    scene.add(aLight);    

    // light helper
    const dlightHelper = new THREE.DirectionalLightHelper(dLight,20);
    scene.add(dlightHelper);    

    // axes
    const axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper);
    const gui = new GUI();    
    const folder1 = gui.addFolder('camera.position');
    folder1.add(camera.position, 'x', -100, 100);
    folder1.add(camera.position, 'y', -100, 100);
    folder1.add(camera.position, 'z', -100, 100);
}

function mathRandom(num=1){
    var numValue = -Math.random() * num + Math.random() * num;
    return numValue;
}

async function loadMap(){
    
    const gltfLoader = new GLTFLoader();
    const promises = [        
        gltfLoader.loadAsync("./src/models/server1_s.glb"),
        gltfLoader.loadAsync("./src/models/server1.glb"),
        gltfLoader.loadAsync("./src/models/server3.glb"),
        gltfLoader.loadAsync("./src/models/server4.glb"),
        gltfLoader.loadAsync("./src/models/tower.glb"),
        gltfLoader.loadAsync("./src/models/cloud.glb"),
        gltfLoader.loadAsync("./src/models/sec.glb")
    ];      
    
    const [...load_model] = await Promise.all(promises);
    
    // model이 모두 로드 된 후 할 일    
    load_model.forEach(function(model, index){
        //console.log(model.scene.children[0]);
        console.log(model.scene.children[0].name, model.scene.children[0].position);
        if(model.scene.children[0].type === 'Group'){
            model.scene.children[0].children.forEach(function(child){
                console.log(child);
                child.castShadow = true;
                child.receiveShadow = true;
            })
        }else if(model.scene.children[0].type === 'Mesh'){
            model.scene.children[0].castShadow = true;
            model.scene.children[0].receiveShadow = true;
        }
        if(model.scene.children[0].name === 'Cube021'){
            model.scene.children[0].position.set(-10,5,50);
        }
        if(model.scene.children[0].name === 'sec'){
            model.scene.children[0].position.set(-60,15,-30);
        }
        
        
        models.push(model.scene.children[0]);
        scene.add(model.scene.children[0]);     

        console.log("--------");        
        
    });
    const test = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({color:testColor, side:THREE.DoubleSide}));
    test.position.set(0,5,0);
    scene.add(test);
    test.castShadow = true;
    test.receiveShadow = true;
    // floor
    const floor = new THREE.Mesh(new THREE.CircleGeometry(100), new THREE.MeshStandardMaterial({color:floorColor, side:THREE.DoubleSide}));
    floor.name = 'floor';    
    floor.rotation.x = THREE.MathUtils.degToRad(90);
    scene.add(floor);
    floor.receiveShadow = true;
    // 바닥 그리드
    const gridHelper = new THREE.GridHelper(200, 10, 'orange', 'orange');
    scene.add(gridHelper);
    // line
    let lines = [];
    function createLines(){
        const lineMesh = new THREE.Mesh(new THREE.BoxGeometry(100, 0.2, 0.2), new THREE.MeshToonMaterial({color:'tomato'}));
        lineMesh.position.x = mathRandom(100);
        lineMesh.position.z = -1000;
        lineMesh.position.y = Math.abs(mathRandom(100));
        lineMesh.rotation.y = (90*Math.PI) / 180;
        scene.add(lineMesh);
        gsap.to(lineMesh.position, {
            duration: 1.5,            
            z: 50,
            delay:mathRandom(5),
            repeat:-1,
            ease: "power2.inOut"
        });
    }
    for(let i=0;i<100;i++){
        createLines();
    }
    

    let particleContainer = new THREE.Object3D();
    for(var i=0; i<100; i++){
        var particle = new THREE.Mesh(new THREE.CircleGeometry(1,10), new THREE.MeshToonMaterial({color:'orange'}));
        particle.position.set(mathRandom(100), mathRandom(100), mathRandom(53));
        particle.rotation.set(mathRandom(10), mathRandom(10), mathRandom(10));
        particleContainer.add(particle);
    }
    scene.add(particleContainer);
}

// 카메라 이동 함수
function moveCameraToMesh(mesh) {    
    
    let targetPosition;
    old_camera_position = {...camera.position};
    
    if(mesh.parent.type === 'Group'){
        if(mesh.parent.position.x < 0){
            targetPosition = new THREE.Vector3().copy(mesh.parent.position).add(new THREE.Vector3(-25, 15, 50));
            
        }else{
            targetPosition = new THREE.Vector3().copy(mesh.parent.position).add(new THREE.Vector3(25, 15, 50));
        }        
    }else{
        if(mesh.position.x < 0){
            targetPosition = new THREE.Vector3().copy(mesh.position).add(new THREE.Vector3(-25, 15, 50));
        }else{
            targetPosition = new THREE.Vector3().copy(mesh.position).add(new THREE.Vector3(25, 15, 50));
        }
        
    }

     gsap.to(camera.position, {
        duration: 1.5,
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        ease: "power2.inOut"
    });
   /* gsap.to(camera.rotation, {
            duration: 1.5,
            x: mesh.position.x,
            y: mesh.position.y,
            z: mesh.position.z,
            ease: "power2.inOut",
            onUpdate:function(){
                camera.lookAt(mesh.position)
            }
        }); */
    //camera.lookAt(targetPosition);
    
}
function intersect(mouse) {
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(scene.children);
}
function canvasMoveHandler(event){
    if(event.target.className === 'btn_init_camera'){
        return;
    }

    // THREE RAYCASTER
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const intersects = intersect(mouse);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        const point = intersect.point;
        let clickedMesh = intersects[0].object;
        let clickedName = intersects[0].object.name;
        
        if(intersect.object.parent.type === 'Group'){
            clickedMesh = intersects[0].object.parent;
            clickedName = intersects[0].object.parent.name;
        }
        
        //console.log(clickedName);
        models.forEach(function(model){            
            
            if(model !== clickedMesh){
                
                gsap.to(model.position, {
                    duration: 1.5,            
                    y:0,            
                    ease: "power2.inOut"
                });
                
            }else{
                gsap.to(model.position, {
                    duration: 1.5,            
                    y:10,            
                    ease: "power2.inOut"
                });
            }
        });
        
    }
}
function canvasClickHandler(event){
    if(event.target.className === 'btn_init_camera'){
        return;
    }
    
    // THREE RAYCASTER
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const intersects = intersect(mouse);
    
    if (intersects.length > 0) {
        const intersect = intersects[0];
        const point = intersect.point;
        let clickedMesh = intersects[0].object;
        let clickedName = intersects[0].object.name;
        
        if(intersect.object.parent.type === 'Group'){
            clickedMesh = intersects[0].object.parent;
            clickedName = intersects[0].object.parent.name;
        }
        
        console.log(models);

        models.forEach(function(model){            
            
            if(model !== clickedMesh){
                
                model.visible = false;
                
            }
        });
        
        moveCameraToMesh(clickedMesh);


        // Convert 3D point to 2D screen position
        const screenPosition = point.clone().project(camera);
        const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
        const y = (screenPosition.y * -0.5 + 0.5) * window.innerHeight;

        // Create and position the div
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-div';
        //infoDiv.style.left = `${x}px`;
        //infoDiv.style.top = `${y}px`;
        infoDiv.style.left = `100px`;
        infoDiv.style.top = `150px`;
        infoDiv.innerHTML = `${clickedName} Clicked at<br>x: ${point.x.toFixed(2)}<br>y: ${point.y.toFixed(2)}<br>z: ${point.z.toFixed(2)}`;
        document.body.appendChild(infoDiv);

        const closeBtn = document.createElement('button');
        closeBtn.style.position = 'absolute';
        closeBtn.style.left = '100px';
        closeBtn.style.top = '100px';
        closeBtn.innerHTML = 'close';
        document.body.appendChild(closeBtn);

        $btn_init_camera.style.display = 'none';

        

        $canvas.removeEventListener('click', canvasClickHandler);
        closeBtn.addEventListener('click', function(event){
            infoDiv.remove();
            event.currentTarget.remove();
            gsap.to(camera.position, {
                duration: 1.5,
                x: old_camera_position.x,
                y: old_camera_position.y,
                z: old_camera_position.z,
                ease: "power2.inOut"
            });

            $btn_init_camera.style.display = 'inline-block';

            models.forEach(function(model){            
                if(model !== clickedMesh){
                    model.visible = true;
                }
            });
            
            setTimeout(function(){
                $canvas.addEventListener('click', canvasClickHandler);
            }, 1000);
            
        });
    }
}

function draw(){                
    var delta = clock.getDelta();  
    
    
    
    orbitControls.update();        
    renderer.render( scene, camera );
    renderer.setAnimationLoop(draw);        
}

function eventListener(){
    $canvas.addEventListener('click', canvasClickHandler);
    $canvas.addEventListener('mousemove', canvasMoveHandler);
    window.addEventListener('resize', onWindowResize);   
    $btn_init_camera.addEventListener('click', init_camera);
}

function init_camera(){        
    orbitControls.reset();
    camera.position.x = 0;        
    camera.position.y = 50;//50*Math.sin(Math.PI/2);
    camera.position.z = 200;//50*Math.cos(Math.PI/2);            
    camera.fov = 60;
    camera.lookAt(0,0,0);
    camera.updateProjectionMatrix();   
}

function onWindowResize(){        
    init_camera();
    if (window.matchMedia('(orientation: portrait)').matches) {
		// Portrait 모드일 때 실행할 스크립트
		// 폭과 높이가 같으면 Portrait 모드로 인식돼요
        //console.log("Portrait");
	} else {
		// Landscape 모드일 때 실행할 스크립트
        //console.log("Landscape");
	}
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render( scene, camera );
}



