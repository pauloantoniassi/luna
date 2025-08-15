export const SUMMARY_PROMPT = `
Crie suas memórias pessoais sobre as conversas no grupo, mantendo a sua personalidade única.

## INPUTS
### Chat
*Name*: {{chatName}}

### Resumo anterior
{{previousSummary}}

### Mensagens recentes
{{newMessages}}

## COMO CRIAR O RESUMO:

### Perspectiva Pessoal
- Escreva como SUA memória pessoal, usando sua personalidade única
- Inclua suas reações, pensamentos e interpretações dos eventos
- Mantenha tom consistente com sua personalidade

### Pesos Temporais e de Conteúdo
**TEMPORAIS**:
- Mensagens últimas 24h: peso 1.0
- Mensagens 1-7 dias: peso 0.8
- Mensagens 7-21 dias: peso 0.6
- Mensagens 21-35 dias: peso 0.4
- Mensagens >35 dias: peso 0.1
- Eventos marcantes: peso mínimo 0.8 (independente da data)

**MODIFICADORES DE CONTEÚDO**:
- Fatos relevantes sobre interlocutores: +0.2
- Fofocas ou informações pessoais: +0.1
- Conversa fiada, small talks ou mensagens vazias: -0.1

**ALTA PRIORIDADE** (sempre incluir):
- Conflitos, reconciliações ou mudanças de dinâmica
- Revelações pessoais ou fatos marcantes sobre membros
- Piadas, memes ou referências que se tornaram muito recorrentes
- Decisões do grupo ou mudanças significativas
- Momentos emotivos que impactaram o ambiente

**MÉDIA PRIORIDADE** (incluir se relevante):
- Conversas longas com múltiplos participantes
- Debates sobre temas específicos
- Padrões de comportamento novos ou mudanças sutis
- Interações frequentes entre pessoas específicas

**BAIXA PRIORIDADE** (mencionar brevemente se for relevante):
- Mensagens triviais ou sem impacto significativo
- Conversas sobre eventos passados sem relevância atual
- Cumprimentos e despedidas rotineiras
- Compartilhamento de links sem discussão
- Mensagens informativas simples

## DIRETRIZES DE ESCRITA:

- **Tamanho**: Até 8000 caracteres, mas evitar passar de 5000 se possível
- **Tom**: Informal, como diário pessoal
- **Foco**: Sua perspectiva única, não narração neutra
- **Detalhes**: Específicos sobre quem disse/fez o quê
- **Conexões**: Relate eventos atuais com histórico do grupo

## OUTPUT ESPERADO:

\`\`\`json
{
  "summary": "<resumo detalhado na SUA perspectiva, integrando resumo anterior com novas informações>"
}
\`\`\`

## REGRAS IMPORTANTES:

1. **Continuidade**: Integre o resumo anterior com novas informações, mantenha o fluxo da narrativa
2. **Consistência**: Mantenha personalidade coerente ao longo do tempo
3. **Relevância**: Foque no que realmente importa para a dinâmica do grupo
4. **Preservação**: Integre e evolua informações existentes, nunca as descarte
5. **Especificidade**: Prefira detalhes concretos a generalidades
6. **Contextualização**: Explique mudanças e desenvolvimentos importantes
`;
