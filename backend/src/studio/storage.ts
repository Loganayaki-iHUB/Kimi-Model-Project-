import path from "node:path";
import { mkdir, writeFile, rename, lstat, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { projects } from "./database";
import { Project, ProjectFile, Revision } from "./types";

export const projectsRoot = path.resolve(
  process.env.PROJECTS_DIR || path.join(__dirname, "..", "..", "projects"),
);
function contained(root: string, relative: string) {
  if (
    !relative ||
    relative.includes("\\") ||
    relative.split("/").some((p) => !p || p === "." || p === "..") ||
    path.isAbsolute(relative) ||
    relative.includes(":")
  )
    throw new Error("Invalid project file path.");
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep))
    throw new Error("Project file escapes its local folder.");
  return target;
}
async function atomicWrite(root: string, relative: string, content: string) {
  const target = contained(root, relative);
  // Refuse symlinks/junctions in an existing path before writing generated source.
  let cursor = root;
  for (const segment of path
    .relative(root, path.dirname(target))
    .split(path.sep)
    .filter(Boolean)) {
    cursor = path.join(cursor, segment);
    await mkdir(cursor).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error;
    });
    if ((await lstat(cursor)).isSymbolicLink())
      throw new Error("Project folders cannot contain symbolic links.");
  }
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, content, "utf8");
  await rename(temporary, target);
}
export async function ensureLocalProject(project: Project) {
  if (!/^[a-f0-9-]{36}$/i.test(project.id))
    throw new Error("Invalid project identifier.");
  const heading =
    project.title
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 65)
      .toLowerCase() || "website";
  const directoryName = project.directoryName || `${heading}--${project.id}`;
  const folder = contained(projectsRoot, directoryName);
  await mkdir(folder, { recursive: true });
  if ((await lstat(folder)).isSymbolicLink())
    throw new Error("Project folder cannot be a symbolic link.");
  if (!project.directoryName || project.localPath !== folder) {
    await projects().updateOne(
      { id: project.id },
      { $set: { directoryName, localPath: folder } },
    );
    project.directoryName = directoryName;
    project.localPath = folder;
  }
  return folder;
}
export async function saveSource(project: Project, file: ProjectFile) {
  const folder = await ensureLocalProject(project);
  await atomicWrite(folder, file.path, file.content);
}
export async function saveLocalState(project: Project) {
  const folder = await ensureLocalProject(project);
  await atomicWrite(
    folder,
    ".kimo/project.json",
    JSON.stringify(project, null, 2),
  );
  await atomicWrite(
    folder,
    "PROJECT.md",
    `# ${project.title}\n\n${project.plan?.description || "Website project"}\n\n- Project ID: ${project.id}\n- Stage: ${project.stage}\n- Stack: ${project.stack}\n- Version: ${project.version}\n\n${project.checkpoint ? "Generation is checkpointed. Use Continue generation in Kimo AI Studio to resume without discarding saved files.\n" : ""}`,
  );
}
export async function saveRevision(project: Project, revision: Revision) {
  const folder = await ensureLocalProject(project);
  for (const file of revision.files)
    await atomicWrite(
      folder,
      `.kimo/versions/v${revision.version}/${file.path}`,
      file.content,
    );
  await atomicWrite(
    folder,
    `.kimo/versions/v${revision.version}/plan.json`,
    JSON.stringify(revision.plan, null, 2),
  );
}
export async function backfillLocalProjects() {
  for await (const project of projects().find({
    userId: "loga",
    $or: [{ "files.0": { $exists: true } }, { plan: { $ne: null } }],
  })) {
    if (project.checkpoint?.currentFile) {
      const folder = await ensureLocalProject(project);
      const current = project.files.find(
        (f) => f.path === project.checkpoint!.currentFile,
      );
      try {
        const content = await readFile(
          contained(folder, project.checkpoint.currentFile),
          "utf8",
        );
        if (
          content.length > (current?.content.length || 0) &&
          (!current || content.startsWith(current.content))
        ) {
          const recovered: ProjectFile = {
            path: project.checkpoint.currentFile,
            content,
            language: current?.language || "javascript",
            status: "partial",
          };
          project.files = [
            ...project.files.filter((f) => f.path !== recovered.path),
            recovered,
          ];
          await projects().updateOne(
            { id: project.id },
            { $set: { files: project.files } },
          );
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    for (const file of project.files) await saveSource(project, file);
    for (const revision of project.revisions)
      await saveRevision(project, revision);
    await saveLocalState(project);
  }
}
