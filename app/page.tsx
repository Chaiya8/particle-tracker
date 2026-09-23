"use client";

import { useState } from "react";
import UploadCard from "@/components/UploadCard";
import VideoCanvas from "@/components/VideoCanvas";
import type { ParsedTracks } from "@/utils/parseTracks";

type Mode = "single" | "multiple";

type FrequencyResult = {
  filename: string;
  frequency: number;
  averageVelocity: number;
  numberOfTracks: number;
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("single");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);

  const [trackData, setTrackData] =
    useState<ParsedTracks | null>(null);

  const [fps, setFps] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [frequencyResults, setFrequencyResults] =
    useState<FrequencyResult[]>([]);

  const extractFrequency = (
    filename: string
  ): number | null => {
    const match = filename.match(
      /(\d+(?:\.\d+)?)\s*Hz/i
    );

    if (!match) {
      return null;
    }

    return Number(match[1]);
  };

  const calculateAverageVelocity = (
    tracks: ParsedTracks
  ): number | null => {
    const velocities: number[] = [];

    Object.values(tracks).forEach((track) => {
      if (track.length < 2) {
        return;
      }

      const firstPoint = track[0];
      const lastPoint = track[track.length - 1];

      const deltaX =
        lastPoint.x_um - firstPoint.x_um;

      const deltaY =
        lastPoint.y_um - firstPoint.y_um;

      const distance = Math.sqrt(
        deltaX * deltaX +
          deltaY * deltaY
      );

      const duration =
        lastPoint.time - firstPoint.time;

      if (duration <= 0) {
        return;
      }

      const velocity = distance / duration;

      velocities.push(velocity);
    });

    if (velocities.length === 0) {
      return null;
    }

    const total = velocities.reduce(
      (sum, velocity) => sum + velocity,
      0
    );

    return total / velocities.length;
  };

  const runSingleTracking = async () => {
    if (!videoFile) {
      return;
    }

    setLoading(true);

    const formData = new FormData();

    formData.append("file", videoFile);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/track",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Tracking failed");
      }

      const data = await response.json();

      setTrackData(data.tracks);
      setFps(data.fps);

      console.log(
        "VIDEO FPS:",
        data.fps
      );

      console.log(
        "FREQUENCY:",
        extractFrequency(videoFile.name)
      );

      console.log(
        "TRACK DATA:",
        data.tracks
      );
    } catch (error) {
      console.error(error);

      alert(
        "Tracking failed. Check the backend terminal."
      );
    } finally {
      setLoading(false);
    }
  };

  const runMultipleTracking = async () => {
    if (videoFiles.length === 0) {
      return;
    }

    setLoading(true);
    setFrequencyResults([]);

    const results: FrequencyResult[] = [];

    try {
      for (const file of videoFiles) {
        const frequency =
          extractFrequency(file.name);

        if (frequency === null) {
          alert(
            `Could not find a frequency in "${file.name}". Make sure the filename contains something like "26Hz".`
          );

          continue;
        }

        const formData = new FormData();

        formData.append("file", file);

        const response = await fetch(
          "http://127.0.0.1:8000/track",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Tracking failed for ${file.name}`
          );
        }

        const data = await response.json();

        const averageVelocity =
          calculateAverageVelocity(
            data.tracks
          );

        if (averageVelocity === null) {
          console.warn(
            `No usable velocity data for ${file.name}`
          );

          continue;
        }

        results.push({
          filename: file.name,
          frequency,
          averageVelocity,
          numberOfTracks:
            Object.keys(data.tracks).length,
        });

        setFrequencyResults([
          ...results,
        ]);
      }
    } catch (error) {
      console.error(error);

      alert(
        "Tracking failed. Check the backend terminal."
      );
    } finally {
      setLoading(false);
    }
  };

  const runTracking = async () => {
    if (mode === "single") {
      await runSingleTracking();
    } else {
      await runMultipleTracking();
    }
  };

  const downloadFile = (
    content: string,
    filename: string
  ) => {
    const blob = new Blob(
      [content],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const downloadSingleCSV = () => {
    if (!trackData || !videoFile) {
      return;
    }

    const frequency =
      extractFrequency(videoFile.name);

    const headers = [
      "track_id",
      "frequency_hz",
      "frame",
      "x_pixel",
      "y_pixel",
      "time",
      "x_um",
      "y_um",
      "delta_x",
      "delta_y",
      "vx",
      "vy",
      "v",
    ];

    const rows: string[][] = [];

    Object.entries(trackData).forEach(
      ([trackId, points]) => {
        points.forEach((point) => {
          rows.push([
            trackId,

            frequency !== null
              ? String(frequency)
              : "",

            String(point.frame),
            String(point.x_pixel),
            String(point.y_pixel),
            String(point.time),
            String(point.x_um ?? ""),
            String(point.y_um ?? ""),
            String(point.delta_x ?? ""),
            String(point.delta_y ?? ""),
            String(point.vx ?? ""),
            String(point.vy ?? ""),
            String(point.v ?? ""),
          ]);
        });
      }
    );

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.join(",")
      ),
    ].join("\n");

    downloadFile(
      csv,
      `${videoFile.name.replace(
        /\.[^/.]+$/,
        ""
      )}_tracks.csv`
    );
  };

  const downloadMultipleCSV = () => {
    if (
      frequencyResults.length === 0
    ) {
      return;
    }

    const headers = [
      "filename",
      "frequency_hz",
      "average_velocity_um_s",
      "number_of_tracks",
    ];

    const rows =
      frequencyResults.map(
        (result) => [
          result.filename,
          String(result.frequency),
          String(
            result.averageVelocity
          ),
          String(
            result.numberOfTracks
          ),
        ]
      );

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.join(",")
      ),
    ].join("\n");

    downloadFile(
      csv,
      "velocity_vs_frequency.csv"
    );
  };

  const numberOfTracks = trackData
    ? Object.keys(trackData).length
    : 0;

  const numberOfPoints = trackData
    ? Object.values(trackData).reduce(
        (total, track) =>
          total + track.length,
        0
      )
    : 0;

  const singleFrequency = videoFile
    ? extractFrequency(
        videoFile.name
      )
    : null;

  const sortedFrequencyResults = [
    ...frequencyResults,
  ].sort(
    (a, b) =>
      a.frequency - b.frequency
  );

  const maxVelocity =
    sortedFrequencyResults.length > 0
      ? Math.max(
          ...sortedFrequencyResults.map(
            (result) =>
              result.averageVelocity
          )
        )
      : 0;

  const maxFrequency =
    sortedFrequencyResults.length > 0
      ? Math.max(
          ...sortedFrequencyResults.map(
            (result) =>
              result.frequency
          )
        )
      : 0;

  return (
    <main className="min-h-screen bg-[#0b0d12] text-white p-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between mb-8">
          <h1 className="text-2xl font-bold">
            Particle Tracker Plotter
          </h1>

          <span className="text-zinc-400">
            Rhodes College Magnet Lab, 2026
          </span>
        </div>

        <p className="text-xs tracking-widest text-zinc-500 mb-4">
          UPLOAD
        </p>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("single");
              setTrackData(null);
              setFrequencyResults([]);
            }}
            className={`px-4 py-2 rounded-lg border ${
              mode === "single"
                ? "bg-zinc-700 border-zinc-500"
                : "bg-zinc-900 border-zinc-700 text-zinc-400"
            }`}
          >
            Single Video
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("multiple");
              setTrackData(null);
            }}
            className={`px-4 py-2 rounded-lg border ${
              mode === "multiple"
                ? "bg-zinc-700 border-zinc-500"
                : "bg-zinc-900 border-zinc-700 text-zinc-400"
            }`}
          >
            Multiple Videos
          </button>
        </div>

        {mode === "single" ? (
          <>
            <UploadCard
              title="Video"
              subtitle="MP4, MOV, WebM"
              accept="video/*"
              onChange={(files) => {
                setVideoFile(
                  files[0] || null
                );

                setTrackData(null);
                setFps(null);
              }}
            />

            <div className="mt-8 border border-zinc-700 rounded-xl p-4 flex justify-between items-center">
              <span className="text-zinc-400">
                {videoFile
                  ? `Ready • ${videoFile.name}`
                  : "Upload a video"}
              </span>

              <button
                className="bg-zinc-800 px-5 py-2 rounded-lg disabled:opacity-50"
                disabled={
                  !videoFile ||
                  loading
                }
                onClick={runTracking}
              >
                {loading
                  ? "Running..."
                  : "▶ Run"}
              </button>
            </div>

            <div className="mt-8">
              <p className="text-xs tracking-widest text-zinc-500 mb-4">
                RESULT
              </p>

              {trackData && (
                <div className="flex items-center gap-8 mb-4 text-sm flex-wrap">

                  <div>
                    <span className="text-zinc-500">
                      Tracks
                    </span>

                    <span className="ml-2 text-white font-medium">
                      {numberOfTracks}
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-500">
                      Points
                    </span>

                    <span className="ml-2 text-white font-medium">
                      {numberOfPoints}
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-500">
                      FPS
                    </span>

                    <span className="ml-2 text-white font-medium">
                      {fps?.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-500">
                      Frequency
                    </span>

                    <span className="ml-2 text-white font-medium">
                      {singleFrequency !== null
                        ? `${singleFrequency} Hz`
                        : "Not found"}
                    </span>
                  </div>

                  <button
                    onClick={
                      downloadSingleCSV
                    }
                    className="bg-zinc-800 px-4 py-2 rounded-lg hover:bg-zinc-700"
                  >
                    Download CSV
                  </button>

                </div>
              )}

              <VideoCanvas
                videoFile={videoFile}
                trackData={trackData}
                fps={fps}
              />
            </div>
          </>
        ) : (
          <>
            <UploadCard
              title="Videos"
              subtitle="Select multiple frequency videos"
              accept="video/*"
              folder
              onChange={(files) => {
                setVideoFiles(files);
                setFrequencyResults([]);
              }}
            />

            <div className="mt-8 border border-zinc-700 rounded-xl p-4 flex justify-between items-center">

              <span className="text-zinc-400">
                {videoFiles.length > 0
                  ? `${videoFiles.length} video${
                      videoFiles.length ===
                      1
                        ? ""
                        : "s"
                    } selected`
                  : "Select multiple videos"}
              </span>

              <button
                className="bg-zinc-800 px-5 py-2 rounded-lg disabled:opacity-50"
                disabled={
                  videoFiles.length === 0 ||
                  loading
                }
                onClick={runTracking}
              >
                {loading
                  ? "Running..."
                  : "▶ Run"}
              </button>

            </div>

            {videoFiles.length > 0 && (
              <div className="mt-6 text-sm text-zinc-400">

                <p className="mb-2">
                  Selected videos:
                </p>

                <div className="space-y-1">

                  {videoFiles.map(
                    (file) => {
                      const frequency =
                        extractFrequency(
                          file.name
                        );

                      return (
                        <div
                          key={file.name}
                          className="flex justify-between border-b border-zinc-800 py-2"
                        >
                          <span>
                            {file.name}
                          </span>

                          <span className="text-zinc-500 ml-4">
                            {frequency !== null
                              ? `${frequency} Hz`
                              : "Frequency not found"}
                          </span>
                        </div>
                      );
                    }
                  )}

                </div>
              </div>
            )}

            {frequencyResults.length >
              0 && (
              <div className="mt-8">

                <div className="flex items-center justify-between mb-4">

                  <p className="text-xs tracking-widest text-zinc-500">
                    VELOCITY VS FREQUENCY
                  </p>

                  <button
                    onClick={
                      downloadMultipleCSV
                    }
                    className="bg-zinc-800 px-4 py-2 rounded-lg hover:bg-zinc-700 text-sm"
                  >
                    Download CSV
                  </button>

                </div>

                <div className="border border-zinc-700 rounded-xl overflow-hidden">

                  <table className="w-full text-sm">

                    <thead className="bg-zinc-900">
                      <tr>

                        <th className="text-left p-3 text-zinc-500 font-normal">
                          Frequency
                        </th>

                        <th className="text-left p-3 text-zinc-500 font-normal">
                          Average Velocity
                        </th>

                        <th className="text-left p-3 text-zinc-500 font-normal">
                          Tracks
                        </th>

                        <th className="text-left p-3 text-zinc-500 font-normal">
                          Video
                        </th>

                      </tr>
                    </thead>

                    <tbody>

                      {sortedFrequencyResults.map(
                        (result) => (
                          <tr
                            key={
                              result.filename
                            }
                            className="border-t border-zinc-800"
                          >

                            <td className="p-3">
                              {result.frequency}{" "}
                              Hz
                            </td>

                            <td className="p-3">
                              {result.averageVelocity.toFixed(
                                3
                              )}{" "}
                              μm/s
                            </td>

                            <td className="p-3">
                              {
                                result.numberOfTracks
                              }
                            </td>

                            <td className="p-3 text-zinc-400">
                              {
                                result.filename
                              }
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>
                  </table>

                </div>

                <div className="mt-8 border border-zinc-700 rounded-xl p-6">

                  <h2 className="text-lg font-medium mb-1">
                    Velocity vs Frequency
                  </h2>

                  <p className="text-sm text-zinc-500 mb-6">
                    Average particle velocity for each experimental frequency.
                  </p>

                  <div className="relative h-[400px]">

                    <svg
                      viewBox="0 0 800 400"
                      className="w-full h-full"
                      preserveAspectRatio="none"
                    >

                      <line
                        x1="70"
                        y1="20"
                        x2="70"
                        y2="340"
                        stroke="#52525b"
                        strokeWidth="1"
                      />

                      <line
                        x1="70"
                        y1="340"
                        x2="770"
                        y2="340"
                        stroke="#52525b"
                        strokeWidth="1"
                      />

                      <line
                        x1="70"
                        y1="260"
                        x2="770"
                        y2="260"
                        stroke="#27272a"
                      />

                      <line
                        x1="70"
                        y1="180"
                        x2="770"
                        y2="180"
                        stroke="#27272a"
                      />

                      <line
                        x1="70"
                        y1="100"
                        x2="770"
                        y2="100"
                        stroke="#27272a"
                      />

                      <text
                        x="55"
                        y="345"
                        textAnchor="end"
                        fill="#71717a"
                        fontSize="12"
                      >
                        0
                      </text>

                      <text
                        x="55"
                        y="265"
                        textAnchor="end"
                        fill="#71717a"
                        fontSize="12"
                      >
                        {(maxVelocity * 0.25).toFixed(
                          1
                        )}
                      </text>

                      <text
                        x="55"
                        y="185"
                        textAnchor="end"
                        fill="#71717a"
                        fontSize="12"
                      >
                        {(maxVelocity * 0.5).toFixed(
                          1
                        )}
                      </text>

                      <text
                        x="55"
                        y="105"
                        textAnchor="end"
                        fill="#71717a"
                        fontSize="12"
                      >
                        {(maxVelocity * 0.75).toFixed(
                          1
                        )}
                      </text>

                      <text
                        x="55"
                        y="25"
                        textAnchor="end"
                        fill="#71717a"
                        fontSize="12"
                      >
                        {maxVelocity.toFixed(
                          1
                        )}
                      </text>

                      {sortedFrequencyResults.map(
                        (result) => {
                          const x =
                            sortedFrequencyResults.length ===
                            1
                              ? 420
                              : 90 +
                                (result.frequency /
                                  Math.max(
                                    maxFrequency,
                                    1
                                  )) *
                                  650;

                          return (
                            <text
                              key={
                                result.filename
                              }
                              x={x}
                              y="365"
                              textAnchor="middle"
                              fill="#71717a"
                              fontSize="12"
                            >
                              {result.frequency}{" "}
                              Hz
                            </text>
                          );
                        }
                      )}

                      <text
                        x="420"
                        y="395"
                        textAnchor="middle"
                        fill="#a1a1aa"
                        fontSize="13"
                      >
                        Frequency (Hz)
                      </text>

                      <text
                        x="18"
                        y="180"
                        textAnchor="middle"
                        fill="#a1a1aa"
                        fontSize="13"
                        transform="rotate(-90 18 180)"
                      >
                        Average velocity (μm/s)
                      </text>

                      {sortedFrequencyResults.length >
                        1 && (
                        <polyline
                          fill="none"
                          stroke="#a1a1aa"
                          strokeWidth="2"
                          points={sortedFrequencyResults
                            .map(
                              (result) => {
                                const x =
                                  90 +
                                  (result.frequency /
                                    Math.max(
                                      maxFrequency,
                                      1
                                    )) *
                                    650;

                                const y =
                                  340 -
                                  (result.averageVelocity /
                                    Math.max(
                                      maxVelocity,
                                      1
                                    )) *
                                    320;

                                return `${x},${y}`;
                              }
                            )
                            .join(" ")}
                        />
                      )}

                      {sortedFrequencyResults.map(
                        (result) => {
                          const x =
                            sortedFrequencyResults.length ===
                            1
                              ? 420
                              : 90 +
                                (result.frequency /
                                  Math.max(
                                    maxFrequency,
                                    1
                                  )) *
                                  650;

                          const y =
                            340 -
                            (result.averageVelocity /
                              Math.max(
                                maxVelocity,
                                1
                              )) *
                              320;

                          return (
                            <circle
                              key={
                                result.filename
                              }
                              cx={x}
                              cy={y}
                              r="6"
                              fill="white"
                              stroke="#a1a1aa"
                              strokeWidth="2"
                            />
                          );
                        }
                      )}

                    </svg>

                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}