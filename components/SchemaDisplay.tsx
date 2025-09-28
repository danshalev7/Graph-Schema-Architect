import React, { useState } from 'react';
import { GraphSchema, NodeLabel, RelationshipType, Property, Ontology, HealthCheckIssue } from '../types';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { ListIcon } from './icons/ListIcon';
import { CanvasIcon } from './icons/CanvasIcon';
import { GraphCanvas } from './GraphCanvas';
import { SelectedElement } from '../App';
import { WarningIcon } from './icons/WarningIcon';

interface Props {
  schema: GraphSchema | null;
  isLoading: boolean;
  error: string | null;
  selectedElement: SelectedElement | null;
  onSelectElement: (element: SelectedElement | null) => void;
  ontology: Ontology;
  healthIssues: HealthCheckIssue[];
}

type ViewMode = 'card' | 'canvas';

const SchemaPlaceholder = () => (
  <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl">
    <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    <h3 className="mt-2 text-sm font-medium text-slate-400">Awaiting Input</h3>
    <p className="mt-1 text-sm text-slate-500">Your suggested schema will appear here.</p>
  </div>
);

const PropertyList: React.FC<{properties: Property[]}> = ({ properties }) => (
  <ul className="space-y-2">
    {properties.map(prop => {
      const suggestion = prop.description?.startsWith('suggestion:') 
        ? prop.description.substring(11).trim() 
        : null;
      const description = suggestion ? null : prop.description;

      return (
        <li key={prop.name} className="text-sm">
          <div className="flex justify-between">
            <span className="text-slate-200 font-mono">{prop.name}</span>
            <span className="text-slate-400 font-mono">{prop.type}</span>
          </div>
          {description && <p className="text-xs text-slate-500 pl-1">{description}</p>}
          {suggestion && (
            <div className="mt-1 flex items-start p-2 rounded-md bg-yellow-900/40 text-yellow-300 text-xs border border-yellow-500/30">
              <LightbulbIcon className="h-4 w-4 flex-shrink-0 mr-2 mt-0.5 text-yellow-400" />
              <span className="flex-grow">{suggestion}</span>
            </div>
          )}
        </li>
      );
    })}
  </ul>
);

const HealthWarning: React.FC<{ issues: HealthCheckIssue[] }> = ({ issues }) => {
    if (issues.length === 0) return null;
    return (
        <div className="mt-2 space-y-1">
            {issues.map((issue, index) => (
                <div key={index} className="flex items-start text-amber-400 text-xs p-2 rounded-md bg-amber-900/40 border border-amber-500/30" title={issue.message}>
                    <WarningIcon className="h-4 w-4 flex-shrink-0 mr-2 mt-0.5" />
                    <span className="flex-grow truncate">{issue.message}</span>
                </div>
            ))}
        </div>
    );
};

const NodeCard: React.FC<{node: NodeLabel; issues: HealthCheckIssue[]}> = ({ node, issues }) => (
  <div className="bg-slate-800/70 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
    <div className="flex items-center mb-3">
      <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20 mr-2">NODE</span>
      <h4 className="text-lg font-bold text-slate-100">{node.label}</h4>
    </div>
    <p className="text-sm text-slate-400 mb-3 min-h-[20px]">{node.description}</p>
    <HealthWarning issues={issues} />
    {node.properties.length > 0 && (
      <div className="mt-3">
        <h5 className="text-sm font-semibold text-slate-300 mb-2 border-t border-slate-700 pt-3">Properties:</h5>
        <PropertyList properties={node.properties} />
      </div>
    )}
  </div>
);

const RelationshipCard: React.FC<{rel: RelationshipType; issues: HealthCheckIssue[]}> = ({ rel, issues }) => (
    <div className="bg-slate-800/70 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex items-center mb-3">
        <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20 mr-2">RELATIONSHIP</span>
        <h4 className="text-lg font-bold text-slate-100 font-mono">{rel.type}</h4>
      </div>
      <div className="flex items-center text-sm text-slate-300 font-mono my-3">
          <span className="bg-blue-900/50 text-blue-300 rounded px-2 py-1">{rel.source}</span>
          <span className="mx-2 text-green-400 text-base font-bold">&mdash;[{rel.type}]&rarr;</span>
          <span className="bg-blue-900/50 text-blue-300 rounded px-2 py-1">{rel.target}</span>
      </div>
      <p className="text-sm text-slate-400 mb-3 min-h-[20px]">{rel.description}</p>
      <HealthWarning issues={issues} />
      {rel.properties.length > 0 && (
        <div className="mt-3">
          <h5 className="text-sm font-semibold text-slate-300 mb-2 border-t border-slate-700 pt-3">Properties:</h5>
          <PropertyList properties={rel.properties} />
        </div>
      )}
    </div>
  );

const CardView = ({ schema, healthIssues }: { schema: GraphSchema; healthIssues: HealthCheckIssue[] }) => (
    <div className="space-y-8">
        <div>
            <h4 className="text-xl font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2">Nodes</h4>
            {schema.nodes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {schema.nodes.map(node => <NodeCard key={node.label} node={node} issues={healthIssues.filter(i => i.type === 'node' && i.id === node.label)} />)}
                </div>
            ) : <p className="text-slate-400">No nodes identified.</p>}
        </div>
        <div>
            <h4 className="text-xl font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2">Relationships</h4>
            {schema.relationships.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {schema.relationships.map(rel => <RelationshipCard key={rel.id} rel={rel} issues={healthIssues.filter(i => i.type === 'relationship' && i.id === rel.id)} />)}
                </div>
            ) : <p className="text-slate-400">No relationships identified.</p>}
        </div>
    </div>
);

export const SchemaDisplay: React.FC<Props> = ({ schema, isLoading, error, selectedElement, onSelectElement, ontology, healthIssues }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-slate-800/50 border border-slate-700 rounded-xl">
        <SpinnerIcon className="h-8 w-8 text-green-400 animate-spin" />
        <p className="mt-4 text-slate-300">Generating schema, this may take a moment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-xl text-red-300">
        <h3 className="font-semibold">An Error Occurred</h3>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  if (!schema) {
    return <SchemaPlaceholder />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-white">Suggested Schema</h3>
        <div className="flex items-center rounded-lg p-1 bg-slate-800 border border-slate-700">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1 text-sm font-medium rounded-md flex items-center transition-colors ${viewMode === 'card' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:bg-slate-700/50'}`}
            >
              <ListIcon className="h-4 w-4 mr-2" />
              Card View
            </button>
            <button
              onClick={() => setViewMode('canvas')}
              className={`px-3 py-1 text-sm font-medium rounded-md flex items-center transition-colors ${viewMode === 'canvas' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:bg-slate-700/50'}`}
            >
                <CanvasIcon className="h-4 w-4 mr-2" />
              Canvas View
            </button>
        </div>
      </div>
      
      {viewMode === 'card' ? (
        <CardView schema={schema} healthIssues={healthIssues} />
      ) : (
        <div 
          className="h-[600px] bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden relative"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onSelectElement(null);
            }
          }}
        >
            <GraphCanvas 
                schema={schema} 
                onSelectElement={onSelectElement} 
                selectedElement={selectedElement}
                ontology={ontology}
                healthIssues={healthIssues}
            />
        </div>
      )}
    </div>
  );
};