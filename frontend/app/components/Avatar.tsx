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
  avatarId?: string;
  onLoad?: () => void;
  fullscreen?: boolean;
}

export default function Avatar({ isSpeaking = false, audioUrl, background, avatarId = "doctorm", onLoad, fullscreen = false }: AvatarProps) {
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
  const idleActionRef = useRef<THREE.AnimationAction | null>(null);
  const talkActionsRef = useRef<THREE.AnimationAction[]>([]);
  const jawBoneRef = useRef<THREE.Bone | null>(null);
  const jawInitialYRef = useRef<number | null>(null);
  const jawCloseOffsetRef = useRef<number>(0.005); // tweak to nudge jaw closed
  
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
  }, [isMounted, avatarId]);

  // Cache jaw bone after model loads
  useEffect(() => {
    if (!modelRef.current || jawBoneRef.current) return;

    modelRef.current.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Bone) {
        if (child.name.toLowerCase().includes("jaw")) {
          jawBoneRef.current = child;
          // Cache initial jaw position so we can apply relative offsets
          jawInitialYRef.current = child.position.y;
          console.log("Avatar: Found jaw bone:", child.name, "initialY=", jawInitialYRef.current);
        }
      }
    });
  }, [isLoaded]);

  // Jaw animation start time
  const jawStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (jawBoneRef.current) {
      jawStartTimeRef.current = Date.now();
      console.log("Avatar: Jaw animation ready");
    }
  }, [isLoaded]);

  // Switch between idle and talk animations based on isSpeaking
  useEffect(() => {
    if (!mixerRef.current || !idleActionRef.current || talkActionsRef.current.length === 0) return;

    if (isSpeaking) {
      // Pick random talk animation
      const randomIndex = Math.floor(Math.random() * talkActionsRef.current.length);
      const talkAction = talkActionsRef.current[randomIndex];
      
      // Crossfade from idle to talk
      idleActionRef.current.fadeOut(0.3);
      talkAction.reset().fadeIn(0.3).play();
      animationActionRef.current = talkAction;
      console.log("Avatar: Switching to talk animation", randomIndex + 1);
    } else {
      // Fade back to idle
      if (animationActionRef.current && animationActionRef.current !== idleActionRef.current) {
        animationActionRef.current.fadeOut(0.3);
      }
      idleActionRef.current.reset().fadeIn(0.3).play();
      animationActionRef.current = idleActionRef.current;
      console.log("Avatar: Switching back to idle animation");
    }
  }, [isSpeaking]);

  const initializeAvatar = async () => {
    if (!containerRef.current) return;

    try {
      // Create scene
      const scene = new THREE.Scene();
      // scene.background = new THREE.Color(0xefe7ff); // Removed for transparency
      sceneRef.current = scene;

      // Create camera - positioned based on fullscreen mode
      const camera = new THREE.PerspectiveCamera(
        fullscreen ? 45 : 40, // Wider FOV for fullscreen
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        100
      );
      if (fullscreen) {
        camera.position.set(0, 2, 1.2); // Much lower so entire head is visible
        camera.lookAt(0, 2, 0); // Look at upper chest area
      } else {
        camera.position.set(0, 1.4, 1.8); // Normal distance for setup
        camera.lookAt(0, 1.3, 0); // Look at upper chest/neck area
      }
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
      // Map avatarId to model file
      const modelMap: Record<string, string> = {
        "doctorm": "/models/DoctorM.glb",
        "doctorf": "/models/DoctorF.glb",
        "joe": "/models/DoctorM.glb", // fallback
        "mark": "/models/DoctorM.glb",
        "sasha": "/models/DoctorF.glb"
      };
      const modelPath = modelMap[avatarId.toLowerCase()] || "/models/DoctorM.glb";
      console.log("Avatar: starting model load", modelPath);
      const timeoutMs = 15000; // 15s
      const loadPromise = loader.loadAsync(modelPath);
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
      
      // Scale based on fullscreen mode
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = fullscreen ? 2.2 / maxDim : 1.8 / maxDim;
      model.scale.setScalar(scale);
      
      scene.add(model);

      // Setup animations
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        mixerRef.current = mixer;
        
        console.log("Avatar: Available animations:", gltf.animations.map((a: THREE.AnimationClip) => a.name));
        
        // Find and play DoctorM Idle animation
        const idleClip = gltf.animations.find((clip: THREE.AnimationClip) => 
          clip.name.toLowerCase().includes("idle")
        );
        
        if (idleClip) {
          const action = mixer.clipAction(idleClip);
          action.play();
          animationActionRef.current = action;
          console.log("Avatar: Playing animation:", idleClip.name);
        } else {
          // Fallback to first animation
          const action = mixer.clipAction(gltf.animations[0]);
          action.play();
          animationActionRef.current = action;
          console.log("Avatar: Playing first animation:", gltf.animations[0].name);
        }
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
              
              // Force opaque rendering - disable transparency
              child.material.transparent = false;
              child.material.opacity = 1.0;
              child.material.alphaTest = 0;
              child.material.depthWrite = true;
              child.material.side = THREE.FrontSide;
              
              // If there's an alpha map, remove it
              if (child.material.alphaMap) {
                child.material.alphaMap = null;
              }
              
              child.material.needsUpdate = true;
            }
          }
        }
      });

      setIsLoaded(true);
      
      // Notify parent that avatar is loaded
      onLoad?.();

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

    // Apply jaw animation ONLY when speaking
    if (jawBoneRef.current && isSpeaking) {
      const elapsed = (Date.now() - jawStartTimeRef.current) / 1000;
      
      // Speech frequency and amplitude
      const frequency = 2.8; // realistic speech syllable rate
      const baseAmplitude = 0.025;
      
      // Vary amplitude slightly over time (different syllable intensities)
      const modulator = 0.7 + 0.3 * Math.sin(elapsed * 1.2 * Math.PI * 2);
      
      // Primary jaw open/close cycle
      const value = Math.sin(elapsed * frequency * Math.PI * 2);
      const t = (value + 1) / 2;
      const smoothed = t * t * (3 - 2 * t); // smoothstep
      
      // Compute final open amount with modulation (no envelope needed)
      const openAmount = smoothed * baseAmplitude * modulator;
      
      // Base position
      const baseY = jawInitialYRef.current ?? 0;
      const closeOffset = jawCloseOffsetRef.current;
      
      // Apply vertical movement
      jawBoneRef.current.position.y = baseY + closeOffset - openAmount;
      
      // Add subtle scaling for more natural deformation
      // Scale slightly in X/Z when mouth opens (jaw widens a tiny bit)
      const scaleAmount = 1.0 + openAmount * 0.3; // very subtle
      jawBoneRef.current.scale.set(scaleAmount, 1.0, scaleAmount);
    } else if (jawBoneRef.current && !isSpeaking) {
      // Reset jaw to closed position when not speaking
      const baseY = jawInitialYRef.current ?? 0;
      const closeOffset = jawCloseOffsetRef.current;
      jawBoneRef.current.position.y = baseY + closeOffset;
      jawBoneRef.current.scale.set(1.0, 1.0, 1.0);
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
          className={fullscreen 
            ? `fixed inset-0 bg-gradient-to-br ${background || "from-purple-50 to-purple-100"} overflow-hidden`
            : `aspect-square bg-gradient-to-br ${background || "from-purple-50 to-purple-100"} rounded-lg overflow-hidden`
          }
          style={fullscreen ? { width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0 } : { position: "relative" }}
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

        {/* Debug button removed */}
      </div>

      {/* Removed Dr. AI Assistant text as per user request */}
      </div>

  );
}
