
import { GraphSchema, NodeLabel } from '../types';

const toPascalCase = (str: string): string => {
    return str
        .replace(/\.csv$/i, '')
        .replace(/[^a-zA-Z0-9]+(.)/g, (_match, chr) => chr.toUpperCase())
        .replace(/^./, (chr) => chr.toUpperCase());
}

const toSingular = (str: string): string => {
    if (str.endsWith('ies')) {
        return str.slice(0, -3) + 'y';
    }
    if (str.endsWith('s')) {
        return str.slice(0, -1);
    }
    return str;
}


export function generateCypherSchemaScript(schema: GraphSchema): string {
  let script = `// FalkorDB Schema Generation Script
// This script creates indexes on node properties for faster lookups.
// It assumes your graph is named 'myGraph'. Replace if necessary.

`;

  if (schema.nodes.length === 0) {
    return script + "// No nodes found in the schema to generate indexes for.";
  }

  schema.nodes.forEach(node => {
    script += `\n// -- Schema for Node: ${node.label} --\n`;
    if (node.properties.length > 0) {
        // A common pattern is to index the first property, often an ID.
        const primaryProperty = node.properties[0];
         script += `// Creating an index on '${primaryProperty.name}' for faster lookups.\n`;
         script += `GRAPH.QUERY "myGraph" "CREATE INDEX ON :${node.label}(${primaryProperty.name})"\n`;
    } else {
        script += `// No properties defined for ${node.label}, so no index will be created.\n`;
    }
  });
  
  return script;
}

export function generateCsvImportScript(schema: GraphSchema): string {
    let script = `// --- FalkorDB Data Import Script ---
// 
// IMPORTANT NOTE: 
// FalkorDB uses a dedicated command-line utility 'falkor-bulk-loader' for high-performance
// data ingestion from CSVs. The Cypher queries below (using LOAD CSV) are provided for 
// conceptual understanding and are primarily compatible with Neo4j.
// 
// For production environments with FalkorDB, you should use 'falkor-bulk-loader'.
// See FalkorDB documentation for usage details.

`;

    if (schema.nodes.length === 0 && schema.relationships.length === 0) {
        return script + "// Schema is empty. No import script generated.";
    }

    // Assumptions: CSV filenames map to node labels. (e.g., users.csv -> User)
    schema.nodes.forEach(node => {
        const fileName = `${node.label.toLowerCase()}s.csv`; // e.g., User -> users.csv
        const variable = node.label.charAt(0).toLowerCase(); // e.g., User -> u

        script += `\n// Load ${node.label} nodes from ${fileName}\n`;
        const props = node.properties.map(p => `${p.name}: row.${p.name}`).join(', ');
        script += `LOAD CSV WITH HEADERS FROM 'file:///${fileName}' AS row\n`;
        script += `CREATE (${variable}:${node.label} {${props}});\n`;
    });


    schema.relationships.forEach(rel => {
        const sourceNode = schema.nodes.find(n => n.label === rel.source);
        const targetNode = schema.nodes.find(n => n.label === rel.target);

        if(!sourceNode || !targetNode) return;

        const relProps = rel.properties.map(p => `${p.name}: row.${p.name}`).join(', ');
        const relPropsString = relProps ? ` {${relProps}}` : '';

        if (rel.source === rel.target) {
            // Handle many-to-many self-relationship (e.g., User FOLLOWS User)
            const node = sourceNode;
            const nodeVar1 = `${node.label.charAt(0).toLowerCase()}1`;
            const nodeVar2 = `${node.label.charAt(0).toLowerCase()}2`;
            const nodeIdProp = node.properties[0]?.name || 'id';

            const joinFileName = `${node.label.toLowerCase()}_${rel.type.toLowerCase()}.csv`;
            const fromCol = `from_${nodeIdProp}`;
            const toCol = `to_${nodeIdProp}`;

            script += `\n// Create ${rel.type} relationships between ${rel.source} nodes (many-to-many)\n`;
            script += `// This assumes a join file named '${joinFileName}' with columns '${fromCol}' and '${toCol}'.\n`;
            script += `LOAD CSV WITH HEADERS FROM 'file:///${joinFileName}' AS row\n`;
            script += `MATCH (${nodeVar1}:${node.label} {${nodeIdProp}: row.${fromCol}})\n`;
            script += `MATCH (${nodeVar2}:${node.label} {${nodeIdProp}: row.${toCol}})\n`;
            script += `CREATE (${nodeVar1})-[:${rel.type}${relPropsString}]->(${nodeVar2});\n`;
        } else {
            // Handle one-to-many or one-to-one relationship
            const sourceVar = rel.source.charAt(0).toLowerCase();
            const targetVar = rel.target.charAt(0).toLowerCase();
            
            const csvFileName = `${targetNode.label.toLowerCase()}s.csv`;
            const sourceIdProp = sourceNode.properties[0]?.name || 'id';
            const targetIdProp = targetNode.properties[0]?.name || 'id';
            
            // Assume foreign key is in the target file, named like 'sourceLabel_sourceIdProp'
            const foreignKeyColumn = `${sourceNode.label.toLowerCase()}_${sourceIdProp}`;

            script += `\n// Create ${rel.type} relationships from ${rel.source} to ${rel.target}\n`;
            script += `// This assumes '${csvFileName}' contains a '${foreignKeyColumn}' column referencing '${sourceNode.label}'.\n`;
            script += `LOAD CSV WITH HEADERS FROM 'file:///${csvFileName}' AS row\n`;
            script += `MATCH (${sourceVar}:${sourceNode.label} {${sourceIdProp}: row.${foreignKeyColumn}})\n`;
            script += `MATCH (${targetVar}:${targetNode.label} {${targetIdProp}: row.${targetIdProp}})\n`;
            script += `CREATE (${sourceVar})-[:${rel.type}${relPropsString}]->(${targetVar});\n`;
        }
    });

    return script;
}
