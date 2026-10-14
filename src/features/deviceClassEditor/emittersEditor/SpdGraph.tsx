import { useId } from "react";
import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Spd } from "app/persistentState";
import { spdSampleCount, wavelengthAt } from "./spd";

const GRAPH_LABEL = msg({
  id: "deviceClassEditor.emitters.spdGraph.label",
  message:
    "Spectral power distribution, {curves} curves from {start} to {end} nanometres.",
});

// The drawing is laid out in viewBox units and scaled to whatever width it is
// given, so these are fixed.
const WIDTH = 640;
const HEIGHT = 240;
const PADDING = { top: 8, right: 8, bottom: 24, left: 36 };

const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

interface Props {
  spd: Spd;
}

export const SpdGraph = ({ spd }: Props) => {
  const { _ } = useLingui();
  const gradientId = useId();

  const sampleCount = spdSampleCount(spd);
  if (sampleCount === undefined || sampleCount < 2) {
    return null;
  }

  const startNm = spd.start;
  const endNm = wavelengthAt(spd, sampleCount - 1);

  // Curves are normalised to a peak of 1.0, but a deviation can reach above it.
  const ceiling = Math.max(
    1,
    ...spd.mappings.flatMap((mapping) => [
      ...(mapping.deviationPlus ?? []).map(
        (deviation, index) =>
          (mapping.powerDistribution[index] ?? 0) + deviation,
      ),
      ...mapping.powerDistribution,
    ]),
  );

  const x = (index: number) =>
    PADDING.left + (index / (sampleCount - 1)) * PLOT_WIDTH;
  const y = (power: number) =>
    PADDING.top + PLOT_HEIGHT - (power / ceiling) * PLOT_HEIGHT;

  // The curve measured at the highest parameter value is the fullest output,
  // so it is the one the spectrum is painted under.
  const filled = spd.mappings.reduce((highest, mapping) =>
    mapping.value > highest.value ? mapping : highest,
  );

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label={_({
          ...GRAPH_LABEL,
          values: {
            curves: spd.mappings.length,
            start: startNm,
            end: endNm,
          },
        })}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            {gradientStops(startNm, endNm).map((stop) => (
              <stop
                key={stop.offset}
                offset={`${stop.offset * 100}%`}
                stopColor={stop.color}
              />
            ))}
          </linearGradient>
        </defs>

        <Axes />

        <path
          d={areaPath(filled.powerDistribution, x, y)}
          fill={`url(#${gradientId})`}
          fillOpacity={0.45}
        />

        {spd.mappings.map((mapping, index) =>
          mapping.deviationPlus || mapping.deviationMinus ? (
            <path
              key={`deviation-${index}`}
              d={deviationPath(mapping, x, y)}
              className="fill-foreground/15"
            />
          ) : null,
        )}

        {spd.mappings.map((mapping, index) => (
          <path
            key={`curve-${index}`}
            d={linePath(mapping.powerDistribution, x, y)}
            fill="none"
            className="stroke-foreground"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        ))}

        <text
          x={PADDING.left}
          y={HEIGHT - 6}
          className="fill-muted-foreground"
          fontSize={11}
        >
          {startNm}
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - 6}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize={11}
        >
          {endNm}
        </text>
        <text
          x={PADDING.left - 6}
          y={PADDING.top + 10}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize={11}
        >
          {ceiling === 1 ? "1.0" : ceiling.toFixed(1)}
        </text>
        <text
          x={PADDING.left - 6}
          y={PADDING.top + PLOT_HEIGHT}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize={11}
        >
          0
        </text>
      </svg>
      <SpdGraphTable spd={spd} sampleCount={sampleCount} />
    </div>
  );
};

const Axes = () => (
  <g className="stroke-border" strokeWidth={1}>
    <line
      x1={PADDING.left}
      y1={PADDING.top}
      x2={PADDING.left}
      y2={PADDING.top + PLOT_HEIGHT}
    />
    <line
      x1={PADDING.left}
      y1={PADDING.top + PLOT_HEIGHT}
      x2={PADDING.left + PLOT_WIDTH}
      y2={PADDING.top + PLOT_HEIGHT}
    />
  </g>
);

interface TableProps {
  spd: Spd;
  sampleCount: number;
}

/**
 * The same information the drawing carries, as text.
 *
 * A row per sample would run to hundreds of cells, so each curve is summarised:
 * where it peaks is what the shape of an emitter's spectrum is read for.
 */
const SpdGraphTable = ({ spd, sampleCount }: TableProps) => (
  <table className="sr-only">
    <caption>
      <Trans id="deviceClassEditor.emitters.spdGraph.tableCaption">
        Spectral power distribution curves
      </Trans>
    </caption>
    <thead>
      <tr>
        <th>
          <Trans id="deviceClassEditor.emitters.spdGraph.columnValue">
            Parameter value
          </Trans>
        </th>
        <th>
          <Trans id="deviceClassEditor.emitters.spdGraph.columnRange">
            Wavelength range
          </Trans>
        </th>
        <th>
          <Trans id="deviceClassEditor.emitters.spdGraph.columnSamples">
            Samples
          </Trans>
        </th>
        <th>
          <Trans id="deviceClassEditor.emitters.spdGraph.columnPeak">
            Peak wavelength
          </Trans>
        </th>
      </tr>
    </thead>
    <tbody>
      {spd.mappings.map((mapping, index) => {
        const startNm = spd.start;
        const endNm = wavelengthAt(spd, sampleCount - 1);
        const peakNm = wavelengthAt(spd, peakIndex(mapping.powerDistribution));

        return (
          <tr key={index}>
            <td>{mapping.value}</td>
            <td>
              <Trans id="deviceClassEditor.emitters.spdGraph.nmRange">
                {startNm} to {endNm} nm
              </Trans>
            </td>
            <td>{mapping.powerDistribution.length}</td>
            <td>
              <Trans id="deviceClassEditor.emitters.spdGraph.nm">
                {peakNm} nm
              </Trans>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

type Scale = (value: number) => number;

function peakIndex(samples: number[]): number {
  let best = 0;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i] > samples[best]) best = i;
  }
  return best;
}

type PathCommand = "M" | "L";

function point(command: PathCommand, pointX: number, pointY: number): string {
  return `${command}${pointX.toFixed(2)},${pointY.toFixed(2)}`;
}

function linePath(samples: number[], x: Scale, y: Scale): string {
  return samples
    .map((power, index) => point(index === 0 ? "M" : "L", x(index), y(power)))
    .join(" ");
}

function areaPath(samples: number[], x: Scale, y: Scale): string {
  const baseline = y(0);
  return [
    linePath(samples, x, y),
    point("L", x(samples.length - 1), baseline),
    point("L", x(0), baseline),
    CLOSE_PATH,
  ].join(" ");
}

const CLOSE_PATH = "Z";

interface DeviationMapping {
  powerDistribution: number[];
  deviationPlus?: number[];
  deviationMinus?: number[];
}

// The band between the curve plus its upper deviation and minus its lower one.
// A missing deviation array falls back to the curve itself, so the band closes
// against it rather than against zero.
function deviationPath(mapping: DeviationMapping, x: Scale, y: Scale): string {
  const upper = mapping.powerDistribution.map(
    (power, index) => power + (mapping.deviationPlus?.[index] ?? 0),
  );
  const lower = mapping.powerDistribution.map((power, index) =>
    Math.max(0, power - (mapping.deviationMinus?.[index] ?? 0)),
  );

  const backward = lower
    .map((power, index) => point("L", x(index), y(power)))
    .reverse()
    .join(" ");

  return [linePath(upper, x, y), backward, CLOSE_PATH].join(" ");
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

// A stop every 5nm is finer than the gradient needs but keeps the sharp turns
// around 490nm and 580nm from being smoothed away.
const STOP_STEP_NM = 5;

function gradientStops(
  startNm: number,
  endNm: number,
): { offset: number; color: string }[] {
  const span = endNm - startNm;
  if (span <= 0) {
    return [{ offset: 0, color: wavelengthColor(startNm) }];
  }

  const stops: { offset: number; color: string }[] = [];
  for (let nm = startNm; nm < endNm; nm += STOP_STEP_NM) {
    stops.push({ offset: (nm - startNm) / span, color: wavelengthColor(nm) });
  }
  stops.push({ offset: 1, color: wavelengthColor(endNm) });
  return stops;
}

/**
 * An approximate sRGB rendering of a single wavelength.
 *
 * This is Dan Bruton's piecewise approximation, the usual one for spectrum
 * diagrams. It is illustrative, not colorimetric: nothing reads a value back
 * off it.
 */
export function wavelengthColor(nm: number): string {
  let r = 0;
  let g = 0;
  let b = 0;

  if (nm >= 380 && nm < 440) {
    r = -(nm - 440) / (440 - 380);
    b = 1;
  } else if (nm < 490) {
    g = (nm - 440) / (490 - 440);
    b = 1;
  } else if (nm < 510) {
    g = 1;
    b = -(nm - 510) / (510 - 490);
  } else if (nm < 580) {
    r = (nm - 510) / (580 - 510);
    g = 1;
  } else if (nm < 645) {
    r = 1;
    g = -(nm - 645) / (645 - 580);
  } else if (nm <= 780) {
    r = 1;
  }

  // The eye's response falls away at both ends of the visible range.
  let intensity = 1;
  if (nm >= 380 && nm < 420) {
    intensity = 0.3 + (0.7 * (nm - 380)) / (420 - 380);
  } else if (nm > 700 && nm <= 780) {
    intensity = 0.3 + (0.7 * (780 - nm)) / (780 - 700);
  } else if (nm < 380 || nm > 780) {
    intensity = 0;
  }

  const channel = (value: number) =>
    Math.round(255 * Math.pow(Math.max(0, value) * intensity, 0.8));

  return `rgb(${channel(r)}, ${channel(g)}, ${channel(b)})`;
}
