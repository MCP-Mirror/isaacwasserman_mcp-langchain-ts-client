import { describe, it, expect } from 'vitest';
import { MCPToolkit } from '../index';

const serverParams = {
  command: "npx",
  args: [
    "-y",
    "@modelcontextprotocol/server-everything"
  ]
}

const toolkit = new MCPToolkit();
await toolkit.initialize(serverParams);

const toolsByName = toolkit.tools.reduce((acc, tool) => {
  acc[tool.name] = tool;
  return acc;
});

describe('MCPToolkit', () => {
  describe('initialize', () => {
    it('should initialize the toolkit', () => {
      expect(toolkit.tools.length).toBeGreaterThan(0);
    });
  });
  describe('tools', () => {
    it('should echo'), async () => {
      const tool = toolsByName['echo'];
      const result = await tool.invoke({ message: 'hello' });
      expect(result).toBe('hello');
    }
  });
});