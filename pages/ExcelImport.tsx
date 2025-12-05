import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { createEmployee, getEmployees } from '../services/mockDb';
import { Employee, ImportResult } from '../types';
import { format, isValid } from 'date-fns';

export const ExcelImport: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

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
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let allData: any[] = [];
        let detectedHeaders: string[] = [];

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            
            // 1. Convert to Array of Arrays to find the header row
            const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            if (aoa.length === 0) return;

            // 2. Find the header row index
            // Look for a row that contains "EMP ID" or "EMPLOYEE NAME"
            let headerRowIndex = -1;
            for (let i = 0; i < Math.min(20, aoa.length); i++) {
                const rowStr = aoa[i].map(c => String(c).toLowerCase().trim()).join(' ');
                if (rowStr.includes('emp id') || rowStr.includes('employee name') || rowStr.includes('designation')) {
                    headerRowIndex = i;
                    break;
                }
            }

            // If no header found, assume row 0 if it has enough columns, else skip
            if (headerRowIndex === -1) {
                // If row 0 has at least 3 strings, try it
                if (aoa[0].length >= 3) headerRowIndex = 0;
                else return; // Skip this sheet
            }

            // 3. Parse using the identified header row
            const sheetData = XLSX.utils.sheet_to_json(worksheet, { 
                range: headerRowIndex,
                defval: "" 
            });

            if (sheetData.length > 0) {
                 detectedHeaders = Object.keys(sheetData[0] as object);
            }
            allData = [...allData, ...sheetData];
        });

        // Filter out completely empty rows
        const cleanData = allData.filter(row => Object.values(row).some(val => val !== ""));
        
        setPreviewData(cleanData);
        setImportResult(null);
        setDebugInfo(detectedHeaders.length > 0 ? `Detected Columns: ${detectedHeaders.join(', ')}` : 'No columns detected');

      } catch (err) {
        console.error("Parse error", err);
        setImportResult({ inserted: 0, updated: 0, errors: [{ row: 0, error: "Failed to parse Excel file. Ensure it is not corrupted." }] });
      }
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

  // --- Helper Functions ---

  // Fuzzy match keys (case-insensitive, ignores spaces/underscores)
  const findValue = (row: any, ...variations: string[]) => {
    const rowKeys = Object.keys(row);
    
    // 1. Try exact or simple case-insensitive match on variations
    for (const v of variations) {
        if (row[v] !== undefined && row[v] !== "") return row[v];
        
        const foundKey = rowKeys.find(k => k.toLowerCase().trim() === v.toLowerCase().trim());
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== "") return row[foundKey];
    }

    // 2. Aggressive fuzzy match
    const normalizedVariations = variations.map(v => v.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    for (const key of rowKeys) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const nv of normalizedVariations) {
            // Match if normalized key contains the variation (e.g. "visaexpirydate" contains "visaexpiry")
            if (normalizedKey === nv || (normalizedKey.includes(nv))) {
                 if (row[key] !== undefined && row[key] !== "") return row[key];
            }
        }
    }
    return undefined;
  };

  const parseExcelDate = (val: any): string | null => {
    if (!val) return null;

    // Handle Excel Serial Date
    if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return isValid(date) ? format(date, 'yyyy-MM-dd') : null;
    }

    // Handle String Dates
    if (typeof val === 'string') {
        const trimmed = val.trim();
        
        // 1. Try DD/MM/YYYY or DD-MM-YYYY (Common in UAE/India)
        const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dmyMatch) {
            const day = parseInt(dmyMatch[1], 10);
            const month = parseInt(dmyMatch[2], 10) - 1;
            const year = parseInt(dmyMatch[3], 10);
            const date = new Date(year, month, day);
            if (isValid(date)) return format(date, 'yyyy-MM-dd');
        }

        // 2. Try YYYY-MM-DD
        const date = new Date(trimmed);
        if (isValid(date)) return format(date, 'yyyy-MM-dd');
    }

    return null;
  };

  const runImport = () => {
    setIsProcessing(true);
    setTimeout(() => {
      let inserted = 0;
      let updated = 0; 
      const errors: { row: number, error: string }[] = [];
      const existingEmployeeIds = new Set(getEmployees().map(e => e.employeeId));

      previewData.forEach((row, index) => {
        const rowNum = index + 1;
        
        // Mappings based on user template
        const fullName = findValue(row, 'EMPLOYEE NAME', 'Full Name', 'Name', 'Employee Name');
        const empId = findValue(row, 'EMP ID', 'Employee ID', 'ID', 'Emp No');
        const passport = findValue(row, 'Passport Number', 'Passport', 'Passport No', 'PP No'); // Optional
        const visaType = findValue(row, 'DESIGNATION', 'Visa Type', 'Designation', 'Position', 'Role');
        
        const visaIssue = parseExcelDate(findValue(row, 'DOJ(date)', 'DOJ', 'Date of Joining', 'Visa Issue', 'Issue Date'));
        const visaExpiry = parseExcelDate(findValue(row, 'VISA EXPIRY DATE', 'Visa Expiry', 'Visa Exp', 'Expiry Date'));
        const healthExpiry = parseExcelDate(findValue(row, 'HEALTH CARD EXP DATE', 'Health Card Expiry', 'Health Card', 'Insurance Exp'));
        const labourExpiry = parseExcelDate(findValue(row, 'LABOUR CARD EXP DATE', 'Labour Card Expiry', 'Labour Card', 'Labour Exp'));

        const missing = [];
        if (!fullName) missing.push("EMPLOYEE NAME");
        if (!empId) missing.push("EMP ID");
        // We will be lenient with dates to show better errors, but they are required for logic
        if (!visaIssue) missing.push("DOJ(date)");
        if (!visaExpiry) missing.push("VISA EXPIRY DATE");
        if (!healthExpiry) missing.push("HEALTH CARD EXP DATE");
        if (!labourExpiry) missing.push("LABOUR CARD EXP DATE");

        if (missing.length > 0) {
          // Ignore completely empty rows
          if (missing.length >= 5) return; 
          errors.push({ row: rowNum, error: `Missing columns or invalid dates: ${missing.join(', ')}` });
          return;
        }

        if (existingEmployeeIds.has(String(empId))) {
           errors.push({ row: rowNum, error: `Duplicate EMP ID: ${empId}` });
           return;
        }

        createEmployee({
            fullName: String(fullName),
            employeeId: String(empId),
            passportNumber: passport ? String(passport) : undefined,
            visaType: String(visaType || 'Employment'),
            visaIssueDate: visaIssue || '', // Safe fallback string
            visaExpiryDate: visaExpiry || '', 
            healthCardExpiryDate: healthExpiry || '',
            labourCardExpiryDate: labourExpiry || '',
        });
        existingEmployeeIds.add(String(empId));
        inserted++;
      });

      setImportResult({ inserted, updated, errors });
      setIsProcessing(false);
      if (inserted > 0) setPreviewData([]); 
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Employees</h1>
        <p className="text-gray-500 mt-1">Bulk upload records via Excel. The system will auto-detect the header row.</p>
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
                <div className="mt-8 text-xs text-gray-400 text-left bg-gray-50 p-4 rounded-lg w-full">
                    <p className="font-semibold mb-1">Required Columns:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span>• EMP ID</span>
                        <span>• EMPLOYEE NAME</span>
                        <span>• DOJ(date)</span>
                        <span>• DESIGNATION</span>
                        <span>• VISA EXPIRY DATE</span>
                        <span>• LABOUR CARD EXP DATE</span>
                        <span>• HEALTH CARD EXP DATE</span>
                    </div>
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
                </div>
                {debugInfo && (
                    <div className="px-4 py-2 bg-gray-100 text-xs text-gray-500 border-t border-gray-200">
                        {debugInfo}
                    </div>
                )}
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
                            <p className="text-xs text-red-600 mb-2 font-medium">
                                {debugInfo}
                            </p>
                            <div className="max-h-60 overflow-y-auto space-y-1">
                                {importResult.errors.map((err, i) => (
                                    <div key={i} className="text-xs text-red-700 flex gap-2">
                                        <span className="font-mono bg-red-100 px-1 rounded whitespace-nowrap">Row {err.row}</span>
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
                <h3 className="font-semibold text-blue-900 mb-2">Smart Import</h3>
                <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                    <li>We auto-detect the header row by looking for "EMP ID" or "EMPLOYEE NAME".</li>
                    <li>Supports dates in <strong>DD/MM/YYYY</strong>, <strong>DD-MM-YYYY</strong>, or <strong>YYYY-MM-DD</strong> formats.</li>
                    <li>Standardizes column names automatically.</li>
                </ul>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Sample Template</h3>
                <p className="text-sm text-gray-500 mb-4">Ensure your Excel file contains these key columns:</p>
                <div className="text-xs font-mono bg-gray-50 p-3 rounded border border-gray-200 text-gray-600">
                    EMP ID | EMPLOYEE NAME | DESIGNATION | DOJ(date) | VISA EXPIRY DATE | LABOUR CARD EXP DATE | HEALTH CARD EXP DATE
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};