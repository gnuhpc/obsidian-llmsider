// Utility tools for text processing and time operations
import type { ToolCategory } from './built-in-tools';
import { Logger } from './../utils/logger';

export interface BuiltInTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  execute: (args: any) => Promise<any>;
  category?: ToolCategory;
}

/**
 * Get current date and time
 */
export const getCurrentTimeTool: BuiltInTool = {
  name: 'get_timedate',
  description: 'Get the current date and time in various formats, including Unix timestamp and ISO 8601 format.',
  category: 'utility',
  inputSchema: {
    type: 'object',
    properties: {
      time_offset: {
        type: 'number',
        description: 'Time offset in seconds'
      },
      format: {
        type: 'string',
        description: 'Format string'
      },
      timezone: {
        type: 'string',
        description: 'Timezone string'
      }
    },
    required: []
  },
  execute: async (args: { time_offset?: number; format?: string; timezone?: string }) => {
    try {
      const timeOffset = args.time_offset || 0;
      const now = new Date(Date.now() + timeOffset * 1000);
      const format = args.format || 'YYYY-MM-DD';

      // Helper function to format date with custom format strings
      const formatDateTime = (date: Date, formatStr: string): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return formatStr
          .replace('YYYY', String(year))
          .replace('MM', month)
          .replace('DD', day)
          .replace('HH', hours)
          .replace('mm', minutes)
          .replace('ss', seconds);
      };

      // Format datetime based on format string
      let datetime: string;
      
      if (format.includes('YYYY') || format.includes('MM') || format.includes('DD')) {
        // Custom format string (e.g., YYYY-MM-DD, YYYY-MM-DD HH:mm:ss)
        datetime = formatDateTime(now, format);
      } else {
        // Predefined formats
        switch (format) {
          case 'iso':
            datetime = now.toISOString();
            break;

          case 'local':
            if (args.timezone) {
              datetime = now.toLocaleString('en-US', { timeZone: args.timezone });
            } else {
              datetime = now.toLocaleString();
            }
            break;

          case 'utc':
            datetime = now.toUTCString();
            break;

          case 'timestamp':
            datetime = String(now.getTime());
            break;

          case 'human':
            datetime = now.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short'
            });
            break;

          default:
            datetime = formatDateTime(now, format);
        }
      }

      return datetime;

    } catch (error) {
      Logger.error('Error getting current time:', error);
      return error instanceof Error ? error.message : 'Unknown error';
    }
  }
};