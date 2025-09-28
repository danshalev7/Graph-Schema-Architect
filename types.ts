// This file will contain shared TypeScript types, interfaces, and enums
// to ensure type safety across the application.

export interface Property {
  name: string;
  type: string;
  description?: string;
}

export interface NodeLabel {
  label: string;
  properties: Property[];
  description?: string;
}

export interface RelationshipType {
  id: string; // Unique ID, e.g. "Source_TYPE_Target"
  type: string;
  source: string; // The source node label
  target: string; // The target node label
  properties: Property[];
  description?: string;
}

export interface GraphSchema {
  nodes: NodeLabel[];
  relationships: RelationshipType[];
}

// Sprint 4: Ontology and Health Checks

export interface Hierarchy {
  subclass: string; // e.g., 'FictionBook'
  superclass: string; // e.g., 'Book'
}

export interface Axiom {
  source: string; // e.g., 'Book'
  relationship: string; // e.g., 'WRITTEN_BY'
  target: string; // e.g., 'Author'
}

export interface Ontology {
  hierarchies: Hierarchy[];
  axioms: Axiom[];
}

export interface HealthCheckIssue {
  id: string; // ID of the node (label) or relationship (type)
  type: 'node' | 'relationship';
  message: string;
}