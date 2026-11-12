import { Project, ProjectFile } from "../types/studio";

export async function exportProject(project: Project) {
  if (!project.files.length)
    throw new Error("This project has no generated files to export yet.");
  const { zipSync, strToU8 } = await import("fflate");
  const files = Object.fromEntries(
    project.files.map((file) => [file.path, strToU8(file.content)]),
  );
  const plan = project.approvedPlan || project.plan;
  const react = project.files.some((f) => f.path === "App.js");
  files["README.md"] = strToU8(
    `# ${project.title}\n\n${plan?.description || ""}\n\n## Colours\n${plan?.colors.map((c) => `- ${c.name}: ${c.hex} — ${c.usage}`).join("\n") || ""}\n\n## Run\n${react ? "Run npm install, then npm start. This project uses React and Parcel." : "Serve this folder with any static HTTP server, for example: npx serve ."}\n`,
  );
  if (react) {
    files["package.json"] = strToU8(
      JSON.stringify(
        {
          name: "generated-website",
          version: "1.0.0",
          private: true,
          scripts: {
            start: "parcel index.html",
            build: "parcel build index.html",
          },
          dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
          devDependencies: { parcel: "^2.12.0" },
        },
        null,
        2,
      ),
    );
    files["index.html"] = strToU8(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Generated website</title></head><body><div id="root"></div><script type="module" src="index.js"></script></body></html>',
    );
  }
  const blob = new Blob([zipSync(files) as BlobPart], {
    type: "application/zip",
  });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `${project.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 50)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadSource(file: ProjectFile) {
  const url = URL.createObjectURL(
    new Blob([file.content], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = file.path.split("/").pop() || "source.txt";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
