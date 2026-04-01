from PIL import Image
import numpy as np

src = r"C:\Users\user\Documents\GitHub\uhome\applogo\chromehome3.png"
dst = r"C:\Users\user\Documents\GitHub\uhome\public\logo.png"

img = Image.open(src).convert("RGBA")
data = np.array(img, dtype=np.float32)

r, g, b, a = data[...,0], data[...,1], data[...,2], data[...,3]

# Brightness of each pixel (0-255)
brightness = (r * 0.299 + g * 0.587 + b * 0.114)

# Alpha = brightness — black becomes transparent, chrome stays opaque
# Boost mid-tones so the chrome body isn't too thin
alpha = np.clip(brightness * 1.15, 0, 255)

# Slightly lift the RGB so the chrome looks right when composited
scale = np.where(brightness > 10, 255.0 / np.maximum(brightness, 10), 1.0)
scale = np.minimum(scale, 1.6)

data[...,0] = np.clip(r * scale, 0, 255)
data[...,1] = np.clip(g * scale, 0, 255)
data[...,2] = np.clip(b * scale, 0, 255)
data[...,3] = alpha

result = Image.fromarray(data.astype(np.uint8), "RGBA")

# Save at 512x512 — enough for all sizes
result = result.resize((512, 512), Image.LANCZOS)
result.save(dst, "PNG", optimize=True)
print(f"Saved to {dst}")
