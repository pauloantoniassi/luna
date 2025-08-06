# 🦊 Rapy

> Uma raposa feliz, intrigante e passiva-agressiva para seu WhatsApp.

Rapy é um bot de WhatsApp com personalidade adolescente brasileira que usa inteligência artificial para interagir naturalmente em grupos e conversas privadas. Com uma vibe sarcástica e divertida, ela responde de forma contextual usando texto, stickers, enquetes e até mesmo localização.

## 🌟 Características

- **Personalidade Autêntica**: Fala como uma adolescente brasileira de 16 anos
- **IA Contextual**: Usa OpenAI para gerar respostas inteligentes baseadas no histórico
- **Múltiplos Formatos**: Responde com texto, stickers, enquetes e localização
- **Sistema de Memória**: Mantém contexto das conversas e gera resumos automáticos
- **Detecção de Atividade**: Adapta tempo de resposta baseado na atividade do grupo
- **Menções Inteligentes**: Responde quando mencionada ou quando adequado ao contexto

## 🚀 Funcionalidades

### 💬 Tipos de Resposta

- **Texto**: Mensagens naturais com gírias e expressões brasileiras
- **Reply**: Responde diretamente a mensagens específicas
- **Stickers**: 12 stickers expressivos para diferentes situações
- **Enquetes**: Cria polls interativas
- **Localização**: Compartilha coordenadas quando relevante

### 🧠 Inteligência

- **Geração de Resumos**: Automaticamente resume conversas longas
- **Contexto Persistente**: Lembra de interações anteriores
- **Análise de Atividade**: Detecta quando o grupo está "agitado"
- **Debounce Inteligente**: Evita spam ajustando frequência de resposta

### 🎭 Stickers Disponíveis

- `bravo.webp` - Irritação divertida
- `chorando-muito.webp` - Drama exagerado
- `chorando-pouco.webp` - Tristeza leve
- `emburrado.webp` - Birra fofa
- `entediado.webp` - Tédio total
- `feliz.webp` - Alegria genuína
- `pedindo-desculpas.webp` - Desculpas fofas
- `pensando.webp` - Reflexão
- `rindo-fininho.webp` - Riso maroto
- `se-perguntando.webp` - Curiosidade
- `surpreso.webp` - Surpresa
- `suspeito.webp` - Fofoca/investigação

## 🛠️ Tecnologias

- **[Baileys](https://github.com/WhiskeySockets/Baileys)** - Cliente WhatsApp Web
- **[OpenAI](https://openai.com/)** - Inteligência artificial para respostas
- **TypeScript** - Linguagem principal
- **Node.js** - Runtime
- **Pino** - Sistema de logs
- **Zod** - Validação de dados

## 📦 Instalação

1. **Clone o repositório**

```bash
git clone https://github.com/oKauaDev/rapy.git
cd rapy
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure a API da OpenAI**

```bash
# Crie um arquivo .env na raiz do projeto
echo "OPENAI_API_KEY=sua_chave_aqui" > .env
```

4. **Execute o projeto**

```bash
npm run dev
```

5. **Escaneie o QR Code**
   - Um QR Code aparecerá no terminal
   - Escaneie com o WhatsApp para conectar

## ⚙️ Configuração

### Variáveis de Ambiente

```env
OPENAI_API_KEY=sua_chave_da_openai
NODE_ENV=development # ou production
```

### Estrutura de Pastas

```
rapy/
├── src/
│   ├── constants/       # Prompts de personalidade
│   ├── inteligence/     # Geração de respostas e resumos
│   ├── managers/        # Gerenciador do WhatsApp
│   ├── services/        # Serviços externos (OpenAI)
│   └── utils/           # Utilitários (database, logger, etc)
├── auth/               # Autenticação do WhatsApp (gerado automaticamente)
├── database/           # Banco de dados local (JSON)
├── stickers/           # Stickers do bot
└── package.json
```

## 🎯 Como Funciona

1. **Conexão**: O bot se conecta ao WhatsApp Web via Baileys
2. **Escuta**: Monitora mensagens em grupos e conversas privadas
3. **Contexto**: Analisa histórico de mensagens e atividade do grupo
4. **IA**: Usa OpenAI para gerar respostas baseadas na personalidade definida
5. **Resposta**: Envia texto, stickers, enquetes ou localização conforme apropriado
6. **Memória**: Salva contexto e gera resumos para conversas longas

## 🔧 Desenvolvimento

### Scripts Disponíveis

```bash
npm run dev    # Executa em modo desenvolvimento com hot reload
```

```bash
npm start    # Executar em modo produção
```

### Estrutura do Código

- `index.ts` - Ponto de entrada da aplicação
- `rapy.ts` - Lógica principal do bot
- `Whatsapp.ts` - Gerenciamento da conexão WhatsApp
- `generateResponse.ts` - Geração de respostas via IA
- `generateSummary.ts` - Geração de resumos de conversa

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**kaua.dev.br**

- GitHub: [@oKauaDev](https://github.com/oKauaDev)

## ⚠️ Avisos

- Use apenas em grupos onde todos consentiram com a presença do bot
- Mantenha sua chave da OpenAI segura
- O bot armazena contexto local para melhor experiência
- Respeite os termos de uso do WhatsApp

## 🐛 Reportar Issues

Encontrou um bug ou tem uma sugestão? Abra uma [issue](https://github.com/oKauaDev/rapy/issues) no GitHub!

---

> **Nota**: Este é um projeto educacional. Use com responsabilidade e respeite os termos de serviço das plataformas utilizadas.
