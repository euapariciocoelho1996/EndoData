# Guia de Uso do Docker

Este projeto está configurado para rodar em containers Docker. Existem duas opções: desenvolvimento e produção.

## Pré-requisitos
- npm install
- npm install firebase
- Docker instalado ([Download Docker](https://www.docker.com/get-started))
- Docker Compose instalado (geralmente vem com o Docker Desktop)

## Opção 1: Desenvolvimento

### Usando Docker Compose (Recomendado)

Para iniciar o ambiente de desenvolvimento:

```bash
docker-compose up app-dev
```

Ou para rodar em background:

```bash
docker-compose up -d app-dev
```

A aplicação estará disponível em: `http://localhost:5173`

### Usando Docker diretamente

```bash
# Build da imagem de desenvolvimento
docker build -f Dockerfile.dev -t pdsi-3-dev .

# Executar container
docker run -p 5173:5173 -v $(pwd):/app -v /app/node_modules pdsi-3-dev
```

## Opção 2: Produção

### Usando Docker Compose (Recomendado)

Para buildar e iniciar a aplicação em modo produção:

```bash
docker-compose up app-prod
```

Ou para rodar em background:

```bash
docker-compose up -d app-prod
```

A aplicação estará disponível em: `http://localhost:80`

### Usando Docker diretamente

```bash
# Build da imagem de produção
docker build -t pdsi-3-prod .

# Executar container
docker run -p 80:80 pdsi-3-prod
```

## Comandos Úteis

### Parar containers

```bash
docker-compose down
```

### Ver logs

```bash
# Logs do serviço de desenvolvimento
docker-compose logs -f app-dev

# Logs do serviço de produção
docker-compose logs -f app-prod
```

### Rebuild das imagens

```bash
# Rebuild forçado
docker-compose build --no-cache

# Rebuild e iniciar
docker-compose up --build
```

### Acessar shell do container

```bash
# Desenvolvimento
docker-compose exec app-dev sh

# Produção
docker-compose exec app-prod sh
```

### Limpar containers e imagens

```bash
# Parar e remover containers
docker-compose down

# Remover imagens também
docker-compose down --rmi all

# Limpar volumes não utilizados
docker volume prune
```

## Variáveis de Ambiente

Se você precisar configurar variáveis de ambiente, você pode:

1. Criar um arquivo `.env` na raiz do projeto
2. Adicionar as variáveis no `docker-compose.yml` na seção `environment`

Exemplo no `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - VITE_API_URL=https://api.exemplo.com
```

## Notas Importantes

- **Desenvolvimento**: Os arquivos são montados como volume, então as mudanças no código são refletidas automaticamente
- **Produção**: A aplicação é buildada e servida pelo Nginx, otimizada para performance
- **Porta 5173**: Porta padrão do Vite em desenvolvimento
- **Porta 80**: Porta padrão do HTTP em produção

## Troubleshooting

### Porta já está em uso

Se a porta 5173 ou 80 já estiver em uso, você pode alterar no `docker-compose.yml`:

```yaml
ports:
  - "3000:5173"  # Altera a porta externa para 3000
```

### Problemas com node_modules

Se houver problemas com `node_modules`, você pode:

```bash
docker-compose down -v
docker-compose up --build
```

### Cache do Docker

Para limpar o cache do Docker:

```bash
docker system prune -a
```

