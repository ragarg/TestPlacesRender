import * as THREE from "three";
import * as SCENE from "./scene.js";
import shopsParser from "./shopsParser.js";
import generatePlaces from "./generatePlaces.js";

// Init scene with places
const scene = SCENE.init_scene();
const placesData = generatePlaces(100);

shopsParser(scene, placesData);

// Init events
window.addEventListener('keydown', (event) => {
  if (event.code === "Space") {
    scene.switchCamera();
  }
  if (event.code === "KeyW") {
    scene.move(1, 0);
  }
  if (event.code === "KeyA") {
    scene.move(0, -1);
  }
  if (event.code === "KeyS") {
    scene.move(-1, 0);
  }
  if (event.code === "KeyD") {
    scene.move(0, 1);
  }
})

window.addEventListener( 'pointermove', (event) => {
    scene.onPointerMove((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
});

window.addEventListener( 'click', (event) => {
    scene.selectObject();
});

window.addEventListener( 'resize', (event) => {
    scene.resizeWindow(window.innerWidth, window.innerHeight);
});

function animation() {
  requestAnimationFrame(animation);
  scene.render();
}

animation();