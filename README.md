# Pterodactyl Plugin Updater (PPU)

![PPU Logo](frontend/public/logo.png)

**Pterodactyl Plugin Updater (PPU)** is a powerful, automated tool designed to manage Minecraft plugins across your Pterodactyl servers. It simplifies the process of keeping plugins up-to-date, managing versions, and ensuring server stability.

> **Open Source Project** 🚀

---

## 🔥 Features

-   **Automatic Updates:** Scans your servers for outdated plugins and updates them automatically (requires setting up a Schedule in servers you want inside PPU) or with a single click.
-   **Direct File Access:** Reads and writes plugin files directly on disk — no API rate limits, instant operations.
-   **Version Control:** Keeps track of current and latest versions. Supports rollbacks (stored locally, keeps last 3 versions).
-   **Marketplace Integration:** Supports installing plugins from SpigotMC and Modrinth. Supports direct URL linking and platform-specific filtering (Paper, Velocity, BungeeCord, etc.).
-   **Web Interface:** A sleek, modern dashboard to view update progress, server health, and manage plugins visually.
-   **Dockerized:** Easy deployment using Docker and Docker Compose.

---

## 🛠️ Installation

The easiest way to run PPU is using Docker Compose. **PPU must be deployed on the same machine as Pterodactyl Wings** for the recommended setup.

### Prerequisites
-   Docker Engine
-   Docker Compose
-   Pterodactyl Wings running on the same machine

### Quick Start

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Kezzyy/ppu.git
    cd ppu
    ```

2.  **Configure Environment:**
    Copy the example configuration file and edit it with your Pterodactyl details.
    ```bash
    cp backend/.env.example backend/.env
    nano backend/.env
    ```
    > **CRITICAL:** You must fill in `PTERODACTYL_URL` and `PTERODACTYL_API_KEY` (Application API Key) for the tool to work.

3.  **Start the Application:**
    ```bash
    docker compose up -d
    ```

4.  **Access the Dashboard:**
    Open your browser and navigate to `http://YOUR_SERVER_IP:3008` (or the domain you configured).

---

## 📂 Deployment Modes

PPU supports two file access modes, configured via `FILE_ACCESS_MODE` in your `.env`:

### Direct Mode (Recommended) ⚡
```env
FILE_ACCESS_MODE=direct
VOLUMES_PATH=/var/pterodactyl/volumes
```
PPU accesses server plugin files **directly on disk** via the mounted volumes directory. This is the recommended setup — no API rate limits, instant file operations, and supports bulk updates without throttling.

**Requirement:** PPU must run on the **same machine** as Pterodactyl Wings.

### API Mode ⚠️
```env
FILE_ACCESS_MODE=api
```
PPU uses the **Pterodactyl API** for all file operations (upload, download, delete). This mode works when PPU is deployed on a different machine than Wings.

> **⚠️ WARNING:** API mode is subject to Pterodactyl's built-in rate limiting. Bulk operations (scanning, updating multiple plugins) will be significantly slower and may fail during high-volume operations. **Direct mode is strongly recommended for production use.**

---

## ⚙️ Configuration

Check `backend/.env.example` for a full list of configuration options.

| Variable | Description |
| :--- | :--- |
| `PTERODACTYL_URL` | The URL of your Pterodactyl Panel (e.g., `https://panel.example.com`). |
| `PTERODACTYL_API_KEY` | Application API Key with Read/Write permissions for servers. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `FILE_ACCESS_MODE` | `direct` (recommended) or `api`. Default: `direct`. |
| `VOLUMES_PATH` | Path to Wings server volumes. Default: `/var/pterodactyl/volumes`. |
| `BULK_UPDATE_DELAY_MS` | Delay between updates in bulk operations (API mode only). |

> **Note on Initial User:** The application should create a user based on `.env` variables (if implemented). However, this feature is currently unverified. If it fails, use the default credentials:
> - **Username:** `admin`
> - **Password:** `password`

---

## 🤝 Contributing

This project is open source, and contributions are highly welcome! PPU is a robust tool, but like all software, it can be improved.

-   **Found a bug?** Open an [Issue](https://github.com/Kezzyy/ppu/issues).
-   **Have a fix?** Fork the repo, make your changes, and submit a **Pull Request**.

We are looking for help with:
-   Unit tests.
-   More plugin marketplace integrations.
-   Frontend translations.
-   Documentation improvements.

---

## ⚠️ Disclaimer

This tool is provided "as is" without warranty of any kind. While every effort has been made to ensure safety (backups, checks), the author is not responsible for any data loss or server downtime caused by the use of this software. Always test updates in a staging environment first!

---

*Made with ❤️ for the Minecraft Server Community.*

