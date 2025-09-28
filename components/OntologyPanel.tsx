import React, { useState } from 'react';
import { Ontology, GraphSchema, Hierarchy, Axiom } from '../types';
import { HierarchyIcon } from './icons/HierarchyIcon';
import { AxiomIcon } from './icons/AxiomIcon';
import { CloseIcon } from './icons/CloseIcon';

interface Props {
  ontology: Ontology;
  schema: GraphSchema;
  onOntologyUpdate: (newOntology: Ontology) => void;
}

export const OntologyPanel: React.FC<Props> = ({ ontology, schema, onOntologyUpdate }) => {
  const nodeLabels = schema.nodes.map(n => n.label);
  const relTypes = [...new Set(schema.relationships.map(r => r.type))];

  const [newHierarchy, setNewHierarchy] = useState<Omit<Hierarchy, 'id'>>({ subclass: '', superclass: '' });
  const [newAxiom, setNewAxiom] = useState<Omit<Axiom, 'id'>>({ source: '', relationship: '', target: '' });

  const addHierarchy = () => {
    if (newHierarchy.subclass && newHierarchy.superclass && newHierarchy.subclass !== newHierarchy.superclass) {
      if (!ontology.hierarchies.some(h => h.subclass === newHierarchy.subclass && h.superclass === newHierarchy.superclass)) {
        onOntologyUpdate({ ...ontology, hierarchies: [...ontology.hierarchies, newHierarchy] });
        setNewHierarchy({ subclass: '', superclass: '' });
      }
    }
  };

  const removeHierarchy = (index: number) => {
    onOntologyUpdate({ ...ontology, hierarchies: ontology.hierarchies.filter((_, i) => i !== index) });
  };
  
  const addAxiom = () => {
    if (newAxiom.source && newAxiom.relationship && newAxiom.target) {
      if (!ontology.axioms.some(a => a.source === newAxiom.source && a.relationship === newAxiom.relationship && a.target === newAxiom.target)) {
        onOntologyUpdate({ ...ontology, axioms: [...ontology.axioms, newAxiom] });
        setNewAxiom({ source: '', relationship: '', target: '' });
      }
    }
  };

  const removeAxiom = (index: number) => {
    onOntologyUpdate({ ...ontology, axioms: ontology.axioms.filter((_, i) => i !== index) });
  };
  

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center mb-2">
            <HierarchyIcon className="h-6 w-6 text-slate-400 mr-2" />
            <h3 className="text-lg font-semibold text-slate-200">Define Hierarchies</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">Define "subclass of" relationships (e.g., "a Novel is a Book"). This helps the AI understand your data's structure.</p>
        
        <div className="space-y-2">
            {ontology.hierarchies.map((h, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-md text-sm">
                    <div className="font-mono text-slate-300">
                        <span className="bg-blue-900/50 text-blue-300 rounded px-2 py-1">{h.subclass}</span>
                        <span className="mx-2 text-slate-400">is a subclass of</span>
                        <span className="bg-blue-900/50 text-blue-300 rounded px-2 py-1">{h.superclass}</span>
                    </div>
                    <button onClick={() => removeHierarchy(i)} className="text-red-500 hover:text-red-400"><CloseIcon className="w-4 h-4" /></button>
                </div>
            ))}
        </div>

        <div className="mt-4 flex items-center gap-2 p-2 border border-slate-700 rounded-md">
            <select value={newHierarchy.subclass} onChange={e => setNewHierarchy({...newHierarchy, subclass: e.target.value})} className="flex-1 bg-slate-900 border-slate-600 rounded-md text-sm focus:ring-green-500">
                <option value="">Subclass...</option>
                {nodeLabels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <span className="text-slate-400 text-sm">is a</span>
            <select value={newHierarchy.superclass} onChange={e => setNewHierarchy({...newHierarchy, superclass: e.target.value})} className="flex-1 bg-slate-900 border-slate-600 rounded-md text-sm focus:ring-green-500">
                <option value="">Superclass...</option>
                {nodeLabels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <button onClick={addHierarchy} disabled={!newHierarchy.subclass || !newHierarchy.superclass} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md text-sm disabled:bg-slate-600 disabled:cursor-not-allowed">+</button>
        </div>
      </div>
      
      <div className="border-t border-slate-700 pt-8">
        <div className="flex items-center mb-2">
            <AxiomIcon className="h-6 w-6 text-slate-400 mr-2" />
            <h3 className="text-lg font-semibold text-slate-200">Define Axioms (Rules)</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">Define logical rules your schema must follow (e.g., "a Book must be WRITTEN_BY an Author").</p>
        
        <div className="space-y-2">
            {ontology.axioms.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-md text-sm">
                    <div className="font-mono text-slate-300">
                        <span className="bg-blue-900/50 text-blue-300 rounded px-2 py-1">{a.source}</span>
                        <span className="mx-2 text-green-400">&mdash;[{a.relationship}]&rarr;</span>
                        <span className="bg-blue-900/50 text-blue-300 rounded px-2 py-1">{a.target}</span>
                    </div>
                    <button onClick={() => removeAxiom(i)} className="text-red-500 hover:text-red-400"><CloseIcon className="w-4 h-4" /></button>
                </div>
            ))}
        </div>
        
        <div className="mt-4 flex items-center gap-2 p-2 border border-slate-700 rounded-md">
            <select value={newAxiom.source} onChange={e => setNewAxiom({...newAxiom, source: e.target.value})} className="flex-1 bg-slate-900 border-slate-600 rounded-md text-sm focus:ring-green-500">
                <option value="">Source Node...</option>
                {nodeLabels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={newAxiom.relationship} onChange={e => setNewAxiom({...newAxiom, relationship: e.target.value})} className="flex-1 bg-slate-900 border-slate-600 rounded-md text-sm focus:ring-green-500">
                <option value="">Relationship...</option>
                {relTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={newAxiom.target} onChange={e => setNewAxiom({...newAxiom, target: e.target.value})} className="flex-1 bg-slate-900 border-slate-600 rounded-md text-sm focus:ring-green-500">
                <option value="">Target Node...</option>
                {nodeLabels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <button onClick={addAxiom} disabled={!newAxiom.source || !newAxiom.relationship || !newAxiom.target} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md text-sm disabled:bg-slate-600 disabled:cursor-not-allowed">+</button>
        </div>
      </div>
    </div>
  );
};
