
import React, { useState, useRef, useEffect } from 'react';
import { GraphSchema } from '../types';
import { simulateData } from '../services/dataSimulator';
import { executeQueryOnData } from '../services/geminiService';
import { downloadProjectPackage } from '../services/fileService';
import { generateCypherSchemaScript, generateCsvImportScript } from '../services/codeGenerator';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { PlayIcon } from './icons/PlayIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { SelectedElement } from '../App';
import * as d3 from 'd3';

// Re-implement GraphCanvas here for data visualization specifically
interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  properties: Record<string, any>;
  color: string;
  x?: number; y?: number; fx?: number | null; fy?: number | null;
}
interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  properties: Record<string, any>;
}
interface DataGraphCanvasProps {
    data: { nodes: GraphNode[]; links: GraphLink[] };
    onSelectElement: (element: SelectedElement | null) => void;
}

const DataGraphCanvas: React.FC<DataGraphCanvasProps> = ({ data, onSelectElement }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    useEffect(() => {
        if (!svgRef.current || !data) return;
        const width = svgRef.current.parentElement?.clientWidth || 800;
        const height = svgRef.current.parentElement?.clientHeight || 500;
        d3.select(svgRef.current).selectAll("*").remove();

        const svg = d3.select(svgRef.current)
            .attr('width', width).attr('height', height)
            .attr('viewBox', [-width / 2, -height / 2, width, height].join(' '))
            .on('click', (event) => { if (event.target === svg.node()) onSelectElement(null); });

        const mainGroup = svg.append('g');
        const simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink<GraphNode, GraphLink>(data.links).id((d: any) => d.id).distance(50))
            .force('charge', d3.forceManyBody().strength(-60))
            .force('center', d3.forceCenter(0, 0));

        const link = mainGroup.append('g').selectAll('line')
            .data(data.links).join('line')
            .attr('stroke', '#475569').attr('stroke-opacity', 0.4).attr('stroke-width', 1)
            .on('click', (e, d) => { e.stopPropagation(); onSelectElement({type: 'simulated-link', data: d}); });
        
        const node = mainGroup.append('g').selectAll('circle')
            .data(data.nodes).join('circle')
            .attr('r', 5).attr('fill', d => d.color)
            .on('click', (e, d) => { e.stopPropagation(); onSelectElement({type: 'simulated-node', data: d}); })
            .call(drag(simulation) as any);
        
        node.append('title').text(d => `${d.label} #${d.id}\n${JSON.stringify(d.properties, null, 2)}`);
        
        const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (e) => mainGroup.attr('transform', e.transform));
        svg.call(zoom);

        simulation.on('tick', () => {
            link.attr('x1', d => (d.source as GraphNode).x!).attr('y1', d => (d.source as GraphNode).y!)
                .attr('x2', d => (d.target as GraphNode).x!).attr('y2', d => (d.target as GraphNode).y!);
            node.attr('cx', d => d.x!).attr('cy', d => d.y!);
        });

        function drag(sim: d3.Simulation<GraphNode, undefined>) {
            return d3.drag<any, GraphNode>()
                .on("start", (e,d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                .on("drag", (e,d) => { d.fx = e.x; d.fy = e.y; })
                .on("end", (e,d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; });
        }
    }, [data, onSelectElement]);
    return <svg ref={svgRef} />;
};

const QueryResultDisplay: React.FC<{ result: any }> = ({ result }) => {
    if (!result) {
      return <p className="text-slate-500 text-sm p-3">Query results will appear here.</p>;
    }
  
    const isTableData = Array.isArray(result) && result.length > 0 && typeof result[0] === 'object' && result[0] !== null;
  
    if (isTableData) {
      const headers = Object.keys(result[0]);
      // A simple check to ensure all rows have similar structure.
      const isConsistent = result.every(row => typeof row === 'object' && row !== null);
      if (!isConsistent) {
        // Fallback for inconsistent array data
        return <pre className="text-sm text-cyan-300 font-mono whitespace-pre-wrap p-3">{JSON.stringify(result, null, 2)}</pre>;
      }

      return (
        <div className="overflow-auto h-full">
          <table className="w-full text-left text-sm font-mono">
            <thead className="text-slate-400 sticky top-0 bg-slate-900">
              <tr>
                {headers.map(h => <th key={h} className="p-2 border-b border-slate-700 font-normal">{h}</th>)}
              </tr>
            </thead>
            <tbody className="text-cyan-300">
              {result.map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/50">
                  {headers.map(h => {
                    const cellValue = row[h];
                    const displayValue = typeof cellValue === 'object' && cellValue !== null ? JSON.stringify(cellValue) : String(cellValue);
                    return (
                        <td key={h} className="p-2 border-b border-slate-800 max-w-[200px] truncate" title={displayValue}>
                            {displayValue}
                        </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  
    // Fallback to JSON display for non-tabular data
    return <pre className="text-sm text-cyan-300 font-mono whitespace-pre-wrap p-3">{JSON.stringify(result, null, 2)}</pre>;
};


export const DataSimulationPanel: React.FC<{ schema: GraphSchema; onSelectElement: (element: SelectedElement | null) => void; }> = ({ schema, onSelectElement }) => {
  const [nodeCount, setNodeCount] = useState(50);
  const [simulatedData, setSimulatedData] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const [query, setQuery] = useState("MATCH (n)\nRETURN n\nLIMIT 10");
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string|null>(null);

  const handleSimulate = () => {
    setIsSimulating(true);
    setSimulatedData(null);
    setTimeout(() => {
        const data = simulateData(schema, nodeCount);
        const colors = d3.scaleOrdinal(d3.schemeTableau10);
        const nodes = data.nodes.map(n => ({...n, color: colors(n.label)}));
        setSimulatedData({ ...data, nodes });
        setIsSimulating(false);
    }, 50); // a small delay to allow UI to update
  };
  
  const handleRunQuery = async () => {
    if (!simulatedData || !query.trim()) return;
    setIsQuerying(true);
    setQueryError(null);
    setQueryResult(null);
    try {
        const result = await executeQueryOnData(query, simulatedData);
        if (result.error) {
            setQueryError(result.error);
        } else {
            setQueryResult(result);
        }
    } catch (e) {
        setQueryError(e instanceof Error ? e.message : "An unknown error occurred.");
    } finally {
        setIsQuerying(false);
    }
  };

  const handleDownload = () => {
    const cypherScript = generateCypherSchemaScript(schema);
    const importScript = generateCsvImportScript(schema);
    downloadProjectPackage(schema, cypherScript, importScript);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-white">Data Simulator & Query Tester</h3>
        <button onClick={handleDownload} className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
            <DownloadIcon className="h-5 w-5 mr-2" />
            Download Package
        </button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4">
            <label htmlFor="node-count" className="text-sm font-medium text-slate-300">Total Nodes to Simulate:</label>
            <input type="number" id="node-count" value={nodeCount} onChange={e => setNodeCount(Math.max(1, parseInt(e.target.value) || 1))} className="w-24 bg-slate-900 border-slate-600 rounded-md text-sm p-2 focus:ring-green-500"/>
            <button onClick={handleSimulate} disabled={isSimulating} className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:bg-slate-600">
                {isSimulating && <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5" />}
                {simulatedData ? 'Regenerate Data' : 'Generate Data'}
            </button>
        </div>

        {isSimulating && <p className="text-sm text-slate-400 mt-4 text-center">Generating mock data...</p>}
        
        {simulatedData && (
            <div className="mt-6">
                <div className="h-[500px] bg-slate-900/50 border border-slate-600 rounded-xl overflow-hidden relative">
                    <DataGraphCanvas data={simulatedData} onSelectElement={onSelectElement} />
                    <div className="absolute top-2 left-2 bg-slate-950/70 p-2 rounded-md text-xs text-slate-400">
                        {simulatedData.nodes.length} nodes, {simulatedData.links.length} relationships
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="query" className="block text-sm font-medium text-slate-300 mb-2">Run a Cypher Query</label>
                        <textarea id="query" value={query} onChange={e => setQuery(e.target.value)} rows={5} className="w-full font-mono text-sm bg-slate-900 border-slate-600 rounded-md focus:ring-green-500" />
                        <button onClick={handleRunQuery} disabled={isQuerying} className="mt-2 w-full inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:bg-slate-600">
                            {isQuerying ? <SpinnerIcon className="animate-spin h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                            <span className="ml-2">Run Query</span>
                        </button>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-300 mb-2">Query Result</label>
                         <div className="h-[170px] bg-slate-900 border-slate-600 rounded-md overflow-auto">
                            {isQuerying && <div className="flex justify-center items-center h-full"><SpinnerIcon className="h-6 w-6 animate-spin text-slate-400"/></div>}
                            {queryError && <pre className="text-sm text-red-400 whitespace-pre-wrap p-3">{queryError}</pre>}
                            {!isQuerying && !queryError && <QueryResultDisplay result={queryResult} />}
                         </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
