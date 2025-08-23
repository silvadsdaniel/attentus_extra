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
- **Ajuste Polinomial**: Modelagem avançada da duração de chamadas
- **Análise Visual**: Gráficos e charts interativos usando Plotly
- **Upload de Dados**: Suporte para formatos de arquivo CSV e Excel
- **Exportar Resultados**: Download de resultados de otimização e análise

### 🖥️ Interface do Usuário
- **Interface Web Moderna**: Construída com Streamlit para design responsivo
- **Painel Interativo**: Métricas em tempo real e ações rápidas
- **Navegação Multi-página**: Fluxo de trabalho organizado com interface por abas
- **Responsivo para Mobile**: Funciona em desktop e dispositivos móveis

## Instalação

### Pré-requisitos
- Python 3.8 ou superior
- Gerenciador de pacotes pip

### Instruções de Configuração

1. **Clone ou Baixe** os arquivos do projeto para sua máquina local

2. **Instale as Dependências**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Execute a Aplicação**:
   ```bash
   streamlit run app.py
   ```

4. **Acesse o Sistema**:
   - Abra seu navegador web
   - Navegue para `http://localhost:8501`
   - Registre uma nova conta ou faça login

## Guia de Uso

### Configuração Inicial

1. **Registrar uma Conta**:
   - Clique em "Registrar" na página de login
   - Preencha seus dados (use função 'admin' para acesso completo)
   - Crie sua conta

2. **Login**:
   - Use suas credenciais para fazer login
   - Você será direcionado para o painel

### Executando uma Otimização

1. **Navegar para Otimização**:
   - Clique em "🔧 Otimização" na barra lateral

2. **Configurar Parâmetros**:
   - Defina horas operacionais e intervalos de tempo
   - Configure tipos de turno e custos
   - Ajuste parâmetros operacionais

3. **Upload de Dados**:
   - Baixe o template para dados de volume de chamadas
   - Preencha com seus dados históricos de chamadas
   - Faça upload dos arquivos de duração e volume

4. **Executar Análise**:
   - Use "Ajuste Polinomial" para verificar o ajuste dos dados
   - Clique em "Executar Otimização" para planejamento completo da força de trabalho

5. **Revisar Resultados**:
   - Visualize cronogramas detalhados de pessoal
   - Analise detalhamentos de custos
   - Baixe resultados para implementação

### Requisitos de Formato de Dados

#### Dados de Duração de Chamadas
Colunas obrigatórias:
- `percentagem_acumulada`: Porcentagem cumulativa (0 a 1)
- `duracao_conexao`: Duração da chamada em segundos

#### Dados de Volume de Chamadas
Colunas obrigatórias:
- `numero_medio_ligantes`: Número médio de chamadas por intervalo de tempo

## Suporte e Desenvolvimento

### Estrutura de Arquivos
```
attentus/
├── 📄 Arquivos Principais
│   ├── app.py                        # Aplicação principal com Streamlit
│   ├── requirements.txt              # Dependências Python
│   └── README.md                     # Documentação do projeto
│
├── 📁 auth/                          # Sistema de Autenticação
│   ├── autenticacao.py              # Lógica de autenticação
│   └── __pycache__/                 # Cache Python
│
├── 📁 dados/                        # Dados e Banco de Dados
│   ├── banco.py                     # Operações de banco de dados
│   ├── df_duracoes.xlsx            # Dados de exemplo - durações
│   ├── df_tabela_ligantes.xlsx     # Dados de exemplo - volume de chamadas
│   ├── nad.xlsx                    # Dados de disponibilidade de pessoal
│   ├── nan.xlsx                    # Dados de necessidade de atendentes
│   └── __pycache__/                # Cache Python
│
├── 📁 modelo/                       # Motor de Otimização
│   ├── attentus.py                 # Modelo principal de otimização
│   └── __pycache__/                # Cache Python
│
├── 📁 utilidades/                   # Funções Utilitárias
│   ├── utils.py                    # Processamento de dados e utilitários
│   └── __pycache__/                # Cache Python
│
├── 📁 paginas/                      # Páginas da Interface Web
│   ├── navegacao.py                # Sistema de navegação
│   ├── otimizacao.py              # Página de otimização
│   ├── indice.py                  # Página inicial/painel
│   ├── gerenciamento_usuarios.py  # Gerenciamento de usuários
│   ├── registramento.py           # Página de registro
│   ├── login.py                   # Página de login
│   └── __pycache__/               # Cache Python
│
├── 📄 Documentação e Análise
│   ├── nan_attentus_comentado.ipynb   # Notebook Jupyter com análise
│   ├── nan_attentus_comentado.html    # Versão HTML do notebook
│   ├── algoritmo_nan.pdf              # Documentação do algoritmo
│   └── attentus.pdf                   # Documentação técnica
│
└── 📁 Arquivos de Sistema
    ├── __pycache__/                   # Cache Python global
    ├── .git/                          # Controle de versão Git
    └── .gitignore                     # Configuração Git
```

#### Descrição dos Componentes

**Arquivos Principais:**
- `app.py`: Interface principal do usuário construída com Streamlit
- `requirements.txt`: Lista de todas as dependências Python necessárias

**Sistema de Autenticação (`auth/`):**
- Gerencia login, registro e controle de acesso de usuários
- Implementa segurança e sessões de usuário

**Dados (`dados/`):**
- `banco.py`: Operações de banco de dados SQLite
- Arquivos Excel com dados de exemplo para demonstração
- Templates de dados para upload do usuário

**Motor de Otimização (`modelo/`):**
- Contém o algoritmo principal usando programação linear (PuLP)
- Implementa o modelo matemático de otimização da força de trabalho

**Utilitários (`utilidades/`):**
- Funções auxiliares para processamento de dados
- Geração de resultados e análise polinomial

**Interface Web (`paginas/`):**
- Componentes modulares da interface do usuário
- Páginas separadas para cada funcionalidade do sistema

**Documentação:**
- Notebooks Jupyter com análise detalhada
- PDFs com documentação técnica e algoritmos