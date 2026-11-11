import { apiUrl } from "./api-url";

export type SituacaoFonte = "ok" | "falhou";

export type VeiculoFrota = {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  status: string;
};

export type EficienciaVeiculo = {
  veiculoId: string;
  placa: string | null;
  consumoMedioKmL: number | null;
  custoPorKm: number | null;
  gastoTotal: number;
  distanciaKm: number;
};

export type EficienciaFrota = {
  consumoMedioKmL: number | null;
  custoPorKm: number | null;
  gastoTotal: number;
  distanciaKm: number;
};

export type DadosAgregados = {
  frota: { veiculos: VeiculoFrota[] };
  eficiencia: { veiculos: EficienciaVeiculo[]; frota: EficienciaFrota | null };
  fontes: { frota: SituacaoFonte; operacoes: SituacaoFonte; funcao: SituacaoFonte };
  geradoEm: string;
};

export async function consultarDadosAgregados(
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<DadosAgregados> {
  const resposta = await fetcher(apiUrl("/api/v1/aggregated-data"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resposta.ok) throw new Error("dados_agregados_indisponiveis");
  const corpo = (await resposta.json()) as Partial<DadosAgregados>;
  if (!corpo.fontes || !corpo.frota?.veiculos || !corpo.eficiencia?.veiculos) {
    throw new Error("dados_agregados_invalidos");
  }
  return corpo as DadosAgregados;
}
