'use client';

import React from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Info, 
  Zap, 
  FileWarning, 
  MapPin,
  Scale
} from 'lucide-react';

interface AnalysisProps {
  analysis: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendedAction: string;
    category: string;
    missingEvidence: string[];
  };
}

export default function AnalysisDashboard({ analysis }: AnalysisProps) {
  const getRiskColor = () => {
    switch (analysis.riskLevel) {
      case 'HIGH': return '#ef4444';
      case 'MEDIUM': return '#f59e0b';
      case 'LOW': return '#10b981';
      default: return '#64748b';
    }
  };

  const getRiskIcon = () => {
    switch (analysis.riskLevel) {
      case 'HIGH': return <ShieldAlert size={20} />;
      case 'MEDIUM': return <Info size={20} />;
      case 'LOW': return <ShieldCheck size={20} />;
      default: return <Info size={20} />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Risk Assessment */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg" style={{ background: `${getRiskColor()}15`, color: getRiskColor() }}>
            {getRiskIcon()}
          </div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Risk Level</span>
        </div>
        <div className="text-2xl font-black mb-1" style={{ color: getRiskColor() }}>
          {analysis.riskLevel}
        </div>
        <p className="text-sm text-gray-500">Based on legal severity metrics.</p>
      </div>

      {/* Recommended Action */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Zap size={20} />
          </div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recommended Action</span>
        </div>
        <div className="text-lg font-bold text-gray-900 leading-tight">
          {analysis.recommendedAction}
        </div>
      </div>

      {/* Category Detection */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <Scale size={20} />
          </div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Legal Category</span>
        </div>
        <div className="text-lg font-bold text-gray-900">
          {analysis.category}
        </div>
        <div className="mt-2 text-xs text-amber-600 font-semibold px-2 py-1 bg-amber-50 rounded inline-block">
          Auto-detected
        </div>
      </div>

      {/* Missing Evidence - Full Width */}
      <div className="md:col-span-3 bg-gray-50 border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileWarning size={20} className="text-gray-600" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Recommended Documentation/Evidence</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {analysis.missingEvidence.length > 0 ? (
            analysis.missingEvidence.map((item, i) => (
              <span key={i} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                {item}
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-500 italic">No specific evidence suggested yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}
