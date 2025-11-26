import React from 'react';
import { ShopifyRow } from '../types';

interface DataPreviewProps {
  data: ShopifyRow[];
}

const DataPreview: React.FC<DataPreviewProps> = ({ data }) => {
  if (data.length === 0) return null;

  // Key columns to show in preview
  const previewColumns = [
    'Handle', 'Title', 'Variant Price', 'Variant SKU', 'Image Src', 'Type', 'Published', 'Status'
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800">Preview Data (First 10 Rows)</h3>
        <span className="text-xs text-slate-500">Mapped Shopify Format</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs text-slate-700 uppercase bg-slate-100">
            <tr>
              {previewColumns.map((col) => (
                <th key={col} className="px-6 py-3 whitespace-nowrap border-b border-slate-200">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((row, index) => (
              <tr key={index} className="bg-white border-b hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-900 whitespace-nowrap">{row['Handle']}</td>
                <td className="px-6 py-3 whitespace-nowrap max-w-xs truncate" title={row['Title']}>{row['Title']}</td>
                <td className="px-6 py-3">{row['Variant Price']}</td>
                <td className="px-6 py-3">{row['Variant SKU']}</td>
                <td className="px-6 py-3 max-w-xs truncate text-xs text-blue-500" title={row['Image Src']}>
                    {row['Image Src'] ? '...'+row['Image Src'].slice(-20) : '-'}
                </td>
                <td className="px-6 py-3 whitespace-nowrap">{row['Type']}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${row['Published'] === 'TRUE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {row['Published']}
                  </span>
                </td>
                <td className="px-6 py-3">
                   {row['Status'] && (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${row['Status'] === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {row['Status']}
                    </span>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-center text-slate-500">
         Showing {Math.min(10, data.length)} of {data.length} rows generated
      </div>
    </div>
  );
};

export default DataPreview;