"use client";

import React, { useEffect, useState } from "react";
import { getHardwareInfo, getCapacityReport, HardwareInfo, CapacityReport } from "@/lib/api/system";

export default function HardwareSetupWizard() {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [capacity, setCapacity] = useState<CapacityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hwEvaluated = localStorage.getItem("hw_evaluated");
    if (!hwEvaluated) {
      setIsVisible(true);
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hwInfo, capReport] = await Promise.all([
        getHardwareInfo(),
        getCapacityReport()
      ]);
      setHardware(hwInfo);
      setCapacity(capReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (capacity) {
      // Normally here you'd also save to Zustand: useSystemStore.getState().setCapacity(capacity)
      localStorage.setItem("hw_evaluated", "true");
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Hardware Setup Wizard</h2>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Detecting your hardware...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            Error detecting hardware: {error}
          </div>
        )}

        {!loading && hardware && capacity && (
          <div className="space-y-6">
            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">CPU</h3>
                <p className="text-sm">{hardware.cpu_brand}</p>
                <p className="text-sm text-gray-500">{hardware.cpu_cores} Cores @ {hardware.cpu_freq_mhz.toFixed(0)}MHz</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">RAM</h3>
                <p className="text-sm">{hardware.ram_total_gb.toFixed(2)} GB Total</p>
                <p className="text-sm text-gray-500">{hardware.ram_available_gb.toFixed(2)} GB Available</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">GPU</h3>
                {hardware.gpu_list.length > 0 ? (
                  hardware.gpu_list.map((g, i) => (
                    <div key={i} className="mb-2">
                      <p className="text-sm">{g.name}</p>
                      <p className="text-sm text-gray-500">{g.vram_gb.toFixed(2)} GB VRAM</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No Dedicated GPU Detected</p>
                )}
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Storage</h3>
                <p className="text-sm">{hardware.disk_free_gb.toFixed(2)} GB Free</p>
              </div>
            </div>

            {/* Capacity Report */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">System Capacity</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase
                  ${capacity.tier === 'workstation' ? 'bg-purple-100 text-purple-800' :
                    capacity.tier === 'high' ? 'bg-green-100 text-green-800' :
                    capacity.tier === 'mid' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'}`}>
                  {capacity.tier} TIER
                </span>
              </div>

              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Max Concurrent Agents</p>
                <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{capacity.max_agents}</p>
              </div>

              {capacity.warnings.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-400 mb-2">Warnings</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {capacity.warnings.map((w, i) => (
                      <li key={i} className="text-sm text-orange-700 dark:text-orange-300">{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {capacity.suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-400 mb-2">Suggestions</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {capacity.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-blue-700 dark:text-blue-300">{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={handleConfirm}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Confirm & Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
