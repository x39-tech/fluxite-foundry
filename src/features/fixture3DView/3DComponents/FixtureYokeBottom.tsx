export default function FixtureYokeBottom(
  props: JSX.IntrinsicElements["mesh"]
) {
  return (
    <mesh {...props}>
      <boxGeometry args={[2.5, 0.5, 1]} />
      <meshPhongMaterial color={0x202020} />
    </mesh>
  );
}
