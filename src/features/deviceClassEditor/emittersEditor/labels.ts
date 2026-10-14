// Display names for the fixed vocabularies of the Emitters structure.

import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { EmitterCommonColor, emitterCommonColors } from "app/persistentState";

export const NO_COMMON_COLOR = msg({
  id: "deviceClassEditor.emitters.commonColor.none",
  message: "None",
});

export const NO_PARAMETER = msg({
  id: "deviceClassEditor.emitters.parameter.none",
  message: "None",
});

/** The colour names of Table 8-10, in the order the table lists them. */
export const COMMON_COLOR_NAMES: {
  color: EmitterCommonColor;
  name: MessageDescriptor;
}[] = [
  {
    color: emitterCommonColors.AMBER,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.amber",
      message: "Amber",
    }),
  },
  {
    color: emitterCommonColors.BLUE,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.blue",
      message: "Blue",
    }),
  },
  {
    color: emitterCommonColors.COOL_WHITE,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.coolWhite",
      message: "Cool White",
    }),
  },
  {
    color: emitterCommonColors.CYAN,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.cyan",
      message: "Cyan",
    }),
  },
  {
    color: emitterCommonColors.DEEP_BLUE,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.deepBlue",
      message: "Deep Blue",
    }),
  },
  {
    color: emitterCommonColors.DEEP_RED,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.deepRed",
      message: "Deep Red",
    }),
  },
  {
    color: emitterCommonColors.GREEN,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.green",
      message: "Green",
    }),
  },
  {
    color: emitterCommonColors.INDIGO,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.indigo",
      message: "Indigo",
    }),
  },
  {
    color: emitterCommonColors.LIME,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.lime",
      message: "Lime",
    }),
  },
  {
    color: emitterCommonColors.MINT,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.mint",
      message: "Mint",
    }),
  },
  {
    color: emitterCommonColors.ORANGE,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.orange",
      message: "Orange",
    }),
  },
  {
    color: emitterCommonColors.RED,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.red",
      message: "Red",
    }),
  },
  {
    color: emitterCommonColors.UV,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.uv",
      message: "UV",
    }),
  },
  {
    color: emitterCommonColors.WARM_WHITE,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.warmWhite",
      message: "Warm White",
    }),
  },
  {
    color: emitterCommonColors.WHITE,
    name: msg({
      id: "deviceClassEditor.emitters.commonColor.white",
      message: "White",
    }),
  },
];
