# Publishing Webtoapp to npm

This repository is configured to publish the `webtoapp` package publicly. The package exposes the `webtoapp` executable through its `bin` field and ships the compiled CLI in `dist/cli`.

## One-time npm account setup

1. Create or sign in to the npm account that should own the `webtoapp` package.
2. Enable two-factor authentication for publishing in your npm account security settings.
3. Authenticate locally using npm’s browser-based flow:

   ```bash
   npm login
   npm whoami
   ```

Do not put npm credentials or tokens in this repository, source files, workflow files, or chat messages.

## Publish a release

From a clean, up-to-date branch:

```bash
# Check whether the intended package name already has a published version.
# A 404 means the name is available; a version means it is already registered.
npm view webtoapp version || true

# Run the release checks and inspect exactly what npm would upload.
npm run typecheck
npm test
npm run pack:check

# Bump the package version and create a matching Git tag.
npm version patch
# Use `minor` or `major` instead when appropriate.

# Publish the public package. package.json already sets public access.
npm publish

# Push the version commit and tag.
git push origin arena/019ff2e6-webtoapp --follow-tags
```

After npm accepts the release, verify the user experience from a fresh directory:

```bash
npx webtoapp@latest --version
npx webtoapp@latest --help
```

## Publish from GitHub Actions later

For automated npm publishing, configure [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) for this GitHub repository and add a release workflow that runs `npm publish --provenance`. Trusted publishing uses GitHub’s OIDC identity and avoids storing an npm token as a GitHub Actions secret.

The existing `release.yml` is for desktop installer artifacts. Keep npm publication as a separate, reviewed release step unless you explicitly want tags to publish both installers and the CLI package.
