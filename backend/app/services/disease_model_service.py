import io
import json
from pathlib import Path

import torch
from PIL import Image, UnidentifiedImageError
from torchvision import transforms
from torchvision.models import mobilenet_v3_large


class DiseaseModelError(Exception):
    """Raised when disease model inference cannot be completed."""


class DiseaseModelService:
    def __init__(self):
        self.device = torch.device("cpu")

        self.model_dir = (
            Path(__file__).resolve().parent.parent
            / "models"
            / "disease_detection"
        )

        self.model_path = self.model_dir / "mobilenet_v3_kisanai_final.pth"
        self.config_path = self.model_dir / "mobilenet_v3_config.json"
        self.labels_path = self.model_dir / "labels_deployment.json"

        self._validate_files()

        self.config = self._load_config()
        self.labels = self._load_labels()

        self.model = self._load_model()
        self.transform = self._build_transform()

    def _validate_files(self):
        required_files = [
            self.model_path,
            self.config_path,
            self.labels_path,
        ]

        missing = [
            str(path)
            for path in required_files
            if not path.is_file()
        ]

        if missing:
            raise FileNotFoundError(
                "Missing disease model deployment files: "
                + ", ".join(missing)
            )

    def _load_config(self):
        with self.config_path.open("r", encoding="utf-8") as file:
            config = json.load(file)

        required_keys = {
            "model_name",
            "num_classes",
            "input_size",
            "eval_resize",
            "eval_crop",
            "normalization_mean",
            "normalization_std",
        }

        missing_keys = required_keys - config.keys()

        if missing_keys:
            raise ValueError(
                f"Missing keys in disease model config: {sorted(missing_keys)}"
            )

        return config

    def _load_labels(self):
        with self.labels_path.open("r", encoding="utf-8") as file:
            labels_data = json.load(file)

        if not isinstance(labels_data, dict):
            raise ValueError(
                "labels_deployment.json must contain a JSON object."
            )

        labels = labels_data.get("class_names")

        if not isinstance(labels, list):
            raise ValueError(
                "labels_deployment.json must contain a 'class_names' list."
            )

        if len(labels) != self.config["num_classes"]:
            raise ValueError(
                f"Model expects {self.config['num_classes']} classes, "
                f"but {len(labels)} labels were found."
            )

        if len(set(labels)) != len(labels):
            raise ValueError(
                "labels_deployment.json contains duplicate class names."
            )

        return labels

    def _load_model(self):
        model_name = self.config["model_name"]
        num_classes = self.config["num_classes"]

        if model_name != "mobilenet_v3_large":
            raise ValueError(
                f"Unsupported disease model architecture: {model_name}"
            )

        model = mobilenet_v3_large(
            weights=None,
            num_classes=num_classes,
        )

        checkpoint = torch.load(
            self.model_path,
            map_location=self.device,
            weights_only=True,
        )

        if not isinstance(checkpoint, dict):
            raise ValueError(
                "Expected a PyTorch state_dict in the disease model checkpoint."
            )

        model.load_state_dict(checkpoint)

        model.to(self.device)
        model.eval()

        return model

    def _build_transform(self):
        resize_size = self.config["eval_resize"]
        crop_size = self.config["eval_crop"]

        mean = self.config["normalization_mean"]
        std = self.config["normalization_std"]

        return transforms.Compose([
            transforms.Resize(resize_size),
            transforms.CenterCrop(crop_size),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=mean,
                std=std,
            ),
        ])

    def predict(self, image_bytes: bytes):
        if not image_bytes:
            raise DiseaseModelError("The uploaded image is empty.")

        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()

            # Re-open after verify() because PIL invalidates the image object.
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        except (UnidentifiedImageError, OSError, ValueError) as exc:
            raise DiseaseModelError(
                "The uploaded file is not a valid image."
            ) from exc

        input_size = self.config["input_size"]

        if image.width < input_size or image.height < input_size:
            raise DiseaseModelError(
                f"Image is too small. Please upload an image at least "
                f"{input_size}x{input_size} pixels."
            )

        try:
            input_tensor = self.transform(image).unsqueeze(0)
            input_tensor = input_tensor.to(self.device)

            with torch.inference_mode():
                logits = self.model(input_tensor)
                probabilities = torch.softmax(logits, dim=1)

            top_k = min(3, len(self.labels))

            top_probabilities, top_indices = torch.topk(
                probabilities,
                k=top_k,
                dim=1,
            )

            top_predictions = []

            for probability, index in zip(
                top_probabilities[0],
                top_indices[0],
            ):
                class_index = index.item()
                confidence = probability.item()

                top_predictions.append({
                    "class_index": class_index,
                    "label": self.labels[class_index],
                    "confidence": confidence,
                })

            best_prediction = top_predictions[0]

            return {
                "class_index": best_prediction["class_index"],
                "label": best_prediction["label"],
                "confidence": best_prediction["confidence"],
                "top_predictions": top_predictions,
            }

        except Exception as exc:
            raise DiseaseModelError(
                "Disease model inference failed."
            ) from exc


disease_model_service = DiseaseModelService()
