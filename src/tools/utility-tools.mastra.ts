/**
 * Utility Tools - Mastra Format
 * 
 * This is an example of migrated tools using Mastra's createTool format.
 * All tools now use Zod schemas instead of JSON Schema.
 */

import { z } from 'zod';
import { Logger } from '../utils/logger';
import { createMastraTool } from './tool-converter';
import type { MastraTool } from './mastra-tool-types';

/**
 * Get current date and time - Mastra Format
 */
export const getCurrentTimeTool: MastraTool = createMastraTool({
	id: 'get_timedate',
	description: 'Get the current date and time in various formats, including Unix timestamp and ISO 8601 format. Supports custom format strings like YYYYMMDD (20251117), YYYY-MM-DD (2025-11-17), etc.',
	category: 'utility',
	
	// Zod schema for input validation
	inputSchema: z.object({
		time_offset: z.number()
			.optional()
			.describe('Time offset in seconds'),
		format: z.string()
			.optional()
			.describe('Format string. Supports custom patterns like YYYYMMDD (e.g., 20251117), YYYY-MM-DD (e.g., 2025-11-17), YYYY-MM-DD HH:mm:ss, or predefined formats: "iso", "local", "utc", "timestamp", "human". Default is YYYY-MM-DD.'),
		timezone: z.string()
			.optional()
			.describe('Timezone string (e.g., "America/New_York", "Asia/Shanghai"). Only used with "local" format.')
	}),
	
	// Zod schema for output
  outputSchema: z.string()
    .describe('Date/time string formatted according to the requested format.'),	// Execute function with typed context
	execute: async ({ context, runtimeContext, tracingContext, abortSignal }) => {
		try {
			const timeOffset = context.time_offset || 0;
			const now = new Date(Date.now() + timeOffset * 1000);
			const format = context.format || 'YYYY-MM-DD';

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
						if (context.timezone) {
							datetime = now.toLocaleString('en-US', { timeZone: context.timezone });
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
			throw error instanceof Error ? error : new Error('Unknown error');
		}
	}
});
