from PIL import Image
import numpy as np

img = Image.open("tntPack.png").convert("RGBA")

data = np.array(img, dtype=np.uint8)

flat_data = data.flatten()

js_array = ", ".join(map(str, flat_data))
with open("texture.js", "w") as f:
    f.write(f"const texture = new Uint8Array([{js_array}]);\n")
    f.write(f"const width = {img.width};\n")
    f.write(f"const height = {img.height};\n")