
import React from 'react';

const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse p-2">
      <div className="h-4 bg-slate-800 rounded-full w-1/3"></div>
      <div className="h-16 bg-slate-800 rounded-3xl w-full"></div>
      <div className="h-64 bg-slate-900/50 rounded-[2.5rem] border border-slate-800"></div>
      <div className="space-y-3">
        <div className="h-3 bg-slate-800 rounded-full w-full"></div>
        <div className="h-3 bg-slate-800 rounded-full w-5/6"></div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;
