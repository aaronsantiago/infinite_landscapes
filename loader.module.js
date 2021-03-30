

import * as THREE from './libs/three.module.js';
import {
  SVGLoader
}
from './libs/SVGLoader.js';

var mainPrimary = chromatism.convert( { L: 53.23, a: Math.random() * 256 - 128, b: Math.random() * 256 - 128 } ).cssrgb;
var secondaryPrimary = chromatism.complementary( mainPrimary ).cielab;
secondaryPrimary.L = 53.23;
secondaryPrimary = chromatism.convert(secondaryPrimary).cssrgb
// let colors = chromatism.adjacent( 10, 5, mainPrimary );
let objects = {};
let palette = {
  "rgb(237, 28, 36)" : mainPrimary, // main primary
  "rgb(255, 242, 0)" : chromatism.shade(30, mainPrimary).cssrgb, // main light
  "rgb(236, 0, 140)" : chromatism.shade(-10, mainPrimary).cssrgb, // main dark
  "rgb(0, 166, 81)" : secondaryPrimary, // secondary primary
  "rgb(46, 49, 146)" : chromatism.shade(-10, secondaryPrimary).cssrgb, // secondary dark
  "rgb(0, 174, 239)" : chromatism.shade(30, secondaryPrimary).cssrgb, // secondary light
  "rgb(255, 255, 255)" : "rgb(255, 255, 255)",
};

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
    if (!(fillColor in palette)) {
      console.log(fillColor);
      // palette[fillColor] = "rgb(" + chroma.random().rgb() + ")";
    }
    if (drawFillShapes && fillColor !== undefined && fillColor !== 'none') {

      const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setStyle(palette[fillColor]),
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
