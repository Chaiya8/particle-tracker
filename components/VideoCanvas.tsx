import { useEffect, useMemo, useRef } from "react";
import { ParsedTracks } from "@/utils/parseTracks";

interface VideoCanvasProps {
  videoFile: File | null;
  
  trackData: ParsedTracks | null; 
};


const TRACK_COLORS = [
    "#00f2fe", // Cyan
    "#fe0979", // Pink
    "#ffeb3b", // Yellow
    "#00e676", // Green
    "#ff9100", // Orange
    "#d500f9", // Purple
    "#00b0ff", // Light Blue
    "#ff1744", // Red
    "#76ff03", // Light Green
    "#ff4081", // Magenta
    "#c51162", // Deep Pink
    "#00c853", // Emerald Green
    "#ff6d00", // Deep Orange
    "#aa00ff", // Violet
    "#00e5ff", // Bright Cyan
];

export default function VideoCanvas({ videoFile, trackData }: VideoCanvasProps) {
  // Refs allow React to directly control the HTML elements for raw drawing performance
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const videoUrl = useMemo(() => {
    if (!videoFile) return null;
    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // 2. THE ENGINE: This function fires continuously as the video plays
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !trackData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Lock the transparent canvas to the EXACT internal pixel resolution of the video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Clear the screen to prep for the current frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentTime = video.currentTime;
    let colorIndex = 0;

    // Loop through every single bead we uploaded
    Object.values(trackData).forEach((points) => {
      ctx.beginPath();
      ctx.strokeStyle = TRACK_COLORS[colorIndex % TRACK_COLORS.length];
      ctx.lineWidth = 2.5; 

      let isDrawing = false;

      // Draw the line point-by-point up to the current video time
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        
        // If the point happened in the past, draw it!
        if (point.time <= currentTime && point.x_pixel && point.y_pixel) {
          if (!isDrawing) {
            ctx.moveTo(point.x_pixel, point.y_pixel); // Put pen to paper
            isDrawing = true;
          } else {
            ctx.lineTo(point.x_pixel, point.y_pixel); // Draw the line
          }
        } else if (point.time > currentTime) {
          // Optimization: If we hit points in the future, stop looking and move to the next bead
          break; 
        }
      }

      if (isDrawing) ctx.stroke(); // Apply the ink to the canvas
      colorIndex++;
    });
  };

  // If no video is uploaded yet, show a clean dark placeholder
  if (!videoUrl) {
    return (
      <div className="border border-zinc-700 rounded-xl h-[500px] flex items-center justify-center text-zinc-500 bg-zinc-900/50">
        Upload a video + trajectory folder
      </div>
    );
  }

  return (
    // Outer container (The big 600px black box)
    <div className="border border-zinc-700 rounded-xl overflow-hidden bg-black flex justify-center items-center h-[600px]">
      
      {/* TIGHT INNER WRAPPER: This locks the canvas perfectly to the video's actual edges */}
      <div className="relative inline-flex max-w-full max-h-full">
        
        {/* LAYER 1: The Video Player */}
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="block max-w-full max-h-full"
          onTimeUpdate={handleTimeUpdate} 
        />

        {/* LAYER 2: The Canvas (Now constrained to the wrapper) */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
        
      </div>

    </div>
  );
}