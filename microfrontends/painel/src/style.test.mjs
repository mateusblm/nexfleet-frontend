import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync(new URL("./style.css", import.meta.url), "utf8");

function regra(seletor) {
  const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\n)${escapado}\\s*\\{([^}]*)\\}`).exec(css)?.[2] ?? "";
}

// O jsdom não calcula layout; a regressão vista no navegador (375 px) é verificada pela regra.
// O texto .visualmente-oculto das células sem valor é position:absolute: sem um ancestral
// posicionado dentro da área de rolagem, ele escapa do overflow e alarga a página inteira.
it("mantém a rolagem horizontal da tabela dentro do cartão em telas estreitas", () => {
  const rolagem = regra(".painel-tabela-rolagem");
  expect(rolagem).toMatch(/overflow-x:\s*auto/);
  expect(rolagem).toMatch(/position:\s*relative/);
});
