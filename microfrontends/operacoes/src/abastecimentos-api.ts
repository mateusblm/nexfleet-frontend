import { apiUrl } from "./api-url";
import { autorizacao, cabecalhos, mensagemDeFalha, mensagemDoServidor } from "./alteracao-api";
export type Vinculo = { id: string; veiculoId: string; veiculoPlaca: string; motoristaId: string; motoristaNome: string; inicio: string; fim: string | null };
export type Abastecimento = { id: string; veiculoId: string; motoristaId: string; realizadoEm: string; combustivel: string; litros: number; valorTotal: number; quilometragem: number; criadoEm: string; versao?: number };
export type NovoAbastecimento = Omit<Abastecimento, "id" | "criadoEm" | "versao">;
export type AtualizacaoAbastecimento = Pick<Abastecimento, "combustivel" | "litros" | "valorTotal" | "quilometragem">;
export class ErroAbastecimento extends Error {}

async function resposta<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  throw new ErroAbastecimento(await mensagemDoServidor(response, "Não foi possível concluir a operação."));
}

/** Edição e exclusão: 403/503 com texto próprio, demais falhas com a mensagem do servidor. */
async function exigirSucesso(response: Response, padrao: string) {
  if (!response.ok) throw new ErroAbastecimento(await mensagemDeFalha(response, padrao));
}

export async function listarVinculosAtivos(token: string): Promise<Vinculo[]> {
  const response = await fetch(apiUrl("/api/v1/vinculos?pagina=0&tamanho=100"), {
    headers: autorizacao(token),
  });
  return (await resposta<Vinculo[]>(response)).filter((item) => !item.fim);
}

export async function listarAbastecimentos(token: string, pagina = 0) {
  const response = await fetch(apiUrl(`/api/v1/abastecimentos?pagina=${pagina}&tamanho=20`), {
    headers: autorizacao(token),
  });
  return resposta<Abastecimento[]>(response);
}

export async function registrarAbastecimento(token: string, entrada: NovoAbastecimento) {
  const response = await fetch(apiUrl("/api/v1/abastecimentos"), {
    method: "POST",
    headers: cabecalhos(token),
    body: JSON.stringify(entrada),
  });
  return resposta<Abastecimento>(response);
}

export async function atualizarAbastecimento(token: string, id: string, entrada: AtualizacaoAbastecimento) {
  const response = await fetch(apiUrl(`/api/v1/abastecimentos/${id}`), {
    method: "PUT", headers: cabecalhos(token), body: JSON.stringify(entrada),
  });
  await exigirSucesso(response, "Não foi possível salvar o abastecimento.");
  return response.json() as Promise<Abastecimento>;
}

export async function excluirAbastecimento(token: string, id: string) {
  const response = await fetch(apiUrl(`/api/v1/abastecimentos/${id}`), {
    method: "DELETE", headers: autorizacao(token),
  });
  await exigirSucesso(response, "Não foi possível excluir o abastecimento.");
}
