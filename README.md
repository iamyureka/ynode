<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="media/logo_white_orange.svg">
    <img src="media/logo_black.svg" width="48" alt="ynode logo" style="vertical-align: middle;">
  </picture>
  <span style="font-size: 36px; vertical-align: middle; margin-left: 8px;">y<span style="color: #E5A01F">node</span></span>
</p>

<div align="center"><b>———&nbsp;&nbsp;&nbsp;open-source visual workflow automation&nbsp;&nbsp;&nbsp;———</b></div>
<br />

<div align='center'>
  <a href="CONTRIBUTING.md" target="_blank">
    <img src="https://img.shields.io/badge/contributing-mediumslateblue?style=for-the-badge&logo=github&logoColor=white" alt="contributing" style="margin-bottom: 5px;"/>
  </a>
</div>

<div align='center'>
  <img src="https://img.shields.io/badge/License-AGPL--3.0-orange?style=for-the-badge" alt="license" style="margin-bottom: 5px;"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript" style="margin-bottom: 5px;"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="react" style="margin-bottom: 5px;"/>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="node" style="margin-bottom: 5px;"/>
</div>
<br/>

> [!NOTE]
> ynode is **actively developed**. We welcome contributions, feedback, and feature requests!

## <img height="18" src="https://octicons-col.vercel.app/sparkle/E5A01F">&nbsp;&nbsp;Key Features

- <img height="15" src="https://octicons-col.vercel.app/paintbrush/E5A01F"> **Visual Builder**: Intuitive node-based editor powered by React Flow.
- <img height="15" src="https://octicons-col.vercel.app/plug/E5A01F"> **Extensible**: Add custom nodes easily via CLI scaffolding.
- <img height="15" src="https://octicons-col.vercel.app/shield-lock/E5A01F"> **Secure**: Built-in encryption for credentials + you own your data.
- <img height="15" src="https://octicons-col.vercel.app/home/E5A01F"> **Self-Hosted**: Deploy within your infrastructure with full autonomy.
- <img height="15" src="https://octicons-col.vercel.app/package/E5A01F"> **Monorepo**: Clean architecture using pnpm workspaces.
<br />
<div align="center"><b>———&nbsp;&nbsp;&nbsp;y<span style="color: #E5A01F">node</span> is designed to be the automation backbone for everyone!&nbsp;&nbsp;&nbsp;———</b></div>

## <img height="18" src="https://octicons-col.vercel.app/device-desktop/E5A01F">&nbsp;&nbsp;Demo

<div align='center'>
  <img alt="ynode demo" style="border-radius: 30px; border: 2px solid #E5A01F;" src="media/ynode.gif" width="100%"></img>
</div>

## <img height="18" src="https://octicons-col.vercel.app/package-dependencies/E5A01F">&nbsp;&nbsp;Project Structure

```
ynode/
│
├── 📦 packages/
│   ├── @ynode/core        # Shared types, node definitions, & serialization
│   └── ynode-cli          # Development tools (scaffolding & validation)
│
├── 🎨 ynode-app           # Frontend (React + Vite + React Flow)
└── ⚡ ynode-server        # Backend (Express + SQLite + WebSocket)
```


## <img height="18" src="https://octicons-col.vercel.app/rocket/E5A01F">&nbsp;&nbsp;Quick Start

#### PREREQUISITES

##### <img height="14" src="https://octicons-col.vercel.app/download/E5A01F">&nbsp;&nbsp;Requirements

- [Node.js](https://nodejs.org/) 18 or higher
- [pnpm](https://pnpm.io/) package manager

##

#### INSTALLATION

##### <img height="14" src="https://octicons-col.vercel.app/repo-clone/E5A01F">&nbsp;&nbsp;1. Clone the Repository

```bash
git clone https://github.com/iamyureka/ynode.git
cd ynode
```

##### <img height="14" src="https://octicons-col.vercel.app/package/E5A01F">&nbsp;&nbsp;2. Install Dependencies

```bash
pnpm install
```

##### <img height="14" src="https://octicons-col.vercel.app/tools/E5A01F">&nbsp;&nbsp;3. Build Core Library

```bash
pnpm --filter @ynode/core build
```

##

#### DEVELOPMENT

##### <img height="14" src="https://octicons-col.vercel.app/server/E5A01F">&nbsp;&nbsp;Start Backend

```bash
pnpm --filter ynode-server dev
```

##### <img height="14" src="https://octicons-col.vercel.app/browser/E5A01F">&nbsp;&nbsp;Start Frontend

```bash
pnpm --filter ynode-app dev
```

| Service | URL                   |
| ------- | --------------------- |
| **App** | http://localhost:5173 |
| **API** | http://localhost:3001 |

## <img height="18" src="https://octicons-col.vercel.app/pivot-column/E5A01F">&nbsp;&nbsp;Canvas Controls

| Action                                                                                         | Shortcut                    |
| ---------------------------------------------------------------------------------------------- | --------------------------- |
| <img height="12" src="https://octicons-col.vercel.app/multi-select/E5A01F"> Multi-select nodes | `Left Drag` (selection box) |
| <img height="12" src="https://octicons-col.vercel.app/move-to-start/E5A01F"> Pan canvas        | `Right Drag`                |
| <img height="12" src="https://octicons-col.vercel.app/diff-added/E5A01F"> Toggle selection     | `Ctrl + Click`              |
| <img height="12" src="https://octicons-col.vercel.app/comment/E5A01F"> Create comment          | `C`                         |
| <img height="12" src="https://octicons-col.vercel.app/trash/E5A01F"> Delete nodes              | `Delete` / `Backspace`      |
| <img height="12" src="https://octicons-col.vercel.app/copy/E5A01F"> Copy / Paste / Duplicate   | `Ctrl + C` / `V` / `D`      |

## <img height="18" src="https://octicons-col.vercel.app/plug/E5A01F">&nbsp;&nbsp;Custom Nodes

Create custom nodes using the CLI for seamless integration with your workflows.

```bash
# Scaffold a new node
pnpm --filter ynode-cli create my-custom-node
```

> [!TIP]
>
> For detailed instructions, see the [CLI Documentation](packages/ynode-cli/README.md).

## <img height="18" src="https://octicons-col.vercel.app/book/E5A01F">&nbsp;&nbsp;Documentation

| Package                                      | Description                                     |
| -------------------------------------------- | ----------------------------------------------- |
| [@ynode/core](packages/ynode-core/README.md) | Shared types, node definitions, & serialization |
| [ynode-cli](packages/ynode-cli/README.md)    | CLI tools for scaffolding custom nodes          |

## <img height="18" src="https://octicons-col.vercel.app/people/E5A01F">&nbsp;&nbsp;Contributing

Interested in contributing to ynode?<br> Check out our [Contributing Guide](CONTRIBUTING.md) for instructions on getting started

## <img height="18" src="https://octicons-col.vercel.app/heart/E5A01F">&nbsp;&nbsp;Support

If ynode helps your workflow, consider supporting its development:

<a href="https://paypal.me/bangmey" target="_blank">
  <img src="https://img.shields.io/badge/PayPal-Support_Development-00457C?style=for-the-badge&logo=paypal&logoColor=white" alt="PayPal"/>
</a>

## <img height="18" src="https://octicons-col.vercel.app/law/E5A01F">&nbsp;&nbsp;License

This project is licensed under the [AGPL-3.0 License](LICENSE).

---