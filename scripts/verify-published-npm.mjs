const expectedVersion = "0.1.0-alpha.1";
const expectedRepository = "git+https://github.com/visionnumbers/vnpykit.git";
const packages = [
  "@vnpykit/protocol",
  "@vnpykit/renderer",
  "@vnpykit/runtime-pyodide",
  "@vnpykit/embed",
  "@vnpykit/cli",
];

for (const packageName of packages) {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
  if (!response.ok) fail(`${packageName} registry lookup returned ${response.status}`);
  const metadata = await response.json();
  const manifest = metadata.versions?.[expectedVersion];
  if (!manifest) fail(`${packageName}@${expectedVersion} is not published`);
  if (manifest.name !== packageName) fail(`${packageName} name mismatch`);
  if (manifest.version !== expectedVersion) fail(`${packageName} version mismatch`);
  if (manifest.repository?.url !== expectedRepository) fail(`${packageName} repository mismatch`);
  if (metadata["dist-tags"]?.alpha !== expectedVersion) {
    fail(`${packageName} alpha dist-tag does not identify ${expectedVersion}`);
  }
  console.log(`Verified ${packageName}@${expectedVersion} with alpha dist-tag`);
}

function fail(message) {
  throw new Error(message);
}
