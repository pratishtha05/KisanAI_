"use client";
import { useState, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Leaf, Upload, AlertCircle } from "lucide-react";
import api from "@/lib/api";

export default function DiseaseDetection() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await api.post("/disease-detection/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(res.data);
    } catch (e) {
      alert("We couldn't check your crop right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
        <Leaf className="text-green-600" /> Crop Health
      </h1>
      
      {!result && !loading && (
        <>
          <p className="text-gray-600 mb-8">
            Is something unusual on your plant?<br/>
            Take a clear photo of the affected leaf and let KisanAI check it.
          </p>

          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={inputRef} 
            onChange={handleFileChange} 
          />

          {!preview ? (
            <Card 
              className="p-12 flex flex-col items-center justify-center border-dashed border-2 cursor-pointer hover:bg-gray-50 text-gray-500 mb-6"
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={48} className="mb-4 text-gray-400" />
              <div className="font-medium text-lg mb-1">Upload Photo</div>
              <div className="text-sm">Tap to select or take a picture</div>
            </Card>
          ) : (
            <div className="mb-6">
              <div className="relative rounded-2xl overflow-hidden mb-4 border shadow-sm">
                <img src={preview} alt="Crop preview" className="w-full aspect-square object-cover" />
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => setPreview(null)}>Retake</Button>
                <Button className="flex-1" onClick={handleUpload}>Analyze Photo</Button>
              </div>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="animate-pulse bg-green-100 p-6 rounded-full mb-6">
            <Leaf size={48} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Checking your crop...</h2>
          <p className="text-gray-500 text-sm">
            Looking at the leaf<br/>
            Checking for possible problems<br/>
            Preparing your advice
          </p>
        </div>
      )}

      {result && !loading && (
        <div className="animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">🌿 Your Crop Health Result</h2>
          </div>
          
          <Card className="p-6 border-red-200 bg-red-50 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-sm font-bold text-red-800 uppercase">Possible Issue</div>
                <div className="text-2xl font-bold text-red-900">{result.possible_issue}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-red-800">Confidence</div>
                <div className="font-bold text-red-900">{Math.round(result.confidence * 100)}%</div>
              </div>
            </div>
            
            <div className="mb-4">
              <span className="inline-flex px-2 py-1 bg-red-100 text-red-800 rounded-md text-sm font-medium">
                Severity: {result.severity}
              </span>
            </div>

            <div className="text-red-900 text-sm leading-relaxed border-t border-red-200 pt-4">
              {result.what_we_found}
            </div>
          </Card>

          <h3 className="font-bold text-lg mb-4">What you can do</h3>
          <ul className="space-y-3 mb-8">
            {result.what_you_can_do.map((act: string, i: number) => (
              <li key={i} className="flex gap-3 bg-white p-4 rounded-xl border shadow-sm">
                <div className="text-green-600 shrink-0">✓</div>
                <div className="text-gray-700 text-sm leading-relaxed">{act}</div>
              </li>
            ))}
          </ul>

          <div className="flex items-start gap-3 bg-gray-100 p-4 rounded-xl text-gray-600 text-xs mb-8">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>This is an AI-assisted result. For serious crop damage, consult a qualified agricultural expert.</p>
          </div>

          <Button variant="outline" className="w-full" onClick={() => {setResult(null); setPreview(null);}}>
            Check Another Leaf
          </Button>
        </div>
      )}
    </div>
  );
}
