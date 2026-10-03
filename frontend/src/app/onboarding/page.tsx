"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, User, Sprout, Leaf, MapPin, Maximize, Layers, CheckCircle2, Navigation, Edit2, Loader2, MapPinned } from "lucide-react";

const stepVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

type CropData = {
  id: string;
  stage: string;
  cycle: string;
};

export default function Onboarding() {
  const TOTAL_STEPS = 6;
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { t, setCustomBackAction } = useLanguage();
  
  const [data, setData] = useState({ 
    name: "", 
    crops: [] as CropData[], 
    state: "", 
    district: "",
    village: "", 
    land_size: 5,
    land_unit: "", 
    soil_type: "" ,
    latitude: null as number | null,
    longitude: null as number | null,
  });
  
  const [locationMode, setLocationMode] = useState<"choice" | "manual" | "gps">("choice");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [landStep, setLandStep] = useState<1 | 2>(1);
  const [isOtherUnit, setIsOtherUnit] = useState(false);
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    setCustomBackAction(() => {
      if (stepRef.current > 1) {
        setStep(s => s - 1);
      } else {
        setShowCancelModal(true);
      }
    });

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      if (stepRef.current > 1) {
        setStep(s => s - 1);
      } else {
        setShowCancelModal(true);
      }
    };
    window.addEventListener("popstate", handlePopState);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [setCustomBackAction]);

  const confirmCancel = async () => {
    setIsCancelling(true);
    try {
      await api.delete("/users/me");
    } catch (e) {
      console.error("Failed to delete user on backend", e);
    } finally {
      localStorage.removeItem("token");
      setCustomBackAction(null);
      router.push("/welcome");
    }
  };

  const handleNext = () => setStep(s => s + 1);
  
  const handleFinish = async () => {
    setIsSaving(true);
    try {
      // 1. Save User Profile
      await api.post("/users/profile", { name: data.name, state: data.state, district: data.district });
      
      let standardizedLandSize = Number(data.land_size) || 0;
      const unit = (data.land_unit || "").toLowerCase();
      if (unit === "hectare") standardizedLandSize *= 2.47105;
      else if (unit === "bigha") standardizedLandSize *= 0.625;
      else if (unit === "kanal") standardizedLandSize *= 0.125;
      
      // 2. Save each Crop as a Farm record
      for (const crop of data.crops) {
        await api.post("/farms/", { 
          crop: crop.id, 
          stage: crop.stage,
          cycle_time: crop.cycle,
          land_size: parseFloat(standardizedLandSize.toFixed(2)), 
          soil_type: data.soil_type || "Unknown",
          latitude: data.latitude,
          longitude: data.longitude
        });
      }
      
      setCustomBackAction(null); 
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/app");
      }, 2000);
    } catch (e: any) {
      console.error("Save error:", e);
      alert(t("onboarding.error_saving") + (e.response?.data?.detail ? ": " + JSON.stringify(e.response.data.detail) : ""));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCrop = (cropId: string) => {
    setData(prev => {
      const exists = prev.crops.find(c => c.id === cropId);
      if (exists) {
        return { ...prev, crops: prev.crops.filter(c => c.id !== cropId) };
      } else {
        return { ...prev, crops: [...prev.crops, { id: cropId, stage: "veg", cycle: "med" }] };
      }
    });
  };

  const updateCropDetail = (cropId: string, field: "stage" | "cycle", value: string) => {
    setData(prev => ({
      ...prev,
      crops: prev.crops.map(c => c.id === cropId ? { ...c, [field]: value } : c)
    }));
  };

  const handleGetLocation = () => {
    setLocationMode("gps");
    setGpsStatus("loading");
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const geoData = await res.json();
          if (geoData && geoData.address) {
            const addr = geoData.address;
            const village = addr.village || addr.town || addr.city || addr.suburb || "";
            const district = addr.state_district || addr.county || "";
            const state = addr.state || "";
            setData(prev => ({
              ...prev,
              latitude,
              longitude,
              state,
              district,
              village
            }));
            setGpsStatus("success");
          } else {
            setGpsStatus("error");
          }
        } catch (e) {
          setGpsStatus("error");
        }
      },
      (error) => {
        setGpsStatus("error");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <>
      <div className="min-h-screen bg-[#F7F9F8] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-green-100/50 to-transparent pointer-events-none" />
        
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center justify-center text-center border border-gray-100"
            >
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={48} className="text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">All Set!</h1>
              <p className="text-gray-500 text-lg">Your farm profile has been created successfully. Redirecting you to the dashboard...</p>
              <Loader2 className="w-6 h-6 text-green-500 animate-spin mt-8" />
            </motion.div>
          ) : (
            <motion.div 
              key="form"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={`w-full relative z-10 transition-all duration-500 ease-in-out ${step === 2 || step === 6 ? "max-w-2xl" : step === 3 ? "max-w-4xl" : step === 5 ? "max-w-3xl" : "max-w-md"}`}
            >
              
              <div className="mb-8">
                <div className="flex justify-between text-xs font-semibold text-gray-400 mb-2 px-1">
                  <span>Step {step} of {TOTAL_STEPS}</span>
                  <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-green-500 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 md:p-8 border border-gray-100 min-h-[450px] max-h-[85vh] flex flex-col">
                <AnimatePresence mode="wait">
              
              {/* STEP 1: Name */}
              {step === 1 && (
                <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="flex flex-col h-full flex-1">
                  <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6 text-green-600">
                    <User size={28} strokeWidth={2} />
                  </div>
                  <h1 className="text-2xl font-bold mb-3 text-gray-900">{t("onboarding.title")}</h1>
                  <p className="text-gray-500 mb-8">{t("onboarding.step1.q")}</p>
                  
                  <div className="mt-auto">
                    <input 
                      className="w-full text-lg px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl mb-6 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all shadow-sm" 
                      placeholder={t("onboarding.step1.placeholder")}
                      value={data.name} 
                      onChange={e => setData({...data, name: e.target.value})} 
                      autoFocus 
                    />
                    <Button size="lg" className="w-full rounded-2xl shadow-md py-6 text-lg" onClick={handleNext} disabled={!data.name}>{t("onboarding.btn.continue")}</Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Multi-Crop Selection */}
              {step === 2 && (
                <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="flex flex-col h-full flex-1">
                  <h1 className="text-2xl font-bold mb-6 text-gray-900">{t("onboarding.step2.q")}</h1>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-6 overflow-y-auto p-2 scrollbar-thin">
                    {[
                      { id: "Apple", image: "/crops/apple.jpg" },
                      { id: "Corn/Maize", image: "/crops/corn.jpg" },
                      { id: "Potato", image: "/crops/potato.jpg" },
                      { id: "Rice", image: "/crops/rice.jpg" },
                      { id: "Sugarcane", image: "/crops/sugarcane.jpg" },
                      { id: "Tea", image: "/crops/tea.jpg" },
                      { id: "Cassava", image: "/crops/cassava.jpg" },
                      { id: "Tomato", image: "/crops/tomato.jpg" },
                      { id: "Wheat", image: "/crops/wheat.jpg" },
                    ].map(crop => {
                      const isSelected = data.crops.some(c => c.id === crop.id);
                      return (
                        <Card 
                          key={crop.id} 
                          className={`relative flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all border-2 rounded-2xl h-full min-h-[120px] ${isSelected ? "border-green-500 bg-green-50 shadow-md ring-2 ring-green-500 ring-offset-1 z-10" : "border-gray-100 hover:border-green-200 hover:bg-gray-50"}`}
                          onClick={() => toggleCrop(crop.id)}
                        >
                          {isSelected && <CheckCircle2 size={18} className="absolute top-2 right-2 text-green-600 bg-white rounded-full z-20" />}
                          <div className="w-14 h-14 sm:w-16 sm:h-16 relative mb-2 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                            <Image src={crop.image} alt={crop.id} fill className="object-cover" />
                          </div>
                          <span className={`text-xs font-semibold leading-tight ${isSelected ? "text-green-800" : "text-gray-600"}`}>
                            {t(`onboarding.step2.${crop.id.toLowerCase().replace(/[^a-z0-9]/g, "")}`, crop.id)}
                          </span>
                        </Card>
                      );
                    })}
                  </div>
                  <div className="mt-auto">
                    <Button size="lg" className="w-full rounded-2xl shadow-md py-6 text-lg" onClick={handleNext} disabled={data.crops.length === 0}>{t("onboarding.btn.continue")}</Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Crop Details (Stage & Cycle) */}
              {step === 3 && (
                <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="flex flex-col h-full flex-1">
                
                  <h1 className="text-2xl font-bold mb-6 text-gray-900">{t("onboarding.step2b.q")}</h1>
                  
                  <div className="overflow-y-auto max-h-[360px] mb-6 pr-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start scrollbar-thin scrollbar-thumb-gray-200">
                    {data.crops.map((crop, idx) => (
                      <div key={crop.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center justify-between">
                          <span>{t(`onboarding.step2.${crop.id.toLowerCase().replace(/[^a-z0-9]/g, "")}`, crop.id)}</span>
                          <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-md">Crop {idx + 1}</span>
                        </h3>
                        
                        {/* Stage Selector */}
                        <div className="mb-4">
                          <label className="text-sm font-semibold text-gray-600 block mb-2">{t("onboarding.step2b.stage_title")}</label>
                          <select 
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 font-medium text-gray-700"
                            value={crop.stage}
                            onChange={(e) => updateCropDetail(crop.id, "stage", e.target.value)}
                          >
                            <option value="sown">{t("onboarding.step2b.stage_sown")}</option>
                            <option value="veg">{t("onboarding.step2b.stage_veg")}</option>
                            <option value="flower">{t("onboarding.step2b.stage_flower")}</option>
                            <option value="harvest">{t("onboarding.step2b.stage_harvest")}</option>
                          </select>
                        </div>

                        {/* Cycle Selector */}
                        <div>
                          <label className="text-sm font-semibold text-gray-600 block mb-2">{t("onboarding.step2b.cycle_title")}</label>
                          <div className="grid grid-cols-3 gap-2">
                            {["short", "med", "long"].map(cycleId => (
                              <div 
                                key={cycleId}
                                onClick={() => updateCropDetail(crop.id, "cycle", cycleId)}
                                className={`text-center py-2 px-1 text-xs font-bold rounded-lg cursor-pointer transition-all border ${crop.cycle === cycleId ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-500 border-gray-200 hover:border-green-300"}`}
                              >
                                {t(`onboarding.step2b.cycle_${cycleId}`)}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-2">
                    <Button size="lg" className="w-full rounded-2xl shadow-md py-6 text-lg" onClick={handleNext}>{t("onboarding.btn.continue")}</Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Location */}
              {step === 4 && (
                <motion.div key="step4" variants={stepVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="flex flex-col h-full flex-1">
                  
                  <h1 className="text-2xl font-bold mb-6 text-gray-900 shrink-0">{t("onboarding.step3.q")}</h1>
                  
                  <div className="flex-1 flex flex-col mb-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                    {locationMode === "choice" && (
                      <div className="flex flex-col gap-4 mt-2">
                        <button onClick={handleGetLocation} className="w-full bg-white border-2 border-gray-100 hover:border-green-500 hover:bg-green-50 rounded-2xl p-4 text-left transition-all flex items-center gap-4 shadow-sm group">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0 group-hover:scale-110 transition-transform">
                            <MapPinned size={24} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-0.5 leading-tight">{t("onboarding.step4.choice.gps", "Use My Current Location")}</h3>
                            <p className="text-sm text-gray-500 leading-tight">{t("onboarding.step4.choice.gps_desc", "Automatically detect location")}</p>
                          </div>
                        </button>
                        
                        <div className="flex items-center justify-center gap-4 py-1 opacity-50">
                          <div className="flex-1 h-px bg-gray-300"></div>
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">OR</span>
                          <div className="flex-1 h-px bg-gray-300"></div>
                        </div>

                        <button onClick={() => setLocationMode("manual")} className="w-full bg-white border-2 border-gray-100 hover:border-gray-400 hover:bg-gray-50 rounded-2xl p-4 text-left transition-all flex items-center gap-4 shadow-sm group">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 shrink-0 group-hover:scale-110 transition-transform group-hover:text-gray-800 group-hover:bg-gray-200">
                            <Edit2 size={24} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-0.5 leading-tight">{t("onboarding.step4.choice.manual", "Enter Location Manually")}</h3>
                            <p className="text-sm text-gray-500 leading-tight">{t("onboarding.step4.choice.manual_desc", "Select your state, district and village")}</p>
                          </div>
                        </button>
                      </div>
                    )}

                    {locationMode === "gps" && (
                      <div className="flex flex-col items-center justify-center text-center py-6 h-full">
                        {gpsStatus === "loading" && (
                          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
                              <Loader2 size={32} className="animate-spin" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">{t("onboarding.step4.gps.loading", "Finding your location...")}</h3>
                          </div>
                        )}
                        {gpsStatus === "error" && (
                          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 w-full">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                              <AlertCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{t("onboarding.step4.gps.error", "Couldn't access your location.")}</h3>
                            <p className="text-sm text-gray-500 mb-6 max-w-[250px] leading-relaxed">{t("onboarding.step4.gps.error_desc", "Please allow location access or enter your location manually.")}</p>
                            <div className="flex flex-col gap-3 w-full">
                              <Button variant="outline" className="w-full py-4 rounded-xl text-base font-semibold" onClick={handleGetLocation}>{t("onboarding.step4.gps.try_again", "Try Again")}</Button>
                              <Button className="w-full py-4 rounded-xl text-base font-semibold" onClick={() => setLocationMode("manual")}>{t("onboarding.step4.choice.manual", "Enter Location Manually")}</Button>
                            </div>
                          </div>
                        )}
                        {gpsStatus === "success" && (
                          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 w-full">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                              <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{t("onboarding.step4.gps.success", "Location Found")}</h3>
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 w-full my-4">
                              <p className="font-bold text-gray-800 text-lg mb-1">{data.village ? `${data.village}, ` : ""}{data.district}</p>
                              <p className="text-sm text-gray-500 font-medium">{data.state}</p>
                            </div>
                            <button onClick={() => setLocationMode("choice")} className="text-sm font-semibold text-green-600 hover:text-green-700 underline mt-1 p-2">{t("onboarding.step4.change", "Change Location")}</button>
                          </div>
                        )}
                      </div>
                    )}

                    {locationMode === "manual" && (() => {
                      const MOCK_LOCATIONS: Record<string, Record<string, string[]>> = {
                        "Punjab": {
                          "Patiala": ["Rajpura", "Nabha", "Samana"],
                          "Ludhiana": ["Khanna", "Jagraon", "Raikot"],
                          "Amritsar": ["Ajnala", "Attari", "Beas"]
                        },
                        "Haryana": {
                          "Karnal": ["Nilokheri", "Indri", "Gharaunda"],
                          "Ambala": ["Naraingarh", "Barara", "Saha"]
                        },
                        "Maharashtra": {
                          "Pune": ["Haveli", "Khed", "Mulshi"],
                          "Nashik": ["Malegaon", "Sinnar", "Igatpuri"]
                        }
                      };
                      return (
                      <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                          <label className="text-sm font-semibold text-gray-600 block mb-1.5">{t("onboarding.step3.state")}</label>
                          <div className="relative">
                            <select 
                              className="w-full text-base px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all shadow-sm appearance-none font-medium text-gray-800"
                              value={data.state} 
                              onChange={e => setData({...data, state: e.target.value, district: "", village: ""})}
                            >
                              <option value="">{t("onboarding.step4.select_state", "Select State")}</option>
                              {Object.keys(MOCK_LOCATIONS).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-600 block mb-1.5">{t("onboarding.step3.district")}</label>
                          <div className="relative">
                            <select 
                              className="w-full text-base px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all shadow-sm appearance-none disabled:opacity-50 disabled:bg-gray-100 font-medium text-gray-800"
                              value={data.district} 
                              onChange={e => setData({...data, district: e.target.value, village: ""})}
                              disabled={!data.state}
                            >
                              <option value="">{t("onboarding.step4.select_district", "Select District")}</option>
                              {data.state && MOCK_LOCATIONS[data.state] && Object.keys(MOCK_LOCATIONS[data.state]).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-600 block mb-1.5">{t("onboarding.step4.manual.village", "Village / Town")}</label>
                          <div className="relative">
                            <select 
                              className="w-full text-base px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all shadow-sm appearance-none disabled:opacity-50 disabled:bg-gray-100 font-medium text-gray-800"
                              value={data.village} 
                              onChange={e => setData({...data, village: e.target.value})}
                              disabled={!data.district}
                            >
                              <option value="">{t("onboarding.step4.select_village", "Select Village")}</option>
                              {data.state && data.district && MOCK_LOCATIONS[data.state]?.[data.district] && MOCK_LOCATIONS[data.state][data.district].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                          </div>
                        </div>
                        <div className="text-center mt-1">
                          <button onClick={() => setLocationMode("choice")} className="text-sm font-semibold text-gray-500 hover:text-gray-700 underline p-2">{t("onboarding.step4.change", "Change Location Method")}</button>
                        </div>
                      </div>
                    );})()}
                  </div>
                  <div className="mt-auto pt-4 border-t border-gray-100 shrink-0">
                    <Button 
                      size="lg" 
                      className="w-full rounded-2xl shadow-md py-6 text-lg" 
                      onClick={handleNext} 
                      disabled={locationMode === "choice" || (locationMode === "gps" && gpsStatus !== "success") || !data.state || !data.district}
                    >
                      {t("onboarding.btn.continue")}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: Land Size */}
              {step === 5 && (
                <motion.div key="step5" variants={stepVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="flex flex-col h-full flex-1 min-h-0">
                  <div className="flex-1 flex flex-col mb-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 shrink-0">
                  
                      <h1 className="text-2xl font-bold text-gray-900 shrink-0">{t("onboarding.step4.q", "How much land do you farm?")}</h1>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-8 shrink-0 flex-1">
                      {/* Left: Unit Selection */}
                      <div className="flex-1 shrink-0">
                        <label className="text-sm font-semibold text-gray-600 block mb-3">{t("onboarding.step4.q_unit", "Select measurement unit:")}</label>
                        <div className="flex flex-wrap gap-2">
                          {["Acres", "Bigha", "Kanal", "Hectare"].map(unit => (
                            <button 
                              key={unit}
                              onClick={() => {
                                setData({...data, land_unit: unit, land_size: data.land_size || (unit === "Acres" || unit === "Hectare" ? 5 : 10)});
                                setIsOtherUnit(false);
                              }}
                              className={`px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${data.land_unit === unit && !isOtherUnit ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-green-200'}`}
                            >
                              {t(`onboarding.unit.${unit.toLowerCase()}`, unit)}
                            </button>
                          ))}
                          <button 
                            onClick={() => {
                              setIsOtherUnit(true);
                              if (["Acres", "Bigha", "Kanal", "Hectare"].includes(data.land_unit)) {
                                setData({...data, land_unit: ""});
                              }
                            }}
                            className={`px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${isOtherUnit ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-green-200'}`}
                          >
                            {t("onboarding.unit.other", "Other")}
                          </button>
                        </div>
                        
                        {isOtherUnit && (
                          <div className="mt-3 animate-in fade-in zoom-in duration-200">
                            <input 
                              type="text"
                              className="w-full text-base px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-sm" 
                              placeholder={t("onboarding.unit.other_placeholder", "Enter unit (e.g. Marla)")}
                              value={data.land_unit}
                              onChange={e => setData({...data, land_unit: e.target.value})}
                            />
                          </div>
                        )}
                      </div>

                      {/* Right: Quantity Controls */}
                      <div className="w-full md:w-72 flex flex-col items-center justify-center bg-gray-50 rounded-3xl p-5 border border-gray-100 shadow-sm shrink-0 mb-4 md:mb-0">
                        <div className="flex items-center justify-center gap-3 w-full">
                          <button 
                            onClick={() => {
                              const increment = data.land_unit === "Acres" || data.land_unit === "Hectare" ? 0.5 : 1;
                              setData({...data, land_size: Math.max(increment, Number(data.land_size) - increment)});
                            }}
                            className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-green-500 hover:text-green-600 hover:bg-green-50 shadow-sm transition-all shrink-0 active:scale-95"
                          >
                            <span className="text-2xl font-medium">−</span>
                          </button>
                          
                          <div className="flex-1 relative flex flex-col items-center">
                            <input 
                              type="number" 
                              className="w-full text-4xl font-bold bg-transparent text-center focus:outline-none text-gray-900" 
                              value={data.land_size || ""} 
                              onChange={e => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setData({...data, land_size: Math.max(0, val)});
                              }} 
                            />
                            <div className="text-center text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest">{data.land_unit || "..."}</div>
                          </div>

                          <button 
                            onClick={() => {
                              const increment = data.land_unit === "Acres" || data.land_unit === "Hectare" ? 0.5 : 1;
                              setData({...data, land_size: Number(data.land_size) + increment});
                            }}
                            className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-green-500 hover:text-green-600 hover:bg-green-50 shadow-sm transition-all shrink-0 active:scale-95"
                          >
                            <span className="text-2xl font-medium">+</span>
                          </button>
                        </div>
                        
                        {(Number(data.land_size) <= 0) && (
                          <p className="text-red-500 text-xs font-semibold mt-4 text-center">{t("onboarding.step4.error", "Please enter the approximate land area.")}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-gray-100 shrink-0">
                    <Button 
                      size="lg" 
                      className="w-full rounded-2xl shadow-md py-6 text-lg" 
                      onClick={handleNext} 
                      disabled={!data.land_unit.trim() || !data.land_size || Number(data.land_size) <= 0}
                    >
                      {t("onboarding.btn.continue")}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 6: Soil Type */}
              {step === 6 && (
                <motion.div key="step6" variants={stepVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} className="flex flex-col h-full flex-1">
              
                  <h1 className="text-2xl font-bold mb-8 text-gray-900">{t("onboarding.step5.q")}</h1>
                  
                  <div className="flex flex-col flex-1 min-h-0 mb-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200">
                      {[
                        { id: "Loamy", label: t("onboarding.step5.loamy", "Loamy") },
                        { id: "Sandy", label: t("onboarding.step5.sandy", "Sandy") },
                        { id: "Clayey", label: t("onboarding.step5.clayey", "Clayey") },
                        { id: "Silty", label: t("onboarding.step5.silty", "Silty") },
                        { id: "Black", label: t("onboarding.step5.black", "Black") },
                        { id: "Red", label: t("onboarding.step5.red", "Red") },
                        { id: "Alluvial", label: t("onboarding.step5.alluvial", "Alluvial") },
                        { id: "Laterite", label: t("onboarding.step5.laterite", "Laterite") },
                        { id: "Other", label: t("onboarding.step5.other", "Other") },
                      ].map(soil => (
                        <Card 
                          key={soil.id} 
                          className={`relative p-5 text-center cursor-pointer text-sm font-semibold transition-all border-2 rounded-2xl flex items-center justify-center min-h-[80px] ${data.soil_type === soil.id ? "border-green-500 bg-green-50 text-green-700 shadow-sm scale-105 z-10" : "border-gray-100 hover:border-green-200 text-gray-600"}`}
                          onClick={() => setData({...data, soil_type: soil.id})}
                        >
                          {data.soil_type === soil.id && <CheckCircle2 size={18} className="absolute top-2 right-2 text-green-500" />}
                          {soil.label}
                        </Card>
                      ))}
                    </div>

                    <div className="mt-4 shrink-0 px-1">
                      <button 
                        onClick={() => setData({...data, soil_type: "Unknown"})}
                        className={`w-full relative p-4 text-center cursor-pointer text-sm font-semibold transition-all border-2 rounded-2xl flex items-center justify-center ${data.soil_type === "Unknown" ? "border-gray-800 bg-gray-800 text-white shadow-sm" : "border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-500 border-dashed"}`}
                      >
                        {data.soil_type === "Unknown" && <CheckCircle2 size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-white" />}
                        {t("onboarding.step5.unknown", "I don't know my soil type")}
                      </button>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Button size="lg" className="w-full rounded-2xl shadow-md py-6 text-lg bg-green-600 hover:bg-green-700 text-white" onClick={handleFinish} disabled={!data.soil_type || isSaving}>
                      {isSaving ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : t("onboarding.btn.finish")}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {showCancelModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => !isCancelling && setShowCancelModal(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-dialog-title"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-sm z-50 flex flex-col items-center text-center border border-gray-100"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 text-red-500">
                <AlertCircle size={32} strokeWidth={2} />
              </div>
              <h2 id="cancel-dialog-title" className="text-2xl font-bold text-gray-900 mb-2">Cancel Setup?</h2>
              <p className="text-gray-500 mb-8">
                Your progress will be lost and you will need to verify your mobile number again next time.
              </p>
              
              <div className="flex flex-col gap-3 w-full">
                <Button 
                  size="lg" 
                  className="w-full bg-red-500 hover:bg-red-600 font-semibold py-6 rounded-2xl shadow-sm text-lg text-white" 
                  onClick={confirmCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? "Cancelling..." : "Yes, Cancel"}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full font-semibold py-6 rounded-2xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 text-lg" 
                  onClick={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                >
                  No, Continue Setup
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
