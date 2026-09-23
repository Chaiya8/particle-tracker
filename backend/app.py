from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import os
import uuid
import cv2
import math

from tracker import Tracker


# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "experimental",
    "weights"
)

UPLOAD_DIR = os.path.join(
    BASE_DIR,
    "uploads"
)

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


# --------------------------------------------------
# FastAPI
# --------------------------------------------------

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Helper
# --------------------------------------------------

def clean_number(value):

    if value is None:
        return None

    try:
        number = float(value)

        if not math.isfinite(number):
            return None

        return number

    except (
        TypeError,
        ValueError
    ):
        return None


# --------------------------------------------------
# Root
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "Particle Tracker backend is running"
    }


# --------------------------------------------------
# Track video
# --------------------------------------------------

@app.post("/track")
async def track_video(
    file: UploadFile = File(...)
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No video file was provided."
        )

    extension = os.path.splitext(
        file.filename
    )[1]

    if not extension:
        extension = ".mp4"

    filename = (
        f"{uuid.uuid4().hex}"
        f"{extension}"
    )

    video_path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    try:

        # ------------------------------------------
        # Save video
        # ------------------------------------------

        contents = await file.read()

        with open(
            video_path,
            "wb"
        ) as output_file:

            output_file.write(contents)

        print(
            f"Received: {file.filename}"
        )

        # ------------------------------------------
        # Get FPS
        # ------------------------------------------

        cap = cv2.VideoCapture(
            video_path
        )

        if not cap.isOpened():
            raise RuntimeError(
                "OpenCV could not open the uploaded video."
            )

        fps = cap.get(
            cv2.CAP_PROP_FPS
        )

        cap.release()

        if not fps or fps <= 0:
            raise RuntimeError(
                "Could not determine video FPS."
            )

        print(
            f"FPS: {fps}"
        )

        # ------------------------------------------
        # Load tracker
        # ------------------------------------------

        print(
            "Loading tracker..."
        )

        tracker = Tracker(
            root_folder=BASE_DIR,
            detection_model=MODEL_PATH,
            scale=0.294,
            fps=fps,
        )

        print(
            "Tracker loaded."
        )

        # ------------------------------------------
        # Run existing tracker
        # ------------------------------------------

        print(
            "Starting tracking..."
        )

        tracks = tracker.track_video(
            video_path,
            cutoff=0.999,
            min_duration=20,
            min_displacement=50,
            search_range=25,
            memory=0,
        )

        print(
            f"Tracking complete: {len(tracks)} tracks"
        )

        # ------------------------------------------
        # Convert tracks to JSON
        # ------------------------------------------

        result = {}

        for i, track in enumerate(tracks):

            points = []

            for _, row in track.iterrows():

                points.append(
                    {
                        "frame": int(
                            row["frame"]
                        ),

                        "x_pixel": clean_number(
                            row["x"]
                        ),

                        "y_pixel": clean_number(
                            row["y"]
                        ),

                        "time": clean_number(
                            row["time"]
                        ),

                        "x_um": clean_number(
                            row["x_um"]
                        ),

                        "y_um": clean_number(
                            row["y_um"]
                        ),

                        "delta_x": clean_number(
                            row["delta_x"]
                        ),

                        "delta_y": clean_number(
                            row["delta_y"]
                        ),

                        "vx": clean_number(
                            row["vx"]
                        ),

                        "vy": clean_number(
                            row["vy"]
                        ),

                        "v": clean_number(
                            row["v"]
                        ),
                    }
                )

            result[str(i)] = points

        print(
            "Results converted to JSON."
        )

        return {
            "tracks": result,
            "fps": clean_number(fps),
        }

    except Exception as error:

        print(
            "TRACKING ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:

        if os.path.exists(video_path):

            try:
                os.remove(video_path)

            except Exception:
                pass