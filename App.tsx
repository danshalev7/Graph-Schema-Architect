import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { TextIcon } from './components/icons/TextIcon';
import { CsvIcon } from './components/icons/CsvIcon';
import { SqlIcon } from './components/icons/SqlIcon';
import { OntologyIcon } from './components/icons/OntologyIcon';
import { NaturalLanguageInputPanel } from './components/NaturalLanguageInputPanel';
import { CsvInputPanel } from './components/CsvInputPanel';
import { SqlInputPanel } from './components/SqlInputPanel';
import { OntologyPanel } from './components/OntologyPanel';
import { SchemaDisplay } from './components/SchemaDisplay';
import { GraphSchema, Ontology, HealthCheckIssue } from './types';
import { generateSchemaFromDescription, generateSchemaFromCsv, generateSchemaFromSql, runSchemaHealthCheck } from './services/geminiService';
import { EditorSidebar } from './components/EditorSidebar';
import { CodeGenerationDisplay } from './components/CodeGenerationDisplay';
import { DataSimulationPanel } from './components/DataSimulationPanel';

type InputMode = 'text' | 'csv' | 'sql' | 'ontology';
export type SelectedElement = 
  { type: 'node'; id: string } | 
  { type: 'relationship'; id: string } |
  { type: 'simulated-node', data: any } |
  { type: 'simulated-link', data: any };

const TABS: { id: InputMode; name: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'text', name: 'Describe', icon: TextIcon },
  { id: 'csv', name: 'Upload CSV', icon: CsvIcon },
  { id: 'sql', name: 'Import SQL', icon: SqlIcon },
  { id: 'ontology', name: 'Define Ontology', icon: OntologyIcon },
];

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

function App(): React.ReactNode {
  const [activeTab, setActiveTab] = useState<InputMode>('text');
  const [schema, setSchema] = useState<GraphSchema | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);

  // Sprint 4 State
  const [ontology, setOntology] = useState<Ontology>({ hierarchies: [], axioms: [] });
  const [healthIssues, setHealthIssues] = useState<HealthCheckIssue[]>([]);
  const [isHealthCheckRunning, setIsHealthCheckRunning] = useState<boolean>(false);

  const debouncedSchema = useDebounce(schema, 1500);
  const debouncedOntology = useDebounce(ontology, 1500);

  const resetState = () => {
    setIsLoading(true);
    setError(null);
    setSchema(null);
    setSelectedElement(null);
    setHealthIssues([]);
  };
  
  const handleGenerateFromText = async (description: string) => {
    resetState();
    try {
      const result = await generateSchemaFromDescription(description);
      setSchema(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFromCsv = async (files: { fileName: string; content: string }[]) => {
    resetState();
    try {
      const result = await generateSchemaFromCsv(files);
      setSchema(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFromSql = async (ddl: string) => {
    resetState();
    try {
      const result = await generateSchemaFromSql(ddl);
      setSchema(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSchemaUpdate = (newSchema: GraphSchema) => {
    setSchema(newSchema);
  };
  
  const handleOntologyUpdate = (newOntology: Ontology) => {
    setOntology(newOntology);
  };

  const performHealthCheck = useCallback(async () => {
    if (!debouncedSchema || (debouncedSchema.nodes.length === 0 && debouncedSchema.relationships.length === 0)) {
        setHealthIssues([]);
        return;
    };
    
    setIsHealthCheckRunning(true);
    try {
        const issues = await runSchemaHealthCheck(debouncedSchema, debouncedOntology);
        setHealthIssues(issues);
    } catch (e) {
        console.error("Health check failed:", e);
        // Optionally set a small, non-intrusive error message
    } finally {
        setIsHealthCheckRunning(false);
    }
  }, [debouncedSchema, debouncedOntology]);

  useEffect(() => {
    performHealthCheck();
  }, [performHealthCheck]);


  return (
    <div className="bg-slate-900 text-slate-200 min-h-screen font-sans">
      <Header isHealthCheckRunning={isHealthCheckRunning} />
      <main className="pt-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex">
          <div className="flex-1 transition-all duration-300" style={{ marginRight: selectedElement ? '400px' : '0' }}>
            <div className="max-w-4xl mx-auto">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-lg">
                <div className="border-b border-slate-700">
                  <nav className="-mb-px flex space-x-6 px-6" aria-label="Tabs">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        disabled={tab.id === 'ontology' && !schema}
                        className={`${
                          activeTab === tab.id
                            ? 'border-green-400 text-green-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
                        } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none disabled:text-slate-600 disabled:hover:border-transparent disabled:cursor-not-allowed`}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                      >
                        <tab.icon
                          className={`${
                            activeTab === tab.id ? 'text-green-400' : 'text-slate-500 group-hover:text-slate-300'
                          } -ml-0.5 mr-2 h-5 w-5 transition-colors duration-200 group-disabled:text-slate-600`}
                          aria-hidden="true"
                        />
                        <span>{tab.name}</span>
                      </button>
                    ))}
                  </nav>
                </div>
                
                <div className="p-6">
                  {activeTab === 'text' && <NaturalLanguageInputPanel onGenerate={handleGenerateFromText} isLoading={isLoading} />}
                  {activeTab === 'csv' && <CsvInputPanel onGenerate={handleGenerateFromCsv} isLoading={isLoading} />}
                  {activeTab === 'sql' && <SqlInputPanel onGenerate={handleGenerateFromSql} isLoading={isLoading} />}
                  {activeTab === 'ontology' && schema && <OntologyPanel schema={schema} ontology={ontology} onOntologyUpdate={handleOntologyUpdate} />}
                </div>

              </div>

              <div className="mt-8">
                <SchemaDisplay 
                  schema={schema} 
                  isLoading={isLoading} 
                  error={error} 
                  onSelectElement={setSelectedElement} 
                  selectedElement={selectedElement}
                  ontology={ontology}
                  healthIssues={healthIssues}
                />
              </div>

              {schema && !isLoading && !error && (
                <>
                  <div className="mt-8">
                    <CodeGenerationDisplay schema={schema} />
                  </div>
                  <div className="mt-8">
                    <DataSimulationPanel schema={schema} onSelectElement={setSelectedElement} />
                  </div>
                </>
              )}

            </div>
          </div>
          <EditorSidebar 
            schema={schema} 
            selectedElement={selectedElement} 
            onClose={() => setSelectedElement(null)} 
            onSchemaUpdate={handleSchemaUpdate}
          />
        </div>
      </main>
      <footer className="py-8 mt-8">
        <p className="text-center text-xs text-slate-600">
           Powered by Google Gemini
        </p>
      </footer>
    </div>
  );
}

export default App;