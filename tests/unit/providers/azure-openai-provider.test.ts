import { beforeEach, describe, expect, it } from 'vitest';
import { AzureOpenAIProvider } from '../../../src/providers/azure-openai-provider';
import { LLMMessage } from '../../../src/models/message-models';
import { LLMTool } from '../../../src/models/llm-models';

describe('AzureOpenAIProvider', () => {
  let provider: AzureOpenAIProvider;

  beforeEach(() => {
    provider = new AzureOpenAIProvider({
      apiKey: 'test-api-key',
      deployment: 'test-deployment',
      endpoint: 'https://test-endpoint'
    });
  });

  describe('transformToolCall', () => {
    it('should correctly format a tool with json schema parameters', () => {
      const tool: LLMTool = {
        type: 'function',
        name: 'get_current_weather',
        description: 'Get the current weather in a given location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The city and state, e.g. San Francisco, CA'
            },
            unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
          },
          required: ['location']
        }
      };

      const adaptedTool = provider.transformToolCall(tool);

      expect(adaptedTool).toEqual({
        type: 'function',
        function: {
          name: 'get_current_weather',
          description: 'Get the current weather in a given location',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city and state, e.g. San Francisco, CA'
              },
              unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
            },
            required: ['location']
          }
        }
      });
    });
  });

  describe('transformMessage', () => {
    describe('role:system', () => {
      it('should correctly format a message', () => {
        const message: LLMMessage = { role: 'system', content: 'Hello, how are you?' };

        const adaptedMessage = provider.transformMessage(message);

        expect(adaptedMessage).toEqual({ role: 'system', content: 'Hello, how are you?' });
      });
    });

    describe('role:assistant', () => {
      it('should correctly format a content with a string text message', () => {
        const message: LLMMessage = { role: 'assistant', content: 'The picture looks like a modern kitchen' };

        const adaptedMessage = provider.transformMessage(message);

        expect(adaptedMessage).toEqual({ role: 'assistant', content: 'The picture looks like a modern kitchen' });
      });

      it('should correctly format a content with text parts', () => {
        const message: LLMMessage = { role: 'assistant', content: [{ type: 'text', text: 'The picture looks like a modern kitchen' }] };

        const adaptedMessage = provider.transformMessage(message);

        expect(adaptedMessage).toEqual({ role: 'assistant', content: [{ type: 'text', text: 'The picture looks like a modern kitchen' }] });
      });

      it('should correctly format toolCalls', () => {
        const message: LLMMessage = {
          role: 'assistant',
          content: null,
          toolCalls: [
            {
              type: 'function',
              toolCallId: 'call_abc123',
              name: 'get_current_weather',
              arguments: '{\n"location": "Boston, MA"\n}'
            }
          ]
        };

        const adaptedMessage = provider.transformMessage(message);

        expect(adaptedMessage).toEqual({
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_abc123',
              type: 'function',
              function: {
                name: 'get_current_weather',
                arguments: '{\n"location": "Boston, MA"\n}'
              }
            }
          ]
        });
      });
    });

    describe('role:tool', () => {
      it('should correctly format a message', () => {
        const message: LLMMessage = { role: 'tool', content: '42', toolCallId: 'call_abc123' };

        const adaptedMessage = provider.transformMessage(message);

        expect(adaptedMessage).toEqual({ role: 'tool', content: '42', tool_call_id: 'call_abc123' });
      });
    });

    describe('role:user', () => {
      it('should correctly format a content with a string text message', () => {
        const message: LLMMessage = { role: 'user', content: 'Hello, how are you?' };

        const adaptedMessage = provider.transformMessage(message);

        expect(adaptedMessage).toEqual({ role: 'user', content: 'Hello, how are you?' });
      });

      it('should correctly format a content with text parts', () => {
        const message: LLMMessage = { role: 'user', content: [{ type: 'text', text: 'Hello, how are you?' }] };

        const adaptedMessage = provider.transformMessage(message);

        expect(adaptedMessage).toEqual({ role: 'user', content: [{ type: 'text', text: 'Hello, how are you?' }] });
      });

      it('should correctly format a content with image parts', () => {
        const message: LLMMessage = { role: 'user', content: [{ type: 'image', image: '<image URL>' }] };

        const adaptedMessage = provider.transformMessage(message);

        expect(adaptedMessage).toEqual({ role: 'user', content: [{ type: 'image_url', image_url: { url: '<image URL>' } }] });
      });

      it('should correctly format a content with text and image parts', () => {
        const message: LLMMessage = {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this picture:' },
            { type: 'image', image: '<image URL>' }
          ]
        };

        const adaptedMessage = provider.transformMessage(message);

        expect(adaptedMessage).toEqual({
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this picture:' },
            { type: 'image_url', image_url: { url: '<image URL>' } }
          ]
        });
      });
    });
  });
});
