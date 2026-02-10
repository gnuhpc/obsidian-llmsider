/**
 * Memory Monitor
 * 
 * Monitors plugin memory usage and triggers cleanup when thresholds are exceeded
 */

import { Logger } from './logger';
import { Notice } from 'obsidian';

export interface MemoryStats {
	heapUsed: number;
	heapTotal: number;
	external: number;
	rss: number;
	usagePercentage: number;
}

export interface MemoryThresholds {
	warning: number;  // Warning threshold (e.g., 80%)
	critical: number; // Critical threshold (e.g., 90%)
}

export class MemoryMonitor {
	private static instance: MemoryMonitor;
	private thresholds: MemoryThresholds = {
		warning: 80,
		critical: 90
	};
	private lastWarningTime: number = 0;
	private readonly WARNING_COOLDOWN = 5 * 60 * 1000; // 5 minutes
	private cleanupCallbacks: Array<() => Promise<void>> = [];
	private monitorInterval: NodeJS.Timeout | null = null;
	private isMonitoring: boolean = false;

	private constructor() {
		// Private constructor for singleton
	}

	static getInstance(): MemoryMonitor {
		if (!MemoryMonitor.instance) {
			MemoryMonitor.instance = new MemoryMonitor();
		}
		return MemoryMonitor.instance;
	}

	/**
	 * Set memory thresholds
	 */
	setThresholds(thresholds: Partial<MemoryThresholds>): void {
		this.thresholds = { ...this.thresholds, ...thresholds };
		// Removed debug log to reduce noise
	}

	/**
	 * Register a cleanup callback
	 */
	registerCleanup(callback: () => Promise<void>): void {
		this.cleanupCallbacks.push(callback);
		// Removed debug log to reduce noise
	}

	/**
	 * Get current memory statistics
	 */
	getMemoryStats(): MemoryStats {
		if (typeof process === 'undefined' || !process.memoryUsage) {
			// Fallback for environments without process.memoryUsage
			return {
				heapUsed: 0,
				heapTotal: 0,
				external: 0,
				rss: 0,
				usagePercentage: 0
			};
		}

		const memUsage = process.memoryUsage();
		
		// Calculate percentage based on current heapTotal (allocated heap size)
		// This accurately reflects how much of the currently allocated heap is being used
		// When heap grows due to memory pressure, usagePercentage will naturally increase
		const usagePercentage = memUsage.heapTotal > 0 
			? (memUsage.heapUsed / memUsage.heapTotal) * 100
			: 0;

		return {
			heapUsed: memUsage.heapUsed,
			heapTotal: memUsage.heapTotal,
			external: memUsage.external,
			rss: memUsage.rss,
			usagePercentage
		};
	}

	/**
	 * Format bytes to human-readable format
	 */
	private formatBytes(bytes: number): string {
		const mb = bytes / (1024 * 1024);
		return `${mb.toFixed(2)} MB`;
	}

	/**
	 * Check memory and trigger warnings/cleanup if needed
	 */
	async checkMemory(): Promise<void> {
		const stats = this.getMemoryStats();
		const { usagePercentage, heapTotal } = stats;

		// Ignore high percentage if total heap is small (e.g. < 300MB)
		// This prevents false alarms when V8 hasn't expanded the heap yet
		if (heapTotal < 300 * 1024 * 1024) {
			return;
		}

		const now = Date.now();

		// Only log when there's an issue (warning or critical)
		// Critical threshold - run cleanup immediately
		if (usagePercentage >= this.thresholds.critical) {
			// Silently run cleanup
			await this.runCleanup('critical', false);
			
			// Force garbage collection if available
			if (global.gc) {
				global.gc();
			}
		}
		// Warning threshold - log only, don't notify user
		else if (usagePercentage >= this.thresholds.warning) {
			// Only log warning once every 5 minutes
			if (now - this.lastWarningTime > this.WARNING_COOLDOWN) {
				Logger.debug(`[MemoryMonitor] WARNING: Memory usage at ${usagePercentage.toFixed(1)}%`);
				this.lastWarningTime = now;
			}
		}
	}

	/**
	 * Run all registered cleanup callbacks
	 */
	private async runCleanup(severity: 'warning' | 'critical', log: boolean = true): Promise<void> {
		// Only log critical cleanups
		if (severity === 'critical' && log) {
			Logger.warn(`[MemoryMonitor] Running ${severity} cleanup`);
		}
		
		for (let i = 0; i < this.cleanupCallbacks.length; i++) {
			try {
				await this.cleanupCallbacks[i]();
			} catch (error) {
				Logger.error(`[MemoryMonitor] Cleanup callback ${i} failed:`, error);
			}
		}
	}

	/**
	 * Start periodic memory monitoring
	 */
	startMonitoring(intervalMs: number = 60000): void {
		if (this.isMonitoring) {
			return;
		}

		// Removed debug log to reduce noise
		this.isMonitoring = true;

		// Initial check
		this.checkMemory();

		// Periodic checks
		this.monitorInterval = setInterval(() => {
			this.checkMemory();
		}, intervalMs);
	}

	/**
	 * Stop memory monitoring
	 */
	stopMonitoring(): void {
		if (this.monitorInterval) {
			clearInterval(this.monitorInterval);
			this.monitorInterval = null;
		}
		this.isMonitoring = false;
		// Removed debug log to reduce noise
	}

	/**
	 * Get formatted memory report
	 */
	getMemoryReport(): string {
		const stats = this.getMemoryStats();
		return `Memory Usage Report:
- Heap Used: ${this.formatBytes(stats.heapUsed)}
- Heap Total: ${this.formatBytes(stats.heapTotal)}
- Usage: ${stats.usagePercentage.toFixed(1)}%
- External: ${this.formatBytes(stats.external)}
- RSS: ${this.formatBytes(stats.rss)}
- Thresholds: Warning=${this.thresholds.warning}%, Critical=${this.thresholds.critical}%`;
	}

	/**
	 * Manual cleanup trigger
	 */
	async triggerCleanup(): Promise<void> {
		// Removed debug log to reduce noise
		await this.runCleanup('warning');
		
		// Force GC if available
		if (global.gc) {
			global.gc();
		}
	}

	/**
	 * Check if memory usage is healthy
	 */
	isHealthy(): boolean {
		const stats = this.getMemoryStats();
		return stats.usagePercentage < this.thresholds.warning;
	}
}

export const memoryMonitor = MemoryMonitor.getInstance();
