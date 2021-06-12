import * as THREE from './libs/three.module.js';
import {
  GUI
} from './libs/dat.gui.module.js';
import * as Loader from './loader.module.js';
import {
  Water
} from './libs/three.water.js';

import * as yaml from './libs/yaml.module.js';
// import Stats from './libs/stats.module.js';
// import { OrbitControls } from './libs/OrbitControls.js';


let PARAMS = {
  seed: 0,
  colorSeed: 0,
  randomizeSeed: false,
}

let mt;

// CDN
const universePane = new Tweakpane.Pane();
universePane.registerPlugin(TweakpaneIntervalPlugin);

let pane = universePane.addFolder({
    title: "toggle panel"
  })

pane.addInput(PARAMS, "seed", {step: 1});
pane.addInput(PARAMS, "colorSeed", {step: 1});
pane.addInput(PARAMS, "randomizeSeed");

pane.on('change', (ev) => {
  if (initialized) {
    savePanel();
    // window.location = "";
  }
});
let initialized = false;

let renderer, stats, scene, camera, gui, guiData;
let loaded = false;
let jsonLoaded = false;
let rules = {};
let parsedRules = {};
let presets = {};
let water = null;
let loadedUrls = [];

let radius, angle, brightness,
  oppositeSegments, oppositeSpreadAngle, mainPrimary, allColors;


let currentColor = 0;
init();
animate();

function init() {

  const container = document.getElementById('container');

  //

  scene = new THREE.Scene();
  // scene.fog = new THREE.Fog(allColors[1], near, far);
  //

  camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, .1, 10000);
  // camera = new THREE.OrthographicCamera(
  //           -50 * window.innerWidth / window.innerHeight,
  //           50 * window.innerWidth / window.innerHeight,
  //           50,
  //           -50,
  //           .1,
  //           5000);
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
      waterNormals: new THREE.TextureLoader().load('textures/waternormals.jpg', function(texture) {

        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

      }),
      alpha: 1.0,
      sunDirection: new THREE.Vector3(),
      flowDirection: new THREE.Vector2(10, 4),
      sunColor: 0xffffff,
      waterColor: 0xa0beaf,
      distortionScale: 9.7,
      fog: scene.fog !== undefined
    });

  water.rotation.x = -Math.PI / 2;
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

let baseRandom;

let panelFolders = {};
let panelFolderParams = {};

let intervalParams = {};
panelFolders[""] = pane;

function findSliderReferencesInChildren(rule) {
  for (let key in rule) {
    let ruleValue = rule[key];
    if (typeof ruleValue === "string") {
      if (ruleValue[0] != "$") continue;
      ruleValue = ruleValue.slice(1);

      let [value, ...args] = ruleValue.split(" ");
      let foldersValue = value.split("/");
      let cumulativeFolderName = "";

      // make sure all folders are created in the UI
      // before trying to add the slider
      for (let i = 0; i < foldersValue.length - 1; i++) {
        let folderName = foldersValue[i];
        let previousFolderName = cumulativeFolderName;
        cumulativeFolderName += cumulativeFolderName == "" ? "" : "/";
        cumulativeFolderName += folderName;

        if (!(cumulativeFolderName in panelFolders)) {
          panelFolders[cumulativeFolderName] =
            panelFolders[previousFolderName].addFolder({
              title: folderName
            })
          panelFolderParams[cumulativeFolderName] = {};
        }
      }

      let sliderName = foldersValue[foldersValue.length - 1];
      let presetKey = cumulativeFolderName + "/" + sliderName;
      if (args[1] == null) {
        panelFolderParams[cumulativeFolderName][sliderName] = args[0] || 0;
        panelFolders[cumulativeFolderName].addInput(panelFolderParams[cumulativeFolderName], sliderName, {
          presetKey: presetKey
        });
      }
      else {

        if (_.startsWith(args[1], "range")) {
          
          if (!(cumulativeFolderName in intervalParams)) intervalParams[cumulativeFolderName] = {};
          if (!(sliderName in intervalParams[cumulativeFolderName])) intervalParams[cumulativeFolderName][sliderName] = {};
          

          intervalParams[cumulativeFolderName][sliderName][args[1].slice(5)] = args[0] ? parseFloat(args[0]) : 0;

          if (!("added" in intervalParams[cumulativeFolderName][sliderName])
              && "min" in intervalParams[cumulativeFolderName][sliderName]
              && "max" in intervalParams[cumulativeFolderName][sliderName]) {
            intervalParams[cumulativeFolderName][sliderName].added = true;
            let params = intervalParams[cumulativeFolderName];
            let folder = panelFolders[cumulativeFolderName];
            folder.addInput(params, sliderName, {
                  presetKey: presetKey,
                  min: -1,
                  max: 2
                });
          }
        }
      }

    } else if (isNaN(ruleValue)) {
      findSliderReferencesInChildren(rule[key]);
    }
  }
}

function loadAll(rules) {
  for (let ruleKey in rules) {
    let rule = rules[ruleKey];
    if (rule == null) continue;
    findSliderReferencesInChildren(rule);

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
        } else {
          loadUrl(spawn.url);
        }
      }
    }
  }

  if ("panelString" in localStorage) {
    console.log("loading panel string");
    universePane.importPreset(JSON.parse(localStorage.getItem("panelString")));
  }

  if (PARAMS.randomizeSeed) {
    PARAMS.seed = Math.floor(Math.random() * 100000);
    PARAMS.colorSeed = Math.floor(Math.random() * 100000);
  }

  mt = Random.MersenneTwister19937.seed(PARAMS.seed);
  baseRandom = function() {
    return Random.real(0, 1)(mt);
    console.log(mt.uses);
  };

  const mt2 = Random.MersenneTwister19937.seed(PARAMS.colorSeed);
  let colorRandom = () => Random.real(0, 1)(mt2);
  // ************ GENERATE PALETTE ***********************
  // radius determines saturation amount
  // angle determines hue
  radius = colorRandom() * 50 + 50;
  angle = colorRandom() * Math.PI * 2;
  brightness = colorRandom() * 35 + 45;

  oppositeSegments = 6;
  oppositeSpreadAngle = Math.PI / (1 + colorRandom() * 3);
  mainPrimary = chromatism.convert({
    L: brightness,
    a: Math.cos(angle) * radius,
    b: Math.sin(angle) * radius
  }).cssrgb;
  allColors = [mainPrimary];
  for (let i = 0; i < oppositeSegments; i++) {
    allColors.push(chromatism.convert({
      L: brightness,
      a: Math.cos(angle + Math.PI + (i / oppositeSegments - .5) * oppositeSpreadAngle) * radius,
      b: Math.sin(angle + Math.PI + (i / oppositeSegments - .5) * oppositeSpreadAngle) * radius
    }).cssrgb);
  }
  // ****************************************************

  scene.background = new THREE.Color(
    chromatism.saturation(-50, chromatism.shade(-16 + colorRandom() * 42, mainPrimary).cssrgb).cssrgb);
  const near = 10;
  const far = 1200;
  scene.fog = new THREE.Fog(scene.background, near, far);

  initialized = true;
}

function newDimensions() {
  return {
    "left": 0,
    "right": 1,
    "bottom": 0,
    "top": 1,
    "front": 1,
    "back": 0,
    "hueShift": 0,
    "saturation": 0,
    "brightness": 0,
  };
}

function getNumericalOrReadSlider(ruleValue) {
  if (typeof ruleValue === "string") {
    console.log(ruleValue);
    if (ruleValue[0] == "$") {
      let [value, ...args] = ruleValue.split(" ");
      value = value.slice(1); // cut off the dollar sign


      let sliderName = _.last(value.split("/"));
      let folderName = value.slice(0, value.length - (1 + sliderName.length));
      console.log("param");
      console.log(args);
      if (_.startsWith(args[1], "range")) {
        console.log("param " + intervalParams[folderName][sliderName][args[1].slice(5)]);
        return intervalParams[folderName][sliderName][args[1].slice(5)];
      }

      return panelFolderParams[folderName][sliderName];
    }
  }
  return ruleValue;
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
  if (rule == null) return;

  const mt3 = Random.MersenneTwister19937.seed(mt.next());
  let spawnRandom = () => Random.real(0, 1)(mt3);
  if ("spawn" in rule) {
    for (let spawn of rule["spawn"]) {
      for (let i = 0; i < getNumericalOrReadSlider(spawn["count"]); i++) {
        if ("probability" in spawn && spawnRandom() > getNumericalOrReadSlider(spawn["probability"])) continue;

        try {
          let hueShiftedPrimary = chromatism.saturation(currentDimensions.saturation, allColors[(currentColor + currentDimensions.hueShift) % allColors.length]).cssrgb;
          let hueShiftedSecondary = chromatism.saturation(currentDimensions.saturation, allColors[(currentColor + currentDimensions.hueShift + 1) % allColors.length]).cssrgb;


          hueShiftedPrimary = chromatism.shade(currentDimensions.brightness, hueShiftedPrimary).cssrgb;
          hueShiftedSecondary = chromatism.shade(currentDimensions.brightness, hueShiftedSecondary).cssrgb;
          let palette = {
            "rgb(237,28,36)": hueShiftedPrimary,
            "rgb(255,242,0)": chromatism.shade(20, hueShiftedPrimary).cssrgb, // main light
            "rgb(236,0,140)": chromatism.shade(-10, hueShiftedPrimary).cssrgb, // main dark
            "rgb(0,166,81)": hueShiftedSecondary, // secondary primary
            "rgb(46,49,146)": chromatism.shade(-10, hueShiftedSecondary).cssrgb, // secondary dark
            "rgb(0,174,239)": chromatism.shade(20, hueShiftedSecondary).cssrgb, // secondary light
            "rgb(255,255,255)": "rgb(255, 255, 255)",
          };
          // // extra jank
          // currentColor++;
          // if (currentColor >= allColors.length)
          //   currentColor = 1;
          let url = getNumericalOrReadSlider(spawn["url"]);
          if (typeof(url) == "object") {
            url = url[Math.floor(spawnRandom() * url.length)];
          }

          let spawnedObj = Loader.createObject("assets/" + url, palette, getNumericalOrReadSlider(spawn["waviness"]) || 0);
          let size = 1;
          if ("size" in spawn)
            size = getNumericalOrReadSlider(spawn["size"]);
          if ("sizeRange" in spawn)
            size += spawnRandom() * getNumericalOrReadSlider(spawn["sizeRange"]);
          spawnedObj.scale.x = spawnRandom() > .5 ? 1 : -1;
          spawnedObj.scale.multiplyScalar(size);
          let xRange = 0;
          let yRange = 0;
          let zRange = 0;
          if ("xRange" in spawn)
            xRange = getNumericalOrReadSlider(spawn["xRange"]);
          if ("yRange" in spawn)
            yRange = getNumericalOrReadSlider(spawn["yRange"]);
          if ("zRange" in spawn)
            zRange = getNumericalOrReadSlider(spawn["zRange"]);
          spawnedObj.position.x =
            (currentDimensions.left +
              (currentDimensions.right - currentDimensions.left) / 2 +
              (currentDimensions.right - currentDimensions.left) * (spawnRandom() - .5) * xRange) * 200 - 100;
          spawnedObj.position.y =
            (currentDimensions.bottom +
              (currentDimensions.top - currentDimensions.bottom) / 2 +
              (currentDimensions.top - currentDimensions.bottom) * (spawnRandom() - .5) * yRange) * 100 - 50;
          spawnedObj.position.z =
            (currentDimensions.back +
              (currentDimensions.front - currentDimensions.back) / 2 +
              (currentDimensions.front - currentDimensions.back) * (spawnRandom() - .5) * zRange) * 500 - 650;
          if ("xOffset" in spawn)
            spawnedObj.position.y += getNumericalOrReadSlider(spawn["xOffset"]);
          if ("yOffset" in spawn)
            spawnedObj.position.y += getNumericalOrReadSlider(spawn["yOffset"]);
          if ("zOffset" in spawn)
            spawnedObj.position.y += getNumericalOrReadSlider(spawn["zOffset"]);
          scene.add(spawnedObj);
        } catch (e) {
          console.log(e);
        }
      }
    }
  }
  if ("replaceOne" in rule) {
    let chosen = rule["replaceOne"][Math.floor(baseRandom() * rule["replaceOne"].length)];
    if ("replace" in rule) {
      rule["replace"].push(chosen);
    } else {
      rule["replace"] = [chosen];
    }
  }
  if ("replace" in rule) {
    let lastDimensions = newDimensions();
    for (let replace of rule["replace"]) {
      for (let i = 0; i < (replace["count"] || 1); i++) {
        if ("probability" in replace && baseRandom() > replace["probability"]) continue;
        let newDimensions = Object.assign({}, currentDimensions);

        if (replace.id == "feature") {
          console.log("feature state");
          console.log(replace);
        } 

        if ("left" in replace) {
          newDimensions.left =
            (currentDimensions.right - currentDimensions.left) * getNumericalOrReadSlider(replace.left) + currentDimensions.left;
        }
        if ("right" in replace) {
          newDimensions.right =
            (currentDimensions.right - currentDimensions.left) * getNumericalOrReadSlider(replace.right) + currentDimensions.left;
        }
        if ("randWidth" in replace) {
          newDimensions.left += baseRandom() * (newDimensions.right - newDimensions.left) * (1 - getNumericalOrReadSlider(replace.randWidth));
          newDimensions.right = newDimensions.left + (newDimensions.right - newDimensions.left) * getNumericalOrReadSlider(replace.randWidth);
        }
        if ("bottom" in replace) {
          newDimensions.bottom =
            (currentDimensions.top - currentDimensions.bottom) * getNumericalOrReadSlider(replace.bottom) + currentDimensions.bottom;
        }
        if ("top" in replace) {
          newDimensions.top =
            (currentDimensions.top - currentDimensions.bottom) * getNumericalOrReadSlider(replace.top) + currentDimensions.bottom;
        }
        if ("randHeight" in replace) {
          newDimensions.bottom += baseRandom() * (newDimensions.top - newDimensions.bottom) * (1 - getNumericalOrReadSlider(replace.randHeight));
          newDimensions.top = newDimensions.bottom + (newDimensions.top - newDimensions.bottom) * getNumericalOrReadSlider(replace.randHeight);
        }
        if ("back" in replace) {
          newDimensions.back =
            (currentDimensions.front - currentDimensions.back) * getNumericalOrReadSlider(replace.back) + currentDimensions.back;
        }
        if ("front" in replace) {
          newDimensions.front =
            (currentDimensions.front - currentDimensions.back) * getNumericalOrReadSlider(replace.front) + currentDimensions.back;
        }
        if ("randDepth" in replace) {
          newDimensions.back += baseRandom() * (newDimensions.front - newDimensions.back) * (1 - getNumericalOrReadSlider(replace.randDepth));
          newDimensions.front = newDimensions.back + (newDimensions.front - newDimensions.back) * getNumericalOrReadSlider(replace.randDepth);
        }
        if ("hueShift" in replace) {
          newDimensions.hueShift += getNumericalOrReadSlider(replace.hueShift);
        }
        if ("hueShiftChance" in replace) {
          newDimensions.hueShift += baseRandom() > getNumericalOrReadSlider(replace.hueShiftChance) ? 1 : 0;
        }
        if ("saturation" in replace) {
          newDimensions.saturation += getNumericalOrReadSlider(replace.saturation);
        }
        if ("brightness" in replace) {
          newDimensions.brightness += getNumericalOrReadSlider(replace.brightness);
        }
        processRule(rules[replace.id], newDimensions);
        lastDimensions = newDimensions;
      }
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

function savePanel() {
  localStorage.setItem("panelString", JSON.stringify(universePane.exportPreset()));
}

function animate() {
  if (initialized) savePanel();


  requestAnimationFrame(animate);
  // camera.rotation.y = Math.sin(Date.now() / 1000 / 4) / 10;
  // camera.position.x = Math.sin(Date.now() / 1000 / 4) * 8;

  if (allLoaded() && !loaded && jsonLoaded) {
    loaded = true;
    let current = newDimensions();
    processRule(rules[parsedRules["initial"][0]["id"]], current);
  }
  if (!jsonLoaded) {

    let rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/yaml");
    rawFile.open("GET", "rules/sliders.yaml", true);
    rawFile.onreadystatechange = function() {
      if (!jsonLoaded && rawFile.readyState === 4 && rawFile.status == "200") {
        // initialize
        parsedRules = yaml.load(rawFile.responseText);
        rules = parsedRules["rules"];
        presets = parsedRules["presets"] || {};
        loadAll(rules, presets);
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