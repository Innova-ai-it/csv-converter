import React from 'react';
import { ConversionStats } from '../types';
import { Package, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface StatsPanelProps {
  stats: ConversionStats;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
            <Package size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Products</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalProducts}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 text-green-600 rounded-md">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Total Rows (Variants)</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalVariants}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${stats.warnings.length > 0 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
            {stats.warnings.length > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Warnings</p>
            <p className="text-2xl font-bold text-slate-800">{stats.warnings.length}</p>
          </div>
        </div>
      </div>

      {stats.warnings.length > 0 && (
        <div className="md:col-span-3 bg-orange-50 border border-orange-100 p-3 rounded-lg text-sm text-orange-800 max-h-32 overflow-y-auto">
          <h4 className="font-semibold mb-1 flex items-center gap-1"><AlertTriangle size={14}/> Issues found:</h4>
          <ul className="list-disc pl-5 space-y-1">
            {stats.warnings.slice(0, 5).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {stats.warnings.length > 5 && <li>...and {stats.warnings.length - 5} more</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
