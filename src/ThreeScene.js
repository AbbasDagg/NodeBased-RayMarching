import React, { useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { GUI } from 'lil-gui';
import Raymarcher from './MyRaymarcher';

const SCALING_FACTOR = 3; // Scale up shapes to fix a small bug in the raymarcher

const ThreeScene = forwardRef((props, ref) => {
  const raymarcherRef = useRef(null); // Use ref to store the raymarcher instance
  const pmremGeneratorRef = useRef(null); // Use ref to store the PMREM generator
  const rendererRef = useRef(null); // Use ref to store the renderer
  const cameraRef = useRef(null); // Use ref to store the camera
  const controlsRef = useRef(null); // Use ref to store the orbit controls
  const velocityRef = useRef(new THREE.Vector2(0, 0)); // Track the camera's velocity
  const lastPositionRef = useRef(new THREE.Vector2(0, 0)); // Track the last position to calculate velocity

  useImperativeHandle(ref, () => ({
    addShape: (shapeData, layerId) => {
      if (raymarcherRef.current) {
        const operationMap = {
          union: Raymarcher.operations.union,
          subtraction: Raymarcher.operations.substraction,
          intersection: Raymarcher.operations.intersection,
        };

        const rotationVector = new THREE.Vector3(
          (shapeData.rotation.x % 360) * (Math.PI / 180), // Convert degrees to radians
          (shapeData.rotation.y % 360) * (Math.PI / 180),
          (shapeData.rotation.z % 360) * (Math.PI / 180)
        );

        // Create a quaternion from the Euler angles
        const quaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rotationVector.x, rotationVector.y, rotationVector.z)
        );

        // Ensure the correct layer exists
        if (!raymarcherRef.current.userData.layers[layerId]) {
          raymarcherRef.current.userData.layers[layerId] = [];
        }

        // Add the shape to the specified layer
        raymarcherRef.current.userData.layers[layerId].push({
          color: new THREE.Color(shapeData.color || 0xffffff),
          operation: operationMap[shapeData.operation] || Raymarcher.operations.union, // Default to union if undefined
          position: new THREE.Vector3(shapeData.position.x * SCALING_FACTOR, shapeData.position.y * SCALING_FACTOR, shapeData.position.z * SCALING_FACTOR),
          rotation: quaternion, // Apply the quaternion for rotation
          scale: new THREE.Vector3(shapeData.scale.x * SCALING_FACTOR, shapeData.scale.y * SCALING_FACTOR, shapeData.scale.z * SCALING_FACTOR),
          shape: Raymarcher.shapes[shapeData.shape]
        });
        raymarcherRef.current.needsUpdate = true;
      }
    },
    clearScene: () => {
      if (raymarcherRef.current) {
        raymarcherRef.current.userData.layers = []; // Clear all layers
        raymarcherRef.current.needsUpdate = true;
      }
    },
    resizeRenderer: (width, height) => {
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    },
  }));

  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
    document.getElementById('three-scene').appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
    cameraRef.current = camera;
    camera.position.set(0, 0, 36);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;

    // Smoothness settings
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.7;

    // Track the last position and calculate velocity when the user stops moving
    const updateLastPosition = () => {
      lastPositionRef.current.set(
        controls.getAzimuthalAngle(),
        controls.getPolarAngle()
      );
    };

    controls.addEventListener('start', updateLastPosition);
    controls.addEventListener('change', () => {
      const azimuthalAngle = controls.getAzimuthalAngle();
      const polarAngle = controls.getPolarAngle();

      velocityRef.current.set(
        azimuthalAngle - lastPositionRef.current.x,
        polarAngle - lastPositionRef.current.y
      );

      updateLastPosition();
    });

    controls.addEventListener('end', () => {
      velocityRef.current.multiplyScalar(0.9); // Apply a smaller initial "drift" after interaction stops
    });

    pmremGeneratorRef.current = new PMREMGenerator(renderer);
    const pmremGenerator = pmremGeneratorRef.current;
    const environmentMap = pmremGenerator.fromScene(new RoomEnvironment()).texture;

    const raymarcher = new Raymarcher({
      envMap: environmentMap,
      resolution: 1,
      blending: 1,
      roughness: 0,
      metalness: 0.7,
      envMapIntensity: 1,
      layers: [[]] // Start with a single empty layer
    });
    raymarcherRef.current = raymarcher;
    scene.add(raymarcher);

    const environments = {
      RoomEnvironment: 'RoomEnvironment', // built in
      BrightSky: 'maps/industrial_sunset_puresky_4k.hdr', // Keep, bright sky
      Cloudy: 'maps/sunflowers_puresky_2k.hdr',  // maybe? cloudy sky
      Dawn: 'maps/kiara_1_dawn_2k.hdr',  // Keep maybe 
      PinkNight: 'maps/winter_evening_4k.hdr', // Keep, pink
      Shangai: 'maps/shanghai_bund_4k.hdr', // neon city
      Cinema : 'maps/pretville_cinema_4k.hdr',  // Keep
      BrightRoom: 'maps/lebombo_2k.hdr', // maybe? lit up room
      EmptyRoom: 'maps/small_empty_room_3_2k.hdr',  // Keep
      Studio: 'maps/studio_small_08_2k.hdr',  // Keep
      MedivalCafe: 'maps/medieval_cafe_4k.hdr',
    };

    const loader = new RGBELoader();
    const loadEnvironment = (envName) => {
      if (envName === 'RoomEnvironment') {
        const pmremTexture = pmremGenerator.fromScene(new RoomEnvironment()).texture;
        scene.background = pmremTexture;
        raymarcher.userData.envMap = pmremTexture;
        raymarcher.needsUpdate = true;
      } else {
        loader.load(environments[envName], (texture) => {
          const pmremTexture = pmremGenerator.fromEquirectangular(texture).texture;
          scene.background = pmremTexture;
          raymarcher.userData.envMap = pmremTexture;
          raymarcher.needsUpdate = true;
        });
      }
    };

    loadEnvironment('RoomEnvironment'); // Load a default environment map

    const gui = new GUI({ title: 'Settings' });
    gui.close();
    gui.add(raymarcher.userData, 'resolution', 0.01, 1, 0.01);
    gui.add(raymarcher.userData, 'blending', 0, 2, 0.01);
    gui.add(raymarcher.userData, 'metalness', 0, 1, 0.01);
    gui.add(raymarcher.userData, 'roughness', 0, 1, 0.01);
    gui.add(raymarcher.userData, 'envMapIntensity', 0, 1, 0.01);
    gui.add({ envMap: 'RoomEnvironment' }, 'envMap', Object.keys(environments)).onChange(loadEnvironment);

    const animate = () => {
      requestAnimationFrame(animate);

      // Apply drift (inertia) effect
      if (velocityRef.current.lengthSq() > 0.00001) {
        controlsRef.current.azimuthalAngle += velocityRef.current.x;
        controlsRef.current.polarAngle += velocityRef.current.y;

        // Gradually reduce the velocity
        velocityRef.current.multiplyScalar(0.95);
      } else {
        // Stop the velocity completely if it's too small
        velocityRef.current.set(0, 0);
      }

      controls.update(); // Update controls with new angles
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      gui.destroy();
    };
  }, []);

  return <div id="three-scene" style={{ width: '100%', height: '100%' }} />;
});

export default ThreeScene;
