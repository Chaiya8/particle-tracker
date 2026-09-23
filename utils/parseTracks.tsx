export type TrackPoint = {
  frame: number;
  time: number;

  x_pixel: number;
  y_pixel: number;

  x_um: number;
  y_um: number;

  delta_x: number | null;
  delta_y: number | null;

  vx: number | null;
  vy: number | null;
  v: number | null;
};

export type ParsedTracks = Record<string, TrackPoint[]>;