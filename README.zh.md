[English](./README.en.md) | 简体中文

# Wolfcha (猹杀)

> 一款 AI 狼人杀游戏 — 和 AI 模型一起玩狼人杀

## 🔀 关于本 Fork

本项目 fork 自 [oil-oil/wolfcha](https://github.com/oil-oil/wolfcha)，原作诞生于「观猹 + 魔搭 环球黑客松」。感谢原团队开源！原版在线体验：[wolf-cha.com](https://wolf-cha.com)。

## 📝 主要改动

相比原版，本 fork 的改动主要包括：

- **部署方式**：面向 NAS / 家庭服务器，以 Docker 自托管为主要使用场景
- **AI 提供商**：扩展支持更多 AI 接口，包括 OpenAI、Google Gemini、Anthropic 以及任意 OpenAI 兼容接口（如[硅基流动](https://cloud.siliconflow.cn/i/5SOAHcPz)、Ollama 等）
- **AI 推理优化**：
  - 告知 AI 角色常用游戏技巧（如狼人悍跳、警徽流验人等）
  - 优化了喂给 AI 的上下文信息结构
  - 修复了原提示词中的部分逻辑矛盾
  - 允许狼人空刀和守卫空守
- **UI 优化**：
  - 增加了模型选择设置
  - 增加了游戏角色配置和场景说明
  - 允许狼人空刀和守卫空守
- **游戏规则文档**：新增 [游戏指南](guide.zh.md)

## 🚀 Docker 快速部署

### 前置要求

至少需要配置以下**任意一个** AI 提供商的 API Key 才能正常运行。

### 方式一：docker run

```bash
docker run -d \
  -p 7860:7860 \
  -e OPENAI_COMPATIBLE_BASE_URL=https://api.siliconflow.cn/v1 \
  -e OPENAI_COMPATIBLE_API_KEY=your-api-key \
  --restart unless-stopped \
  programus/wolfcha-ex:latest
```

启动后访问 [http://localhost:7860](http://localhost:7860)。

### 方式二：docker-compose

```yaml
# docker-compose.yml
services:
  wolfcha:
    image: programus/wolfcha-ex:latest
    ports:
      - "7860:7860"
    env_file:
      - .env.docker
    restart: unless-stopped
```

创建 `.env.docker` 文件并填入所需环境变量（参见下方完整表格）。

## ⚙️ 环境变量

| 变量名 | 说明 | 默认值 |
|---|---|---|
| `SITE_PASSWORD` | 站点访问密码（留空则不设密码） | 空（无密码） |
| `OPENAI_API_KEY` | OpenAI API Key | — |
| `OPENAI_BASE_URL` | OpenAI 接口地址 | `https://api.openai.com/v1` |
| `GOOGLE_API_KEY` | Google Gemini API Key | — |
| `GOOGLE_BASE_URL` | Google 接口地址 | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API Key | — |
| `ANTHROPIC_BASE_URL` | Anthropic 接口地址 | `https://api.anthropic.com/v1` |
| `OPENAI_COMPATIBLE_BASE_URL` | 任意 OpenAI 兼容服务的接口地址 | — |
| `OPENAI_COMPATIBLE_API_KEY` | 兼容服务的 API Key | — |
| `OPENAI_COMPATIBLE_MODELS` | 模型 ID 列表，逗号分隔；留空则自动从 `/models` 拉取 | 自动获取 |
| `ZENMUX_API_KEY` | ZenMux 聚合 API Key | — |
| `DASHSCOPE_API_KEY` | 阿里云百炼 API Key | — |
| `NEXT_PUBLIC_SHOW_DEVTOOLS` | 非生产环境是否显示开发工具 | `"true"` |

### 关于 AI 提供商的说明

**`OPENAI_COMPATIBLE_*`** 是最灵活的选项，支持任何兼容 OpenAI 接口的服务：[硅基流动](https://cloud.siliconflow.cn/i/5SOAHcPz)、本地 Ollama、LM Studio 等。`OPENAI_COMPATIBLE_MODELS` 可留空（自动拉取），也可手动填写，格式：`model-a,model-b`。

**`SITE_PASSWORD`** 留空则不启用访问密码，适合家庭局域网部署。

### 已验证的模型

以下模型经实际测试可用：

| 提供商 | 模型 |
|---|---|
| OpenAI | GPT-5.1 |
| Google | Gemini 2.5 Flash |
| OpenAI Compatible | [硅基流动（SiliconFlow）](https://cloud.siliconflow.cn/i/5SOAHcPz)各模型 |

其他提供商和模型理论上兼容，但未经充分测试。

## 📄 License

MIT