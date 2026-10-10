# Calma Calma Calabreso Simulator

Clicker para navegador com pets, ovos, eventos temporários, renascimento, salvamento local e sincronização opcional com Google/Firebase.

## Publicar no GitHub Pages
1. Crie um repositório novo chamado `calma-calma-calabreso`.
2. Envie todos os arquivos deste pacote para a raiz do repositório.
3. Vá em **Settings > Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/ (root)`, depois clique em **Save**.
6. Aguarde o link do Pages aparecer e abra-o.

## Login Google e salvamento na nuvem (opcional)
Sem Firebase, o jogo já salva automaticamente no navegador e permite exportar/importar backup.

1. Crie um projeto em https://console.firebase.google.com/
2. Adicione um app Web e copie a configuração para `firebase-config.js`.
3. Em **Authentication > Sign-in method**, ative Google.
4. Crie um banco **Firestore Database**.
5. Na área **Firestore > Rules**, publique o conteúdo de `firestore.rules`.
6. Em **Authentication > Settings > Authorized domains**, confirme que o domínio do GitHub Pages está autorizado.
7. Faça commit das alterações e recarregue o site.

Nunca coloque senha de Google no código. A configuração do Firebase é pública; as regras garantem que cada usuário só possa acessar o próprio documento de salvamento.

## Mecânicas
- Limite de 1.000.000 de cliques por vida.
- Renascimento reseta cliques, mantém os pets e acrescenta 1,5% de bônus permanente por renascimento.
- Até 3 pets equipados; os multiplicadores dos pets equipados são multiplicados.
- Ovo Apimentado: 500 cliques; Ovo Churrasqueiro: 5.000; Ovo Divino: 50.000.
- Eventos positivos e negativos temporários.
- Backup JSON, salvamento local automático e login/sincronização opcional via Firebase.
- Não existe sistema de fome, cuidado ou perda permanente de pets.
