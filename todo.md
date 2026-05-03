# TODO / Known Issues

## Bugs

- [ ] `handlebars` 的 `require.extensions` 警告在 webpack 编译时出现（3个警告），不影响功能但影响编译输出美观。可考虑在 webpack.config.js 中添加 `IgnorePlugin` 或切换模板引擎
- [ ] `msvcDetector.ts` 中 `findSolutionDir()` 使用同步 `fs.readdirSync()`，在大目录下可能阻塞扩展主线程
- [ ] `MsBuildBuild.hasProjectReferences()` 使用同步 `fs.readFileSync()` 读取整个项目文件检查是否包含 `<ProjectReference`，应改为异步或在项目预加载时缓存
- [ ] `SolutionFinder.persistState()` 同时写入 workspaceState 和 globalState，如果只在单个 workspace 使用某些 solution，globalState 中会残留无用数据
- [ ] `buildRunner.decodeOutput()` 中 `require("iconv-lite")` 是运行时动态引入，在 webpack 打包后可能有路径问题（目前因为已打包所以工作正常）

## 功能不完整

- [ ] **单元测试缺失**：项目没有任何自动化测试，建议添加 mocha/jest 测试覆盖核心解析逻辑
- [ ] **CMake 项目不支持**：目前只支持 `.vcxproj`（MSBuild），不支持 CMakeLists.txt 项目
- [ ] **多平台支持不足**：MSBuild 检测和 `taskkill` 命令仅适用于 Windows，Linux/macOS 用户无法使用 C++ build/run/debug 功能
- [ ] **配置切换无 UI**：切换 Configuration/Platform 只有输入框，缺少从项目文件中枚举可用配置的下拉选择
- [ ] **Build 错误无解析**：MSBuild 输出没有被解析为 VS Code 的 DiagnosticCollection（Problems 面板中无显示）
- [ ] **项目依赖关系未处理**：Build 时不会自动构建依赖项目（除非通过 sln 构建）
- [ ] **热重载/增量编译**：缺少 MSBuild 增量编译的支持，每次都是完整构建
- [ ] **slnx 文件只读**：`.slnx` 格式的 solution 文件目前只能读取，不能修改
- [ ] **NuGet 源配置**：NuGet 搜索只使用默认 nuget.org 源，不支持私有 NuGet 源

## 可改进项

- [ ] **性能**：`getConfigurationType()` 在每次树刷新时都重新解析 vcxproj XML，应该缓存结果
- [ ] **错误处理**：多处 `catch { /* ignore */ }` 静默吞掉异常，调试时不易排查问题
- [ ] **类型安全**：部分 XML 解析代码使用 `any` 类型，缺少类型定义
- [ ] **配置迁移**：当用户升级插件版本时，配置格式变化没有迁移逻辑
- [ ] **日志级别控制**：logger 模块没有级别过滤，所有日志都写入 output channel
- [ ] **源码目录绑定的 UI 提示**：激活 solution 时自动切换源码目录，但没有给用户确认的机会（直接切换）
- [ ] **F# 项目文件排序**：F# 项目的文件顺序很重要，但拖放操作可能破坏顺序
- [ ] **Solution Filter (.slnf) 不支持**：Visual Studio 支持的 `.slnf` solution filter 文件未实现
- [ ] **CHANGELOG.md 缺失**：marketplace 上应该有版本更新日志

## 代码质量

- [ ] `SolutionExplorerCommands.ts` 文件过长（325行），所有命令注册集中在构造函数中，可拆分为多个注册器
- [ ] `msvcDetector.ts` 文件过长（560+行），混合了 MSVC 检测、项目配置解析、输出路径计算等不同职责
- [ ] `package.json` 中 `menus` 配置包含大量重复的 `when` 条件，维护困难
- [ ] 多处硬编码路径分隔符（`\\`），虽然目标平台是 Windows 但不利于跨平台
