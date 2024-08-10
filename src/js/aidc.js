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

    // CAMERA
    camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0,50,200);
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
    dLight.position.set(0, 30, 0);
    dLight.castShadow = true;
    dLight.shadow.mapSize.width = 2048;
    dLight.shadow.mapSize.height = 2048;
    const d = 35;
    dLight.shadow.camera.left = -d;
    dLight.shadow.camera.right = d;
    dLight.shadow.camera.top = d;
    dLight.shadow.camera.bottom = -d;
    scene.add(dLight);

    const aLight = new THREE.AmbientLight('white', 0.5);
    scene.add(aLight);

    // axes
    const axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper);
}

async function loadMap(){
    
    const gltfLoader = new GLTFLoader();
    const promises = [        
        gltfLoader.loadAsync("./src/models/server1.glb"),
        gltfLoader.loadAsync("./src/models/server3.glb"),
        gltfLoader.loadAsync("./src/models/server4.glb"),
        gltfLoader.loadAsync("./src/models/tower.glb"),
        gltfLoader.loadAsync("./src/models/cloud.glb")
    ];      
    
    const [...load_model] = await Promise.all(promises);
    
    // model이 모두 로드 된 후 할 일    
    load_model.forEach(function(model, index){
        console.log(model.scene.children[0].name, model.scene.children[0].position);
        models.push(model.scene.children[0]);
        scene.add(model.scene.children[0]);        
    });
    // floor
    const floor = new THREE.Mesh(new THREE.CircleGeometry(100), new THREE.MeshPhongMaterial({color:'darkblue', side:THREE.DoubleSide}));
    floor.name = 'floor';    
    floor.rotation.x = THREE.MathUtils.degToRad(90);
    scene.add(floor);
}

// 카메라 이동 함수
function moveCameraToMesh(mesh) {    
    let targetPosition;
    console.log(mesh.parent.type);
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

    /* gsap.to(camera.position, {
        duration: 1.5,
        x: 20,
        y: 40,
        z: 40,
        ease: "power2.inOut"
    }); */
    gsap.to(camera.position, {
        duration: 1.5,
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        ease: "power2.inOut"
    });
   

    camera.lookAt(mesh.position);
    
}
function intersect(mouse) {
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(scene.children);
}
function windowClickHandler(event){
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
        infoDiv.style.left = `${x}px`;
        infoDiv.style.top = `${y}px`;
        infoDiv.innerHTML = `${clickedName} Clicked at<br>x: ${point.x.toFixed(2)}<br>y: ${point.y.toFixed(2)}<br>z: ${point.z.toFixed(2)}`;
        document.body.appendChild(infoDiv);

        const closeBtn = document.createElement('button');
        closeBtn.style.position = 'absolute';
        closeBtn.style.left = '100px';
        closeBtn.style.top = '100px';
        closeBtn.innerHTML = 'close';
        document.body.appendChild(closeBtn);

        $btn_init_camera.style.display = 'none';

        

        window.removeEventListener('click', windowClickHandler);
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
                window.addEventListener('click', windowClickHandler);
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
    window.addEventListener('click', windowClickHandler);
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



