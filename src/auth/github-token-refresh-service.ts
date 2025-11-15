/**
 * GitHub Copilot Token Refresh Service
 * Automatically refreshes GitHub Copilot tokens every hour
 */

import { requestUrl } from 'obsidian';
import { Logger } from './../utils/logger';
import { GitHubAuth } from './github-auth';
import type { LLMConnection } from '../types';

const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // Check every 1 hour
const TOKEN_EXPIRY_BUFFER_MS = 60 * 60 * 1000; // Refresh if expiring within 1 hour

interface TokenRefreshCallback {
  (connectionId: string, githubToken: string, copilotToken: string, tokenExpiry: number): Promise<void>;
}

export class GitHubTokenRefreshService {
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();
  private onTokenRefreshed?: TokenRefreshCallback;
  private isShuttingDown = false;

  /**
   * Set callback to be called when a token is refreshed
   */
  setOnTokenRefreshed(callback: TokenRefreshCallback): void {
    this.onTokenRefreshed = callback;
  }

  /**
   * Start monitoring a GitHub Copilot connection for token refresh
   */
  startMonitoring(connection: LLMConnection): void {
    if (connection.type !== 'github-copilot') {
      return;
    }

    // Stop existing monitoring for this connection
    this.stopMonitoring(connection.id);

    Logger.debug(`Starting token refresh monitoring for connection: ${connection.name} (${connection.id})`);

    // Schedule periodic refresh check
    const intervalId = setInterval(async () => {
      if (this.isShuttingDown) {
        return;
      }

      try {
        await this.checkAndRefreshToken(connection);
      } catch (error) {
        Logger.error(`Failed to refresh token for connection ${connection.name}:`, error);
      }
    }, REFRESH_INTERVAL_MS);

    this.refreshIntervals.set(connection.id, intervalId);

    // Also check immediately if token is about to expire
    this.checkAndRefreshToken(connection).catch(error => {
      Logger.error(`Initial token check failed for connection ${connection.name}:`, error);
    });
  }

  /**
   * Stop monitoring a connection
   */
  stopMonitoring(connectionId: string): void {
    const intervalId = this.refreshIntervals.get(connectionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.refreshIntervals.delete(connectionId);
      Logger.debug(`Stopped monitoring connection: ${connectionId}`);
    }
  }

  /**
   * Stop all monitoring
   */
  stopAll(): void {
    Logger.debug(`Stopping all token refresh monitoring...`);
    this.isShuttingDown = true;
    
    for (const [connectionId, intervalId] of this.refreshIntervals.entries()) {
      clearInterval(intervalId);
      Logger.debug(`Stopped monitoring: ${connectionId}`);
    }
    
    this.refreshIntervals.clear();
  }

  /**
   * Check if token needs refresh and refresh if necessary
   */
  private async checkAndRefreshToken(connection: LLMConnection): Promise<void> {
    if (!connection.githubToken) {
      Logger.warn(`No GitHub token found for connection: ${connection.name}`);
      return;
    }

    const now = Date.now();
    const shouldRefresh = !connection.tokenExpiry || 
                         (now >= connection.tokenExpiry - TOKEN_EXPIRY_BUFFER_MS);

    if (shouldRefresh) {
      Logger.debug(`Token will expire within 1 hour for connection: ${connection.name}, refreshing...`);
      await this.refreshCopilotToken(connection);
    } else {
      const timeUntilExpiry = connection.tokenExpiry! - now;
      const hoursUntilExpiry = Math.floor(timeUntilExpiry / 3600000);
      const minutesUntilExpiry = Math.floor((timeUntilExpiry % 3600000) / 60000);
      Logger.debug(`Token for connection ${connection.name} is still valid (expires in ${hoursUntilExpiry}h ${minutesUntilExpiry}m)`);
    }
  }

  /**
   * Refresh the Copilot token using the GitHub token
   */
  private async refreshCopilotToken(connection: LLMConnection): Promise<void> {
    if (!connection.githubToken) {
      throw new Error('GitHub token not found');
    }

    try {
      Logger.debug(`Refreshing Copilot token for connection: ${connection.name}`);
      
      // Get new Copilot token
      const copilotData = await GitHubAuth.getCopilotToken(connection.githubToken);
      
      const newCopilotToken = copilotData.token;
      const newTokenExpiry = copilotData.expires_at * 1000; // Convert to milliseconds
      
      Logger.debug(`Successfully refreshed Copilot token for connection: ${connection.name}`);
      Logger.debug(`New token expires at: ${new Date(newTokenExpiry).toISOString()}`);

      // Call callback to update the connection in database (including tokenExpiry)
      if (this.onTokenRefreshed) {
        Logger.debug(`Calling database update callback with new expiry: ${newTokenExpiry}`);
        await this.onTokenRefreshed(
          connection.id,
          connection.githubToken,
          newCopilotToken,
          newTokenExpiry // ✅ This ensures database gets the new expiry time
        );
        Logger.debug(`Database update callback completed`);
      } else {
        Logger.warn(`⚠️ No callback registered, database will not be updated!`);
      }

      // Update the connection object in memory (for next check)
      Logger.debug(`Updating in-memory connection object`);
      connection.copilotToken = newCopilotToken;
      connection.tokenExpiry = newTokenExpiry;
      Logger.debug(`In-memory connection updated, next check will use new expiry time`);
      
    } catch (error) {
      Logger.error(`Failed to refresh Copilot token for connection ${connection.name}:`, error);
      throw error;
    }
  }

  /**
   * Manually trigger token refresh for a connection
   */
  async manualRefresh(connection: LLMConnection): Promise<void> {
    if (connection.type !== 'github-copilot') {
      throw new Error('Connection is not a GitHub Copilot connection');
    }

    Logger.debug(`Manual token refresh requested for connection: ${connection.name}`);
    await this.refreshCopilotToken(connection);
  }
}
