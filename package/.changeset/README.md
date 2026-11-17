# Changesets

Every change that affects users gets a changeset: run `npm run changeset` in `package/`, pick the bump (patch, minor
or major) and describe the change. On `main`, the release workflow opens a "Version packages" pull request that turns
the changesets into a version bump and a changelog entry. Merging that pull request publishes to npm.

Docs: https://github.com/changesets/changesets
