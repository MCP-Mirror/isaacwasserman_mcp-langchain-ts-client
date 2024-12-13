import { CallToolRequest, CallToolResultSchema, ListToolsResult, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { BaseToolkit, StructuredToolInterface, StructuredToolParams, tool, Tool } from "@langchain/core/tools";
import { z } from "zod";

export class MCPToolkit extends BaseToolkit {
  tools: Tool[] = [];
  _tools: ListToolsResult | null = null;
  model_config: any;
  client: Client | null = null;
  async initialize(serverParams: StdioServerParameters) {
    if (this._tools === null) {
      const transport = new StdioClientTransport(serverParams);
      this.client = new Client({
        name: "langchain-js-client",
        version: "1.0.0",
      }, {
        capabilities: {}
      });
      await this.client.connect(transport);
      this._tools = await this.client.request(
        { method: "tools/list" },
        ListToolsResultSchema
      );

      this.tools = await this.get_tools();
    }
  }

  async get_tools(): Promise<Tool[]> {
    if (this._tools === null || this.client === null) {
      throw new Error("Must initialize the toolkit first");
    }
    const toolsPromises = this._tools.tools.map(async tool => {
      if (this.client === null) {
        throw new Error("Client is not initialized");
      }
      return await MCPTool({
        client: this.client,
        name: tool.name,
        description: tool.description || "",
        argsSchema: createSchemaModel(tool.inputSchema)
      });
    });
    return Promise.all(toolsPromises);
  }

}

export async function MCPTool({ client, name, description, argsSchema }: { client: Client, name: string, description: string, argsSchema: any }): Promise<Tool> {
  return tool(
    async (input): Promise<string> => {
      const req: CallToolRequest = { method: "tools/call", params: { name: name, arguments: input } };
      const res = await client.request(req, CallToolResultSchema);
      return JSON.stringify(res);
    },
    {
      name: name,
      description: description,
      schema: argsSchema,
    }
  );
}

function createSchemaModel(inputSchema: { type: "object"; properties?: import("zod").objectOutputType<{}, import("zod").ZodTypeAny, "passthrough"> | undefined; } & { [k: string]: unknown; }): any {
  if (inputSchema.type !== "object" || !inputSchema.properties) {
    throw new Error("Invalid schema type or missing properties");
  }

  const schemaProperties = Object.entries(inputSchema.properties).reduce((acc, [key, value]) => {
    acc[key] = z.any(); // You can customize this to map specific types
    return acc;
  }, {} as Record<string, import("zod").ZodTypeAny>);

  return z.object(schemaProperties);
}