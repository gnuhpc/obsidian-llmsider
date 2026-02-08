/**
 * Date formatter utility for tools
 * Provides flexible date format conversion to handle various input formats from LLM
 */

export class DateFormatter {
  /**
   * Normalize date string to YYYYMMDD format
   * Supports multiple input formats:
   * - YYYYMMDD (20251117)
   * - YYYY-MM-DD (2025-11-17)
   * - YYYY/MM/DD (2025/11/17)
   * - YYYY.MM.DD (2025.11.17)
   * - YYYY年MM月DD日 (2025年11月17日)
   * 
   * @param dateStr - Input date string in various formats
   * @returns Normalized date string in YYYYMMDD format
   * @throws Error if date format is invalid
   */
  static toYYYYMMDD(dateStr: string): string {
    if (!dateStr) {
      throw new Error('日期不能为空');
    }

    // Remove all whitespace
    dateStr = dateStr.trim();

    // Pattern 1: Already in YYYYMMDD format (8 digits)
    if (/^\d{8}$/.test(dateStr)) {
      return dateStr;
    }

    // Pattern 2: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const separatorMatch = dateStr.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);
    if (separatorMatch) {
      const [, year, month, day] = separatorMatch;
      return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
    }

    // Pattern 3: Partial formats like YYYY-MM or YYYYMM (default to 01 for day)
    const partialMatch = dateStr.match(/^(\d{4})[-/年]?(\d{1,2})月?$/);
    if (partialMatch) {
      const [, year, month] = partialMatch;
      return `${year}${month.padStart(2, '0')}01`;
    }

    throw new Error(`不支持的日期格式: ${dateStr}。支持的格式: YYYYMMDD, YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYY年MM月DD日`);
  }

  /**
   * Convert date string to YYYY-MM-DD format
   * 
   * @param dateStr - Input date string in various formats
   * @returns Date string in YYYY-MM-DD format
   * @throws Error if date format is invalid
   */
  static toYYYYDashMMDashDD(dateStr: string): string {
    const yyyymmdd = this.toYYYYMMDD(dateStr);
    return `${yyyymmdd.substring(0, 4)}-${yyyymmdd.substring(4, 6)}-${yyyymmdd.substring(6, 8)}`;
  }

  /**
   * Validate if date string is valid
   * 
   * @param dateStr - Input date string
   * @returns true if valid, false otherwise
   */
  static isValid(dateStr: string): boolean {
    try {
      const yyyymmdd = this.toYYYYMMDD(dateStr);
      const year = parseInt(yyyymmdd.substring(0, 4));
      const month = parseInt(yyyymmdd.substring(4, 6));
      const day = parseInt(yyyymmdd.substring(6, 8));

      // Basic validation
      if (year < 1900 || year > 2100) return false;
      if (month < 1 || month > 12) return false;
      if (day < 1 || day > 31) return false;

      // Create Date object to validate
      const date = new Date(year, month - 1, day);
      return date.getFullYear() === year && 
             date.getMonth() === month - 1 && 
             date.getDate() === day;
    } catch {
      return false;
    }
  }

  /**
   * Get current date in YYYYMMDD format
   * 
   * @returns Current date string in YYYYMMDD format
   */
  static getCurrentYYYYMMDD(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Get current date in YYYY-MM-DD format
   * 
   * @returns Current date string in YYYY-MM-DD format
   */
  static getCurrentYYYYDashMMDashDD(): string {
    const yyyymmdd = this.getCurrentYYYYMMDD();
    return this.toYYYYDashMMDashDD(yyyymmdd);
  }

  /**
   * Format date for display (YYYY-MM-DD)
   * 
   * @param dateStr - Input date string in various formats
   * @returns Formatted date string for display
   */
  static formatForDisplay(dateStr: string): string {
    try {
      return this.toYYYYDashMMDashDD(dateStr);
    } catch {
      return dateStr; // Return original if conversion fails
    }
  }
}
