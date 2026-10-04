"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Loader2, Edit2, Check, User, Sprout, MapPin, Layers, Ruler, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";

export default function MyProfile() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    state: "",
    district: "",
    village: ""
  });
  
  const [farmData, setFarmData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, f] = await Promise.all([
        api.get("/users/profile").catch(() => null),
        api.get("/farms/").catch(() => null)
      ]);
      
      setFormData({
        name: p?.data?.name || "",
        state: p?.data?.state || "",
        district: p?.data?.district || "",
        village: p?.data?.village || ""
      });
      
      setFarmData(f?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.post("/users/profile", formData);

      // Update existing farms
      for (const farm of farmData) {
        if (farm.id) {
          // If update PUT endpoint doesn't exist, this might fail, but we added it.
          await api.put(`/farms/${farm.id}`, {
            crop: farm.crop || "",
            land_size: parseFloat(farm.land_size) || 0,
            soil_type: farm.soil_type || "Unknown",
            stage: farm.stage || "Sowing",
            cycle_time: farm.cycle_time || "Unknown"
          }).catch(console.error);
        } else {
          // New farm
          await api.post("/farms/", {
            crop: farm.crop || "",
            land_size: parseFloat(farm.land_size) || 0,
            soil_type: farm.soil_type || "Unknown",
            stage: farm.stage || "Sowing",
            cycle_time: farm.cycle_time || "Unknown"
          }).catch(console.error);
        }
      }

      await fetchData();
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateFarm = (index: number, field: string, value: string) => {
    const newFarms = [...farmData];
    newFarms[index] = { ...newFarms[index], [field]: value };
    setFarmData(newFarms);
  };

  const addFarm = () => {
    setFarmData([...farmData, { crop: "", land_size: "", soil_type: "", stage: "", cycle_time: "" }]);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-8 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t("profile.title", "Profile Details")}</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">{t("profile.subtitle", "Manage your personal and farm information")}</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline" className="rounded-xl shadow-sm bg-white hover:bg-gray-50 font-bold px-6 border-gray-200 text-gray-800">
            <Edit2 size={16} className="mr-2" /> {t("profile.edit", "Edit")}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => { setIsEditing(false); fetchData(); }} variant="ghost" className="rounded-xl font-bold text-gray-500">{t("profile.cancel", "Cancel")}</Button>
            <Button onClick={handleSave} className="rounded-xl bg-green-600 hover:bg-green-700 shadow-sm font-bold px-6" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Check size={16} className="mr-2" />}
              {t("profile.save", "Save")}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-12">
        {/* Personal Details */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <User size={20} className="text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">{t("profile.personal", "Personal Information")}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <Field label={t("profile.fullname", "Full Name")} value={formData.name} isEditing={isEditing} onChange={(v: string) => setFormData({...formData, name: v})} placeholder="Your Name" t={t} />
            <Field label={t("profile.village", "Village")} value={formData.village} isEditing={isEditing} onChange={(v: string) => setFormData({...formData, village: v})} placeholder="Your Village" t={t} />
            <Field label={t("profile.district", "District")} value={formData.district} isEditing={isEditing} onChange={(v: string) => setFormData({...formData, district: v})} placeholder="Your District" t={t} />
            <Field label={t("profile.state", "State")} value={formData.state} isEditing={isEditing} onChange={(v: string) => setFormData({...formData, state: v})} placeholder="Your State" t={t} />
          </div>
        </section>

        {/* Farm Details */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sprout size={20} className="text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">{t("profile.portfolio", "Farm Portfolio")}</h2>
            </div>
            {isEditing && (
              <button onClick={addFarm} className="text-green-600 font-bold text-sm flex items-center hover:text-green-700 transition-colors">
                <Plus size={16} className="mr-1" /> {t("profile.addcrop", "Add Crop")}
              </button>
            )}
          </div>

          <div className="space-y-6">
            {farmData.length === 0 ? (
              <div className="text-gray-400 text-center py-8 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">{t("profile.nocrops", "No crops added yet.")}</div>
            ) : (
              farmData.map((farm, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative">
                  <div className="absolute top-0 right-6 -translate-y-1/2 bg-green-100 text-green-800 text-xs font-extrabold px-3 py-1 rounded-full border border-green-200 uppercase tracking-widest">
                    Crop {idx + 1}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-6">
                    <Field label={t("profile.cropname", "Crop Name")} value={farm.crop} isEditing={isEditing} onChange={(v: string) => updateFarm(idx, "crop", v)} placeholder="e.g. Wheat" t={t} />
                    <Field label={t("profile.landsize", "Land Size (Acres)")} type="number" value={farm.land_size} isEditing={isEditing} onChange={(v: string) => updateFarm(idx, "land_size", v)} placeholder="e.g. 5" t={t} />
                    <Field label={t("profile.soiltype", "Soil Type")} value={farm.soil_type} isEditing={isEditing} onChange={(v: string) => updateFarm(idx, "soil_type", v)} placeholder="e.g. Loamy" t={t} />
                    <Field label={t("profile.stage", "Current Stage")} value={farm.stage} isEditing={isEditing} onChange={(v: string) => updateFarm(idx, "stage", v)} placeholder="e.g. Vegetative" t={t} />
                    <Field label={t("profile.cycletime", "Cycle Time")} value={farm.cycle_time} isEditing={isEditing} onChange={(v: string) => updateFarm(idx, "cycle_time", v)} placeholder="e.g. Oct-Apr" t={t} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// Reusable Field Component
function Field({ label, value, isEditing, onChange, type = "text", placeholder = "", t }: any) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{label}</label>
      {isEditing ? (
        <input 
          type={type}
          value={value || ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-900 font-semibold text-sm shadow-sm"
        />
      ) : (
        <div className="text-gray-900 font-bold text-[15px] pb-1 border-b border-gray-100 min-h-[28px]">
          {value || <span className="text-gray-400 font-normal italic">{t("profile.notspecified", "Not specified")}</span>}
        </div>
      )}
    </div>
  );
}
