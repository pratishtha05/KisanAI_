"""
KisanAI irrigation rule engine (v2).

Drop-in replacement for IrrigationRuleEngine: same constructor, same
evaluate() arguments (plus one optional `recent_rain`), same result keys
(plus new ones listed at the bottom of this docstring).

Decision order (first match wins):
  0. Input validation (future dates are ignored / rejected)
  1. Crop stage resolution (farmer-selected stage, else inferred from DAS)
  2. Stage says "stop irrigating" (maturity / harvest)    -> NOT_NEEDED
  3. Farmer reports "too wet"                              -> WAIT
  4. Schedule:
       - no irrigation logged  -> FIRST IRRIGATION advisory (stage / DAS based)
       - irrigation logged     -> last irrigation + stage interval,
                                  adjusted for soil, heat and recent rain
  5. Rain forecast: shift future dates, defer irrigation that is due
  6. Farmer reports "too dry"                              -> irrigate today
                                                              (unless heavy rain is imminent)

First-irrigation flow (no last_irrigation_date):
  The engine never invents a "last irrigation". It tells the farmer whether
  the first irrigation is due now / on a given date, based on sowing date and
  crop stage, and sets show_irrigated_button=True. When the farmer taps
  "I irrigated today" the app stores last_irrigation_date=today and every
  later call runs on the interval logic. The UI should also allow a back-dated
  tap ("I irrigated N days ago") for farmers who irrigated before using the app.

New result keys: urgency, needs_first_irrigation, show_irrigated_button,
next_check_date, days_until_due, reference_date, advisories, warnings,
weather_note.

NUMBERS: values marked `# PAU/TNAU/ICAR` are inherited from your original
engine. Values marked `# VERIFY` are agronomic defaults added in this rewrite
and should be checked against your government PDFs before release.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Tuple

from app.modules.irrigation.rules_config import CROP_ALIASES

# ----------------------------------------------------------------------
# Tunables
# ----------------------------------------------------------------------
MIN_INTERVAL_DAYS = 2          # never schedule irrigations closer than this
HEAVY_RAIN_MM = 10.0           # next 48 h: skip irrigation
MODERATE_RAIN_MM = 5.0         # next 48 h: defer one day unless badly overdue
RAIN_EFFECTIVE_MM = 12.0       # past rain >= this counts as an irrigation  # VERIFY
RECENT_RAIN_DAYS = 3
LOW_RAIN_PROBABILITY = 40.0    # % below which forecast rain is ignored
STRONG_WIND_KMH = 30.0
STALE_LOG_DAYS = 45


# ----------------------------------------------------------------------
# Crop data model
# ----------------------------------------------------------------------
@dataclass(frozen=True)
class Stage:
    name: str
    start: int                      # days after sowing/transplanting (inclusive)
    end: int
    interval: Optional[int]         # days between irrigations; None = rain-fed / no fixed schedule
    critical: bool = False
    stops_irrigation: bool = False  # maturity / harvest
    advice: str = ""


@dataclass
class CropProfile:
    stages: Tuple[Stage, ...]
    first_stage: str                # first irrigation is due once the crop reaches this stage
    first_das: int                  # ...or this many days after sowing, whichever comes first
    basis_first: str
    basis_interval: str
    perennial: bool = False
    default_stage: Optional[str] = None            # perennials only
    rain_credit_days: int = 3       # days added to the schedule per 10 mm of useful rain
    temp_adjust: bool = True
    first_das_fn: Optional[Callable[[date], int]] = None
    first_soil_shift: Dict[str, int] = field(default_factory=dict)
    soil_factor: Dict[str, float] = field(
        default_factory=lambda: {"light": 0.8, "medium": 1.0, "heavy": 1.2}
    )
    interval_override: Optional[
        Callable[[date, Stage, Optional[date]], Optional[int]]
    ] = None


def _wheat_interval(today: date, stage: Stage, sowing: Optional[date]) -> Optional[int]:
    """PAU subsequent-irrigation spacing by sowing window (from original engine)."""
    if sowing is None:
        base = 28  # VERIFY: fallback when sowing date is unknown
    else:
        m, d = sowing.month, sowing.day
        if m == 10 or (m == 11 and d <= 21):
            base = 35  # PAU
        elif m == 11 or (m == 12 and d <= 20):
            base = 35  # PAU
        elif m == 12 or (m == 1 and d <= 15):
            base = 28  # PAU
        else:
            base = 21  # conservative fallback from original engine
    if stage.critical:
        base = min(base, 28)  # VERIFY: do not leave 5 weeks between irrigations at flowering/grain fill
    return base


def _wheat_first_das(sowing: date) -> int:
    return 21 if sowing.month == 10 else 28  # PAU


def _sugarcane_interval(today: date, stage: Stage, sowing: Optional[date]) -> Optional[int]:
    m = today.month
    if 4 <= m <= 6:
        return 7            # PAU (7-12 days)
    if m in (11, 12, 1):
        return 30           # PAU
    if m in (2, 3):
        return 15           # VERIFY
    if m == 10:
        return 20           # VERIFY
    return None             # Jul-Sep: rainfall based (original engine)


def _tea_interval(today: date, stage: Stage, sowing: Optional[date]) -> Optional[int]:
    return 7 if today.month in (11, 12, 1, 2, 3, 4) else None  # VERIFY: dry season only


CROP_PROFILES: Dict[str, CropProfile] = {
    "wheat": CropProfile(
        stages=(
            Stage("Establishment", 0, 20, 21, advice="Ensure good seedbed moisture for germination."),
            Stage("Crown Root Initiation", 21, 45, 28, critical=True,
                  advice="CRI is the most critical wheat stage. Do not skip this irrigation."),
            Stage("Tillering", 46, 65, 28, advice="Keep moisture adequate to support tiller formation."),
            Stage("Jointing/Booting", 66, 85, 28, advice="Maintain moisture; avoid water stress during stem elongation."),
            Stage("Heading/Flowering", 86, 105, 21, critical=True,
                  advice="Avoid water stress at flowering. Irrigate lightly and avoid windy days to reduce lodging risk."),
            Stage("Grain Filling", 106, 130, 21, critical=True,
                  advice="Last irrigations matter for grain weight. Irrigate lightly, avoid windy days (lodging)."),
            Stage("Maturity", 131, 160, None, stops_irrigation=True,
                  advice="Crop is maturing. Stop irrigation and plan harvest."),   # VERIFY cut-off
            Stage("Harvest", 161, 400, None, stops_irrigation=True,
                  advice="Do not irrigate. Complete harvest."),
        ),
        first_stage="Crown Root Initiation", first_das=28,
        basis_first="PAU wheat: first irrigation ~3 weeks after sowing (October sowing), ~4 weeks for later sowing; "
                    "delayed ~1 week on heavy soils, advanced on light soils.",
        basis_interval="PAU wheat irrigation schedule by sowing window; shortened at critical stages.",
        rain_credit_days=5,  # PAU: +5 days per cm of rain until Jan, +2 afterwards (handled in _rain_credit)
        first_das_fn=_wheat_first_das,
        first_soil_shift={"heavy": 7, "light": -2},  # PAU
        interval_override=_wheat_interval,
    ),
    "rice": CropProfile(
        stages=(
            Stage("Establishment", 0, 14, 3, advice="Keep 2-5 cm of standing water for the first two weeks after transplanting."),  # PAU
            Stage("Tillering", 15, 45, 4, advice="Irrigate about 2 days after ponded water has soaked in (alternate wetting and drying)."),  # PAU
            Stage("Panicle Initiation", 46, 65, 3, critical=True, advice="Do not let the field dry out. Keep soil saturated."),
            Stage("Flowering", 66, 85, 3, critical=True, advice="Most sensitive stage. Keep a thin layer of water; avoid drying."),
            Stage("Grain Filling", 86, 105, 4, critical=True, advice="Keep soil moist; avoid cracks in the field."),
            Stage("Maturity", 106, 150, None, stops_irrigation=True,
                  advice="Drain the field and stop irrigation 10-15 days before harvest."),  # VERIFY days
            Stage("Harvest", 151, 400, None, stops_irrigation=True, advice="Do not irrigate."),
        ),
        first_stage="Establishment", first_das=0,
        basis_first="PAU transplanted rice: keep water ponded for the first two weeks after transplanting.",
        basis_interval="PAU rice: irrigate about 2 days after ponded water infiltrates (3-5 day cycle by soil).",
        temp_adjust=False,
        soil_factor={"light": 0.75, "medium": 1.0, "heavy": 1.25},
    ),
    "maize": CropProfile(
        stages=(
            Stage("Establishment", 0, 24, 12, advice="Light irrigation only if the seedbed is dry."),
            Stage("Vegetative", 25, 44, 12, advice="Irrigate at knee-high stage if rainfall has been poor."),
            Stage("Pre-tasselling", 45, 54, 8, critical=True, advice="Moisture stress now cuts yield. Do not delay irrigation."),
            Stage("Tasselling", 55, 62, 8, critical=True, advice="Critical stage. Keep soil moist."),
            Stage("Silking", 63, 72, 8, critical=True, advice="Most sensitive stage. A missed irrigation here causes poor grain set."),
            Stage("Grain Filling", 73, 95, 10, critical=True, advice="Maintain moisture until the dough stage."),
            Stage("Maturity", 96, 130, None, stops_irrigation=True, advice="Stop irrigation. Plan harvest."),
            Stage("Harvest", 131, 400, None, stops_irrigation=True, advice="Do not irrigate."),
        ),  # all maize intervals: VERIFY (PAU gives 4-6 irrigations, no fixed interval)
        first_stage="Vegetative", first_das=25,
        basis_first="PAU maize: 4-6 irrigations depending on rain; first at knee-high stage (default 25 days).",
        basis_interval="PAU maize: moisture critical at pre-tasselling, silking and grain filling.",
        rain_credit_days=3,
    ),
    "potato": CropProfile(
        stages=(
            Stage("Establishment", 0, 14, 10, advice="Light irrigation. Avoid waterlogging of seed tubers."),
            Stage("Stolon Formation", 15, 29, 7, critical=True, advice="Keep soil evenly moist."),
            Stage("Tuber Initiation", 30, 44, 7, critical=True, advice="Water stress now reduces tuber number."),
            Stage("Tuber Bulking", 45, 79, 7, critical=True, advice="Keep moisture even to avoid cracking and hollow heart."),
            Stage("Maturity", 80, 110, None, stops_irrigation=True,
                  advice="Stop irrigation about 10 days before haulm cutting so skins can set."),  # VERIFY
            Stage("Harvest", 111, 400, None, stops_irrigation=True, advice="Do not irrigate."),
        ),
        first_stage="Establishment", first_das=10,
        basis_first="Potato package of practices: first light irrigation around 10 days after planting.",  # VERIFY
        basis_interval="Potato package of practices: 7-10 day interval depending on soil and weather.",
    ),
    "sugarcane": CropProfile(
        stages=(
            Stage("Establishment", 0, 45, 15, advice="Keep moisture adequate for germination."),
            Stage("Tillering", 46, 120, 15, critical=True, advice="Moisture stress reduces tiller number."),
            Stage("Grand Growth", 121, 270, 15, critical=True, advice="Peak water demand. Do not let the crop wilt."),
            Stage("Maturity", 271, 400, None, stops_irrigation=True,
                  advice="Stop irrigation 3-4 weeks before harvest to improve sugar content."),  # VERIFY
            Stage("Harvest", 401, 700, None, stops_irrigation=True, advice="Do not irrigate."),
        ),
        first_stage="Establishment", first_das=0,
        basis_first="Irrigate at planting, then follow the seasonal schedule.",
        basis_interval="PAU sugarcane: 7-12 days in April-June, about monthly in November-January, rainfall based in monsoon.",
        interval_override=_sugarcane_interval,
    ),
    "tomato": CropProfile(
        stages=(
            Stage("Establishment", 0, 14, 3, advice="Irrigate at transplanting and keep soil moist for establishment."),
            Stage("Vegetative", 15, 34, 5, advice="Regular light irrigation."),
            Stage("Flowering", 35, 54, 5, critical=True, advice="Avoid water stress: flower drop. Keep moisture even."),
            Stage("Fruit Set", 55, 74, 5, critical=True, advice="Keep moisture even to prevent blossom-end rot."),
            Stage("Fruit Development", 75, 104, 5, critical=True, advice="Even moisture avoids fruit cracking."),
            Stage("Harvest", 105, 180, 7,
                  advice="Picking continues, so reduce but do not stop irrigation. Avoid heavy irrigation just before picking."),
        ),  # VERIFY stage lengths; ICAR: 5-7 days
        first_stage="Establishment", first_das=0,
        basis_first="Irrigate at transplanting (ICAR).",
        basis_interval="ICAR Kharif Agro-Advisory 2025: tomato irrigation every 5-7 days depending on soil moisture and weather.",
    ),
    "cassava": CropProfile(
        stages=(
            Stage("Establishment", 0, 10, 3, advice="Life irrigation around day 3 after planting."),   # TNAU
            Stage("Vegetative", 11, 90, 7, advice="Irrigate every 7-10 days."),                         # TNAU
            Stage("Tuber Bulking", 91, 240, 20, advice="Irrigate every 20-30 days; avoid excess water."),  # TNAU
            Stage("Maturity", 241, 330, None,
                  advice="Irrigation need is low. Irrigate only if the field is clearly dry."),
            Stage("Harvest", 331, 500, None, stops_irrigation=True, advice="Do not irrigate."),
        ),
        first_stage="Establishment", first_das=0,
        basis_first="TNAU cassava: irrigation at planting, life irrigation around day 3.",
        basis_interval="TNAU cassava: 7-10 days up to month 3, 20-30 days from month 3 to 8.",
    ),
    "apple": CropProfile(
        stages=(
            Stage("Dormancy", 0, 0, None, stops_irrigation=True, advice="Dormant season. No irrigation needed."),
            Stage("Flowering", 0, 0, 14, critical=True, advice="Avoid both drought and waterlogging."),
            Stage("Fruit Set", 0, 0, 14, critical=True, advice="Keep moisture steady for fruit retention."),
            Stage("Fruit Development", 0, 0, 14, critical=True, advice="Steady moisture improves fruit size. Avoid waterlogging."),
            Stage("Active Growth", 0, 0, 14, advice="Irrigate in prolonged dry weather; avoid waterlogging."),
            Stage("Harvest", 0, 0, None, stops_irrigation=True,
                  advice="Avoid irrigation just before harvest; it hurts fruit quality and storage."),  # VERIFY
        ),
        first_stage="Active Growth", first_das=0, perennial=True, default_stage="Active Growth",
        basis_first="ICAR apple: irrigate during prolonged dry weather.",
        basis_interval="ICAR apple: about fortnightly irrigation during prolonged dry weather.",
    ),
    "tea": CropProfile(
        stages=(
            Stage("Dormancy", 0, 0, None, stops_irrigation=True, advice="Dormant period. No irrigation needed."),  # VERIFY
            Stage("Active Growth", 0, 0, 7, advice="Irrigate in the dry season. Plant age is not recorded, so young plants may need closer attention."),
        ),
        first_stage="Active Growth", first_das=0, perennial=True, default_stage="Active Growth",
        basis_first="Tea: irrigate in the dry season.",
        basis_interval="Tea: 7-day dry-season cycle; rain-fed in the wet season.",  # VERIFY
        interval_override=_tea_interval,
    ),
}


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
GENERIC_STAGE_ALIASES = {
    "sown": "establishment", "sowing": "establishment", "germination": "establishment",
    "emergence": "establishment", "transplanting": "establishment", "planting": "establishment",
    "cri": "crown root initiation",
    "mature": "maturity", "ripening": "maturity",
    "harvesting": "harvest",
    "grain filling stage": "grain filling", "milk stage": "grain filling", "dough stage": "grain filling",
    "tuber development": "tuber bulking",
    "knee high": "vegetative",
    "tasseling": "tasselling", "pre tasseling": "pre tasselling",
    "fruiting": "fruit development",
}


def _norm(value: str) -> str:
    return " ".join(value.strip().lower().replace("-", " ").replace("_", " ").split())


def _to_date(value: Any) -> Optional[date]:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def _num(item: Dict[str, Any], *keys: str) -> Optional[float]:
    for k in keys:
        v = item.get(k)
        if v is not None:
            try:
                return float(v)
            except (TypeError, ValueError):
                continue
    return None


class IrrigationRuleEngine:
    def __init__(self, crop: str):
        self.original_crop = crop
        self.crop = self._normalize_crop(crop)
        if self.crop not in CROP_PROFILES:
            raise ValueError(f"Irrigation rules are not available for crop: {crop}")
        self.profile = CROP_PROFILES[self.crop]

    # ------------------------------------------------------------------
    # Normalisation / stage resolution
    # ------------------------------------------------------------------
    def _normalize_crop(self, crop: str) -> str:
        value = (crop or "").strip().lower()
        return CROP_ALIASES.get(value, value)

    def _match_stage(self, name: Optional[str]) -> Optional[Stage]:
        if not name:
            return None
        v = _norm(name)
        v = GENERIC_STAGE_ALIASES.get(v, v)
        candidates = {v} | {GENERIC_STAGE_ALIASES.get(c, c) for c in (_norm(t) for t in v.split("/"))}
        for st in self.profile.stages:
            sn = _norm(st.name)
            tokens = {_norm(t) for t in sn.split("/")}
            if candidates & ({sn} | tokens):
                return st
        return None

    def _normalize_stage(self, stage: Optional[str]) -> Optional[str]:
        """Kept for backwards compatibility with callers of the old engine."""
        m = self._match_stage(stage)
        return m.name if m else stage

    def _stage_index(self, stage: Stage) -> int:
        return self.profile.stages.index(stage)

    def _infer_stage(self, das: int) -> Stage:
        stages = self.profile.stages
        for st in stages:
            if st.start <= das <= st.end:
                return st
        return stages[-1] if das > stages[-1].end else stages[0]

    def _resolve_stage(self, selected: Optional[str], das: Optional[int], warnings: List[str]) -> Optional[Stage]:
        p = self.profile
        chosen = self._match_stage(selected)
        if selected and chosen is None:
            warnings.append(f"Stage '{selected}' is not recognised for {self.crop}; it was ignored.")
        inferred = self._infer_stage(das) if (das is not None and not p.perennial) else None
        if chosen:
            if inferred and abs(self._stage_index(chosen) - self._stage_index(inferred)) >= 2:
                warnings.append(
                    f"Selected stage '{chosen.name}' does not match {das} days since sowing "
                    f"(typically '{inferred.name}'). Please confirm the crop stage."
                )
            return chosen
        if inferred:
            return inferred
        if p.perennial:
            return self._match_stage(p.default_stage)
        return None

    @staticmethod
    def _soil_class(soil_type: Optional[str]) -> str:
        s = (soil_type or "").lower()
        if any(k in s for k in ("heavy", "clay", "paddy", "black")):
            return "heavy"
        if any(k in s for k in ("light", "sand")):
            return "light"
        return "medium"

    # ------------------------------------------------------------------
    # Weather
    # ------------------------------------------------------------------
    def _weather(self, today: date, forecast: Optional[List[Dict[str, Any]]],
                 recent_rain: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
        rain_by_date: Dict[date, float] = {}
        past: Dict[date, float] = {}
        tmax: List[float] = []
        winds: List[float] = []

        for item in list(recent_rain or []) + list(forecast or []):
            if not isinstance(item, dict):
                continue
            d = _to_date(item.get("date"))
            if d is None:
                continue
            mm = _num(item, "precipitation_sum", "rain_sum", "precipitation") or 0.0
            if d < today:
                if (today - d).days <= RECENT_RAIN_DAYS:
                    past[d] = max(past.get(d, 0.0), mm)
                continue
            if d > today + timedelta(days=7):
                continue
            prob = _num(item, "precipitation_probability_max", "precipitation_probability", "rain_probability")
            if prob is not None and prob < LOW_RAIN_PROBABILITY:
                mm = 0.0
            rain_by_date[d] = max(rain_by_date.get(d, 0.0), mm)
            if d <= today + timedelta(days=2):
                t = _num(item, "temperature_max", "temperature_2m_max", "temp_max", "tmax")
                if t is not None:
                    tmax.append(t)
                w = _num(item, "wind_speed_max", "wind_speed_10m_max", "wind_max")
                if w is not None:
                    winds.append(w)

        rain_48h = sum(mm for d, mm in rain_by_date.items() if d <= today + timedelta(days=1))
        eff = [d for d, mm in past.items() if mm >= RAIN_EFFECTIVE_MM]
        return {
            "rain_by_date": rain_by_date,
            "rain_48h": rain_48h,
            "rain_7d": sum(rain_by_date.values()),
            "recent_rain_date": max(eff) if eff else None,
            "avg_tmax": (sum(tmax) / len(tmax)) if tmax else None,
            "max_wind": max(winds) if winds else None,
        }

    @staticmethod
    def _temp_factor(avg_tmax: Optional[float]) -> Tuple[float, Optional[str]]:
        if avg_tmax is None:
            return 1.0, None
        if avg_tmax >= 40:
            return 0.75, f"Very hot spell (about {avg_tmax:.0f}°C): irrigation interval shortened."
        if avg_tmax >= 35:
            return 0.85, f"Hot spell (about {avg_tmax:.0f}°C): irrigation interval shortened."
        if avg_tmax <= 16:
            return 1.15, f"Cool weather (about {avg_tmax:.0f}°C): crop uses less water, interval lengthened."
        return 1.0, None

    def _rain_credit(self, today: date) -> int:
        if self.crop == "wheat":  # PAU: +5 days per 1 cm rain until end of Jan, +2 afterwards
            return 5 if (today.month >= 10 or today.month == 1) else 2
        return self.profile.rain_credit_days

    def _apply_rain_credit(self, today: date, due: date, weather: Dict[str, Any]) -> Tuple[date, int]:
        """Push `due` back by credit days per 10 mm of rain that falls before the (shifted) due date."""
        credit = self._rain_credit(today)
        shift, cum = 0, 0.0
        for d in sorted(weather["rain_by_date"]):
            if d < today:
                continue
            if d > due + timedelta(days=shift):
                break
            cum += weather["rain_by_date"][d]
            shift = credit * int(cum // 10)
        return due + timedelta(days=shift), shift

    # ------------------------------------------------------------------
    # Scheduling pieces
    # ------------------------------------------------------------------
    def _interval(self, today: date, stage: Stage, sowing: Optional[date], soil_class: str,
                  weather: Dict[str, Any]) -> Tuple[Optional[int], List[str]]:
        p = self.profile
        notes: List[str] = []
        base = p.interval_override(today, stage, sowing) if p.interval_override else stage.interval
        if base is None:
            return None, notes
        factor = p.soil_factor.get(soil_class, 1.0)
        if p.temp_adjust:
            tf, note = self._temp_factor(weather["avg_tmax"])
            factor *= tf
            if note:
                notes.append(note)
        return max(MIN_INTERVAL_DAYS, round(base * factor)), notes

    def _first_due(self, today: date, sowing: Optional[date], stage: Stage, soil_class: str) -> Optional[date]:
        p = self.profile
        if p.perennial:
            return today if (p.interval_override(today, stage, sowing) if p.interval_override else stage.interval) else None
        first_idx = self._stage_index(self._match_stage(p.first_stage))
        reached = self._stage_index(stage) >= first_idx
        if sowing is not None:
            days = (p.first_das_fn(sowing) if p.first_das_fn else p.first_das) + p.first_soil_shift.get(soil_class, 0)
            due = sowing + timedelta(days=max(days, 0))
            return min(due, today) if reached else due
        return today if reached else None

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
        recent_rain: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        p = self.profile
        warnings: List[str] = []
        feedback = (soil_feedback or "").strip().lower() or None
        too_wet = feedback in {"too wet", "wet", "waterlogged"}
        too_dry = feedback in {"too dry", "dry"}
        soil_class = self._soil_class(soil_type)

        # 0. validation ----------------------------------------------------
        if last_irrigation_date and last_irrigation_date > today:
            warnings.append("The recorded irrigation date is in the future and was ignored.")
            last_irrigation_date = None
        if p.perennial:
            sowing_date = None
        if sowing_date and sowing_date > today:
            return self._insufficient("The sowing date is in the future. Please correct it.", soil_type, warnings)

        das = (today - sowing_date).days if sowing_date else None
        weather = self._weather(today, forecast, recent_rain)

        # 1. stage ---------------------------------------------------------
        stage = self._resolve_stage(selected_stage, das, warnings)
        if stage is None:
            return self._insufficient(
                "Irrigation advice needs the crop stage or the sowing date. Please enter one of them.",
                soil_type, warnings, das,
            )
        priority = "high" if stage.critical else "normal"
        common = dict(stage=stage.name, stage_priority=priority, soil_type=soil_type,
                      soil_feedback=feedback, days_after_sowing=das,
                      rain_expected_soon=weather["rain_48h"] >= MODERATE_RAIN_MM,
                      warnings=warnings)

        # 2. stop irrigation ----------------------------------------------
        if stage.stops_irrigation:
            return self._build_result(
                decision="NOT_NEEDED", decision_label="Not needed", urgency="none",
                rule_type=f"{self.crop}_stop_irrigation",
                rule_basis="Irrigation is stopped at maturity/harvest so the crop can ripen and be harvested.",
                reason=f"The crop is at the {stage.name} stage. Irrigation is not recommended now.",
                advisories=[stage.advice] if stage.advice else [], **common)

        # 3. too wet --------------------------------------------------------
        if too_wet:
            return self._build_result(
                decision="WAIT", decision_label="Wait", urgency="low",
                next_check_date=today + timedelta(days=2),
                rule_type="soil_override", rule_basis="Farmer-reported field condition: excess moisture.",
                reason="The field is reported as too wet. Do not irrigate until excess water has drained.",
                advisories=[stage.advice] if stage.advice else [], **common)

        # 4. schedule -------------------------------------------------------
        first = last_irrigation_date is None
        notes: List[str] = []
        interval: Optional[int] = None
        reference: Optional[date] = last_irrigation_date
        rule_type = f"{self.crop}_first_irrigation" if first else f"{self.crop}_interval"
        basis = p.basis_first if first else p.basis_interval
        reason_parts: List[str] = []

        if first:
            due = self._first_due(today, sowing_date, stage, soil_class)
            rc = weather["recent_rain_date"]
            if due is not None and rc and (today - rc).days <= RECENT_RAIN_DAYS:
                delayed = rc + timedelta(days=RECENT_RAIN_DAYS)
                if delayed > due:
                    due = delayed
                    notes.append("Good rain fell recently, so the first irrigation is pushed back a few days.")
        else:
            rc = weather["recent_rain_date"]
            if rc and rc > reference:
                reference = rc
                notes.append(f"Heavy rain on {rc:%d %b} was counted as an irrigation.")
            interval, inotes = self._interval(today, stage, sowing_date, soil_class, weather)
            notes += inotes
            due = reference + timedelta(days=interval) if interval is not None else None
            if (today - last_irrigation_date).days > max(STALE_LOG_DAYS, 3 * (interval or 14)):
                warnings.append(
                    f"The last recorded irrigation was {(today - last_irrigation_date).days} days ago. "
                    "If you have irrigated since, please log it so advice stays accurate.")

        advis: List[str] = [stage.advice] if stage.advice else []

        # rain-fed stage / season (no fixed schedule) ----------------------
        if not first and interval is None:
            if too_dry:
                return self._too_dry_result(today, weather, stage, last_irrigation_date, common, advis, notes)
            return self._build_result(
                decision="WAIT", decision_label="Wait", urgency="low",
                next_check_date=today + timedelta(days=3), reference_date=reference,
                rule_type=f"{self.crop}_rainfed", rule_basis=basis,
                reason=("No fixed irrigation schedule applies to this stage/season. "
                        "Irrigate only if the field is clearly dry."),
                advisories=advis, weather_note=" ".join(notes) or None, **common)

        if first and due is None:
            nxt = self._match_stage(p.first_stage)
            return self._build_result(
                decision="WAIT", decision_label="Wait", urgency="low",
                next_check_date=today + timedelta(days=3), needs_first_irrigation=True,
                show_irrigated_button=True, rule_type=rule_type, rule_basis=basis,
                reason=(f"No irrigation has been recorded yet. The first irrigation is not due before the "
                        f"{nxt.name} stage. If you have already irrigated, log the date."),
                advisories=advis, weather_note=" ".join(notes) or None, **common)

        # 5. rain on the forecast ------------------------------------------
        due, shift = self._apply_rain_credit(today, due, weather)
        if shift:
            notes.append(f"Rain is forecast; next irrigation pushed back by {shift} day(s).")
        days_until = (due - today).days
        overdue = max(0, -days_until)

        if days_until <= 0:
            decision, label = "IRRIGATE_TODAY", "Yes — irrigate today"
            if first:
                reason_parts.append(
                    "No irrigation has been recorded for this crop. At the "
                    f"{stage.name} stage the first irrigation is due. Irrigate now, then tap "
                    "'I irrigated today' so your schedule can start. If you already irrigated earlier, log that date instead.")
            else:
                gap = (today - last_irrigation_date).days
                reason_parts.append(
                    f"It has been {gap} day(s) since the last irrigation. At the {stage.name} stage the "
                    f"interval is about {interval} day(s)"
                    + (f"; irrigation is {overdue} day(s) overdue." if overdue else "."))
            urgency = "high" if (stage.critical or overdue >= 3) else "normal"
            recommended = today
        else:
            decision, label = "WAIT", "Wait"
            if first:
                reason_parts.append(
                    f"No irrigation recorded yet. The first irrigation is expected around {due:%d %b} "
                    f"(about {days_until} day(s)). Tap 'I irrigated today' after you irrigate.")
            else:
                reason_parts.append(
                    f"Last irrigated {(today - last_irrigation_date).days} day(s) ago. "
                    f"Next irrigation due around {due:%d %b} ({days_until} day(s)).")
            urgency = "medium" if (stage.critical and days_until <= 1) else "low"
            recommended = due

        # imminent rain defers irrigation that is due today ----------------
        rain_adj = shift
        next_check = recommended if decision == "WAIT" else None
        if decision == "IRRIGATE_TODAY":
            r48 = weather["rain_48h"]
            if r48 >= HEAVY_RAIN_MM or (r48 >= MODERATE_RAIN_MM and overdue < 3 and not too_dry):
                defer = 2 if r48 >= HEAVY_RAIN_MM else 1
                decision, label, urgency = "WAIT", "Wait", "low"
                recommended = today + timedelta(days=defer)
                next_check = recommended
                rain_adj = defer
                reason_parts.append(
                    f"About {r48:.0f} mm of rain is forecast in the next 48 hours, so irrigation is "
                    f"deferred by {defer} day(s). Check the field after the rain.")

        # 6. farmer says too dry -------------------------------------------
        if too_dry and last_irrigation_date != today and weather["rain_48h"] < HEAVY_RAIN_MM:
            decision, label = "IRRIGATE_TODAY", "Yes — irrigate today"
            recommended, next_check = today, None
            urgency = "high" if stage.critical else "normal"
            reason_parts = ["The field is reported as too dry. Irrigation is recommended today "
                            "regardless of the normal schedule."]
            rule_type = "soil_override"

        # extra advice ------------------------------------------------------
        if (decision == "IRRIGATE_TODAY" and weather["max_wind"] and weather["max_wind"] >= STRONG_WIND_KMH
                and self.crop in {"wheat", "maize"}):
            advis.append("Strong winds are forecast. Irrigate in calm hours or after the wind drops to avoid lodging.")
        if decision == "IRRIGATE_TODAY" and stage.critical:
            advis.append("This is a critical stage. Do not postpone irrigation.")

        return self._build_result(
            decision=decision, decision_label=label, urgency=urgency,
            recommended_date=recommended, next_check_date=next_check,
            days_until_due=max(days_until, 0) if decision == "WAIT" else 0,
            reference_date=reference,
            needs_first_irrigation=first,
            show_irrigated_button=(first or decision == "IRRIGATE_TODAY"),
            rain_adjustment_days=rain_adj,
            rule_type=rule_type, rule_basis=basis,
            reason=" ".join(reason_parts),
            advisories=advis, weather_note=" ".join(notes) or None, **common)

    # ------------------------------------------------------------------
    # Result builders
    # ------------------------------------------------------------------
    def _too_dry_result(self, today, weather, stage, last_irrigation_date, common, advis, notes):
        if last_irrigation_date == today or weather["rain_48h"] >= HEAVY_RAIN_MM:
            return self._build_result(
                decision="WAIT", decision_label="Wait", urgency="low",
                next_check_date=today + timedelta(days=1),
                rule_type="soil_override", rule_basis="Farmer-reported field condition: dry soil.",
                reason="Soil is dry but irrigation was just given or heavy rain is forecast. Check again tomorrow.",
                advisories=advis, weather_note=" ".join(notes) or None, **common)
        return self._build_result(
            decision="IRRIGATE_TODAY", decision_label="Yes — irrigate today",
            urgency="high" if stage.critical else "normal", recommended_date=today,
            show_irrigated_button=True,
            rule_type="soil_override", rule_basis="Farmer-reported field condition: dry soil.",
            reason="The field is reported as too dry. Irrigation is recommended today.",
            advisories=advis, weather_note=" ".join(notes) or None, **common)

    def _insufficient(self, reason: str, soil_type: Optional[str], warnings: List[str],
                      das: Optional[int] = None) -> Dict[str, Any]:
        return self._build_result(
            decision="INSUFFICIENT_DATA", decision_label="More information needed", urgency="none",
            soil_type=soil_type, days_after_sowing=das, warnings=warnings,
            rule_type="insufficient_data",
            rule_basis="Required crop timing information is unavailable.", reason=reason)

    def _build_result(
        self, *, decision: str, decision_label: str, rule_type: str, rule_basis: str, reason: str,
        stage: Optional[str] = None, stage_priority: str = "normal",
        recommended_date: Optional[date] = None, soil_type: Optional[str] = None,
        soil_feedback: Optional[str] = None, days_after_sowing: Optional[int] = None,
        rain_expected_soon: bool = False, rain_adjustment_days: int = 0,
        urgency: str = "low", needs_first_irrigation: bool = False,
        show_irrigated_button: bool = False, next_check_date: Optional[date] = None,
        days_until_due: Optional[int] = None, reference_date: Optional[date] = None,
        advisories: Optional[List[str]] = None, warnings: Optional[List[str]] = None,
        weather_note: Optional[str] = None,
    ) -> Dict[str, Any]:
        iso = lambda d: d.isoformat() if d else None  # noqa: E731
        return {
            "crop": self.crop,
            "decision": decision,
            "decision_label": decision_label,
            "urgency": urgency,
            "stage": stage,
            "stage_priority": stage_priority,
            "stage_message": "Critical irrigation stage." if stage_priority == "high" else "Normal irrigation stage.",
            "recommended_date": iso(recommended_date),
            "next_check_date": iso(next_check_date),
            "days_until_due": days_until_due,
            "reference_date": iso(reference_date),
            "needs_first_irrigation": needs_first_irrigation,
            "show_irrigated_button": show_irrigated_button,
            "rain_adjustment_days": rain_adjustment_days,
            "rain_expected_soon": rain_expected_soon,
            "soil_type": soil_type,
            "soil_feedback": soil_feedback,
            "days_after_sowing": days_after_sowing,
            "rule_type": rule_type,
            "rule_basis": rule_basis,
            "reason": reason,
            "advisories": advisories or [],
            "warnings": warnings or [],
            "weather_note": weather_note,
        }