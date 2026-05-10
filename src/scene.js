import * as THREE from "three";
import CameraSystem from "./cameraSystem.js"
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Manages the main 3d scene
 * @class Scene
 */
class Scene {
    threeScene = null;

    cameraSystem = null;

    renderer = null;
    labelRenderer = null;

    cubeGeometry = null;

    isTransitioning = false;

    raycaster = null;

    // Сoordinates of the aimed point
    pointer = null;

    intersectObject = null;

    renderPass = null;

    composer = null;

    /**
     * Initializazes the Three.js scene
     * @param {CameraSystem} cameraSystem - Camera system instance
     * @param {THREE.WebGLRenderer} renderer - Webgl renderer
     */
    constructor(cameraSystem, renderer) {
        this.cameraSystem = cameraSystem;
        this.renderer = renderer;

        // Trhee js scene initialization
        this.threeScene = new THREE.Scene();
        this.threeScene.background = new THREE.Color(0x5f5f5f);

        // Geonmetry initialization for all object in scene
        this.cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

        // Raycaster initialization
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();

        // Composer initialization 
        this.composer = new EffectComposer(renderer);

        this.renderPass = new RenderPass(this.threeScene, this.cameraSystem.activeCamera);
        this.composer.addPass(this.renderPass);

        this.cameraSystem.addOutlinePass(this.threeScene, this.composer);

        const outputPass = new OutputPass();
		this.composer.addPass( outputPass );
    }

    /**
     * Switches the active camera using the camera system
     */
    switchCamera() {
        let cb = () => {
            this.renderPass.camera = this.cameraSystem.activeCamera;
        }
        this.cameraSystem.switchCamera(cb)
    }

    /**
     * Updates the pointer coordinates
     * @param {number} x - New X coodinate of pointer
     * @param {number} y - New Y coodinate of pointer
     */
    onPointerMove(x, y) {
        this.pointer.x = x;
        this.pointer.y = y;
    }

    /**
     * Handles object selection (click/tap event)
     * @param {Event} event - Pointer event
     */
    selectObject(event) {
        if (this.intersectObject) {
            console.log(this.intersectObject.objectData);
            this.cameraSystem.activeOutlinePass.selectedObjects = [this.intersectObject];
        }
        else {
            this.cameraSystem.activeOutlinePass.selectedObjects = [];
        }
    }

    /**
     * Renders the scene and highlight the hovered object
     */
    render() {
        this.resetSelection();

        // Highlight the object the mouse is pointing at by giving it 
        this.raycaster.setFromCamera(this.pointer, this.cameraSystem.activeCamera);
        const intersects = this.raycaster.intersectObjects( this.threeScene.children, false );
        
        if (intersects.length) {
            this.intersectObject = intersects[0].object;
            this.intersectObject.material.emissive.setHex(0xff0000);
        }

        // Render scene
        this.composer.render();
        this.labelRenderer.render(this.threeScene, this.cameraSystem.activeCamera);
    }

    /**
     * Create a new 3D object with a text label and adds it to the scene
     * @param {object} objectData - Data describing the object (name, color, width, depth)
     * @param {THREE.Vector3} position - World position for the object
     */
    addObject(objectData, position) {
        const material = new THREE.MeshStandardMaterial({
            color: objectData.color,
            roughness: 1.0,
            metalness: 0.0
        });
        const obj = new THREE.Mesh(this.cubeGeometry, material);
        obj.objectData = objectData;

        obj.position.copy(position);
        obj.scale.set(objectData.width, objectData.depth, 2)

        // Ctreate text for object
        const textObj = createText(objectData.name);

        textObj.position.copy(obj.position);
        textObj.position.x  += 0.2;

        this.threeScene.add(obj);
        this.threeScene.add(textObj);
    }

    move(x, y) {
        this.cameraSystem.move(x, y);
    }

    resizeWindow(width, height) {
        this.renderer.setSize(width, height);
        this.labelRenderer.setSize(width, height);

        this.cameraSystem.updateCamerasAspect(width / height);

        resetSelection();
    }

    resetSelection() {
        if (this.intersectObject)
            this.intersectObject.material.emissive.setHex( 0x000000 );
        this.intersectObject = null;
    }
}

export function init_scene() {
    // Render
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // Cameras
    const cameraSystem = new CameraSystem(renderer);

    // Scene
    const scene = new Scene(cameraSystem, renderer);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.left = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(labelRenderer.domElement);
    scene.labelRenderer = labelRenderer;

    // Ligths
    const light = new THREE.AmbientLight(0xffffff);           
    scene.threeScene.add(light);

    return scene;
}

/**
 * Creates a CSS2DObject
 * @param {string} name - The text content of the label
 * @returns {CSS2DObject} The CSS2DObject ready to be added to the scene
 */
function createText(name) {
    const div = document.createElement('div');
    div.textContent = name;
    div.style.color = 'white';
    div.style.fontSize = '15px';
    div.style.fontWeight = 'bold';
    div.style.textShadow = '1px 1px 0px black';
    div.style.background = 'rgba(0, 0, 0, 0.6)';
    div.style.padding = '4px 8px';
    div.style.borderRadius = '4px';
    div.style.border = '1px solid rgba(255, 255, 255, 0.3)';

    const label = new CSS2DObject(div);

    return label;
}