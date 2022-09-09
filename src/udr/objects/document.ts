import { DeviceClass } from "./deviceClass";
import { Library } from "./library";

export interface Document {
  e173: {
    imports: Array<string>;
    libraries: Record<string, Library>;
    deviceClasses: Record<string, DeviceClass>;
    // systems
  };
}

// function deserializeDocument(json: string): Document {}
