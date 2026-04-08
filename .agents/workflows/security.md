---
description: Use para auditar e verificar o código (Frontend e Backend) em busca de vulnerabilidades, seguindo rigorosamente os vetores de ataque do OWASP.
---

# Security Audit Workflow: Caça a Vulnerabilidades

Este workflow é focado em **auditoria expansiva de segurança**. Ele não foi feito apenas para forçar arquiteturas do zero, mas sim para vasculhar código existente com uma lente voltada a quebras, testando a flexibilidade e apontando explicitamente onde um atacante pode mirar.

A premissa mental contínua para executar este workflow é: **O sistema atual já é vulnerável e o cliente já está forjando dados. Onde o processo quebra e a base de dados vaza?**

---

## 🛡️ Parte 1: Auditoria Frontend (Client-Side Vectors)

### 1. Cross-Site Scripting (XSS) e Manipulação da DOM
- Procurar por pontos onde inputs do usuário são injetados diretamente no HTML (`innerHTML`, `v-html`, `dangerouslySetInnerHTML`) sem uso de biblioteca de DOMPurify ou escapes.
- **Roubo de Sessão via XSS:** Tokens (JWTs) estão salvos e legíveis em `localStorage` ou `sessionStorage`? Um script de terceiros conseguiria extraí-los? Preferência absoluta por Cookies \`HttpOnly\`.

### 2. Cross-Site Request Forgery (CSRF) & Clickjacking
- Chamadas sensíveis do tipo estado-mutável (POST, PUT, DELETE, ex: mudança de senha, transferências) estão protegidas por Tokens Anti-CSRF, ou dependem puramente e inseguramente dos cookies de sessão sem a diretiva \`SameSite=Strict\` / \`Lax\`?
- As páginas podem ser "envelopadas" de forma oculta em iFrames por sites maliciosos buscando cliques falsos? 

### 3. Exposição de Segredos e Business Logic Client-Side
- A UI previne ações com base em permissões puramente em Javascript (esconder botões) mas expõe segredos no bundle transpilado final?
- Há chaves de APIs privadas e credenciais de banco de dados e senhas internas fixadas (*hardcoded*) no código Frontend que podem ser achadas facilmente pelo \`DevTools\`?

---

## 🗡️ Parte 2: Auditoria Backend e APIs (Server-Side Vectors)

### 1. Quebra de Acesso de Referência Direta (IDOR / Broken Access Control)
- **IDOR (Insecure Direct Object Reference):** Se a API é chamada em \`/api/orders/293\`, o controller assume que o número enviado é de propriedade do usuário *sem questionar* e *sem checar o ID dele com a tabela Orders*?
- **Manipulação Horizontal e Vertical:** Eu posso passar um ID de outro usuário ou enviar \`"isAdmin": true\` em um Payload de atualização de perfil e ganhar privilégios de Admin que não possuía?

### 2. Confiança Cega e Lógica de Negócios (Insecure Business Logic)
- **Preços e Quantidades:** O backend aprova as ordens de pagamento confiando que o total enviado pelo Payload do Frontend ("total=1.00") está correto, sem recalcular pelo seu banco de dados baseado no *item_id*?
- Mass Assignment (Atribuição em Massa) mapeando indiscriminadamente objetos JSON do input para propriedades sensíveis do Model.

### 3. Injections Gerais (SQL, NoSQL, ORM, Command)
- Existem concatenações de Strings passando variáveis para bibliotecas de persistência ou bancos de dados sem uso forte de Parametrização estrita ou ORMs blindados (Prisma, Hibernate, Eloquent)?
- Há \`eval()\`, \`exec()\`, \`spawn()\` recebendo dados inofensivos nas pontas dos fluxos?

### 4. Broken Auth & Rate Limiting
- A verificação de Senha/Autenticação não possui limitação de tentativas de Rate Limit dando abertura a ataques brutos usando bibliotecas de dicionários?
- Autenticações sem proteção contra *Timing Attacks* em comparações de Strings de Hash.
- O Token JWT aceita header de assinaturas como *none* ou é verificado assíncronamente ignorando o vencimento lógico? Sessões ativas deixam o banco invictas ao Logout?

### 5. SSRF (Server-Side Request Forgery) e Webhooks não-autenticados
- O Node/Java do backend invoca uma Request cega HTTP usando a URL providenciada perfeitamente pelo usuário (\`req.body.image_url\`), possibilitando que faça requisições internas à serviços escondidos (Metadados AWS, portas locais de dev)?
- A API recebe notificações assíncronas de terceiros via Webhooks que pulam verificação de assinatura e hashes, podendo ser totalmente mockada atacando a ponta pública do webhook.

### 6. Misconfigurations, DOS via ReDos, e Exposição 
- Erros Internos da Infra (\`HTTP 500\`) imprimem o Stack Trace massivo em produção listando as diretorias internas da aplicação aos atacantes.
- Entradas de RegEx (Regular Expressions) desproporcionais ou não-validadas que bloqueiam as Threads do Node.js ocasionando DoS.

---

## Passo-a-passo: Executando no Agente

Quando exigido o **`/security`**, execute a auditoria do arquivo providenciado:
1. Revise seletivamente através do fluxo de ponta a ponta (Taint Analysis) do Controller ou rota enviada focando em onde o Input viaja desprotegido para a persistência.
2. Se vulnerabilidades exatas forem identificadas pelas diretrizes acima (Frontend ou Backend), categorize e imprima um modelo de Output:
   * 🛑 **Ameaça:** [Nome base da vulnerabilidade, EX: IDOR ou SQLi]
   * 🔥 **Severidade:** [Crítica, Alta, Média, Baixa]
   * 🔍 **Como Atacar (Prova de Conceito):** Se um atacante fizesse isso com o software agora, quais ferramentas ele usaria (Payload de Invasão ou cURL bruto)?
   * ✅ **Ação Corretiva:** Bloco de código mostrando a correção pontual dessa flexibilização de segurança e a respectiva tipagem protetiva.