// Respostas de edição e exclusão: 403 e 503 ganham texto próprio; as demais
// (404, 422) repassam a mensagem do servidor no formato {"message"}.
const mensagensPorStatus: Record<number, string> = {
  403: "Seu perfil não tem permissão para alterar operações. Peça acesso a um administrador.",
  503: "Operações está indisponível no momento. Tente novamente em instantes.",
};

export async function mensagemDeFalha(response: Response, padrao: string): Promise<string> {
  const fixa = mensagensPorStatus[response.status];
  if (fixa) return fixa;
  try {
    const body = (await response.json()) as { message?: string };
    if (body.message) return body.message;
  } catch { /* resposta sem JSON */ }
  return padrao;
}

export function cabecalhos(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}
