import type { RideApi } from "./index";

declare global {
  interface Window {
    ride: RideApi;
  }
}

export {};
