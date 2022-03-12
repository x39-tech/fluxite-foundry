import * as THREE from "three";

export default function FixtureWashHead(props: JSX.IntrinsicElements["mesh"]) {
  return (
    <mesh {...props}>
      <sphereGeometry args={[0.75, 32, 32, 0, Math.PI, 0, Math.PI]} />
      <meshPhongMaterial color={0x202020} side={THREE.DoubleSide} />
    </mesh>
  );
}
