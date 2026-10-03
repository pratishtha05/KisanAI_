"use client";

import { useRef, useState } from "react";
import api from "@/lib/api";

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
  "Apple",
  "Cassava",
  "Corn",
  "Potato",
  "Rice",
  "Sugarcane",
  "Tea",
  "Tomato",
  "Wheat",
];

const normalizeCrop = (crop: string) => crop.trim();

export default function DiseaseDetectionPage() {
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

  const analyzeImage = async () => {
    if (!selectedCrop) {
      setError("Please select the crop first.");
      return;
    }

    if (!file) {
      setError("Please upload a clear photo of the affected leaf.");
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
        "We could not analyze this image. Please try again.";

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
            Crop Health
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-[#263528] sm:text-3xl">
            Check your crop for disease
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687467]">
            Upload a clear photo of a crop leaf and KisanAI will check it
            against the diseases supported by the system.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">

          {/* LEFT: Upload */}
          <div className="rounded-2xl border border-[#dfe6dc] bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-6">
              <label
                htmlFor="crop"
                className="mb-2 block text-sm font-medium text-[#344333]"
              >
                1. Select your crop
              </label>

              <select
                id="crop"
                value={selectedCrop}
                onChange={(e) => {
                  setSelectedCrop(e.target.value);
                  setResult(null);
                  setError("");
                }}
                className="w-full rounded-xl border border-[#d7dfd3] bg-white px-4 py-3 text-sm text-[#344333] outline-none transition focus:border-[#78966e] focus:ring-2 focus:ring-[#78966e]/10"
              >
                <option value="">Choose a crop</option>

                {CROPS.map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <p className="text-sm font-medium text-[#344333]">
                2. Add a leaf photo
              </p>

              <p className="mt-1 text-xs text-[#7a8478]">
                Take a close photo of one affected leaf whenever possible.
              </p>
            </div>

            {/* Image area */}
            <div className="overflow-hidden rounded-2xl border border-[#dfe6dc] bg-[#f8faf7]">

              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Selected crop leaf"
                    className="h-72 w-full object-contain bg-[#eef2eb] sm:h-80"
                  />

                  <button
                    type="button"
                    onClick={resetAnalysis}
                    className="absolute right-3 top-3 rounded-lg border border-[#dfe6dc] bg-white px-3 py-1.5 text-xs font-medium text-[#4c594b] shadow-sm hover:bg-[#f7f9f6]"
                  >
                    Change photo
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
                    Upload a leaf photo
                  </p>

                  <p className="mt-1 max-w-sm text-xs leading-5 text-[#7a8478]">
                    Use a clear, well-lit image where the leaf and affected
                    area can be seen.
                  </p>

                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl bg-[#16A34A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#527149]"
                    >
                      Upload photo
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="rounded-xl border border-[#cfd9ca] bg-white px-4 py-2.5 text-sm font-medium text-[#4d6348] transition hover:bg-[#f5f8f3]"
                    >
                      Take photo
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

            {/* Instructions */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#58764f]">
                  For a better result
                </p>

                <ul className="space-y-1.5 text-xs leading-5 text-[#657061]">
                  <li>✓ Photograph one leaf clearly</li>
                  <li>✓ Use natural or good lighting</li>
                  <li>✓ Keep the affected area visible</li>
                  <li>✓ Keep the image sharp and focused</li>
                </ul>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8a6d43]">
                  Avoid
                </p>

                <ul className="space-y-1.5 text-xs leading-5 text-[#657061]">
                  <li>× Screenshots or documents</li>
                  <li>× Whole-field photographs</li>
                  <li>× Very dark or blurry images</li>
                  <li>× Photos without a visible leaf</li>
                </ul>
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
              {loading ? "Checking image..." : "Check leaf"}
            </button>
          </div>

          {/* RIGHT: Result / Help */}
          <div>
            {!result ? (
              <div className="rounded-2xl border border-[#dfe6dc] bg-white p-5 shadow-sm sm:p-6">

                <h2 className="text-base font-semibold text-[#344333]">
                  Before you upload
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#697468]">
                  A close-up leaf photograph gives the system the best chance
                  of identifying a supported disease pattern.
                </p>

                <div className="mt-5 space-y-3">

                  <InfoRow
                    title="One leaf is enough"
                    text="Try to keep one affected leaf clearly visible instead of photographing the entire field."
                  />

                  <InfoRow
                    title="Show the affected area"
                    text="Spots, lesions, discoloration and other visible symptoms should be in focus."
                  />

                  <InfoRow
                    title="Use the correct crop"
                    text="Select the crop before checking the image. This helps prevent unrelated predictions."
                  />

                  

                </div>

                <div className="mt-6 border-t border-[#edf0eb] pt-5">
                  <p className="text-xs leading-5 text-[#7a8478]">
                    KisanAI currently checks the crop conditions included in
                    its trained disease model. Images outside those conditions
                    may be rejected or marked as uncertain.
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

function InfoRow({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl bg-[#f7f9f5] px-4 py-3">
      <p className="text-sm font-medium text-[#40513e]">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[#707a6e]">{text}</p>
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
  if (result.status === "uncertain") {
    return (
      <div className="rounded-2xl border border-[#eadfc9] bg-white p-5 shadow-sm sm:p-6">

        <StatusIcon type="warning" />

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#8a6d43]">
          Unable to identify reliably
        </p>

        <h2 className="mt-1 text-xl font-semibold text-[#344333]">
          We need a clearer leaf photo
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
          Upload another photo
        </button>
      </div>
    );
  }

  if (result.status === "crop_mismatch") {
    return (
      <div className="rounded-2xl border border-[#eadfc9] bg-white p-5 shadow-sm sm:p-6">

        <StatusIcon type="warning" />

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#8a6d43]">
          Please check the crop
        </p>

        <h2 className="mt-1 text-xl font-semibold text-[#344333]">
          The image may belong to another crop
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#697468]">
          {result.message}
        </p>

        <div className="mt-5 rounded-xl bg-[#f8f9f6] px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#707a6e]">Selected crop</span>
            <span className="font-medium text-[#344333]">
              {result.crop}
            </span>
          </div>

          {result.predicted_crop && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-[#707a6e]">Image appears closer to</span>
              <span className="font-medium text-[#344333]">
                {result.predicted_crop}
              </span>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs leading-5 text-[#7a8478]">
          No disease is being reported from this result. Please verify the
          crop selection or upload a clearer image.
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-6 w-full rounded-xl bg-[#5f7f55] px-4 py-3 text-sm font-medium text-white hover:bg-[#527149]"
        >
          Try another photo
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
        {healthy ? "No disease pattern detected" : "Possible disease detected"}
      </p>

      <h2 className="mt-1 text-xl font-semibold text-[#344333]">
        {healthy
          ? `${result.crop} appears healthy`
          : result.predicted_disease}
      </h2>

      <p className="mt-3 text-sm leading-6 text-[#697468]">
        {healthy
          ? "The uploaded image did not show a supported disease pattern."
          : result.message}
      </p>

      {/* Confidence */}
      <div className="mt-5 rounded-xl bg-[#f7f9f5] px-4 py-3">

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#697468]">
            Detection confidence
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

        <p className="mt-2 text-[11px] leading-4 text-[#7a8478]">
          This indicates how strongly the image model matched the selected
          class. It is not a guarantee that the disease is present.
        </p>
      </div>

      {!healthy && result.description && (
        <section className="mt-6">
          <SectionTitle>What we found</SectionTitle>

          <p className="mt-2 text-sm leading-6 text-[#5f695d]">
            {result.description}
          </p>
        </section>
      )}

      {!healthy &&
        result.symptoms &&
        result.symptoms.length > 0 && (
          <section className="mt-6">
            <SectionTitle>What you may notice</SectionTitle>

            <BulletList items={result.symptoms} />
          </section>
        )}

      {!healthy &&
        result.causes &&
        result.causes.length > 0 && (
          <section className="mt-6">
            <SectionTitle>Conditions associated with it</SectionTitle>

            <BulletList items={result.causes} />
          </section>
        )}
      {!healthy &&
        result.favourable_conditions &&
        result.favourable_conditions.length > 0 && (
          <section className="mt-6">
            <SectionTitle>Favourable conditions</SectionTitle>
        
            <BulletList items={result.favourable_conditions} />
          </section>
        )}
      {!healthy &&
        result.recommended_actions &&
        result.recommended_actions.length > 0 && (
          <section className="mt-6">
            <SectionTitle>What you can do</SectionTitle>

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

        {!healthy &&
          result.prevention &&
          result.prevention.length > 0 && (
            <section className="mt-6">
              <SectionTitle>How to prevent it</SectionTitle>
          
              <BulletList items={result.prevention} />
            </section>
          )}

      {/* Source */}
      <div className="mt-6 border-t border-[#edf0eb] pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#697468]">
          Farming guidance
        </p>
              
        <p className="mt-2 text-xs leading-5 text-[#7a8478]">
          The disease is identified by KisanAI's image model, while the
          symptoms and management information are based on the agricultural
          reference below. Confirm the diagnosis with a local agricultural
          expert before applying pesticides or other crop-protection products.
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
                View source →
              </a>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="mt-6 w-full rounded-xl border border-[#cfd9ca] bg-white px-4 py-3 text-sm font-medium text-[#4d6348] hover:bg-[#f6f8f4]"
      >
        Check another leaf
      </button>
    </div>
  );
}

function RetryInstructions() {
  return (
    <div className="mt-5 rounded-xl bg-[#f8f9f6] px-4 py-4">
      <p className="text-sm font-medium text-[#40513e]">
        Try another photo
      </p>

      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[#707a6e]">
        <li>• Photograph one leaf rather than the whole plant.</li>
        <li>• Keep the affected area close and in focus.</li>
        <li>• Use natural daylight where possible.</li>
        <li>• Avoid screenshots, documents and unrelated objects.</li>
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

function SectionTitle({ children }: { children: React.ReactNode }) {
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