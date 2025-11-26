import React from 'react';
import { Download } from 'lucide-react';
import { ShopifyRow } from '../types';
import { generateCSV } from '../services/csvService';

interface ExportButtonProps {
  data: ShopifyRow[];
}

const ExportButton: React.FC<ExportButtonProps> = ({ data }) => {
  const handleDownload = () => {
    if (data.length === 0) return;

    const csvContent = generateCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `shopify_import_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={data.length === 0}
      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
    >
      <Download size={20} />
      <span>Download Shopify CSV</span>
    </button>
  );
};

export default ExportButton;
