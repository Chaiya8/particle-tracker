"use client";

import { useState } from "react";
import UploadCard from "@/components/UploadCard";
import {parseCsvFiles, type ParsedTracks} from "@/utils/parseTracks";
import VideoCanvas from "@/components/VideoCanvas";

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const[trackData, setTrackData] = useState<ParsedTracks | null>(null);

  return (
    <main className="min-h-screen bg-[#0b0d12] text-white p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between mb-8">
          <h1 className="text-2xl font-bold">
            Particle Tracker Plotter
          </h1>

          <span className="text-zinc-400">
            Rhodes College  Magnet lab, 2026
          </span>
        </div>

        {/* Upload section label */}
        <p className="text-xs tracking-widest text-zinc-500 mb-4">
          UPLOADS
        </p>

        {/* Upload cards */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* VIDEO */}
          <UploadCard
            title="Video"
            subtitle="MP4, MOV, WebM"
            accept="video/*"
            onChange={(files) => {
              setVideoFile(files[0] || null);
            }}
          />

          {/* CSV FOLDER */}
          <UploadCard
            title="Trajectory Folder"
            subtitle="Folder of bead CSV files"
            accept=".csv"
            folder
            onChange={(files) => {
              const csvs = files.filter(f =>
                f.name.endsWith(".csv")
              );

              setCsvFiles(csvs);
            }}
          />
        </div>

        {/* Status bar */}
        <div className="mt-8 border border-zinc-700 rounded-xl p-4 flex justify-between">
          <span className="text-zinc-400">
            {videoFile && csvFiles.length > 0
              ? `Ready • ${csvFiles.length} trajectories loaded`
              : "Upload video and trajectory folder"}
          </span>

          <button
            className="bg-zinc-800 px-5 py-2 rounded-lg"
            onClick={async() => {
              if(csvFiles.length === 0 || !videoFile) return;
              const data = await parseCsvFiles(csvFiles);
              setTrackData(data);
              console.log("Extracted track data COMPLETE:", data);
            }}
          >
            ▶ Run
          </button>
        </div>

        {/* Result */}
        <div className="mt-8">
          <p className="text-xs tracking-widest text-zinc-500 mb-4">
            RESULT
          </p>
          <VideoCanvas videoFile={videoFile} trackData={trackData} />
        </div>

      </div>
    </main>
  );
}