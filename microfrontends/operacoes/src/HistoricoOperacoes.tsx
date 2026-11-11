import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { ErroAbastecimento, atualizarAbastecimento, excluirAbastecimento, type Abastecimento, type Vinculo } from "./abastecimentos-api";
import { ErroManutencao, atualizarManutencao, excluirManutencao, type Manutencao, type Veiculo } from "./manutencoes-api";

type Modo = "ver" | "editar" | "confirmar";

const falhaConexao = "Falha de conexão. Tente novamente.";
const mensagemErro = (error: unknown) =>
  (error instanceof ErroAbastecimento || error instanceof ErroManutencao ? error.message : falhaConexao);

export const dataAbastecimento = (item: Abastecimento) => new Date(item.realizadoEm).toLocaleDateString("pt-BR");
export const dataManutencao = (item: Manutencao) => new Date(`${item.realizadaEm}T12:00:00`).toLocaleDateString("pt-BR");
const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Estado de uma linha do histórico: leitura, edição ou confirmação de exclusão, com foco gerenciado. */
function useLinhaEditavel() {
  const [modo, setModoBruto] = useState<Modo>("ver");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const editar = useRef<HTMLButtonElement>(null);
  const excluir = useRef<HTMLButtonElement>(null);
  const primeiroCampo = useRef<HTMLSelectElement>(null);
  const cancelar = useRef<HTMLButtonElement>(null);
  const retorno = useRef<"editar" | "excluir" | null>(null);

  useEffect(() => {
    if (modo === "editar") primeiroCampo.current?.focus();
    else if (modo === "confirmar") cancelar.current?.focus();
    else if (retorno.current) (retorno.current === "editar" ? editar : excluir).current?.focus();
  }, [modo]);

  function setModo(novo: Modo) {
    if (novo === "ver") retorno.current = modo === "confirmar" ? "excluir" : "editar";
    setErro("");
    setModoBruto(novo);
  }

  async function executar(acao: () => Promise<void>) {
    setOcupado(true); setErro("");
    try { await acao(); } catch (error) { setErro(mensagemErro(error)); } finally { setOcupado(false); }
  }

  return { modo, setModo, ocupado, erro, executar, refs: { editar, excluir, primeiroCampo, cancelar } };
}

type Linha = ReturnType<typeof useLinhaEditavel>;

function AcoesLinha({ linha, rotulo, onEditar }: { linha: Linha; rotulo: string; onEditar: () => void }) {
  return <div className="acoes-linha">
    <button type="button" ref={linha.refs.editar} aria-label={`Editar ${rotulo}`} onClick={onEditar}>Editar</button>
    <button type="button" ref={linha.refs.excluir} className="perigo" aria-label={`Excluir ${rotulo}`} onClick={() => linha.setModo("confirmar")}>Excluir</button>
  </div>;
}

function ConfirmacaoExclusao({ linha, rotulo, onConfirmar }: { linha: Linha; rotulo: string; onConfirmar: () => void }) {
  const id = useId();
  function teclado(event: KeyboardEvent) {
    if (event.key === "Escape" && !linha.ocupado) { event.stopPropagation(); linha.setModo("ver"); }
  }
  const artigo = rotulo.startsWith("abastecimento") ? "do" : "da";
  return <div role="group" aria-label={`Confirmar exclusão ${artigo} ${rotulo}`} aria-describedby={id}
    className="confirmacao-exclusao" onKeyDown={teclado}>
    <p id={id}>Excluir {artigo === "do" ? "este" : "esta"} {rotulo.split(" ")[0]} definitivamente? Esta ação não pode ser desfeita.</p>
    {linha.erro && <p className="mensagem-validacao" role="alert">{linha.erro}</p>}
    <div className="acoes-linha">
      <button type="button" ref={linha.refs.cancelar} disabled={linha.ocupado} onClick={() => linha.setModo("ver")}>Cancelar</button>
      <button type="button" className="perigo" disabled={linha.ocupado} onClick={onConfirmar}>{linha.ocupado ? "Excluindo…" : "Excluir definitivamente"}</button>
    </div>
  </div>;
}

function FormularioEdicao({ linha, rotulo, onSubmit, children }: { linha: Linha; rotulo: string; onSubmit: () => void; children: ReactNode }) {
  const id = useId();
  function enviar(event: FormEvent) { event.preventDefault(); onSubmit(); }
  function teclado(event: KeyboardEvent) {
    if (event.key === "Escape" && !linha.ocupado) { event.stopPropagation(); linha.setModo("ver"); }
  }
  return <form aria-labelledby={id} className="formulario-edicao" onSubmit={enviar} onKeyDown={teclado}>
    <h4 id={id}>Editar {rotulo}</h4>
    {linha.erro && <p className="mensagem-validacao" role="alert">{linha.erro}</p>}
    {children}
    <div className="acoes-linha">
      <button type="submit" disabled={linha.ocupado}>{linha.ocupado ? "Salvando…" : "Salvar"}</button>
      <button type="button" disabled={linha.ocupado} onClick={() => linha.setModo("ver")}>Cancelar</button>
    </div>
  </form>;
}

type PropsAbastecimento = {
  token: string; item: Abastecimento; vinculos: Vinculo[]; veiculos: Veiculo[];
  onAtualizado: (item: Abastecimento) => void; onExcluido: (id: string) => void;
};

export function LinhaAbastecimento({ token, item, vinculos, veiculos, onAtualizado, onExcluido }: PropsAbastecimento) {
  const linha = useLinhaEditavel();
  const prefixo = useId();
  const [combustivel, setCombustivel] = useState(item.combustivel);
  const [litros, setLitros] = useState(String(item.litros));
  const [valorTotal, setValorTotal] = useState(String(item.valorTotal));
  const [quilometragem, setQuilometragem] = useState(String(item.quilometragem));
  const rotulo = `abastecimento de ${dataAbastecimento(item)}`;
  const placa = vinculos.find((v) => v.veiculoId === item.veiculoId)?.veiculoPlaca
    ?? veiculos.find((v) => v.id === item.veiculoId)?.placa ?? "Veículo não listado";
  const motorista = vinculos.find((v) => v.motoristaId === item.motoristaId)?.motoristaNome ?? "Motorista sem vínculo ativo";

  function abrirEdicao() {
    setCombustivel(item.combustivel); setLitros(String(item.litros));
    setValorTotal(String(item.valorTotal)); setQuilometragem(String(item.quilometragem));
    linha.setModo("editar");
  }

  const salvar = () => linha.executar(async () => {
    const atualizado = await atualizarAbastecimento(token, item.id, {
      combustivel, litros: Number(litros), valorTotal: Number(valorTotal), quilometragem: Number(quilometragem) });
    onAtualizado(atualizado);
    linha.setModo("ver");
  });
  const excluir = () => linha.executar(async () => { await excluirAbastecimento(token, item.id); onExcluido(item.id); });

  if (linha.modo === "editar") {
    const campo = (nome: string) => `${prefixo}-${nome}`;
    return <li className="linha-em-edicao">
      <strong>{item.combustivel} · {item.litros.toFixed(2)} L</strong>
      <FormularioEdicao linha={linha} rotulo={rotulo} onSubmit={salvar}>
        <dl className="campos-fixos">
          <div><dt>Data e hora</dt><dd>{new Date(item.realizadoEm).toLocaleString("pt-BR")}</dd></div>
          <div><dt>Veículo</dt><dd>{placa}</dd></div>
          <div><dt>Motorista</dt><dd>{motorista}</dd></div>
        </dl>
        <label htmlFor={campo("combustivel")}>Combustível</label>
        <select id={campo("combustivel")} ref={linha.refs.primeiroCampo} value={combustivel} onChange={(e) => setCombustivel(e.target.value)}>
          {["DIESEL", "GASOLINA", "ETANOL", "GNV"].concat(["DIESEL", "GASOLINA", "ETANOL", "GNV"].includes(item.combustivel) ? [] : [item.combustivel])
            .map((opcao) => <option key={opcao}>{opcao}</option>)}
        </select>
        <label htmlFor={campo("litros")}>Litros</label>
        <input id={campo("litros")} type="number" min="0.01" step="0.01" required value={litros} onChange={(e) => setLitros(e.target.value)} />
        <label htmlFor={campo("valor")}>Valor total</label>
        <input id={campo("valor")} type="number" min="0.01" step="0.01" required value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
        <label htmlFor={campo("km")}>Quilometragem</label>
        <input id={campo("km")} type="number" min="1" step="1" required value={quilometragem} onChange={(e) => setQuilometragem(e.target.value)} />
      </FormularioEdicao>
    </li>;
  }

  return <li>
    <strong>{item.combustivel} · {item.litros.toFixed(2)} L</strong>
    <span>{item.quilometragem.toLocaleString("pt-BR")} km</span>
    <span>{moeda(item.valorTotal)}</span>
    <span>{new Date(item.realizadoEm).toLocaleString("pt-BR")}</span>
    {linha.modo === "confirmar"
      ? <ConfirmacaoExclusao linha={linha} rotulo={rotulo} onConfirmar={excluir} />
      : <AcoesLinha linha={linha} rotulo={rotulo} onEditar={abrirEdicao} />}
  </li>;
}

type PropsManutencao = {
  token: string; item: Manutencao; veiculos: Veiculo[];
  onAtualizado: (item: Manutencao) => void; onExcluido: (id: string) => void;
};

const tipos: [string, string][] = [["PREVENTIVA", "Preventiva"], ["CORRETIVA", "Corretiva"], ["REVISAO", "Revisão"],
  ["TROCA_OLEO", "Troca de óleo"], ["TROCA_PNEUS", "Troca de pneus"], ["OUTROS", "Outros"]];

export function LinhaManutencao({ token, item, veiculos, onAtualizado, onExcluido }: PropsManutencao) {
  const linha = useLinhaEditavel();
  const prefixo = useId();
  const [tipo, setTipo] = useState(item.tipo);
  const [realizadaEm, setRealizadaEm] = useState(item.realizadaEm);
  const [quilometragem, setQuilometragem] = useState(String(item.quilometragem));
  const [descricao, setDescricao] = useState(item.descricao);
  const [oficina, setOficina] = useState(item.oficina);
  const [valor, setValor] = useState(String(item.valor));
  const [proxima, setProxima] = useState(item.proximaManutencao ?? "");
  const rotulo = `manutenção de ${dataManutencao(item)}`;
  const veiculo = veiculos.find((v) => v.id === item.veiculoId);

  function abrirEdicao() {
    setTipo(item.tipo); setRealizadaEm(item.realizadaEm); setQuilometragem(String(item.quilometragem));
    setDescricao(item.descricao); setOficina(item.oficina); setValor(String(item.valor));
    setProxima(item.proximaManutencao ?? "");
    linha.setModo("editar");
  }

  const salvar = () => linha.executar(async () => {
    const atualizado = await atualizarManutencao(token, item.id, { tipo, realizadaEm,
      quilometragem: Number(quilometragem), descricao, oficina, valor: Number(valor), proximaManutencao: proxima || null });
    onAtualizado(atualizado);
    linha.setModo("ver");
  });
  const excluir = () => linha.executar(async () => { await excluirManutencao(token, item.id); onExcluido(item.id); });

  if (linha.modo === "editar") {
    const campo = (nome: string) => `${prefixo}-${nome}`;
    return <li className="linha-em-edicao">
      <strong>{item.tipo.replaceAll("_", " ")}</strong>
      <FormularioEdicao linha={linha} rotulo={rotulo} onSubmit={salvar}>
        <dl className="campos-fixos">
          <div><dt>Veículo</dt><dd>{veiculo ? `${veiculo.placa} · ${veiculo.modelo}` : "Veículo não listado"}</dd></div>
        </dl>
        <label htmlFor={campo("tipo")}>Tipo</label>
        <select id={campo("tipo")} ref={linha.refs.primeiroCampo} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {tipos.map(([valorTipo, nome]) => <option key={valorTipo} value={valorTipo}>{nome}</option>)}
        </select>
        <label htmlFor={campo("data")}>Data</label>
        <input id={campo("data")} type="date" required value={realizadaEm} onChange={(e) => setRealizadaEm(e.target.value)} />
        <label htmlFor={campo("km")}>Quilometragem</label>
        <input id={campo("km")} type="number" min="0" step="1" required value={quilometragem} onChange={(e) => setQuilometragem(e.target.value)} />
        <label htmlFor={campo("descricao")}>Descrição</label>
        <input id={campo("descricao")} maxLength={500} required value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <label htmlFor={campo("oficina")}>Oficina</label>
        <input id={campo("oficina")} maxLength={150} required value={oficina} onChange={(e) => setOficina(e.target.value)} />
        <label htmlFor={campo("valor")}>Valor</label>
        <input id={campo("valor")} type="number" min="0" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} />
        <label htmlFor={campo("proxima")}>Próxima manutenção (opcional)</label>
        <input id={campo("proxima")} type="date" value={proxima} onChange={(e) => setProxima(e.target.value)} />
      </FormularioEdicao>
    </li>;
  }

  return <li>
    <strong>{item.tipo.replaceAll("_", " ")}</strong>
    <span>{item.descricao}</span>
    <span>{item.oficina}</span>
    <span>{item.quilometragem.toLocaleString("pt-BR")} km</span>
    <span>{moeda(item.valor)}</span>
    <span>{dataManutencao(item)}</span>
    {linha.modo === "confirmar"
      ? <ConfirmacaoExclusao linha={linha} rotulo={rotulo} onConfirmar={excluir} />
      : <AcoesLinha linha={linha} rotulo={rotulo} onEditar={abrirEdicao} />}
  </li>;
}
