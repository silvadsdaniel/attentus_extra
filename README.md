# Attentus - Sistema de Otimização da Força de Trabalho

## Visão Geral

Attentus é um sistema abrangente de otimização da força de trabalho projetado para call centers e operações de atendimento ao cliente. Ele usa otimização matemática avançada para determinar o número ideal de funcionários necessários em diferentes horários do dia, considerando vários padrões de turno e restrições operacionais.

## Funcionalidades

### 🔐 Sistema de Autenticação
- **Registro e Login de Usuário**: Autenticação segura de usuário com hash de senha
- **Controle de Acesso Baseado em Função**: Funções de administrador e usuário com diferentes permissões
- **Gerenciamento de Usuários**: Administradores podem gerenciar usuários, funções e permissões de acesso
- **Gerenciamento de Sessão**: Rastrear sessões e atividades do usuário

### 🎯 Motor de Otimização
- **Planejamento da Força de Trabalho**: Calcular níveis ideais de pessoal baseado no volume de chamadas
- **Múltiplos Tipos de Turno**: Suporte para diferentes durações e custos de turno
- **Análise em Tempo Real**: Ajuste interativo de parâmetros e resultados instantâneos
- **Otimização de Custos**: Minimizar custos operacionais totais enquanto atende aos níveis de serviço

### 📊 Análise de Dados
- **Ajuste Polinomial**: Modelagem da duração de chamadas, com gráfico e R² na hora
- **Análise Visual**: Gráfico de cobertura (atendentes necessários × escalados) ao longo do dia
- **Upload de Dados**: Arquivos CSV e Excel validados assim que são enviados
- **Exportar Resultados**: Escala de entrada em CSV, pronta para abrir no Excel

### 🖥️ Interface do Usuário
- **Frontend em React**: React + TypeScript + Tailwind CSS (Vite), com gráficos Recharts
- **API em FastAPI**: o modelo, a simulação e o banco continuam em Python, servidos em `/api`
- **Painel**: custo, equipe, pico de demanda e cobertura da última otimização
- **Responsivo**: barra lateral no computador, menu recolhível no celular

## Instalação

### Pré-requisitos
- Python 3.10 ou superior
- Node.js 20 ou superior (para o frontend)

### Desenvolvimento

1. **Instale as dependências do Python** (na raiz do projeto):
   ```bash
   pip install -r requirements.txt
   ```

2. **Suba a API** (porta 8000):
   ```bash
   uvicorn api.main:app --reload --port 8000
   ```

3. **Em outro terminal, suba o frontend** (porta 5173):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Acesse** `http://localhost:5173`. O Vite repassa as chamadas `/api` para a API.

### Produção

Compile o frontend uma vez; a própria API passa a servir as páginas:

```bash
cd frontend && npm ci && npm run build && cd ..
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Variáveis de ambiente:

| Variável | Para que serve |
|---|---|
| `ATTENTUS_SECRET_KEY` | Chave das sessões. Use um valor secreto e fixo; sem ela, uma chave aleatória é gerada a cada inicialização e todos precisam entrar de novo quando o servidor reinicia. |
| `ATTENTUS_DB_PATH` | Caminho do banco SQLite (padrão: `dados/usuarios.db`). Em hospedagem, aponte para um disco persistente. |

Rode **um único processo** (sem `--workers`): o banco é SQLite e, sem `ATTENTUS_SECRET_KEY`, cada
processo teria uma chave diferente.

A documentação interativa da API fica em `http://localhost:8000/docs`, e `GET /api/saude` responde
`{"status": "ok"}` para verificações de saúde.

### Docker

O `Dockerfile` compila o frontend e monta a imagem da API (que confere no build se o solver CBC roda):

```bash
docker build -t attentus .
docker run -p 8000:8000 -e ATTENTUS_SECRET_KEY=troque-isto -v attentus-dados:/data attentus
```

O banco fica no volume montado em `/data`. O `dados/usuarios.db` do repositório não entra na imagem.

### Publicar no Render

O arquivo `render.yaml` descreve o serviço: imagem Docker, disco persistente de 1 GB em `/data`,
chave de sessão gerada pelo Render e verificação de saúde em `/api/saude`.

1. No [Render](https://dashboard.render.com), clique em **New → Blueprint** e conecte o repositório
   `attentus_extra` (branch `main`).
2. Revise o serviço `attentus` e confirme. O plano é o menor pago (`0.5c-512mb`), porque disco
   persistente não existe no plano gratuito; o preço aparece nessa tela.
3. Aguarde o primeiro build (alguns minutos) e abra a URL `https://attentus-xxxx.onrender.com`.
4. **Crie sua conta logo em seguida**: num banco novo, a primeira conta vira administrador.
   As próximas contas criadas pelo cadastro público são usuários comuns.

A cada push na `main`, o Render publica de novo automaticamente. Com disco persistente, o serviço
fica alguns segundos fora do ar durante cada deploy (o Render para a versão antiga antes de subir a
nova). Domínio próprio e HTTPS são configurados em **Settings → Custom Domains**.

## Guia de Uso

### Configuração Inicial

1. **Criar uma conta**: clique em "Criar conta" na tela de entrada. Se ainda não houver nenhum
   administrador, a primeira conta criada vira **administrador**; as seguintes são usuários comuns.
   Administradores podem promover outras contas em **Usuários**.

2. **Entrar**: use suas credenciais; você será levado ao painel.

### Executando uma Otimização

1. **Abra "Otimização"** no menu lateral.

2. **Configure os parâmetros**: horas de operação, horário de início, intervalo de análise, tipos de
   turno com seus custos, espera máxima e pausa entre ligações.

3. **Envie os dados**: o arquivo de duração das ligações e o de volume por período. Baixe a
   **planilha-modelo** para ter exatamente os períodos da configuração atual, ou clique em
   **Usar dados de exemplo** para experimentar com as planilhas de `dados/`.

4. **Confira a curva de duração**: o gráfico mostra o ajuste polinomial e o R²; ajuste o grau se
   necessário.

5. **Execute**: os resultados mostram custo diário, atendentes escalados, a cobertura do dia, a
   escala de entrada por horário (exportável em CSV) e o custo por tipo de turno.

### Requisitos de Formato de Dados

#### Dados de Duração de Chamadas
Colunas obrigatórias:
- `percentagem_acumulada`: Porcentagem cumulativa (0 a 1)
- `duracao_conexao`: Duração da chamada em segundos

#### Dados de Volume de Chamadas
Colunas obrigatórias (a planilha-modelo já vem com elas):
- `hora_inicio`: Início do período (HH:MM)
- `numero_medio_ligantes`: Número médio de chamadas no período (inteiro)

O arquivo precisa ter uma linha por período da configuração (ex.: 96 linhas para 24 h em
intervalos de 15 min).

## Suporte e Desenvolvimento

### Estrutura de Arquivos
```
attentus/
├── requirements.txt                 # Dependências Python (API e modelo)
├── Dockerfile                       # Imagem de produção (frontend compilado + API)
├── render.yaml                      # Blueprint de deploy no Render
├── README.md
│
├── api/                             # API FastAPI
│   ├── main.py                      # Aplicação, rotas e entrega do frontend compilado
│   ├── seguranca.py                 # Tokens JWT, usuário atual e validações
│   ├── rotas_auth.py                # Entrar, criar conta, sessão atual
│   ├── rotas_usuarios.py            # Gerenciamento de usuários (admin)
│   └── rotas_otimizacao.py          # Planilha-modelo, validação de arquivos, ajuste e otimização
│
├── frontend/                        # Interface React (Vite + TypeScript + Tailwind)
│   ├── src/App.tsx                  # Rotas e controle de acesso
│   ├── src/pages/                   # Entrar, Cadastro, Painel, Otimização, Usuários
│   ├── src/components/              # Layout, gráficos, componentes de interface
│   └── src/lib/                     # Cliente da API, sessão, estado e regras da otimização
│
├── dados/
│   ├── banco.py                     # Operações de banco de dados SQLite
│   ├── df_duracoes.xlsx             # Dados de exemplo - durações
│   ├── df_tabela_ligantes.xlsx      # Dados de exemplo - volume de chamadas
│   ├── nad.xlsx                     # Dados de disponibilidade de pessoal
│   └── nan.xlsx                     # Dados de necessidade de atendentes
│
├── modelo/
│   └── attentus.py                  # Modelo de otimização (PuLP)
│
└── utilidades/
    └── utils.py                     # Processamento de dados, simulação e ajuste polinomial
```

#### Descrição dos Componentes

**API (`api/`):**
- Expõe o modelo de otimização, a simulação de demanda e o gerenciamento de usuários em `/api`
- Autenticação por token (JWT); o usuário é relido do banco a cada requisição

**Frontend (`frontend/`):**
- Aplicação React de página única; durante o desenvolvimento roda no Vite (`npm run dev`)
- Em produção, `npm run build` gera `frontend/dist`, servido pela própria API

**Dados (`dados/`):**
- `banco.py`: Operações de banco de dados SQLite
- Arquivos Excel com dados de exemplo para demonstração

**Motor de Otimização (`modelo/`):**
- Contém o algoritmo principal usando programação linear (PuLP)
- Implementa o modelo matemático de otimização da força de trabalho

**Utilitários (`utilidades/`):**
- Funções auxiliares para processamento de dados
- Simulação da demanda (NAN), ajuste polinomial e geração de resultados
