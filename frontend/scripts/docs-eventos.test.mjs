import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const pasta = resolve(dirname(fileURLToPath(import.meta.url)), "../public/docs/eventos");

it("versiona a cópia do contrato AsyncAPI com os dois eventos v1", () => {
  const contrato = readFileSync(resolve(pasta, "eventos.asyncapi.yaml"), "utf8");
  expect(contrato).toMatch(/^asyncapi: 3\./m);
  expect(contrato).toContain("AbastecimentoRegistrado");
  expect(contrato).toContain("ManutencaoRegistrada");
  expect(contrato).toContain("operacoes.abastecimento.registrado.v1");
  expect(contrato).toContain("operacoes.manutencao.registrada.v1");
});

it("renderiza o contrato com o web component oficial em versão fixa", () => {
  const pagina = readFileSync(resolve(pasta, "index.html"), "utf8");
  expect(pagina).toMatch(/@asyncapi\/web-component@\d+\.\d+\.\d+\//);
  expect(pagina).toContain('schemaUrl="./eventos.asyncapi.yaml"');
});
