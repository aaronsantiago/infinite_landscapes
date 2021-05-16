
import * as THREE from './libs/three.module.js';
import { fogParsVert, fogVert, fogParsFrag, fogFrag, wavyVert } from './FogReplace.module.js';
import
{
  SVGLoader
}
from './libs/SVGLoader.js';

let objects = {};

function loadSVG(url)
{
  const loader = new SVGLoader();

  loader.load(url, function (data)
  {
    objects[url] = data;
  }
  );
}

function isLoaded(url)
{
  return url in objects;
}

function createObject(url, palette, drawFillShapes = true, drawStrokes = false)
{
  const paths = objects[url].paths;

  const containerGroup = new THREE.Group();
  const group = new THREE.Group();
  // group.scale.multiplyScalar(0.25);
  group.scale.y *=  - 1;
  let z = 0;

  for (let i = 0; i < paths.length; i++)
  {

    const path = paths[i];

    let fillColor = path.userData.style.fill;
    console.log(fillColor);
    console.log(new THREE.Color().setStyle(fillColor));
    let alpha = parseFloat(fillColor.split(',')[3]) || 1;
    let rgb = new THREE.Color().setStyle(fillColor);
    rgb.r *= 255;
    rgb.g *= 255;
    rgb.b *= 255;
    fillColor = chromatism.convert(rgb).cssrgb;

    if (!(fillColor in palette))
    {
      console.log(fillColor + "not found, using color");
      palette[fillColor] = fillColor;
    }
    if (drawFillShapes && fillColor !== undefined && fillColor !== 'none')
    {

      const material = new THREE.MeshBasicMaterial(
        {
          color: new THREE.Color().setStyle(palette[fillColor]),
          opacity: alpha,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: true,
          wireframe: false
        }
        );
      material.onBeforeCompile = shader =>
      {
        shader.vertexShader = shader.vertexShader.replace(`#include <fog_pars_vertex>`, fogParsVert);
        shader.vertexShader = shader.vertexShader.replace(`#include <fog_vertex>`, fogVert);
        shader.vertexShader = shader.vertexShader.replace(`#include <begin_vertex>`, wavyVert);
        shader.fragmentShader = shader.fragmentShader.replace(`#include <fog_pars_fragment>`, fogParsFrag);
        shader.fragmentShader = shader.fragmentShader.replace(`#include <fog_fragment>`, fogFrag);


        const uniforms = {
          fogNearColor: { value: new THREE.Color("blue") },
          fogCustomColor: { value: new THREE.Color().setStyle(palette[fillColor + 1]) },
          fogNoiseFreq: { value: .02 },
          fogNoiseSpeed: { value: 1 },
          fogNoiseImpact: { value: 1 },
          time: { value: 0 }
        };

        shader.uniforms = THREE.UniformsUtils.merge([shader.uniforms, uniforms]);
        setInterval(() => {
          shader.uniforms.time.value += .1;
        }, 10);
      };

      const shapes = path.toShapes(true);

      for (let j = 0; j < shapes.length; j++)
      {
        const shape = shapes[j];

        const geometry = new THREE.ShapeGeometry(shape);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = z;
        z += .3;
        group.add(mesh);
      }
    }

    const strokeColor = path.userData.style.stroke;

    if (drawStrokes && strokeColor !== undefined && strokeColor !== 'none')
    {

      const material = new THREE.MeshBasicMaterial(
        {
          color: new THREE.Color().setStyle(strokeColor),
          opacity: path.userData.style.strokeOpacity,
          transparent: path.userData.style.strokeOpacity < 1,
          side: THREE.DoubleSide,
          depthWrite: false,
          wireframe: false
        }
        );

      for (let j = 0, jl = path.subPaths.length; j < jl; j++)
      {

        const subPath = path.subPaths[j];

        const geometry = SVGLoader.pointsToStroke(subPath.getPoints(), path.userData.style);

        if (geometry)
        {

          const mesh = new THREE.Mesh(geometry, material);

          group.add(mesh);
        }
      }
    }
  }

  // Calculate the center of the object and center it
  var bbox = new THREE.Box3().setFromObject(group);
  let center = new THREE.Vector3();
  bbox.getCenter(center);
  group.position.x = -center.x;
  group.position.y = -center.y;
  containerGroup.add(group);

  return containerGroup;
}

let index =
{
  loadSVG: loadSVG,
  createObject: createObject,
  isLoaded: isLoaded
};

export
{
  loadSVG,
  createObject,
  isLoaded
};
export default index;
