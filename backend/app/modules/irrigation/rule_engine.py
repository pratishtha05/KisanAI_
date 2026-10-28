from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from app.modules.irrigation.rules_config import (
    CROP_ALIASES,
    IRRIGATION_RULES,
)


class IrrigationRuleEngine:
    """
    Crop-specific irrigation decision engine.

    Decision priority:
    1. Harvest / maturity override
    2. Too-wet soil override
    3. Crop-specific irrigation rules
    4. Rainfall adjustment
    5. Farmer "too dry" override

    Important:
    - Actual sowing/transplanting date is preferred.
    - If it is unavailable, last_irrigation_date is used as a
      fallback reference date.
    - The database sowing_date itself is NOT modified.
    """

    def __init__(self, crop: str):
        self.original_crop = crop
        self.crop = self._normalize_crop(crop)

        if self.crop not in IRRIGATION_RULES:
            raise ValueError(
                f"Irrigation rules are not available for crop: {crop}"
            )

    # ------------------------------------------------------------------
    # Normalization
    # ------------------------------------------------------------------

    def _normalize_crop(self, crop: str) -> str:
        value = (crop or "").strip().lower()
        return CROP_ALIASES.get(value, value)

    def _normalize_stage(self, stage: Optional[str]) -> Optional[str]:
        if not stage:
            return None

        value = stage.strip().lower()

        aliases = {
            "sown": "Establishment",
            "sowing": "Establishment",
            "germination": "Establishment",
            "establishment": "Establishment",

            "cri": "Crown Root Initiation",
            "crown root initiation": "Crown Root Initiation",

            "tillering": "Tillering",

            "jointing": "Jointing/Booting",
            "booting": "Jointing/Booting",
            "jointing/booting": "Jointing/Booting",

            "heading": "Heading/Flowering",
            "flowering": "Heading/Flowering",
            "heading/flowering": "Heading/Flowering",

            "grain filling": "Grain Filling",
            "grain filling stage": "Grain Filling",

            "maturity": "Maturity",
            "mature": "Maturity",
            "harvest": "Harvest",
            "harvesting": "Harvest",
        }

        return aliases.get(value, stage)

    # ------------------------------------------------------------------
    # Main evaluation
    # ------------------------------------------------------------------

    def evaluate(
        self,
        today: date,
        sowing_date: Optional[date] = None,
        last_irrigation_date: Optional[date] = None,
        soil_type: Optional[str] = None,
        selected_stage: Optional[str] = None,
        soil_feedback: Optional[str] = None,
        forecast: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:

        forecast = forecast or []

        normalized_stage = self._normalize_stage(selected_stage)

        feedback = (
            soil_feedback.strip().lower()
            if soil_feedback
            else None
        )

        # --------------------------------------------------------------
        # IMPORTANT FALLBACK
        # --------------------------------------------------------------
        # If actual sowing/transplanting date is unavailable, use the
        # last irrigation date as the reference date.
        #
        # We do NOT modify farm.sowing_date in the database.
        effective_sowing_date = (
            sowing_date
            if sowing_date is not None
            else last_irrigation_date
        )

        days_after_sowing = None

        if effective_sowing_date:
            days_after_sowing = (
                today - effective_sowing_date
            ).days

        rain_expected_soon, rain_adjustment_days = (
            self._rain_information(
                today=today,
                forecast=forecast,
            )
        )

        # --------------------------------------------------------------
        # 1. HARVEST / MATURITY OVERRIDE
        # --------------------------------------------------------------

        if normalized_stage in {"Harvest", "Maturity"}:
            return self._build_result(
                decision="NOT_NEEDED",
                decision_label="Not needed",
                stage=normalized_stage,
                stage_priority="normal",
                recommended_date=None,
                soil_type=soil_type,
                soil_feedback=feedback,
                days_after_sowing=days_after_sowing,
                rain_expected_soon=rain_expected_soon,
                rain_adjustment_days=0,
                rule_type="harvest_override",
                rule_basis=(
                    "Irrigation should be reduced or stopped near "
                    "harvest according to crop-specific guidance."
                ),
                reason=(
                    "The crop is at maturity/harvest stage. "
                    "Irrigation is not recommended at this stage."
                ),
            )

        # --------------------------------------------------------------
        # 2. TOO-WET SOIL OVERRIDE
        # --------------------------------------------------------------

        if feedback == "too wet":
            return self._build_result(
                decision="WAIT",
                decision_label="Wait",
                stage=normalized_stage,
                stage_priority=self._stage_priority(normalized_stage),
                recommended_date=None,
                soil_type=soil_type,
                soil_feedback=feedback,
                days_after_sowing=days_after_sowing,
                rain_expected_soon=rain_expected_soon,
                rain_adjustment_days=0,
                rule_type="soil_override",
                rule_basis=(
                    "Farmer-reported field condition indicates "
                    "excess moisture."
                ),
                reason=(
                    "The field is reported as too wet. "
                    "Do not irrigate until excess moisture reduces."
                ),
            )

        # --------------------------------------------------------------
        # 3. CROP-SPECIFIC RULE
        # --------------------------------------------------------------

        if self.crop == "wheat":
            result = self._evaluate_wheat(
                today=today,
                sowing_date=effective_sowing_date,
                last_irrigation_date=last_irrigation_date,
                soil_type=soil_type,
                selected_stage=normalized_stage,
                days_after_sowing=days_after_sowing,
            )

        elif self.crop == "rice":
            result = self._evaluate_rice(
                today=today,
                sowing_date=effective_sowing_date,
                last_irrigation_date=last_irrigation_date,
                soil_type=soil_type,
                selected_stage=normalized_stage,
                days_after_sowing=days_after_sowing,
            )

        elif self.crop == "maize":
            result = self._evaluate_maize(
                today=today,
                sowing_date=effective_sowing_date,
                last_irrigation_date=last_irrigation_date,
                soil_type=soil_type,
                selected_stage=normalized_stage,
                days_after_sowing=days_after_sowing,
            )

        elif self.crop == "potato":
            result = self._evaluate_potato(
                today=today,
                last_irrigation_date=last_irrigation_date,
                soil_type=soil_type,
                selected_stage=normalized_stage,
                days_after_sowing=days_after_sowing,
            )

        elif self.crop == "sugarcane":
            result = self._evaluate_sugarcane(
                today=today,
                last_irrigation_date=last_irrigation_date,
                soil_type=soil_type,
                selected_stage=normalized_stage,
                days_after_sowing=days_after_sowing,
            )

        elif self.crop == "tomato":
            result = self._evaluate_tomato(
                today=today,
                last_irrigation_date=last_irrigation_date,
                soil_type=soil_type,
                selected_stage=normalized_stage,
                days_after_sowing=days_after_sowing,
            )

        elif self.crop == "cassava":
            result = self._evaluate_cassava(
                today=today,
                sowing_date=effective_sowing_date,
                last_irrigation_date=last_irrigation_date,
                soil_type=soil_type,
                selected_stage=normalized_stage,
                days_after_sowing=days_after_sowing,
            )

        elif self.crop == "apple":
            result = self._evaluate_apple(
                today=today,
                last_irrigation_date=last_irrigation_date,
                soil_type=soil_type,
                selected_stage=normalized_stage,
                days_after_sowing=days_after_sowing,
            )

        elif self.crop == "tea":
            result = self._evaluate_tea(
                today=today,
                last_irrigation_date=last_irrigation_date,
                soil_type=soil_type,
                selected_stage=normalized_stage,
                days_after_sowing=days_after_sowing,
            )

        else:
            result = self._build_result(
                decision="WAIT",
                decision_label="More information needed",
                stage=normalized_stage,
                stage_priority="normal",
                recommended_date=None,
                soil_type=soil_type,
                soil_feedback=feedback,
                days_after_sowing=days_after_sowing,
                rain_expected_soon=rain_expected_soon,
                rain_adjustment_days=0,
                rule_type="insufficient_data",
                rule_basis="No crop-specific evaluation is available.",
                reason="More information is needed.",
            )

        # --------------------------------------------------------------
        # 4. RAIN ADJUSTMENT
        # --------------------------------------------------------------

        recommended_date = result.get("recommended_date")

        if (
            recommended_date is not None
            and rain_expected_soon
            and rain_adjustment_days > 0
        ):
            adjusted_date = (
                recommended_date
                + timedelta(days=rain_adjustment_days)
            )

            result["recommended_date"] = adjusted_date
            result["rain_adjustment_days"] = rain_adjustment_days

            if adjusted_date > today:
                result["decision"] = "WAIT"
                result["decision_label"] = "Wait"

                result["reason"] = (
                    result["reason"]
                    + f" Rain is expected, so irrigation is "
                      f"delayed by {rain_adjustment_days} day(s)."
                )

        # --------------------------------------------------------------
        # 5. TOO-DRY FARMER OVERRIDE
        # --------------------------------------------------------------

        if feedback == "too dry":
            result["decision"] = "IRRIGATE_TODAY"
            result["decision_label"] = "Yes — irrigate today"

            result["recommended_date"] = today

            result["reason"] = (
                "The field is reported as too dry. "
                "Irrigation is recommended today despite the "
                "normal schedule."
            )

            result["rule_type"] = "soil_override"

        return result

    # ------------------------------------------------------------------
    # Wheat
    # ------------------------------------------------------------------

    def _evaluate_wheat(
        self,
        today: date,
        sowing_date: Optional[date],
        last_irrigation_date: Optional[date],
        soil_type: Optional[str],
        selected_stage: Optional[str],
        days_after_sowing: Optional[int],
    ) -> Dict[str, Any]:

        if sowing_date is None:
            return self._insufficient_data(
                stage=selected_stage,
                soil_type=soil_type,
                days_after_sowing=days_after_sowing,
                reason=(
                    "Wheat irrigation timing depends on "
                    "sowing date."
                ),
            )

        critical_stages = {
            "Crown Root Initiation",
            "Heading/Flowering",
            "Grain Filling",
        }

        priority = (
            "high"
            if selected_stage in critical_stages
            else "normal"
        )

        # --------------------------------------------------------------
        # First irrigation
        # --------------------------------------------------------------

        if last_irrigation_date is None:

            if sowing_date.month == 10:
                interval_days = 21
            else:
                interval_days = 28

            # Heavy paddy soils: delay first irrigation by ~1 week
            if soil_type:
                soil_lower = soil_type.lower()

                if (
                    "heavy" in soil_lower
                    or "clay" in soil_lower
                    or "paddy" in soil_lower
                ):
                    interval_days += 7

                # Light soils: advance first irrigation
                elif (
                    "light" in soil_lower
                    or "sandy" in soil_lower
                ):
                    interval_days -= 2

            recommended_date = (
                sowing_date
                + timedelta(days=interval_days)
            )

            return self._scheduled_result(
                today=today,
                recommended_date=recommended_date,
                stage=selected_stage,
                priority=priority,
                soil_type=soil_type,
                days_after_sowing=days_after_sowing,
                rule_type="wheat_first_irrigation",
                rule_basis=(
                    "PAU wheat irrigation guidance: first irrigation "
                    "around 3 weeks for October-sown wheat and around "
                    "4 weeks for later-sown wheat, with adjustment "
                    "for soil conditions."
                ),
            )

        # --------------------------------------------------------------
        # Subsequent irrigations
        # --------------------------------------------------------------

        interval_days = self._wheat_subsequent_interval(
            sowing_date=sowing_date
        )

        recommended_date = (
            last_irrigation_date
            + timedelta(days=interval_days)
        )

        return self._scheduled_result(
            today=today,
            recommended_date=recommended_date,
            stage=selected_stage,
            priority=priority,
            soil_type=soil_type,
            days_after_sowing=days_after_sowing,
            rule_type="wheat_subsequent_irrigation",
            rule_basis=(
                "PAU wheat irrigation schedule based on sowing "
                "period and subsequent irrigation intervals."
            ),
        )

    def _wheat_subsequent_interval(
        self,
        sowing_date: date,
    ) -> int:

        month = sowing_date.month
        day = sowing_date.day

        # Up to 21 November:
        # 5-6 weeks, 5-6 weeks, 4 weeks
        if (month == 10) or (month == 11 and day <= 21):
            return 35

        # 22 Nov - 20 Dec:
        # 5-6 weeks, 3-4 weeks, 2 weeks
        if (
            (month == 11 and day >= 22)
            or month == 12 and day <= 20
        ):
            return 35

        # 21 Dec - 15 Jan:
        # 4 weeks, 3 weeks, 2 weeks
        if (
            (month == 12 and day >= 21)
            or (month == 1 and day <= 15)
        ):
            return 28

        # Conservative fallback for later sowing
        return 21

    # ------------------------------------------------------------------
    # Rice
    # ------------------------------------------------------------------

    def _evaluate_rice(
        self,
        today: date,
        sowing_date: Optional[date],
        last_irrigation_date: Optional[date],
        soil_type: Optional[str],
        selected_stage: Optional[str],
        days_after_sowing: Optional[int],
    ) -> Dict[str, Any]:

        if sowing_date is None and last_irrigation_date is None:
            return self._insufficient_data(
                stage=selected_stage,
                soil_type=soil_type,
                days_after_sowing=days_after_sowing,
                reason=(
                    "Rice irrigation timing requires a "
                    "sowing/transplanting reference date."
                ),
            )

        critical_stages = {
            "Flowering",
            "Heading/Flowering",
            "Grain Filling",
        }

        priority = (
            "high"
            if selected_stage in critical_stages
            else "normal"
        )

        # Current Farm model does not store irrigation method.
        # Therefore transplanted rice is the default interpretation.

        if last_irrigation_date is None:

            if days_after_sowing is not None and days_after_sowing < 14:
                return self._build_result(
                    decision="WAIT",
                    decision_label="Wait",
                    stage=selected_stage,
                    stage_priority=priority,
                    recommended_date=None,
                    soil_type=soil_type,
                    soil_feedback=None,
                    days_after_sowing=days_after_sowing,
                    rain_expected_soon=False,
                    rain_adjustment_days=0,
                    rule_type="rice_transplanted_initial",
                    rule_basis=(
                        "PAU transplanted rice guidance: keep water "
                        "ponded continuously for the first two weeks "
                        "after transplanting."
                    ),
                    reason=(
                        "Rice is within the first two weeks after "
                        "transplanting. Maintain the recommended "
                        "water condition rather than scheduling "
                        "a separate irrigation event."
                    ),
                )

            return self._build_result(
                decision="WAIT",
                decision_label="Wait",
                stage=selected_stage,
                stage_priority=priority,
                recommended_date=None,
                soil_type=soil_type,
                soil_feedback=None,
                days_after_sowing=days_after_sowing,
                rain_expected_soon=False,
                rain_adjustment_days=0,
                rule_type="rice_transplanted_condition_based",
                rule_basis=(
                    "PAU guidance: after the initial ponded period, "
                    "irrigate about two days after ponded water "
                    "infiltrates."
                ),
                reason=(
                    "Rice irrigation after the initial ponded period "
                    "depends on field water infiltration. Monitor "
                    "the field rather than following an arbitrary "
                    "fixed interval."
                ),
            )

        # After the first irrigation, transplanted rice needs field-
        # condition information because the source rule is based on
        # ponded-water infiltration rather than a fixed calendar date.

        return self._build_result(
            decision="WAIT",
            decision_label="Wait",
            stage=selected_stage,
            stage_priority=priority,
            recommended_date=None,
            soil_type=soil_type,
            soil_feedback=None,
            days_after_sowing=days_after_sowing,
            rain_expected_soon=False,
            rain_adjustment_days=0,
            rule_type="rice_infiltration_based",
            rule_basis=(
                "PAU guidance: after ponded water infiltrates, "
                "apply irrigation after approximately two days."
            ),
            reason=(
                "Rice irrigation depends on the field water "
                "condition. Check whether the previous ponded water "
                "has infiltrated before irrigating again."
            ),
        )

    # ------------------------------------------------------------------
    # Maize
    # ------------------------------------------------------------------

    def _evaluate_maize(
        self,
        today: date,
        sowing_date: Optional[date],
        last_irrigation_date: Optional[date],
        soil_type: Optional[str],
        selected_stage: Optional[str],
        days_after_sowing: Optional[int],
    ) -> Dict[str, Any]:

        critical_stages = {
            "Pre-tasselling",
            "Silking",
            "Grain Filling",
            "Tasselling",
        }

        priority = (
            "high"
            if selected_stage in critical_stages
            else "normal"
        )

        if last_irrigation_date is None:
            return self._build_result(
                decision="WAIT",
                decision_label="Wait",
                stage=selected_stage,
                stage_priority=priority,
                recommended_date=None,
                soil_type=soil_type,
                soil_feedback=None,
                days_after_sowing=days_after_sowing,
                rain_expected_soon=False,
                rain_adjustment_days=0,
                rule_type="maize_stage_based",
                rule_basis=(
                    "PAU maize guidance: irrigation requirement "
                    "depends on rainfall and crop stage, with "
                    "adequate moisture especially important around "
                    "pre-tasselling, silking and grain filling."
                ),
                reason=(
                    "Maize irrigation should be based on crop stage "
                    "and field moisture rather than an arbitrary "
                    "fixed interval."
                ),
            )

        # PAU recommends approximately 4–6 irrigations depending
        # on rainfall, but does not prescribe one universal interval.
        # Therefore no artificial fixed interval is introduced.

        return self._build_result(
            decision="WAIT",
            decision_label="Wait",
            stage=selected_stage,
            stage_priority=priority,
            recommended_date=None,
            soil_type=soil_type,
            soil_feedback=None,
            days_after_sowing=days_after_sowing,
            rain_expected_soon=False,
            rain_adjustment_days=0,
            rule_type="maize_stage_based",
            rule_basis=(
                "PAU maize guidance: generally 4–6 irrigations "
                "depending on rainfall; adequate moisture is "
                "particularly important before tasselling, during "
                "silking and during grain filling."
            ),
            reason=(
                "No fixed irrigation date is imposed for maize. "
                "Monitor field moisture and give priority to "
                "critical crop stages."
            ),
        )

    # ------------------------------------------------------------------
    # Potato
    # ------------------------------------------------------------------

    def _evaluate_potato(
        self,
        today: date,
        last_irrigation_date: Optional[date],
        soil_type: Optional[str],
        selected_stage: Optional[str],
        days_after_sowing: Optional[int],
    ) -> Dict[str, Any]:

        critical_stages = {
            "Stolon Formation",
            "Tuber Initiation",
            "Tuber Development",
            "Tuber Bulking",
        }

        priority = (
            "high"
            if selected_stage in critical_stages
            else "normal"
        )

        if last_irrigation_date is None:
            return self._build_result(
                decision="WAIT",
                decision_label="Wait",
                stage=selected_stage,
                stage_priority=priority,
                recommended_date=None,
                soil_type=soil_type,
                soil_feedback=None,
                days_after_sowing=days_after_sowing,
                rain_expected_soon=False,
                rain_adjustment_days=0,
                rule_type="potato_stage_based",
                rule_basis=(
                    "Potato guidance emphasizes adequate moisture "
                    "during stolon formation, tuber initiation and "
                    "tuber development."
                ),
                reason=(
                    "Monitor field moisture closely, especially "
                    "during tuber initiation and development."
                ),
            )

        recommended_date = (
            last_irrigation_date + timedelta(days=7)
        )

        return self._scheduled_result(
            today=today,
            recommended_date=recommended_date,
            stage=selected_stage,
            priority=priority,
            soil_type=soil_type,
            days_after_sowing=days_after_sowing,
            rule_type="potato_interval",
            rule_basis=(
                "Potato package-of-practices guidance generally "
                "places irrigation around a 7–10 day interval, "
                "subject to soil and weather conditions."
            ),
        )

    # ------------------------------------------------------------------
    # Sugarcane
    # ------------------------------------------------------------------

    def _evaluate_sugarcane(
        self,
        today: date,
        last_irrigation_date: Optional[date],
        soil_type: Optional[str],
        selected_stage: Optional[str],
        days_after_sowing: Optional[int],
    ) -> Dict[str, Any]:

        month = today.month

        if 4 <= month <= 6:
            interval_days = 7
            rule_type = "sugarcane_april_june"
            basis = (
                "PAU sugarcane guidance: irrigation approximately "
                "every 7–12 days during April–June."
            )

        elif month in {11, 12, 1}:
            interval_days = 30
            rule_type = "sugarcane_winter"
            basis = (
                "PAU sugarcane guidance: approximately monthly "
                "irrigation during November–January."
            )

        else:
            return self._build_result(
                decision="WAIT",
                decision_label="Wait",
                stage=selected_stage,
                stage_priority="normal",
                recommended_date=None,
                soil_type=soil_type,
                soil_feedback=None,
                days_after_sowing=days_after_sowing,
                rain_expected_soon=False,
                rain_adjustment_days=0,
                rule_type="sugarcane_rainfall_based",
                rule_basis=(
                    "PAU sugarcane guidance: irrigation during the "
                    "rainy season should be adjusted according to "
                    "rainfall."
                ),
                reason=(
                    "Sugarcane irrigation should be adjusted "
                    "according to rainfall during this period."
                ),
            )

        if last_irrigation_date is None:
            recommended_date = today
        else:
            recommended_date = (
                last_irrigation_date
                + timedelta(days=interval_days)
            )

        return self._scheduled_result(
            today=today,
            recommended_date=recommended_date,
            stage=selected_stage,
            priority="normal",
            soil_type=soil_type,
            days_after_sowing=days_after_sowing,
            rule_type=rule_type,
            rule_basis=basis,
        )

    # ------------------------------------------------------------------
    # Tomato
    # ------------------------------------------------------------------

    def _evaluate_tomato(
        self,
        today: date,
        last_irrigation_date: Optional[date],
        soil_type: Optional[str],
        selected_stage: Optional[str],
        days_after_sowing: Optional[int],
    ) -> Dict[str, Any]:

        critical_stages = {
            "Flowering",
            "Fruit Set",
            "Fruit Development",
        }

        priority = (
            "high"
            if selected_stage in critical_stages
            else "normal"
        )

        interval_days = 5

        if last_irrigation_date is None:
            recommended_date = today
        else:
            recommended_date = (
                last_irrigation_date
                + timedelta(days=interval_days)
            )

        return self._scheduled_result(
            today=today,
            recommended_date=recommended_date,
            stage=selected_stage,
            priority=priority,
            soil_type=soil_type,
            days_after_sowing=days_after_sowing,
            rule_type="tomato_interval",
            rule_basis=(
                "ICAR Kharif Agro-Advisory 2025: tomato irrigation "
                "approximately once every 5–7 days depending on "
                "soil moisture and weather."
            ),
        )

    # ------------------------------------------------------------------
    # Cassava
    # ------------------------------------------------------------------

    def _evaluate_cassava(
        self,
        today: date,
        sowing_date: Optional[date],
        last_irrigation_date: Optional[date],
        soil_type: Optional[str],
        selected_stage: Optional[str],
        days_after_sowing: Optional[int],
    ) -> Dict[str, Any]:

        if sowing_date is None:
            return self._insufficient_data(
                stage=selected_stage,
                soil_type=soil_type,
                days_after_sowing=days_after_sowing,
                reason=(
                    "Cassava irrigation timing depends on "
                    "time after planting."
                ),
            )

        # Planting irrigation
        if last_irrigation_date is None:
            recommended_date = sowing_date

            return self._scheduled_result(
                today=today,
                recommended_date=recommended_date,
                stage=selected_stage,
                priority="normal",
                soil_type=soil_type,
                days_after_sowing=days_after_sowing,
                rule_type="cassava_planting",
                rule_basis=(
                    "TNAU cassava guidance: irrigation at planting "
                    "followed by life irrigation around day 3."
                ),
            )

        # Up to 3 months: every 7–10 days
        if days_after_sowing is not None and days_after_sowing <= 90:
            interval_days = 7

            return self._scheduled_result(
                today=today,
                recommended_date=(
                    last_irrigation_date
                    + timedelta(days=interval_days)
                ),
                stage=selected_stage,
                priority="normal",
                soil_type=soil_type,
                days_after_sowing=days_after_sowing,
                rule_type="cassava_first_three_months",
                rule_basis=(
                    "TNAU cassava guidance: irrigation at 7–10 day "
                    "intervals up to the third month."
                ),
            )

        # 3–8 months: every 20–30 days
        if (
            days_after_sowing is not None
            and days_after_sowing <= 240
        ):
            interval_days = 20

            return self._scheduled_result(
                today=today,
                recommended_date=(
                    last_irrigation_date
                    + timedelta(days=interval_days)
                ),
                stage=selected_stage,
                priority="normal",
                soil_type=soil_type,
                days_after_sowing=days_after_sowing,
                rule_type="cassava_three_to_eight_months",
                rule_basis=(
                    "TNAU cassava guidance: irrigation at "
                    "approximately 20–30 day intervals from the "
                    "third to eighth month."
                ),
            )

        return self._build_result(
            decision="WAIT",
            decision_label="Wait",
            stage=selected_stage,
            stage_priority="normal",
            recommended_date=None,
            soil_type=soil_type,
            soil_feedback=None,
            days_after_sowing=days_after_sowing,
            rain_expected_soon=False,
            rain_adjustment_days=0,
            rule_type="cassava_late_stage",
            rule_basis=(
                "Cassava irrigation requirement decreases in later "
                "stages and excessive irrigation should be avoided."
            ),
            reason=(
                "Cassava is beyond the main scheduled irrigation "
                "period. Irrigate only when field conditions require it."
            ),
        )

    # ------------------------------------------------------------------
    # Apple
    # ------------------------------------------------------------------

    def _evaluate_apple(
        self,
        today: date,
        last_irrigation_date: Optional[date],
        soil_type: Optional[str],
        selected_stage: Optional[str],
        days_after_sowing: Optional[int],
    ) -> Dict[str, Any]:

        critical_stages = {
            "Flowering",
            "Fruit Set",
            "Fruit Development",
        }

        priority = (
            "high"
            if selected_stage in critical_stages
            else "normal"
        )

        if last_irrigation_date is None:
            return self._build_result(
                decision="WAIT",
                decision_label="Wait",
                stage=selected_stage,
                stage_priority=priority,
                recommended_date=None,
                soil_type=soil_type,
                soil_feedback=None,
                days_after_sowing=days_after_sowing,
                rain_expected_soon=False,
                rain_adjustment_days=0,
                rule_type="apple_condition_based",
                rule_basis=(
                    "ICAR guidance indicates irrigation during "
                    "prolonged dry weather, with waterlogging "
                    "to be avoided."
                ),
                reason=(
                    "Apple irrigation should be based on dry-weather "
                    "conditions and field moisture rather than a "
                    "universal fixed schedule."
                ),
            )

        recommended_date = (
            last_irrigation_date
            + timedelta(days=14)
        )

        return self._scheduled_result(
            today=today,
            recommended_date=recommended_date,
            stage=selected_stage,
            priority=priority,
            soil_type=soil_type,
            days_after_sowing=days_after_sowing,
            rule_type="apple_dry_weather",
            rule_basis=(
                "ICAR guidance: during prolonged dry weather, "
                "irrigation may be given at approximately fortnightly "
                "intervals."
            ),
        )

    # ------------------------------------------------------------------
    # Tea
    # ------------------------------------------------------------------

    def _evaluate_tea(
        self,
        today: date,
        last_irrigation_date: Optional[date],
        soil_type: Optional[str],
        selected_stage: Optional[str],
        days_after_sowing: Optional[int],
    ) -> Dict[str, Any]:

        # Tea rules differ strongly between young and mature plants.
        # The current Farm model does not store tea plant age.

        return self._build_result(
            decision="WAIT",
            decision_label="Wait",
            stage=selected_stage,
            stage_priority="normal",
            recommended_date=None,
            soil_type=soil_type,
            soil_feedback=None,
            days_after_sowing=days_after_sowing,
            rain_expected_soon=False,
            rain_adjustment_days=0,
            rule_type="tea_condition_based",
            rule_basis=(
                "Tea irrigation guidance supports irrigation for "
                "young plants during dry/summer conditions, while "
                "a universal fixed interval for mature tea is not "
                "established."
            ),
            reason=(
                "Tea irrigation depends on plant age and weather "
                "conditions. The current farm information does not "
                "include tea plant age, so a fixed irrigation date "
                "is not imposed."
            ),
        )

    # ------------------------------------------------------------------
    # Rainfall
    # ------------------------------------------------------------------

    def _rain_information(
        self,
        today: date,
        forecast: List[Dict[str, Any]],
    ):

        total_rain_mm = 0.0
        rain_expected = False

        for item in forecast[:7]:

            try:
                forecast_date = date.fromisoformat(
                    item.get("date")
                )
            except Exception:
                continue

            if forecast_date < today:
                continue

            rain_value = (
                item.get("precipitation_sum")
                if item.get("precipitation_sum") is not None
                else item.get("rain_sum")
            )

            if rain_value is None:
                rain_value = item.get("precipitation")

            try:
                rain_value = float(rain_value or 0)
            except (TypeError, ValueError):
                rain_value = 0.0

            if rain_value > 0:
                rain_expected = True
                total_rain_mm += rain_value

        # PAU wheat guidance:
        # For each 1 cm (10 mm) of rain:
        # +5 days to next interval until end of January
        # +2 days after January.
        #
        # This adjustment is only applied by the caller when the
        # crop-specific recommendation has a scheduled date.

        rain_cm = int(total_rain_mm // 10)

        if today.month == 1:
            adjustment_days = rain_cm * 5
        elif today.month >= 2:
            adjustment_days = rain_cm * 2
        else:
            adjustment_days = rain_cm * 5

        return rain_expected, adjustment_days

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _scheduled_result(
        self,
        today: date,
        recommended_date: date,
        stage: Optional[str],
        priority: str,
        soil_type: Optional[str],
        days_after_sowing: Optional[int],
        rule_type: str,
        rule_basis: str,
    ) -> Dict[str, Any]:

        if recommended_date <= today:
            decision = "IRRIGATE_TODAY"
            decision_label = "Yes — irrigate today"

            reason = (
                "The crop is due for irrigation based on the "
                "crop-specific irrigation schedule."
            )

        else:
            decision = "WAIT"
            decision_label = "Wait"

            days_until = (
                recommended_date - today
            ).days

            reason = (
                f"Irrigation is expected in approximately "
                f"{days_until} day(s) based on the crop-specific "
                f"schedule."
            )

        return self._build_result(
            decision=decision,
            decision_label=decision_label,
            stage=stage,
            stage_priority=priority,
            recommended_date=recommended_date,
            soil_type=soil_type,
            soil_feedback=None,
            days_after_sowing=days_after_sowing,
            rain_expected_soon=False,
            rain_adjustment_days=0,
            rule_type=rule_type,
            rule_basis=rule_basis,
            reason=reason,
        )

    def _insufficient_data(
        self,
        stage: Optional[str],
        soil_type: Optional[str],
        days_after_sowing: Optional[int],
        reason: str,
    ) -> Dict[str, Any]:

        return self._build_result(
            decision="INSUFFICIENT_DATA",
            decision_label="More information needed",
            stage=stage,
            stage_priority=self._stage_priority(stage),
            recommended_date=None,
            soil_type=soil_type,
            soil_feedback=None,
            days_after_sowing=days_after_sowing,
            rain_expected_soon=False,
            rain_adjustment_days=0,
            rule_type="insufficient_data",
            rule_basis="Required crop timing information is unavailable.",
            reason=reason,
        )

    def _stage_priority(
        self,
        stage: Optional[str],
    ) -> str:

        high_priority_stages = {
            "Crown Root Initiation",
            "Heading/Flowering",
            "Grain Filling",
            "Flowering",
            "Fruit Set",
            "Fruit Development",
            "Tuber Initiation",
            "Tuber Development",
            "Tuber Bulking",
            "Silking",
            "Tasselling",
            "Pre-tasselling",
        }

        return (
            "high"
            if stage in high_priority_stages
            else "normal"
        )

    def _build_result(
        self,
        decision: str,
        decision_label: str,
        stage: Optional[str],
        stage_priority: str,
        recommended_date: Optional[date],
        soil_type: Optional[str],
        soil_feedback: Optional[str],
        days_after_sowing: Optional[int],
        rain_expected_soon: bool,
        rain_adjustment_days: int,
        rule_type: str,
        rule_basis: str,
        reason: str,
    ) -> Dict[str, Any]:

        return {
            "crop": self.crop,
            "decision": decision,
            "decision_label": decision_label,
            "stage": stage,
            "stage_priority": stage_priority,
            "stage_message": (
                "Critical irrigation stage."
                if stage_priority == "high"
                else "Normal irrigation stage."
            ),
            "recommended_date": (
                recommended_date.isoformat()
                if recommended_date
                else None
            ),
            "rain_adjustment_days": rain_adjustment_days,
            "rain_expected_soon": rain_expected_soon,
            "soil_type": soil_type,
            "soil_feedback": soil_feedback,
            "days_after_sowing": days_after_sowing,
            "rule_type": rule_type,
            "rule_basis": rule_basis,
            "reason": reason,
        }