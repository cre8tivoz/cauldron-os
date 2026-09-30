## 2026-06-02 - Workspace Symlink Escape in File Writes

**Vulnerability:** `workspace.wsWriteFile` checked parent directory confinement and lexical path safety, but did not check if the target path was an existing symbolic link pointing outside the workspace, allowing arbitrary file overwrites via symlinks.
**Learning:** `fs.writeFile` follows existing symbolic links transparently. Checking lexical path confinement of the target path or parent directory is insufficient when a file path already exists as a symlink.
**Prevention:** Before performing write operations on a file path, inspect `fs.lstat` for symbolic links and verify that `fs.realpath` of the target resolves inside the expected root directory.
