# Prompt for OpenClaw — Rocky Linux / Apache

Copy the text below into OpenClaw. It requests deployment; Codex has not deployed
anything to the server.

---

Deploy my **Apollo 13 — Bring Them Home** HTML5 game on my Rocky Linux Apache
server. This is a static browser game with a Web Worker, WebAssembly, two AGC
ROMs, images and one original Apollo audio clip. There is no backend, database,
Vite development server or persistent Node service to run.

Repository: https://github.com/apn201/Space-pilot.git
Application directory: `Apollo_Historical_Challenges`.

Use the commit supplied with this request. If I have not supplied one, fetch
`origin/main`, record its full SHA, and build that exact checkout. Use an isolated
build directory and Node **22 or newer**. Run:

```sh
npm ci
npm run assets:verify
npm test
npm run package:game
```

The deployable artifact is `release/apollo13-html5.zip`; its SHA-256 is in
`release/apollo13-html5.sha256`, and the file inventory and commit are in
`release/build-info.json`. Alternatively, use the ZIP and matching checksum I
provide. A Windows file path in the conversation is not a file on your server;
build from the repository if the artifact has not been transferred.

Deploy **only the ZIP contents**. `index.html` must be at the served root.
Preserve filenames and subdirectories exactly. Do not serve the repository,
`node_modules`, research acquisitions, tests, `.git`, source maps, build receipts
or this prompt. Keep the bundled copyright notices and GPL text.

First inspect the server's existing Apache virtual hosts, document roots, TLS,
SELinux status and deployment conventions. Use the hostname/path I have already
specified. Otherwise prefer `/apollo13/` under my existing site; if the intended
site is ambiguous, ask me for its hostname before changing Apache. Preserve the
existing sites and their certificate configuration.

Use a versioned release directory such as
`/var/www/apollo13/releases/<commit-sha>/` and a `current` symlink. Retain the
previous release for rollback. Extract and validate a new directory before
switching the symlink. Do not delete an existing website or release tree.
Apache needs read access, not write access, to the published game.

For a subpath deployment, an isolated Apache configuration can use the following
structure, adapted to the selected existing virtual host:

```apache
Alias /apollo13/ /var/www/apollo13/current/
<Directory /var/www/apollo13/>
    Options -Indexes +FollowSymLinks
    AllowOverride None
    Require all granted
    DirectoryIndex index.html
    AddType application/wasm .wasm
    AddType application/octet-stream .bin
    AddType audio/mpeg .mp3
    <IfModule mod_headers.c>
        <FilesMatch "^(index\.html|.*\.(bin|wasm))$">
            Header set Cache-Control "no-cache"
        </FilesMatch>
    </IfModule>
</Directory>
```

Keep SELinux enforcing. Apply persistent `httpd_sys_content_t` labeling only to
the game's deployment directory with `semanage fcontext` and `restorecon` where
necessary. Inspect existing rules before adding a duplicate. Use the existing
HTTPS host. Do not replace global Apache security headers or TLS settings.
If an existing CSP blocks this application, make a scoped adjustment for its
same-origin module worker and WebAssembly; keep external manual references
accessible through their links. Do not globally loosen unrelated sites.

Run `apachectl configtest` before reloading `httpd`. Verify the existing site is
still healthy. Check the final game URL, redirects, JavaScript/CSS, worker,
`wasm/yaAGC.wasm`, both `roms/*.bin`, panel image and
`audio/aquarius-v41-n20.mp3`. Check the WASM MIME type and HTTP byte-range support
for the audio. Missing assets must return 404, not an SPA fallback HTML page.
Do not add a rewrite that returns `index.html` for missing binaries or scripts.

Open the production URL in a browser. Verify the DSKY boots, the campaign shows
nine chapters, rapid PAD entry retains all digits, invalid N33 cannot start a
burn, the reviewed radio clip plays from the bundled file, sound can be muted,
and the CM-only chapter loads Manche72R3. Test fullscreen and a small viewport.
If any release check fails, restore the previous symlink/configuration and
report the failure instead of reporting success.

Return the public URL, deployed commit, ZIP SHA-256, changed configuration
paths, verification results, and the exact rollback command. Do not publish to
itch.io; I may do that later. Keep the same runtime-only ZIP for itch.io, with
`index.html` at its root. It requires no Apache-specific files.

---

References: [Rocky Linux Apache documentation](https://docs.rockylinux.org/guides/web/apache-sites-enabled/),
[itch.io HTML5 upload requirements](https://itch.io/docs/creators/html5).
