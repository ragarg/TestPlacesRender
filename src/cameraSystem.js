import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

/**
 * Manages two cameras (orthographic and perspective), their transitions, outline passes,
 * ans scene offset/panning
 * 
 * @class CameraSystem
 */
export default class CameraSystem {
    offset = new THREE.Vector3(10, 0, 0);
    activeCamera = null;
    controls = null;

    orthographicCamera = null;
    orthographicCameraPosition = new THREE.Vector3(0, 0, 9);
    flyorthographicCameraPosition = new THREE.Vector3(0, -20 , 10);
    orthoFrustumSize = 20
    
    perspectiveCamera = null;
    perspectiveCameraPosition = new THREE.Vector3(0, -40 , 20);
    flyPerspectiveCameraPosition = new THREE.Vector3(0, 0, 50);
    
    perspectiveOutlinePass = null;
    orthographicOutlinePass = null;
    activeOutlinePass = null;

    /**
     * Creates both cameras and orbit controls
     * @param {object} render - WebGL renderer
     */
    constructor(render) {
        let lookAt = new THREE.Vector3(0, 0, 0);
        lookAt.add(this.offset);

        // Ortho
        let position = new THREE.Vector3();
        position.copy(this.orthographicCameraPosition).add(this.offset)
        this.orthographicCamera = createOrthographicCamera(this.orthoFrustumSize, position, lookAt);
        this.activeCamera = this.orthographicCamera;

        // Perspective
        position.copy(this.perspectiveCameraPosition).add(this.offset)
        this.perspectiveCamera = createPerspectiveCamera(position, lookAt);

        // Controls
        this.controls = new OrbitControls(this.activeCamera, render.domElement);
        this.controls.enableDamping = true;
        this.controls.target.copy(lookAt);
        this.controls.update();
        this.controls.enabled = false;
    }

    /**
     * Swithes between perspective and orthographic camera
     * @param {Function} cb Callback executed after the transition completes
     */
    switchCamera(cb) {
        if(this.activeCamera === this.perspectiveCamera) {
            const toPosition = new THREE.Vector3();
            toPosition.copy(this.flyPerspectiveCameraPosition);
            toPosition.add(this.offset);
            this.controls.target.copy(this.offset);
            this.flyToCamera(toPosition, this.orthographicCamera, () => {
                // Switch camera
                this.activeCamera = this.orthographicCamera;

                // Switch OutlinePass
                this.activeOutlinePass = this.orthographicOutlinePass;
                this.orthographicOutlinePass.selectedObjects = this.perspectiveOutlinePass.selectedObjects;
                this.perspectiveOutlinePass.selectedObjects = [];

                // Update controls
                this.controls.object = this.activeCamera;
                this.isTransitioning = false;
                this.controls.update();
                cb();
            });
        }
        else {
            const toPosition = new THREE.Vector3();
            toPosition.copy(this.flyorthographicCameraPosition);
            toPosition.add(this.offset);
            this.controls.target.copy(this.offset);
            this.flyToCamera(toPosition, this.perspectiveCamera, () => {
                // Switch camera
                this.activeCamera = this.perspectiveCamera;

                // Switch OutlinePass
                this.activeOutlinePass = this.perspectiveOutlinePass;
                this.perspectiveOutlinePass.selectedObjects = this.orthographicOutlinePass.selectedObjects;
                this.orthographicOutlinePass.selectedObjects = [];

                // Update controls
                this.controls.object = this.activeCamera;
                this.isTransitioning = false;
                this.controls.update();
                cb();
            });
        }
    }

    /**
     * Animates the active camera from its current position to a target position
     * @param {THREE.Vector3} toPosition - Destination position in world space
     * @param {THREE.Camera} targetCamera - The camera that will become active after flight
     * @param {Function} cb - Callback invoked when the flight finishes
     */
    flyToCamera(toPosition, targetCamera, cb) {
        
        if (this.isTransitioning) return;

        this.isTransitioning = true;
        flyToCamera(toPosition, this.activeCamera, this.controls, cb);
    }

    /**
     * Applies pan/offset to both cameras
     * @param {number} y - Offset change along Y axis.
     * @param {number} x - Offset change along X axis.
     */
    move(y, x) {
        this.offset.x += x;
        this.offset.y += y;

        this.orthographicCamera.position.copy(this.orthographicCameraPosition).add(this.offset)
        this.perspectiveCamera.position.copy(this.perspectiveCameraPosition).add(this.offset)
    }

    /**
     * Update camera projection matrices with the new aspect
     * @param {number} aspect - New cameras aspect
     */
    updateCamerasAspect(aspect) {
        // Update perspective camera
        this.perspectiveCamera.aspect = aspect;
        this.perspectiveCamera.updateProjectionMatrix();

        // Update orthographic camera
        this.orthographicCamera.left = -this.orthoFrustumSize * aspect;
        this.orthographicCamera.right = this.orthoFrustumSize * aspect;
        this.orthographicCamera.top = this.orthoFrustumSize;
        this.orthographicCamera.bottom = -this.orthoFrustumSize;
        this.orthographicCamera.updateProjectionMatrix();

        this.cameraSystem.resizeWindow(width, height);
    }

    /**
     * Creates two Outline passes (one for each camera) and adds them to the EffectComposer
     * @param {THREE.Scene} threeScene - The scene to outline objects in
     * @param {EffectComposer} composer - The EffectComposer to add the passes to
     */
    addOutlinePass(threeScene, composer) {
        this.perspectiveOutlinePass = new OutlinePass(new THREE.Vector2( window.innerWidth, window.innerHeight ), threeScene, this.perspectiveCamera);
		this.perspectiveOutlinePass.edgeStrength = 3;
        this.perspectiveOutlinePass.edgeThickness = 1;
        composer.addPass(this.perspectiveOutlinePass);

        this.orthographicOutlinePass = new OutlinePass(new THREE.Vector2( window.innerWidth, window.innerHeight ), threeScene, this.orthographicCamera);
		this.orthographicOutlinePass.edgeStrength = 3;
        this.orthographicOutlinePass.edgeThickness = 1;
        composer.addPass(this.orthographicOutlinePass);

        this.activeOutlinePass = this.orthographicOutlinePass;
    }
}

/**
 * Create orthographic camera 
 * @param {number} frustumSize - The frustum size of new camera
 * @param {THREE.Vector3} position - The position of new camera
 * @param {THREE.Vector3} lookAt - Point of view of the new camera
 * @returns {THREE.OrthographicCamera} new orthographic camera
 */
function createOrthographicCamera(frustumSize, position, lookAt) {
    const cameraOrtho = new THREE.OrthographicCamera(
        -frustumSize * (window.innerWidth / window.innerHeight),
         frustumSize * (window.innerWidth / window.innerHeight), frustumSize, -frustumSize, -10000, 10000);
    
    cameraOrtho.position.copy(position);
    cameraOrtho.lookAt(lookAt);

    return cameraOrtho;
}

/**
 * Create perspective camera 
 * @param {THREE.Vector3} position - The position of new camera
 * @param {THREE.Vector3} lookAt - Point of view of the new camera
 * @returns {THREE.PerspectiveCamera} new perspective camera
 */
function createPerspectiveCamera(position, lookAt) {
    const cameraPerspective = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraPerspective.position.copy(position);
    cameraPerspective.lookAt(lookAt);

    return cameraPerspective;
}

/**
 * Animates the active camera from its current position to a target position
 * @param {THREE.Vector3} toPosition - Destination position in world space
 * @param {THREE.Camera} activeCamera - Animated camera
 * @param {OrbitControls} controls - orbit controls for animated camera
 * @param {Function} cb - Callback invoked when the flight finishes
 */
function flyToCamera() {
    let startPos = new THREE.Vector3();
    let endPos = new THREE.Vector3();

    return (toPosition, activeCamera, controls, cb, duration = 1.0) => {
        startPos.copy(activeCamera.position);
        endPos.copy(toPosition);

        let onTransitionEndCallback = () => {
            activeCamera.position.copy(startPos);
            cb();
        }

        const startTime = performance.now() / 1000;
        const animateTransition = (now) => {
            const elapsed = (performance.now() / 1000) - startTime;
            let t = Math.min(1, elapsed / duration);

            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            activeCamera.position.lerpVectors(startPos, endPos, ease);
            controls.update();

            if (t >= 1) {
                onTransitionEndCallback();
            }
            else {
                requestAnimationFrame(animateTransition);
            }
        }
        requestAnimationFrame(animateTransition);
    }
}
flyToCamera = flyToCamera();