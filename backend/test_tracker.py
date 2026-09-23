from tracker import Tracker

tracker = Tracker(
    root_folder=".",
    detection_model="models/experimental/weights",
    scale=0.294,
    fps=56.95,
)

tracks = tracker.track_video(
    "test_video.mp4",
    cutoff=0.999,
    min_duration=20,
    min_displacement=50,
    search_range=25,
    memory=0,
)

print("NUMBER OF TRACKS:", len(tracks))

for i, track in enumerate(tracks):
    print(f"\nTRACK {i}")
    print(track[["frame", "x", "y", "time"]].head())