// Copia o contrato AsyncAPI do repositório guarda-chuva (fonte da verdade) para
// public/docs/eventos/, servido pelo Static Web App em /docs/eventos/.
//
// Caminho da fonte: variável ASYNCAPI_CONTRATO ou, por padrão, o guarda-chuva clonado
// ao lado deste repositório (../nexfleet/contracts/eventos.asyncapi.yaml).
// Sem o guarda-chuva (ex.: CI deste repositório), o build usa a cópia versionada.
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destino = resolve(raiz, "public/docs/eventos/eventos.asyncapi.yaml");
const explicito = process.env.ASYNCAPI_CONTRATO;
const fonte = resolve(
  raiz,
  explicito || "../../nexfleet/contracts/eventos.asyncapi.yaml",
);

if (existsSync(fonte)) {
  copyFileSync(fonte, destino);
  console.log(`AsyncAPI copiado de ${fonte}`);
} else if (explicito) {
  console.error(`ASYNCAPI_CONTRATO aponta para um arquivo inexistente: ${fonte}`);
  process.exit(1);
} else {
  console.log(`Guarda-chuva não encontrado em ${fonte}; usando a cópia versionada.`);
}

const contrato = readFileSync(destino, "utf8");
for (const evento of ["AbastecimentoRegistrado", "ManutencaoRegistrada"]) {
  if (!contrato.includes(evento)) {
    console.error(`Contrato AsyncAPI sem o evento ${evento}: ${destino}`);
    process.exit(1);
  }
}
