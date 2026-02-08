# DateFormatter Utility

## 概述

`DateFormatter` 是一个通用的日期格式化工具类，用于处理工具中的日期参数。它提供了灵活的日期格式转换功能，能够接受多种日期格式输入，提高了对 LLM 输出的容错性。

## 支持的日期格式

DateFormatter 支持以下输入格式：

1. **YYYYMMDD** - 8位数字格式 (例如: `20251117`)
2. **YYYY-MM-DD** - 短横线分隔 (例如: `2025-11-17`)
3. **YYYY/MM/DD** - 斜杠分隔 (例如: `2025/11/17`)
4. **YYYY.MM.DD** - 点分隔 (例如: `2025.11.17`)
5. **YYYY年MM月DD日** - 中文格式 (例如: `2025年11月17日`)
6. **YYYY-MM** 或 **YYYYMM** - 年月格式（默认补01作为日期）

## 主要方法

### `toYYYYMMDD(dateStr: string): string`
将任意支持的日期格式转换为 YYYYMMDD 格式。

```typescript
DateFormatter.toYYYYMMDD('2025-11-17')  // 返回: '20251117'
DateFormatter.toYYYYMMDD('2025/11/17')  // 返回: '20251117'
DateFormatter.toYYYYMMDD('2025年11月17日')  // 返回: '20251117'
DateFormatter.toYYYYMMDD('20251117')  // 返回: '20251117'
```

### `toYYYYDashMMDashDD(dateStr: string): string`
将任意支持的日期格式转换为 YYYY-MM-DD 格式。

```typescript
DateFormatter.toYYYYDashMMDashDD('20251117')  // 返回: '2025-11-17'
DateFormatter.toYYYYDashMMDashDD('2025/11/17')  // 返回: '2025-11-17'
```

### `getCurrentYYYYMMDD(): string`
获取当前日期的 YYYYMMDD 格式。

```typescript
DateFormatter.getCurrentYYYYMMDD()  // 返回: '20251118' (假设今天是2025-11-18)
```

### `getCurrentYYYYDashMMDashDD(): string`
获取当前日期的 YYYY-MM-DD 格式。

```typescript
DateFormatter.getCurrentYYYYDashMMDashDD()  // 返回: '2025-11-18'
```

### `isValid(dateStr: string): boolean`
验证日期字符串是否有效。

```typescript
DateFormatter.isValid('2025-11-17')  // 返回: true
DateFormatter.isValid('2025-13-01')  // 返回: false (月份无效)
DateFormatter.isValid('invalid')     // 返回: false
```

### `formatForDisplay(dateStr: string): string`
格式化日期用于显示（YYYY-MM-DD），如果转换失败则返回原字符串。

```typescript
DateFormatter.formatForDisplay('20251117')  // 返回: '2025-11-17'
DateFormatter.formatForDisplay('invalid')   // 返回: 'invalid'
```

## 在工具中使用

### 示例 1: 单个日期参数

```typescript
import { DateFormatter } from './utils/date-formatter';

export const getDataTool: BuiltInTool = {
  name: 'get_data',
  description: '获取指定日期的数据',
  inputSchema: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: '日期，支持多种格式: YYYYMMDD(20251117)、YYYY-MM-DD(2025-11-17)、YYYY/MM/DD、YYYY年MM月DD日等。不提供则使用当前日期。'
      }
    },
    required: []
  },
  execute: async (args: { date?: string }) => {
    try {
      // 转换日期格式
      const dateStr = args.date 
        ? DateFormatter.toYYYYMMDD(args.date)
        : DateFormatter.getCurrentYYYYMMDD();
      
      // 使用转换后的日期
      const url = `https://api.example.com/data?date=${dateStr}`;
      // ... 后续逻辑
    } catch (error) {
      // 日期格式错误会被 DateFormatter 抛出
      throw new Error(`获取数据失败: ${error.message}`);
    }
  }
};
```

### 示例 2: 日期范围参数

```typescript
export const getRangeDataTool: BuiltInTool = {
  name: 'get_range_data',
  description: '获取日期范围内的数据',
  inputSchema: {
    type: 'object',
    properties: {
      start_date: {
        type: 'string',
        description: '开始日期，支持多种格式'
      },
      end_date: {
        type: 'string',
        description: '结束日期，支持多种格式'
      }
    },
    required: ['start_date', 'end_date']
  },
  execute: async (args: { start_date: string; end_date: string }) => {
    try {
      const startDate = DateFormatter.toYYYYMMDD(args.start_date);
      const endDate = DateFormatter.toYYYYMMDD(args.end_date);
      
      // ... 使用转换后的日期
    } catch (error) {
      throw new Error(`日期格式错误: ${error.message}`);
    }
  }
};
```

## 已更新的工具文件

以下工具文件已经更新使用 DateFormatter：

1. ✅ `stock-news-sentiment-tools.ts` - getCCTVNewsTool
2. ✅ `stock-special-tools.ts` - getDragonTigerListTool, getBlockTradeTool
3. ✅ `margin-tools.ts` - getMarginTradingDetailTool

## 待更新的工具文件

以下文件包含日期参数，建议更新使用 DateFormatter：

- `futures-roll-yield-tools.ts` - 多个工具使用 trade_date
- `stock-fundamental-tools.ts` - 多个工具使用 start_date, end_date
- `fund-advanced-tools.ts` - 使用 date 参数
- `stock-ipo-tools.ts` - 使用 date 参数
- `futures-detail-tools.ts` - 使用 date 参数
- `futures-advanced-tools.ts` - 多个工具使用 date, start_date, end_date
- `fund-tools.ts` - 使用 start_date, end_date, report_date
- `commodity-futures-tools.ts` - 使用 date 参数
- `fund-alternative-data-tools.ts` - 使用 date, start_date, end_date
- `international-market-tools.ts` - 使用 start_date, end_date
- `fund-detail-tools.ts` - 使用 start_date, end_date, report_date
- `stock-hk-us-history-tools.ts` - 使用 start_date, end_date
- `derivatives-tools.ts` - 使用 date 参数
- `stock-advanced-analysis-tools.ts` - 使用 start_date, end_date

## 更新步骤

要更新一个工具文件使用 DateFormatter：

1. **导入 DateFormatter**
   ```typescript
   import { DateFormatter } from './utils/date-formatter';
   ```

2. **更新 description**
   ```typescript
   description: '日期，支持多种格式: YYYYMMDD(20251117)、YYYY-MM-DD(2025-11-17)、YYYY/MM/DD、YYYY年MM月DD日等。'
   ```

3. **更新 execute 函数中的日期处理**
   ```typescript
   // 之前:
   const date = args.date || new Date().toISOString().split('T')[0];
   const dateParam = date.replace(/-/g, '');
   
   // 之后:
   const dateParam = args.date 
     ? DateFormatter.toYYYYMMDD(args.date)
     : DateFormatter.getCurrentYYYYMMDD();
   ```

## 好处

1. **更好的容错性** - 自动处理多种日期格式，减少因格式问题导致的错误
2. **一致性** - 所有工具使用统一的日期处理逻辑
3. **可维护性** - 日期处理逻辑集中在一处，便于维护和更新
4. **更友好的用户体验** - LLM 可以使用更自然的日期格式，不必严格遵循特定格式

## 注意事项

- DateFormatter 会在日期格式无效时抛出 Error，调用方需要适当处理
- 部分月份格式（如 YYYY-MM）会自动补充 01 作为日期
- 所有日期验证都会检查是否为有效日期（如2月30日会被认为无效）
