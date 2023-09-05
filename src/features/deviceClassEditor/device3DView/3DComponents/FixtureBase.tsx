/* eslint-disable */
export default function FixtureBase(props: JSX.IntrinsicElements["mesh"]) {
  return (
    <mesh {...props}>
      <boxGeometry args={[2.5, 1, 2]} />
      <meshPhongMaterial color={0x202020} />
    </mesh>
  );
}
