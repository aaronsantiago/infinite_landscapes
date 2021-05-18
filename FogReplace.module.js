import {noise} from './PerlinNoise.module.js'

const wavyParsVert = `
#include <common>
uniform float waviness;
`

const wavyVert = `
vec3 transformed = vec3( position );
transformed = transformed + vec3(0, 0, sin((modelMatrix * vec4(position,1) + time).x/5.0)*30.0 * waviness);
`;

const fogParsVert = `

uniform float time;
#ifdef USE_FOG
  varying float fogDepth;
  varying vec3 vFogWorldPosition;
#endif
`;

const fogVert = `
#ifdef USE_FOG
  fogDepth = - mvPosition.z;
  vFogWorldPosition = (modelMatrix * vec4( transformed, 1.0 )).xyz;
#endif
`;

const fogFrag = `
#ifdef USE_FOG
  vec3 windDir = vec3(0.0, 0.0, 0.0);
  vec3 scrollingPos = vFogWorldPosition.xyz + fogNoiseSpeed * windDir;  
  float noise = cnoise(fogNoiseFreq * scrollingPos.xyz);
  float vFogDepth = (1.0 - fogNoiseImpact * noise) * fogDepth;
  #ifdef FOG_EXP2
  float customColorFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );
  #else
  float customColorFactor = smoothstep( fogNear, fogFar, vFogDepth );
  float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
  #endif
  // vec3 foggedCustomColor = mix( fogCustomColor.rgb, fogColor, fogFactor );

  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogCustomColor, customColorFactor );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif

`;

const fogParsFrag = `
#ifdef USE_FOG
  ${noise}
	uniform vec3 fogColor;
  uniform vec3 fogNearColor;
  uniform vec3 fogCustomColor;
	varying float fogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
  varying vec3 vFogWorldPosition;
  uniform float time;
  uniform float fogNoiseSpeed;
  uniform float fogNoiseFreq;
  uniform float fogNoiseImpact;
#endif
`

export { wavyParsVert, fogParsVert, fogVert, fogParsFrag, fogFrag, wavyVert };
