import type { DadosAgregados } from "./dados-agregados";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Linha = {
  chave: string;
  placa: string;
  consumoMedioKmL: number | null;
  custoPorKm: number | null;
  gastoTotal: number | null;
};

function montarLinhas(dados: DadosAgregados): Linha[] {
  const eficienciaPorVeiculo = new Map(dados.eficiencia.veiculos.map((v) => [v.veiculoId, v]));
  return dados.frota.veiculos.map((veiculo) => {
    const eficiencia = eficienciaPorVeiculo.get(veiculo.id);
    return {
      chave: veiculo.id,
      placa: veiculo.placa,
      consumoMedioKmL: eficiencia?.consumoMedioKmL ?? null,
      custoPorKm: eficiencia?.custoPorKm ?? null,
      gastoTotal: eficiencia?.gastoTotal ?? null,
    };
  });
}

export type EstadoConsolidada =
  | { tipo: "carregando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; dados: DadosAgregados };

export function VisaoConsolidada({
  estado,
}: {
  estado: EstadoConsolidada;
  onTentarNovamente: () => void;
}) {
  const dados = estado.tipo === "pronto" ? estado.dados : null;
  const linhas = dados ? montarLinhas(dados) : [];
  const resumo = dados?.eficiencia.frota ?? null;

  return (
    <section className="painel-secao" aria-labelledby="titulo-consolidada">
      <h3 id="titulo-consolidada">Visão consolidada</h3>
      {dados && (
        <div className="painel-tabela-rolagem">
          <table className="painel-tabela">
            <caption>Consumo médio, custo por km e gasto total por veículo e da frota</caption>
            <thead>
              <tr>
                <th scope="col">Placa</th>
                <th scope="col">Consumo médio</th>
                <th scope="col">Custo por km</th>
                <th scope="col">Gasto total</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.chave}>
                  <th scope="row">{linha.placa}</th>
                  <Celula valor={linha.consumoMedioKmL} formato={consumo} />
                  <Celula valor={linha.custoPorKm} formato={moeda.format} />
                  <Celula valor={linha.gastoTotal} formato={moeda.format} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Frota</th>
                <Celula valor={resumo?.consumoMedioKmL ?? null} formato={consumo} />
                <Celula valor={resumo?.custoPorKm ?? null} formato={moeda.format} />
                <Celula valor={resumo?.gastoTotal ?? null} formato={moeda.format} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

function consumo(valor: number) {
  return `${decimal.format(valor)} km/l`;
}

function Celula({ valor, formato }: { valor: number | null; formato: (v: number) => string }) {
  if (valor === null) {
    return (
      <td>
        <span aria-hidden="true">—</span>
        <span className="visualmente-oculto">sem dados suficientes</span>
      </td>
    );
  }
  return <td>{formato(valor)}</td>;
}
