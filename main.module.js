

import * as THREE from './libs/three.module.js';

import Stats from './libs/stats.module.js';

import {
  GUI
}
from './libs/dat.gui.module.js';
// import { OrbitControls } from './libs/OrbitControls.js';

import * as Loader from './loader.module.js';

let renderer, stats, scene, camera, gui, guiData;
let cloudUrl = 'assets/cloud2.svg';
let loaded = false;

init();
animate();

//

function init() {

  const container = document.getElementById('container');

  //

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb0b0b0);

  //

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(0, 0, 200);

  //

  renderer = new THREE.WebGLRenderer({
      antialias: true
    });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize);

  guiData = {
    drawFillShapes: true,
    drawStrokes: true,
    fillShapesWireframe: false,
    strokesWireframe: false
  };

  Loader.loadSVG(cloudUrl);

}


function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

  requestAnimationFrame(animate);

  if (Loader.isLoaded(cloudUrl) && !loaded) {
    loaded = true;
    for (let x = -100; x < 30; x += 1.3) {
      let cloud = Loader.createObject(cloudUrl);
      cloud.position.x = x;
      cloud.position.y = Math.sin(x/10) * 10 + x/20;
      cloud.scale.multiplyScalar((x + 200)/ 230);
      scene.add(cloud);
    }
  }

  render();

}

function render() {

  renderer.render(scene, camera);

}
