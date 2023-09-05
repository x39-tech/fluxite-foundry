import FixtureYokeBottom from "./FixtureYokeBottom";
import FixtureYokeSide from "./FixtureYokeSide";
import React from "react";
import { ReactThreeFiber } from "@react-three/fiber";

type ThreeNumbers = [number, number, number];

function getSidePosition(
  position: ReactThreeFiber.Vector3,
  xOffset: number,
): ThreeNumbers {
  const sidePosition = (position as ThreeNumbers).slice() as ThreeNumbers;
  sidePosition[0] += xOffset;
  sidePosition[1] += 1;
  return sidePosition;
}

export default function FixtureYoke(props: JSX.IntrinsicElements["mesh"]) {
  return (
    <React.Fragment>
      <FixtureYokeBottom position={props.position} />
      <FixtureYokeSide position={getSidePosition(props.position!, -1)} />
      <FixtureYokeSide position={getSidePosition(props.position!, 1)} />
    </React.Fragment>
  );
}
