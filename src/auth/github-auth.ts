/**
 * GitHub Device Flow Authentication for Copilot
 * Based on https://github.com/aaamoon/copilot-api
 */

import { requestUrl } from 'obsidian';

const GITHUB_BASE_URL = 'https://github.com';
const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98';
const GITHUB_APP_SCOPES = 'read:user';

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface CopilotTokenResponse {
  token: string;
  expires_at: number;
  refresh_in: number;
}

export class GitHubAuth {
  /**
   * Step 1: Get device code for user authentication
   */
  static async getDeviceCode(): Promise<DeviceCodeResponse> {
    const response = await requestUrl({
      url: `${GITHUB_BASE_URL}/login/device/code`,
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Editor-Version': 'vscode/1.95.0',
        'Editor-Plugin-Version': 'copilot-chat/0.22.4',
        'User-Agent': 'GitHubCopilotChat/0.22.4'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        scope: GITHUB_APP_SCOPES
      })
    });

    if (response.status !== 200) {
      throw new Error(`Failed to get device code: ${response.status}`);
    }

    return response.json;
  }

  /**
   * Step 2: Poll for access token after user authorizes
   */
  static async pollAccessToken(deviceCode: DeviceCodeResponse): Promise<string> {
    const sleepDuration = (deviceCode.interval + 1) * 1000;
    const expiresAt = Date.now() + deviceCode.expires_in * 1000;

    while (Date.now() < expiresAt) {
      await this.sleep(sleepDuration);

      try {
        const response = await requestUrl({
          url: `${GITHUB_BASE_URL}/login/oauth/access_token`,
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Editor-Version': 'vscode/1.95.0',
            'Editor-Plugin-Version': 'copilot-chat/0.22.4',
            'User-Agent': 'GitHubCopilotChat/0.22.4'
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            device_code: deviceCode.device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          })
        });

        if (response.status !== 200) {
          continue;
        }

        const json = response.json;
        if (json.access_token) {
          return json.access_token;
        }

        // Check for errors
        if (json.error === 'authorization_pending') {
          continue;
        } else if (json.error === 'slow_down') {
          // Increase interval
          await this.sleep(5000);
          continue;
        } else if (json.error) {
          throw new Error(`Authorization failed: ${json.error}`);
        }
      } catch (error) {
        // Continue polling on network errors
        if (error instanceof Error && error.message.includes('Authorization failed')) {
          throw error;
        }
        continue;
      }
    }

    throw new Error('Device code expired');
  }

  /**
   * Step 3: Get Copilot token from GitHub access token
   */
  static async getCopilotToken(githubToken: string): Promise<CopilotTokenResponse> {
    const response = await requestUrl({
      url: `${GITHUB_API_URL}/copilot_internal/v2/token`,
      method: 'GET',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/json',
        'Editor-Version': 'vscode/1.95.0',
        'Editor-Plugin-Version': 'copilot-chat/0.22.4',
        'User-Agent': 'GitHubCopilotChat/0.22.4'
      }
    });

    if (response.status !== 200) {
      const errorText = response.text || JSON.stringify(response.json);
      throw new Error(`Failed to get Copilot token: ${response.status} - ${errorText}`);
    }

    return response.json;
  }

  /**
   * Get GitHub user info
   */
  static async getGitHubUser(githubToken: string): Promise<{ login: string; name: string }> {
    const response = await requestUrl({
      url: `${GITHUB_API_URL}/user`,
      method: 'GET',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/json',
        'User-Agent': 'GitHubCopilotChat/0.22.4'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Failed to get user info: ${response.status}`);
    }

    return response.json;
  }

  /**
   * Get available Copilot models
   */
  static async getModels(copilotToken: string): Promise<Array<{id: string; name: string; vendor: string}>> {
    const response = await requestUrl({
      url: 'https://api.githubcopilot.com/models',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${copilotToken}`,
        'Accept': 'application/json',
        'Editor-Version': 'vscode/1.95.0',
        'Editor-Plugin-Version': 'copilot-chat/0.22.4',
        'User-Agent': 'GitHubCopilotChat/0.22.4'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Failed to get models: ${response.status}`);
    }

    const data = response.json;
    return data.data || [];
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
