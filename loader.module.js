

import * as THREE from './libs/three.module.js';
import {
  SVGLoader
}
from './libs/SVGLoader.js';

let objects = {};

function loadSVG(url) {

  // //

  // scene = new THREE.Scene();
  // scene.background = new THREE.Color(0xb0b0b0);

  // //

  const loader = new SVGLoader();

  loader.load(url, function (data) {
    objects[url] = data;
  });

}

function isLoaded(url) {
	return url in objects;
}

function createObject(url, drawFillShapes = true, drawStrokes = true) {

  const paths = objects[url].paths;

  const containerGroup = new THREE.Group();
  const group = new THREE.Group();
  // group.scale.multiplyScalar(0.25);
  group.scale.y *=  - 1;

  for (let i = 0; i < paths.length; i++) {

    const path = paths[i];

    const fillColor = path.userData.style.fill;
    if (drawFillShapes && fillColor !== undefined && fillColor !== 'none') {

      const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setStyle(fillColor),
          opacity: path.userData.style.fillOpacity,
          transparent: path.userData.style.fillOpacity < 1,
          side: THREE.DoubleSide,
          depthWrite: false,
          wireframe: false
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

    if (drawStrokes && strokeColor !== undefined && strokeColor !== 'none') {

      const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setStyle(strokeColor),
          opacity: path.userData.style.strokeOpacity,
          transparent: path.userData.style.strokeOpacity < 1,
          side: THREE.DoubleSide,
          depthWrite: false,
          wireframe: false
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
	var bbox = new THREE.Box3().setFromObject(group);
	let center = new THREE.Vector3();
	bbox.getCenter(center);
	console.log("center");
	console.log(center);
  group.position.x = -center.x;
  group.position.y = -center.y;
  containerGroup.add(group);
  // scene.add(containerGroup);
  return containerGroup;
}

let index = {
	loadSVG: loadSVG,
	createObject: createObject,
	isLoaded: isLoaded
};

export { loadSVG, createObject, isLoaded };
export default index;
