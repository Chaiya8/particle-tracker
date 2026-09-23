"use client";

import { useEffect, useMemo, useRef } from "react";
import { ParsedTracks } from "@/utils/parseTracks";

interface VideoCanvasProps {
  videoFile: File | null;
  trackData: ParsedTracks | null;
  fps: number | null;
}

const TRACK_COLORS = [
  "#00f2fe",
  "#fe0979",
  "#ffeb3b",
  "#00e676",
  "#ff9100",
  "#d500f9",
  "#00b0ff",
  "#ff1744",
  "#76ff03",
  "#ff4081",
  "#c51162",
  "#00c853",
  "#ff6d00",
  "#aa00ff",
  "#00e5ff",
  "#ffea00",
  "#00ff9d",
];

export default function VideoCanvas({
  videoFile,
  trackData,
  fps,
}: VideoCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const videoUrl = useMemo(() => {
    if (!videoFile) {
      return null;
    }

    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const drawTracks = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      !video ||
      !canvas ||
      !trackData ||
      !fps ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const currentFrame = Math.floor(
      video.currentTime * fps
    );

    let colorIndex = 0;

    Object.values(trackData).forEach((points) => {
      if (points.length === 0) {
        return;
      }

      const color =
        TRACK_COLORS[
          colorIndex % TRACK_COLORS.length
        ];

      // Draw trajectory
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      let isDrawing = false;

      for (const point of points) {
        if (point.frame <= currentFrame) {
          if (!isDrawing) {
            ctx.moveTo(
              point.x_pixel,
              point.y_pixel
            );

            isDrawing = true;
          } else {
            ctx.lineTo(
              point.x_pixel,
              point.y_pixel
            );
          }
        } else {
          break;
        }
      }

      if (isDrawing) {
        ctx.stroke();
      }

      // Find current particle position
      let currentPoint = null;

      for (const point of points) {
        if (point.frame === currentFrame) {
          currentPoint = point;
          break;
        }

        if (point.frame > currentFrame) {
          break;
        }
      }

      // Small marker for current particle
      if (currentPoint) {
        const x = currentPoint.x_pixel;
        const y = currentPoint.y_pixel;

        // Small colored dot
        ctx.beginPath();

        ctx.arc(
          x,
          y,
          3,
          0,
          Math.PI * 2
        );

        ctx.fillStyle = color;
        ctx.fill();

        // Very thin outline
        ctx.beginPath();

        ctx.arc(
          x,
          y,
          3,
          0,
          Math.PI * 2
        );

        ctx.strokeStyle = "white";
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }

      colorIndex++;
    });
  };

  useEffect(() => {
    let animationFrame: number;

    const draw = () => {
      drawTracks();

      animationFrame =
        requestAnimationFrame(draw);
    };

    animationFrame =
      requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [trackData, fps]);

  if (!videoUrl) {
    return (
      <div className="border border-zinc-700 rounded-xl h-[500px] flex items-center justify-center text-zinc-500 bg-zinc-900/50">
        Upload a video
      </div>
    );
  }

  return (
    <div className="border border-zinc-700 rounded-xl overflow-hidden bg-black flex justify-center items-center h-[600px]">
      <div className="relative inline-flex max-w-full max-h-full">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="block max-w-full max-h-full"
        />

        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
      </div>
    </div>
  );
}