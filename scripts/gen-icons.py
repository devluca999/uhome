from PIL import Image

src = r"C:\Users\user\Documents\GitHub\uhome\public\logo.png"

sizes = [16, 32, 180, 192, 512]
paths = {
    32:  r"C:\Users\user\Documents\GitHub\uhome\public\favicon-32.png",
    180: r"C:\Users\user\Documents\GitHub\uhome\public\apple-touch-icon.png",
    192: r"C:\Users\user\Documents\GitHub\uhome\public\pwa-192x192.png",
    512: r"C:\Users\user\Documents\GitHub\uhome\public\pwa-512x512.png",
}

img = Image.open(src)
for size, path in paths.items():
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(path, "PNG")
    print(f"Saved {size}x{size} -> {path}")
