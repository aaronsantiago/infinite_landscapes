

import * as THREE from './libs/three.module.js';

import Stats from './libs/stats.module.js';

import {
  GUI
}
from './libs/dat.gui.module.js';
// import { OrbitControls } from './libs/OrbitControls.js';
import {
  SVGLoader
}
from './libs/SVGLoader.js';

let renderer, stats, scene, camera, gui, guiData;

init();
animate();

//

function init() {

  const container = document.getElementById('container');

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
    currentURL: 'assets/cloud2.svg',
    drawFillShapes: true,
    drawStrokes: true,
    fillShapesWireframe: false,
    strokesWireframe: false
  };

  loadSVG(guiData.currentURL);

}

function loadSVG(url) {

  //

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb0b0b0);

  //

  const loader = new SVGLoader();

  loader.load(url, function (data) {

    const paths = data.paths;

    const group = new THREE.Group();
    group.scale.multiplyScalar(0.25);
    group.position.x =  - 70;
    group.position.y = 70;
    group.scale.y *=  - 1;

    for (let i = 0; i < paths.length; i++) {

      const path = paths[i];
      console.log(path.userData.node.parentElement.id);

      const fillColor = path.userData.style.fill;
      if (guiData.drawFillShapes && fillColor !== undefined && fillColor !== 'none') {

        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setStyle(fillColor),
            opacity: path.userData.style.fillOpacity,
            transparent: path.userData.style.fillOpacity < 1,
            side: THREE.DoubleSide,
            depthWrite: false,
            wireframe: guiData.fillShapesWireframe
          });

        const shapes = path.toShapes(true);

        for (let j = 0; j < shapes.length; j++) {

          const shape = shapes[j];

          const geometry = new THREE.ShapeGeometry(shape);
          const mesh = new THREE.Mesh(geometry, material);

          group.add(mesh);

        }

      }

      const strokeColor = path.userData.style.stroke;

      if (guiData.drawStrokes && strokeColor !== undefined && strokeColor !== 'none') {

        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setStyle(strokeColor),
            opacity: path.userData.style.strokeOpacity,
            transparent: path.userData.style.strokeOpacity < 1,
            side: THREE.DoubleSide,
            depthWrite: false,
            wireframe: guiData.strokesWireframe
          });

        for (let j = 0, jl = path.subPaths.length; j < jl; j++) {

          const subPath = path.subPaths[j];

          const geometry = SVGLoader.pointsToStroke(subPath.getPoints(), path.userData.style);

          if (geometry) {

            const mesh = new THREE.Mesh(geometry, material);

            group.add(mesh);

          }

        }

      }

    }

    scene.add(group);

  });

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

  requestAnimationFrame(animate);

  render();

}

function render() {

  renderer.render(scene, camera);

}
