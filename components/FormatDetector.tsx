import React from 'react';
import { SourceFormat } from '../types';
import { Settings2 } from 'lucide-react';

interface FormatDetectorProps {
  format: SourceFormat;
  onFormatChange: (format: SourceFormat) => void;
}

const FormatDetector: React.FC<FormatDetectorProps> = ({ format, onFormatChange }) => {
  const getBadgeColor = (fmt: SourceFormat) => {
    switch (fmt) {
      case SourceFormat.WOOCOMMERCE: return 'bg-purple-100 text-purple-700 border-purple-200';
      case SourceFormat.WIX: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case SourceFormat.PRESTASHOP: return 'bg-pink-100 text-pink-700 border-pink-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md">
           <Settings2 size={20} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Detected Format</h3>
          <p className="text-xs text-slate-500">Based on file headers</p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getBadgeColor(format)}`}>
          {format}
        </span>
        <select
          value={format}
          onChange={(e) => onFormatChange(e.target.value as SourceFormat)}
          className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 block p-1.5 border bg-white text-slate-700"
        >
          <option value={SourceFormat.WOOCOMMERCE}>WooCommerce</option>
          <option value={SourceFormat.WIX}>Wix</option>
          <option value={SourceFormat.PRESTASHOP}>PrestaShop</option>
          <option value={SourceFormat.UNKNOWN}>Unknown/Custom</option>
        </select>
      </div>
    </div>
  );
};

export default FormatDetector;
