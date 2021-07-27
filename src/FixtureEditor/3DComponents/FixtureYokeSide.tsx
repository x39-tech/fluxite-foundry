export default function FixtureYokeSide(props: JSX.IntrinsicElements["mesh"]) {
  return (
    <mesh {...props}>
      <boxGeometry args={[0.5, 2, 1]} />
      <meshPhongMaterial color={0x202020} />
    </mesh>
  );
}
