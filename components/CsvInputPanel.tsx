import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { CsvIcon } from './icons/CsvIcon';

interface Props {
  onGenerate: (files: { fileName: string; content: string }[]) => void;
  isLoading: boolean;
}

export const CsvInputPanel: React.FC<Props> = ({ onGenerate, isLoading }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFileError(null);
    const csvFiles = acceptedFiles.filter(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    if(csvFiles.length !== acceptedFiles.length) {
      setFileError('Only .csv files are accepted.');
    }
    setFiles(prev => [...prev, ...csvFiles].filter((file, index, self) => self.findIndex(f => f.name === file.name) === index));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] } });
  
  const removeFile = (fileName: string) => {
    setFiles(files.filter(f => f.name !== fileName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length > 0) {
      const fileContents = await Promise.all(
        files.map(file => 
          new Promise<{ fileName: string; content: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ fileName: file.name, content: reader.result as string });
            reader.onerror = reject;
            reader.readAsText(file);
          })
        )
      );
      onGenerate(fileContents);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Upload one or more CSV files
      </label>
      <div
        {...getRootProps()}
        className={`mt-1 flex justify-center rounded-md border-2 border-dashed px-6 pt-5 pb-6 transition-colors duration-200 ${isDragActive ? 'border-green-400 bg-slate-800' : 'border-slate-600 hover:border-slate-500'}`}
      >
        <div className="space-y-1 text-center">
          <CsvIcon className="mx-auto h-12 w-12 text-slate-500" />
          <div className="flex text-sm text-slate-400">
            <p className="pl-1">
              {isDragActive ? "Drop the files here ..." : "Drag 'n' drop some files here, or click to select files"}
            </p>
          </div>
          <p className="text-xs text-slate-500">.CSV files only</p>
        </div>
        <input {...getInputProps()} className="sr-only" disabled={isLoading} />
      </div>

      {fileError && <p className="mt-2 text-sm text-red-400">{fileError}</p>}
      
      {files.length > 0 && (
        <div className="mt-4">
            <h3 className="text-sm font-medium text-slate-300">Selected Files:</h3>
            <ul role="list" className="mt-2 divide-y divide-slate-700 rounded-md border border-slate-700">
                {files.map(file => (
                    <li key={file.name} className="flex items-center justify-between py-2 pl-3 pr-4 text-sm">
                        <div className="flex w-0 flex-1 items-center">
                            <CsvIcon className="h-5 w-5 flex-shrink-0 text-slate-400" aria-hidden="true" />
                            <span className="ml-2 w-0 flex-1 truncate text-slate-300">{file.name}</span>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                            <button type="button" onClick={() => removeFile(file.name)} className="font-medium text-red-500 hover:text-red-400 disabled:text-slate-500" disabled={isLoading}>Remove</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={files.length === 0 || isLoading}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading && <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />}
          Generate Schema from CSV
        </button>
      </div>
    </form>
  );
};
