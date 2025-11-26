import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import FileUploader from './components/FileUploader';
import FormatDetector from './components/FormatDetector';
import DataPreview from './components/DataPreview';
import StatsPanel from './components/StatsPanel';
import ExportButton from './components/ExportButton';
import { SourceRow, ShopifyRow, SourceFormat, ConversionStats } from './types';
import { parseCSV, detectFormat, transformData } from './services/csvService';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceData, setSourceData] = useState<SourceRow[]>([]);
  const [format, setFormat] = useState<SourceFormat>(SourceFormat.UNKNOWN);
  const [transformedData, setTransformedData] = useState<ShopifyRow[]>([]);
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (selectedFile: File) => {
    setLoading(true);
    setError(null);
    setFile(selectedFile);

    try {
      const data = await parseCSV(selectedFile);
      if (data.length === 0) {
        throw new Error("File is empty or invalid.");
      }
      setSourceData(data);
      const detected = detectFormat(data);
      setFormat(detected);
    } catch (err: any) {
      setError(err.message || "Error processing file");
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  // Effect to re-process data when format or source data changes
  useEffect(() => {
    if (sourceData.length > 0 && format !== SourceFormat.UNKNOWN) {
      const result = transformData(sourceData, format);
      setTransformedData(result.rows);
      setStats(result.stats);
    } else {
      setTransformedData([]);
      setStats(null);
    }
  }, [sourceData, format]);

  const handleReset = () => {
    setFile(null);
    setSourceData([]);
    setFormat(SourceFormat.UNKNOWN);
    setTransformedData([]);
    setStats(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
              <FileSpreadsheet size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CSV Converter</h1>
              <p className="text-slate-500 text-sm">Convert WooCommerce/Wix/PrestaShop to Shopify</p>
            </div>
          </div>
          {file && (
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              <RefreshCw size={16} /> Start Over
            </button>
          )}
        </header>

        {/* Main Content */}
        {!file ? (
          // Upload State
          <div className="max-w-xl mx-auto py-12 animate-fade-in">
            <h2 className="text-center text-xl font-semibold mb-6 text-slate-700">Get Started</h2>
            <FileUploader onFileSelect={handleFileSelect} isLoading={loading} />
            {loading && (
              <div className="mt-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            {error && <div className="mt-6 text-center text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
          </div>
        ) : (
          // Dashboard State
          <div className="space-y-6 animate-fade-in">
            
            {/* Top Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              <div className="flex-1">
                 <FormatDetector format={format} onFormatChange={setFormat} />
              </div>
              <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-sm">
                  <span className="text-slate-500">Source:</span>
                  <span className="ml-2 font-medium text-slate-800 truncate max-w-[150px] inline-block align-bottom">{file.name}</span>
                </div>
                <div className="text-sm border-l pl-4 border-slate-200">
                   <span className="text-slate-500">Size:</span>
                   <span className="ml-2 font-medium text-slate-800">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            </div>

            {/* Statistics */}
            {stats && <StatsPanel stats={stats} />}

            {/* Preview */}
            <div className="h-[400px]">
              <DataPreview data={transformedData} />
            </div>

            {/* Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10 md:static md:shadow-none md:border-0 md:bg-transparent md:p-0">
               <div className="max-w-6xl mx-auto flex justify-end">
                  <ExportButton data={transformedData} />
               </div>
            </div>
            
            <div className="h-16 md:hidden"></div> {/* Spacer for fixed bottom bar mobile */}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
