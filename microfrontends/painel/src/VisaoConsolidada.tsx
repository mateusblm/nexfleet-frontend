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

// Veículos da Frota na ordem cadastrada, mais os que só a eficiência conhece
// (quando a Frota falhou e a Function respondeu, a placa pode vir nula).
function montarLinhas(dados: DadosAgregados): Linha[] {
  const eficienciaPorVeiculo = new Map(dados.eficiencia.veiculos.map((v) => [v.veiculoId, v]));
  const daFrota = dados.frota.veiculos.map((veiculo) => {
    const eficiencia = eficienciaPorVeiculo.get(veiculo.id);
    return {
      chave: veiculo.id,
      placa: veiculo.placa,
      consumoMedioKmL: eficiencia?.consumoMedioKmL ?? null,
      custoPorKm: eficiencia?.custoPorKm ?? null,
      gastoTotal: eficiencia?.gastoTotal ?? null,
    };
  });
  const naFrota = new Set(dados.frota.veiculos.map((v) => v.id));
  const soNaEficiencia = dados.eficiencia.veiculos
    .filter((v) => !naFrota.has(v.veiculoId))
    .map((v) => ({
      chave: v.veiculoId,
      placa: v.placa ?? "Placa indisponível",
      consumoMedioKmL: v.consumoMedioKmL,
      custoPorKm: v.custoPorKm,
      gastoTotal: v.gastoTotal,
    }));
  return [...daFrota, ...soNaEficiencia];
}

function avisosDe(fontes: DadosAgregados["fontes"]): string[] {
  const avisos: string[] = [];
  if (fontes.frota === "falhou") {
    avisos.push(
      "Cadastro da frota indisponível no momento: a lista de veículos pode estar incompleta e sem placas.",
    );
  }
  if (fontes.operacoes === "falhou") {
    avisos.push(
      "Histórico de abastecimentos e manutenções indisponível no momento: consumo, custo por km e gastos não puderam ser calculados.",
    );
  } else if (fontes.funcao === "falhou") {
    avisos.push(
      "Cálculo de eficiência indisponível no momento: consumo, custo por km e gastos não puderam ser calculados.",
    );
  }
  return avisos;
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
  const avisos = dados ? avisosDe(dados.fontes) : [];
  // Sem a Function, "—" significa "não calculado", não "sem dados suficientes".
  const semValor =
    dados && dados.fontes.funcao === "falhou" ? "indisponível" : "sem dados suficientes";

  return (
    <section className="painel-secao" aria-labelledby="titulo-consolidada">
      <h3 id="titulo-consolidada">Visão consolidada</h3>
      {avisos.length > 0 && (
        <ul className="painel-avisos">
          {avisos.map((aviso) => (
            <li key={aviso}>{aviso}</li>
          ))}
        </ul>
      )}
      {dados && linhas.length === 0 && (
        <p className="painel-vazio">
          {dados.fontes.frota === "falhou"
            ? "Não há veículos para exibir enquanto o cadastro da frota estiver indisponível."
            : "Nenhum veículo cadastrado na frota ainda. Cadastre veículos no módulo Frota e registre abastecimentos para ver consumo médio e custo por km."}
        </p>
      )}
      {dados && linhas.length > 0 && (
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
                  <Celula valor={linha.consumoMedioKmL} formato={consumo} semValor={semValor} />
                  <Celula valor={linha.custoPorKm} formato={moeda.format} semValor={semValor} />
                  <Celula valor={linha.gastoTotal} formato={moeda.format} semValor={semValor} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Frota</th>
                <Celula valor={resumo?.consumoMedioKmL ?? null} formato={consumo} semValor={semValor} />
                <Celula valor={resumo?.custoPorKm ?? null} formato={moeda.format} semValor={semValor} />
                <Celula valor={resumo?.gastoTotal ?? null} formato={moeda.format} semValor={semValor} />
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

function Celula({
  valor,
  formato,
  semValor,
}: {
  valor: number | null;
  formato: (v: number) => string;
  semValor: string;
}) {
  if (valor === null) {
    return (
      <td>
        <span aria-hidden="true">—</span>
        <span className="visualmente-oculto">{semValor}</span>
      </td>
    );
  }
  return <td>{formato(valor)}</td>;
}
