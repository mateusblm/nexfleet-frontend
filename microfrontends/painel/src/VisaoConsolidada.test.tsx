// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PainelApp } from "./PainelApp";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const VEICULO_A = "00000000-0000-0000-0000-00000000000a";
const VEICULO_C = "00000000-0000-0000-0000-00000000000c";

const dashboard = {
  gastoAbastecimentos: 700.75,
  gastoManutencoes: 179.25,
  gastoTotal: 880,
  quantidadeAbastecimentos: 4,
  quantidadeManutencoes: 3,
  totalVeiculos: 2,
  veiculosDisponiveis: 1,
  veiculosEmUso: 1,
  veiculosEmManutencao: 0,
  veiculosInativos: 0,
  proximasManutencoes: [],
};

function veiculo(id: string, placa: string) {
  return {
    id,
    placa,
    marca: "Fiat",
    modelo: "Strada",
    ano: 2024,
    tipo: "UTILITARIO",
    quilometragem: 10500,
    status: "DISPONIVEL",
  };
}

const agregadoCompleto = {
  frota: {
    veiculos: [veiculo(VEICULO_A, "ABC1D23"), veiculo(VEICULO_C, "CDE3F45")],
    motoristas: [],
    vinculosAtivos: [],
  },
  operacoes: { abastecimentos: [], manutencoes: [] },
  eficiencia: {
    veiculos: [
      {
        veiculoId: VEICULO_A,
        placa: "ABC1D23",
        consumoMedioKmL: 6.25,
        custoPorKm: 1.5,
        gastoAbastecimento: 600.75,
        gastoManutencao: 149.25,
        gastoTotal: 750,
        distanciaKm: 500,
      },
      {
        veiculoId: VEICULO_C,
        placa: "CDE3F45",
        consumoMedioKmL: null,
        custoPorKm: null,
        gastoAbastecimento: 100,
        gastoManutencao: 30,
        gastoTotal: 130,
        distanciaKm: 0,
      },
    ],
    frota: { consumoMedioKmL: 6.25, custoPorKm: 1.5, gastoTotal: 880, distanciaKm: 500 },
  },
  fontes: { frota: "ok", operacoes: "ok", funcao: "ok" },
  geradoEm: "2026-11-11T12:00:00Z",
};

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status });
}

function stubApi(agregado: () => Promise<Response>) {
  const fetcher = vi.fn((url: string) =>
    url.endsWith("/api/v1/aggregated-data")
      ? agregado()
      : Promise.resolve(respostaJson(dashboard)),
  );
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

async function tabelaConsolidada() {
  return screen.findByRole("table", { name: /consumo médio, custo por km e gasto total/i });
}

function linhaDa(tabela: HTMLElement, cabecalho: string) {
  return within(tabela).getByRole("rowheader", { name: cabecalho }).closest("tr") as HTMLElement;
}

it("mostra consumo médio, custo por km e gasto por veículo e o resumo da frota", async () => {
  const fetcher = stubApi(() => Promise.resolve(respostaJson(agregadoCompleto)));

  render(<PainelApp token="token" perfil="GESTOR_FROTA" />);

  const secao = await screen.findByRole("region", { name: "Visão consolidada" });
  const tabela = await tabelaConsolidada();
  expect(secao).toContainElement(tabela);
  expect(within(tabela).getByRole("columnheader", { name: "Placa" })).toHaveAttribute("scope", "col");

  const linhaA = linhaDa(tabela, "ABC1D23");
  expect(linhaA).toHaveTextContent("6,25 km/l");
  expect(linhaA).toHaveTextContent("R$ 1,50");
  expect(linhaA).toHaveTextContent("R$ 750,00");

  const linhaC = linhaDa(tabela, "CDE3F45");
  expect(within(linhaC).getAllByText("sem dados suficientes")).toHaveLength(2);
  expect(linhaC).toHaveTextContent("R$ 130,00");

  const linhaFrota = linhaDa(tabela, "Frota");
  expect(linhaFrota).toHaveTextContent("6,25 km/l");
  expect(linhaFrota).toHaveTextContent("R$ 880,00");

  expect(within(secao).queryByText(/indisponível/i)).not.toBeInTheDocument();
  await waitFor(() =>
    expect(fetcher).toHaveBeenCalledWith("/api/v1/aggregated-data", {
      headers: { Authorization: "Bearer token" },
    }),
  );
});

it("avisa que o cálculo de eficiência falhou e mantém os veículos na tabela", async () => {
  stubApi(() =>
    Promise.resolve(
      respostaJson({
        ...agregadoCompleto,
        eficiencia: { veiculos: [], frota: null },
        fontes: { frota: "ok", operacoes: "ok", funcao: "falhou" },
      }),
    ),
  );

  render(<PainelApp token="token" perfil="GESTOR_FROTA" />);

  const secao = await screen.findByRole("region", { name: "Visão consolidada" });
  expect(
    await within(secao).findByText(/Cálculo de eficiência indisponível no momento/),
  ).toBeInTheDocument();

  const tabela = await tabelaConsolidada();
  expect(linhaDa(tabela, "ABC1D23")).toBeInTheDocument();
  expect(linhaDa(tabela, "CDE3F45")).toBeInTheDocument();
  expect(tabela).not.toHaveTextContent("km/l");
  expect(within(linhaDa(tabela, "ABC1D23")).getAllByText("indisponível")).toHaveLength(3);
  expect(screen.getByText("R$ 880,00")).toBeInTheDocument();
});
