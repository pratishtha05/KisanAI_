import os


DISEASE_MIN_CONFIDENCE = float(
    os.getenv("DISEASE_MIN_CONFIDENCE", "0.25")
)

DISEASE_MAX_UPLOAD_BYTES = int(
    os.getenv("DISEASE_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024))
)

SUPPORTED_CROPS = {
    "apple": "Apple",
    "cassava": "Cassava",
    "corn": "Corn",
    "maize": "Corn",
    "potato": "Potato",
    "rice": "Rice",
    "sugarcane": "Sugarcane",
    "tea": "Tea",
    "tomato": "Tomato",
    "wheat": "Wheat",
}
