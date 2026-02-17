# Pterodactyl Plugin Updater (PPU)

![PPU Logo](frontend/public/logo.png)

**Pterodactyl Plugin Updater (PPU)** is a powerful, automated tool designed to manage Minecraft plugins across your Pterodactyl servers. It simplifies the process of keeping plugins up-to-date, managing versions, and ensuring server stability.

> **Open Source Project** 🚀

---

## 🔥 Features

-   **Automatic Updates:** Scans your servers for outdated plugins and updates them automatically (requires setting up a Schedule in servers you want inside PPU) or with a single click.
-   **Rate Limit Handling:** Smartly handles Pterodactyl API rate limits to prevent disruptions during bulk operations (functional but may need further optimization).
-   **Version Control:** Keeps track of current and latest versions. Supports rollbacks (stored locally, keeps last 3 versions).
-   **Hash-Based Scanning:** As of now it's not working as I couldn't figure a way how to implement it.
-   **Marketplace Integration:** Supports installing plugins from SpigotMC and Modrinth. Supports direct URL linking and platform-specific filtering (Paper, Velocity, BungeeCord, etc.).
-   **Web Interface:** A sleek, modern dashboard to view update progress, server health, and manage plugins visually.
-   **Dockerized:** Easy deployment using Docker and Docker Compose.

---

## 🛠️ Installation

The easiest way to run PPU is using Docker Compose.

### Prerequisites
-   Docker Engine
-   Docker Compose

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

## ⚙️ Configuration

Check `backend/.env.example` for a full list of configuration options.

| Variable | Description |
| :--- | :--- |
| `PTERODACTYL_URL` | The URL of your Pterodactyl Panel (e.g., `https://panel.example.com`). |
| `PTERODACTYL_API_KEY` | Application API Key with Read/Write permissions for servers. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `BULK_UPDATE_DELAY_MS` | Delay between updates in bulk operations to prevent API throttling. |

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
