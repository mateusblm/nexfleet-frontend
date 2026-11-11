// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OperacoesApp } from "./OperacoesApp";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("exibe formulário e histórico reais da Sprint 2", async () => {
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response("[]", { status: 200 }))
    .mockResolvedValueOnce(new Response("[]", { status: 200 }))
    .mockResolvedValueOnce(new Response("[]", { status: 200 }))
    .mockResolvedValueOnce(new Response("[]", { status: 200 }));
  render(<OperacoesApp token="token" perfil="GESTOR_FROTA" />);
  expect(screen.getByRole("heading", { name: "Operações" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Novo abastecimento" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Nova manutenção" })).toBeInTheDocument();
  expect(await screen.findByText("Nenhum abastecimento registrado.")).toBeInTheDocument();
  expect(screen.getByText("Nenhuma manutenção registrada.")).toBeInTheDocument();
});

it("CQ06 preserva dados válidos e marca o valor obrigatório", async () => {
  const vinculo = {
    id: "1d4be0d1-4801-41e1-9c5f-9002b2fc6dcc",
    veiculoId: "b176f1b1-bc54-4f22-9b2e-fb69469ab033",
    veiculoPlaca: "ABC1D23",
    motoristaId: "3ce0bdb7-f1de-47c2-baa3-7b99e343650c",
    motoristaNome: "Ana Silva",
    inicio: "2026-11-08T00:00:00Z",
    fim: null,
  };
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify([vinculo]), { status: 200 }))
    .mockResolvedValueOnce(new Response("[]", { status: 200 }))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: vinculo.veiculoId,
            placa: vinculo.veiculoPlaca,
            modelo: "Delivery",
            status: "DISPONIVEL",
          },
        ]),
        { status: 200 },
      ),
    )
    .mockResolvedValueOnce(new Response("[]", { status: 200 }));
  render(<OperacoesApp token="token" perfil="GESTOR_FROTA" />);
  await screen.findByRole("option", { name: /ABC1D23.*Ana Silva/ });
  fireEvent.change(screen.getByLabelText("Veículo e motorista"), {
    target: { value: vinculo.id },
  });
  fireEvent.change(screen.getByLabelText("Litros"), {
    target: { value: "45.50" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Registrar abastecimento" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Revise os campos marcados",
  );
  expect(screen.getByLabelText("Litros")).toHaveValue(45.5);
  expect(screen.getByLabelText("Valor total")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(fetch).toHaveBeenCalledTimes(4);
});

const abastecimentoSalvo = {
  id: "7f0c7e8a-2b1d-4d3e-9a51-0c6a1e2f3b4c",
  veiculoId: "b176f1b1-bc54-4f22-9b2e-fb69469ab033",
  motoristaId: "3ce0bdb7-f1de-47c2-baa3-7b99e343650c",
  realizadoEm: "2026-11-12T12:00:00Z",
  combustivel: "DIESEL",
  litros: 45.5,
  valorTotal: 280.1,
  quilometragem: 12000,
  criadoEm: "2026-11-12T12:01:00Z",
  versao: 1,
};

const manutencaoSalva = {
  id: "5a6b7c8d-1e2f-4a3b-8c9d-0e1f2a3b4c5d",
  veiculoId: "b176f1b1-bc54-4f22-9b2e-fb69469ab033",
  tipo: "PREVENTIVA",
  realizadaEm: "2026-11-12",
  quilometragem: 11800,
  descricao: "Troca de filtros",
  oficina: "Oficina Central",
  valor: 350,
  proximaManutencao: null,
  criadoEm: "2026-11-12T12:01:00Z",
  versao: 1,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function apiComHistorico(
  extra: (url: string, init?: RequestInit) => Response | undefined = () => undefined,
) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const resposta = extra(url, init);
    if (resposta) return resposta;
    if (url.includes("/api/v1/vinculos")) {
      return json([{ id: "1d4be0d1-4801-41e1-9c5f-9002b2fc6dcc", veiculoId: abastecimentoSalvo.veiculoId,
        veiculoPlaca: "ABC1D23", motoristaId: abastecimentoSalvo.motoristaId,
        motoristaNome: "Ana Silva", inicio: "2026-11-08T00:00:00Z", fim: null }]);
    }
    if (url.includes("/api/v1/veiculos")) {
      return json([{ id: abastecimentoSalvo.veiculoId, placa: "ABC1D23", modelo: "Delivery", status: "DISPONIVEL" }]);
    }
    if (url.includes("/api/v1/abastecimentos")) return json([abastecimentoSalvo]);
    if (url.includes("/api/v1/manutencoes")) return json([manutencaoSalva]);
    throw new Error(`rota inesperada ${url}`);
  });
}

function chamadas(fetch: ReturnType<typeof apiComHistorico>, metodo: string) {
  return fetch.mock.calls.filter(([, init]) => init?.method === metodo);
}

it("edita um abastecimento do histórico e atualiza a linha", async () => {
  const fetch = apiComHistorico((url, init) =>
    init?.method === "PUT" && url.endsWith(`/api/v1/abastecimentos/${abastecimentoSalvo.id}`)
      ? json({ ...abastecimentoSalvo, ...JSON.parse(String(init.body)), versao: 2 })
      : undefined);
  render(<OperacoesApp token="token" perfil="GESTOR_FROTA" />);
  fireEvent.click(await screen.findByRole("button", { name: "Editar abastecimento de 12/11/2026" }));

  const formulario = screen.getByRole("form", { name: "Editar abastecimento de 12/11/2026" });
  expect(within(formulario).getByText("ABC1D23")).toBeInTheDocument();
  expect(within(formulario).getByText("Ana Silva")).toBeInTheDocument();
  expect(within(formulario).queryByLabelText(/Data/)).not.toBeInTheDocument();
  expect(within(formulario).getByLabelText("Combustível")).toHaveFocus();
  expect(within(formulario).getByLabelText("Litros")).toHaveValue(45.5);
  fireEvent.change(within(formulario).getByLabelText("Litros"), { target: { value: "50" } });
  fireEvent.change(within(formulario).getByLabelText("Combustível"), { target: { value: "GASOLINA" } });
  fireEvent.click(within(formulario).getByRole("button", { name: "Salvar" }));

  expect(await screen.findByText("GASOLINA · 50.00 L")).toBeInTheDocument();
  expect(screen.queryByRole("form", { name: /Editar abastecimento/ })).not.toBeInTheDocument();
  const [[, put]] = chamadas(fetch, "PUT");
  expect(JSON.parse(String(put?.body))).toEqual({
    combustivel: "GASOLINA", litros: 50, valorTotal: 280.1, quilometragem: 12000,
  });
  expect(new Headers(put?.headers).get("Authorization")).toBe("Bearer token");
  expect(screen.getByRole("button", { name: "Editar abastecimento de 12/11/2026" })).toHaveFocus();
});

it("mantém o formulário aberto e mostra a mensagem do servidor quando a edição é recusada com 422", async () => {
  apiComHistorico((_url, init) => init?.method === "PUT"
    ? json({ message: "Quilometragem deve ser maior que a do abastecimento anterior." }, 422)
    : undefined);
  render(<OperacoesApp token="token" perfil="GESTOR_FROTA" />);
  fireEvent.click(await screen.findByRole("button", { name: "Editar abastecimento de 12/11/2026" }));
  const formulario = screen.getByRole("form", { name: "Editar abastecimento de 12/11/2026" });
  fireEvent.change(within(formulario).getByLabelText("Quilometragem"), { target: { value: "10" } });
  fireEvent.click(within(formulario).getByRole("button", { name: "Salvar" }));

  expect(await within(formulario).findByRole("alert"))
    .toHaveTextContent("Quilometragem deve ser maior que a do abastecimento anterior.");
  expect(screen.getByRole("form", { name: "Editar abastecimento de 12/11/2026" })).toBeInTheDocument();
  expect(within(formulario).getByLabelText("Quilometragem")).toHaveValue(10);
  expect(screen.getByText("DIESEL · 45.50 L")).toBeInTheDocument();
});

it("explica a falta de permissão quando a edição devolve 403", async () => {
  apiComHistorico((_url, init) => init?.method === "PUT" ? new Response("", { status: 403 }) : undefined);
  render(<OperacoesApp token="token" perfil="GESTOR_FROTA" />);
  fireEvent.click(await screen.findByRole("button", { name: "Editar abastecimento de 12/11/2026" }));
  const formulario = screen.getByRole("form", { name: "Editar abastecimento de 12/11/2026" });
  fireEvent.click(within(formulario).getByRole("button", { name: "Salvar" }));
  expect(await within(formulario).findByRole("alert"))
    .toHaveTextContent("Seu perfil não tem permissão para alterar operações.");
});

it("pede confirmação antes de excluir um abastecimento e nada muda ao cancelar", async () => {
  const fetch = apiComHistorico((url, init) =>
    init?.method === "DELETE" && url.endsWith(`/api/v1/abastecimentos/${abastecimentoSalvo.id}`)
      ? new Response(null, { status: 204 })
      : undefined);
  render(<OperacoesApp token="token" perfil="GESTOR_FROTA" />);
  const excluir = await screen.findByRole("button", { name: "Excluir abastecimento de 12/11/2026" });

  fireEvent.click(excluir);
  const confirmacao = screen.getByRole("group", { name: "Confirmar exclusão do abastecimento de 12/11/2026" });
  expect(within(confirmacao).getByRole("button", { name: "Cancelar" })).toHaveFocus();
  fireEvent.keyDown(confirmacao, { key: "Escape" });
  expect(screen.queryByRole("group", { name: /Confirmar exclusão/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Excluir abastecimento de 12/11/2026" })).toHaveFocus();
  expect(chamadas(fetch, "DELETE")).toHaveLength(0);

  fireEvent.click(screen.getByRole("button", { name: "Excluir abastecimento de 12/11/2026" }));
  fireEvent.click(within(screen.getByRole("group", { name: /Confirmar exclusão/ }))
    .getByRole("button", { name: "Cancelar" }));
  expect(screen.getByText("DIESEL · 45.50 L")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Excluir abastecimento de 12/11/2026" }));
  fireEvent.click(within(screen.getByRole("group", { name: /Confirmar exclusão/ }))
    .getByRole("button", { name: "Excluir definitivamente" }));
  expect(await screen.findByText("Nenhum abastecimento registrado.")).toBeInTheDocument();
  expect(screen.queryByText("DIESEL · 45.50 L")).not.toBeInTheDocument();
  expect(chamadas(fetch, "DELETE")).toHaveLength(1);
  expect(screen.getByRole("status")).toHaveTextContent("Abastecimento excluído.");
});

it("edita todos os campos de uma manutenção menos o veículo", async () => {
  const fetch = apiComHistorico((url, init) =>
    init?.method === "PUT" && url.endsWith(`/api/v1/manutencoes/${manutencaoSalva.id}`)
      ? json({ ...manutencaoSalva, ...JSON.parse(String(init.body)), versao: 2 })
      : undefined);
  render(<OperacoesApp token="token" perfil="GESTOR_FROTA" />);
  fireEvent.click(await screen.findByRole("button", { name: "Editar manutenção de 12/11/2026" }));
  const formulario = screen.getByRole("form", { name: "Editar manutenção de 12/11/2026" });
  expect(within(formulario).getByText("ABC1D23 · Delivery")).toBeInTheDocument();
  expect(within(formulario).queryByLabelText("Veículo")).not.toBeInTheDocument();
  expect(within(formulario).getByLabelText("Descrição")).toHaveValue("Troca de filtros");
  fireEvent.change(within(formulario).getByLabelText("Tipo"), { target: { value: "CORRETIVA" } });
  fireEvent.change(within(formulario).getByLabelText("Data"), { target: { value: "2026-11-10" } });
  fireEvent.change(within(formulario).getByLabelText("Quilometragem"), { target: { value: "11900" } });
  fireEvent.change(within(formulario).getByLabelText("Descrição"), { target: { value: "Freios" } });
  fireEvent.change(within(formulario).getByLabelText("Oficina"), { target: { value: "Oficina Sul" } });
  fireEvent.change(within(formulario).getByLabelText("Valor"), { target: { value: "410.5" } });
  fireEvent.change(within(formulario).getByLabelText("Próxima manutenção (opcional)"), { target: { value: "2027-05-10" } });
  fireEvent.click(within(formulario).getByRole("button", { name: "Salvar" }));

  expect(await screen.findByText("Freios")).toBeInTheDocument();
  expect(screen.getByText("CORRETIVA")).toBeInTheDocument();
  const [[, put]] = chamadas(fetch, "PUT");
  expect(JSON.parse(String(put?.body))).toEqual({
    tipo: "CORRETIVA", realizadaEm: "2026-11-10", quilometragem: 11900, descricao: "Freios",
    oficina: "Oficina Sul", valor: 410.5, proximaManutencao: "2027-05-10",
  });
});

it("mantém a manutenção e avisa quando o Operações está indisponível na exclusão", async () => {
  apiComHistorico((_url, init) => init?.method === "DELETE" ? new Response("", { status: 503 }) : undefined);
  render(<OperacoesApp token="token" perfil="GESTOR_FROTA" />);
  fireEvent.click(await screen.findByRole("button", { name: "Excluir manutenção de 12/11/2026" }));
  const confirmacao = screen.getByRole("group", { name: "Confirmar exclusão da manutenção de 12/11/2026" });
  fireEvent.click(within(confirmacao).getByRole("button", { name: "Excluir definitivamente" }));
  expect(await within(confirmacao).findByRole("alert"))
    .toHaveTextContent("Operações está indisponível no momento. Tente novamente em instantes.");
  expect(screen.getByText("Troca de filtros")).toBeInTheDocument();
});

it("CQ06 marca o campo inválido na edição de abastecimento com resumo acessível e sem enviar", async () => {
  const fetch = apiComHistorico();
  render(<OperacoesApp token="token" perfil="GESTOR_FROTA" />);
  fireEvent.click(await screen.findByRole("button", { name: "Editar abastecimento de 12/11/2026" }));
  const formulario = screen.getByRole("form", { name: "Editar abastecimento de 12/11/2026" });
  fireEvent.change(within(formulario).getByLabelText("Litros"), { target: { value: "" } });
  fireEvent.change(within(formulario).getByLabelText("Valor total"), { target: { value: "300" } });
  fireEvent.click(within(formulario).getByRole("button", { name: "Salvar" }));

  const alerta = await within(formulario).findByRole("alert");
  expect(alerta).toHaveTextContent(
    "Revise os campos marcados. Preencha os campos obrigatórios e confira os valores informados.");
  const litros = within(formulario).getByLabelText("Litros");
  expect(litros).toHaveAttribute("aria-invalid", "true");
  expect(litros).toHaveAttribute("aria-describedby", alerta.id);
  expect(formulario).toHaveAttribute("aria-describedby", alerta.id);
  expect(formulario).toHaveClass("validacao-exibida");
  expect(within(formulario).getByLabelText("Valor total")).toHaveValue(300);
  expect(within(formulario).getByLabelText("Valor total")).not.toHaveAttribute("aria-invalid");
  expect(chamadas(fetch, "PUT")).toHaveLength(0);

  fireEvent.input(litros, { target: { value: "40" } });
  expect(litros).not.toHaveAttribute("aria-invalid");
  expect(litros).not.toHaveAttribute("aria-describedby");
  expect(within(formulario).queryByRole("alert")).not.toBeInTheDocument();
  expect(formulario).not.toHaveClass("validacao-exibida");
});

it("CQ06 marca o campo obrigatório vazio na edição de manutenção sem enviar", async () => {
  const fetch = apiComHistorico();
  render(<OperacoesApp token="token" perfil="GESTOR_FROTA" />);
  fireEvent.click(await screen.findByRole("button", { name: "Editar manutenção de 12/11/2026" }));
  const formulario = screen.getByRole("form", { name: "Editar manutenção de 12/11/2026" });
  fireEvent.change(within(formulario).getByLabelText("Descrição"), { target: { value: "" } });
  fireEvent.click(within(formulario).getByRole("button", { name: "Salvar" }));

  const alerta = await within(formulario).findByRole("alert");
  expect(alerta).toHaveTextContent("Revise os campos marcados");
  expect(within(formulario).getByLabelText("Descrição")).toHaveAttribute("aria-invalid", "true");
  expect(within(formulario).getByLabelText("Descrição")).toHaveAttribute("aria-describedby", alerta.id);
  expect(within(formulario).getByLabelText("Oficina")).toHaveValue("Oficina Central");
  expect(chamadas(fetch, "PUT")).toHaveLength(0);
});
