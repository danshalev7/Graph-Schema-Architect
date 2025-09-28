
import { GoogleGenAI, Type } from "@google/genai";
import { GraphSchema, HealthCheckIssue, Ontology } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        nodes: {
            type: Type.ARRAY,
            description: "List of node labels in the graph.",
            items: {
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING, description: "The name of the node label (e.g., 'User', 'Post')." },
                    properties: {
                        type: Type.ARRAY,
                        description: "Properties of this node label.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "Property name." },
                                type: { type: Type.STRING, description: "Property FalkorDB data type. MUST be one of: 'String', 'Integer', 'Float', 'Boolean', 'Point', 'Array'." },
                                description: { type: Type.STRING, description: "A brief description of the property. May include a suggestion to promote it to a new node, prefixed with 'suggestion:'." }
                            },
                            required: ["name", "type"]
                        }
                    },
                    description: { type: Type.STRING, description: "A brief description of what this node represents." }
                },
                required: ["label", "properties"]
            }
        },
        relationships: {
            type: Type.ARRAY,
            description: "List of relationship types in the graph.",
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, description: "The name of the relationship type (e.g., 'FOLLOWS', 'WROTE')." },
                    source: { type: Type.STRING, description: "The source node label for this relationship." },
                    target: { type: Type.STRING, description: "The target node label for this relationship." },
                    properties: {
                        type: Type.ARRAY,
                        description: "Properties of this relationship type.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "Property name." },
                                type: { type: Type.STRING, description: "Property FalkorDB data type. MUST be one of: 'String', 'Integer', 'Float', 'Boolean', 'Point', 'Array'." },
                                description: { type: Type.STRING, description: "A brief description of the property." }
                            },
                            required: ["name", "type"]
                        }
                    },
                    description: { type: Type.STRING, description: "A brief description of what this relationship represents." }
                },
                required: ["type", "source", "target", "properties"]
            }
        }
    },
    required: ["nodes", "relationships"]
};

const SYSTEM_INSTRUCTION_BASE = `You are an expert graph database schema designer specializing in FalkorDB. Your task is to analyze the user's input and convert it into a structured graph schema.

Key responsibilities:
1.  **Identify Entities & Connections:** Identify main entities as node labels and connections as relationship types.
2.  **Define Properties:** Assign attributes as properties to nodes and relationships.
3.  **Use FalkorDB Types:** You MUST map all property data types to one of the following FalkorDB native scalar types: 'String', 'Integer', 'Float', 'Boolean', 'Point', 'Array'. Do NOT use any other types like 'timestamp', 'date', or 'varchar'.
4.  **Suggest Node Promotion:** If a 'String' property has low cardinality and represents a distinct entity (e.g., 'city', 'category', 'tag'), add a 'suggestion:' prefix to its description field explaining why it should be promoted to its own node.
5.  **Follow Naming Conventions:** Use singular, capitalized names for Node labels (e.g., 'User') and uppercase, verb-based names for Relationship types (e.g., 'WROTE').

The output must be a valid JSON object following the provided schema.`;

async function generateSchema(prompt: string, instruction: string): Promise<GraphSchema> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: instruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.1
            },
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        // Create a unique ID for each relationship for easier identification
        const finalSchema = {
            ...parsedJson,
            relationships: parsedJson.relationships.map((rel: any) => ({...rel, id: `${rel.source}_${rel.type}_${rel.target}`}))
        };
        return finalSchema as GraphSchema;
    } catch (error) {
        console.error("Error generating schema from Gemini:", error);
        if (error instanceof SyntaxError) {
             throw new Error("Failed to parse the AI's response. The response was not valid JSON.");
        }
        throw new Error("An error occurred while communicating with the AI. Please try again.");
    }
}


export async function generateSchemaFromDescription(description: string): Promise<GraphSchema> {
    const instruction = SYSTEM_INSTRUCTION_BASE + " The user has provided a natural language description of their data domain.";
    return generateSchema(description, instruction);
}

export async function generateSchemaFromCsv(files: { fileName: string; content: string }[]): Promise<GraphSchema> {
    const instruction = SYSTEM_INSTRUCTION_BASE + " The user has provided one or more CSV files. The first row of each file represents headers. Infer node labels from file names, properties from columns, and relationships from columns with similar names (e.g., 'user_id' in a 'posts.csv' and 'id' in a 'users.csv' imply a relationship).";

    const prompt = files.map(file => {
        const lines = file.content.split('\n').slice(0, 6);
        return `File: ${file.fileName}\n\n${lines.join('\n')}`;
    }).join('\n\n---\n\n');

    return generateSchema(prompt, instruction);
}


export async function generateSchemaFromSql(ddl: string): Promise<GraphSchema> {
    const instruction = SYSTEM_INSTRUCTION_BASE + " The user has provided SQL DDL (`CREATE TABLE`) statements. Translate tables into node labels, columns into properties, and PRIMARY KEY/FOREIGN KEY constraints into graph relationships.";
    return generateSchema(ddl, instruction);
}

// Sprint 4: Health Check
const healthCheckSystemInstruction = `You are a FalkorDB performance and data modeling expert. Your task is to perform a health check on the provided graph schema and ontology.

Analyze the following:
1.  **Indexing:** Identify node labels with properties that should be indexed for performance but aren't. Typically, primary keys or frequently filtered properties need indexes.
2.  **Naming Conventions:** Check for inconsistent naming (e.g., plural node labels, lowercase relationship types).
3.  **Ontology Violations:**
    - **Hierarchies:** Ensure no rules are logically broken.
    - **Axioms:** Check if any required relationships defined in the axioms are missing from the schema. For example, if an axiom is "A Book must be WRITTEN_BY an Author", verify a 'WRITTEN_BY' relationship exists connecting 'Book' to 'Author'.
4.  **Modeling Anti-Patterns:** Look for common graph modeling mistakes, such as using a node for a simple attribute or creating overly dense "supernodes".

For each issue found, provide a concise, actionable message.`;

const healthCheckResponseSchema = {
    type: Type.OBJECT,
    properties: {
        issues: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "ID of the affected element. For nodes, the label. For relationships, the unique ID like 'Source_TYPE_Target'." },
                    type: { type: Type.STRING, enum: ['node', 'relationship'], description: "The type of the element." },
                    message: { type: Type.STRING, description: "A clear description of the issue and suggested fix." }
                },
                required: ["id", "type", "message"]
            }
        }
    },
    required: ["issues"]
};

export async function runSchemaHealthCheck(schema: GraphSchema, ontology: Ontology): Promise<HealthCheckIssue[]> {
    const prompt = `Perform a health check on this schema and ontology:
    
Schema:
${JSON.stringify(schema, null, 2)}

Ontology:
${JSON.stringify(ontology, null, 2)}
`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: healthCheckSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: healthCheckResponseSchema,
                temperature: 0.2
            },
        });
        
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return parsed.issues || [];
    } catch (error) {
        console.error("Error running health check:", error);
        // Return empty array on failure to avoid crashing the app
        return [];
    }
}

// Sprint 5: Query Simulation
const queryEngineSystemInstruction = `You are a Cypher query engine. You will be given a graph dataset as a JSON object with a 'nodes' array and a 'links' array. You will also be given a Cypher query. Your task is to execute the query against the dataset and return the result. The result should be a JSON array of objects, where each object represents a row in the result set. The keys of the object should be the variable names from the RETURN clause of the query.
- For 'RETURN n', the object should contain all properties of the matched node 'n'.
- For 'RETURN n.name, r.since', the object should be \`{"n.name": "value", "r.since": "value"}\`.
- If the query has a syntax error or is not executable on the data, return a JSON object with a single key "error" and a descriptive message.
- Keep the response concise and only return the JSON data.`;

export async function executeQueryOnData(query: string, data: { nodes: any[], links: any[]}): Promise<any> {
    const prompt = `
Dataset:
${JSON.stringify(data, null, 2)}

---

Query:
${query}
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: queryEngineSystemInstruction,
                responseMimeType: "application/json" // Expecting a JSON response
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error executing query with AI:", error);
        return { error: "Failed to communicate with the AI query engine or parse its response." };
    }
}
