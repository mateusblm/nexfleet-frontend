// Respostas de edição e exclusão: 403 e 503 ganham texto próprio; as demais
// (404, 422) repassam a mensagem do servidor no formato {"message"}.
const mensagensPorStatus: Record<number, string> = {
  403: "Seu perfil não tem permissão para alterar operações. Peça acesso a um administrador.",
  503: "Operações está indisponível no momento. Tente novamente em instantes.",
};

/** Mensagem do corpo {"message"} da resposta de erro, ou `padrao` se não houver. */
export async function mensagemDoServidor(response: Response, padrao: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    if (body.message) return body.message;
  } catch { /* resposta sem JSON */ }
  return padrao;
}

export async function mensagemDeFalha(response: Response, padrao: string): Promise<string> {
  return mensagensPorStatus[response.status] ?? mensagemDoServidor(response, padrao);
}

export function autorizacao(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function cabecalhos(token: string): HeadersInit {
  return { ...autorizacao(token), "Content-Type": "application/json" };
}
