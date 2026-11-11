import { apiUrl } from "./api-url";
import { autorizacao, cabecalhos, mensagemDeFalha, mensagemDoServidor } from "./alteracao-api";
export type Veiculo = { id: string; placa: string; modelo: string; status: string };
export type Manutencao = { id: string; veiculoId: string; tipo: string; realizadaEm: string; quilometragem: number; descricao: string; oficina: string; valor: number; proximaManutencao: string | null; criadoEm: string; versao?: number };
export type NovaManutencao = Omit<Manutencao, "id" | "criadoEm" | "versao">;
export type AtualizacaoManutencao = Omit<NovaManutencao, "veiculoId">;
export class ErroManutencao extends Error {}

async function resposta<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  throw new ErroManutencao(await mensagemDoServidor(response, "Não foi possível concluir a manutenção."));
}

/** Edição e exclusão: 403/503 com texto próprio, demais falhas com a mensagem do servidor. */
async function exigirSucesso(response: Response, padrao: string) {
  if (!response.ok) throw new ErroManutencao(await mensagemDeFalha(response, padrao));
}

export async function listarVeiculosAtivos(token: string): Promise<Veiculo[]> {
  const response = await fetch(apiUrl("/api/v1/veiculos?pagina=0&tamanho=100"), {
    headers: autorizacao(token),
  });
  return (await resposta<Veiculo[]>(response)).filter((item) => item.status !== "INATIVO");
}

export async function listarManutencoes(token: string, pagina = 0) {
  const response = await fetch(apiUrl(`/api/v1/manutencoes?pagina=${pagina}&tamanho=20`), {
    headers: autorizacao(token),
  });
  return resposta<Manutencao[]>(response);
}

export async function registrarManutencao(token: string, entrada: NovaManutencao) {
  const response = await fetch(apiUrl("/api/v1/manutencoes"), {
    method: "POST",
    headers: cabecalhos(token),
    body: JSON.stringify(entrada),
  });
  return resposta<Manutencao>(response);
}

export async function atualizarManutencao(token: string, id: string, entrada: AtualizacaoManutencao) {
  const response = await fetch(apiUrl(`/api/v1/manutencoes/${id}`), {
    method: "PUT", headers: cabecalhos(token), body: JSON.stringify(entrada),
  });
  await exigirSucesso(response, "Não foi possível salvar a manutenção.");
  return response.json() as Promise<Manutencao>;
}

export async function excluirManutencao(token: string, id: string) {
  const response = await fetch(apiUrl(`/api/v1/manutencoes/${id}`), {
    method: "DELETE", headers: autorizacao(token),
  });
  await exigirSucesso(response, "Não foi possível excluir a manutenção.");
}
