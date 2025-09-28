import React, { useState, useEffect } from 'react';
import { GraphSchema, NodeLabel, RelationshipType } from '../types';
import { SelectedElement } from '../App';
import { CloseIcon } from './icons/CloseIcon';

interface Props {
  schema: GraphSchema | null;
  selectedElement: SelectedElement | null;
  onClose: () => void;
  onSchemaUpdate: (newSchema: GraphSchema) => void;
}

const FALKORDB_TYPES = ['String', 'Integer', 'Float', 'Boolean', 'Point', 'Array'];

const SchemaEditor: React.FC<Omit<Props, 'selectedElement'> & { element: NodeLabel | RelationshipType }> = ({ schema, element, onSchemaUpdate }) => {
    const isNode = 'label' in element;

    const handlePropertyChange = (propIndex: number, field: 'name' | 'type', value: string) => {
        const newProps = [...element.properties];
        newProps[propIndex] = { ...newProps[propIndex], [field]: value };
        updateElement({ ...element, properties: newProps });
    };

    const addProperty = () => {
        const newProps = [...element.properties, { name: `newProp${element.properties.length + 1}`, type: 'String' }];
        updateElement({ ...element, properties: newProps });
    };

    const removeProperty = (propIndex: number) => {
        const newProps = element.properties.filter((_, i) => i !== propIndex);
        updateElement({ ...element, properties: newProps });
    };

    const handleLabelChange = (newLabel: string) => {
        if (!isNode) return;
        const oldLabel = (element as NodeLabel).label;
        const updatedElement = { ...element, label: newLabel };
        const newSchema = {
            ...schema!,
            nodes: schema!.nodes.map(n => n.label === oldLabel ? updatedElement : n),
            relationships: schema!.relationships.map(r => {
                const newRel = { ...r };
                if (r.source === oldLabel) newRel.source = newLabel;
                if (r.target === oldLabel) newRel.target = newLabel;
                // Update relationship ID if source/target changed
                newRel.id = `${newRel.source}_${newRel.type}_${newRel.target}`;
                return newRel;
            })
        };
        onSchemaUpdate(newSchema as GraphSchema);
    };

    const handleTypeChange = (newType: string) => {
        if (isNode) return;
        const updatedElement = { ...element, type: newType, id: `${(element as RelationshipType).source}_${newType}_${(element as RelationshipType).target}` };
        updateElement(updatedElement);
    }

    const updateElement = (updatedElement: NodeLabel | RelationshipType) => {
        if (!schema) return;
        let newSchema;
        if ('label' in updatedElement) { // It's a NodeLabel
            newSchema = { ...schema, nodes: schema.nodes.map(n => n.label === (element as NodeLabel).label ? updatedElement : n) };
        } else { // It's a RelationshipType
            newSchema = { ...schema, relationships: schema.relationships.map(r => r.id === (element as RelationshipType).id ? updatedElement : r) };
        }
        onSchemaUpdate(newSchema as GraphSchema);
    };

    return (
        <div className="space-y-6">
            <div>
                <label htmlFor="label" className="block text-sm font-medium text-slate-300">
                    {isNode ? 'Label' : 'Type'}
                </label>
                <input
                    type="text"
                    name="label"
                    id="label"
                    className="mt-1 block w-full rounded-md bg-slate-800 border-slate-600 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm text-slate-200"
                    value={isNode ? (element as NodeLabel).label : (element as RelationshipType).type}
                    onChange={(e) => isNode ? handleLabelChange(e.target.value) : handleTypeChange(e.target.value)}
                />
            </div>
            <div>
                <h4 className="text-md font-medium text-slate-200 mb-2">Properties</h4>
                <div className="space-y-3">
                    {element.properties.map((prop, index) => (
                        <div key={index} className="p-3 rounded-md bg-slate-800/70 border border-slate-700">
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" value={prop.name} onChange={(e) => handlePropertyChange(index, 'name', e.target.value)} className="w-full rounded-md bg-slate-900 border-slate-600 text-sm p-2 focus:ring-green-500" placeholder="Property Name"/>
                                <select value={prop.type} onChange={(e) => handlePropertyChange(index, 'type', e.target.value)} className="w-full rounded-md bg-slate-900 border-slate-600 text-sm p-2 focus:ring-green-500">
                                    {FALKORDB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end mt-2">
                                <button onClick={() => removeProperty(index)} className="text-xs text-red-500 hover:text-red-400">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={addProperty} className="mt-4 w-full text-center rounded-md border border-dashed border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:border-slate-500 transition">
                    Add Property
                </button>
            </div>
        </div>
    );
}

const SimulatedDataViewer: React.FC<{ element: any }> = ({ element }) => {
    const isNode = element.label;
    const title = isNode ? element.label : element.type;
    const properties = Object.entries(element.properties);

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-400">Viewing properties of a simulated data point. This is read-only.</p>
            <div>
                <h4 className="text-md font-medium text-slate-200 mb-2">Properties</h4>
                {properties.length > 0 ? (
                     <ul className="space-y-2 text-sm font-mono rounded-md bg-slate-800/70 border border-slate-700 p-3">
                        {properties.map(([key, value]) => (
                            <li key={key} className="flex justify-between items-center border-b border-slate-700/50 pb-1 last:border-b-0">
                                <span className="text-slate-300">{key}:</span>
                                <span className="text-cyan-300 truncate text-right">{JSON.stringify(value)}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-slate-500 text-sm">No properties on this element.</p>
                )}
            </div>
        </div>
    )
}


export const EditorSidebar: React.FC<Props> = ({ schema, selectedElement, onClose, onSchemaUpdate }) => {
  const [element, setElement] = useState<NodeLabel | RelationshipType | null>(null);
  const [simulatedElement, setSimulatedElement] = useState<any>(null);
  
  useEffect(() => {
    setElement(null);
    setSimulatedElement(null);
    if (!selectedElement || !schema) return;

    if (selectedElement.type === 'node') {
      const found = schema.nodes.find(n => n.label === selectedElement.id);
      setElement(found || null);
    } else if (selectedElement.type === 'relationship') {
      const found = schema.relationships.find(r => r.id === selectedElement.id);
      setElement(found || null);
    } else if (selectedElement.type === 'simulated-node' || selectedElement.type === 'simulated-link') {
        setSimulatedElement(selectedElement.data);
    }
  }, [selectedElement, schema]);
  
  let title = 'Editor';
  let badgeText = '';
  let badgeColor = '';

  if (element) {
      const isNode = 'label' in element;
      title = isNode ? (element as NodeLabel).label : (element as RelationshipType).type;
      badgeText = isNode ? 'EDITING NODE' : 'EDITING RELATIONSHIP';
      badgeColor = isNode ? 'bg-blue-500/10 text-blue-400 ring-blue-500/20' : 'bg-green-500/10 text-green-400 ring-green-500/20';
  } else if (simulatedElement) {
      const isNode = simulatedElement.label;
      title = isNode ? `${simulatedElement.label} #${simulatedElement.id}` : `${simulatedElement.type}`;
      badgeText = isNode ? 'VIEWING NODE' : 'VIEWING RELATIONSHIP';
      badgeColor = 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20';
  }


  return (
    <div className={`fixed top-0 right-0 h-full w-[400px] z-20 bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 ease-in-out ${selectedElement ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full">
        {(element || simulatedElement) ? (
          <>
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <div className="truncate">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset mr-2 ${badgeColor}`}>{badgeText}</span>
                    <h3 className="text-xl font-bold text-slate-100 inline truncate">{title}</h3>
                </div>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors flex-shrink-0 ml-2">
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-grow p-4 overflow-y-auto">
                {element && <SchemaEditor schema={schema} element={element} onSchemaUpdate={onSchemaUpdate} onClose={onClose} />}
                {simulatedElement && <SimulatedDataViewer element={simulatedElement} />}
            </div>
          </>
        ) : (
          <div className="p-4 text-slate-500">Select an element on the canvas to view or edit.</div>
        )}
      </div>
    </div>
  );
};