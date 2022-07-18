import { useRef } from "react";
import {
  ReactThreeFiber,
  Canvas,
  extend,
  useFrame,
  useThree,
} from "@react-three/fiber";
import "./Fixture3DView.css";
import FixtureBase from "./3DComponents/FixtureBase";
import FixtureYoke from "./3DComponents/FixtureYoke";
import FixtureWashHead from "./3DComponents/FixtureWashHead";
import { OrbitControls } from "three-stdlib";

extend({ OrbitControls });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      orbitControls: ReactThreeFiber.Object3DNode<
        OrbitControls,
        typeof OrbitControls
      >;
    }
  }
}

function CameraControls() {
  // Get a reference to the Three.js Camera, and the canvas html element.
  // We need these to setup the OrbitControls component.
  // https://threejs.org/docs/#examples/en/controls/OrbitControls
  const {
    camera,
    gl: { domElement },
  } = useThree();
  // Ref to the controls, so that we can update them on every frame using useFrame
  const controls = useRef<OrbitControls>(null);
  useFrame((state) => controls.current!.update());
  return <orbitControls ref={controls} args={[camera, domElement]} />;
}

export function Fixture3DView() {
  return (
    <div className="fixture-3d-view">
      <Canvas camera={{ position: [5, 5, 5] }}>
        <CameraControls />
        <ambientLight />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <directionalLight position={[-5, 5, 5]} intensity={1} />
        <FixtureBase position={[0, 0, 0]} />
        <FixtureYoke position={[0, 1, 0]} />
        <FixtureWashHead position={[0, 3, 0]} rotation={[Math.PI, 0, 0]} />
      </Canvas>
    </div>
  );
}
