"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  FlaskConical,
  ChevronDown,
  FileText,
  Leaf,
  RefreshCw,
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
  ec: string;
  organic_carbon_percent: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  sulphur: string;
  zinc: string;
  manganese: string;
  texture: string;
};

type FarmForm = {
  crop: string;
  state: string;
  district: string;
  variety: string;
  stage: string;
  season: string;
  irrigation_type: string;
  manure_type: string;
  land_size: string;
  area_unit: "acre" | "hectare";
  previous_crop: string;
  previous_p_applied: "" | "yes" | "no";
};

type NutrientMap = Record<string, number | string | null>;

type FertilizerRecommendation = {
  nutrients_kg_per_acre?: NutrientMap;
  nutrients_kg_per_hectare?: NutrientMap;
  fertilizer_products_per_acre?: NutrientMap;
  fertilizer_products_per_tree?: NutrientMap;
  farm_total_nutrients_kg?: NutrientMap;
  farm_total_products?: NutrientMap | null;
  farm_total_note?: string;
  application_timing?: string[];
  limitations?: string[];
  message?: string;
  source_section?: string;
  source?: string | {
    institution?: string;
    publication?: string;
    edition?: string;
    region?: string;
  } | null;
};

type FertilizerData = {
  fertilizer_status?: string | null;
  fertilizer_recommendation?: FertilizerRecommendation | null;
  missing_information?: string[] | null;
  warnings?: string[] | null;
  advisories?: string[] | null;
};

const initialSoil: SoilInput = {
  ph: "", ec: "", organic_carbon_percent: "", nitrogen: "", phosphorus: "",
  potassium: "", sulphur: "", zinc: "", manganese: "", texture: "",
};

const initialFarmForm: FarmForm = {
  crop: "",
  state: "",
  district: "",
  variety: "",
  stage: "",
  season: "",
  irrigation_type: "",
  manure_type: "",
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


const CROP_OPTIONS: Option[] = [
  { value: "apple", label: "Apple" },
  { value: "cassava", label: "Cassava" },
  { value: "maize", label: "Maize" },
  { value: "potato", label: "Potato" },
  { value: "rice", label: "Rice" },
  { value: "sugarcane", label: "Sugarcane" },
  { value: "tea", label: "Tea" },
  { value: "tomato", label: "Tomato" },
  { value: "wheat", label: "Wheat" },
];

const VARIETY_OPTIONS_BY_CROP: Record<string, Option[]> = {
  rice: [
    { value: "pr132", label: "PR 132" },
    { value: "pr126", label: "PR 126" },
    { value: "csr30", label: "CSR 30" },
    { value: "basmati_36", label: "Basmati - 36 kg N group" },
    { value: "basmati_54", label: "Basmati - 54 kg N group" },
  ],
  maize: [
    { value: "group_a", label: "PAU Group A varieties" },
    { value: "group_b", label: "PAU Group B varieties" },
  ],
  cassava: [
    { value: "high_yielding", label: "High-yielding type" },
    { value: "local_m4", label: "Local / M-4 type" },
    { value: "general", label: "General / not specified" },
  ],
  tomato: [
    { value: "general", label: "General / standard" },
    { value: "hybrid", label: "Hybrid" },
  ],
  apple: [{ value: "general", label: "General / not specified" }],
  potato: [{ value: "general", label: "General / not specified" }],
  sugarcane: [{ value: "general", label: "General / not specified" }],
  tea: [{ value: "general", label: "General / not specified" }],
  wheat: [{ value: "general", label: "General / not specified" }],
};

const STAGE_OPTIONS_BY_CROP: Record<string, Option[]> = {
  apple: ["Dormant / winter", "Before flowering", "Fruit set", "Fruit development", "After harvest"].map((x) => ({ value: x, label: x })),
  cassava: ["Land preparation", "Planting", "Establishment", "45-60 days after planting", "Root bulking", "Maturity"].map((x) => ({ value: x, label: x })),
  maize: ["Land preparation", "Sowing", "Early growth", "Knee-high", "Tasseling / flowering", "Grain filling", "Maturity"].map((x) => ({ value: x, label: x })),
  potato: ["Land preparation", "Planting", "Emergence", "Earthing-up", "Tuber development", "Maturity"].map((x) => ({ value: x, label: x })),
  rice: ["Nursery", "Transplanting", "Direct seeding", "Early tillering", "Active tillering", "Panicle initiation", "Flowering", "Grain filling", "Maturity"].map((x) => ({ value: x, label: x })),
  sugarcane: ["Land preparation", "Planting", "Germination", "Early tillering", "Grand growth", "Maturity", "Ratoon establishment"].map((x) => ({ value: x, label: x })),
  tea: ["Young plant - year 1", "Young plant - year 2", "Young plant - year 3", "Young plant - year 4+", "Mature / pruned bush"].map((x) => ({ value: x, label: x })),
  tomato: ["Nursery", "Transplanting", "Establishment", "30 days after planting", "Flowering", "Fruit set", "Harvesting"].map((x) => ({ value: x, label: x })),
  wheat: ["Land preparation", "Sowing", "Crown root initiation", "Tillering", "Jointing", "Booting", "Flowering", "Grain filling", "Maturity"].map((x) => ({ value: x, label: x })),
};

const IRRIGATION_OPTIONS: Option[] = [
  { value: "irrigated", label: "Irrigated" },
  { value: "rainfed", label: "Rainfed" },
];

const MANURE_OPTIONS: Option[] = [
  { value: "fym", label: "Farmyard manure (FYM)" },
  { value: "pressmud", label: "Pressmud" },
  { value: "poultry_manure", label: "Poultry manure" },
  { value: "gobar_gas_slurry", label: "Gobar gas slurry" },
  { value: "green_manure", label: "Green manure" },
  { value: "summer_moong_residue", label: "Summer moong residue" },
  { value: "none", label: "None / not applied" },
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
  { key: "N", label: "Nitrogen", soilTestOnly: false },
  { key: "P2O5", label: "Phosphorus", soilTestOnly: true },
  { key: "K2O", label: "Potassium", soilTestOnly: true },
];

// Items the engine lists as "missing" that this page has no field for.
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

function QuantityList({ values }: { values?: NutrientMap | null }) {
  if (!values) return null;
  const entries = Object.entries(values).filter(([, value]) => value !== null && value !== undefined);
  if (!entries.length) return <p className="text-sm text-gray-500">No product quantities provided.</p>;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
          <span className="text-sm font-medium text-gray-700">{readableLabel(key.replace(/_kg.*/, "").replace(/_per.*/, "").replace(/_if_.*$/, "").replace(/_.*alternative.*$/i, ""))}</span>
          <strong className="text-sm text-gray-900">
            {typeof value === "number" ? `${formatKg(value)} kg` : String(value)}
          </strong>
        </div>
      ))}
    </div>
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
  const databaseCrop = normalizeCrop(selectedFarm?.crop);
  const crop = normalizeCrop(farmForm.crop) || databaseCrop;
  const cropName = crop ? readableLabel(crop) : "your crop";

  const varietyOptions = VARIETY_OPTIONS_BY_CROP[crop] ?? [];
  const stageOptions = STAGE_OPTIONS_BY_CROP[crop] ?? [];
  const districtList = DISTRICTS[farmForm.state];

  const recommendation = fertilizerData?.fertilizer_recommendation;
  const hasRates = !!(
    recommendation?.nutrients_kg_per_acre ||
    recommendation?.nutrients_kg_per_hectare ||
    recommendation?.fertilizer_products_per_acre ||
    recommendation?.fertilizer_products_per_tree
  );
  const farmLabel = (farm: Farm) => farm.name?.trim() || (farm.crop ? readableLabel(farm.crop) : "My farm");

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
      crop: "",
      stage: farm?.stage ?? "",
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

  const handleCropChange = (value: string) =>
    setFarmForm((previous) => ({ ...previous, crop: value, variety: "", stage: "" }));

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
        crop: farmForm.crop || null,
        state: farmForm.state || null,
        district: farmForm.district.trim() || null,
        variety: farmForm.variety || null,
        stage: farmForm.stage || null,
        season: farmForm.season || null,
        irrigation_type: farmForm.irrigation_type || null,
        manure_history: farmForm.manure_type
          ? [{ type: farmForm.manure_type }]
          : [],
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

  const allNotes = (() => {
    const clientNotes: string[] = [];
    if (hasRates && appliedContext.state && appliedContext.state !== "Punjab") {
      clientNotes.push(
        `These rates follow Punjab Agricultural University (PAU) guidance for Punjab. They may not suit ${appliedContext.state}.`
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
                    {fertilizerData?.fertilizer_status ? `Fertilizer guidance for ${cropName}. Check the quantities below and follow the suggested application time.` : `Select your crop details and update the recommendation.`}
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


            </div>
          </section>

          {/* Recommended nutrient rates */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">What to apply</h2>
              <p className="mt-1 text-sm text-gray-500">Recommended amount for one acre.</p>
            </div>

            {hasRates ? (
              <div className="space-y-5">
                {recommendation?.fertilizer_products_per_acre && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">Fertilizer needed per acre</h3>
                    <QuantityList values={recommendation.fertilizer_products_per_acre} />
                  </div>
                )}
                {recommendation?.fertilizer_products_per_tree && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">Fertilizer needed for each tree</h3>
                    <QuantityList values={recommendation.fertilizer_products_per_tree} />
                  </div>
                )}
                {recommendation?.nutrients_kg_per_acre && (
                  <div className="border-t border-gray-100 pt-5">
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">Nutrients needed per acre</h3>
                    <NutrientGrid values={recommendation.nutrients_kg_per_acre} />
                  </div>
                )}
                {recommendation?.nutrients_kg_per_hectare && !recommendation?.nutrients_kg_per_acre && (
                  <div className="border-t border-gray-100 pt-5">
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">Nutrients needed per hectare</h3>
                    <NutrientGrid values={recommendation.nutrients_kg_per_hectare} />
                  </div>
                )}
                {recommendation?.application_timing?.length ? (
                  <div className="border-t border-gray-100 pt-5">
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">When to apply</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {recommendation.application_timing.map((item, index) => <li key={index} className="rounded-lg bg-green-50 px-3 py-2">{item}</li>)}
                    </ul>
                  </div>
                ) : null}
                <p className="border-t border-gray-100 pt-4 text-xs leading-5 text-gray-400">Guidance is based on published agricultural recommendations, including PAU, ICAR and agricultural university sources.
                </p>
              </div>
            ) : (
              <p className="rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-600">
                No verified quantities are available yet. Please use a soil test and expert advice.
              </p>
            )}
          </section>

          {/* Important notes (engine warnings + advisories) */}
          {allNotes.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-xl bg-amber-50 p-3">
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                </div>
                <h2 className="pt-2 text-xl font-bold text-gray-900">A few things to remember</h2>
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
          )}

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
                  <FormField label="Crop">
                    <SelectInput
                      value={farmForm.crop}
                      onChange={handleCropChange}
                      placeholder={databaseCrop ? `Use my saved crop: ${readableLabel(databaseCrop)}` : "Select crop"}
                      options={CROP_OPTIONS}
                    />
                  </FormField>

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

                  <FormField label="Crop variety / type">
                    <SelectInput
                      value={farmForm.variety}
                      onChange={(value) => updateFarmForm("variety", value)}
                      placeholder="Select variety / type"
                      options={varietyOptions}
                    />
                  </FormField>

                  <FormField label="Growth stage">
                    <SelectInput
                      value={farmForm.stage}
                      onChange={(value) => updateFarmForm("stage", value)}
                      placeholder="Select current stage"
                      options={stageOptions}
                    />
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

                  <FormField label="Irrigation method">
                    <SelectInput
                      value={farmForm.irrigation_type}
                      onChange={(value) => updateFarmForm("irrigation_type", value)}
                      placeholder="Select irrigation"
                      options={IRRIGATION_OPTIONS}
                    />
                  </FormField>

                  <FormField label="Organic manure applied">
                    <SelectInput
                      value={farmForm.manure_type}
                      onChange={(value) => updateFarmForm("manure_type", value)}
                      placeholder="Select if applied"
                      options={MANURE_OPTIONS}
                    />
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
                  If you have a soil test report, enter the values shown. Leave unknown details blank.
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
                      ["nitrogen", "Nitrogen in soil"],
                      ["phosphorus", "Phosphorus in soil"],
                      ["potassium", "Potassium in soil"],
                      ["sulphur", "Sulphur in soil"],
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
                      stage: selectedFarm.stage ?? "",
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
