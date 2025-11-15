# CSS 重构说明

## 概述

本次重构将原本单一的 `styles.css` (17255行) 拆分为多个模块化的CSS文件,以提高可维护性和开发效率。

## 目录结构

```
obsidian-llmsider/
├── styles/                    # CSS模块化文件目录
│   ├── index.css             # 主入口文件(导入所有模块)
│   ├── base.css              # 基础变量、动画、通用样式
│   ├── layout.css            # 布局和容器样式
│   ├── messages.css          # 消息区域和消息组件
│   ├── input.css             # 输入容器和控件
│   ├── diff.css              # Diff可视化样式
│   ├── prompt-selector.css   # 提示选择器样式
│   ├── plan-execute.css      # Plan-Execute框架样式
│   ├── accessibility.css     # 可访问性和焦点样式
│   └── responsive.css        # 响应式设计和媒体查询
├── styles.css                # 编译后的单一CSS文件(生产环境使用)
├── postcss.config.js         # PostCSS配置文件
└── scripts/
    ├── build-css.js          # CSS构建脚本
    └── split-css.js          # CSS拆分脚本(用于初始拆分)
```

## 构建流程

### 开发模式
在开发模式下,直接使用现有的 `styles.css` 文件:
```bash
npm run dev
```

### 生产模式
在生产模式下,会自动:
1. 从 `styles/` 目录读取所有模块化CSS文件
2. 使用 PostCSS 处理 `@import` 语句
3. 压缩和优化CSS代码
4. 生成单一的 `styles.css` 文件

```bash
npm run build        # 完整构建(包括CSS和TypeScript)
npm run build:css    # 仅构建CSS
```

## 工具链

- **postcss**: CSS转换工具
- **postcss-import**: 处理 `@import` 语句
- **postcss-csso**: CSS压缩和优化

## 模块说明

| 模块文件 | 说明 | 主要内容 |
|---------|------|---------|
| `base.css` | 基础样式 | CSS变量、动画、通用工具类、图标样式 |
| `layout.css` | 布局样式 | 主容器、头部、标签页、模态框 |
| `messages.css` | 消息样式 | 消息展示、流式输出、用户/助手消息 |
| `input.css` | 输入样式 | 输入框、按钮、文件引用、建议 |
| `diff.css` | Diff样式 | 行内diff、统一diff、JSDiff显示 |
| `prompt-selector.css` | 提示选择器 | 提示列表、选择交互 |
| `plan-execute.css` | 计划执行 | 任务追踪、进度显示、工具执行 |
| `accessibility.css` | 可访问性 | 焦点样式、高对比度支持 |
| `responsive.css` | 响应式 | 移动端、平板、桌面适配 |

## 自定义和扩展

### 添加新的CSS模块

1. 在 `styles/` 目录创建新的CSS文件
2. 在 `styles/index.css` 中添加 `@import` 语句:
   ```css
   @import './your-new-module.css';
   ```
3. 运行构建命令测试:
   ```bash
   npm run build:css
   ```

### 修改现有模块

直接编辑 `styles/` 目录下的对应模块文件,然后运行构建命令。

## 注意事项

1. **开发环境**: 默认使用原始的 `styles.css`,无需重新构建CSS
2. **生产构建**: 必须先运行 `npm run build:css` 或 `npm run build` 来生成最终的 `styles.css`
3. **Obsidian兼容性**: 最终生成的 `styles.css` 是单一文件,完全兼容Obsidian插件系统
4. **源文件**: 保留原始的大文件 `styles.css` 作为备份和参考

## 优势

1. **可维护性**: 模块化结构使代码组织更清晰,易于查找和修改
2. **协作友好**: 多人可以同时编辑不同的CSS模块,减少冲突
3. **按需加载**: 在开发时可以只关注需要的模块
4. **构建优化**: 生产环境自动压缩和优化CSS
5. **向后兼容**: 生成的单一文件与Obsidian原生支持方式完全一致

## 未来改进

- [ ] 添加CSS Lint检查
- [ ] 实现CSS样式使用情况分析,自动删除未使用的样式
- [ ] 支持CSS变量主题系统
- [ ] 添加CSS自动前缀处理
- [ ] 实现CSS源映射(Source Maps)用于调试

## 回滚方案

如果需要回滚到单文件模式:
1. 保留原始的 `styles.css` 文件
2. 从 `package.json` 中移除 `build:css` 相关命令
3. 在 `build` 脚本中移除 `npm run build:css &&` 前缀

## 相关文件

- `postcss.config.js` - PostCSS配置
- `scripts/build-css.js` - CSS构建脚本
- `package.json` - 包含CSS构建命令
