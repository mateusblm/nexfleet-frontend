// Copia o contrato AsyncAPI do repositório guarda-chuva (fonte da verdade) para
// public/docs/eventos/, servido pelo Static Web App em /docs/eventos/.
//
// Caminho da fonte: variável ASYNCAPI_CONTRATO ou, por padrão, o guarda-chuva clonado
// ao lado deste repositório (../nexfleet/contracts/eventos.asyncapi.yaml).
// Sem o guarda-chuva (ex.: CI deste repositório), o build usa a cópia versionada.
//
// Também copia o web component da AsyncAPI e o CSS do react-component (devDependencies com
// versão fixa) para public/docs/eventos/vendor/: a CSP do Static Web App só libera 'self',
// então nada é carregado de CDN. A pasta vendor/ é gerada e fica fora do git.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
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

const vendor = resolve(raiz, "public/docs/eventos/vendor");
const pagina = readFileSync(resolve(raiz, "public/docs/eventos/index.html"), "utf8");
rmSync(vendor, { recursive: true, force: true });
for (const [pacote, arquivos] of [
  ["@asyncapi/web-component", ["lib/asyncapi-web-component.js", "lib/asyncapi-web-component.js.LICENSE.txt"]],
  ["@asyncapi/react-component", ["styles/default.min.css"]],
]) {
  const origem = resolve(raiz, "node_modules", pacote);
  const { version } = JSON.parse(readFileSync(resolve(origem, "package.json"), "utf8"));
  const pasta = `${pacote}@${version}`;
  // A página referencia a versão no caminho; instalada e referenciada precisam bater.
  if (!pagina.includes(`./vendor/${pasta}/${arquivos[0]}`)) {
    console.error(`index.html não referencia ./vendor/${pasta}/${arquivos[0]} (versão instalada).`);
    process.exit(1);
  }
  for (const arquivo of arquivos) {
    const alvo = resolve(vendor, pasta, arquivo);
    mkdirSync(dirname(alvo), { recursive: true });
    copyFileSync(resolve(origem, arquivo), alvo);
  }
  console.log(`${pasta} copiado para public/docs/eventos/vendor/`);
}
