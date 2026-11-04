"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  Sprout,
  Droplets,
  CalendarDays,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock3,
  CloudRain,
  RefreshCw,
  Ban,
} from "lucide-react";
import api from "@/lib/api";

type Farm = {
  id: number;
  crop?: string;
  stage?: string;
  soil_type?: string;
  sowing_date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Recommendation = {
  decision: string; // IRRIGATE_TODAY | WAIT | NOT_NEEDED | INSUFFICIENT_DATA
  decision_label: string;
  urgency?: string;
  stage: string | null;
  stage_priority: string; // "high" | "normal"
  stage_message: string;
  recommended_date: string | null;
  next_check_date?: string | null;
  days_until_due?: number | null;
  needs_first_irrigation?: boolean;
  show_irrigated_button?: boolean;
  rain_adjustment_days: number;
  rain_expected_soon: boolean;
  soil_feedback?: string | null;
  reason: string;
  advisories?: string[];
  warnings?: string[];
  weather_note?: string | null;
};

type IrrigationData = {
  farm_id: number;
  crop: string;
  soil_type: string;
  sowing_date: string | null;
  last_irrigation_date: string | null;
  recommendation: Recommendation;
  weather_available?: boolean;
  weather_adjustment: {
    rain_expected_soon: boolean;
    rain_adjustment_days: number;
  };
  disclaimer: string;
};

export default function IrrigationPage() {
  const [farm, setFarm] = useState<Farm | null>(null);
  const [data, setData] = useState<IrrigationData | null>(null);

  const [loading, setLoading] = useState(true);
  // Blocking error: nothing to show at all.
  const [error, setError] = useState<string | null>(null);
  // Non-blocking error: keep showing the last good advice.
  const [actionError, setActionError] = useState<string | null>(null);
  const [noFarm, setNoFarm] = useState(false);

  const [soilFeedback, setSoilFeedback] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecommendation = async (
    farmData: Farm,
    feedback: string | null = null
  ): Promise<boolean> => {
    try {
      const response = await api.get(`/irrigation/${farmData.id}`, {
        params: feedback ? { soil_feedback: feedback } : undefined,
      });
      setData(response.data);
      setError(null);
      setActionError(null);
      return true;
    } catch (err: any) {
      console.error(
        "Irrigation recommendation error:",
        err.response?.status,
        err.response?.data,
        err
      );
      const detail =
        err.response?.data?.detail || "Unable to load irrigation recommendation.";
      // Keep previous advice on screen if we have it.
      setActionError(detail);
      setError(detail);
      return false;
    }
  };

  useEffect(() => {
    const fetchFarm = async () => {
      try {
        setLoading(true);
        setError(null);

        const farmRes = await api.get("/farms/");
        const farms: Farm[] = farmRes.data;

        if (!farms || farms.length === 0) {
          setNoFarm(true);
          return;
        }

        const selectedFarm = farms[0];
        setFarm(selectedFarm);
        await fetchRecommendation(selectedFarm);
      } catch (err: any) {
        console.error("Irrigation loading error:", err);
        setError(err.response?.data?.detail || "Unable to load farm information.");
      } finally {
        setLoading(false);
      }
    };

    fetchFarm();
  }, []);

  const handleSoilFeedback = async (feedback: string) => {
    if (!farm) return;
    const previous = soilFeedback;
    setSoilFeedback(feedback);
    setRefreshing(true);
    const ok = await fetchRecommendation(farm, feedback);
    if (!ok) setSoilFeedback(previous); // do not show a selection that was not applied
    setRefreshing(false);
  };

  const handleIrrigatedToday = async () => {
    if (!farm) return;

    try {
      setLogging(true);
      setActionError(null);

      await api.post(`/irrigation/${farm.id}/log`);
      // Fresh irrigation: soil feedback from before no longer applies.
      setSoilFeedback(null);
      await fetchRecommendation(farm, null);
    } catch (err: any) {
      console.error("Failed to log irrigation:", err.response?.data, err);
      setActionError(err.response?.data?.detail || "Failed to record irrigation.");
    } finally {
      setLogging(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not available";
    const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  };

  const getDecisionStyles = (decision: string) => {
    switch (decision) {
      case "IRRIGATE_TODAY":
        return {
          card: "bg-green-50 border-green-200",
          icon: "text-green-600",
          badge: "bg-green-100 text-green-800",
        };
      case "WAIT":
        return {
          card: "bg-amber-50 border-amber-200",
          icon: "text-amber-600",
          badge: "bg-amber-100 text-amber-800",
        };
      case "INSUFFICIENT_DATA":
        return {
          card: "bg-red-50 border-red-100",
          icon: "text-red-500",
          badge: "bg-red-100 text-red-700",
        };
      default: // NOT_NEEDED
        return {
          card: "bg-gray-50 border-gray-200",
          icon: "text-gray-500",
          badge: "bg-gray-100 text-gray-700",
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center">
          <Droplets className="mx-auto mb-3 text-green-600" size={36} />
          <p className="text-sm text-gray-500">
            Preparing your irrigation recommendation...
          </p>
        </div>
      </div>
    );
  }

  if (noFarm) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <Card className="max-w-md p-6 text-center">
          <Sprout className="mx-auto mb-3 text-green-600" size={32} />
          <h2 className="font-semibold text-gray-900">No farm added</h2>
          <p className="text-sm text-gray-500 mt-2">
            Add your farm details first to receive an irrigation recommendation.
          </p>
        </Card>
      </div>
    );
  }

  // Only block the whole page when there is nothing to show.
  if (!data || !farm) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <Card className="max-w-lg p-6 text-center border-red-100">
          <AlertTriangle className="mx-auto mb-3 text-red-500" size={32} />
          <h2 className="font-semibold text-gray-900">
            Unable to load irrigation advice
          </h2>
          <p className="text-sm text-red-600 mt-3">
            {error || "Unable to generate irrigation recommendation."}
          </p>
          <p className="text-sm text-gray-500 mt-3">
            Make sure your farm has crop, soil type and location information.
          </p>
        </Card>
      </div>
    );
  }

  const rec = data.recommendation;
  const styles = getDecisionStyles(rec.decision);

  const isDueToday = rec.decision === "IRRIGATE_TODAY";
  const isCritical = rec.stage_priority === "high";
  const isNotNeeded = rec.decision === "NOT_NEEDED";
  const showIrrigatedButton =
    rec.show_irrigated_button ?? rec.decision === "IRRIGATE_TODAY";

  const nextIrrigationText = isDueToday
    ? "Today"
    : isNotNeeded
    ? "No irrigation needed"
    : rec.recommended_date
    ? formatDate(rec.recommended_date)
    : rec.next_check_date
    ? `Check again on ${formatDate(rec.next_check_date)}`
    : "Not available";

  return (
    <div className="min-h-full bg-gradient-to-b from-green-50/60 via-white to-white">
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-8">
        <div className="mb-7">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-green-100 text-green-700">
                  <Droplets size={21} />
                </div>
                <span className="text-sm font-medium text-green-700">
                  Smart Irrigation
                </span>
              </div>

              <h1>Irrigation Planner</h1>

              <p className="text-sm md:text-base text-gray-500 mt-1.5">
                Simple, crop-specific irrigation guidance based on your farm,
                soil and upcoming rainfall.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-50 border border-green-100 text-green-700 font-medium">
                <Sprout size={15} />
                {farm.crop || "Crop not specified"}
              </span>

              {farm.stage && (
                <span className="inline-flex items-center px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-600">
                  {farm.stage}
                </span>
              )}

              {farm.soil_type && (
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-600">
                  <Droplets size={14} />
                  {farm.soil_type}
                </span>
              )}
            </div>
          </div>
        </div>

        {actionError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex gap-2">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            <span>{actionError} Showing your last available advice.</span>
          </div>
        )}

        <Card
          className={`mb-7 overflow-hidden border-2 ${styles.card} ${
            refreshing ? "opacity-70" : ""
          }`}
        >
          <div className="h-1 bg-green-600" />

          <div className="p-5 md:p-7">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <CalendarDays className="text-green-600" size={16} />
                  <span>Today's irrigation decision</span>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className={`flex-shrink-0 p-4 rounded-2xl bg-white ${styles.icon}`}
                  >
                    {isDueToday ? (
                      <CheckCircle2 size={42} />
                    ) : isNotNeeded ? (
                      <Ban size={42} />
                    ) : rec.decision === "INSUFFICIENT_DATA" ? (
                      <AlertTriangle size={42} />
                    ) : (
                      <Clock3 size={42} />
                    )}
                  </div>

                  <div>
                    <div className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight">
                      {rec.decision_label}
                    </div>

                    <span
                      className={`inline-flex mt-2 text-xs font-bold px-2.5 py-1 rounded-full ${styles.badge}`}
                    >
                      {isCritical
                        ? "Critical irrigation stage"
                        : "Normal irrigation stage"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="max-w-md">
                <p className="text-base md:text-lg font-semibold leading-7 text-gray-900">
                  {rec.reason}
                </p>

                {rec.stage && (
                  <p className="text-sm text-gray-600 mt-2">
                    Stage: <strong>{rec.stage}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {rec.needs_first_irrigation && rec.decision !== "INSUFFICIENT_DATA" && (
          <div className="mb-7 rounded-2xl border-2 border-sky-200 bg-sky-50 px-5 py-4">
            <div className="flex gap-3">
              <Info className="text-sky-600 flex-shrink-0 mt-0.5" size={22} />
              <div>
                <p className="font-semibold text-sky-900">First irrigation</p>
                <p className="text-sm md:text-base text-sky-800 mt-1">
                  No irrigation has been recorded yet. Tap "I irrigated today"
                  after you irrigate, and your schedule will start from that day.
                </p>
              </div>
            </div>
          </div>
        )}

        {isCritical && !isNotNeeded && (
          <div className="mb-7 rounded-2xl border-2 border-green-200 bg-green-50 px-5 py-4">
            <div className="flex gap-3">
              <Sprout
                className="text-green-600 flex-shrink-0 mt-0.5"
                size={22}
              />
              <div>
                <p className="font-semibold text-green-900">
                  Important crop stage
                </p>
                <p className="text-sm md:text-base text-green-800 mt-1">
                  {rec.stage_message}
                </p>
              </div>
            </div>
          </div>
        )}

        {rec.advisories && rec.advisories.length > 0 && (
          <Card className="mb-7 p-5 border-gray-200">
            <h2 className="font-bold text-gray-900 mb-2">Advice for this stage</h2>
            <ul className="space-y-1.5 text-sm md:text-base text-gray-700 list-disc pl-5">
              {rec.advisories.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </Card>
        )}

        {rec.warnings && rec.warnings.length > 0 && (
          <div className="mb-7 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="flex gap-3">
              <AlertTriangle
                className="text-amber-600 flex-shrink-0 mt-0.5"
                size={20}
              />
              <ul className="space-y-1 text-sm text-amber-900">
                {rec.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-7">
          <Card className="p-5 border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-green-100 text-green-700">
                <CalendarDays size={21} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Next irrigation</h2>
                <p className="text-sm text-gray-500">
                  Based on your current farm conditions
                </p>
              </div>
            </div>

            <div className="text-2xl font-bold text-gray-900">
              {nextIrrigationText}
            </div>

            {data.last_irrigation_date && (
              <p className="text-sm text-gray-500 mt-2">
                Last irrigation:{" "}
                <strong>{formatDate(data.last_irrigation_date)}</strong>
              </p>
            )}
          </Card>

          <Card className="p-5 border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                <CloudRain size={21} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Weather</h2>
                <p className="text-sm text-gray-500">
                  Weather is considered automatically
                </p>
              </div>
            </div>

            {data.weather_available === false ? (
              <p className="text-base font-semibold text-gray-900">
                Weather is currently unavailable. Advice is based on crop stage
                and schedule only.
              </p>
            ) : rec.rain_expected_soon ? (
              <p className="text-base font-semibold text-gray-900">
                Rain is expected soon. Irrigation may be postponed.
              </p>
            ) : rec.rain_adjustment_days > 0 ? (
              <p className="text-base font-semibold text-gray-900">
                Rainfall has adjusted the schedule by approximately{" "}
                {rec.rain_adjustment_days} day(s).
              </p>
            ) : (
              <p className="text-base font-semibold text-gray-900">
                No significant rainfall adjustment is currently required.
              </p>
            )}

            {rec.weather_note && (
              <p className="text-sm text-gray-600 mt-2">{rec.weather_note}</p>
            )}
          </Card>
        </div>

        <section className="mb-7">
          <Card className="p-5 md:p-6">
            <div className="flex gap-3 mb-5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <Droplets size={21} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  How does your soil feel?
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Your observation can adjust the recommendation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: "too dry", label: "Too dry" },
                { value: "normal", label: "Normal" },
                { value: "too wet", label: "Too wet" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSoilFeedback(option.value)}
                  disabled={refreshing}
                  className={`min-h-[52px] rounded-xl border-2 px-4 font-semibold transition disabled:opacity-60 ${
                    soilFeedback === option.value
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50/50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Card>
        </section>

        {showIrrigatedButton && (
          <section className="mb-7">
            <Card className="p-5 md:p-6 border-green-100 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {rec.needs_first_irrigation
                      ? "Did you do your first irrigation?"
                      : "Have you irrigated today?"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Record it to reset your irrigation schedule.
                  </p>
                </div>

                <button
                  onClick={handleIrrigatedToday}
                  disabled={logging}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {logging ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />I irrigated today
                    </>
                  )}
                </button>
              </div>
            </Card>
          </section>
        )}

        <section className="mb-7">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Farm information
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FarmInfo label="Crop" value={farm.crop || "–"} />
            <FarmInfo label="Stage" value={farm.stage || "–"} />
            <FarmInfo label="Soil" value={farm.soil_type || "–"} />
            <FarmInfo
              label="Last irrigation"
              value={
                data.last_irrigation_date
                  ? formatDate(data.last_irrigation_date)
                  : "Not recorded"
              }
            />
          </div>
        </section>

        <Card className="p-4 bg-gray-50/80 border-gray-200">
          <div className="flex gap-3">
            <Info size={18} className="text-gray-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-500 leading-relaxed">
              {data.disclaimer}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FarmInfo({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold text-gray-900 mt-1 capitalize">{value}</div>
    </Card>
  );
}
