## 2026-06-02 - Workspace Symlink Escape in File Writes

**Vulnerability:** `workspace.wsWriteFile` checked parent directory confinement and lexical path safety, but did not check if the target path was an existing symbolic link pointing outside the workspace, allowing arbitrary file overwrites via symlinks.
**Learning:** `fs.writeFile` follows existing symbolic links transparently. Checking lexical path confinement of the target path or parent directory is insufficient when a file path already exists as a symlink.
**Prevention:** Before performing write operations on a file path, inspect `fs.lstat` for symbolic links and verify that `fs.realpath` of the target resolves inside the expected root directory.

## 2026-06-02 - Workspace Symlink Escape in Handoff Package Copying

**Vulnerability:** `copyWorkspaceFiles` in `lib/handoff-package.js` recursively copied files from a workspace session into a project directory using `fs.copyFileSync` without checking if workspace files/directories were symbolic links pointing outside the workspace.
**Learning:** `fs.copyFileSync` transparently follows symbolic links, copying external file contents into exported handoff packages when a symbolic link exists in the source workspace.
**Prevention:** During recursive file copying, resolve `fs.realpathSync(srcPath)` for each entry and verify that `isInsideRoot(realWsDir, realSrcPath)` holds true before copying.

## 2026-06-02 - SSRF via Model Base URL Private IP Bypass

**Vulnerability:** `normaliseOpenAICompatibleChatUrl` in `lib/model-client.js` checked credentials and metadata hostnames/IPs but did not block private or reserved IP ranges (e.g., `10.0.0.0/8`, `192.168.0.0/16`), allowing SSRF targeting internal non-public network services via custom `baseUrl`.
**Learning:** Cloud LLM proxies that allow user-configurable base URLs must restrict internal non-loopback private IP targets alongside metadata service hostnames to prevent internal network scanning or SSRF exploitation.
**Prevention:** In model URL normalization routines, explicitly check `net.isIP(hostname)` against private/reserved ranges while allowing loopback IPs (`127.0.0.1`, `::1`) for local LLM servers.
