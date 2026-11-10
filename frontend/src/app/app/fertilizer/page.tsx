"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  Beaker,
  CheckCircle2,
  ChevronDown,
  FileText,
  FlaskConical,
  Info,
  Leaf,
  RefreshCw,
  ShieldCheck,
  Sprout,
  Upload,
} from "lucide-react";
import api from "@/lib/api";

/* ----------------------------- Types ----------------------------- */

type Farm = {
  id: number;
  name?: string;
  crop?: string;
  stage?: string;
  land_size?: number;
  area?: number;
  soil_type?: string;
  sowing_date?: string;
};

type Option = { value: string; label: string };

type SoilInput = {
  ph: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  sulphur: string;
};

type FarmForm = {
  state: string;
  district: string;
  variety: string;
  season: string;
  land_size: string;
  area_unit: "acre" | "hectare";
  previous_crop: string;
  previous_p_applied: "" | "yes" | "no";
};

type NutrientMap = Record<string, number | string | null>;

type FertilizerRecommendation = {
  nutrients_kg_per_acre?: NutrientMap;
  farm_total_nutrients_kg?: NutrientMap;
  source?: string | {
    institution?: string;
    publication?: string;
    edition?: string;
    region?: string;
  } | null;
};

type PlantProtection = {
  status?: string;
  message?: string;
  guidance?: string;
  recommendations?: string[];
};

type FertilizerData = {
  fertilizer_status?: string | null;
  fertilizer_recommendation?: FertilizerRecommendation | null;
  plant_protection?: PlantProtection | null;
  missing_information?: string[] | null;
  warnings?: string[] | null;
  advisories?: string[] | null;
  requires_expert_confirmation?: boolean;
};

const initialSoil: SoilInput = { ph: "", nitrogen: "", phosphorus: "", potassium: "", sulphur: "" };

const initialFarmForm: FarmForm = {
  state: "",
  district: "",
  variety: "",
  season: "",
  land_size: "",
  area_unit: "acre",
  previous_crop: "",
  previous_p_applied: "",
};

/* ------------------- Dropdown values (match rule engine) ------------------- */

// Soil statuses accepted by the rule engine. Leaving the field blank sends null ("unknown").
const SOIL_STATUS_OPTIONS: Option[] = [
  { value: "low", label: "Low" },
  { value: "deficient", label: "Deficient" },
  { value: "medium", label: "Medium" },
  { value: "adequate", label: "Adequate" },
  { value: "sufficient", label: "Sufficient" },
  { value: "high", label: "High" },
  { value: "very high", label: "Very high" },
  { value: "excess", label: "Excess" },
];

const RICE_VARIETIES: Option[] = [
  { value: "PR132", label: "PR 132" },
  { value: "Other", label: "Other / not listed" },
];

const MAIZE_VARIETIES: Option[] = [
  { value: "PMH1", label: "PMH 1" },
  { value: "PMH11", label: "PMH 11" },
  { value: "PMH13", label: "PMH 13" },
  { value: "PMH14", label: "PMH 14" },
  { value: "PMH17", label: "PMH 17" },
  { value: "NK7328", label: "NK 7328" },
  { value: "DKC9144", label: "DKC 9144" },
  { value: "Bioseed9788", label: "Bioseed 9788" },
  { value: "ADV9293", label: "ADV 9293" },
  { value: "JC12", label: "JC 12" },
  { value: "PunjabSweetcorn1", label: "Punjab Sweetcorn 1" },
  { value: "PMH2", label: "PMH 2" },
  { value: "JC4", label: "JC 4" },
  { value: "PearlPopcorn", label: "Pearl Popcorn" },
  { value: "Other", label: "Other / not listed" },
];

const SEASON_OPTIONS: Option[] = [
  { value: "Kharif", label: "Kharif (summer)" },
  { value: "Rabi", label: "Rabi (winter)" },
  { value: "Zaid", label: "Zaid (spring)" },
  { value: "Other", label: "Other" },
];

// Only "wheat" triggers a rule today (phosphorus can be skipped for rice/maize after wheat).
const PREVIOUS_CROP_OPTIONS: Option[] = [
  { value: "wheat", label: "Wheat" },
  { value: "rice", label: "Rice" },
  { value: "maize", label: "Maize" },
  { value: "potato", label: "Potato" },
  { value: "sugarcane", label: "Sugarcane" },
  { value: "tomato", label: "Tomato" },
  { value: "fallow", label: "Fallow / none" },
  { value: "other", label: "Other" },
];

const STATES: string[] = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

// Complete for Punjab and Haryana. Other states fall back to a text input for district.
const DISTRICTS: Record<string, string[]> = {
  Punjab: [
    "Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib",
    "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar",
    "Kapurthala", "Ludhiana", "Malerkotla", "Mansa", "Moga",
    "Mohali (SAS Nagar)", "Pathankot", "Patiala", "Rupnagar", "Sangrur",
    "Shahid Bhagat Singh Nagar", "Sri Muktsar Sahib", "Tarn Taran",
  ],
  Haryana: [
    "Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad",
    "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal",
    "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat",
    "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar",
  ],
};

const NUTRIENTS: { key: string; label: string; soilTestOnly: boolean }[] = [
  { key: "N", label: "Nitrogen (N)", soilTestOnly: false },
  { key: "P2O5", label: "Phosphorus (P₂O₅)", soilTestOnly: true },
  { key: "K2O", label: "Potassium (K₂O)", soilTestOnly: true },
];

// Items the engine lists as "missing" that this page has no field for.
const HIDDEN_MISSING = new Set([
  "Crop growth stage",
  "Previous fertilizer application history",
]);

const HECTARE_TO_ACRE = 2.47105;
const COLLAPSED_NOTES = 4;

/* --------------------------- Helpers ----------------------------- */

function readableLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeCrop(crop?: string) {
  const value = (crop || "").trim().toLowerCase();
  if (value === "corn" || value === "corn/maize") return "maize";
  if (value === "paddy") return "rice";
  return value;
}

function getSourceText(source: FertilizerRecommendation["source"]) {
  if (!source) return null;
  if (typeof source === "string") return source;
  return [source.institution, source.publication, source.edition, source.region]
    .filter(Boolean)
    .join(" | ");
}

function formatKg(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function getErrorMessage(err: unknown, fallback: string) {
  const status = (err as { response?: { status?: number } })?.response?.status;
  // The rule engine raises ValueError for unsupported crops; backends usually return 400/422.
  if (status === 400 || status === 422) {
    return "This crop is not supported yet. Please contact your local agriculture officer.";
  }
  return fallback;
}

function getFarmerAdvice(status: unknown, crop: string) {
  if (status === "verified_rate_not_configured") {
    return `A verified fertilizer dose is not available yet for ${crop} with the details given. Please do not use a general dose. Get your soil tested and ask your local Krishi Vigyan Kendra (KVK) or agriculture officer.`;
  }
  if (status === "conditional_baseline_available") {
    return `A starting-point fertilizer plan is available for your ${crop}. Add soil-test details to make it more suitable for your field.`;
  }
  return `Your ${crop} assessment is ready. Add soil information to improve it.`;
}

/* ------------------------- Reusable UI --------------------------- */

const inputClass =
  "form-input w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100";

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function NutrientGrid({ values }: { values?: NutrientMap | null }) {
  if (!values) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {NUTRIENTS.map(({ key, label, soilTestOnly }) => {
        const raw = values[key];
        const num =
          typeof raw === "number"
            ? raw
            : raw !== null && raw !== undefined && raw !== ""
              ? Number(raw)
              : null;
        const isNumber = num !== null && !Number.isNaN(num);

        let display: string;
        let small = false;
        if (isNumber && num === 0) {
          display = "Not needed";
          small = true;
        } else if (isNumber) {
          display = `${formatKg(num as number)} kg`;
        } else {
          // null means "depends on soil test" for phosphorus and potassium
          display = soilTestOnly ? "Only if soil test is low" : "—";
          small = true;
        }

        return (
          <div key={key} className="rounded-xl border border-green-100 bg-green-50/60 p-4">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className={`mt-2 font-bold text-gray-900 ${small ? "text-sm leading-5" : "text-xl"}`}>
              {display}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------- Main Page ----------------------------- */

export default function FertilizerPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [fertilizerData, setFertilizerData] = useState<FertilizerData | null>(null);
  const [appliedContext, setAppliedContext] = useState({ state: "", season: "", hectare: false });

  const [soil, setSoil] = useState<SoilInput>(initialSoil);
  const [farmForm, setFarmForm] = useState<FarmForm>(initialFarmForm);

  const [farmsLoading, setFarmsLoading] = useState(true);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState("");
  const [showAllNotes, setShowAllNotes] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedReport, setSelectedReport] = useState<File | null>(null);

  const selectedFarm = farms.find((farm) => String(farm.id) === selectedFarmId);
  const crop = normalizeCrop(selectedFarm?.crop);
  const isRice = crop === "rice";
  const isMaize = crop === "maize";
  const cropName = selectedFarm?.crop ? readableLabel(selectedFarm.crop) : "your crop";

  const varietyOptions = isRice ? RICE_VARIETIES : isMaize ? MAIZE_VARIETIES : [];
  const districtList = DISTRICTS[farmForm.state];

  const recommendation = fertilizerData?.fertilizer_recommendation;
  const hasRates = !!recommendation?.nutrients_kg_per_acre;
  const farmTotals = recommendation?.farm_total_nutrients_kg;
  const sourceText = getSourceText(recommendation?.source);

  const farmLabel = (farm: Farm) =>
    `${farm.crop ? readableLabel(farm.crop) : "Farm"} #${farm.id}`;

  /* ------------------------- API calls -------------------------- */

  useEffect(() => {
    let active = true;

    const loadFarms = async () => {
      try {
        setFarmsLoading(true);
        setError("");

        const response = await api.get("/farms/");
        if (!active) return;

        const farmList: Farm[] = Array.isArray(response.data)
          ? response.data
          : response.data?.farms ?? response.data?.items ?? [];

        setFarms(farmList);
        if (farmList.length > 0) setSelectedFarmId(String(farmList[0].id));
      } catch (err) {
        console.error("Failed to load farms:", err);
        if (active) setError("Unable to load your farms. Please try again.");
      } finally {
        if (active) setFarmsLoading(false);
      }
    };

    loadFarms();
    return () => {
      active = false;
    };
  }, []);

  // Load advice and reset the form whenever the selected farm changes.
  useEffect(() => {
    if (!selectedFarmId) return;
    let active = true;

    const farm = farms.find((item) => String(item.id) === selectedFarmId);
    const knownArea = farm?.land_size ?? farm?.area;

    setSoil(initialSoil);
    setFarmForm({
      ...initialFarmForm,
      land_size: knownArea && knownArea > 0 ? String(knownArea) : "",
    });
    setAppliedContext({ state: "", season: "", hectare: false });
    setShowAllNotes(false);

    const loadFertilizerData = async () => {
      try {
        setAdviceLoading(true);
        setError("");
        const response = await api.get(`/fertilizer/${selectedFarmId}`);
        if (active) setFertilizerData(response.data);
      } catch (err) {
        console.error("Failed to load fertilizer advice:", err);
        if (active) {
          setFertilizerData(null);
          setError(getErrorMessage(err, "Unable to load fertilizer advice for this farm."));
        }
      } finally {
        if (active) setAdviceLoading(false);
      }
    };

    loadFertilizerData();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFarmId, farms]);

  /* ------------------------- Form handlers ---------------------- */

  const updateSoil = (field: keyof SoilInput, value: string) =>
    setSoil((previous) => ({ ...previous, [field]: value }));

  const updateFarmForm = <K extends keyof FarmForm>(field: K, value: FarmForm[K]) =>
    setFarmForm((previous) => ({ ...previous, [field]: value }));

  const handleStateChange = (value: string) =>
    setFarmForm((previous) => ({ ...previous, state: value, district: "" }));

  const handlePreviousCropChange = (value: string) =>
    setFarmForm((previous) => ({
      ...previous,
      previous_crop: value,
      previous_p_applied: value === "wheat" ? previous.previous_p_applied : "",
    }));

  const handleEvaluate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFarmId) {
      setError("Please select a farm first.");
      return;
    }

    const phValue = soil.ph.trim() === "" ? null : Number(soil.ph);
    if (phValue !== null && (Number.isNaN(phValue) || phValue < 0 || phValue > 14)) {
      setError("Soil pH must be between 0 and 14.");
      return;
    }

    let landAcres: number | null = null;
    if (farmForm.land_size.trim() !== "") {
      const area = Number(farmForm.land_size);
      if (Number.isNaN(area) || area <= 0) {
        setError("Farm area must be more than zero.");
        return;
      }
      // The engine only calculates farm totals for acres, so convert here.
      landAcres =
        farmForm.area_unit === "hectare"
          ? Math.round(area * HECTARE_TO_ACRE * 100) / 100
          : area;
    }

    try {
      setEvaluating(true);
      setError("");

      const payload = {
        state: farmForm.state || null,
        district: farmForm.district.trim() || null,
        variety: farmForm.variety || null,
        season: farmForm.season || null,
        land_size: landAcres,
        land_unit: "acre",
        previous_crop: farmForm.previous_crop || null,
        previous_crop_phosphorus_applied:
          farmForm.previous_crop === "wheat" && farmForm.previous_p_applied
            ? farmForm.previous_p_applied === "yes"
            : null,
        soil: {
          ph: phValue,
          nitrogen_status: soil.nitrogen || null,
          phosphorus_status: soil.phosphorus || null,
          potassium_status: soil.potassium || null,
          sulphur_status: soil.sulphur || null,
        },
      };

      const response = await api.post(`/fertilizer/${selectedFarmId}/evaluate`, payload);
      setFertilizerData(response.data);
      setAppliedContext({
        state: farmForm.state,
        season: farmForm.season,
        hectare: farmForm.area_unit === "hectare" && landAcres !== null,
      });
      setShowAllNotes(false);
    } catch (err) {
      console.error("Failed to evaluate fertilizer recommendation:", err);
      setError(
        getErrorMessage(
          err,
          "Unable to update the assessment. Please check the details and try again."
        )
      );
    } finally {
      setEvaluating(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedFarmId) return;
    try {
      setAdviceLoading(true);
      setError("");
      const response = await api.get(`/fertilizer/${selectedFarmId}`);
      setFertilizerData(response.data);
    } catch (err) {
      console.error("Failed to refresh fertilizer advice:", err);
      setError(getErrorMessage(err, "Unable to refresh fertilizer advice."));
    } finally {
      setAdviceLoading(false);
    }
  };

  const handleReportSelection = (file?: File) => {
    if (!file) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a PDF, JPG or PNG report.");
      return;
    }
    setSelectedReport(file);
    setError("");
  };

  /* ------------------------ Derived content ---------------------- */

  const missingItems = (fertilizerData?.missing_information ?? []).filter(
    (item) => !HIDDEN_MISSING.has(item)
  );

  const allNotes = (() => {
    const clientNotes: string[] = [];
    if (hasRates && appliedContext.state && appliedContext.state !== "Punjab") {
      clientNotes.push(
        `These rates follow Punjab Agricultural University (PAU) guidance for Punjab. They may not suit ${appliedContext.state}.`
      );
    }
    if (hasRates && appliedContext.season && appliedContext.season !== "Kharif") {
      clientNotes.push(
        `These rates come from the Kharif package. Check with your KVK for the ${appliedContext.season} season.`
      );
    }
    if (appliedContext.hectare) {
      clientNotes.push("Area in hectares was converted to acres (1 hectare = 2.47 acres).");
    }

    return [
      ...[...(fertilizerData?.warnings ?? []), ...clientNotes].map((text) => ({
        text,
        warning: true,
      })),
      ...(fertilizerData?.advisories ?? []).map((text) => ({ text, warning: false })),
    ];
  })();

  const visibleNotes = showAllNotes ? allNotes : allNotes.slice(0, COLLAPSED_NOTES);

  const plantProtectionMessage =
    fertilizerData?.plant_protection?.message ||
    fertilizerData?.plant_protection?.guidance ||
    "Check your crop regularly for pests and diseases. If you notice unusual spots, insects or damage, get the problem identified before spraying anything.";

  /* ------------------------------ UI ----------------------------- */

  if (farmsLoading && farms.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-green-700" />
          <p className="mt-4 text-sm text-gray-500">Loading your farms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
            <Sprout className="h-4 w-4" />
            SMART FERTILIZER ADVISORY
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Fertilizer Planner
          </h1>

          {selectedFarm && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-800">
                <Leaf className="h-3.5 w-3.5" />
                {farmLabel(selectedFarm)}
              </span>

              {selectedFarm.stage && (
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                  {readableLabel(selectedFarm.stage)}
                </span>
              )}

              {selectedFarm.soil_type && (
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                  {readableLabel(selectedFarm.soil_type)} soil
                </span>
              )}
            </div>
          )}
        </div>

        {farms.length > 0 && (
          <div className="w-full sm:max-w-xs">
            <label className="mb-2 block text-sm font-medium text-gray-700">Select farm</label>
            <div className="relative">
              <select
                value={selectedFarmId}
                onChange={(event) => setSelectedFarmId(event.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-gray-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              >
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farmLabel(farm)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!farmsLoading && farms.length === 0 && !error && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <Sprout className="mx-auto h-10 w-10 text-green-700" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No farm found</h2>
          <p className="mt-2 text-sm text-gray-500">
            Add a farm to view its fertilizer recommendations.
          </p>
        </div>
      )}

      {selectedFarm && (
        <>
          {/* Fertilizer assessment */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="h-1.5 bg-green-600" />
            <div className="p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    Fertilizer assessment
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{cropName} nutrient plan</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                    {getFarmerAdvice(fertilizerData?.fertilizer_status, cropName)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={adviceLoading}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${adviceLoading ? "animate-spin" : ""}`} />
                  Refresh advice
                </button>
              </div>

              {fertilizerData && (fertilizerData.requires_expert_confirmation ?? true) && (
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      Expert confirmation recommended
                    </p>
                    <p className="mt-1 text-sm leading-5 text-amber-800">
                      Please confirm this recommendation with an agricultural expert or local
                      agriculture officer before applying fertilizer.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Recommended nutrient rates */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-start gap-3">
              <div className="rounded-xl bg-green-50 p-3">
                <Beaker className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Recommended Nutrient Rates</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Suggested nutrient quantities for one acre of land.
                </p>
              </div>
            </div>

            {hasRates ? (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 text-base font-semibold text-gray-900">
                    Per acre (kg of nutrient)
                  </h3>
                  <NutrientGrid values={recommendation?.nutrients_kg_per_acre} />
                </div>

                {farmTotals && Object.keys(farmTotals).length > 0 && (
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="mb-3 text-base font-semibold text-gray-900">
                      Total for your farm (kg of nutrient)
                    </h3>
                    <NutrientGrid values={farmTotals} />
                  </div>
                )}

                <p className="text-xs leading-5 text-gray-500">
                  These are nutrient quantities, not bags of fertilizer.
                </p>
                {sourceText && (
                  <p className="text-xs leading-5 text-gray-400">Source: {sourceText}</p>
                )}
              </div>
            ) : (
              <p className="rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-600">
                No verified quantities are available yet. Please use a soil test and expert advice.
              </p>
            )}
          </section>

          {/* Important notes (engine warnings + advisories)
          {allNotes.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-xl bg-amber-50 p-3">
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                </div>
                <h2 className="pt-2 text-xl font-bold text-gray-900">Important Notes</h2>
              </div>

              <ul className="space-y-3">
                {visibleNotes.map((note, index) => (
                  <li
                    key={`${note.text}-${index}`}
                    className="flex items-start gap-3 text-sm text-gray-700"
                  >
                    {note.warning ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    ) : (
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                    )}
                    <span>{note.text}</span>
                  </li>
                ))}
              </ul>

              {allNotes.length > COLLAPSED_NOTES && (
                <button
                  type="button"
                  onClick={() => setShowAllNotes((value) => !value)}
                  className="mt-4 text-sm font-semibold text-green-700 hover:text-green-800"
                >
                  {showAllNotes ? "Show less" : "Show more"}
                </button>
              )}
            </section>
          )} */}

          {/* Information still needed */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-xl bg-amber-50 p-3">
                <Info className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Information Still Needed</h2>
                <p className="mt-1 text-sm text-gray-500">
                  These details can help improve the assessment.
                </p>
              </div>
            </div>

            {missingItems.length ? (
              <ul className="space-y-3">
                {missingItems.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="flex items-start gap-3 text-sm text-gray-700"
                  >
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                No additional information is currently required.
              </p>
            )}
          </section>

          {/* Soil and farm information */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-start gap-3">
              <div className="rounded-xl bg-green-50 p-3">
                <FlaskConical className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Soil and Farm Information</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Enter what you know. Leave fields blank if you do not have the information.
                </p>
              </div>
            </div>

            <form onSubmit={handleEvaluate} className="space-y-8">
              {/* Farm details */}
              <div>
                <h3 className="mb-4 text-base font-semibold text-gray-900">Farm details</h3>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="State">
                    <SelectInput
                      value={farmForm.state}
                      onChange={handleStateChange}
                      placeholder="Select state"
                      options={STATES.map((state) => ({ value: state, label: state }))}
                    />
                  </FormField>

                  <FormField label="District">
                    {districtList ? (
                      <SelectInput
                        value={farmForm.district}
                        onChange={(value) => updateFarmForm("district", value)}
                        placeholder="Select district"
                        options={districtList.map((d) => ({ value: d, label: d }))}
                      />
                    ) : (
                      <input
                        type="text"
                        value={farmForm.district}
                        onChange={(event) => updateFarmForm("district", event.target.value)}
                        placeholder="Enter district"
                        disabled={!farmForm.state}
                        className={`${inputClass} disabled:bg-gray-50`}
                      />
                    )}
                  </FormField>

                  <FormField label="Crop variety">
                    {isRice || isMaize ? (
                      <SelectInput
                        value={farmForm.variety}
                        onChange={(value) => updateFarmForm("variety", value)}
                        placeholder="Select crop variety"
                        options={varietyOptions}
                      />
                    ) : (
                      <input
                        type="text"
                        value={farmForm.variety}
                        onChange={(event) => updateFarmForm("variety", event.target.value)}
                        placeholder="Enter crop variety"
                        className={inputClass}
                      />
                    )}
                  </FormField>

                  <FormField label="Season">
                    <SelectInput
                      value={farmForm.season}
                      onChange={(value) => updateFarmForm("season", value)}
                      placeholder="Select season"
                      options={SEASON_OPTIONS}
                    />
                  </FormField>

                  <FormField label="Farm area">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={farmForm.land_size}
                      onChange={(event) => updateFarmForm("land_size", event.target.value)}
                      placeholder="Enter land area"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Area unit">
                    <select
                      value={farmForm.area_unit}
                      onChange={(event) =>
                        updateFarmForm("area_unit", event.target.value as FarmForm["area_unit"])
                      }
                      className={inputClass}
                    >
                      <option value="acre">Acre</option>
                      <option value="hectare">Hectare</option>
                    </select>
                  </FormField>
                </div>
              </div>

              {/* Previous crop */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="mb-4 text-base font-semibold text-gray-900">Previous crop</h3>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Previous crop">
                    <SelectInput
                      value={farmForm.previous_crop}
                      onChange={handlePreviousCropChange}
                      placeholder="Not known"
                      options={PREVIOUS_CROP_OPTIONS}
                    />
                  </FormField>

                  {farmForm.previous_crop === "wheat" && (
                    <div className="sm:col-span-2">
                      <FormField label="Did the wheat crop get its full phosphorus (DAP / SSP) dose?">
                        <SelectInput
                          value={farmForm.previous_p_applied}
                          onChange={(value) =>
                            updateFarmForm(
                              "previous_p_applied",
                              value as FarmForm["previous_p_applied"]
                            )
                          }
                          placeholder="Don't know"
                          options={[
                            { value: "yes", label: "Yes" },
                            { value: "no", label: "No" },
                          ]}
                        />
                      </FormField>
                    </div>
                  )}
                </div>
              </div>

              {/* Soil test */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="mb-2 text-base font-semibold text-gray-900">Soil test results</h3>
                <p className="mb-5 text-sm text-gray-500">
                  Enter the values from your soil test report. Do not guess if you have not tested
                  your soil.
                </p>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Soil pH">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="14"
                      step="0.1"
                      value={soil.ph}
                      onChange={(event) => updateSoil("ph", event.target.value)}
                      placeholder="e.g. 7.2"
                      className={inputClass}
                    />
                  </FormField>

                  {(
                    [
                      ["nitrogen", "Nitrogen status"],
                      ["phosphorus", "Phosphorus status"],
                      ["potassium", "Potassium status"],
                      ["sulphur", "Sulphur status"],
                    ] as const
                  ).map(([field, label]) => (
                    <FormField key={field} label={label}>
                      <SelectInput
                        value={soil[field]}
                        onChange={(value) => updateSoil(field, value)}
                        placeholder="Not known"
                        options={SOIL_STATUS_OPTIONS}
                      />
                    </FormField>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-end gap-3 border-t border-gray-100 pt-6 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    const knownArea = selectedFarm.land_size ?? selectedFarm.area;
                    setSoil(initialSoil);
                    setFarmForm({
                      ...initialFarmForm,
                      land_size: knownArea && knownArea > 0 ? String(knownArea) : "",
                    });
                  }}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Clear fields
                </button>

                <button
                  type="submit"
                  disabled={evaluating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {evaluating && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {evaluating ? "Updating assessment..." : "Update recommendation"}
                </button>
              </div>
            </form>
          </section>

          {/* Soil testing */}
          <section className="rounded-2xl border border-green-100 bg-green-50/50 p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <FileText className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Get your soil tested</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    A soil test shows which nutrients your field needs and gives a more accurate
                    recommendation.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="https://soilhealth.dac.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
                >
                  <Sprout className="h-4 w-4" />
                  Get your soil tested
                </a>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(event) => handleReportSelection(event.target.files?.[0])}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-green-200 bg-white px-5 py-3 text-sm font-semibold text-green-800 transition hover:bg-green-50"
                >
                  <Upload className="h-4 w-4" />
                  Select soil test report
                </button>
              </div>
            </div>

            {selectedReport && (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-green-200 bg-white p-4">
                <FileText className="h-5 w-5 shrink-0 text-green-700" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{selectedReport.name}</p>
                  <p className="text-xs text-gray-500">Report selected</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReport(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="ml-auto text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            )}

            <p className="mt-4 text-xs leading-5 text-gray-500">
              {selectedReport
                ? "The report is not read automatically. Please type its values in the form above."
                : "Supported formats: PDF, JPG and PNG."}
            </p>
          </section>

          {/* Plant protection guidance */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-green-50 p-3">
                <ShieldCheck className="h-5 w-5 text-green-700" />
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">Plant Protection Guidance</h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">{plantProtectionMessage}</p>

                {(fertilizerData?.plant_protection?.recommendations ?? []).length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {fertilizerData?.plant_protection?.recommendations?.map((item, index) => (
                      <li
                        key={`${item}-${index}`}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      <style jsx>{`
        .form-input::placeholder {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
