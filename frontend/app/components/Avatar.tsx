/**
 * Avatar Component
 * Displays animated 3D doctor avatar with lip-sync
 */
"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useLipSync } from "../hooks/useLipSync";

interface AvatarProps {
  isSpeaking?: boolean;
  audioUrl?: string;
  background?: string;
}

export default function Avatar({ isSpeaking = false, audioUrl, background }: AvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const modelRef = useRef<THREE.Group | null>(null);
  const animationActionRef = useRef<THREE.AnimationAction | null>(null);
  
  // Lip sync
  const mouthValue = useLipSync(isSpeaking && audioUrl ? audioUrl : null);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !isMounted) return;

    initializeAvatar();

    return () => {
      cleanup();
    };
  }, [isMounted]);

  // Handle lip sync mouth animation
  useEffect(() => {
    if (!modelRef.current) return;

    // Find mouth bone or mesh to animate
    // This is a simple approach - scale the jaw/mouth based on audio
    modelRef.current.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Bone) {
        // Look for jaw or mouth bone
        if (child.name.toLowerCase().includes("jaw") || 
            child.name.toLowerCase().includes("mouth")) {
          // Animate jaw rotation based on mouth value
          child.rotation.x = -mouthValue * 0.3; // Open mouth
        }
      }
    });
  }, [mouthValue]);

  const initializeAvatar = async () => {
    if (!containerRef.current) return;

    try {
      // Create scene
      const scene = new THREE.Scene();
      // scene.background = new THREE.Color(0xefe7ff); // Removed for transparency
      sceneRef.current = scene;

      // Create camera - positioned to show from chest up
      const camera = new THREE.PerspectiveCamera(
        40, // Slightly tighter FOV for portrait framing
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        100
      );
      camera.position.set(0, 1.4, 1.8); // Closer and slightly lower
      camera.lookAt(0, 1.3, 0); // Look at upper chest/neck area
      cameraRef.current = camera;

      // Create renderer
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true 
      });
      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1; // Slightly brighter for minimal look
      renderer.shadowMap.enabled = false; // Disabled for softer appearance
      rendererRef.current = renderer;
      containerRef.current.appendChild(renderer.domElement);

      // Lighting setup - soft minimal lighting
      // Soft ambient base
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      // Key light - soft from front-top-left
      const keyLight = new THREE.DirectionalLight(0xfff5f0, 1.2);
      keyLight.position.set(3, 4, 3);
      keyLight.castShadow = false; // Disable shadows for softer look
      scene.add(keyLight);

      // Fill light - gentle from right
      const fillLight = new THREE.DirectionalLight(0xe8f4ff, 0.4);
      fillLight.position.set(-2, 2, 2);
      scene.add(fillLight);

      // Rim light - subtle back highlight
      const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
      rimLight.position.set(0, 3, -3);
      scene.add(rimLight);

      // Load model with timeout and logging
      const loader = new GLTFLoader();
      console.log("Avatar: starting model load /models/avatar.glb");
      const timeoutMs = 15000; // 15s
      const loadPromise = loader.loadAsync("/models/avatar.glb");
      const gltf = await Promise.race([
        loadPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Model load timeout")), timeoutMs)
        ),
      ]);
      console.log("Avatar: model loaded", gltf);
      
      const model = gltf.scene;
      modelRef.current = model;
      
      // Center and scale model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      model.position.x = -center.x;
      model.position.y = -box.min.y;
      model.position.z = -center.z;
      
      // Scale to fit
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.8 / maxDim;
      model.scale.setScalar(scale);
      
      scene.add(model);

      // Setup animations
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        mixerRef.current = mixer;
        
        // Play the first animation (mixamo.com)
        const action = mixer.clipAction(gltf.animations[0]);
        action.play();
        animationActionRef.current = action;
      }

      // Configure materials for better appearance
      model.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          if (child.material) {
            // Ensure proper texture encoding
            if (child.material.map) {
              child.material.map.colorSpace = THREE.SRGBColorSpace;
            }
            
            // Set material properties for nice rendering
            if (child.material instanceof THREE.MeshStandardMaterial) {
              child.material.roughness = 0.6;
              child.material.metalness = 0.0;
            }
          }
        }
      });

      setIsLoaded(true);

      // Start animation loop
      animate();

      // Handle window resize
      const handleResize = () => {
        if (!containerRef.current || !camera || !renderer) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };
      
      window.addEventListener("resize", handleResize);
      
      // Store cleanup function
      return () => {
        window.removeEventListener("resize", handleResize);
      };
      
    } catch (err) {
      const message = (err instanceof Error) ? err.message : String(err);
      console.error("Error loading avatar:", message);
      setError(message);
      setIsLoaded(false);
    }
  };

  const animate = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    requestAnimationFrame(animate);

    // Update animation mixer
    if (mixerRef.current) {
      const delta = clockRef.current.getDelta();
      mixerRef.current.update(delta);
    }

    // Render scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  };

  const cleanup = () => {
    // Stop animations
    if (animationActionRef.current) {
      animationActionRef.current.stop();
    }

    // Dispose renderer
    if (rendererRef.current) {
      rendererRef.current.dispose();
      if (containerRef.current && rendererRef.current.domElement) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    }

    // Dispose geometries and materials
    if (sceneRef.current) {
      sceneRef.current.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material: THREE.Material) => material.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div 
          ref={containerRef}
          className={`aspect-square bg-gradient-to-br ${background || "from-purple-50 to-purple-100"} rounded-lg overflow-hidden`}
          style={{ position: "relative" }}
        >
        {isMounted && !isLoaded && !error && (
          <div className="flex items-center justify-center h-full absolute inset-0">
            <p className="text-gray-600">Loading avatar...</p>
          </div>
        )}

        {isMounted && error && (
          <div className="flex items-center justify-center h-full absolute inset-0">
            <p className="text-red-600">Failed to load avatar: {error}</p>
          </div>
        )}

        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="absolute bottom-4 right-4 z-10">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-75" />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-150" />
            </div>
          </div>
        )}
      </div>

      {/* Removed Dr. AI Assistant text as per user request */}
      </div>

  );
}
