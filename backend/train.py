import deeptrack as dt
import numpy as np
import random
import os

samples = []
data_folder = "training_data\\big_particles"
for sample in os.listdir(data_folder):
    samples.append(dt.LoadImage(os.path.join(data_folder, sample))()._value[:, :, :3] / 256)

model = dt.models.LodeSTAR(input_shape=(None, None, 3))
model.load_weights("models\\big_particles\\weights")

train_set =   (
    dt.Value(lambda: random.choice(samples))
    >> dt.Add(lambda: np.random.randn() * 0.1)
    >> dt.Gaussian(sigma=lambda:np.random.uniform(0, 0.2))  
    >> dt.Multiply(lambda: np.random.uniform(0.6, 1.2))
)

model.fit(
    train_set,
    epochs=40,
    batch_size=8,
)

model.save_weights("models\\big_particles\\weights")