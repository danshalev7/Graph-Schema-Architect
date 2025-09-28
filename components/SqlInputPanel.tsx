import React, { useState } from 'react';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface Props {
  onGenerate: (ddl: string) => void;
  isLoading: boolean;
}

export const SqlInputPanel: React.FC<Props> = ({ onGenerate, isLoading }) => {
  const [ddl, setDdl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ddl.trim()) {
      onGenerate(ddl);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="sql-ddl" className="block text-sm font-medium text-slate-300 mb-2">
        Paste your SQL DDL statements
      </label>
      <textarea
        id="sql-ddl"
        name="sql-ddl"
        rows={8}
        className="block w-full rounded-md bg-slate-900/80 border-slate-600 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm text-slate-200 placeholder:text-slate-500 font-mono transition"
        placeholder={`CREATE TABLE Users (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255)
);

CREATE TABLE Posts (
  id INT PRIMARY KEY,
  content TEXT,
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES Users(id)
);`}
        value={ddl}
        onChange={(e) => setDdl(e.target.value)}
        disabled={isLoading}
      />
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={!ddl.trim() || isLoading}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading && <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />}
          Generate Schema
        </button>
      </div>
    </form>
  );
};
