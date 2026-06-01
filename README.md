<div align="center">

  <img src="https://github.com/tapframe/NuvioTV/raw/dev/assets/brand/app_logo_wordmark.png" alt="NuvioTV Tizen Hosted" width="300" />
  <br />
  <br />

  <p>
    Lightweight <b>hosted Tizen wrapper</b> for Nuvio TV.
    <br />
    Hosted TV launcher • Standalone WGT build • Minimal packaging layer
  </p>

  <p>
    ⚠️ <b>Status: BETA</b> — experimental and may be unstable.
  </p>

</div>

## About

**NuvioTizen** is a tiny Samsung Tizen wrapper that opens the hosted Nuvio TV web app as a standalone WGT.

It is not the main application source code. This project only contains the launcher shell and packaging workflow for the hosted experience.

## Build

```bash
npm install
npm run package
```

That creates `NuvioTV-Tizen-VERSION.wgt` in the project root.

## Release Automation

- This repo can build on `repository_dispatch` `build-release`
- The workflow builds a hosted WGT and uploads it to the shared source release

## For Developers

- Main shared app source: `NuvioMedia/NuvioWeb`
- Hosted app URL is defined in `main.js`
- Tizen widget metadata is defined in `config.xml`
- WGT packaging logic is in `scripts/package-hosted-tizen.mjs`
