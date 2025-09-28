import React from 'react';
import { GraphIcon } from './icons/GraphIcon';

interface Props {
  isHealthCheckRunning: boolean;
}

export const Header: React.FC<Props> = ({ isHealthCheckRunning }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-slate-950/70 backdrop-blur-sm border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <GraphIcon className="h-8 w-8 text-green-400" />
            <span className="text-xl font-semibold text-slate-100">
              Graph Schema Architect
            </span>
          </div>
          <div className="flex items-center space-x-4">
             {isHealthCheckRunning && (
                <div className="flex items-center space-x-2" title="AI Health Check is running...">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                    </span>
                    <span className="text-xs text-sky-400 hidden sm:inline">Analyzing...</span>
                </div>
             )}
             <span className="inline-flex items-center rounded-md bg-green-400/10 px-2 py-1 text-xs font-medium text-green-300 ring-1 ring-inset ring-green-400/20">
              Sprint 5: Final Polish
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};