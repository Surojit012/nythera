'use client';

import React from 'react';
import { ArrowRightIcon } from '@/components/ui/Icons';

interface StepDefinition {
  title: string;
  description: string;
}

interface StepWizardProps {
  steps: StepDefinition[];
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode;
  showNavigation?: boolean;
}

export default function StepWizard({
  steps,
  currentStep,
  onStepChange,
  children,
  showNavigation = true,
}: StepWizardProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="w-full">
      {/* Step Indicator */}
      <div className="relative mb-10 md:mb-14">
        {/* Connecting Line (behind circles) */}
        <div className="hidden sm:block absolute top-5 left-0 right-0 h-px">
          <div className="mx-auto flex" style={{ width: `${((steps.length - 1) / steps.length) * 100}%`, marginLeft: `${(1 / steps.length) * 50}%` }}>
            {steps.slice(0, -1).map((_, index) => (
              <div key={index} className="flex-1 h-px relative">
                <div
                  className={`absolute inset-0 transition-colors duration-500 ${
                    index < currentStep
                      ? 'bg-warm-clay/70'
                      : 'bg-ink/10'
                  }`}
                  style={
                    index < currentStep
                      ? {}
                      : { backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0, currentColor 4px, transparent 4px, transparent 10px)' , background: 'none' }
                  }
                />
                {index >= currentStep && (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `repeating-linear-gradient(90deg, rgba(26,26,26,0.18) 0, rgba(26,26,26,0.18) 4px, transparent 4px, transparent 10px)`
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isFuture = index > currentStep;

            return (
              <button
                key={index}
                onClick={() => {
                  if (isCompleted) onStepChange(index);
                }}
                disabled={isFuture}
                className={`
                  flex flex-col items-center text-center flex-1
                  transition-all duration-300
                  ${isCompleted ? 'cursor-pointer' : isFuture ? 'cursor-default' : 'cursor-default'}
                `}
              >
                {/* Circle */}
                <div
                  className={`
                    relative w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center
                    transition-all duration-500 ease-out
                    ${
                      isCompleted
                        ? 'ny-success-mark'
                        : isCurrent
                          ? 'bg-white/60 border-2 border-warm-clay text-ink shadow-md shadow-warm-clay/15'
                          : 'bg-white/35 border-2 border-dashed border-ink/20 text-ink/35'
                    }
                  `}
                >
                  {/* Pulse ring on current */}
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full border-2 border-warm-clay/30 animate-ping" />
                  )}

                  {isCompleted ? (
                    <svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="font-mono text-xs sm:text-sm font-bold">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Title */}
                <p
                  className={`
                    hidden sm:block font-display text-xs sm:text-sm font-semibold mt-3 leading-tight
                    transition-colors duration-300
                    ${
                      isCompleted
                        ? 'text-warm-clay'
                        : isCurrent
                          ? 'text-ink'
                          : 'text-ink/40'
                    }
                  `}
                >
                  {step.title}
                </p>

                {/* Description (hidden on mobile if too many steps) */}
                <p
                  className={`
                    hidden sm:block font-body text-[11px] mt-1 max-w-[120px] leading-snug
                    transition-colors duration-300
                    ${
                      isCurrent
                        ? 'text-ink/55'
                        : isCompleted
                          ? 'text-warm-clay/70'
                          : 'text-ink/30'
                    }
                  `}
                >
                  {step.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active step title/desc on mobile only */}
      <div className="mt-2 mb-6 text-center sm:hidden bg-white/35 rounded-xl border border-ink/[0.06] p-3">
        <p className="text-xs font-semibold text-warm-clay uppercase tracking-wider">
          Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink/65">
          {steps[currentStep].description}
        </p>
      </div>

      {/* Step Content */}
      <div className="min-h-[200px]">
        {children}
      </div>

      {showNavigation && (
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-ink/10">
          <button
            onClick={() => onStepChange(currentStep - 1)}
            disabled={isFirstStep}
            className={`
              inline-flex items-center gap-2
              px-5 py-2.5 rounded-lg
              font-mono text-sm
              transition-all duration-200
              ${
                isFirstStep
                  ? 'text-ink/25 cursor-not-allowed'
                  : 'text-ink/60 hover:text-ink hover:bg-white/50'
              }
            `}
          >
            <ArrowRightIcon size={14} className="rotate-180" />
            Back
          </button>

          <span className="font-mono text-xs text-ink/45">
            {currentStep + 1} / {steps.length}
          </span>

          <button
            onClick={() => onStepChange(currentStep + 1)}
            disabled={isLastStep}
            className={`
              inline-flex items-center gap-2
              px-5 py-2.5 rounded-lg
              font-mono text-sm font-medium
              transition-all duration-300
              ${
                isLastStep
                  ? 'text-ink/25 cursor-not-allowed'
                  : 'bg-ink text-offwhite hover:bg-warm-clay hover:text-ink shadow-md shadow-ink/15'
              }
            `}
          >
            Next
            <ArrowRightIcon size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
