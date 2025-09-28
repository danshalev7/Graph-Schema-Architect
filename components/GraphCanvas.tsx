import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphSchema, NodeLabel, RelationshipType, Ontology, HealthCheckIssue } from '../types';
import { SelectedElement } from '../App';
import { WarningIcon } from './icons/WarningIcon';

interface Props {
  schema: GraphSchema;
  selectedElement: SelectedElement | null;
  onSelectElement: (element: SelectedElement | null) => void;
  ontology: Ontology;
  healthIssues: HealthCheckIssue[];
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  isHierarchy?: boolean;
}

export const GraphCanvas: React.FC<Props> = ({ schema, selectedElement, onSelectElement, ontology, healthIssues }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !schema) return;

    const width = svgRef.current.parentElement?.clientWidth || 800;
    const height = svgRef.current.parentElement?.clientHeight || 600;

    d3.select(svgRef.current).selectAll("*").remove();

    const nodeMap = new Map<string, NodeLabel>(schema.nodes.map(n => [n.label, n]));
    const nodes: GraphNode[] = schema.nodes.map(n => ({ id: n.label, label: n.label }));
    
    const relationshipLinks: GraphLink[] = schema.relationships
      .filter(r => nodeMap.has(r.source) && nodeMap.has(r.target))
      .map(r => ({
        id: r.id,
        source: r.source,
        target: r.target,
        type: r.type,
      }));

    const hierarchyLinks: GraphLink[] = ontology.hierarchies
        .filter(h => nodeMap.has(h.subclass) && nodeMap.has(h.superclass))
        .map(h => ({
            id: `hierarchy_${h.subclass}_${h.superclass}`,
            source: h.subclass,
            target: h.superclass,
            type: 'is a',
            isHierarchy: true,
        }));

    const links = [...relationshipLinks, ...hierarchyLinks];

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 2, width, height].join(' '))
      .on('click', (event) => {
        if (event.target === svg.node()) {
            onSelectElement(null);
        }
      });

    const mainGroup = svg.append('g');

    // Add arrowheads
    mainGroup.append('defs').selectAll('marker')
        .data(['relationship-arrow', 'hierarchy-arrow'])
        .join('marker')
        .attr('id', d => d)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 40)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', d => d === 'relationship-arrow' ? '#475569' : '#64748b')
        .attr('d', 'M0,-5L10,0L0,5');


    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(200))
      .force('charge', d3.forceManyBody().strength(-600))
      .force('center', d3.forceCenter(0, 0));

    const link = mainGroup.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', l => l.isHierarchy ? '#64748b' : '#475569') // slate-500 for hierarchy
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', l => l.isHierarchy ? 1.5 : 2)
      .attr('stroke-dasharray', l => l.isHierarchy ? '6 3' : 'none')
      .attr('marker-end', l => `url(#${l.isHierarchy ? 'hierarchy-arrow' : 'relationship-arrow'})`)
      .attr('class', l => `link-${l.id}`)
      .on('click', (event, d) => {
          if (d.isHierarchy) return;
          event.stopPropagation();
          onSelectElement({ type: 'relationship', id: d.id });
      })
      .style('cursor', l => l.isHierarchy ? 'default' : 'pointer');
      
    const linkGroup = mainGroup.append("g").selectAll('g')
        .data(links)
        .join('g');

    const linkTextBg = linkGroup.append("rect")
        .attr('fill', '#0f172a') // slate-900
        .attr('rx', 4)
        .attr('ry', 4);

    const linkText = linkGroup.append("text")
        .attr("class", "link-label")
        .attr('font-size', '10px')
        .attr('fill', l => l.isHierarchy ? '#cbd5e1' : '#94a3b8') // slate-300 for hierarchy
        .attr('font-style', l => l.isHierarchy ? 'italic' : 'normal')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .text(d => d.type)
        .on('click', (event, d) => {
          if (d.isHierarchy) return;
          event.stopPropagation();
          onSelectElement({ type: 'relationship', id: d.id });
        })
        .style('cursor', l => l.isHierarchy ? 'default' : 'pointer');


    const node = mainGroup.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', d => `node-${d.id}`)
      .on('click', (event, d) => {
          event.stopPropagation();
          onSelectElement({ type: 'node', id: d.id });
      })
      .style('cursor', 'pointer')
      .call(drag(simulation) as any);

    node.append('circle')
      .attr('r', 30)
      .attr('fill', '#1e293b') // slate-800
      .attr('stroke', '#38bdf8') // lightBlue-400
      .attr('stroke-width', 1.5);

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', 'currentColor')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .text(d => d.label);

    const nodeIssues = healthIssues.filter(i => i.type === 'node');
    node.each(function (d) {
        const issues = nodeIssues.filter(i => i.id === d.id);
        if (issues.length > 0) {
            const warningG = d3.select(this).append('g')
                .attr('transform', 'translate(22, -22)')
                .attr('class', 'health-warning');

            warningG.append('circle')
                .attr('r', 10)
                .attr('fill', '#f59e0b'); // amber-500
            
            warningG.append('text')
                .attr('fill', '#000')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .attr('font-size', '12px')
                .attr('font-weight', 'bold')
                .text('!');
                
            warningG.append('title').text(issues.map(i => i.message).join('\n'));
        }
    });
      
    const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
        mainGroup.attr('transform', event.transform);
    });
    
    svg.call(zoom);

    const linkedByIndex: {[key: string]: boolean} = {};
    links.forEach(l => {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
        const targetId = typeof l.target === 'string' ? l.target : l.target.id;
        linkedByIndex[`${sourceId},${targetId}`] = true;
    });

    function isConnected(a: GraphNode, b: GraphNode) {
        return a.id === b.id || linkedByIndex[`${a.id},${b.id}`] || linkedByIndex[`${b.id},${a.id}`];
    }
    
    node.on('mouseover', (event, d) => {
        node.style('opacity', n => isConnected(d, n) ? 1.0 : 0.3);
        link.style('opacity', l => (l.source as GraphNode).id === d.id || (l.target as GraphNode).id === d.id ? 1.0 : 0.3);
        linkText.style('opacity', l => (l.source as GraphNode).id === d.id || (l.target as GraphNode).id === d.id ? 1.0 : 0.3);
        linkTextBg.style('opacity', l => (l.source as GraphNode).id === d.id || (l.target as GraphNode).id === d.id ? 1.0 : 0.3);
    });

    node.on('mouseout', () => {
        node.style('opacity', 1.0);
        link.style('opacity', 0.8);
        linkText.style('opacity', 1.0);
        linkTextBg.style('opacity', 1.0);
    });
    
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);

      linkText
        .attr("x", d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr("y", d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2);
      
      linkTextBg
        .attr("x", d => {
            const textWidth = linkText.nodes().find(n => (n as any).__data__ === d)?.getBBox().width || 0;
            return ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2 - textWidth / 2 - 4;
        })
        .attr("y", d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2 - 8)
        .attr('width', d => {
            const textWidth = linkText.nodes().find(n => (n as any).__data__ === d)?.getBBox().width || 0;
            return textWidth + 8;
        })
        .attr('height', 16);
    });

    function drag(simulation: d3.Simulation<GraphNode, undefined>) {
        function dragstarted(event: d3.D3DragEvent<Element, GraphNode, GraphNode>, d: GraphNode) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        function dragged(event: d3.D3DragEvent<Element, GraphNode, GraphNode>, d: GraphNode) {
            d.fx = event.x;
            d.fy = event.y;
        }
        function dragended(event: d3.D3DragEvent<Element, GraphNode, GraphNode>, d: GraphNode) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        return d3.drag<any, GraphNode>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
    
    if(selectedElement){
        if(selectedElement.type === 'node'){
            mainGroup.selectAll(`.node-${selectedElement.id} circle`)
                .attr('stroke', '#67e8f9') // cyan-300
                .attr('stroke-width', 4);
        } else if (selectedElement.type === 'relationship') {
             mainGroup.selectAll(`.link-${selectedElement.id}`)
                .attr('stroke', '#67e8f9') // cyan-300
                .attr('stroke-width', 4)
                .attr('stroke-opacity', 1);
        }
    }


    return () => {
      simulation.stop();
    };
  }, [schema, selectedElement, onSelectElement, ontology, healthIssues]);

  return <svg ref={svgRef} />;
};