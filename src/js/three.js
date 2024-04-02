import * as THREE from 'three';
// eslint-disable-next-line import/no-unresolved
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import fragment from '../shaders/fragment.glsl';
import vertex from '../shaders/vertex.glsl';

const device = {
  width: window.innerWidth,
  height: window.innerHeight-1,
  pixelRatio: window.devicePixelRatio
};

export default class Three {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      device.width / device.height,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 4);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));
    this.renderer.shadowMap.enabled = true; // enable shadows in the renderer

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true; // default is false
    this.controls.dampingFactor = 0.025; // This value could be adjusted to your liking
    this.controls.minPolarAngle = 0; // radians
    this.controls.maxPolarAngle = Math.PI / 2; // radians

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setLights();
    this.setGeometry();
    this.LoadGLTFModel()
    this.render();
    this.setResize();
  }

  setLights() {
    const shadowQualityMultiplier = 4;
    /* this.ambientLight = new THREE.AmbientLight(new THREE.Color(1, 1, 1, 1));
    this.scene.add(this.ambientLight); */

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1); // white color, full intensity
    this.sunLight.position.set(15, 50, 30);
    this.sunLight.castShadow = true;

    // Increase the shadow map size
    this.sunLight.shadow.mapSize.width = 1024 * shadowQualityMultiplier; // default is 512
    this.sunLight.shadow.mapSize.height = 1024 * shadowQualityMultiplier; // default is 512

    // Adjust the shadow camera (optional)
    this.sunLight.shadow.camera.near = 0.5; // default
    this.sunLight.shadow.camera.far = 500; // default
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // soft white light
    this.scene.add(this.ambientLight);
  }

  setGeometry() {
    /* this.sphereGeometry = new THREE.SphereGeometry(1, 128, 128);
    this.sphereMaterial = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      wireframe: true,
      fragmentShader: fragment,
      vertexShader: vertex,
      uniforms: {
        progress: { type: 'f', value: 0 }
      }
    });
    this.sphereMesh = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
    this.scene.add(this.sphereMesh); */

    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.boxMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffffff });
    this.boxMesh = new THREE.Mesh(this.boxGeometry, this.boxMaterial);
    this.boxMesh.castShadow = true; // enable shadow casting
    this.boxMesh.position.set(-1, 0, 0);
    this.scene.add(this.boxMesh);

    this.planeGeometry = new THREE.PlaneGeometry(10000, 10000);
    this.planeMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffffff });
    this.planeMesh = new THREE.Mesh(this.planeGeometry, this.planeMaterial);
    this.planeMesh.receiveShadow = true; // enable shadow receiving
    this.planeMesh.position.y = -0.5; // Set the plane at the bottom of the scene
    this.planeMesh.rotation.x = -Math.PI / 2; // Rotate the plane to be horizontal
    this.scene.add(this.planeMesh);

    // Create a white material
    const skyboxMaterial = new THREE.MeshPhysicalMaterial({
      emissive: 0xffffff, // white color
      side: THREE.BackSide, // backside to make it visible from inside the cube
      reflectivity: 0, // no reflectivity
      clearcoat: 0, // no clearcoat
      roughness: 1, // maximum roughness
      metalness: 0 // no metalness
    });
    const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    this.scene.add(skybox);
  }

  LoadGLTFModel() {
    this.loader = new GLTFLoader();
    this.loader.load(
      'public/assets/gltf/bunny.gltf',
      (gltf) => {
        // Adjust the model position
        gltf.scene.position.set(1, -0.5, 0); // Adjust these values as needed

        // Override the material and make the model cast shadows
        gltf.scene.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.material = new THREE.MeshPhysicalMaterial({ color: 0xffffff });
            node.castShadow = true;
          }
        });

        // Add the model to the scene
        this.scene.add(gltf.scene);
      },
      undefined,
      (error) => console.error(error)
    );
  }

  render() {
    const elapsedTime = this.clock.getElapsedTime();

    // this.boxMesh.rotation.x = 0.2 * elapsedTime;
    // this.boxMesh.rotation.y = 0.1 * elapsedTime;

    this.controls.update();

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.render.bind(this));
  }

  setResize() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    device.width = window.innerWidth;
    device.height = window.innerHeight-1;

    this.camera.aspect = device.width / device.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));
  }
}
