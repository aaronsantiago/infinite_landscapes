import * as THREE from './libs/three.module.js';
import { GUI } from './libs/dat.gui.module.js';
import * as Loader from './loader.module.js';
import { Water } from './libs/three.water.js';

import * as yaml from './libs/yaml.module.js';
// import Stats from './libs/stats.module.js';
// import { OrbitControls } from './libs/OrbitControls.js';

let renderer, stats, scene, camera, gui, guiData;
let loaded = false;
let jsonLoaded = false;
let rules = {};
let parsedRules = {};
let presets = {};
let water = null;
let loadedUrls = [];

// ************ GENERATE PALETTE ***********************
// radius determines saturation amount
// angle determines hue
let radius = Math.random() * 50 + 50;
let angle = Math.random() * Math.PI * 2;
let brightness = Math.random() * 30 + 35;

let oppositeSegments = 6;
let oppositeSpreadAngle = Math.PI / (1 + Math.random() * 3);
let mainPrimary = chromatism.convert({
    L: brightness,
    a: Math.cos(angle) * radius,
    b: Math.sin(angle) * radius
  }).cssrgb;
let allColors = [mainPrimary];
for (let i = 0; i < oppositeSegments; i++) {
  allColors.push(chromatism.convert({
      L: brightness,
      a: Math.cos(angle + Math.PI + (i / oppositeSegments - .5) * oppositeSpreadAngle) * radius,
      b: Math.sin(angle + Math.PI + (i / oppositeSegments - .5) * oppositeSpreadAngle) * radius
    }).cssrgb);
}
// *******************************************************


let currentColor = 0;

init();
animate();

function init() {

  const container = document.getElementById('container');

  //

  scene = new THREE.Scene();
  scene.background = new THREE.Color(
      chromatism.saturation(-50, chromatism.shade(-16 + Math.random() * 32, mainPrimary).cssrgb).cssrgb);

  const near = 10;
  const far = 700 + Math.random() * 800;
  scene.fog = new THREE.Fog(scene.background, near, far);
  // scene.fog = new THREE.Fog(allColors[1], near, far);
  //

  camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 1000);
  // camera = new THREE.OrthographicCamera(
  //           -50 * window.innerWidth / window.innerHeight,
  //           50 * window.innerWidth / window.innerHeight,
  //           50,
  //           -50,
  //           .1,
  //           5000);
  camera.position.set(0, 10, 100);
  // camera.rotation.set(10, 0, 0);

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

  // const controls = new OrbitControls( camera, renderer.domElement );
  // controls.minDistance = 5;
  // controls.maxDistance = 500;
  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

  water = new Water(
      waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load('textures/waternormals.jpg', function (texture) {

        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

      }),
      alpha: 1.0,
      sunDirection: new THREE.Vector3(),
      flowDirection: new THREE.Vector2(10, 4),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined
    });

  water.rotation.x =  - Math.PI / 2;
  water.position.y = -45;

  scene.add(water);
}
function allLoaded() {
  for (let url of loadedUrls) {
    if (!Loader.isLoaded(url))
      return false;
  }
  return true;
}
function loadAll(rules) {
  for (let ruleKey in rules) {
    let rule = rules[ruleKey];
    if ("spawn" in rule) {
      for (let spawn of rule["spawn"]) {
        checkAndApplyPreset(spawn);
        function loadUrl(url) {
          url = "assets/" + url;
          Loader.loadSVG(url);
          loadedUrls.push(url);
        }
        if (typeof(spawn.url) == "object") {
          for (let spawnUrl of spawn.url) {
            loadUrl(spawnUrl);
          }
        }
        else {
          loadUrl(spawn.url);
        }
      }
    }
  }
}

function checkAndApplyPreset(obj) {
  let preset = obj["presetId"];
  console.log(preset);
  if (preset != null && presets[preset] != null) {
    let final = Object.assign({}, presets[preset]);
    Object.assign(final, obj);
    Object.assign(obj, final);
    console.log(obj);
  }
}

function processRule(rule, currentDimensions) {
  console.log("processing rule:");
  console.log(rule);
  if ("spawn" in rule) {
    for (let spawn of rule["spawn"]) {
      for (let i = 0; i < spawn["count"]; i++) {
        if ("probability" in spawn && Math.random() > spawn["probability"]) continue;

        let palette = {
          "rgb(237,28,36)": allColors[currentColor],
          "rgb(255,242,0)": chromatism.shade(30, allColors[currentColor]).cssrgb, // main light
          "rgb(236,0,140)": chromatism.shade(-10, allColors[currentColor]).cssrgb, // main dark
          "rgb(0,166,81)": allColors[(currentColor + 1) % allColors.length], // secondary primary
          "rgb(46,49,146)": chromatism.shade(-10, allColors[(currentColor + 1) % allColors.length]).cssrgb, // secondary dark
          "rgb(0,174,239)": chromatism.shade(30, allColors[(currentColor + 1) % allColors.length]).cssrgb, // secondary light
          "rgb(255,255,255)": "rgb(255, 255, 255)",
        };
        // extra jank
        currentColor++;
        if (currentColor >= allColors.length)
          currentColor = 1;
        let url = spawn["url"];
        if (typeof(url) == "object") {
          url = url[Math.floor(Math.random() * url.length)];
        }

        let spawnedObj = Loader.createObject("assets/" + url, palette, spawn["waviness"] || 0);
        let size = 1;
        if ("size" in spawn)
          size = spawn["size"];
        spawnedObj.scale.multiplyScalar(size);
        let xRange = 0;
        let yRange = 0;
        let zRange = 0;
        if ("xRange" in spawn)
          xRange = spawn["xRange"];
        if ("yRange" in spawn)
          yRange = spawn["yRange"];
        if ("zRange" in spawn)
          zRange = spawn["zRange"];
        spawnedObj.position.x =
          (currentDimensions.left +
          (currentDimensions.right - currentDimensions.left) / 2 +
          (currentDimensions.right - currentDimensions.left) * (Math.random() - .5) * xRange) * 200 - 100;
        spawnedObj.position.y =
          (currentDimensions.bottom +
          (currentDimensions.top - currentDimensions.bottom) / 2 +
          (currentDimensions.top - currentDimensions.bottom) * (Math.random() - .5) * yRange) * 100 - 50;
        spawnedObj.position.z =
          (currentDimensions.back +
          (currentDimensions.front - currentDimensions.back) / 2 +
          (currentDimensions.front - currentDimensions.back) * (Math.random() - .5) * zRange) * 500 - 650;
        if ("xOffset" in spawn) 
          spawnedObj.position.y += spawn["xOffset"];
        if ("yOffset" in spawn) 
          spawnedObj.position.y += spawn["yOffset"];
        if ("zOffset" in spawn) 
          spawnedObj.position.y += spawn["zOffset"];
        scene.add(spawnedObj);
      }
    }
  }
  if ("replaceOne" in rule) {
    let chosen = rule["replaceOne"][Math.floor(Math.random() * rule["replaceOne"].length)];
    if ("replace" in rule) {
      rule["replace"].push(chosen);
    }
    else {
      rule["replace"] = [chosen];
    }
  }
  if ("replace" in rule) {
    let lastDimensions = {
      "left": 0,
      "right": 1,
      "bottom": 0,
      "top": 1,
      "front": 1,
      "back": 0
    };
    for (let replace of rule["replace"]) {
      if ("probability" in replace && Math.random() > replace["probability"]) continue;
      let newDimensions = Object.assign({}, currentDimensions);
      function tryReplaceThenReturnIfNumerical(dir) {
        if (dir in replace) {
          if ((typeof replace[dir] === 'string' || replace[dir]instanceof String)) {
            if (replace[dir].startsWith("previous_")) {
              newDimensions[dir] = lastDimensions[replace[dir].split("_")[1]];
            }
            return false;
          }
          return true;
        }
        return false;
      }
      if (tryReplaceThenReturnIfNumerical("left")) {
        newDimensions.left =
          (currentDimensions.right - currentDimensions.left) * replace.left + currentDimensions.left;
      }
      if (tryReplaceThenReturnIfNumerical("right")) {
        newDimensions.right =
          (currentDimensions.right - currentDimensions.left) * replace.right + currentDimensions.left;
      }
      if (tryReplaceThenReturnIfNumerical("bottom")) {
        newDimensions.bottom =
          (currentDimensions.top - currentDimensions.bottom) * replace.bottom + currentDimensions.bottom;
      }
      if (tryReplaceThenReturnIfNumerical("top")) {
        newDimensions.top =
          (currentDimensions.top - currentDimensions.bottom) * replace.top + currentDimensions.bottom;
      }
      if (tryReplaceThenReturnIfNumerical("back")) {
        newDimensions.back =
          (currentDimensions.front - currentDimensions.back) * replace.back + currentDimensions.back;
      }
      if (tryReplaceThenReturnIfNumerical("front")) {
        newDimensions.front =
          (currentDimensions.front - currentDimensions.back) * replace.front + currentDimensions.back;
      }
      processRule(rules[replace.id], newDimensions);
      lastDimensions = newDimensions;
    }
  }
}

function onWindowResize() {

// perspective
  camera.aspect = window.innerWidth / window.innerHeight;
// ortho
  camera.left = -50 * window.innerWidth / window.innerHeight;
  camera.right = 50 * window.innerWidth / window.innerHeight;
  camera.top = 50;
  camera.bottom = -50;

  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

  requestAnimationFrame(animate);
  // camera.rotation.y = Math.sin(Date.now() / 1000 / 4) / 10;
  // camera.position.x = Math.sin(Date.now() / 1000 / 4) * 8;

  if (allLoaded() && !loaded && jsonLoaded) {
    loaded = true;
    let current = {
      "left": 0,
      "right": 1,
      "bottom": 0,
      "top": 1,
      "front": 1,
      "back": 0
    };
    processRule(rules[parsedRules["initial"][0]["id"]], current);
  }
  if (!jsonLoaded) {

    let rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/yaml");
    rawFile.open("GET", "rules/traditional.yaml", true);
    rawFile.onreadystatechange = function () {
      if (!jsonLoaded && rawFile.readyState === 4 && rawFile.status == "200") {
        // initialize
        parsedRules = yaml.load(rawFile.responseText);
        rules = parsedRules["rules"];
        presets = parsedRules["presets"] || {};
        loadAll(rules,presets);
        console.log("loaded json");
        jsonLoaded = true;
      }
    }
    rawFile.send(null);
  }

  render();
}

function render() {

  water.material.uniforms['time'].value += .2 / 60.0;
  renderer.render(scene, camera);

}
