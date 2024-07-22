import React, { useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { GUI } from 'lil-gui';
import Raymarcher from './MyRaymarcher';

const SCALING_FACTOR = 5; // Scale up shapes to fix a small bug in the raymarcher

const ThreeScene = forwardRef((props, ref) => {
  const raymarcherRef = useRef(null); // Use ref to store the raymarcher instance
  const pmremGeneratorRef = useRef(null); // Use ref to store the PMREM generator

  useImperativeHandle(ref, () => ({
    addShape: (shapeData) => {
      if (raymarcherRef.current) {
        const operationMap = {
          union: Raymarcher.operations.union,
          subtraction: Raymarcher.operations.substraction,
          intersection: Raymarcher.operations.intersection,
        };

        raymarcherRef.current.userData.layers[0].push({
          color: new THREE.Color(shapeData.color || 0xffffff),
          operation: operationMap[shapeData.operation] || Raymarcher.operations.union, // Default to union if undefined
          position: new THREE.Vector3(shapeData.position.x * SCALING_FACTOR, shapeData.position.y * SCALING_FACTOR, shapeData.position.z * SCALING_FACTOR),
          rotation: new THREE.Quaternion(),
          scale: new THREE.Vector3(shapeData.scale.x * SCALING_FACTOR, shapeData.scale.y * SCALING_FACTOR, shapeData.scale.z * SCALING_FACTOR),
          shape: Raymarcher.shapes[shapeData.shape]
        });
        raymarcherRef.current.needsUpdate = true;
      }
    },
    clearScene: () => {
      if (raymarcherRef.current) {
        raymarcherRef.current.userData.layers[0] = [];
        raymarcherRef.current.needsUpdate = true;
      }
    }
  }));

  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
    document.getElementById('three-scene').appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(0, 0, 36);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.update();

    pmremGeneratorRef.current = new PMREMGenerator(renderer);
    const pmremGenerator = pmremGeneratorRef.current;
    const environmentMap = pmremGenerator.fromScene(new RoomEnvironment()).texture;

    const raymarcher = new Raymarcher({
      envMap: environmentMap,
      resolution: 0.5,
      blending: 1,
      roughness: 0,
      metalness: 0,
      envMapIntensity: 0.6,
      layers: [[]] // Start with a single empty layer
    });
    raymarcherRef.current = raymarcher;
    scene.add(raymarcher);

    const environments = {
      Apartment: 'https://cdn.glitch.global/76fe1fa3-d3aa-4d7b-911f-8ad91e01d136/lebombo_2k.hdr?v=1646042358302',
      City: 'https://cdn.glitch.global/76fe1fa3-d3aa-4d7b-911f-8ad91e01d136/potsdamer_platz_2k.hdr?v=1646042358575',
      Forest: 'https://cdn.glitch.global/76fe1fa3-d3aa-4d7b-911f-8ad91e01d136/neurathen_rock_castle_2k.hdr?v=1646042624812',
      Studio: 'https://cdn.glitch.global/76fe1fa3-d3aa-4d7b-911f-8ad91e01d136/studio_small_08_2k.hdr?v=1646042358774',
      Warehouse: 'https://cdn.glitch.global/76fe1fa3-d3aa-4d7b-911f-8ad91e01d136/empty_warehouse_01_2k.hdr?v=1646042357806',
      Sunset: 'https://cdn.glitch.global/76fe1fa3-d3aa-4d7b-911f-8ad91e01d136/venice_sunset_2k.hdr?v=1646042356028',
      Dawn: 'https://cdn.glitch.global/76fe1fa3-d3aa-4d7b-911f-8ad91e01d136/kiara_1_dawn_2k.hdr?v=1646042357931',
      Night: 'https://cdn.glitch.global/76fe1fa3-d3aa-4d7b-911f-8ad91e01d136/dikhololo_night_2k.hdr?v=1646042357152',
    };

    const loader = new RGBELoader();
    const loadEnvironment = (envName) => {
      loader.load(environments[envName], (texture) => {
        const pmremTexture = pmremGenerator.fromEquirectangular(texture).texture;
        scene.background = pmremTexture;
        raymarcher.userData.envMap = pmremTexture;
        raymarcher.needsUpdate = true;
      });
    };

    loadEnvironment('Dawn'); // Load a default environment map

    const gui = new GUI({ title: 'three-raymarcher' });
    gui.add(raymarcher.userData, 'resolution', 0.01, 1, 0.01);
    gui.add(raymarcher.userData, 'blending', 0.2, 2, 0.01);
    gui.add(raymarcher.userData, 'metalness', 0, 1, 0.01);
    gui.add(raymarcher.userData, 'roughness', 0, 1, 0.01);
    gui.add(raymarcher.userData, 'envMapIntensity', 0, 1, 0.01);
    gui.add({ envMap: 'Dawn' }, 'envMap', Object.keys(environments)).onChange(loadEnvironment);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      gui.destroy();
    };
  }, []);

  return <div id="three-scene" style={{ width: '50vw', height: '100%' }} />;
});

export default ThreeScene;
