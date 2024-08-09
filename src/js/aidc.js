import * as THREE from "three";
import WebGL from "three/addons/capabilities/WebGL.js"
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
/* import * as dat from '../../node_modules/lil-gui/dist/lil-gui.esm.js' */
import GUI from 'lil-gui';

let $canvas, scene, camera, renderer, orbitControls;
let offsetX = 0;   
let offsetZ = 0;
const $btn_init_camera = document.querySelector('.btn_init_camera');
const clock = new THREE.Clock();

if(WebGL.isWebGLAvailable()){    
    //console.log(THREE);
    init();    // 기본 환경 세팅 : scene, camera, renderer, orbitControls, light    
    loadMap();
    set_raycast();
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
    console.log("0");
    const gltfLoader = new GLTFLoader();
    const promises = [
        gltfLoader.loadAsync("./src/models/office_edgetoface.glb"),
        gltfLoader.loadAsync("./src/models/technology.glb")
    ];      
    console.log("1");
    const [...model] = await Promise.all(promises);
    
    // model이 모두 로드 된 후 할 일
    console.log(model[1]);  
    let models_scene = model[1].scene.children;
    models_scene.forEach(function(model, index){
        //console.log(index, model.name);
        scene.add(model);        
    });
    let models_scenes = model[1].scenes[0].children;
    models_scenes.forEach(function(model, index){
        //console.log(index, model.name);
        scene.add(model);        
    });    
}

function set_raycast(){
    // RAYCASTING
    const raycaster = new THREE.Raycaster(); // create once
    const mouse = new THREE.Vector2();  // create once

    function intersect(mouse) {
        raycaster.setFromCamera(mouse, camera);
        return raycaster.intersectObjects(scene.children);
    }

    window.addEventListener('click', event => {
        // THREE RAYCASTER
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
        const intersects = intersect(mouse);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const point = intersect.point;
            
            // Convert 3D point to 2D screen position
            const screenPosition = point.clone().project(camera);
            const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
            const y = (screenPosition.y * -0.5 + 0.5) * window.innerHeight;

            // Create and position the div
            const infoDiv = document.createElement('div');
            infoDiv.className = 'info-div';
            infoDiv.style.left = `${x}px`;
            infoDiv.style.top = `${y}px`;
            infoDiv.innerHTML = `${intersect.object.name} Clicked at<br>x: ${point.x.toFixed(2)}<br>y: ${point.y.toFixed(2)}<br>z: ${point.z.toFixed(2)}`;
            document.body.appendChild(infoDiv);
        }
    });

}

function draw(){                
    var delta = clock.getDelta();    
    orbitControls.update();        
    renderer.render( scene, camera );
    renderer.setAnimationLoop(draw);        
}

function eventListener(){
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



