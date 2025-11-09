import { readFileSync, writeFileSync } from "fs"

const file = "dist/index.js"
const content = readFileSync(file, "utf-8")
writeFileSync(file, "#!/usr/bin/env node\n" + content)

