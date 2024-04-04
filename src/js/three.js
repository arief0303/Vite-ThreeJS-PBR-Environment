import * as THREE from 'three';
// eslint-disable-next-line import/no-unresolved
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fragment_basic from '../shaders/fragment_basic.glsl';
import vertex_basic from '../shaders/vertex_basic.glsl';
import * as dat from 'dat.gui';

const device = {
  width: window.innerWidth,
  height: window.innerHeight - 1, //-1 to avoid scrollbars
  pixelRatio: window.devicePixelRatio
};

const modelUrl = 'assets/gltf/bunny.gltf';
const albedoMap = new THREE.TextureLoader().load('assets/textures/Albedo.jpg');

export default class Three {
  constructor(canvas) {
    this.canvas = document.querySelector('#canvas');

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xffffff, 0, 45);

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
    this.renderer.shadowMap.enabled = true; // enable shadows in the renderer
    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true; // default is false
    this.controls.dampingFactor = 0.025; // This value could be adjusted to your liking
    this.controls.minPolarAngle = 0; // radians
    this.controls.maxPolarAngle = Math.PI / 2; // radians
    this.controls.minDistance = 3; // Minimum distance the camera can zoom in
    this.controls.maxDistance = 10; // Maximum distance the camera can zoom out
    this.controls.enablePan = false; // Disable panning
    // this.controls.enableZoom = false; // Disable zooming with scroll wheel

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setLights();
    this.setGeometry();
    this.loadGLTFModel();
    this.devGUIParams();
    this.render();
    this.raycasterListener();
    this.setResize();
  }

  setLights() {
    const shadowQualityMultiplier = 4;

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1); // white color, full intensity
    this.sunLight.position.set(15, 50, 30);
    this.sunLight.castShadow = true;

    // Increase the shadow map size
    this.sunLight.shadow.mapSize.width = 1024 * shadowQualityMultiplier; // default is 512
    this.sunLight.shadow.mapSize.height = 1024 * shadowQualityMultiplier; // default is 512

    // Adjust the shadow bias and radius (optional)
    this.sunLight.shadow.radius = 30; // Adjust this value as needed

    // Adjust the shadow camera (optional)
    this.sunLight.shadow.camera.near = 0.5; // default
    this.sunLight.shadow.camera.far = 500; // default
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // soft white light
    this.scene.add(this.ambientLight);
  }

  setGeometry() {
    this.planeGeometry = new THREE.PlaneGeometry(1, 1, 128 / 8, 128 / 8);
    this.planeMaterial = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      wireframe: true,
      fragmentShader: fragment_basic,
      vertexShader: vertex_basic,
      uniforms: {
        progress: { type: 'f', value: 0 }
      }
    });
    this.planeMesh = new THREE.Mesh(this.planeGeometry, this.planeMaterial);
    this.planeMesh.position.set(0, 0.5, 2);
    this.planeMesh.castShadow = true;
    this.scene.add(this.planeMesh);

    this.earthGeometry = new THREE.SphereGeometry(0.75, 128, 128);
    this.earthMaterial = new THREE.MeshStandardMaterial({
      map: albedoMap
    });
    this.earthMesh = new THREE.Mesh(this.earthGeometry, this.earthMaterial);
    this.earthMesh.castShadow = true;
    this.earthMesh.position.set(-1, 1.5, 0);
    this.scene.add(this.earthMesh);

    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.boxMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffffff });
    this.boxMesh = new THREE.Mesh(this.boxGeometry, this.boxMaterial);
    this.boxMesh.castShadow = true; // enable shadow casting
    this.boxMesh.position.set(-1, 0, 0);
    this.scene.add(this.boxMesh);

    this.floorGeometry = new THREE.PlaneGeometry(10000, 10000);
    this.floorMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffffff });
    this.floorMesh = new THREE.Mesh(this.floorGeometry, this.floorMaterial);
    this.floorMesh.receiveShadow = true; // enable shadow receiving
    this.floorMesh.position.y = -0.5; // Set the plane at the bottom of the scene
    this.floorMesh.rotation.x = -Math.PI / 2; // Rotate the plane to be horizontal
    this.scene.add(this.floorMesh);

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

  showLoadingIndicator() {
    // Create and show the loading indicator
    this.loadingIndicator = document.createElement('div');
    this.loadingIndicator.textContent = 'Loading...';

    // Set the CSS properties to make the loading indicator a full-screen modal
    this.loadingIndicator.style.position = 'fixed';
    this.loadingIndicator.style.top = '0';
    this.loadingIndicator.style.left = '0';
    this.loadingIndicator.style.width = '100%';
    this.loadingIndicator.style.height = '100%';
    this.loadingIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent black
    this.loadingIndicator.style.color = 'white'; // White text
    this.loadingIndicator.style.display = 'flex';
    this.loadingIndicator.style.justifyContent = 'center';
    this.loadingIndicator.style.alignItems = 'center';
    this.loadingIndicator.style.zIndex = '9999'; // Maximum z-index

    document.body.appendChild(this.loadingIndicator);
  }

  updateLoadingIndicator(percentage) {
    // Update the loading indicator with the current loading percentage
    // This will depend on how you want to implement the loading indicator
    this.loadingIndicator.textContent =
      'Loading: ' + percentage.toFixed(2) + '%';
  }

  hideLoadingIndicator() {
    // Add the 'fade-out' class to the loading indicator
    this.loadingIndicator.classList.add('fade-out');

    // Wait for the transition to finish before removing the loading indicator
    setTimeout(() => {
      document.body.removeChild(this.loadingIndicator);
    }, 1000); // The timeout should be the same as the transition duration
  }

  loadGLTFModel() {
    const loadingManager = new THREE.LoadingManager();

    // Show the loading indicator when the loading starts
    loadingManager.onStart = () => {
      this.showLoadingIndicator();
    };

    // Update the loading indicator when the loading progress changes
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      this.updateLoadingIndicator((itemsLoaded / itemsTotal) * 100);
    };

    // Hide the loading indicator when the loading finishes
    loadingManager.onLoad = () => {
      setTimeout(() => {
        this.hideLoadingIndicator();
        this.render();
      }, 1000); // Delay of 1 sec
    };

    // Show an error message when the loading fails
    loadingManager.onError = (url) => {
      console.error('There was an error loading ' + url);
    };

    this.loader = new GLTFLoader(loadingManager);
    this.loader.load(
      modelUrl,
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

  devGUIParams() {
    this.gui = new dat.GUI();
    const sunLightFolder = this.gui.addFolder('Sun Light');
    sunLightFolder
      .add(this.sunLight.shadow, 'radius', 0, 100)
      .step(0.1)
      .name('Radius');
    sunLightFolder.open();
    const fogFolder = this.gui.addFolder('Fog');
    fogFolder.add(this.scene.fog, 'far', 5, 250).step(1).name('Far');
    fogFolder.open();
  }

  raycasterListener() {
    this.canvas.addEventListener(
      'click',
      this.onMouseClickAddMarker.bind(this),
      false
    );
    this.canvas.addEventListener(
      'touchstart',
      this.onMouseClickAddMarker.bind(this),
      false
    );
}

  onMouseClickAddMarker(event) {
    event.preventDefault();

    // Check if event is a touch event
    if (event.changedTouches) {
      event.clientX = event.changedTouches[0].clientX;
      event.clientY = event.changedTouches[0].clientY;
    }

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects([this.earthMesh]);

    if (intersects.length > 0) {
      const markerGeometry = new THREE.SphereGeometry(0.05, 32, 32);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);

      // Convert the intersection point to the earthMesh's local coordinate system
      marker.position.copy(
        this.earthMesh.worldToLocal(intersects[0].point.clone())
      );

      // Add the marker as a child of the earthMesh
      this.earthMesh.add(marker);
    }
  }

  render() {
    const elapsedTime = this.clock.getElapsedTime();

    this.planeMesh.rotation.x = 0.2 * elapsedTime;
    this.planeMesh.rotation.y = 0.1 * elapsedTime;

    this.earthMesh.rotation.y = 0.1 * elapsedTime;

    this.controls.update();

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.render.bind(this));
  }

  setResize() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    device.width = window.innerWidth;
    device.height = window.innerHeight - 1; //-1 to avoid scrollbars

    this.camera.aspect = device.width / device.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(device.width, device.height);
    this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2));
  }
}
