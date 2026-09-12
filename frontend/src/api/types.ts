/**
 * Espelha app/schemas.py campo a campo (mesmo nome, snake_case) — o objetivo é
 * bater com a resposta real da API sem uma camada de tradução no meio.
 */

export type Prioridade = 'Alta' | 'Média' | 'Baixa'
export type StatusAtividade = 'Pendente' | 'Em Andamento' | 'Concluída'
export type StatusAcompanhamento = 'Em Andamento' | 'Finalizado' | 'Pausado'
export type StatusTodo = 'todo' | 'testando' | 'em-progresso' | 'concluido'
export type GrauPositivo = 'Bom' | 'Otimo' | 'Perfeito'
export type GrauNegativo = 'Critico' | 'Medio' | 'Baixo' | 'Evoluido'
export type TipoPonto = 'positivo' | 'negativo'
export type FaixaIdade = 'em-dia' | 'atencao' | 'parado'

export interface Pessoa {
  id: number
  nome: string
  data_admissao: string
  ultimo_1a1: string | null
}

export interface Atividade {
  id: number
  nome: string
  prioridade: Prioridade
  descricao: string | null
  status: StatusAtividade
  criado_em: string
  arquivada_em: string | null
  dias_parado: number
  faixa: FaixaIdade
}

export interface Todo {
  id: number
  texto: string
  concluido: boolean
  status: StatusTodo
  nivel: number
  criado_em: string
}

export interface Acompanhamento {
  id: number
  atividade: string
  atividade_id: number | null
  pessoa: string
  pessoa_id_equipe: number | null
  status: StatusAcompanhamento
  observacoes: string | null
  criado_em: string
}

export interface Anotacao {
  id: number
  pessoa_id: number
  texto: string
  em: string
  criado_em: string
}

export interface Ponto {
  id: number
  pessoa_id: number
  tipo: TipoPonto
  texto: string
  grau: GrauPositivo | GrauNegativo
  criado_em: string
  resolvido_em: string | null
}

export interface Reuniao {
  id: number
  titulo: string
  em: string
  texto: string
  criado_em: string
  atualizado_em: string
}

export interface MarcoProgressao {
  id: string
  titulo: string
  secoes: { titulo: string; itens: string[] }[]
}

export interface Pauta {
  pessoa: { id: number; nome: string }
  tempo_de_casa: string
  marco_atual: MarcoProgressao
  proximo_marco: MarcoProgressao | null
  desde: string | null
  novidades: { em: string; texto: string }[]
  anteriores: { em: string; texto: string }[]
  abertos: { texto: string; grau: GrauNegativo }[]
  evoluidos: { texto: string; grau: GrauNegativo; resolvido_em: string | null }[]
  fortes: { texto: string; grau: GrauPositivo }[]
}
