import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { createEmployee, getEmployees } from '../services/mockDb';
import { Employee, ImportResult } from '../types';
import { format, parse, isValid } from 'date-fns';

export const ExcelImport: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      setPreviewData(jsonData);
      setImportResult(null);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const runImport = () => {
    setIsProcessing(true);
    // Simulate backend processing delay
    setTimeout(() => {
      let inserted = 0;
      let updated = 0; // In this mock, we only insert. In real app we might update.
      const errors: { row: number, error: string }[] = [];
      const existingPassportNumbers = new Set(getEmployees().map(e => e.passportNumber));

      previewData.forEach((row, index) => {
        // Validation Logic
        const rowNum = index + 1;
        
        // Expected columns: Full Name, Passport Number, Visa Type, Issue Date, Expiry Date
        const fullName = row['Full Name'] || row['full_name'];
        const passport = row['Passport Number'] || row['passport_number'];
        const visaType = row['Visa Type'] || row['visa_type'];
        // XLSX dates might be serial numbers or strings
        let issueDateStr = row['Issue Date'] || row['issue_date'];
        let expiryDateStr = row['Expiry Date'] || row['expiry_date'];

        if (!fullName || !passport || !issueDateStr || !expiryDateStr) {
          errors.push({ row: rowNum, error: 'Missing required fields' });
          return;
        }

        if (existingPassportNumbers.has(passport)) {
           errors.push({ row: rowNum, error: `Duplicate passport: ${passport}` });
           return;
        }

        // Simple date cleaning
        // In production, use more robust parsing based on expected Excel format
        // Assuming string YYYY-MM-DD for this demo or JS Date handling
        try {
            // If it's excel serial date (number)
            /* Note: Mock simplified for string dates in sample file */
        } catch (e) {
             errors.push({ row: rowNum, error: 'Invalid date format' });
             return;
        }

        createEmployee({
            fullName,
            passportNumber: passport,
            visaType: visaType || 'Employment',
            visaIssueDate: String(issueDateStr), // Ensure string for mock
            visaExpiryDate: String(expiryDateStr)
        });
        existingPassportNumbers.add(passport);
        inserted++;
      });

      setImportResult({ inserted, updated, errors });
      setIsProcessing(false);
      if (inserted > 0) setPreviewData([]); // Clear preview on success
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Employees</h1>
        <p className="text-gray-500 mt-1">Bulk upload visa records via Excel (.xlsx, .xls)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Area */}
        <div className="lg:col-span-2 space-y-6">
            {!previewData.length && !importResult && (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-colors ${
                  isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
              >
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
                  <Upload className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Drag & drop your file here</h3>
                <p className="text-sm text-gray-500 mt-2 mb-6">Supported formats: .xlsx, .xls</p>
                <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  onChange={handleFileSelect}
                  className="hidden" 
                  id="file-upload" 
                />
                <label 
                  htmlFor="file-upload"
                  className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm"
                >
                  Browse Files
                </label>
                <div className="mt-8 text-xs text-gray-400">
                    <p>Required Columns: Full Name, Passport Number, Visa Type, Issue Date (YYYY-MM-DD), Expiry Date (YYYY-MM-DD)</p>
                </div>
              </div>
            )}

            {/* Preview Section */}
            {previewData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                    Preview ({previewData.length} rows)
                  </h3>
                  <div className="flex gap-2">
                     <button 
                        onClick={() => setPreviewData([])}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
                     >
                        Cancel
                     </button>
                     <button 
                        onClick={runImport}
                        disabled={isProcessing}
                        className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50 flex items-center gap-2"
                     >
                        {isProcessing ? 'Importing...' : 'Import Data'}
                     </button>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {Object.keys(previewData[0] || {}).map((header) => (
                          <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.slice(0, 10).map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 10 && (
                      <div className="px-6 py-3 text-xs text-gray-400 text-center border-t border-gray-100 italic">
                          Showing first 10 of {previewData.length} rows
                      </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Import Results */}
            {importResult && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-2 rounded-full ${importResult.errors.length === 0 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                            {importResult.errors.length === 0 ? <CheckCircle className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Import Complete</h3>
                            <p className="text-sm text-gray-500">
                                Successfully inserted <span className="font-semibold text-gray-900">{importResult.inserted}</span> records.
                            </p>
                        </div>
                        <button onClick={() => setImportResult(null)} className="ml-auto text-gray-400 hover:text-gray-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {importResult.errors.length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-red-800 mb-2">Errors ({importResult.errors.length})</h4>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {importResult.errors.map((err, i) => (
                                    <div key={i} className="text-xs text-red-700 flex gap-2">
                                        <span className="font-mono bg-red-100 px-1 rounded">Row {err.row}</span>
                                        <span>{err.error}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Helper Sidebar */}
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
                <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                    <li>Upload an Excel file (.xlsx)</li>
                    <li>First row must contain headers</li>
                    <li>Dates should be YYYY-MM-DD</li>
                    <li>Passport numbers must be unique</li>
                </ul>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Sample Template</h3>
                <p className="text-sm text-gray-500 mb-4">Download a sample Excel file to structure your data correctly.</p>
                <button className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    <FileSpreadsheet className="h-4 w-4" />
                    Download Template
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};