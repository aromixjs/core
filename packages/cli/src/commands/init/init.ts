import { Platform } from "@aromix/core";
import * as p from "@clack/prompts";
import { join, resolve } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from "fs";
import Handlebars from "handlebars";
import { execSync } from "child_process";
import { tmpdir } from "os";

export class Init {
   async run() {
      p.intro("Initialize a new Aromix project");

      const tempDir = join(tmpdir(), `aromix-tpl-${Date.now()}`);

      try {
         const answers = await p.group(
            {
               name: () =>
                  p.text({
                     message: "Project name (use . for current directory)",
                     placeholder: "my-app",
                     validate: (v) => (!v?.trim() ? "Name is required" : undefined),
                  }),

               description: () =>
                  p.text({
                     message: "Project description (optional)",
                     placeholder: "My awesome project",
                  }),

               platform: () =>
                  p.select<Platform>({
                     message: "Target runtime",
                     options: [
                        { value: "node", label: "Node.js" },
                        { value: "bun", label: "Bun" },
                        { value: "cloudflare:worker", label: "Cloudflare Workers" },
                     ],
                  }),

               format: () =>
                  p.select({
                     message: "Output format",
                     options: [
                        { value: "esm", label: "ESM" },
                        { value: "cjs", label: "CJS" },
                     ],
                  }),
            },
            {
               onCancel: () => {
                  p.cancel("Cancelled.");
                  process.exit(0);
               },
            }
         );

         const spinner = p.spinner();
         spinner.start("Fetching templates...");

         // Clone remote templates
         execSync(`git clone https://github.com/aromixjs/template ${tempDir} --quiet`, { stdio: "ignore" });

         const dir = resolve(process.cwd(), answers.name === "." ? "" : answers.name);

         if (existsSync(dir) && existsSync(join(dir, "package.json"))) {
            p.cancel(`Directory "${dir}" already contains a project.`);
            process.exit(1);
         }

         mkdirSync(dir, { recursive: true });
         
         spinner.message("Generating project files...");

         this.generateProject(dir, tempDir, answers);

         spinner.stop("Project created");
         p.outro(`Done. Get started:\n\n  cd ${answers.name === "." ? "." : answers.name}\n  <your-package-manager> install\n  aromix build`);
      } catch (err: any) {
         p.cancel(`Initialization failed: ${err.message || err}`);
         process.exit(1);
      } finally {
         if (existsSync(tempDir)) {
            rmSync(tempDir, { recursive: true, force: true });
         }
      }
   }

   private generateProject(dir: string, templateDir: string, answers: any) {
      const walk = (currentDir: string, targetDir: string) => {
         const files = readdirSync(currentDir);
         files.forEach((file) => {
            // Skip git metadata and the template readme
            if (file === ".git" || file === "README.md") return;

            const templatePath = join(currentDir, file);
            const stats = require('fs').statSync(templatePath);
            
            if (stats.isDirectory()) {
               const newTarget = join(targetDir, file);
               mkdirSync(newTarget, { recursive: true });
               walk(templatePath, newTarget);
            } else {
               const content = readFileSync(templatePath, "utf8");
               const template = Handlebars.compile(content);
               
               const fileName = file.replace(".hbs", "");
               const outputPath = join(targetDir, fileName);
               
               writeFileSync(outputPath, template({
                  name: answers.name === "." ? "my-project" : answers.name,
                  description: answers.description,
                  platform: answers.platform,
                  format: answers.format
               }));
            }
         });
      };

      walk(templateDir, dir);
   }
}
