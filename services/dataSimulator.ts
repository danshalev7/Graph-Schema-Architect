import { GraphSchema, NodeLabel, Property } from '../types';

const randomInt = (max: number) => Math.floor(Math.random() * max);
const randomFloat = (max: number) => Math.random() * max;
const randomElement = <T>(arr: T[]): T => arr[randomInt(arr.length)];

const generatePropertyValue = (property: Property): any => {
    switch (property.type) {
        case 'String':
            return `${property.name}_${randomInt(1000)}`;
        case 'Integer':
            return randomInt(10000);
        case 'Float':
            return parseFloat(randomFloat(1000).toFixed(2));
        case 'Boolean':
            return Math.random() > 0.5;
        case 'Point':
            return {
                longitude: parseFloat((Math.random() * 180 - 90).toFixed(6)),
                latitude: parseFloat((Math.random() * 360 - 180).toFixed(6)),
            };
        case 'Array':
            return Array.from({ length: randomInt(5) + 1 }, () => `item_${randomInt(100)}`);
        default:
            return null;
    }
};

const createProperties = (properties: Property[]): Record<string, any> => {
    const obj: Record<string, any> = {};
    properties.forEach(prop => {
        obj[prop.name] = generatePropertyValue(prop);
    });
    return obj;
};

export const simulateData = (schema: GraphSchema, totalNodes: number) => {
    const nodes: any[] = [];
    const links: any[] = [];

    if (schema.nodes.length === 0) {
        return { nodes, links };
    }

    // Distribute total node count among labels
    const nodesPerLabel: Record<string, number> = {};
    let remainingNodes = totalNodes;
    schema.nodes.forEach((nodeLabel, index) => {
        const count = index === schema.nodes.length - 1
            ? remainingNodes
            : Math.floor(totalNodes / schema.nodes.length);
        nodesPerLabel[nodeLabel.label] = count;
        remainingNodes -= count;
    });

    let nodeCounter = 0;
    schema.nodes.forEach(nodeLabel => {
        const count = nodesPerLabel[nodeLabel.label];
        for (let i = 0; i < count; i++) {
            nodes.push({
                id: `${nodeCounter++}`,
                label: nodeLabel.label,
                properties: createProperties(nodeLabel.properties),
            });
        }
    });

    // Create relationships
    schema.relationships.forEach(relType => {
        const sourceNodes = nodes.filter(n => n.label === relType.source);
        const targetNodes = nodes.filter(n => n.label === relType.target);

        if (sourceNodes.length > 0 && targetNodes.length > 0) {
            // Create a number of relationships proportional to the nodes
            const relCount = Math.ceil(Math.sqrt(sourceNodes.length * targetNodes.length) / 2);
            for (let i = 0; i < relCount; i++) {
                const sourceNode = randomElement(sourceNodes);
                const targetNode = randomElement(targetNodes);

                // Avoid self-loops unless source and target are the same label type
                if (sourceNode.id === targetNode.id && relType.source !== relType.target) continue;
                
                links.push({
                    source: sourceNode.id,
                    target: targetNode.id,
                    type: relType.type,
                    properties: createProperties(relType.properties),
                });
            }
        }
    });


    return { nodes, links };
};
