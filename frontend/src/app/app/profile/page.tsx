"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Sprout, MapPin, Calendar, Layers, Activity, Ruler } from "lucide-react";
import api from "@/lib/api";

export default function MyProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/users/profile").catch(() => null),
      api.get("/farms/").catch(() => null)
    ]).then(([p, f]) => {
      if (p) setProfile(p.data);
      if (f && f.data.length > 0) setFarms(f.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-500 mt-20 flex justify-center items-center h-40">Loading your profile...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-8 text-gray-900">My Profile</h1>
      
      {profile && (
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Personal Details</h2>
          <Card className="p-6 md:p-8 bg-white border border-gray-100 shadow-sm rounded-3xl">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl font-bold text-green-700 shrink-0">
                {profile.name.charAt(0)}
              </div>
              <div>
                <div className="font-extrabold text-2xl text-gray-900">{profile.name}</div>
                <div className="text-gray-500 flex items-center gap-1 mt-1 font-medium">
                  <MapPin size={16} /> {profile.district}, {profile.state}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">State</p>
                <p className="font-semibold text-gray-900">{profile.state}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">District</p>
                <p className="font-semibold text-gray-900">{profile.district}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">My Crops & Farm Details</h2>
        {farms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {farms.map((farm, index) => (
              <Card key={farm.id || index} className="p-6 bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Sprout size={100} />
                </div>
                <h3 className="font-extrabold text-2xl mb-6 flex items-center gap-3 text-green-700">
                  <div className="p-2 bg-green-100 rounded-xl"><Sprout size={24} className="text-green-600" /></div>
                  {farm.crop}
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-500 flex items-center gap-2"><Activity size={16} /> Stage</span>
                    <span className="font-semibold text-gray-900 capitalize">{farm.stage || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-500 flex items-center gap-2"><Calendar size={16} /> Cycle Time</span>
                    <span className="font-semibold text-gray-900 capitalize">{farm.cycle_time || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-500 flex items-center gap-2"><Ruler size={16} /> Land Size</span>
                    <span className="font-semibold text-gray-900">{farm.land_size} acres</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-500 flex items-center gap-2"><Layers size={16} /> Soil Type</span>
                    <span className="font-semibold text-gray-900">{farm.soil_type}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-10 text-center text-gray-500 rounded-3xl border-dashed">
            <Sprout size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-lg">No farm details set up yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
