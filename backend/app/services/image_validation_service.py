import io

import numpy as np
from PIL import Image, UnidentifiedImageError


class ImageValidationError(Exception):
    """Raised when an uploaded image is not suitable for disease analysis."""


class ImageValidationService:
    """Conservative multi-signal validation before disease inference."""

    MIN_WIDTH = 224
    MIN_HEIGHT = 224

    def validate(self, image_bytes: bytes) -> None:
        if not image_bytes:
            raise ImageValidationError(self._retry_message())

        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()

            # Re-open after verify().
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        except (UnidentifiedImageError, OSError, ValueError):
            raise ImageValidationError(self._retry_message())

        width, height = image.size

        if width < self.MIN_WIDTH or height < self.MIN_HEIGHT:
            raise ImageValidationError(self._retry_message())

        # Fixed-size sample keeps validation inexpensive.
        sample = (
            np.asarray(image.resize((256, 256)), dtype=np.float32)
            / 255.0
        )

        r = sample[:, :, 0]
        g = sample[:, :, 1]
        b = sample[:, :, 2]

        # ---------------------------------------------------------
        # 1. Basic visual information
        # ---------------------------------------------------------

        gray = (
            0.299 * r
            + 0.587 * g
            + 0.114 * b
        )

        gray_std = float(gray.std())

        dx = np.abs(np.diff(gray, axis=1))
        dy = np.abs(np.diff(gray, axis=0))

        edge_ratio = float(
            (
                np.mean(dx > 0.08)
                + np.mean(dy > 0.08)
            ) / 2.0
        )

        # Approximate Laplacian variance for sharpness.
        padded = np.pad(gray, 1, mode="edge")

        laplacian = (
            padded[:-2, 1:-1]
            + padded[2:, 1:-1]
            + padded[1:-1, :-2]
            + padded[1:-1, 2:]
            - 4.0 * padded[1:-1, 1:-1]
        )

        sharpness = float(laplacian.var())

        # Reject only extremely uninformative images.
        if gray_std < 0.035 and edge_ratio < 0.015:
            raise ImageValidationError(self._retry_message())

        if sharpness < 0.00003 and edge_ratio < 0.025:
            raise ImageValidationError(self._retry_message())

        # ---------------------------------------------------------
        # 2. Leaf-like colour families
        # ---------------------------------------------------------
        #
        # Do NOT require green.
        # Diseased leaves may be yellow, brown or reddish.

        rgb_max = sample.max(axis=2)
        rgb_min = sample.min(axis=2)

        saturation = np.divide(
            rgb_max - rgb_min,
            np.maximum(rgb_max, 1e-6),
        )

        green = (
            (g > r * 0.90)
            & (g > b * 1.05)
            & (g > 0.20)
            & (saturation > 0.12)
        )

        yellow = (
            (r > 0.40)
            & (g > 0.38)
            & (b < g * 0.92)
            & (saturation > 0.12)
        )

        brown = (
            (r > g * 1.03)
            & (g > b * 1.08)
            & (r > 0.18)
            & (saturation > 0.10)
        )

        reddish = (
            (r > g * 1.18)
            & (r > b * 1.15)
            & (r > 0.25)
            & (saturation > 0.15)
        )

        leaf_colour_mask = (
            green
            | yellow
            | brown
            | reddish
        )

        leaf_colour_ratio = float(
            leaf_colour_mask.mean()
        )

        # ---------------------------------------------------------
        # 3. Spatial structure
        # ---------------------------------------------------------
        #
        # Leaf-like regions normally occupy connected areas.
        # A flat green wall/sheet can have high green ratio but
        # little meaningful spatial structure.

        grid = leaf_colour_mask.reshape(
            8, 32, 8, 32
        ).mean(axis=(1, 3))

        occupied_cells = grid > 0.18

        occupied_ratio = float(
            occupied_cells.mean()
        )

        horizontal_neighbors = (
            occupied_cells[:, :-1]
            & occupied_cells[:, 1:]
        )

        vertical_neighbors = (
            occupied_cells[:-1, :]
            & occupied_cells[1:, :]
        )

        neighboring_ratio = float(
            (
                horizontal_neighbors.mean()
                + vertical_neighbors.mean()
            ) / 2.0
        )

        # ---------------------------------------------------------
        # 4. Background checks
        # ---------------------------------------------------------

        white_ratio = float(
            np.logical_and(
                sample.min(axis=2) > 0.88,
                saturation < 0.12,
            ).mean()
        )

        dark_ratio = float(
            np.logical_and(
                rgb_max < 0.15,
                saturation < 0.20,
            ).mean()
        )

        # ---------------------------------------------------------
        # 5. Document / diagram / screenshot detection
        # ---------------------------------------------------------

        document_like = (
            white_ratio > 0.55
            and edge_ratio > 0.035
            and leaf_colour_ratio < 0.12
        )

        diagram_like = (
            edge_ratio > 0.075
            and leaf_colour_ratio < 0.08
            and gray_std > 0.12
        )

        screenshot_like = (
            white_ratio > 0.70
            and edge_ratio > 0.025
            and leaf_colour_ratio < 0.06
        )

        if (
            document_like
            or diagram_like
            or screenshot_like
        ):
            raise ImageValidationError(
                self._retry_message()
            )

        # ---------------------------------------------------------
        # 6. Flat / uniform surface detection
        # ---------------------------------------------------------

        flat_surface = (
            leaf_colour_ratio > 0.55
            and neighboring_ratio < 0.12
            and edge_ratio < 0.025
            and gray_std < 0.13
        )

        uniform_surface = (
            gray_std < 0.045
            and edge_ratio < 0.018
            and leaf_colour_ratio > 0.20
        )

        almost_blank = (
            (
                white_ratio > 0.88
                or dark_ratio > 0.88
            )
            and edge_ratio < 0.018
        )

        if (
            flat_surface
            or uniform_surface
            or almost_blank
        ):
            raise ImageValidationError(
                self._retry_message()
            )

        # ---------------------------------------------------------
        # 7. Final weak-leaf-signal check
        # ---------------------------------------------------------

        no_leaf_signal = (
            leaf_colour_ratio < 0.015
            and occupied_ratio < 0.04
            and edge_ratio < 0.045
        )

        if no_leaf_signal:
            raise ImageValidationError(
                self._retry_message()
            )

    @staticmethod
    def _retry_message() -> str:
        return (
            "Could not identify this image as a suitable "
            "crop/leaf photo. Please select the correct crop "
            "and upload a clear close-up photo of the affected leaf."
        )


image_validation_service = ImageValidationService()