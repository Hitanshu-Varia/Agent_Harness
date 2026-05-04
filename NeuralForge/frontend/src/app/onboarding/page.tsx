"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const router = useRouter();

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      router.push("/projects/1");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 bg-card rounded-lg border shadow-lg flex flex-col gap-6">
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome to NeuralForge</h1>
            <p className="text-muted-foreground">The AI Command Center</p>
          </div>
        )}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Hardware Setup</h1>
            <p className="text-muted-foreground">Detecting hardware capabilities...</p>
          </div>
        )}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">API Keys</h1>
            <p className="text-muted-foreground">Add your first API key</p>
          </div>
        )}
        {step === 4 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Create Project</h1>
            <p className="text-muted-foreground">Name your first project</p>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
          >
            {step === 4 ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
