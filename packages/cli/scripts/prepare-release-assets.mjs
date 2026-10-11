import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");
const wheelRoot = resolve(repositoryRoot, "packages/python-sdk/dist");
const wheels = (await readdir(wheelRoot)).filter((name) => /^vnpykit-.*-py3-none-any\.whl$/u.test(name)).sort();
if (wheels.length !== 1) throw new Error(`Expected exactly one VNPyKit wheel in ${wheelRoot}; found ${wheels.length}.`);
const output = resolve(packageRoot, "assets");
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, "wheels"), { recursive: true });
await copyFile(resolve(wheelRoot, wheels[0]), resolve(output, "wheels", wheels[0]));
