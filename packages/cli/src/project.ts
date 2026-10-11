import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const TEMPLATE = `from visionpy import App, State\nfrom visionpy.ui import Button, Checkbox, Column, Text, TextInput\n\napp = App(title="Hello VisionPy")\nname = State("")\naccepted = State(False)\nresult = State("Complete the form.")\n\ndef submit() -> None:\n    result.set(f"Submitted for {name.value}.")\n\nwith app.layout(), Column(gap=12, on_submit=submit):\n    Text("Hello VisionPy", level="h1")\n    TextInput("Name", value=name, placeholder="Your name", required=True)\n    Checkbox("Accept", checked=accepted, required=True)\n    Text.bind(lambda: f"Hello {name.value or 'friend'} / accepted: {accepted.value}")\n    Text.bind(lambda: result.value)\n    Button("Submit form", submit=True)\n\napp.run()\n`;

export async function createProject(directoryInput: string): Promise<string> {
  const directory = resolve(directoryInput);
  const name = basename(directory);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u.test(name)) throw new Error("Project directory name must be a safe identifier");
  try {
    if ((await stat(directory)).isDirectory() && (await readdir(directory)).length > 0) throw new Error(`Directory is not empty: ${directory}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Directory is not empty")) throw error;
  }
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, "app.py"), TEMPLATE, { encoding: "utf8", flag: "wx" });
  await writeFile(resolve(directory, ".gitignore"), ".visionpy/\ndist/\n", { encoding: "utf8", flag: "wx" });
  await writeFile(resolve(directory, "README.md"), `# ${name}\n\nRun with \`visionpy run app.py\` and build with \`visionpy build app.py\`.\n`, { encoding: "utf8", flag: "wx" });
  return directory;
}
