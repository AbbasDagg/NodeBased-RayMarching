import React, { useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Raymarcher from './MyRaymarcher';
import { GUI } from 'lil-gui';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { PMREMGenerator } from 'three';

const ThreeScene = forwardRef((props, ref) => {
  const raymarcherRef = useRef(null); // Use ref to store the raymarcher instance

  useImperativeHandle(ref, () => ({
    addShape: (shapeData, layerIndex) => {
      if (raymarcherRef.current) {
        const operationMap = {
          union: Raymarcher.operations.union,
          subtraction: Raymarcher.operations.substraction,
          intersection: Raymarcher.operations.intersection,
        };

        if (!raymarcherRef.current.userData.layers[layerIndex]) {
          raymarcherRef.current.userData.layers[layerIndex] = [];
        }

        raymarcherRef.current.userData.layers[layerIndex].push({
          color: new THREE.Color(shapeData.color || 0xffffff),
          operation: operationMap[shapeData.operation] || Raymarcher.operations.union, // Default to union if undefined
          position: new THREE.Vector3(shapeData.position.x, shapeData.position.y, shapeData.position.z),
          rotation: new THREE.Quaternion(),
          scale: new THREE.Vector3(shapeData.scale.x, shapeData.scale.y, shapeData.scale.z),
          shape: Raymarcher.shapes[shapeData.shape]
        });
        raymarcherRef.current.needsUpdate = true;
      }
    },
    clearScene: () => {
      if (raymarcherRef.current) {
        raymarcherRef.current.userData.layers = [];
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

    const pmremGenerator = new PMREMGenerator(renderer);
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

    const gui = new GUI();
    gui.add(raymarcher.userData, 'resolution', 0.01, 1, 0.01).name('Resolution');
    gui.add(raymarcher.userData, 'blending', 0, 2, 0.01).name('Blending');
    gui.add(raymarcher.userData, 'metalness', 0, 1, 0.01).name('Metalness');
    gui.add(raymarcher.userData, 'roughness', 0, 1, 0.01).name('Roughness');
    gui.add(raymarcher.userData, 'envMapIntensity', 0, 1, 0.01).name('Env Map Intensity');

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
