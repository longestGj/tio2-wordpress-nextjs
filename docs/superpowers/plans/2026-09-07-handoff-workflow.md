# D16 交接与开发流程 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 将用户已同意的 Poland 复盘改进落实为实例、可复用任务记录和现有流程补充。

**Architecture:** 沿用现有开发交付流程和网站登记。任务记录引用批准入口和历史回执，不复制策划批准、不迁移证据；Poland 实例提供事实和可复用步骤的区分。

**Tech Stack:** Markdown；本地文件引用与差异核对。

**Spec:** 本会话用户批准的“用 Poland 整理接单—开发—自检—交回—接收实例，再补入现有流程”方案；当前 docs/development-workflow.md 为承接基础。

## Global Constraints

- 仅文档和规则；保留页面代码、53 文件交付快照及历史证据。
- 不修改 D23 文件，不新增项目专用 Agent/Skill，不启动网站测试、服务、部署或发送消息。
- 不追加审批表；已有批准和授权复用；外部缺口只阻止依赖步骤。
- 运行脚本自动化留待后续单独实现，本轮不声称已完成。

## Task 1: 交接实例与流程入口

Files: 新增 docs/templates/development-task-record.md、docs/examples/poland-development-handoff.md；更新 docs/development-workflow.md、AGENTS.md、README.md、docs/site-registry.md。

- [x] 核对当前流程和 Poland 最终接收记录，确认开放项及当前 D23 工作流入口。
- [x] 编写一个任务记录模板，覆盖接单、影响面、验收与证据、送达、验收和剩余负责人。
- [x] 编写 Poland 实例，引用实际版本、四轮处理及最后接收，不虚构早期检查已完成。
- [x] 补充现有流程的六步执行、证据自检、交接确认和停止返修要求，并连接入口。
- [x] 检查新增/修改文档的本地链接、差异和约束一致性；只读复核后交付，不运行网站测试。

## 验证记录

2026-09-07：7份本轮文档的32处本地链接全部可解析；Poland已接收53文件快照重新计算无差异。现有tracked文档git diff --check无错误。纯文档范围，未运行网站测试/构建、未启动服务、未修改D23或发送消息。

独立只读文档审查完成：未发现实质问题；确认没有新增重复审批、强制三表或越权操作，Poland状态与D23最终接收一致。
