"use client";

import React, { useEffect, useState } from "react";
import { createResourceMonitorWebSocket, ResourceSnapshot } from "@/lib/api/system";

export default function ResourceMonitor() {
  const [resources, setResources] = useState<ResourceSnapshot | null>(null);

  useEffect(() => {
    const ws = createResourceMonitorWebSocket((data) => {
      setResources(data);
    });

    return () => {
      ws.close();
    };
  }, []);

  if (!resources) {
    return (
      <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-2 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex space-x-4 text-xs z-40">
        Connecting...
      </div>
    );
  }

  const ProgressBar = ({ label, percent, color }: { label: string, percent: number, color: string }) => (
    <div className="flex flex-col min-w-[80px]">
      <div className="flex justify-between mb-1">
        <span className="font-semibold text-gray-600 dark:text-gray-300">{label}</span>
        <span className="text-gray-500">{percent.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}></div>
      </div>
    </div>
  );

  const getCpuColor = (p: number) => p > 80 ? 'bg-red-500' : p > 50 ? 'bg-yellow-500' : 'bg-blue-500';
  const getRamColor = (p: number) => p > 85 ? 'bg-red-500' : p > 60 ? 'bg-yellow-500' : 'bg-green-500';
  const getGpuColor = (p: number) => p > 80 ? 'bg-red-500' : p > 50 ? 'bg-yellow-500' : 'bg-purple-500';

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex space-x-6 text-xs z-40 backdrop-blur-md bg-opacity-90">
      <ProgressBar label="CPU" percent={resources.cpu_percent} color={getCpuColor(resources.cpu_percent)} />
      <ProgressBar label="RAM" percent={resources.ram_percent} color={getRamColor(resources.ram_percent)} />
      <ProgressBar label="GPU" percent={resources.gpu_percent} color={getGpuColor(resources.gpu_percent)} />
    </div>
  );
}
