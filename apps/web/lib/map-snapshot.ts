import type { IControl, Map as MapLibreMap } from "maplibre-gl";
import type { MapView } from "@snotel/core/place";

export interface SnapshotCrop {
  left: number;
  right: number;
}

export interface MapSnapshot {
  canvas: HTMLCanvasElement;
  pixelRatio: number;
  attribution: string;
  view: MapView;
}

const SNAPSHOT_PIXEL_RATIO = 2;
const IDLE_TIMEOUT_MS = 8000;

const CAMERA_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;margin:auto"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>';

export function snapshotControl(onClick: () => void): IControl {
  let container: HTMLDivElement | null = null;
  return {
    onAdd() {
      container = document.createElement("div");
      container.className = "maplibregl-ctrl maplibregl-ctrl-group";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "map-snapshot-button";
      button.title = "Save map image";
      button.setAttribute("aria-label", "Save map image");
      button.innerHTML = CAMERA_ICON;
      button.addEventListener("click", onClick);
      container.appendChild(button);
      return container;
    },
    onRemove() {
      container?.remove();
      container = null;
    },
  };
}

function whenIdle(map: MapLibreMap): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, IDLE_TIMEOUT_MS);
    map.once("idle", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function nextFrame(map: MapLibreMap, crop: SnapshotCrop): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    map.once("render", () => {
      const source = map.getCanvas();
      const scale = source.width / source.clientWidth;
      const left = Math.round(crop.left * scale);
      const width = Math.max(1, source.width - left - Math.round(crop.right * scale));
      const out = document.createElement("canvas");
      out.width = width;
      out.height = source.height;
      out.getContext("2d")!.drawImage(source, left, 0, width, source.height, 0, 0, width, source.height);
      resolve(out);
    });
    map.triggerRepaint();
  });
}

function visibleView(map: MapLibreMap, crop: SnapshotCrop): MapView {
  const { clientWidth, clientHeight } = map.getCanvas();
  const left = crop.left;
  const right = clientWidth - crop.right;
  const northWest = map.unproject([left, 0]);
  const southEast = map.unproject([right, clientHeight]);
  const center = map.unproject([(left + right) / 2, clientHeight / 2]);
  return {
    center: [center.lng, center.lat],
    bounds: [[northWest.lng, southEast.lat], [southEast.lng, northWest.lat]],
    zoom: map.getZoom(),
  };
}

export async function captureMap(map: MapLibreMap, crop: SnapshotCrop): Promise<MapSnapshot> {
  const previous = map.getPixelRatio();
  const sharper = previous < SNAPSHOT_PIXEL_RATIO;
  if (sharper) {
    map.setPixelRatio(SNAPSHOT_PIXEL_RATIO);
    await whenIdle(map);
  }
  try {
    const canvas = await nextFrame(map, crop);
    const attribution = map.getContainer().querySelector(".maplibregl-ctrl-attrib-inner")?.textContent?.trim() ?? "";
    return { canvas, pixelRatio: map.getPixelRatio(), attribution, view: visibleView(map, crop) };
  } finally {
    if (sharper) map.setPixelRatio(previous);
  }
}
