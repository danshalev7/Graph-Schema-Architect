import React, { useState } from 'react';
import { GraphSchema } from '../types';
import { generateCypherSchemaScript, generateCsvImportScript } from '../services/codeGenerator';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface Props {
  schema: GraphSchema;
}

type CodeTab = 'cypher' | 'import';

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/80 rounded-lg relative">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded-md bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-colors"
        aria-label="Copy to clipboard"
      >
        <ClipboardIcon className="h-5 w-5" />
      </button>
      {copied && <span className="absolute top-3 right-12 text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-md">Copied!</span>}
      <pre className="p-4 overflow-x-auto text-sm text-slate-200 font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
};


export const CodeGenerationDisplay: React.FC<Props> = ({ schema }) => {
  const [activeTab, setActiveTab] = useState<CodeTab>('cypher');

  const cypherScript = generateCypherSchemaScript(schema);
  const importScript = generateCsvImportScript(schema);

  return (
    <div>
        <h3 className="text-2xl font-bold text-white mb-4">Generated Scripts</h3>
        <div className="border-b border-slate-700">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
                onClick={() => setActiveTab('cypher')}
                className={`${
                activeTab === 'cypher'
                    ? 'border-green-400 text-green-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
                } group inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none`}
            >
                <span>Cypher Schema</span>
            </button>
            <button
                onClick={() => setActiveTab('import')}
                className={`${
                activeTab === 'import'
                    ? 'border-green-400 text-green-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
                } group inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none`}
            >
                <span>Import Script</span>
            </button>
            </nav>
        </div>
        <div className="mt-4">
            {activeTab === 'cypher' && <CodeBlock code={cypherScript} />}
            {activeTab === 'import' && <CodeBlock code={importScript} />}
        </div>
    </div>
  );
};