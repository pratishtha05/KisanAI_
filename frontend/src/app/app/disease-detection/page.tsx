"use client";

import { useRef, useState } from "react";

import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";

type Result = {
  status: "detected" | "healthy" | "uncertain" | "crop_mismatch";
  crop: string;
  predicted_crop?: string | null;
  predicted_disease?: string | null;
  confidence: number;
  message: string;

  description?: string | null;
  symptoms?: string[];
  causes?: string[];
  favourable_conditions?: string[];
  prevention?: string[];
  recommended_actions?: string[];

  source?: {
    organization: string;
    title: string;
    source_type: string;
    url: string;
  } | null;

  model_name?: string;
  model_version?: string;
};

const CROPS = [
  { name: "Apple", key: "apple", image: "/crops/apple.jpg" },
  { name: "Cassava", key: "cassava", image: "/crops/cassava.jpg" },
  { name: "Corn", key: "corn", image: "/crops/corn.jpg" },
  { name: "Potato", key: "potato", image: "/crops/potato.jpg" },
  { name: "Rice", key: "rice", image: "/crops/rice.jpg" },
  { name: "Sugarcane", key: "sugarcane", image: "/crops/sugarcane.jpg" },
  { name: "Tea", key: "tea", image: "/crops/tea.jpg" },
  { name: "Tomato", key: "tomato", image: "/crops/tomato.jpg" },
  { name: "Wheat", key: "wheat", image: "/crops/wheat.jpg" },
];

const normalizeCrop = (crop: string) => crop.trim();

export default function DiseaseDetectionPage() {
  const { t } = useLanguage();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedCrop, setSelectedCrop] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;

    setError("");
    setResult(null);
    setFile(selectedFile);

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
  };

  const selectCrop = (crop: string) => {
    setSelectedCrop(crop);
    setResult(null);
    setError("");
  };

  const analyzeImage = async () => {
    if (!selectedCrop) {
      setError(t("disease.error_crop"));
      return;
    }

    if (!file) {
      setError(t("disease.error_photo"));
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      formData.append("crop", normalizeCrop(selectedCrop));
      formData.append("file", file);

      const response = await api.post(
        "/disease-detection/analyze",
        formData
      );

      setResult(response.data);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        t("disease.error_generic");

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const confidencePercent = result
    ? Math.round(result.confidence * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#f0fdf4] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-7">
          <p className="mb-1 text-sm font-medium text-[#5d7a52]">
            {t("disease.crop_health")}
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-[#263528] sm:text-3xl">
            {t("disease.title")}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687467]">
            {t("disease.subtitle")}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">

          {/* LEFT: Upload */}
          <div className="rounded-2xl border border-[#dfe6dc] bg-white p-5 shadow-sm sm:p-6">

            {/* Crop selection */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-[#344333]">
                1. {t("disease.select_crop")}
              </label>

              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-3">
                {CROPS.map((crop) => {
                  const selected = selectedCrop === crop.name;

                  return (
                    <button
                      key={crop.key}
                      type="button"
                      onClick={() => selectCrop(crop.name)}
                      className={`group overflow-hidden rounded-xl border text-left transition ${
                        selected
                          ? "border-[#66885d] bg-[#edf5e9] ring-2 ring-[#66885d]/20"
                          : "border-[#dfe6dc] bg-white hover:border-[#b9cbb3] hover:bg-[#f8faf7]"
                      }`}
                    >
                      <div className="h-20 w-full overflow-hidden bg-[#eef2eb]">
                        <img
                          src={crop.image}
                          alt={t(
                            `disease.crop.${crop.key}`,
                            crop.name
                          )}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      </div>

                      <div className="px-2 py-2 text-center">
                        <p
                          className={`text-xs font-medium ${
                            selected
                              ? "text-[#405f39]"
                              : "text-[#4d594b]"
                          }`}
                        >
                          {t(
                            `disease.crop.${crop.key}`,
                            crop.name
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Leaf photo */}
            <div className="mb-3">
              <p className="text-sm font-medium text-[#344333]">
                2. {t("disease.add_leaf_photo")}
              </p>

              <p className="mt-1 text-xs text-[#7a8478]">
                {t("disease.close_photo")}
              </p>
            </div>

            {/* Image area */}
            <div className="overflow-hidden rounded-2xl border border-[#dfe6dc] bg-[#f8faf7]">

              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt={t("disease.upload_leaf")}
                    className="h-72 w-full bg-[#eef2eb] object-contain sm:h-80"
                  />

                  <button
                    type="button"
                    onClick={resetAnalysis}
                    className="absolute right-3 top-3 rounded-lg border border-[#dfe6dc] bg-white px-3 py-1.5 text-xs font-medium text-[#4c594b] shadow-sm hover:bg-[#f7f9f6]"
                  >
                    {t("disease.change_photo")}
                  </button>
                </div>
              ) : (
                <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center sm:min-h-80">

                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f0e4] text-[#58764f]">
                    <svg
                      width="23"
                      height="23"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    >
                      <path d="M12 16V4" />
                      <path d="M7 9l5-5 5 5" />
                      <path d="M5 20h14" />
                    </svg>
                  </div>

                  <p className="text-sm font-medium text-[#344333]">
                    {t("disease.upload_leaf")}
                  </p>

                  <p className="mt-1 max-w-sm text-xs leading-5 text-[#7a8478]">
                    {t("disease.clear_image")}
                  </p>

                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl bg-[#16A34A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#527149]"
                    >
                      {t("disease.upload_photo")}
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="rounded-xl border border-[#cfd9ca] bg-white px-4 py-2.5 text-sm font-medium text-[#4d6348] transition hover:bg-[#f5f8f3]"
                    >
                      {t("disease.take_photo")}
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            {/* Photo guidance */}
            <div className="mt-5 rounded-xl border border-[#e1e8de] bg-[#f8faf7] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#58764f]">
                {t("disease.better_result")}
              </p>

              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <GuidanceItem
                    positive
                    text={t("disease.good.close")}
                  />
                  <GuidanceItem
                    positive
                    text={t("disease.good.light")}
                  />
                  <GuidanceItem
                    positive
                    text={t("disease.good.visible")}
                  />
                  <GuidanceItem
                    positive
                    text={t("disease.good.focus")}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <GuidanceItem
                    negative
                    text={t("disease.avoid.screenshots")}
                  />
                  <GuidanceItem
                    negative
                    text={t("disease.avoid.field")}
                  />
                  <GuidanceItem
                    negative
                    text={t("disease.avoid.dark")}
                  />
                  <GuidanceItem
                    negative
                    text={t("disease.avoid.no_leaf")}
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-5 rounded-xl border border-[#ead8c5] bg-[#fffaf3] px-4 py-3 text-sm leading-5 text-[#775d3c]">
                {error}
              </div>
            )}

            {/* Analyze */}
            <button
              type="button"
              onClick={analyzeImage}
              disabled={loading || !file || !selectedCrop}
              className="mt-6 w-full rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#3f603a] disabled:cursor-not-allowed disabled:bg-[#b8c3b4]"
            >
              {loading
                ? t("disease.checking")
                : t("disease.check_leaf")}
            </button>
          </div>

          {/* RIGHT: Help / Result */}
          <div>
            {!result ? (
              <div className="rounded-2xl border border-[#dfe6dc] bg-white p-5 shadow-sm sm:p-6">

                <h2 className="text-base font-semibold text-[#344333]">
                  {t("disease.how_it_works")}
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#697468]">
                  {t("disease.how_it_works_desc")}
                </p>

                <div className="mt-5 space-y-3">

                  <InfoRow
                    title={t("disease.choose_crop")}
                    text={t("disease.choose_crop_desc")}
                  />

                  <InfoRow
                    title={t("disease.upload_clear")}
                    text={t("disease.upload_clear_desc")}
                  />

                  <InfoRow
                    title={t("disease.simple_guidance")}
                    text={t("disease.simple_guidance_desc")}
                  />

                </div>

                <div className="mt-6 border-t border-[#edf0eb] pt-5">
                  <p className="text-xs leading-5 text-[#7a8478]">
                    {t("disease.model_note")}
                  </p>
                </div>
              </div>
            ) : (
              <ResultCard
                result={result}
                confidencePercent={confidencePercent}
                onRetry={resetAnalysis}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GuidanceItem({
  text,
  positive,
  negative,
}: {
  text: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          positive
            ? "bg-[#dcf4df] text-[#16803b]"
            : negative
              ? "bg-[#fde3e3] text-[#c24141]"
              : "bg-[#eef2eb] text-[#687467]"
        }`}
      >
        {positive ? "✓" : negative ? "×" : ""}
      </span>

      <span className="text-xs leading-5 text-[#657061]">
        {text}
      </span>
    </div>
  );
}

function InfoRow({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl bg-[#f7f9f5] px-4 py-3">
      <p className="text-sm font-medium text-[#40513e]">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#707a6e]">
        {text}
      </p>
    </div>
  );
}

function ResultCard({
  result,
  confidencePercent,
  onRetry,
}: {
  result: Result;
  confidencePercent: number;
  onRetry: () => void;
}) {
  const { t } = useLanguage();

  if (result.status === "uncertain") {
    return (
      <div className="rounded-2xl border border-[#eadfc9] bg-white p-5 shadow-sm sm:p-6">

        <StatusIcon type="warning" />

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#8a6d43]">
          {t("disease.unclear_label")}
        </p>

        <h2 className="mt-1 text-xl font-semibold text-[#344333]">
          {t("disease.clearer_photo")}
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#697468]">
          {result.message}
        </p>

        <RetryInstructions />

        <button
          type="button"
          onClick={onRetry}
          className="mt-6 w-full rounded-xl bg-[#5f7f55] px-4 py-3 text-sm font-medium text-white hover:bg-[#527149]"
        >
          {t("disease.upload_another")}
        </button>
      </div>
    );
  }

  if (result.status === "crop_mismatch") {
    return (
      <div className="rounded-2xl border border-[#eadfc9] bg-white p-5 shadow-sm sm:p-6">

        <StatusIcon type="warning" />

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#8a6d43]">
          {t("disease.check_crop")}
        </p>

        <h2 className="mt-1 text-xl font-semibold text-[#344333]">
          {t("disease.other_crop")}
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#697468]">
          {result.message}
        </p>

        <div className="mt-5 rounded-xl bg-[#f8f9f6] px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#707a6e]">
              {t("disease.selected_crop")}
            </span>

            <span className="font-medium text-[#344333]">
              {result.crop}
            </span>
          </div>

          {result.predicted_crop && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-[#707a6e]">
                {t("disease.looks_like")}
              </span>

              <span className="font-medium text-[#344333]">
                {result.predicted_crop}
              </span>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs leading-5 text-[#7a8478]">
          {t("disease.no_disease_reported")}
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-6 w-full rounded-xl bg-[#5f7f55] px-4 py-3 text-sm font-medium text-white hover:bg-[#527149]"
        >
          {t("disease.try_another")}
        </button>
      </div>
    );
  }

  const healthy = result.status === "healthy";

  return (
    <div className="rounded-2xl border border-[#dfe6dc] bg-white p-5 shadow-sm sm:p-6">

      <StatusIcon type={healthy ? "healthy" : "detected"} />

      <p
        className={`mt-4 text-xs font-semibold uppercase tracking-wide ${
          healthy ? "text-[#58764f]" : "text-[#7a6342]"
        }`}
      >
        {healthy
          ? t("disease.no_disease")
          : t("disease.possible_disease")}
      </p>

      <h2 className="mt-1 text-xl font-semibold text-[#344333]">
        {healthy
          ? `${result.crop} ${t("disease.looks_healthy")}`
          : result.predicted_disease}
      </h2>

      <p className="mt-3 text-sm leading-6 text-[#697468]">
        {healthy
          ? t("disease.healthy_message")
          : result.message}
      </p>

      {/* Confidence */}
      <div className="mt-5 rounded-xl bg-[#f7f9f5] px-4 py-3">

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#697468]">
            {t("disease.confidence")}
          </span>

          <span className="text-sm font-semibold text-[#344333]">
            {confidencePercent}%
          </span>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e2e7df]">
          <div
            className="h-full rounded-full bg-[#66885d]"
            style={{
              width: `${Math.min(confidencePercent, 100)}%`,
            }}
          />
        </div>

        <p className="mt-1 text-xs text-[#707a6e]">
          {t("disease.confidence_desc")}
        </p>
      </div>

      {/* About the disease */}
      {!healthy && result.description && (
        <section className="mt-6">
          <SectionTitle>
            {t("disease.about")}
          </SectionTitle>

          <p className="mt-2 text-sm leading-6 text-[#5f695d]">
            {result.description}
          </p>
        </section>
      )}

      {/* Symptoms */}
      {!healthy &&
        result.symptoms &&
        result.symptoms.length > 0 && (
          <section className="mt-6">
            <SectionTitle>
              {t("disease.signs")}
            </SectionTitle>

            <BulletList items={result.symptoms} />
          </section>
        )}

      {/* Reasons */}
      {!healthy &&
        ((result.causes && result.causes.length > 0) ||
          (result.favourable_conditions &&
            result.favourable_conditions.length > 0)) && (
          <section className="mt-6">
            <SectionTitle>
              {t("disease.why")}
            </SectionTitle>

            <BulletList
              items={[
                ...(result.causes || []),
                ...(result.favourable_conditions || []),
              ]}
            />
          </section>
        )}

      {/* Recommended actions */}
      {!healthy &&
        result.recommended_actions &&
        result.recommended_actions.length > 0 && (
          <section className="mt-6">
            <SectionTitle>
              {t("disease.actions")}
            </SectionTitle>

            <ol className="mt-2 space-y-2">
              {result.recommended_actions.map((action, index) => (
                <li
                  key={index}
                  className="flex gap-3 text-sm leading-6 text-[#5f695d]"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8f0e4] text-[11px] font-semibold text-[#58764f]">
                    {index + 1}
                  </span>

                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

      {/* Prevention */}
      {!healthy &&
        result.prevention &&
        result.prevention.length > 0 && (
          <section className="mt-6">
            <SectionTitle>
              {t("disease.prevention")}
            </SectionTitle>

            <BulletList items={result.prevention} />
          </section>
        )}

      {/* Source / farming guidance */}
      <div className="mt-6 border-t border-[#edf0eb] pt-5">

        <p className="text-xs font-semibold uppercase tracking-wide text-[#697468]">
          {t("disease.farming_guidance")}
        </p>

        <p className="mt-2 text-xs leading-5 text-[#7a8478]">
          {t("disease.guidance_reference")}
        </p>

        {result.source && (
          <div className="mt-4 rounded-xl bg-[#f7f9f5] px-4 py-3">

            <p className="text-sm font-medium text-[#40513e]">
              {result.source.title}
            </p>

            <p className="mt-1 text-xs text-[#707a6e]">
              {result.source.organization}
            </p>

            {result.source.url && (
              <a
                href={result.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-[#58764f] hover:underline"
              >
                {t("disease.view_source")}
              </a>
            )}
          </div>
        )}

        <p className="mt-4 text-[11px] leading-5 text-[#8a9387]">
          {t("disease.pesticide_tip")}
        </p>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="mt-6 w-full rounded-xl border border-[#cfd9ca] bg-white px-4 py-3 text-sm font-medium text-[#4d6348] hover:bg-[#f6f8f4]"
      >
        {t("disease.check_another")}
      </button>
    </div>
  );
}

function RetryInstructions() {
  const { t } = useLanguage();

  return (
    <div className="mt-5 rounded-xl bg-[#f8f9f6] px-4 py-4">

      <p className="text-sm font-medium text-[#40513e]">
        {t("disease.retry_title")}
      </p>

      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[#707a6e]">
        <li>• {t("disease.retry.close")}</li>
        <li>• {t("disease.retry.focus")}</li>
        <li>• {t("disease.retry.light")}</li>
      </ul>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item, index) => (
        <li
          key={index}
          className="flex gap-2 text-sm leading-6 text-[#5f695d]"
        >
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#78966e]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h3 className="text-sm font-semibold text-[#40513e]">
      {children}
    </h3>
  );
}

function StatusIcon({
  type,
}: {
  type: "warning" | "healthy" | "detected";
}) {
  const isWarning = type === "warning";

  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-full ${
        isWarning
          ? "bg-[#f5ecdc] text-[#8a6d43]"
          : "bg-[#e7f0e3] text-[#58764f]"
      }`}
    >
      {isWarning ? (
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M12 3l9 17H3L12 3z" />
          <path d="M12 9v5" />
          <path d="M12 17h.01" />
        </svg>
      ) : (
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </div>
  );
}