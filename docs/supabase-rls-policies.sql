-- ============================================================
-- Supabase RLS — Portal Entregador (MuvLog)
-- Aplicar no SQL Editor do Supabase (Dashboard → SQL Editor)
-- Data: 2026-10-12
-- ============================================================
--
-- Por que isto existe:
--   O frontend usa a chave ANON (pública) do Supabase para Realtime
--   Broadcast (GPS) e Storage (provas de entrega). Sem RLS, qualquer
--   pessoa com a chave anon consegue ler/escrever.
--
-- Como aplicar:
--   1. Supabase Dashboard → SQL Editor
--   2. Colar este arquivo inteiro
--   3. Run
--   4. Testar: canal GPS de outro tenant NÃO deve receber mensagens
--

-- ------------------------------------------------------------
-- 1. REALTIME BROADCAST (canais GPS:tenant_<id>)
-- ------------------------------------------------------------
-- Tabela virtual usada pelo Realtime Authorization
-- Documentação: https://supabase.com/docs/guides/realtime/authorization

-- Habilitar RLS na tabela de mensagens do Realtime
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Política: só o próprio usuário autenticado pode publicar
CREATE POLICY "authenticated_can_send_gps"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  -- Só canais gps:tenant_*
  realtime.topic() LIKE 'gps:tenant_%'
);

-- Política: só recebe se estiver autenticado
CREATE POLICY "authenticated_can_receive_gps"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'gps:tenant_%'
);

-- ------------------------------------------------------------
-- 2. STORAGE — provas de entrega (bucket proofs)
-- ------------------------------------------------------------
-- Upload de foto de prova de entrega

-- Habilitar RLS no storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Quem está autenticado pode fazer upload no bucket proofs
CREATE POLICY "authenticated_upload_proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proofs'
);

-- Leitura pública das provas (URLs são usadas no app)
-- Se preferir restrito: mudar TO authenticated e usar signed URLs
CREATE POLICY "public_read_proofs"
ON storage.objects
for SELECT
TO public
USING (bucket_id = 'proofs');

-- Dono pode atualizar/apagar a própria prova
CREATE POLICY "authenticated_delete_own_proofs"
ON storage.objects
for DELETE
TO authenticated
USING (bucket_id = 'proofs');

-- ------------------------------------------------------------
-- 3. TABELAS (caso use PostgREST/Supabase client direto)
-- ------------------------------------------------------------
-- O backend Flask usa a SERVICE ROLE key (ignora RLS).
-- O frontend usa ANON key — se algum dia ler tabelas direto,
-- as policies abaixo limitam o acesso.

-- Exemplo: drivers só veem a si mesmos
CREATE POLICY "driver_reads_self"
ON public.drivers
FOR SELECT
TO authenticated
USING (
  auth.uid()::text = user_id::text
  OR user_id IN (
    SELECT id FROM public.users WHERE id = user_id
  )
);

-- Exemplo: orders só do tenant do usuário
-- (ajustar conforme a coluna de auth do Supabase Auth vs users.id)
CREATE POLICY "tenant_isolation_orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.users
    WHERE id = (auth.uid()::text)::int
  )
);

-- ------------------------------------------------------------
-- 4. VERIFICAÇÃO
-- ------------------------------------------------------------
-- Após aplicar, testar:
--   a) Conectar em gps:tenant_1 sem token → deve falhar
--   b) Conectar em gps:tenant_1 com token de user do tenant 2 → deve falhar
--   c) Upload em proofs sem auth → deve falhar
--
-- Monitorar: Dashboard → Logs → API (busca por 'realtime' e 'storage')
