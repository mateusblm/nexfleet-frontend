// Pós-build: garante que dist/ publica a página AsyncAPI em /docs/eventos/.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../dist/docs/eventos");
const falhas = [];
for (const arquivo of ["index.html", "eventos.asyncapi.yaml"])
  if (!existsSync(resolve(dist, arquivo))) falhas.push(`falta dist/docs/eventos/${arquivo}`);
if (falhas.length === 0) {
  const contrato = readFileSync(resolve(dist, "eventos.asyncapi.yaml"), "utf8");
  for (const evento of ["AbastecimentoRegistrado", "ManutencaoRegistrada"])
    if (!contrato.includes(evento)) falhas.push(`contrato sem ${evento}`);
}
if (falhas.length > 0) {
  console.error(`Página AsyncAPI inválida: ${falhas.join("; ")}`);
  process.exit(1);
}
console.log("dist/docs/eventos/ verificado.");
