import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { Detailed, OrbitControls, Sky } from "@react-three/drei";
import "./App.css";

const EMPTY_FILES = {
  elevation: null,
  color: null,
};

const TERRAIN_SIZE = 128;
const MESH_LOD_SEGMENTS = [4096, 2048, 1024];

const Terrain = ({ maps, displacementScale }) => {
  const [height, colors] = useLoader(THREE.TextureLoader, [maps.elevation, maps.color]);
  const reliefStrength = displacementScale * 1.6;

  return (
    <group position={[0, -3, 0]}>
      <Detailed distances={[0, 70, 140]}>
        {MESH_LOD_SEGMENTS.map((segments) => (
          <mesh key={segments} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[TERRAIN_SIZE, TERRAIN_SIZE, segments, segments]} />
            <meshStandardMaterial
              color="white"
              map={colors}
              metalness={0.08}
              roughness={0.8}
              displacementMap={height}
              displacementScale={reliefStrength}
              bumpMap={height}
              bumpScale={Math.max(0.9, reliefStrength * 0.75)}
              normalScale={new THREE.Vector2(1.5, 1.5)}
            />
          </mesh>
        ))}
      </Detailed>
    </group>
  );
};

export default function App() {
  const [selectedFiles, setSelectedFiles] = useState(EMPTY_FILES);
  const [maps, setMaps] = useState({ elevation: "", color: "" });
  const [displacementScale, setDisplacementScale] = useState(6.5);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    return () => {
      Object.values(maps).forEach((source) => {
        if (source.startsWith("blob:")) URL.revokeObjectURL(source);
      });
    };
  }, [maps]);

  const handleFileChange = (mapType, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFiles((current) => ({ ...current, [mapType]: file }));
    setIsRendered(false);
  };

  const renderUploadedMaps = (event) => {
    event.preventDefault();
    if (!selectedFiles.elevation || !selectedFiles.color) {
      return;
    }

    setMaps((current) => {
      Object.values(current).forEach((source) => {
        if (source.startsWith("blob:")) URL.revokeObjectURL(source);
      });

      return {
        elevation: URL.createObjectURL(selectedFiles.elevation),
        color: URL.createObjectURL(selectedFiles.color),
      };
    });

    setIsRendered(true);
  };

  const requiredFilesSelected = Boolean(selectedFiles.elevation) && Boolean(selectedFiles.color);

  return (
    <main className="app-shell">
      <aside className="control-panel">
        <div className="brand-mark">DEPTH WIZARD / ASCEND</div>
        <div className="intro">
          <p className="eyebrow">IMAGE-BASED ENVIRONMENT</p>
          <h1>Build a world from two maps.</h1>
          <p className="intro-copy">
            Upload an elevation and color map, then render the landscape locally in the browser.
          </p>
        </div>

        <form className="map-form" onSubmit={renderUploadedMaps}>
          <MapInput
            label="Elevation map"
            hint="Grayscale height data"
            mapType="elevation"
            file={selectedFiles.elevation}
            onChange={handleFileChange}
          />
          <MapInput
            label="Color map"
            hint="Surface appearance"
            mapType="color"
            file={selectedFiles.color}
            onChange={handleFileChange}
          />

          <label className="scale-control">
            <span>
              <strong>Relief strength</strong>
              <output>{displacementScale.toFixed(1)}</output>
            </span>
            <input
              type="range"
              min="0"
              max="20"
              step="0.1"
              value={displacementScale}
              onChange={(event) => setDisplacementScale(Number(event.target.value))}
            />
          </label>

          <button className="render-button" type="submit" disabled={!requiredFilesSelected}>
            Render environment <span aria-hidden="true">&#8594;</span>
          </button>
          {!requiredFilesSelected && <p className="form-note">Choose an elevation and a color map to render a new environment.</p>}
        </form>
        <p className="local-note">Maps are processed locally. Nothing is uploaded.</p>
      </aside>

      <section className="viewport" aria-label="Rendered terrain preview">
        {isRendered ? (
          <>
            <Canvas
              camera={{ position: [0, 28, 34], fov: 45, near: 0.1, far: 500 }}
              dpr={[1, 2]}
              gl={{ antialias: true, powerPreference: "high-performance" }}
            >
              <TerrainControls />
              <ambientLight intensity={0.7} />
              <directionalLight intensity={2} position={[7, 12, 5]} />
              <Sky sunPosition={[7, 5, 1]} />
              <Suspense fallback={null}>
                <Terrain maps={maps} displacementScale={displacementScale} />
              </Suspense>
            </Canvas>
            <div className="viewport-label">
              <span className="status-dot" />
              LIVE PREVIEW
            </div>
            <div className="viewport-help">Drag to orbit <span>/</span> Scroll to zoom <span>/</span> Right-drag to pan</div>
          </>
        ) : (
          <div className="empty-state">
            <p>No terrain rendered yet.</p>
            <span>Select an elevation and a color map, then click Render environment.</span>
          </div>
        )}
      </section>
    </main>
  );
}

function TerrainControls() {
  const controls = useRef();

  const clampTarget = () => {
    if (!controls.current) return;

    controls.current.target.y = Math.max(-3, controls.current.target.y);
    controls.current.target.x = THREE.MathUtils.clamp(
      controls.current.target.x,
      -TERRAIN_SIZE / 2,
      TERRAIN_SIZE / 2,
    );
    controls.current.target.z = THREE.MathUtils.clamp(
      controls.current.target.z,
      -TERRAIN_SIZE / 2,
      TERRAIN_SIZE / 2,
    );
  };

  return (
    <OrbitControls
      ref={controls}
      enablePan={true}
      enableRotate={true}
      enableZoom={true}
      minDistance={6}
      maxDistance={170}
      maxPolarAngle={Math.PI / 2.05}
      target={[0, -3, 0]}
      onChange={clampTarget}
    />
  );
}

function MapInput({ label, hint, mapType, file, onChange }) {
  return (
    <label className="map-input">
      <span className="map-input-copy">
        <strong>{label}</strong>
        <small>{file ? file.name : hint}</small>
      </span>
      <span className="choose-file">{file ? "Replace" : "Choose"}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => onChange(mapType, event)} />
    </label>
  );
}
